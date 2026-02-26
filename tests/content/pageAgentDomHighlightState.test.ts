import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyStyleToSelector,
  clearStoredStyleSnapshot,
} from '../../src/content/pageAgentDomHighlightState';

const STORAGE_KEY = '__TEST_DOM_HIGHLIGHT_STATE__';

function getWindowStore() {
  return window as unknown as Record<string, unknown>;
}

describe('pageAgentDomHighlightState', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    getWindowStore()[STORAGE_KEY] = null;
  });

  it('returns failure when selector target is missing', () => {
    expect(
      applyStyleToSelector({
        storageKey: STORAGE_KEY,
        selector: '#missing',
        outline: '2px solid #000',
        boxShadow: '0 0 0 2px rgba(0,0,0,0.3)',
        shouldScrollIntoView: false,
      }),
    ).toEqual({
      ok: false,
      error: '요소를 찾을 수 없습니다.',
      selector: '#missing',
    });
  });

  it('restores previous style snapshot on clear', () => {
    const target = document.createElement('div');
    target.id = 'state-target';
    target.style.outline = '1px solid red';
    target.style.boxShadow = 'none';
    target.style.transition = 'opacity 120ms ease';
    document.body.append(target);

    const applied = applyStyleToSelector({
      storageKey: STORAGE_KEY,
      selector: '#state-target',
      outline: '2px solid #49a5ff',
      boxShadow: '0 0 0 2px rgba(73,165,255,0.3)',
      shouldScrollIntoView: false,
    });
    expect(applied.ok).toBe(true);
    expect(target.style.outline).not.toBe('1px solid red');

    expect(clearStoredStyleSnapshot(STORAGE_KEY)).toEqual({ ok: true });
    expect(target.style.outline).toBe('1px solid red');
    expect(target.style.boxShadow).toBe('none');
    expect(target.style.transition).toBe('opacity 120ms ease');
    expect(getWindowStore()[STORAGE_KEY]).toBeNull();
  });
});
