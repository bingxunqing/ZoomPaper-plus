import { describe, it, expect, vi } from 'vitest';
import { LibraryCache, type LibraryPage } from '../src/lib/libraryCache';
import type { Paper } from '../src/lib/api';
const paper=(id:string,title=id)=>({id,title,created_at:1} as Paper);
const page=(rows:Paper[],rest:Partial<LibraryPage>={}):LibraryPage=>({revision:3,reset:true,rows,removedIds:[],hasMore:false,nextOffset:rows.length,...rest});
describe('revisioned library cache',()=>{
 it('merges delta rows and deletions without dropping unchanged rows',async()=>{
  const read=vi.fn().mockResolvedValueOnce(page([paper('a'),paper('b')])).mockResolvedValueOnce(page([paper('b','updated')],{revision:5,reset:false,removedIds:['a']}));
  const cache=new LibraryCache(read);await cache.refresh();expect(await cache.refresh()).toEqual([paper('b','updated')]);expect(read.mock.calls[1][0].after).toBe(3);
 });
 it('restarts an invalidated page sequence instead of losing or duplicating rows',async()=>{
  const read=vi.fn().mockResolvedValueOnce(page([paper('a')],{hasMore:true,nextOffset:1})).mockResolvedValueOnce(page([],{restart:true,revision:4})).mockResolvedValueOnce(page([paper('b'),paper('a')],{revision:4}));
  const cache=new LibraryCache(read);expect((await cache.refresh()).map(p=>p.id)).toEqual(['a','b']);expect(read.mock.calls[2][0].offset).toBe(0);expect(read.mock.calls[2][0].until).toBe(null);
 });
 it('does not discard a mutation that arrives during a refresh',async()=>{
  let resolve!:(p:LibraryPage)=>void;const read=vi.fn().mockImplementationOnce(()=>new Promise<LibraryPage>(r=>resolve=r)).mockResolvedValueOnce(page([paper('a','new')],{revision:4,reset:false}));
  const cache=new LibraryCache(read);const first=cache.refresh();const second=cache.refresh();resolve(page([paper('a')]));expect((await first)[0].title).toBe('new');expect(await second).toEqual(await first);expect(read).toHaveBeenCalledTimes(2);
 });
});
