import {afterEach,expect,it,vi} from 'vitest';
import {bindUndoShortcut} from '../src/lib/undoShortcut';
let unbind=()=>{};
afterEach(()=>{unbind();document.body.innerHTML='';});
it.each([{ctrlKey:true},{metaKey:true}])('undoes a library action with %j',async modifier=>{
 const undo=vi.fn().mockResolvedValue(true),changed=vi.fn();unbind=bindUndoShortcut(undo,changed,vi.fn());const event=new KeyboardEvent('keydown',{key:'z',...modifier,cancelable:true});window.dispatchEvent(event);await vi.waitFor(()=>expect(changed).toHaveBeenCalledOnce());expect(event.defaultPrevented).toBe(true);
});
it.each(['input','textarea','div'])('preserves native undo in %s',tag=>{
 const field=document.createElement(tag);if(tag==='div')field.setAttribute('contenteditable','true');document.body.append(field);const undo=vi.fn();unbind=bindUndoShortcut(undo,vi.fn(),vi.fn());const event=new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true,cancelable:true});field.dispatchEvent(event);expect(event.defaultPrevented).toBe(false);expect(undo).not.toHaveBeenCalled();
});
it('does not undo behind an open dialog or while composing text',()=>{
 const undo=vi.fn();unbind=bindUndoShortcut(undo,vi.fn(),vi.fn());const dialog=document.createElement('div');dialog.setAttribute('role','dialog');document.body.append(dialog);window.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true}));dialog.remove();window.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,isComposing:true}));expect(undo).not.toHaveBeenCalled();
});
it('serializes repeated presses and refreshes only when an action was undone',async()=>{
 let complete!:(done:boolean)=>void;const undo=vi.fn(()=>new Promise<boolean>(resolve=>complete=resolve)),changed=vi.fn();unbind=bindUndoShortcut(undo,changed,vi.fn());window.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true}));window.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true}));expect(undo).toHaveBeenCalledOnce();complete(false);await new Promise(resolve=>setTimeout(resolve,0));expect(changed).not.toHaveBeenCalled();
});
