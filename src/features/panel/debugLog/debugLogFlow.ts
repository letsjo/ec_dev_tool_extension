interface CreatePanelDebugLogFlowOptions {
  getDebugLogPaneEl: () => HTMLDivElement;
  getDebugLogCopyBtnEl: () => HTMLButtonElement;
  maxEntries?: number;
  now?: () => Date;
  copyText?: (text: string) => Promise<void>;
  onLogAppended?: (eventName: string, payload?: unknown) => void;
}

interface PanelDebugLogFlow {
  appendDebugLog: (eventName: string, payload?: unknown) => void;
  getDebugLogText: () => string;
}

const DEFAULT_MAX_DEBUG_LOG_ENTRIES = 700;
const MAX_RENDER_PAYLOAD_LENGTH = 1400;
const MAX_RENDER_LINE_LENGTH = 1800;

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
  const head = `[${toIsoTimestamp(now)}] ${eventName}`;
  const payloadText = safeSerializeDebugPayload(payload);
  if (!payloadText) return head;
  const merged = `${head} ${payloadText}`;
  return merged.length > MAX_RENDER_LINE_LENGTH
    ? `${merged.slice(0, MAX_RENDER_LINE_LENGTH)}…(truncated)`
    : merged;
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
  let copyClickHandler: ((event: MouseEvent) => void) | null = null;

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

    const text = getDebugLogText();
    paneEl.textContent = text || '디버그 로그가 여기에 누적됩니다.';
    paneEl.classList.toggle('empty', lines.length === 0);
    paneEl.scrollTop = paneEl.scrollHeight;
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

  function appendDebugLog(eventName: string, payload?: unknown) {
    lines.push(buildDebugLogLine(now(), eventName, payload));
    if (lines.length > maxEntries) {
      lines.splice(0, lines.length - maxEntries);
    }

    options.onLogAppended?.(eventName, payload);
    ensureCopyBinding();
    tryRender();
  }

  return {
    appendDebugLog,
    getDebugLogText,
  };
}

export type { PanelDebugLogFlow, CreatePanelDebugLogFlowOptions };
