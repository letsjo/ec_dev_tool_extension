import { describe, expect, it } from 'vitest';
import { getElementInfo } from '../../src/content/elementSelectorInfo';

describe('elementSelectorInfo', () => {
  it('uses scoped selector when id is duplicated', () => {
    const firstRow = document.createElement('div');
    firstRow.id = 'row-1';
    const firstInput = document.createElement('input');
    firstInput.id = 'name';
    firstRow.appendChild(firstInput);

    const secondRow = document.createElement('div');
    secondRow.id = 'row-2';
    const secondInput = document.createElement('input');
    secondInput.id = 'name';
    secondRow.appendChild(secondInput);

    document.body.append(firstRow, secondRow);

    const info = getElementInfo(secondInput, 120, 240);
    const selector = String(info.selector ?? '');
    expect(selector).not.toBe('#name');
    expect(document.querySelector(selector)).toBe(secondInput);

    firstRow.remove();
    secondRow.remove();
  });
});
