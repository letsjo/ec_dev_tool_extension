import { isWorkspacePanelId, type WorkspacePanelId } from '../../workspacePanels';

export type WorkspaceDockDirection = 'left' | 'right' | 'top' | 'bottom' | 'center';
export type WorkspaceNodePathSegment = 'first' | 'second';
export type WorkspaceNodePath = WorkspaceNodePathSegment[];

export interface WorkspacePanelLayoutNode {
  type: 'panel';
  panelId: WorkspacePanelId;
}

export interface WorkspaceSplitLayoutNode {
  type: 'split';
  axis: 'row' | 'column';
  ratio: number;
  first: WorkspaceLayoutNode;
  second: WorkspaceLayoutNode;
}

export type WorkspaceLayoutNode = WorkspacePanelLayoutNode | WorkspaceSplitLayoutNode;

export interface WorkspaceDropTarget {
  targetPanelId: WorkspacePanelId | null;
  direction: WorkspaceDockDirection;
}

export type WorkspacePanelState = 'visible' | 'closed';

export const WORKSPACE_DOCK_SPLIT_RATIO = 0.5;
export const WORKSPACE_SPLIT_MIN_RATIO = 0.12;

/** 값을 읽어 검증/변환 */
export function parseWorkspaceNodePath(pathText: string): WorkspaceNodePath {
  if (!pathText.trim()) return [];
  return pathText
    .split('.')
    .filter(
      (segment): segment is WorkspaceNodePathSegment => segment === 'first' || segment === 'second',
    );
}

/** 파생 데이터나 요약 값을 구성 */
export function stringifyWorkspaceNodePath(path: WorkspaceNodePath): string {
  return path.join('.');
}

/** 입력 데이터를 표시/비교용으로 정규화 */
export function clampWorkspaceSplitRatio(ratio: number): number {
  return Math.max(WORKSPACE_SPLIT_MIN_RATIO, Math.min(1 - WORKSPACE_SPLIT_MIN_RATIO, ratio));
}

/** 파생 데이터나 요약 값을 구성 */
export function createWorkspacePanelNode(panelId: WorkspacePanelId): WorkspacePanelLayoutNode {
  return { type: 'panel', panelId };
}

/** 파생 데이터나 요약 값을 구성 */
export function createWorkspaceSplitNode(
  axis: 'row' | 'column',
  first: WorkspaceLayoutNode,
  second: WorkspaceLayoutNode,
  ratio = WORKSPACE_DOCK_SPLIT_RATIO,
): WorkspaceSplitLayoutNode {
  return {
    type: 'split',
    axis,
    first,
    second,
    ratio: clampWorkspaceSplitRatio(ratio),
  };
}

/** 현재 상태 스냅샷을 만든 */
export function createDefaultWorkspaceLayout(): WorkspaceLayoutNode {
  return createWorkspaceSplitNode(
    'row',
    createWorkspacePanelNode('componentsTreeSection'),
    createWorkspaceSplitNode(
      'column',
      createWorkspacePanelNode('componentsInspectorPanel'),
      createWorkspaceSplitNode(
        'column',
        createWorkspacePanelNode('selectedElementPanel'),
        createWorkspaceSplitNode(
          'column',
          createWorkspacePanelNode('selectedElementPathPanel'),
          createWorkspaceSplitNode(
            'column',
            createWorkspacePanelNode('selectedElementDomPanel'),
            createWorkspaceSplitNode(
              'column',
              createWorkspacePanelNode('rawResultPanel'),
              createWorkspacePanelNode('debugLogPanel'),
              0.5,
            ),
            0.58,
          ),
          0.24,
        ),
        0.32,
      ),
      0.45,
    ),
    0.48,
  );
}

/** 값을 읽어 검증/변환 */
export function parseWorkspaceLayoutNode(value: unknown, depth = 0): WorkspaceLayoutNode | null {
  if (!value || typeof value !== 'object' || depth > 12) return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.type === 'panel' && isWorkspacePanelId(candidate.panelId)) {
    return createWorkspacePanelNode(candidate.panelId);
  }
  if (candidate.type !== 'split') return null;
  const axis = candidate.axis === 'row' || candidate.axis === 'column' ? candidate.axis : null;
  if (!axis) return null;
  const first = parseWorkspaceLayoutNode(candidate.first, depth + 1);
  const second = parseWorkspaceLayoutNode(candidate.second, depth + 1);
  if (!first || !second) return null;
  const ratioRaw =
    typeof candidate.ratio === 'number' ? candidate.ratio : WORKSPACE_DOCK_SPLIT_RATIO;
  return createWorkspaceSplitNode(axis, first, second, ratioRaw);
}
