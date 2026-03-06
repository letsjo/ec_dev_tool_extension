type PickerStopReason = "selected" | "cancelled";

interface CreateElementPickerOverlayControllerArgs {
  notifyPickerStopped: (reason: PickerStopReason) => void;
  sendElementPreviewed: (clientX: number, clientY: number, target: Element) => void;
  sendElementSelected: (clientX: number, clientY: number, target: Element) => void;
}

interface ElementPickerOverlayController {
  startPicking: () => void;
  stopPicking: (reason?: PickerStopReason) => void;
  confirmSelectionByKeyboard: () => boolean;
  emitPreviewSnapshot: () => boolean;
}

const OVERLAY_ID = "ec-dev-tool-element-picker-overlay";
const HIGHLIGHT_CLASS = "ec-dev-tool-picker-highlight";
const PICK_FOCUSED_ELEMENT_KEY = "Enter";

function consumeOverlayEvent(event: Event) {
  event.preventDefault();
  event.stopPropagation();
  const eventWithImmediateStop = event as Event & { stopImmediatePropagation?: () => void };
  eventWithImmediateStop.stopImmediatePropagation?.();
}

/** 키보드 선택 확정 시 요소 중심 좌표를 계산한다. */
function resolveSelectionPoint(target: Element): { clientX: number; clientY: number } {
  if (!(target instanceof HTMLElement)) {
    return { clientX: 0, clientY: 0 };
  }
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return {
      clientX: Math.max(0, Math.floor(rect.left)),
      clientY: Math.max(0, Math.floor(rect.top)),
    };
  }
  return {
    clientX: Math.max(0, Math.floor(rect.left + rect.width / 2)),
    clientY: Math.max(0, Math.floor(rect.top + rect.height / 2)),
  };
}

