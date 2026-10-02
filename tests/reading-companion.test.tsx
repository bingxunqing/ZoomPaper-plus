import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ReadingCompanion, jobLabel } from '@/components/ReadingCompanion';
import type { BackgroundJob } from '@/lib/api';
vi.mock('@/lib/api', () => ({ cancelJob: vi.fn().mockResolvedValue(undefined), retryJob: vi.fn().mockResolvedValue(undefined) }));
const job: BackgroundJob = { id: 'job', paper_id: 'paper', title: 'A Paper', kind: 'parse', status: 'running', stage: 'pending', completed_pages: null, total_pages: null, error: null, created_at: 1, updated_at: 1 };
vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
afterEach(() => { cleanup(); localStorage.clear(); });
it('dismisses busy status without canceling tasks and can restore the task bubble', async () => {
  const dismiss = vi.fn();
  render(<ReadingCompanion jobs={[job]} notice={null} readingTitle={null} onDismiss={dismiss} onOpenPaper={vi.fn()} />);
  expect(screen.getByText('云端排队 A Paper')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('关闭提示'));
  expect(dismiss).toHaveBeenCalledOnce();
  const api = await import('@/lib/api');
  expect(api.cancelJob).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('展开阅读伙伴'));
  expect(screen.getByLabelText('任务气泡')).toBeTruthy();
  fireEvent.click(screen.getByLabelText('取消 解析'));
  expect(api.cancelJob).toHaveBeenCalledWith('job');
});
it('shows current reading when no background task is running', () => {
  render(<ReadingCompanion jobs={[]} notice={null} readingTitle="Another Paper" onDismiss={vi.fn()} onOpenPaper={vi.fn()} />);
  expect(screen.getByText('正在阅读 Another Paper')).toBeTruthy();
});
it('distinguishes postprocessing from parsing', () => {
  expect(jobLabel({ ...job, kind: 'index' })).toBe('正在建立索引');
  expect(jobLabel({ ...job, status: 'canceling' })).toBe('正在停止');
  expect(jobLabel({ ...job, kind: 'doi', status: 'failed' })).toBe('补全出版信息失败');
});

it('shows details directly below the pet without a dialog or hover', () => {
  render(<ReadingCompanion jobs={[{ ...job, status: 'failed', error: '服务暂不可用' }]} notice={null} readingTitle={null} onDismiss={vi.fn()} onOpenPaper={vi.fn()} />);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByText('服务暂不可用')).toBeTruthy();
  const pet = screen.getByLabelText('阅读伙伴');
  const bubble = screen.getByLabelText('任务气泡');
  expect(pet.compareDocumentPosition(bubble) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(pet.closest('.fixed')!.className).toContain('top-5');
});
