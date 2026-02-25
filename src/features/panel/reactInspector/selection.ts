import type { ReactComponentInfo } from '../../../shared/inspector/types';

export interface SelectReactComponentOptions {
  highlightDom?: boolean;
  scrollIntoView?: boolean;
  expandAncestors?: boolean;
}

interface DetailFetchQueueLike {
  request: (component: ReactComponentInfo) => void;
  getLastFailedAt: (componentId: string) => number | undefined;
}

interface CreateReactComponentSelectorOptions {
  getReactComponents: () => ReactComponentInfo[];
  setSelectedComponentIndex: (index: number) => void;
  clearPageHoverPreview: () => void;
  expandAncestorPaths: (indices: number[]) => void;
  renderReactComponentList: () => void;
  scheduleScrollSelectedComponentIntoView: () => void;
  renderReactComponentDetail: (component: ReactComponentInfo) => void;
  setReactDetailEmpty: (text: string) => void;
  highlightPageDomForComponent: (component: ReactComponentInfo) => void;
  detailFetchQueue: DetailFetchQueueLike;
  detailFetchRetryCooldownMs: number;
}

type DetailPaneAction =
  | { kind: 'renderReady' }
  | { kind: 'waitCooldown'; text: string }
  | { kind: 'requestDetail'; text: string };

/** 선택 옵션의 기본값을 적용해 동작 플래그를 정규화한다. */
function normalizeSelectOptions(options: SelectReactComponentOptions): Required<SelectReactComponentOptions> {
  return {
    highlightDom: options.highlightDom !== false,
    scrollIntoView: options.scrollIntoView !== false,
    expandAncestors: options.expandAncestors !== false,
  };
}

/**
 * 선택 컴포넌트의 상세 패널 처리 방식을 결정한다.
 * - 직렬화 데이터가 이미 있으면 즉시 상세 렌더
 * - 최근 실패 후 cooldown이면 안내 문구만 노출
 * - 그 외에는 지연 상세 조회를 재요청
 */
function resolveDetailPaneAction(
  component: ReactComponentInfo,
  lastFailedAt: number | undefined,
  detailFetchRetryCooldownMs: number,
  nowMs: number,
): DetailPaneAction {
  if (component.hasSerializedData !== false) {
    return { kind: 'renderReady' };
  }
  if (
    typeof lastFailedAt === 'number' &&
    nowMs - lastFailedAt < detailFetchRetryCooldownMs
  ) {
    return {
      kind: 'waitCooldown',
      text: '상세 정보가 커서 지연됩니다. 잠시 후 다시 선택하세요.',
    };
  }
  return {
    kind: 'requestDetail',
    text: '컴포넌트 상세 정보 조회 중…',
  };
}

/**
 * React 컴포넌트 선택 시퀀스를 구성한다.
 * controller는 상태 저장소를 보유하고, 이 모듈은 선택/상세/하이라이트 정책을 실행한다.
 */
export function createReactComponentSelector(options: CreateReactComponentSelectorOptions) {
  return (index: number, selectOptions: SelectReactComponentOptions = {}) => {
    const components = options.getReactComponents();
    if (index < 0 || index >= components.length) return;

    const normalized = normalizeSelectOptions(selectOptions);

    options.clearPageHoverPreview();
    options.setSelectedComponentIndex(index);
    if (normalized.expandAncestors) {
      options.expandAncestorPaths([index]);
    }
    options.renderReactComponentList();
    if (normalized.scrollIntoView) {
      options.scheduleScrollSelectedComponentIntoView();
    }

    const component = components[index];
    const detailAction = resolveDetailPaneAction(
      component,
      options.detailFetchQueue.getLastFailedAt(component.id),
      options.detailFetchRetryCooldownMs,
      Date.now(),
    );

    if (detailAction.kind === 'renderReady') {
      options.renderReactComponentDetail(component);
    } else if (detailAction.kind === 'waitCooldown') {
      options.setReactDetailEmpty(detailAction.text);
    } else {
      options.setReactDetailEmpty(detailAction.text);
      options.detailFetchQueue.request(component);
    }

    if (normalized.highlightDom) {
      options.highlightPageDomForComponent(component);
    }
  };
}
