import { expect, it } from 'vitest';
import { EMPTY_WORKSPACE, restoreWorkspace, openWorkspacePaper, closeWorkspacePaper } from '@/lib/workspace';
it('restores only valid unique tabs and recovers invalid active selection', () => {
  expect(restoreWorkspace('{"tabs":["a","a",null,2,"b"],"active":"missing"}')).toEqual({tabs:['a','b'],active:'library',lastRead:'b'});
  expect(restoreWorkspace('null')).toEqual(EMPTY_WORKSPACE);
});
it('background opening preserves the current reading session', () => {
  const state = openWorkspacePaper(EMPTY_WORKSPACE,'a');
  expect(openWorkspacePaper(state,'b',true)).toEqual({tabs:['a','b'],active:'a',lastRead:'a'});
  expect(openWorkspacePaper(state,'a').tabs).toEqual(['a']);
});
it('closing the active paper selects its neighbor and keeps library accessible', () => {
  const state = {tabs:['a','b','c'],active:'b',lastRead:'b'};
  expect(closeWorkspacePaper(state,'b')).toEqual({tabs:['a','c'],active:'a',lastRead:'a'});
  expect(closeWorkspacePaper({tabs:['a'],active:'a',lastRead:'a'},'a')).toEqual(EMPTY_WORKSPACE);
});
