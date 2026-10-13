//! Session-scoped, transactional undo. Restore only fields the user changed.
use crate::db::Db;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::OnceLock;
use tauri::State;
pub const SCHEMA:&str="CREATE TABLE IF NOT EXISTS library_undo(id INTEGER PRIMARY KEY AUTOINCREMENT,session TEXT NOT NULL,data TEXT NOT NULL);";
fn session() -> &'static str {
    static ID: OnceLock<String> = OnceLock::new();
    ID.get_or_init(|| uuid::Uuid::new_v4().to_string())
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderChange {
    folder_id: String,
    contains: bool,
}
#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum Action {
    Status {
        #[serde(rename = "paperIds")]
        paper_ids: Vec<String>,
        status: String,
    },
    Star {
        #[serde(rename = "paperIds")]
        paper_ids: Vec<String>,
        starred: bool,
    },
    Trash {
        #[serde(rename = "paperIds")]
        paper_ids: Vec<String>,
    },
    Restore {
        #[serde(rename = "paperIds")]
        paper_ids: Vec<String>,
    },
    Folders {
        #[serde(rename = "paperIds")]
        paper_ids: Vec<String>,
        changes: Vec<FolderChange>,
    },
    ClearFolders {
        #[serde(rename = "paperIds")]
        paper_ids: Vec<String>,
    },
}
#[derive(Serialize, Deserialize, PartialEq)]
struct RowState {
    id: String,
    value: Value,
}
#[derive(Serialize, Deserialize)]
struct Entry {
    kind: String,
    before: Vec<RowState>,
    after: Vec<RowState>,
}
fn capture(conn: &Connection, ids: &[String], kind: &str) -> Result<Vec<RowState>, String> {
    ids.iter().map(|id|{
  let exists:bool=conn.query_row("SELECT EXISTS(SELECT 1 FROM papers WHERE id=?1)",[id],|r|r.get(0)).map_err(|e|e.to_string())?;
  if !exists{return Err("论文不存在或已永久删除".into());}
  let value=match kind {
   "status"=>conn.query_row("SELECT reading_status,finished_at FROM papers WHERE id=?1",[id],|r|Ok(json!([r.get::<_,String>(0)?,r.get::<_,Option<i64>>(1)?]))),
   "star"=>conn.query_row("SELECT starred FROM papers WHERE id=?1",[id],|r|Ok(json!(r.get::<_,bool>(0)?))),
   "trash"=>conn.query_row("SELECT deleted_at FROM papers WHERE id=?1",[id],|r|Ok(json!(r.get::<_,Option<i64>>(0)?))),
   "folders"=>{let mut stmt=conn.prepare("SELECT folder_id,created_at FROM paper_folders WHERE paper_id=?1 ORDER BY folder_id").map_err(|e|e.to_string())?;let values=stmt.query_map([id],|r|Ok((r.get::<_,String>(0)?,r.get::<_,i64>(1)?))).map_err(|e|e.to_string())?.collect::<Result<Vec<_>,_>>().map_err(|e|e.to_string())?;Ok(json!(values))},
   _=>return Err("未知撤销操作".into()),
  }.map_err(|e:rusqlite::Error|e.to_string())?;
  Ok(RowState{id:id.clone(),value})
 }).collect()
}
#[tauri::command]
pub fn apply_library_action(db: State<'_, Db>, action: Action) -> Result<usize, String> {
    apply(&db, action)
}
fn apply(db: &Db, action: Action) -> Result<usize, String> {
    let (ids, kind) = match &action {
        Action::Status { paper_ids, .. } => (paper_ids, "status"),
        Action::Star { paper_ids, .. } => (paper_ids, "star"),
        Action::Trash { paper_ids } | Action::Restore { paper_ids } => (paper_ids, "trash"),
        Action::Folders { paper_ids, .. } | Action::ClearFolders { paper_ids } => {
            (paper_ids, "folders")
        }
    };
    let mut ids = ids.clone();
    ids.sort();
    ids.dedup();
    if ids.is_empty() {
        return Ok(0);
    }
    let mut conn = db.conn();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let before = capture(&tx, &ids, kind)?;
    let now = chrono::Utc::now().timestamp();
    let mut changed = 0;
    if let Action::Folders { changes, .. } = &action {
        for change in changes {
            let exists: bool = tx
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM folders WHERE id=?1)",
                    [&change.folder_id],
                    |r| r.get(0),
                )
                .map_err(|e| e.to_string())?;
            if !exists {
                return Err("文件夹不存在".into());
            }
        }
    }
    if let Action::Status { status, .. } = &action {
        if !["unread", "reading", "read"].contains(&status.as_str()) {
            return Err("无效的阅读状态".into());
        }
    }
    for id in &ids {
        changed+=match &action {
   Action::Status{status,..}=>tx.execute("UPDATE papers SET reading_status=?2,finished_at=CASE WHEN ?2='read' THEN COALESCE(finished_at,?3) ELSE NULL END WHERE id=?1",params![id,status,now]),
   Action::Star{starred,..}=>tx.execute("UPDATE papers SET starred=?2 WHERE id=?1",params![id,starred]),
   Action::Trash{..}=>{tx.execute("UPDATE background_jobs SET status=CASE status WHEN 'running' THEN 'canceling' ELSE 'canceled' END WHERE paper_id=?1 AND status IN ('queued','running')",[id]).map_err(|e|e.to_string())?;tx.execute("UPDATE papers SET deleted_at=COALESCE(deleted_at,?2) WHERE id=?1",params![id,now])},
   Action::Restore{..}=>tx.execute("UPDATE papers SET deleted_at=NULL WHERE id=?1",[id]),
   Action::ClearFolders{..}=>tx.execute("DELETE FROM paper_folders WHERE paper_id=?1",[id]),
   Action::Folders{changes,..}=>{let mut count=0;for change in changes{count+=if change.contains{tx.execute("INSERT OR IGNORE INTO paper_folders(paper_id,folder_id,created_at)VALUES(?1,?2,?3)",params![id,change.folder_id,now])}else{tx.execute("DELETE FROM paper_folders WHERE paper_id=?1 AND folder_id=?2",params![id,change.folder_id])}.map_err(|e|e.to_string())?;}Ok(count)},
  }.map_err(|e|e.to_string())?;
    }
    let after = capture(&tx, &ids, kind)?;
    if before != after {
        let entry = Entry {
            kind: kind.into(),
            before,
            after,
        };
        tx.execute(
            "INSERT INTO library_undo(session,data) VALUES(?1,?2)",
            params![
                session(),
                serde_json::to_string(&entry).map_err(|e| e.to_string())?
            ],
        )
        .map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM library_undo WHERE session!=?1 OR id NOT IN(SELECT id FROM library_undo WHERE session=?1 ORDER BY id DESC LIMIT 50)",[session()]).map_err(|e|e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(changed)
}
#[tauri::command]
pub fn undo_library_action(db: State<'_, Db>) -> Result<bool, String> {
    undo(&db)
}
fn undo(db: &Db) -> Result<bool, String> {
    let mut conn = db.conn();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let record: Option<(i64, String)> = tx
        .query_row(
            "SELECT id,data FROM library_undo WHERE session=?1 ORDER BY id DESC LIMIT 1",
            [session()],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    let Some((id, raw)) = record else {
        return Ok(false);
    };
    let entry: Entry = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    let ids = entry.after.iter().map(|r| r.id.clone()).collect::<Vec<_>>();
    if capture(&tx, &ids, &entry.kind).ok().as_ref() != Some(&entry.after) {
        tx.execute("DELETE FROM library_undo WHERE id=?1", [id])
            .map_err(|e| e.to_string())?;
        tx.commit().map_err(|e| e.to_string())?;
        return Err("该操作涉及的数据已变化或永久删除，无法撤销".into());
    }
    if entry.kind == "folders" {
        for row in &entry.before {
            let folders: Vec<(String, i64)> =
                serde_json::from_value(row.value.clone()).map_err(|e| e.to_string())?;
            for (folder, _) in folders {
                let exists: bool = tx
                    .query_row(
                        "SELECT EXISTS(SELECT 1 FROM folders WHERE id=?1)",
                        [folder],
                        |r| r.get(0),
                    )
                    .map_err(|e| e.to_string())?;
                if !exists {
                    tx.execute("DELETE FROM library_undo WHERE id=?1", [id])
                        .map_err(|e| e.to_string())?;
                    tx.commit().map_err(|e| e.to_string())?;
                    return Err("原文件夹已删除，无法撤销".into());
                }
            }
        }
    }
    for row in entry.before {
        match entry.kind.as_str() {
            "status" => {
                tx.execute(
                    "UPDATE papers SET reading_status=?2,finished_at=?3 WHERE id=?1",
                    params![
                        row.id,
                        row.value[0].as_str().ok_or("阅读状态无效")?,
                        row.value[1].as_i64()
                    ],
                )
                .map_err(|e| e.to_string())?;
            }
            "star" => {
                tx.execute(
                    "UPDATE papers SET starred=?2 WHERE id=?1",
                    params![row.id, row.value.as_bool().ok_or("星标状态无效")?],
                )
                .map_err(|e| e.to_string())?;
            }
            "trash" => {
                tx.execute(
                    "UPDATE papers SET deleted_at=?2 WHERE id=?1",
                    params![row.id, row.value.as_i64()],
                )
                .map_err(|e| e.to_string())?;
                if !row.value.is_null() {
                    tx.execute("UPDATE background_jobs SET status=CASE status WHEN 'running' THEN 'canceling' ELSE 'canceled' END WHERE paper_id=?1 AND status IN ('queued','running')",[&row.id]).map_err(|e|e.to_string())?;
                }
            }
            "folders" => {
                let folders: Vec<(String, i64)> =
                    serde_json::from_value(row.value).map_err(|e| e.to_string())?;
                tx.execute("DELETE FROM paper_folders WHERE paper_id=?1", [&row.id])
                    .map_err(|e| e.to_string())?;
                for (folder, stamp) in folders {
                    tx.execute(
                        "INSERT INTO paper_folders(paper_id,folder_id,created_at) VALUES(?1,?2,?3)",
                        params![row.id, folder, stamp],
                    )
                    .map_err(|e| e.to_string())?;
                }
            }
            _ => return Err("未知撤销操作".into()),
        }
    }
    tx.execute("DELETE FROM library_undo WHERE id=?1", [id])
        .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}
#[cfg(test)]
mod tests {
    use super::*;
    fn db() -> Db {
        crate::db::register_sqlite_vec();
        let c = Connection::open_in_memory().unwrap();
        crate::db::migrations::migrate(&c).unwrap();
        c.execute("INSERT INTO papers(id,title,pdf_path,md_path,created_at)VALUES('a','A','a','a',1),('b','B','b','b',2)",[]).unwrap();
        Db::from_connection(c)
    }
    #[test]
    fn batch_undo_restores_mixed_statuses_without_overwriting_metadata() {
        let db = db();
        db.conn()
            .execute(
                "UPDATE papers SET reading_status='read',finished_at=123 WHERE id='b'",
                [],
            )
            .unwrap();
        apply(
            &db,
            Action::Status {
                paper_ids: vec!["a".into(), "b".into()],
                status: "reading".into(),
            },
        )
        .unwrap();
        db.conn()
            .execute(
                "UPDATE papers SET title='Translated metadata' WHERE id='a'",
                [],
            )
            .unwrap();
        assert!(undo(&db).unwrap());
        assert_eq!(
            capture(&db.conn(), &["a".into(), "b".into()], "status")
                .unwrap()
                .iter()
                .map(|r| r.value.clone())
                .collect::<Vec<_>>(),
            vec![json!(["unread", null]), json!(["read", 123])]
        );
        assert_eq!(
            db.conn()
                .query_row("SELECT title FROM papers WHERE id='a'", [], |r| r
                    .get::<_, String>(0))
                .unwrap(),
            "Translated metadata"
        );
        assert!(!undo(&db).unwrap());
    }
    #[test]
    fn invalid_batch_rolls_back_and_does_not_create_undo() {
        let db = db();
        assert!(apply(
            &db,
            Action::Star {
                paper_ids: vec!["a".into(), "missing".into()],
                starred: true
            }
        )
        .is_err());
        assert!(!undo(&db).unwrap());
        assert_eq!(
            capture(&db.conn(), &["a".into()], "star").unwrap()[0].value,
            json!(false)
        );
    }
    #[test]
    fn later_changes_are_not_silently_overwritten() {
        let db = db();
        apply(
            &db,
            Action::Star {
                paper_ids: vec!["a".into()],
                starred: true,
            },
        )
        .unwrap();
        db.conn()
            .execute("UPDATE papers SET starred=0 WHERE id='a'", [])
            .unwrap();
        assert!(undo(&db).is_err());
        assert!(!undo(&db).unwrap());
    }
    #[test]
    fn trash_and_multiple_folder_changes_are_single_actions() {
        let db = db();
        db.conn()
            .execute(
                "INSERT INTO folders(id,name,created_at)VALUES('f','F',1),('g','G',2)",
                [],
            )
            .unwrap();
        let ids = vec!["a".into(), "b".into()];
        apply(
            &db,
            Action::Folders {
                paper_ids: ids.clone(),
                changes: vec![
                    FolderChange {
                        folder_id: "f".into(),
                        contains: true,
                    },
                    FolderChange {
                        folder_id: "g".into(),
                        contains: true,
                    },
                ],
            },
        )
        .unwrap();
        apply(
            &db,
            Action::Trash {
                paper_ids: ids.clone(),
            },
        )
        .unwrap();
        assert!(undo(&db).unwrap());
        assert!(capture(&db.conn(), &ids, "trash")
            .unwrap()
            .iter()
            .all(|r| r.value.is_null()));
        assert!(undo(&db).unwrap());
        assert!(capture(&db.conn(), &ids, "folders")
            .unwrap()
            .iter()
            .all(|r| r.value == json!([])));
    }
    #[test]
    fn no_op_does_not_hide_the_previous_action() {
        let db = db();
        apply(
            &db,
            Action::Star {
                paper_ids: vec!["a".into()],
                starred: true,
            },
        )
        .unwrap();
        apply(
            &db,
            Action::Star {
                paper_ids: vec!["a".into()],
                starred: true,
            },
        )
        .unwrap();
        assert!(undo(&db).unwrap());
        assert!(!undo(&db).unwrap());
    }
    #[test]
    fn removed_folder_invalidates_only_its_undo_entry() {
        let db = db();
        db.conn()
            .execute(
                "INSERT INTO folders(id,name,created_at)VALUES('f','F',1)",
                [],
            )
            .unwrap();
        apply(
            &db,
            Action::Star {
                paper_ids: vec!["a".into()],
                starred: true,
            },
        )
        .unwrap();
        apply(
            &db,
            Action::Folders {
                paper_ids: vec!["a".into()],
                changes: vec![FolderChange {
                    folder_id: "f".into(),
                    contains: true,
                }],
            },
        )
        .unwrap();
        apply(
            &db,
            Action::ClearFolders {
                paper_ids: vec!["a".into()],
            },
        )
        .unwrap();
        db.conn()
            .execute("DELETE FROM folders WHERE id='f'", [])
            .unwrap();
        assert!(undo(&db).is_err());
        assert!(undo(&db).is_err());
        assert!(undo(&db).unwrap());
    }
}
