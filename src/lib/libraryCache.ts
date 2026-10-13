import { invoke } from '@tauri-apps/api/core';
import type { Paper } from './api';
export interface LibraryPage { restart?:boolean;revision:number; rows:Paper[]; removedIds:string[];reset:boolean;hasMore:boolean;nextOffset:number; }
/** A first load is paged; later refreshes fetch only changed paper IDs. */
export class LibraryCache {
  private revision:number|null=null;
  private papers=new Map<string,Paper>();
  private pending:Promise<Paper[]>|null=null;
  private again=false;
  constructor(private read:(args:{after:number|null;until:number|null;offset:number;limit:number})=>Promise<LibraryPage> = args=>invoke('library_page',args)){}
  reset(){this.revision=null;}
  refresh():Promise<Paper[]> {
    if(this.pending){this.again=true;return this.pending;}
    this.pending=(async()=>{let result:Paper[];do{this.again=false;result=await this.load();}while(this.again);return result;})().finally(()=>{this.pending=null;});return this.pending;
  }
  private async load() {
    const after=this.revision;let until:number|null=null;let offset=0;let restarts=0;
    let next=new Map(this.papers);
    do {
      const page=await this.read({after,until,offset,limit:200});
      if(page.restart){if(++restarts>5)throw new Error('论文库正在更新，请稍后重试');until=null;offset=0;next=new Map(this.papers);continue;}
      if(until===null){until=page.revision;if(page.reset)next=new Map();}
      for(const id of page.removedIds)next.delete(id);
      for(const paper of page.rows)next.set(paper.id,paper);
      if(!page.hasMore)break;offset=page.nextOffset;
    }while(true);
    this.papers=next;this.revision=until;
    return [...next.values()].sort((a,b)=>b.created_at-a.created_at || a.id.localeCompare(b.id));
  }
}
export const libraryCache=new LibraryCache();
