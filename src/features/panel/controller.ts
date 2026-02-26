/**
 * DevTools Panel 실행 엔트리.
 *
 * 상세 결선은 `controllerWiring.ts`에서 조립하고,
 * 이 파일은 bootstrap 실행과 fatal error 처리만 담당한다.
 */
import { renderPanelFatalErrorView as renderPanelFatalErrorViewValue } from './lifecycle/fatalErrorView';
import { createPanelControllerWiring } from './controllerWiring';

const { bootstrapPanel } = createPanelControllerWiring();

/** 엔트리 실행을 시작 */
export function runPanel() {
  try {
    bootstrapPanel();
  } catch (error) {
    console.error('[EC Dev Tool] panel bootstrap failed', error);
    renderPanelFatalErrorViewValue(error);
  }
}
