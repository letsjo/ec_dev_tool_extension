import {
  applyStyleToSelector,
  clearStoredStyleSnapshot,
} from './pageAgentDomHighlightState';
import { isRecord } from '../../shared/inspector';
import type { PageHighlightResult } from '../../shared/inspector';

interface CreateDomHighlightHandlersOptions {
  componentHighlightStorageKey: string;
  hoverPreviewStorageKey: string;
  buildCssSelector: (el: Element | null) => string;
  getElementPath: (el: Element | null) => string;
}

interface HighlightArgs {
  selector: string;
}

type SimpleStatusResult = { ok: true } | { ok: false; error: string };

function readHighlightArgs(args: unknown): HighlightArgs {
  if (!isRecord(args)) {
    return { selector: '' };
  }
  return {
    selector: typeof args.selector === 'string' ? args.selector : '',
  };
}

/** component highlight/hover preview 상태 복원/적용 핸들러를 구성한다. */
export function createDomHighlightHandlers(options: CreateDomHighlightHandlersOptions) {
  /** 기존 상태를 정리 */
  function clearComponentHighlight(): SimpleStatusResult {
    return clearStoredStyleSnapshot(options.componentHighlightStorageKey);
  }

  /** 기존 상태를 정리 */
  function clearHoverPreview(): SimpleStatusResult {
    return clearStoredStyleSnapshot(options.hoverPreviewStorageKey);
  }

  /** 해당 기능 흐름을 처리 */
  function highlightComponent(args: unknown): PageHighlightResult {
    const { selector } = readHighlightArgs(args);
    try {
      const applied = applyStyleToSelector(
        {
          storageKey: options.componentHighlightStorageKey,
          selector,
          outline: '2px solid #ff6d00',
          boxShadow: '0 0 0 2px rgba(255,109,0,0.25)',
          shouldScrollIntoView: true,
        });
      if (!applied.ok) {
        return applied;
      }

      const el = applied.el;
      const rect = el.getBoundingClientRect();
      return {
        ok: true,
        tagName: String(el.tagName || '').toLowerCase(),
        selector: options.buildCssSelector(el),
        domPath: options.getElementPath(el),
        rect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
      };
    } catch (error: unknown) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        selector,
      };
    }
  }

  /** 해당 기능 흐름을 처리 */
  function previewComponent(args: unknown): SimpleStatusResult {
    const { selector } = readHighlightArgs(args);
    try {
      const applied = applyStyleToSelector(
        {
          storageKey: options.hoverPreviewStorageKey,
          selector,
          outline: '2px solid #49a5ff',
          boxShadow: '0 0 0 2px rgba(73,165,255,0.3)',
          shouldScrollIntoView: false,
        });
      if (!applied.ok) {
        return applied;
      }
      return { ok: true };
    } catch (error: unknown) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return {
    clearComponentHighlight,
    clearHoverPreview,
    highlightComponent,
    previewComponent,
  };
}
