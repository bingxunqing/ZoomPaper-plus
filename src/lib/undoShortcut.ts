/** Preserve editor undo; library undo applies only outside editable controls/dialogs. */
export function bindUndoShortcut(undo:()=>Promise<boolean>,changed:()=>void,onError:(error:unknown)=>void){
 let pending=false;
 const keydown=(event:KeyboardEvent)=>{
  if(event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.shiftKey || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase()!=='z')return;
  const target=event.target instanceof HTMLElement ? event.target : document.activeElement;
  if(target instanceof HTMLElement && target.closest('input,textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'))return;
  if(document.querySelector('[role="dialog"],[role="alertdialog"]'))return;
  event.preventDefault();if(pending)return;pending=true;
  void undo().then(done=>{if(done)changed();}).catch(onError).finally(()=>{pending=false;});
 };
 window.addEventListener('keydown',keydown);return()=>window.removeEventListener('keydown',keydown);
}
