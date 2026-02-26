import { describe, expect, it } from 'vitest';
import {
  consumePreviewBudget,
  createPreviewBudget,
  isPreviewBudgetExhausted,
} from '../../src/features/panel/reactInspector/jsonPreviewBudget';

describe('jsonPreviewBudget', () => {
  it('normalizes initial budget and tracks exhaustion', () => {
    const budget = createPreviewBudget(-3.4);
    expect(budget.remaining).toBe(0);
    expect(isPreviewBudgetExhausted(budget)).toBe(true);
  });

  it('consumes budget until exhausted', () => {
    const budget = createPreviewBudget(2);

    expect(consumePreviewBudget(budget)).toBe(true);
    expect(budget.remaining).toBe(1);
    expect(consumePreviewBudget(budget)).toBe(true);
    expect(budget.remaining).toBe(0);
    expect(consumePreviewBudget(budget)).toBe(false);
    expect(isPreviewBudgetExhausted(budget)).toBe(true);
  });
});
