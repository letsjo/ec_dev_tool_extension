import { describe, expect, it } from 'vitest';
import {
  findCommonAncestorFrameIndex,
  findPrimitiveFrameIndex,
  inferGroupPathFromAllFrames,
  inferGroupPathFromTrimmedStack,
  normalizePrimitiveHookName,
} from '../../src/content/hooks/pageAgentHookGrouping';
import type { StackFrame } from '../../src/content/hooks/pageAgentHookStack';

function frame(functionName: string | null, source: string | null): StackFrame {
  return {
    functionName,
    source,
  };
}

describe('pageAgentHookGrouping', () => {
  it('finds common ancestor index from root/hook frames', () => {
    const rootFrames = [
      frame('App', 'root-a.ts:1'),
      frame('AppBody', 'root-b.ts:1'),
      frame('useFeature', 'root-c.ts:1'),
    ];
    const hookFrames = [
      frame('dispatchAction', 'react-dom.ts:1'),
      frame('useFeature', 'root-b.ts:1'),
      frame('useInner', 'root-c.ts:1'),
    ];

    expect(findCommonAncestorFrameIndex(rootFrames, hookFrames)).toBe(1);
  });

  it('infers custom hook path from trimmed/all frames', () => {
    const frames = [
      frame('useForm', 'app.tsx:10'),
      frame('useField', 'app.tsx:20'),
      frame('useField', 'app.tsx:21'),
      frame('useReducer', 'react-dom.ts:99'),
    ];

    const entry = {
      primitive: 'Reducer',
      dispatcherHookName: 'Reducer',
    };

    expect(inferGroupPathFromTrimmedStack(frames, entry, 'App')).toEqual(['Field', 'Form']);
    expect(inferGroupPathFromAllFrames(frames, entry, 'App')).toEqual(['Field', 'Form']);
  });

  it('finds primitive frame index with host transition wrapper offset', () => {
    const hookFrames = [
      frame('useState', 'a.ts:1'),
      frame('useFormStatus', 'wrapper.ts:2'),
      frame('useFormStatus', 'wrapper.ts:3'),
      frame('useState', 'b.ts:1'),
    ];

    const primitiveStackCache = new Map<string, StackFrame[]>();
    primitiveStackCache.set('HostTransitionStatus', [
      frame('useState', 'a.ts:1'),
      frame('useState', 'b.ts:1'),
    ]);

    expect(
      findPrimitiveFrameIndex(
        hookFrames,
        {
          primitive: 'HostTransitionStatus',
          dispatcherHookName: 'HostTransitionStatus',
        },
        primitiveStackCache,
      ),
    ).toBe(3);
  });

  it('normalizes primitive names from primitive/dispatcher candidates', () => {
    expect(normalizePrimitiveHookName('Context (use)', null)).toBe('Context');
    expect(normalizePrimitiveHookName(null, 'useTransition')).toBe('Transition');
    expect(normalizePrimitiveHookName('unstable_useOptimistic', null)).toBe('Optimistic');
  });
});
