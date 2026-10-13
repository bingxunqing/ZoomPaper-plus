//! Revisioned, paged library reads. Mutations are recorded by SQLite triggers.
use crate::db::{models::Paper, Db};
use serde::Serialize;
use tauri::State;
pub const SCHEMA:&str = "
CREATE TABLE IF NOT EXISTS library_changes(revision INTEGER PRIMARY KEY AUTOINCREMENT,paper_id TEXT NOT NULL);
CREATE TRIGGER IF NOT EXISTS paper_insert_change AFTER INSERT ON papers BEGIN INSERT INTO library_changes(paper_id) VALUES(new.id); END;
CREATE TRIGGER IF NOT EXISTS paper_update_change AFTER UPDATE ON papers BEGIN INSERT INTO library_changes(paper_id) VALUES(new.id); END;
CREATE TRIGGER IF NOT EXISTS paper_delete_change AFTER DELETE ON papers BEGIN INSERT INTO library_changes(paper_id) VALUES(old.id); END;
CREATE TRIGGER IF NOT EXISTS folder_add_change AFTER INSERT ON paper_folders BEGIN INSERT INTO library_changes(paper_id) VALUES(new.paper_id); END;
CREATE TRIGGER IF NOT EXISTS folder_remove_change AFTER DELETE ON paper_folders BEGIN INSERT INTO library_changes(paper_id) VALUES(old.paper_id); END;
CREATE TRIGGER IF NOT EXISTS read_time_change AFTER INSERT ON reading_sessions BEGIN INSERT INTO library_changes(paper_id) VALUES(new.paper_id); END;
CREATE TRIGGER IF NOT EXISTS read_time_update_change AFTER UPDATE ON reading_sessions BEGIN INSERT INTO library_changes(paper_id) VALUES(new.paper_id); END;
CREATE TRIGGER IF NOT EXISTS read_time_delete_change AFTER DELETE ON reading_sessions BEGIN INSERT INTO library_changes(paper_id) VALUES(old.paper_id); END;
CREATE TRIGGER IF NOT EXISTS library_log_trim AFTER INSERT ON library_changes BEGIN DELETE FROM library_changes WHERE revision < new.revision-20000; END;
CREATE INDEX IF NOT EXISTS paper_created_order ON papers(created_at DESC,id);
";
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Page {
    pub restart: bool,
    pub revision: i64,
    pub rows: Vec<Paper>,
    pub removed_ids: Vec<String>,
    pub reset: bool,
    pub has_more: bool,
    pub next_offset: usize,
}
#[tauri::command]
pub fn library_page(
    db: State<'_, Db>,
    after: Option<i64>,
    until: Option<i64>,
    offset: usize,
    limit: usize,
) -> Result<Page, String> {
    read(&db, after, until, offset, limit)
}
pub fn read(
    db: &Db,
    after: Option<i64>,
    until: Option<i64>,
    offset: usize,
    limit: usize,
) -> Result<Page, String> {
    let conn = db.conn();
    let limit = limit.clamp(1, 500);
    let current: i64 = conn
        .query_row(
            "SELECT COALESCE(max(revision),0) FROM library_changes",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    if until.is_some_and(|v| v != current) {
        return Ok(Page {
            restart: true,
            revision: current,
            rows: vec![],
            removed_ids: vec![],
            reset: false,
            has_more: false,
            next_offset: 0,
        });
    }
    let revision = until.unwrap_or(current).min(current);
    let oldest: i64 = conn
        .query_row(
            "SELECT COALESCE(min(revision),0) FROM library_changes",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let reset =
        after.is_none() || after.is_some_and(|v| v > current || (oldest > 0 && v < oldest - 1));
    let mut removed_ids = Vec::new();
    let (where_sql, args): (String, Vec<rusqlite::types::Value>) = if reset {
        (String::new(), vec![])
    } else {
        let after = after.unwrap();
        let mut stmt=conn.prepare("SELECT DISTINCT c.paper_id FROM library_changes c LEFT JOIN papers p ON p.id=c.paper_id WHERE c.revision>?1 AND c.revision<=?2 AND p.id IS NULL").map_err(|e|e.to_string())?;
        removed_ids = stmt
            .query_map([after, revision], |r| r.get(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        (
            " WHERE id IN (SELECT paper_id FROM library_changes WHERE revision>? AND revision<=?)"
                .into(),
            vec![after.into(), revision.into()],
        )
    };
    let sql=format!("{} WHERE p.id IN (SELECT id FROM papers{} ORDER BY created_at DESC,id LIMIT {} OFFSET {}) GROUP BY p.id ORDER BY p.created_at DESC,p.id",crate::commands::PAPER_SELECT,where_sql,limit+1,offset);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let mut rows = stmt
        .query_map(
            rusqlite::params_from_iter(args),
            crate::commands::row_to_paper,
        )
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    let has_more = rows.len() > limit;
    rows.truncate(limit);
    Ok(Page {
        restart: false,
        revision,
        reset,
        next_offset: offset + rows.len(),
        rows,
        removed_ids,
        has_more,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn pages_and_changes_preserve_unloaded_rows() {
        crate::db::register_sqlite_vec();
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrations::migrate(&conn).unwrap();
        conn.execute("INSERT INTO papers(id,title,pdf_path,md_path,created_at)VALUES('a','A','a','a',1),('b','B','b','b',2),('c','C','c','c',3)",[]).unwrap();
        let db = Db::from_connection(conn);
        let first = read(&db, None, None, 0, 2).unwrap();
        assert!(first.has_more);
        assert_eq!(first.rows.len(), 2);
        let second = read(&db, None, Some(first.revision), 2, 2).unwrap();
        assert_eq!(second.rows.len(), 1);
        db.conn()
            .execute("UPDATE papers SET title='Changed' WHERE id='b'", [])
            .unwrap();
        db.conn()
            .execute("DELETE FROM papers WHERE id='a'", [])
            .unwrap();
        let delta = read(&db, Some(first.revision), None, 0, 200).unwrap();
        assert!(!delta.reset);
        assert_eq!(delta.rows[0].title, "Changed");
        assert_eq!(delta.removed_ids, vec!["a"]);
    }
    #[test]
    fn mutation_between_pages_requires_restart() {
        crate::db::register_sqlite_vec();
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrations::migrate(&conn).unwrap();
        conn.execute(
            "INSERT INTO papers(id,title,pdf_path,md_path,created_at) VALUES('a','A','a','a',1)",
            [],
        )
        .unwrap();
        let db = Db::from_connection(conn);
        let page = read(&db, None, None, 0, 1).unwrap();
        db.conn()
            .execute(
                "INSERT INTO papers(id,title,pdf_path,md_path,created_at) VALUES('b','B','b','b',2)",
                [],
            )
            .unwrap();
        assert!(read(&db, None, Some(page.revision), 1, 1).unwrap().restart);
    }
}
