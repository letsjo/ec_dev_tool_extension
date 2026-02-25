// @ts-nocheck
import { inspectCustomHookGroupNames } from './pageAgentHookGroups';
import {
  inferHookName,
  normalizeHookStateForDisplay,
} from './pageAgentHookState';
import { applyCustomHookMetadata } from './pageAgentHookMetadata';
import { makeSerializer } from './pageAgentSerialization';

type AnyRecord = Record<string, any>;

type FiberLike = AnyRecord & {
  tag?: number;
  memoizedState?: any;
  _debugHookTypes?: unknown[];
};

interface CreatePageAgentHooksInfoHelpersOptions {
  getFiberName: (fiber: FiberLike | null | undefined) => string;
}

/** hook 목록 조회/개수/직렬화 helper를 구성한다. */
export function createPageAgentHooksInfoHelpers(options: CreatePageAgentHooksInfoHelpersOptions) {
  /** fiber hook linked-list를 사람이 읽기 쉬운 배열로 정규화한다. */
  function getHooksRootValue(fiber: FiberLike | null | undefined, optionsOrNull: AnyRecord | null | undefined) {
    const includeCustomGroups = optionsOrNull && optionsOrNull.includeCustomGroups === true;
    if (!fiber) return [];
    if (fiber.tag === 1) {
      if (fiber.memoizedState == null) return [];
      return [{ index: 0, name: 'ClassState', state: fiber.memoizedState, group: null, groupPath: null }];
    }

    const hooks = [];
    let node = fiber.memoizedState;
    let guard = 0;
    const hookTypes = Array.isArray(fiber._debugHookTypes) ? fiber._debugHookTypes : null;

    while (node && guard < 120) {
      const hookName = inferHookName(node, guard, hookTypes);
      let nodeValue = node;
      if (typeof node === 'object' && node !== null && 'memoizedState' in node) {
        nodeValue = node.memoizedState;
      }
      hooks.push({
        index: guard,
        name: hookName,
        state: normalizeHookStateForDisplay(hookName, nodeValue),
        group: null,
        groupPath: null,
      });

      if (typeof node === 'object' && node !== null && 'next' in node) {
        node = node.next;
        guard += 1;
        continue;
      }
      break;
    }

    if (includeCustomGroups) {
      const customMetadata = inspectCustomHookGroupNames(fiber, null, options.getFiberName);
      applyCustomHookMetadata(hooks, customMetadata);
    }

    for (let i = 0; i < hooks.length; i += 1) {
      hooks[i].state = normalizeHookStateForDisplay(hooks[i].name, hooks[i].state);
    }

    return hooks;
  }

  /** hook 수만 필요할 때 custom group 계산 없이 길이만 반환한다. */
  function getHooksCount(fiber: FiberLike | null | undefined) {
    return getHooksRootValue(fiber, { includeCustomGroups: false }).length;
  }

  /** hook 배열을 panel 전송용으로 직렬화하고 truncation을 반영한다. */
  function getHooksInfo(fiber: FiberLike | null | undefined) {
    const hooks = getHooksRootValue(fiber, { includeCustomGroups: true });
    const out = [];
    const maxLen = Math.min(hooks.length, 120);
    const perHookBudget = 12000;
    for (let i = 0; i < maxLen; i += 1) {
      const hook = hooks[i];
      const hookSerialize = makeSerializer({
        maxSerializeCalls: perHookBudget,
        maxDepth: 2,
        maxArrayLength: 80,
        maxObjectKeys: 80,
        maxMapEntries: 60,
        maxSetEntries: 60,
      });
      out.push({
        index: hook.index,
        name: hook.name,
        group: typeof hook.group === 'string' ? hook.group : null,
        groupPath: Array.isArray(hook.groupPath) ? hook.groupPath : null,
        state: hookSerialize(hook.state),
      });
    }
    if (hooks.length > maxLen) {
      out.push({
        index: maxLen,
        name: 'Truncated',
        group: null,
        groupPath: null,
        state: '[+' + String(hooks.length - maxLen) + ' more hooks]',
      });
    }
    return { value: out, count: hooks.length };
  }

  return {
    getHooksRootValue,
    getHooksCount,
    getHooksInfo,
  };
}
