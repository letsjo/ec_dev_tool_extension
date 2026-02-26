import { describe, expect, it } from 'vitest';
import { parseInspectReactPathArgs } from '../../src/content/inspect/path/pageAgentInspectPathArgs';

describe('pageAgentInspectPathArgs', () => {
  it('normalizes inspect path args from unknown payload', () => {
    expect(parseInspectReactPathArgs(null)).toEqual({
      componentId: '',
      selector: '',
      pickPoint: undefined,
      section: 'props',
      path: [],
      mode: 'serializeValue',
      serializeLimit: 45000,
    });
  });

  it('keeps valid fields and clamps serializeLimit minimum', () => {
    expect(
      parseInspectReactPathArgs({
        componentId: 'cmp-1',
        selector: '#root',
        pickPoint: { x: 3, y: 8 },
        section: 'hooks',
        path: ['state', 0, { invalid: true }],
        mode: 'inspectFunction',
        serializeLimit: 120,
      }),
    ).toEqual({
      componentId: 'cmp-1',
      selector: '#root',
      pickPoint: { x: 3, y: 8 },
      section: 'hooks',
      path: ['state', 0],
      mode: 'inspectFunction',
      serializeLimit: 1000,
    });
  });
});
