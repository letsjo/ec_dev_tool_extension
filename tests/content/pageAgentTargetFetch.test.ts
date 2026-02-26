import { afterEach, describe, expect, it } from 'vitest';
import { fetchTargetData } from '../../src/content/pageAgentTargetFetch';

const TARGET_KEY = '__EC_DEV_TOOL_TARGET_FETCH_TEST__';

describe('pageAgentTargetFetch', () => {
  afterEach(() => {
    delete (window as Record<string, unknown>)[TARGET_KEY];
  });

  it('returns error when target path is empty', () => {
    expect(fetchTargetData(null)).toEqual({
      error: '대상 경로가 비어 있습니다.',
    });
  });

  it('returns available methods when methods are missing and auto-discovery is disabled', () => {
    (window as Record<string, unknown>)[TARGET_KEY] = {
      alpha() {
        return 1;
      },
      beta() {
        return 2;
      },
    };

    const result = fetchTargetData({
      targetPath: `window.${TARGET_KEY}`,
      methods: [],
      autoDiscoverZeroArgMethods: false,
    });

    expect(result).toEqual(
      expect.objectContaining({
        error:
          '호출할 메서드가 설정되지 않았습니다. src/config.ts에서 methods를 지정하거나 autoDiscoverZeroArgMethods를 true로 설정하세요.',
        targetPath: `window.${TARGET_KEY}`,
        availableMethods: ['alpha', 'beta'],
      }),
    );
  });

  it('auto-discovers zero-arg methods and records invocation errors', () => {
    (window as Record<string, unknown>)[TARGET_KEY] = {
      ok() {
        return 'ok';
      },
      fail() {
        throw new Error('boom');
      },
      oneArg(value: number) {
        return value;
      },
    };

    const result = fetchTargetData({
      targetPath: `window.${TARGET_KEY}`,
      methods: [],
      autoDiscoverZeroArgMethods: true,
    }) as { targetPath: string; results: Record<string, unknown> };

    expect(result.targetPath).toBe(`window.${TARGET_KEY}`);
    expect(result.results.ok).toBe('ok');
    expect(result.results.fail).toEqual({ _error: 'boom' });
    expect('oneArg' in result.results).toBe(false);
  });
});
