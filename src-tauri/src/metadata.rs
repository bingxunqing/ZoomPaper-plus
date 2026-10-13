//! Metadata is independent of PDF parsing. User edits outrank acquired fields.
use crate::db::Db;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

pub const SCHEMA: &str = "CREATE TABLE IF NOT EXISTS paper_metadata (
 paper_id TEXT PRIMARY KEY REFERENCES papers(id) ON DELETE CASCADE,
 data TEXT NOT NULL DEFAULT '{}', sources TEXT NOT NULL DEFAULT '{}',
 revision INTEGER NOT NULL DEFAULT 0, user_title INTEGER NOT NULL DEFAULT 0
); CREATE TABLE IF NOT EXISTS metadata_backfill(version INTEGER PRIMARY KEY);";

#[derive(Default, Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Candidate {
    pub title: Option<String>,
    pub authors: Option<String>,
    pub abstract_text: Option<String>,
    pub doi: Option<String>,
    pub arxiv_id: Option<String>,
    pub year: Option<i64>,
    pub venue: Option<String>,
}
fn clean(value: Option<&str>, limit: usize) -> Option<String> {
    value.map(str::trim).filter(|s| !s.is_empty()).map(|s| {
        s.chars()
            .filter(|c| !c.is_control() || *c == '\n')
            .take(limit)
            .collect()
    })
}
pub fn apply(db: &Db, id: &str, candidate: &Candidate, source: &str) -> Result<bool, String> {
    let mut conn = db.conn();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    let (title, authors, abstract_text, venue, deleted): (
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<i64>,
    ) = tx
        .query_row(
            "SELECT title,authors,abstract,venue,deleted_at FROM papers WHERE id=?1",
            [id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        )
        .map_err(|e| e.to_string())?;
    if deleted.is_some() {
        return Ok(false);
    }
    tx.execute(
        "INSERT OR IGNORE INTO paper_metadata(paper_id) VALUES(?1)",
        [id],
    )
    .map_err(|e| e.to_string())?;
    let (raw, provenance, user_title): (String, String, bool) = tx
        .query_row(
            "SELECT data,sources,user_title FROM paper_metadata WHERE paper_id=?1",
            [id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .map_err(|e| e.to_string())?;
    let mut data: Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    let mut sources: Value = serde_json::from_str(&provenance).map_err(|e| e.to_string())?;
    let rank = |s: &str| match s {
        "user" => 100,
        "browser" => 30,
        "doi" => 20,
        "pdf" => 10,
        _ => 0,
    };
    let old = json!({"title":title,"authors":authors,"abstractText":abstract_text,"venue":venue});
    let incoming = json!({"title":clean(candidate.title.as_deref(),1000),"authors":clean(candidate.authors.as_deref(),10000),"abstractText":clean(candidate.abstract_text.as_deref(),20000),"venue":clean(candidate.venue.as_deref(),500),"doi":candidate.doi.as_deref().and_then(crate::publication::normalize_doi),"arxivId":clean(candidate.arxiv_id.as_deref(),80),"year":candidate.year.filter(|y|(1900..=2100).contains(y))});
    let before = data.clone();
    for (key, value) in incoming.as_object().unwrap() {
        if value.is_null() || (key == "title" && user_title) {
            continue;
        }
        let prior = sources[key].as_str().unwrap_or("");
        // Older libraries already contain confirmed venue labels without provenance.
        let current = data[key].as_str().or_else(|| old[key].as_str());
        if key == "venue"
            && source == "doi"
            && current.is_some_and(|v| {
                !v.trim().is_empty()
                    && !["arxiv", "openreview"].contains(&v.to_lowercase().as_str())
            })
        {
            continue;
        }
        let repository_venue = key == "venue"
            && current
                .is_some_and(|v| ["arxiv", "openreview"].contains(&v.to_lowercase().as_str()))
            && value
                .as_str()
                .is_some_and(|v| !["arxiv", "openreview"].contains(&v.to_lowercase().as_str()));
        if repository_venue
            || rank(source) >= rank(prior)
            || (data[key].is_null() && old[key].is_null())
        {
            data[key] = value.clone();
            sources[key] = json!(source);
        }
    }
    let next = |key: &str| {
        data[key]
            .as_str()
            .map(str::to_owned)
            .or_else(|| old[key].as_str().map(str::to_owned))
    };
    let new_title = if user_title {
        title.clone()
    } else {
        next("title").unwrap_or(title.clone())
    };
    let new_abstract = next("abstractText");
    if new_title != title
        || next("authors") != authors
        || new_abstract != abstract_text
        || next("venue") != venue
    {
        tx.execute("UPDATE papers SET title=?2,authors=?3,abstract=?4,venue=?5,title_zh=CASE WHEN title IS ?2 THEN title_zh ELSE NULL END,abstract_zh=CASE WHEN abstract IS ?4 THEN abstract_zh ELSE NULL END WHERE id=?1",params![id,new_title,next("authors"),new_abstract,next("venue")]).map_err(|e|e.to_string())?;
    }
    let changed = before != data;
    tx.execute(
        "UPDATE paper_metadata SET data=?2,sources=?3,revision=revision+?4 WHERE paper_id=?1",
        params![
            id,
            data.to_string(),
            sources.to_string(),
            i64::from(changed)
        ],
    )
    .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(changed)
}
pub fn candidate(db: &Db, id: &str) -> Result<Option<Candidate>, String> {
    let raw: Option<String> = db
        .conn()
        .query_row(
            "SELECT data FROM paper_metadata WHERE paper_id=?1",
            [id],
            |r| r.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    raw.map(|r| serde_json::from_str(&r).map_err(|e| e.to_string()))
        .transpose()
}
pub fn lock_title(conn: &rusqlite::Connection, id: &str) -> Result<(), String> {
    conn.execute("INSERT INTO paper_metadata(paper_id,user_title) VALUES(?1,1) ON CONFLICT(paper_id) DO UPDATE SET user_title=1,revision=revision+1",[id]).map_err(|e|e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn preserves_browser_fields_user_edits_and_translation_cache() {
        crate::db::register_sqlite_vec();
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrations::migrate(&conn).unwrap();
        conn.execute(
            "INSERT INTO papers(id,title,pdf_path,md_path)VALUES('p','file.pdf','p.pdf','p.md')",
            [],
        )
        .unwrap();
        let db = Db::from_connection(conn);
        let browser = Candidate {
            title: Some("Correct title".into()),
            abstract_text: Some("Full abstract".into()),
            doi: Some("10.1234/test".into()),
            ..Default::default()
        };
        apply(&db, "p", &browser, "browser").unwrap();
        db.conn()
            .execute("UPDATE papers SET title_zh='译文' WHERE id='p'", [])
            .unwrap();
        apply(
            &db,
            "p",
            &Candidate {
                title: Some("Broken".into()),
                ..Default::default()
            },
            "pdf",
        )
        .unwrap();
        let pair: (String, String) = db
            .conn()
            .query_row("SELECT title,title_zh FROM papers WHERE id='p'", [], |r| {
                Ok((r.get(0)?, r.get(1)?))
            })
            .unwrap();
        assert_eq!(pair, ("Correct title".into(), "译文".into()));
        {
            let conn = db.conn();
            lock_title(&conn, "p").unwrap();
            conn.execute("UPDATE papers SET title='My title' WHERE id='p'", [])
                .unwrap();
        }
        apply(&db, "p", &browser, "browser").unwrap();
        assert_eq!(
            db.conn()
                .query_row("SELECT title FROM papers WHERE id='p'", [], |r| r
                    .get::<_, String>(0))
                .unwrap(),
            "My title"
        );
        assert_eq!(
            candidate(&db, "p").unwrap().unwrap().doi.as_deref(),
            Some("10.1234/test")
        );
    }
}
