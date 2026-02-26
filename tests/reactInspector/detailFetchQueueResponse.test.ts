import { describe, expect, it } from 'vitest';
import { resolveDetailFetchPayload } from '../../src/features/panel/reactInspector/detail/detailFetchQueueResponse';

describe('detailFetchQueueResponse', () => {
  it('returns prefixed error payload when runtime call fails', () => {
    const payload = resolveDetailFetchPayload({
      response: null,
      errorText: 'timeout',
      componentId: 'cmp-1',
    });

    expect(payload).toEqual({
      ok: false,
      reason: 'timeout',
      shouldPrefixError: true,
    });
  });

  it('returns stale selection message when component detail is missing', () => {
    const payload = resolveDetailFetchPayload({
      response: {
        ok: true,
        components: [],
        selectedIndex: -1,
      },
      componentId: 'cmp-1',
    });

    expect(payload).toEqual({
      ok: false,
      reason: '선택 컴포넌트를 갱신하지 못했습니다. 다시 선택해 주세요.',
      shouldPrefixError: false,
    });
  });

  it('builds detail payload when component exists with serialized data', () => {
    const payload = resolveDetailFetchPayload({
      response: {
        ok: true,
        components: [
          {
            id: 'cmp-1',
            parentId: null,
            name: 'Component',
            kind: 'function',
            depth: 0,
            hookCount: 1,
            hasSerializedData: true,
            domSelector: null,
            domPath: null,
            domTagName: null,
            props: { value: 1 },
            hooks: [{ name: 'State', index: 0, state: 1 }],
          },
        ],
        selectedIndex: 0,
      },
      componentId: 'cmp-1',
    });

    expect(payload).toEqual({
      ok: true,
      detail: {
        ok: true,
        componentId: 'cmp-1',
        props: { value: 1 },
        hooks: [{ name: 'State', index: 0, state: 1 }],
        hookCount: 1,
      },
    });
  });
});
