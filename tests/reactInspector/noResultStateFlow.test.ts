import { describe, expect, it, vi } from 'vitest';
import { createSearchNoResultStateFlow } from '../../src/features/panel/reactInspector/flow/noResultStateFlow';

describe('createSearchNoResultStateFlow', () => {
  it('applies search-input no-result state and clears hover preview when requested', () => {
    const renderReactComponentList = vi.fn();
    const setReactDetailEmpty = vi.fn();
    const setReactStatus = vi.fn();
    const clearPageHoverPreview = vi.fn();
    const clearPageComponentHighlight = vi.fn();
    const setDomTreeStatus = vi.fn();
    const setDomTreeEmpty = vi.fn();

    const applySearchNoResultState = createSearchNoResultStateFlow({
      getTotalComponentCount: () => 4,
      renderReactComponentList,
      setReactDetailEmpty,
      setReactStatus,
      clearPageHoverPreview,
      clearPageComponentHighlight,
      setDomTreeStatus,
      setDomTreeEmpty,
    });

    applySearchNoResultState('searchInput', { clearHoverPreview: true });

    expect(renderReactComponentList).toHaveBeenCalledTimes(1);
    expect(setReactDetailEmpty).toHaveBeenCalledWith('검색 결과가 없습니다.');
    expect(setReactStatus).toHaveBeenCalledWith('검색 결과가 없습니다. (총 4개)', true);
    expect(clearPageHoverPreview).toHaveBeenCalledTimes(1);
    expect(clearPageComponentHighlight).toHaveBeenCalledTimes(1);
    expect(setDomTreeStatus).toHaveBeenCalledWith(
      '검색 조건과 일치하는 컴포넌트가 없습니다.',
      true,
    );
    expect(setDomTreeEmpty).toHaveBeenCalledWith('표시할 DOM이 없습니다.');
  });

  it('applies inspect-result no-result state without clearing hover by default', () => {
    const clearPageHoverPreview = vi.fn();
    const clearPageComponentHighlight = vi.fn();

    const applySearchNoResultState = createSearchNoResultStateFlow({
      getTotalComponentCount: () => 2,
      renderReactComponentList: vi.fn(),
      setReactDetailEmpty: vi.fn(),
      setReactStatus: vi.fn(),
      clearPageHoverPreview,
      clearPageComponentHighlight,
      setDomTreeStatus: vi.fn(),
      setDomTreeEmpty: vi.fn(),
    });

    applySearchNoResultState('inspectResult');

    expect(clearPageHoverPreview).not.toHaveBeenCalled();
    expect(clearPageComponentHighlight).toHaveBeenCalledTimes(1);
  });
});
