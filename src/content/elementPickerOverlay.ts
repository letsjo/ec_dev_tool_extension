type PickerStopReason = "selected" | "cancelled";

interface CreateElementPickerOverlayControllerArgs {
  notifyPickerStopped: (reason: PickerStopReason) => void;
  sendElementSelected: (clientX: number, clientY: number, target: Element) => void;
}

interface ElementPickerOverlayController {
  startPicking: () => void;
  stopPicking: (reason?: PickerStopReason) => void;
}

const OVERLAY_ID = "ec-dev-tool-element-picker-overlay";
const HIGHLIGHT_CLASS = "ec-dev-tool-picker-highlight";

/** 요소 선택 오버레이 생성/하이라이트/클릭 선택 상태를 관리한다. */
function createElementPickerOverlayController(
  args: CreateElementPickerOverlayControllerArgs,
): ElementPickerOverlayController {
  const {
    notifyPickerStopped,
    sendElementSelected,
  } = args;

  let overlay: HTMLDivElement | null = null;
  let lastHighlight: HTMLElement | null = null;
  let onMoveHandler: ((e: MouseEvent) => void) | null = null;
  let onClickHandler: ((e: MouseEvent) => void) | null = null;
  let onKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;

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

  function createOverlay(): HTMLDivElement {
    const div = document.createElement("div");
    div.id = OVERLAY_ID;
    div.style.cssText = [
      "position:fixed;inset:0;z-index:2147483647;cursor:crosshair;",
      "background:rgba(26,115,232,0.05);pointer-events:auto;",
    ].join(" ");
    return div;
  }

  function stopPicking(reason: PickerStopReason = "cancelled") {
    highlight(null);
    const hadOverlay = Boolean(overlay);
    if (overlay) {
      if (onMoveHandler) overlay.removeEventListener("mousemove", onMoveHandler);
      if (onClickHandler) overlay.removeEventListener("click", onClickHandler, true);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    if (onKeyDownHandler) {
      document.removeEventListener("keydown", onKeyDownHandler);
    }
    overlay = null;
    lastHighlight = null;
    onMoveHandler = null;
    onClickHandler = null;
    onKeyDownHandler = null;

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
      overlay.style.pointerEvents = "none";
      const el = document.elementFromPoint(e.clientX, e.clientY);
      overlay.style.pointerEvents = "auto";
      const target = el && el !== overlay ? (el as HTMLElement) : null;
      highlight(target);
    };

    const onClick = (e: MouseEvent) => {
      if (!overlay) return;
      e.preventDefault();
      e.stopPropagation();
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
        stopPicking("cancelled");
      }
    };

    onMoveHandler = onMove;
    onClickHandler = onClick;
    onKeyDownHandler = onKeyDown;

    overlay.addEventListener("mousemove", onMoveHandler);
    overlay.addEventListener("click", onClickHandler, true);
    document.addEventListener("keydown", onKeyDownHandler);
  }

  return {
    startPicking,
    stopPicking,
  };
}

export { createElementPickerOverlayController };
export type { PickerStopReason };
