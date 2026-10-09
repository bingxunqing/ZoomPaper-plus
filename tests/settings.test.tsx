import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';import{afterEach,expect,it,vi}from'vitest';import{SettingsPage}from'@/pages/Settings';
const mocks=vi.hoisted(()=>({save:vi.fn(async(s:any)=>s),enqueue:vi.fn().mockResolvedValue(undefined)}));
vi.mock('@/lib/api',()=>({getSettings:async()=>({providers:[],active_provider_id:'',mineru_api_key:'',web_search_provider:'auto',web_search_model:null,paper_library_path:null}),updateSettings:mocks.save,listPapers:async()=>[{id:'a',title:'A',title_zh:null,abstract:'Text',abstract_zh:null}],listJobs:async()=>[],enqueueMetadataTranslations:mocks.enqueue,emptyTrash:vi.fn(),reindexAllPapers:vi.fn(),addProvider:vi.fn(),updateProvider:vi.fn(),deleteProvider:vi.fn(),setActiveProvider:vi.fn(),generateBlog:vi.fn(),translateChunk:vi.fn(),saveTranslation:vi.fn(),DEFAULT_WORKFLOW:{autoParse:true,parseConcurrency:2,autoDoi:true,autoMetadataTranslation:true,autoFullTranslation:false}}));
vi.mock('@tauri-apps/api/core',()=>({invoke:async()=>false}));vi.mock('@tauri-apps/plugin-dialog',()=>({open:vi.fn()}));vi.mock('@tauri-apps/plugin-opener',()=>({openPath:vi.fn()}));
afterEach(()=>{cleanup();localStorage.clear();vi.clearAllMocks();});
it('offers the approved categories without task notifications or help icons',async()=>{
 render(<SettingsPage/>);await screen.findByLabelText('统一标题语言');expect(screen.getByRole('navigation').querySelectorAll('button')).toHaveLength(6);fireEvent.click(screen.getByRole('button',{name:'阅读伙伴'}));expect(screen.getByLabelText('显示正在阅读')).toBeTruthy();expect(screen.queryByText('任务通知')).toBeNull();expect(screen.queryByText('i')).toBeNull();
});
it('preserves English without issuing requests and enqueues a confirmed batch',async()=>{
 render(<SettingsPage/>);await screen.findByLabelText('统一标题语言');fireEvent.change(screen.getByLabelText('统一标题语言'),{target:{value:'both'}});await screen.findByText('补全中文标题与摘要？');fireEvent.click(screen.getByText('保留英文'));expect(mocks.enqueue).not.toHaveBeenCalled();fireEvent.change(screen.getByLabelText('统一标题语言'),{target:{value:'zh'}});await screen.findByText('补全中文标题与摘要？');fireEvent.click(screen.getByText('全部翻译'));await waitFor(()=>expect(mocks.enqueue).toHaveBeenCalledWith(['a']));
});
it('validates and saves a custom concurrency value',async()=>{
 render(<SettingsPage/>);await screen.findByLabelText('统一标题语言');fireEvent.click(screen.getByRole('button',{name:'导入与解析'}));const input=screen.getByLabelText('同时解析论文数');fireEvent.change(input,{target:{value:'8'}});fireEvent.blur(input);await waitFor(()=>expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({workflow:expect.objectContaining({parseConcurrency:8})})));mocks.save.mockClear();fireEvent.change(input,{target:{value:'0'}});fireEvent.blur(input);expect(mocks.save).not.toHaveBeenCalled();expect(screen.getByRole('alert').textContent).toContain('正整数');
});
it('searches language settings by Chinese keywords across categories',async()=>{
 render(<SettingsPage/>);await screen.findByLabelText('统一标题语言');fireEvent.change(screen.getByLabelText('搜索设置'),{target:{value:'中文'}});expect(screen.getByLabelText('论文标签标题')).toBeTruthy();expect(screen.queryByLabelText('同时解析论文数')).toBeNull();
});
