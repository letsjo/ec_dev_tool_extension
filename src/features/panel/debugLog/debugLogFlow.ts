interface CreatePanelDebugLogFlowOptions {
  getDebugLogPaneEl: () => HTMLDivElement;
  getDebugLogCopyBtnEl: () => HTMLButtonElement;
  getDebugLogClearBtnEl?: () => HTMLButtonElement;
  maxEntries?: number;
  now?: () => Date;
  copyText?: (text: string) => Promise<void>;
  onLogAppended?: (eventName: string, payload?: unknown) => void;
}

interface PanelDebugLogFlow {
  appendDebugLog: (eventName: string, payload?: unknown) => void;
  getDebugLogText: () => string;
  clearDebugLog: () => void;
}

const DEFAULT_MAX_DEBUG_LOG_ENTRIES = 700;
const MAX_RENDER_PAYLOAD_LENGTH = 1400;
const MAX_RENDER_LINE_LENGTH = 1800;
const AUTO_SCROLL_BOTTOM_GAP_PX = 24;
const DEBUG_LOG_PLACEHOLDER_TEXT = '디버그 로그가 여기에 누적됩니다.';

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isErrorPayload(payload: unknown): boolean {
  if (!isRecordValue(payload)) return false;
  if (payload.hasError === true || payload.isError === true) return true;

  const errorValue = payload.error;
  if (typeof errorValue === 'string' && errorValue.trim().length > 0) return true;
  const errorTextValue = payload.errorText;
  if (typeof errorTextValue === 'string' && errorTextValue.trim().length > 0) return true;

  return false;
}

/** 이벤트명 규칙(.failure/.error)과 payload error 필드를 함께 보고 오류 레벨을 판별한다. */
function resolveDebugLogLevel(eventName: string, payload?: unknown): 'INFO' | 'ERROR' {
  if (
    eventName.includes('.failure') ||
    eventName.includes('.error') ||
    isErrorPayload(payload)
  ) {
    return 'ERROR';
  }
  return 'INFO';
}

function toIsoTimestamp(date: Date): string {
  return date.toISOString();
}

function safeSerializeDebugPayload(payload: unknown): string {
  if (payload === undefined) return '';
  if (typeof payload === 'string') return payload;

  try {
    const text = JSON.stringify(
      payload,
      (_key, value) => {
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }
        if (typeof value === 'function') {
          return `[Function ${value.name || 'anonymous'}]`;
        }
        return value;
      },
      0,
    );
    if (!text) return '';
    return text.length > MAX_RENDER_PAYLOAD_LENGTH
      ? `${text.slice(0, MAX_RENDER_PAYLOAD_LENGTH)}…(truncated)`
      : text;
  } catch (_) {
    return '[unserializable payload]';
  }
}

function buildDebugLogLine(now: Date, eventName: string, payload?: unknown): string {
  const head = `[${toIsoTimestamp(now)}] [${resolveDebugLogLevel(eventName, payload)}] ${eventName}`;
  const payloadText = safeSerializeDebugPayload(payload);
  if (!payloadText) return head;
  const merged = `${head} ${payloadText}`;
  return merged.length > MAX_RENDER_LINE_LENGTH
    ? `${merged.slice(0, MAX_RENDER_LINE_LENGTH)}…(truncated)`
    : merged;
}

/**
 * 사용자가 이미 로그 하단을 보고 있을 때만 새 로그 도착 시 auto-follow 한다.
 * 수동으로 위로 스크롤한 상태에서는 위치를 유지해 과거 로그 검토를 방해하지 않는다.
 */
function shouldAutoScrollToBottom(paneEl: HTMLDivElement): boolean {
  const distanceToBottom = paneEl.scrollHeight - paneEl.scrollTop - paneEl.clientHeight;
  return distanceToBottom <= AUTO_SCROLL_BOTTOM_GAP_PX;
}

async function copyTextWithFallback(text: string): Promise<void> {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', 'readonly');
  textArea.style.position = 'fixed';
  textArea.style.top = '-9999px';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
}

/** 패널 액션 로그를 누적/표시/복사하는 디버그 로그 플로우 */
export function createPanelDebugLogFlow(
  options: CreatePanelDebugLogFlowOptions,
): PanelDebugLogFlow {
  const maxEntries =
    typeof options.maxEntries === 'number' && options.maxEntries > 0
      ? options.maxEntries
      : DEFAULT_MAX_DEBUG_LOG_ENTRIES;
  const now = options.now ?? (() => new Date());
  const copyText = options.copyText ?? copyTextWithFallback;

  const lines: string[] = [];
  let copyBound = false;
  let clearBound = false;
  let copyClickHandler: ((event: MouseEvent) => void) | null = null;
  let clearClickHandler: ((event: MouseEvent) => void) | null = null;

  function getDebugLogText() {
    return lines.join('\n');
  }

  function tryRender() {
    let paneEl: HTMLDivElement;
    try {
      paneEl = options.getDebugLogPaneEl();
    } catch (_) {
      return;
    }

    const shouldStickToBottom = shouldAutoScrollToBottom(paneEl);
    const text = getDebugLogText();
    paneEl.textContent = text || DEBUG_LOG_PLACEHOLDER_TEXT;
    paneEl.classList.toggle('empty', lines.length === 0);
    if (shouldStickToBottom) {
      paneEl.scrollTop = paneEl.scrollHeight;
    }
  }

  function ensureCopyBinding() {
    if (copyBound) return;

    let copyBtnEl: HTMLButtonElement;
    try {
      copyBtnEl = options.getDebugLogCopyBtnEl();
    } catch (_) {
      return;
    }

    copyClickHandler = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const text = getDebugLogText();
      void copyText(text)
        .then(() => {
          appendDebugLog('debugLog.copy.success', { lines: lines.length });
        })
        .catch((error: unknown) => {
          const errorText = error instanceof Error ? error.message : String(error);
          appendDebugLog('debugLog.copy.failure', { error: errorText });
        });
    };
    copyBtnEl.addEventListener('click', copyClickHandler);
    copyBound = true;
  }

  function ensureClearBinding() {
    if (clearBound || typeof options.getDebugLogClearBtnEl !== 'function') return;

    let clearBtnEl: HTMLButtonElement;
    try {
      clearBtnEl = options.getDebugLogClearBtnEl();
    } catch (_) {
      return;
    }

    clearClickHandler = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      clearDebugLog();
    };
    clearBtnEl.addEventListener('click', clearClickHandler);
    clearBound = true;
  }

  function clearDebugLog() {
    if (lines.length === 0) {
      tryRender();
      return;
    }
    lines.splice(0, lines.length);
    tryRender();
  }

  function appendDebugLog(eventName: string, payload?: unknown) {
    lines.push(buildDebugLogLine(now(), eventName, payload));
    if (lines.length > maxEntries) {
      lines.splice(0, lines.length - maxEntries);
    }

    options.onLogAppended?.(eventName, payload);
    ensureCopyBinding();
    ensureClearBinding();
    tryRender();
  }

  ensureCopyBinding();
  ensureClearBinding();
  tryRender();

  return {
    appendDebugLog,
    getDebugLogText,
    clearDebugLog,
  };
}

export type { PanelDebugLogFlow, CreatePanelDebugLogFlowOptions };
