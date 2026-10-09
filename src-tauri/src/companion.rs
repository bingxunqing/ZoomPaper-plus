use std::sync::Mutex;
use tauri::{Emitter, Manager};
#[derive(Clone, serde::Deserialize)]
pub struct HitRegion { x: f64, y: f64, width: f64, height: f64, ellipse: bool }
impl HitRegion {
    fn contains(&self, x: f64, y: f64) -> bool {
        if self.width <= 0.0 || self.height <= 0.0 { return false; }
        let dx = (x-self.x)/self.width; let dy = (y-self.y)/self.height;
        if self.ellipse { (dx-0.5).powi(2)*4.0+(dy-0.5).powi(2)*4.0 <= 1.0 }
        else { (0.0..=1.0).contains(&dx) && (0.0..=1.0).contains(&dy) }
    }
}
#[derive(Default)]
pub struct Regions(Mutex<Vec<HitRegion>>);
#[tauri::command]
pub fn companion_regions(window: tauri::WebviewWindow, state: tauri::State<Regions>, regions: Vec<HitRegion>) -> Result<(), String> {
    if window.label() != "companion" { return Err("Invalid window".into()); }
    *state.0.lock().map_err(|e| e.to_string())? = regions; Ok(())
}
pub fn start(app: tauri::AppHandle) {
    app.manage(Regions::default());
    std::thread::spawn(move || {
        let mut previous = None;
        loop {
            let Some(window) = app.get_webview_window("companion") else { break };
            if window.is_visible().unwrap_or(false) {
                if let (Ok(cursor), Ok(position), Ok(scale)) = (app.cursor_position(), window.outer_position(), window.scale_factor()) {
                    let x = (cursor.x-position.x as f64)/scale; let y = (cursor.y-position.y as f64)/scale;
                    let hit = app.state::<Regions>().0.lock().map(|regions| regions.iter().any(|r| r.contains(x,y))).unwrap_or(false);
                    if previous != Some(hit) { if window.set_ignore_cursor_events(!hit).is_ok() { previous = Some(hit); let _ = window.emit("companion:pointer-region", hit); } }
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(30));
        }
    });
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn transparent_corners_pass_through() {
        let r = HitRegion{x:10.0,y:10.0,width:76.0,height:76.0,ellipse:true};
        assert!(r.contains(48.0,48.0)); assert!(!r.contains(10.0,10.0)); assert!(!r.contains(90.0,48.0));
    }
    #[test] fn rectangular_controls_include_edges() {
        let r = HitRegion{x:0.0,y:0.0,width:30.0,height:20.0,ellipse:false};
        assert!(r.contains(30.0,20.0)); assert!(!r.contains(-1.0,10.0));
    }
}
