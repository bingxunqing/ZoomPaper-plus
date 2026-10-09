export interface WorkspaceState { tabs: string[]; active: string; lastRead: string | null; }
export const EMPTY_WORKSPACE: WorkspaceState = { tabs: [], active: 'library', lastRead: null };
export function restoreWorkspace(raw: string | null): WorkspaceState {
  try { const state = JSON.parse(raw ?? '{}'); const tabs = [...new Set<string>((Array.isArray(state.tabs) ? state.tabs : []).filter((id: unknown) => typeof id === 'string'))];
    return { tabs, active: tabs.includes(state.active) ? state.active : 'library', lastRead: tabs.includes(state.lastRead) ? state.lastRead : tabs[tabs.length - 1] ?? null };
  } catch { return EMPTY_WORKSPACE; }
}
export function openWorkspacePaper(state: WorkspaceState, id: string, background = false): WorkspaceState {
  return { tabs: state.tabs.includes(id) ? state.tabs : [...state.tabs, id], active: background ? state.active : id, lastRead: background ? state.lastRead : id };
}
export function closeWorkspacePaper(state: WorkspaceState, id: string): WorkspaceState {
  const index = state.tabs.indexOf(id), tabs = state.tabs.filter((tab) => tab !== id);
  const active = state.active === id ? tabs[Math.max(0, index - 1)] ?? 'library' : state.active;
  return { tabs, active, lastRead: state.lastRead === id ? (active !== 'library' ? active : tabs[tabs.length - 1] ?? null) : state.lastRead };
}
