import type {
  ComponentFilterResult,
  ReactComponentInfo,
} from '../../../shared/inspector';
import { hashValueForSignature } from './signatureHash';

/** 상세 패널 렌더 최소 변경 판별용 시그니처를 만든다. */
export function buildReactComponentDetailRenderSignature(component: ReactComponentInfo): string {
  return [
    component.id,
    component.name,
    component.kind,
    component.domSelector ?? '',
    component.domPath ?? '',
    String(component.hookCount),
    `p:${hashValueForSignature(component.props)}`,
    `h:${hashValueForSignature(component.hooks)}`,
  ].join('|');
}

/** 런타임 갱신에서 변경 컴포넌트를 찾기 위한 지문을 만든다. */
export function buildReactComponentUpdateFingerprint(
  component: ReactComponentInfo,
  metadataOnly = false,
): string {
  const baseParts = [
    component.id,
    component.parentId ?? '',
    component.name,
    component.kind,
    component.domSelector ?? '',
    component.domPath ?? '',
    String(component.hookCount),
  ];
  if (metadataOnly) {
    return baseParts.join('|');
  }
  return [
    ...baseParts,
    `p:${hashValueForSignature(component.props, 1600)}`,
    `h:${hashValueForSignature(component.hooks, 1600)}`,
  ].join('|');
}

/** 목록 렌더 영향 요소를 직렬화해 리스트 시그니처를 만든다. */
export function buildReactListRenderSignature(
  reactComponents: ReactComponentInfo[],
  componentSearchQuery: string,
  selectedReactComponentIndex: number,
  collapsedComponentIds: ReadonlySet<string>,
  filterResult: ComponentFilterResult,
  matchedIndexSet: ReadonlySet<number>,
): string {
  const parts: string[] = [
    componentSearchQuery.trim().toLowerCase(),
    `sel:${selectedReactComponentIndex}`,
    `visible:${filterResult.visibleIndices.length}`,
    `matched:${filterResult.matchedIndices.length}`,
  ];

  filterResult.visibleIndices.forEach((index) => {
    const component = reactComponents[index];
    const matchFlag = matchedIndexSet.has(index) ? '1' : '0';
    const collapsedFlag = collapsedComponentIds.has(component.id) ? '1' : '0';
    parts.push(
      [
        String(index),
        component.id,
        component.parentId ?? '',
        component.name,
        component.kind,
        String(component.depth),
        component.domSelector ? 'dom' : 'no-dom',
        matchFlag,
        collapsedFlag,
      ].join(':'),
    );
  });

  return parts.join('\u001f');
}
