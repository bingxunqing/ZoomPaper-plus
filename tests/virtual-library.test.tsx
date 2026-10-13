import { it, expect } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { useVirtualRows } from '../src/hooks/useVirtualRows';
function Rows(){const window=useVirtualRows(10000,44);return <div ref={window.ref} style={{paddingTop:window.top,paddingBottom:window.bottom}}>{Array.from({length:window.end-window.start},(_,i)=><div key={i} data-row={window.start+i}/>)}</div>;}
it('bounds rendered rows and changes the visible range on scroll',()=>{
 const host=document.createElement('div');host.style.overflowY='auto';document.body.append(host);Object.defineProperty(host,'clientHeight',{value:440});
 const result=render(<Rows/>,{container:host});expect(host.querySelectorAll('[data-row]').length).toBeLessThan(40);
 const body=host.firstElementChild!;body.getBoundingClientRect=()=>({top:-44000} as DOMRect);host.getBoundingClientRect=()=>({top:0} as DOMRect);
 act(()=>fireEvent.scroll(host));expect(Number(host.querySelector('[data-row]')?.getAttribute('data-row'))).toBe(992);expect(host.querySelectorAll('[data-row]').length).toBeLessThan(40);result.unmount();host.remove();
});
