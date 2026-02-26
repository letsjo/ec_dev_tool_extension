import type { CollectionPreviewBudget } from './jsonCollectionPreview';

function normalizeBudgetRemaining(rawRemaining: number): number {
  return Number.isFinite(rawRemaining) ? Math.max(0, Math.floor(rawRemaining)) : 0;
}

/** preview budget 객체를 생성한다. */
export function createPreviewBudget(remaining: number): CollectionPreviewBudget {
  return {
    remaining: normalizeBudgetRemaining(remaining),
  };
}

/** preview budget이 모두 소진됐는지 판별한다. */
export function isPreviewBudgetExhausted(budget: CollectionPreviewBudget): boolean {
  return budget.remaining <= 0;
}

/** preview budget을 1회 소비하고, 소비 성공 여부를 반환한다. */
export function consumePreviewBudget(budget: CollectionPreviewBudget): boolean {
  if (isPreviewBudgetExhausted(budget)) return false;
  budget.remaining -= 1;
  return true;
}
