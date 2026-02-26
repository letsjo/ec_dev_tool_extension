import type { ReactComponentInfo } from '../../../shared/inspector';
import { buildReactComponentUpdateFingerprint } from './signatures';

interface BuildReactInspectResultModelParams {
  previousComponents: ReactComponentInfo[];
  incomingComponents: ReactComponentInfo[];
  lightweight: boolean;
  trackUpdates: boolean;
}

interface ReactInspectResultModel {
  reactComponents: ReactComponentInfo[];
  updatedComponentIds: Set<string>;
  componentSearchIncludeDataTokens: boolean;
}

/**
 * reactInspect 응답 컴포넌트를 현재 패널 상태에 맞게 정규화한다.
 * 경량 모드에서는 직렬화 데이터가 없는 항목에 한해 이전 props/hooks를 재사용한다.
 */
function normalizeIncomingComponents(
  incomingComponents: ReactComponentInfo[],
  previousComponentById: Map<string, ReactComponentInfo>,
  lightweight: boolean,
): ReactComponentInfo[] {
  return incomingComponents.map((component) => {
    const previous = previousComponentById.get(component.id);
    const hasSerializedData = component.hasSerializedData !== false;
    const shouldReusePreviousData = lightweight && !hasSerializedData && Boolean(previous);

    return {
      ...component,
      parentId: component.parentId ?? null,
      props: shouldReusePreviousData ? previous?.props : component.props,
      hooks: shouldReusePreviousData ? previous?.hooks : component.hooks,
      hookCount:
        typeof component.hookCount === 'number'
          ? component.hookCount
          : shouldReusePreviousData
            ? (previous?.hookCount ?? 0)
            : 0,
      hasSerializedData:
        hasSerializedData || (shouldReusePreviousData && previous?.hasSerializedData !== false),
    };
  });
}

/** 경량 갱신에서 이전/현재 fingerprint를 비교해 변경 컴포넌트 id 집합을 계산한다. */
function computeUpdatedComponentIds(
  previousComponents: ReactComponentInfo[],
  nextComponents: ReactComponentInfo[],
  lightweight: boolean,
  trackUpdates: boolean,
): Set<string> {
  const updatedComponentIds = new Set<string>();
  if (!trackUpdates || previousComponents.length === 0) {
    return updatedComponentIds;
  }

  const previousFingerprintById = new Map<string, string>(
    previousComponents.map((component) => [
      component.id,
      buildReactComponentUpdateFingerprint(component, lightweight),
    ]),
  );
  nextComponents.forEach((component) => {
    const previousFingerprint = previousFingerprintById.get(component.id);
    const nextFingerprint = buildReactComponentUpdateFingerprint(component, lightweight);
    if (previousFingerprint !== nextFingerprint) {
      updatedComponentIds.add(component.id);
    }
  });
  return updatedComponentIds;
}

/**
 * applyReactInspectResult의 "데이터 정규화 + 변경 감지" 단계를 모델화한다.
 * controller는 이 결과를 상태에 반영하고 후속 렌더 오케스트레이션만 담당한다.
 */
export function buildReactInspectResultModel(
  params: BuildReactInspectResultModelParams,
): ReactInspectResultModel {
  const previousComponentById = new Map<string, ReactComponentInfo>(
    params.previousComponents.map((component) => [component.id, component]),
  );
  const reactComponents = normalizeIncomingComponents(
    params.incomingComponents,
    previousComponentById,
    params.lightweight,
  );
  const updatedComponentIds = computeUpdatedComponentIds(
    params.previousComponents,
    reactComponents,
    params.lightweight,
    params.trackUpdates,
  );

  return {
    reactComponents,
    updatedComponentIds,
    componentSearchIncludeDataTokens: !params.lightweight,
  };
}
