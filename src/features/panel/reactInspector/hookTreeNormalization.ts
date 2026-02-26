import { isRecord } from '../../../shared/inspector';
import type { HookBadgeType, HookRowItem } from './hookTreeTypes';

const EFFECT_HOOK_NAME_SET = new Set([
  'Effect',
  'LayoutEffect',
  'InsertionEffect',
  'ImperativeHandle',
  'EffectEvent',
]);

const FUNCTION_HOOK_NAME_SET = new Set(['Callback', 'Memo']);

/** 필요한 값/상태를 계산해 반환 */
function getHookBadgeType(name: string): HookBadgeType | null {
  if (EFFECT_HOOK_NAME_SET.has(name)) return 'effect';
  if (FUNCTION_HOOK_NAME_SET.has(name)) return 'function';
  return null;
}

/** 입력 데이터를 표시/비교용으로 정규화 */
function normalizeHookGroupLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** 입력 데이터를 표시/비교용으로 정규화 */
function normalizeHookGroupPath(rawGroupPath: unknown): string[] | null {
  if (!Array.isArray(rawGroupPath)) return null;
  const normalized = rawGroupPath
    .filter((segment): segment is string => typeof segment === 'string')
    .map((segment) => normalizeHookGroupLabel(segment))
    .filter((segment) => Boolean(segment));
  return normalized.length > 0 ? normalized : null;
}

/** 값을 읽어 검증/변환 */
function readHookRowItem(hook: unknown, arrayIndex: number): HookRowItem {
  const hookRecord = isRecord(hook) ? hook : null;
  const hookIndexRaw = hookRecord?.index;
  const hookNameRaw = hookRecord?.name;
  const hookGroupRaw = hookRecord?.group;
  const hookGroupPathRaw = hookRecord?.groupPath;
  const hookState = hookRecord && 'state' in hookRecord ? hookRecord.state : hook;

  const order =
    typeof hookIndexRaw === 'number' && Number.isFinite(hookIndexRaw) && hookIndexRaw >= 0
      ? Math.floor(hookIndexRaw) + 1
      : arrayIndex + 1;
  const rawName =
    typeof hookNameRaw === 'string' && hookNameRaw.trim() ? hookNameRaw.trim() : 'Hook';
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const group =
    typeof hookGroupRaw === 'string' && hookGroupRaw.trim()
      ? normalizeHookGroupLabel(hookGroupRaw)
      : null;
  const normalizedGroupPath = normalizeHookGroupPath(hookGroupPathRaw);
  const groupPath = normalizedGroupPath ?? (group ? [group] : null);

  return {
    sourceIndex: arrayIndex,
    order,
    name,
    group,
    groupPath,
    badge: getHookBadgeType(name),
    state: hookState,
  };
}

/** hooks payload 배열을 hook row item 목록으로 정규화한다. */
export function normalizeHookItems(hooks: unknown[]): HookRowItem[] {
  return hooks.map((hook, arrayIndex) => readHookRowItem(hook, arrayIndex));
}
