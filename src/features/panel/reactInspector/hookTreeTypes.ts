export type HookBadgeType = 'effect' | 'function';

export interface HookRowItem {
  sourceIndex: number;
  order: number;
  name: string;
  group: string | null;
  groupPath: string[] | null;
  badge: HookBadgeType | null;
  state: unknown;
}

interface HookGroupTreeNode {
  type: 'group';
  title: string;
  children: HookTreeNode[];
}

interface HookItemTreeNode {
  type: 'item';
  item: HookRowItem;
}

export type HookTreeNode = HookGroupTreeNode | HookItemTreeNode;