/** 요소 선택 오버레이 생성/하이라이트/클릭/Enter 확정 선택 상태를 관리한다. */
function createElementPickerOverlayController(
  args: CreateElementPickerOverlayControllerArgs,
): ElementPickerOverlayController {
  const {
    notifyPickerStopped,
    sendElementPreviewed,
    sendElementSelected,
  } = args;

  let overlay: HTMLDivElement | null = null;
  let lastHighlight: HTMLElement | null = null;
  let onMoveHandler: ((e: MouseEvent) => void) | null = null;
  let onClickHandler: ((e: MouseEvent) => void) | null = null;
  let onKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  let onFocusInHandler: ((e: FocusEvent) => void) | null = null;
  let onPointerDownHandler: EventListener | null = null;
  let onPointerUpHandler: EventListener | null = null;
  let onMouseDownHandler: EventListener | null = null;
  let onMouseUpHandler: EventListener | null = null;
  let onContextMenuHandler: EventListener | null = null;

  function highlight(el: HTMLElement | null) {
    if (lastHighlight === el) return;
    if (lastHighlight) {
      lastHighlight.classList.remove(HIGHLIGHT_CLASS);
      lastHighlight.style.outline = (lastHighlight as unknown as { _ecOutline?: string })._ecOutline ?? "";
      (lastHighlight as unknown as { _ecOutline?: string })._ecOutline = undefined;
    }
    lastHighlight = el ?? null;
    if (el) {
      const prev = el.style.outline;
      (el as unknown as { _ecOutline?: string })._ecOutline = prev;
      el.style.outline = "2px solid #1a73e8";
      el.classList.add(HIGHLIGHT_CLASS);
    }
  }

  function isPreviewableElement(target: Element | null): target is HTMLElement {
    return Boolean(target) && target instanceof HTMLElement && target !== overlay;
  }

  function updateHighlightPreview(
    target: Element | null,
    clientX?: number,
    clientY?: number,
    force = false,
  ) {
    const nextTarget = isPreviewableElement(target) ? target : null;
    const changed = lastHighlight !== nextTarget;
    highlight(nextTarget);
    if ((!changed && !force) || !nextTarget) {
      return;
    }

    const previewPoint =
      typeof clientX === "number" && typeof clientY === "number"
        ? { clientX, clientY }
        : resolveSelectionPoint(nextTarget);
    sendElementPreviewed(previewPoint.clientX, previewPoint.clientY, nextTarget);
  }

  function createOverlay(): HTMLDivElement {
    const div = document.createElement("div");
    div.id = OVERLAY_ID;
    div.style.cssText = [
      "position:fixed;inset:0;z-index:2147483647;cursor:crosshair;",
      "background:rgba(26,115,232,0.05);pointer-events:auto;",
    ].join(" ");
    return div;
  }

  /** 현재 상태(하이라이트 우선, 없으면 포커스 요소)에서 선택 확정을 시도한다. */
  function resolveCurrentTarget(): Element | null {
    if (!overlay) return null;
    const focusedElement = document.activeElement;
    return (
      lastHighlight ??
      (focusedElement instanceof Element &&
      focusedElement !== document.body &&
      focusedElement !== document.documentElement &&
      focusedElement !== overlay
        ? focusedElement
        : null)
    );
  }

  /** 현재 상태(하이라이트 우선, 없으면 포커스 요소)에서 선택 확정을 시도한다. */
  function confirmSelectionByKeyboard(): boolean {
    if (!overlay) return false;
    const target = resolveCurrentTarget();
    if (!target) return false;

    const { clientX, clientY } = resolveSelectionPoint(target);
    sendElementSelected(clientX, clientY, target);
    stopPicking("selected");
    return true;
  }

  /** panel이 picker 활성화 직후 현재 target preview를 재요청할 때 사용한다. */
  function emitPreviewSnapshot(): boolean {
    if (!overlay) return false;
    const target = resolveCurrentTarget();
    if (!target) return false;
    updateHighlightPreview(target, undefined, undefined, true);
    return true;
  }

  function stopPicking(reason: PickerStopReason = "cancelled") {
    highlight(null);
    const hadOverlay = Boolean(overlay);
    if (overlay) {
      if (onMoveHandler) overlay.removeEventListener("mousemove", onMoveHandler);
      if (onClickHandler) overlay.removeEventListener("click", onClickHandler, true);
      if (onPointerDownHandler) {
        overlay.removeEventListener("pointerdown", onPointerDownHandler, true);
      }
      if (onPointerUpHandler) {
        overlay.removeEventListener("pointerup", onPointerUpHandler, true);
      }
      if (onMouseDownHandler) {
        overlay.removeEventListener("mousedown", onMouseDownHandler, true);
      }
      if (onMouseUpHandler) {
        overlay.removeEventListener("mouseup", onMouseUpHandler, true);
      }
      if (onContextMenuHandler) {
        overlay.removeEventListener("contextmenu", onContextMenuHandler, true);
      }
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    if (onKeyDownHandler) {
      document.removeEventListener("keydown", onKeyDownHandler);
    }
    if (onFocusInHandler) {
      document.removeEventListener("focusin", onFocusInHandler, true);
    }
    overlay = null;
    lastHighlight = null;
    onMoveHandler = null;
    onClickHandler = null;
    onKeyDownHandler = null;
    onFocusInHandler = null;
    onPointerDownHandler = null;
    onPointerUpHandler = null;
    onMouseDownHandler = null;
    onMouseUpHandler = null;
    onContextMenuHandler = null;

    if (hadOverlay) {
      notifyPickerStopped(reason);
    }
  }

  function startPicking() {
    if (overlay) return;
    overlay = createOverlay();
    document.documentElement.appendChild(overlay);

    const onMove = (e: MouseEvent) => {
      if (!overlay) return;
      consumeOverlayEvent(e);
      overlay.style.pointerEvents = "none";
      const el = document.elementFromPoint(e.clientX, e.clientY);
      overlay.style.pointerEvents = "auto";
      updateHighlightPreview(el, e.clientX, e.clientY);
    };

    const onClick = (e: MouseEvent) => {
      if (!overlay) return;
      consumeOverlayEvent(e);
      overlay.style.pointerEvents = "none";
      const el = document.elementFromPoint(e.clientX, e.clientY);
      overlay.style.pointerEvents = "auto";
      if (el && el !== overlay) {
        sendElementSelected(e.clientX, e.clientY, el);
      }
      stopPicking("selected");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        consumeOverlayEvent(e);
        stopPicking("cancelled");
        return;
      }
      if (e.key === PICK_FOCUSED_ELEMENT_KEY) {
        consumeOverlayEvent(e);
        confirmSelectionByKeyboard();
      }
    };

    const onFocusIn = (e: FocusEvent) => {
      if (!overlay) return;
      updateHighlightPreview(e.target instanceof Element ? e.target : null);
    };

    const blockPointerEvent: EventListener = (event) => {
      consumeOverlayEvent(event);
    };

    onMoveHandler = onMove;
    onClickHandler = onClick;
    onKeyDownHandler = onKeyDown;
    onFocusInHandler = onFocusIn;
    onPointerDownHandler = blockPointerEvent;
    onPointerUpHandler = blockPointerEvent;
    onMouseDownHandler = blockPointerEvent;
    onMouseUpHandler = blockPointerEvent;
    onContextMenuHandler = blockPointerEvent;

    overlay.addEventListener("mousemove", onMoveHandler);
    overlay.addEventListener("click", onClickHandler, true);
    overlay.addEventListener("pointerdown", onPointerDownHandler, true);
    overlay.addEventListener("pointerup", onPointerUpHandler, true);
    overlay.addEventListener("mousedown", onMouseDownHandler, true);
    overlay.addEventListener("mouseup", onMouseUpHandler, true);
    overlay.addEventListener("contextmenu", onContextMenuHandler, true);
    document.addEventListener("keydown", onKeyDownHandler);
    document.addEventListener("focusin", onFocusInHandler, true);

    const focusedElement = document.activeElement instanceof Element
      ? document.activeElement
      : null;
    // picker 시작 시 이미 포커스된 입력 요소가 있으면 첫 hover 이전에도
    // Selected Element/DOM Tree 미리보기가 채워지도록 즉시 preview를 보낸다.
    if (focusedElement && focusedElement !== document.body && focusedElement !== document.documentElement) {
      updateHighlightPreview(focusedElement);
    }
  }

  return {
    startPicking,
    stopPicking,
    confirmSelectionByKeyboard,
    emitPreviewSnapshot,
  };
}

export { createElementPickerOverlayController };
export type { PickerStopReason };
