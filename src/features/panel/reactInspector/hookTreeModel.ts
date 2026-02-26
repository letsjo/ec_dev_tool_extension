import { buildExplicitHookTree, buildFallbackHookTree } from './hookTreeBuilders';
import { normalizeHookItems } from './hookTreeNormalization';
import type { HookTreeNode } from './hookTreeTypes';

export type { HookRowItem, HookTreeNode } from './hookTreeTypes';

/** 파생 데이터나 요약 값을 구성 */
export function buildHookTree(hooks: unknown[]): HookTreeNode[] {
  const normalizedItems = normalizeHookItems(hooks);
  const hasExplicitGroupPath = normalizedItems.some(
    (item) => item.groupPath && item.groupPath.length > 0,
  );
  if (hasExplicitGroupPath) {
    return buildExplicitHookTree(normalizedItems);
  }
  return buildFallbackHookTree(normalizedItems);
}
