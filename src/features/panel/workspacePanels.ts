export const WORKSPACE_PANEL_ID_LIST = [
  'componentsTreeSection',
  'componentsInspectorPanel',
  'selectedElementPanel',
  'selectedElementPathPanel',
  'selectedElementDomPanel',
  'rawResultPanel',
  'debugLogPanel',
] as const;

export type WorkspacePanelId = (typeof WORKSPACE_PANEL_ID_LIST)[number];

export interface WorkspacePanelConfigEntry {
  title: string;
  toggleLabel: string;
}

export const WORKSPACE_PANEL_IDS: WorkspacePanelId[] = [...WORKSPACE_PANEL_ID_LIST];

export const WORKSPACE_PANEL_CONFIG: Readonly<Record<WorkspacePanelId, WorkspacePanelConfigEntry>> = {
  componentsTreeSection: {
    title: 'Components Tree',
    toggleLabel: 'Components Tree',
  },
  componentsInspectorPanel: {
    title: 'Components Inspector',
    toggleLabel: 'Components Inspector',
  },
  selectedElementPanel: {
    title: 'Selected Element',
    toggleLabel: 'Selected Element',
  },
  selectedElementPathPanel: {
    title: 'DOM Path',
    toggleLabel: 'DOM Path',
  },
  selectedElementDomPanel: {
    title: 'Selected DOM Tree',
    toggleLabel: 'Selected DOM Tree',
  },
  rawResultPanel: {
    title: 'Raw Result',
    toggleLabel: 'Raw Result',
  },
  debugLogPanel: {
    title: 'Debug Log',
    toggleLabel: 'Debug Log',
  },
};

const WORKSPACE_PANEL_ID_SET = new Set<WorkspacePanelId>(WORKSPACE_PANEL_IDS);

export function isWorkspacePanelId(value: unknown): value is WorkspacePanelId {
  return typeof value === 'string' && WORKSPACE_PANEL_ID_SET.has(value as WorkspacePanelId);
}
