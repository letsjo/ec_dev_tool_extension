import { describe, expect, it, vi } from 'vitest';
import type { ReactComponentInfo } from '../../src/shared/inspector';
import { createPanelSelectionSyncHandlers } from '../../src/features/panel/pageAgent/selectionSync';

function createComponent(overrides: Partial<ReactComponentInfo>): ReactComponentInfo {
  return {
    id: 'cmp-1',
    parentId: null,
    name: 'Component',
    kind: 'FunctionComponent',
    depth: 0,
    props: null,
    hooks: null,
    hookCount: 0,
    domSelector: '#name',
    domPath: 'path:프로젝트',
    domTagName: 'input',
    ...overrides,
  };
}

describe('selectionSync', () => {
  it('passes domPath to preview/highlight calls and domTree sync', () => {
    let highlightDone: ((result: unknown | null, errorText?: string) => void) | null = null;
    const callInspectedPageAgent = vi.fn(
      (_method: string, _args: unknown, onDone: (result: unknown | null, errorText?: string) => void) => {
        highlightDone = onDone;
      },
    );
    const fetchDomTree = vi.fn();

    const handlers = createPanelSelectionSyncHandlers({
      callInspectedPageAgent,
      setReactStatus: vi.fn(),
      setElementOutput: vi.fn(),
      setDomTreeStatus: vi.fn(),
      setDomTreeEmpty: vi.fn(),
      fetchDomTree,
    });

    const component = createComponent({});

    handlers.previewPageDomForComponent(component);
    expect(callInspectedPageAgent).toHaveBeenNthCalledWith(
      1,
      'previewComponent',
      { selector: '#name', domPath: 'path:프로젝트' },
      expect.any(Function),
    );

    handlers.highlightPageDomForComponent(component);
    expect(callInspectedPageAgent).toHaveBeenNthCalledWith(
      2,
      'highlightComponent',
      { selector: '#name', domPath: 'path:프로젝트' },
      expect.any(Function),
    );

    highlightDone?.({
      ok: true,
      selector: '#name',
      domPath: 'path:프로젝트',
      tagName: 'input',
      rect: { top: 0, left: 0, width: 10, height: 5 },
    });

    expect(fetchDomTree).toHaveBeenCalledWith('#name', undefined, 'path:프로젝트');
  });
});
