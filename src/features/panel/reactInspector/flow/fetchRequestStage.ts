import type { PickPoint, ReactComponentInfo } from '../../../../shared/inspector/types';
import {
  resolveSelectedComponentIdForScript,
  type FetchReactInfoOptions,
} from '../fetchOptions';
import { resolveStoredLookup, type RuntimeRefreshLookup } from '../lookup';

interface ApplyReactFetchRequestStageOptions {
  selector: string;
  pickPoint: PickPoint | undefined;
  fetchOptions: FetchReactInfoOptions;
  getStoredLookup: () => RuntimeRefreshLookup | null;
  setStoredLookup: (lookup: RuntimeRefreshLookup | null) => void;
  getReactComponents: () => ReactComponentInfo[];
  getSelectedReactComponentIndex: () => number;
  clearPageHoverPreview: () => void;
  clearPageComponentHighlight: () => void;
  applyLoadingPaneState: () => void;
}

interface ReactFetchRequestStageResult {
  lightweight: boolean;
  selectedComponentIdForScript: string | null;
}

/** reactInspect 요청 전 lookup/로딩 상태를 반영하고 스크립트 selected id를 계산한다. */
function applyReactFetchRequestStage(
  options: ApplyReactFetchRequestStageOptions,
): ReactFetchRequestStageResult {
  const background = options.fetchOptions.background === true;
  const lightweight = options.fetchOptions.lightweight === true;

  options.clearPageHoverPreview();
  if (!background) {
    options.clearPageComponentHighlight();
  }

  options.setStoredLookup(
    resolveStoredLookup(
      options.getStoredLookup(),
      { selector: options.selector, pickPoint: options.pickPoint },
      options.fetchOptions.keepLookup === true,
    ),
  );

  // background 새로고침이 아니거나 초기 상태일 때만 로딩 문구를 적극적으로 표시한다.
  if (!background || options.getReactComponents().length === 0) {
    options.applyLoadingPaneState();
  }

  const selectedComponentIdForScript = resolveSelectedComponentIdForScript({
    options: options.fetchOptions,
    selectedReactComponentIndex: options.getSelectedReactComponentIndex(),
    reactComponents: options.getReactComponents(),
  });

  return {
    lightweight,
    selectedComponentIdForScript,
  };
}

export { applyReactFetchRequestStage };
export type { ReactFetchRequestStageResult };
