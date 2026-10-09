import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PaperWorkspace } from '@/components/PaperWorkspace';
vi.mock('@/lib/api', () => ({ listPapers: async () => [{id:'a'},{id:'b'}], getPaper: async (id:string) => ({id,title:id}) }));
vi.mock('@/pages/Library', () => ({ Library: ({onOpenPaper,onOpenPapers}:any) => <div><button onClick={() => onOpenPaper('a')}>open-a</button><button onClick={() => onOpenPaper('b')}>open-b</button><button onClick={() => onOpenPapers(['a','b'])}>open-many</button></div> }));
vi.mock('@/pages/Reader', () => ({ Reader: ({paperId,active}:any) => <div data-testid={`reader-${paperId}`} data-active={String(active)}><input aria-label={`draft-${paperId}`} /></div> }));
afterEach(() => {cleanup();localStorage.clear();});
it('retains reader drafts across tabs and global navigation', async () => {
  const props = {active:true,jobs:[],refreshSignal:0,onTitleChange:vi.fn()};
  const view = render(<PaperWorkspace {...props} />);
  await waitFor(() => expect(screen.getByText('open-a')).toBeTruthy());
  fireEvent.click(screen.getByText('open-a'));
  fireEvent.change(screen.getByLabelText('draft-a'),{target:{value:'unfinished question'}});
  fireEvent.click(screen.getByText('open-b'));
  expect(screen.getByTestId('reader-a').dataset.active).toBe('false');
  view.rerender(<PaperWorkspace {...props} active={false} />);
  expect(screen.getByTestId('reader-b').dataset.active).toBe('false');
  view.rerender(<PaperWorkspace {...props} />);
  expect((screen.getByLabelText('draft-a') as HTMLInputElement).value).toBe('unfinished question');
});
it('creates background tabs without loading their readers', async () => {
  render(<PaperWorkspace active jobs={[]} refreshSignal={0} onTitleChange={vi.fn()} />);
  await waitFor(() => expect(screen.getByText('open-many')).toBeTruthy());
  fireEvent.click(screen.getByText('open-many'));
  expect(screen.queryByTestId('reader-a')).toBeNull();
  expect(screen.queryByTestId('reader-b')).toBeNull();
  expect(screen.getAllByRole('tab')).toHaveLength(3);
});
