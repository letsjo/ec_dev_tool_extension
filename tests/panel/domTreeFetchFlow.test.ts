import { describe, expect, it, vi } from 'vitest';
import type { PageAgentDoneHandler } from '../../src/features/panel/bridge/pageAgentClient';
import { createDomTreeFetchFlow } from '../../src/features/panel/domTree/fetchFlow';
import type { DomTreeNode } from '../../src/shared/inspector';

function createDomTreeNode(tagName: string): DomTreeNode {
  return {
    tagName,
    id: null,
    className: null,
    attributes: [],
    childCount: 0,
    truncatedChildren: 0,
    textPreview: null,
    children: [],
  };
}

describe('createDomTreeFetchFlow', () => {
  it('ignores stale response when multiple fetches overlap', () => {
    const callbacks: PageAgentDoneHandler[] = [];
    const callInspectedPageAgent = vi.fn(
      (_method: string, _args: unknown, onDone: PageAgentDoneHandler) => {
        callbacks.push(onDone);
      },
    );

    const domTreeOutputEl = document.createElement('div');
    const setDomTreeStatus = vi.fn();
    const setDomTreeEmpty = vi.fn();

    const flow = createDomTreeFetchFlow({
      callInspectedPageAgent,
      getDomTreeOutputEl: () => domTreeOutputEl,
      setDomTreeStatus,
      setDomTreeEmpty,
    });

    flow.fetchDomTree('#first');
    flow.fetchDomTree('#second');
    expect(callbacks).toHaveLength(2);

    callbacks[0]({
      ok: true,
      domPath: 'first',
      root: createDomTreeNode('first-root'),
    });

    expect(setDomTreeStatus).toHaveBeenCalledTimes(2);
    expect(setDomTreeEmpty).toHaveBeenCalledTimes(2);
    expect(domTreeOutputEl.childElementCount).toBe(0);

    callbacks[1]({
      ok: true,
      domPath: 'second',
      root: createDomTreeNode('second-root'),
    });

    expect(setDomTreeStatus).toHaveBeenCalledTimes(3);
    expect(setDomTreeStatus).toHaveBeenLastCalledWith('DOM path: second');
    expect(domTreeOutputEl.textContent).toContain('second-root');
  });
});
