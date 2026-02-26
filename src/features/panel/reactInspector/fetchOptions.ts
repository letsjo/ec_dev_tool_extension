import type { ReactComponentInfo } from '../../../shared/inspector';
import type { ReactInspectApplyOptions } from '../pageAgent/responsePipeline';

export type ReactPayloadMode = 'lite' | 'full';

export interface FetchReactInfoOptions extends ReactInspectApplyOptions {
  keepLookup?: boolean;
  background?: boolean;
  serializeSelectedComponent?: boolean;
  onDone?: () => void;
}

/**
 * fetchReactInfo 옵션에서 apply 파이프라인에 필요한 필드만 추출한다.
 * controller는 전달 객체 조립 대신 이 함수를 통해 일관된 옵션 매핑을 사용한다.
 */
export function buildReactInspectApplyOptions(
  options: FetchReactInfoOptions,
): ReactInspectApplyOptions {
  return {
    preserveSelection: options.preserveSelection,
    preserveCollapsed: options.preserveCollapsed,
    highlightSelection: options.highlightSelection,
    scrollSelectionIntoView: options.scrollSelectionIntoView,
    expandSelectionAncestors: options.expandSelectionAncestors,
    lightweight: options.lightweight,
    trackUpdates: options.trackUpdates,
    refreshDetail: options.refreshDetail,
    statusText: options.statusText,
  };
}

interface ResolveSelectedComponentIdForScriptParams {
  options: FetchReactInfoOptions;
  selectedReactComponentIndex: number;
  reactComponents: ReactComponentInfo[];
}

/** 경량 모드 선택 컴포넌트 직렬화 여부에 따라 script 인자로 넘길 componentId를 계산한다. */
export function resolveSelectedComponentIdForScript(
  params: ResolveSelectedComponentIdForScriptParams,
): string | null {
  const { options, selectedReactComponentIndex, reactComponents } = params;
  const lightweight = options.lightweight === true;
  if (!lightweight || options.serializeSelectedComponent !== true) {
    return null;
  }
  if (
    selectedReactComponentIndex < 0 ||
    selectedReactComponentIndex >= reactComponents.length
  ) {
    return null;
  }
  return reactComponents[selectedReactComponentIndex].id;
}

function isLightweightPayloadMode(mode: ReactPayloadMode): boolean {
  return mode !== 'full';
}

/** runtime refresh 경로의 fetch 옵션 프리셋을 생성한다. */
export function createRuntimeRefreshFetchOptions(
  background: boolean,
  payloadMode: ReactPayloadMode,
  onDone?: () => void,
): FetchReactInfoOptions {
  const lightweight = isLightweightPayloadMode(payloadMode);
  return {
    keepLookup: true,
    background,
    preserveSelection: true,
    preserveCollapsed: true,
    highlightSelection: false,
    scrollSelectionIntoView: false,
    expandSelectionAncestors: false,
    lightweight,
    serializeSelectedComponent: false,
    trackUpdates: true,
    refreshDetail: !background,
    onDone,
  };
}

const ELEMENT_SELECTION_FETCH_OPTIONS: Readonly<Omit<FetchReactInfoOptions, 'lightweight'>> = {
  serializeSelectedComponent: false,
  // 요소 선택 완료 직후에는 선택 컴포넌트 DOM 하이라이트를 다시 적용해
  // 페이지 주황색 박스와 Selected Element/DOM Tree 동기화를 유지한다.
  highlightSelection: true,
  refreshDetail: true,
};

/** 요소 선택 완료 직후의 reactInspect 조회 옵션 프리셋을 생성한다. */
export function createElementSelectionFetchOptions(
  payloadMode: ReactPayloadMode,
): FetchReactInfoOptions {
  return {
    ...ELEMENT_SELECTION_FETCH_OPTIONS,
    lightweight: isLightweightPayloadMode(payloadMode),
  };
}
