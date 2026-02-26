interface CreatePanelDebugDiagnosticsFlowOptions {
  getDebugDiagnosticsPaneEl: () => HTMLDivElement;
  now?: () => Date;
  isEnabled?: () => boolean;
}

interface PanelDebugDiagnosticsFlow {
  recordDebugEvent: (eventName: string, payload?: unknown) => void;
  isEnabled: () => boolean;
}

const DEV_DIAGNOSTICS_STORAGE_KEY = 'ecDevTool.devDiagnostics';
const DEV_DIAGNOSTICS_QUERY_KEY = 'diagnostics';
const MAX_TOP_EVENT_LINES = 8;

function shouldEnableDiagnosticsByDefault(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get(DEV_DIAGNOSTICS_QUERY_KEY) === '1') {
      return true;
    }
  } catch (_) {
    /** noop */
  }

  try {
    return window.localStorage.getItem(DEV_DIAGNOSTICS_STORAGE_KEY) === '1';
  } catch (_) {
    return false;
  }
}

function buildDiagnosticsText(
  startedAt: Date,
  totalEvents: number,
  errorEvents: number,
  lastEventName: string | null,
  eventCounts: Map<string, number>,
) {
  const topEvents = [...eventCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, MAX_TOP_EVENT_LINES);

  return [
    '[Dev Diagnostics]',
    `startedAt: ${startedAt.toISOString()}`,
    `events.total: ${totalEvents}`,
    `events.error: ${errorEvents}`,
    `events.unique: ${eventCounts.size}`,
    `events.last: ${lastEventName ?? '(none)'}`,
    'topEvents:',
    ...topEvents.map(([name, count]) => `- ${name}: ${count}`),
    '',
    `hint: set localStorage['${DEV_DIAGNOSTICS_STORAGE_KEY}']='1'`,
  ].join('\n');
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** DebugLog 본문과 동일한 규칙으로 오류 이벤트를 집계해 diagnostics 검증성을 맞춘다. */
function isDebugErrorEvent(eventName: string, payload: unknown): boolean {
  if (eventName.includes('.failure') || eventName.includes('.error')) {
    return true;
  }
  if (!isRecordValue(payload)) return false;
  if (payload.hasError === true || payload.isError === true) return true;

  const errorValue = payload.error;
  if (typeof errorValue === 'string' && errorValue.trim().length > 0) return true;
  const errorTextValue = payload.errorText;
  if (typeof errorTextValue === 'string' && errorTextValue.trim().length > 0) return true;

  return false;
}

/** Debug Log 패널의 dev-only diagnostics 집계를 렌더링한다. */
export function createPanelDebugDiagnosticsFlow(
  options: CreatePanelDebugDiagnosticsFlowOptions,
): PanelDebugDiagnosticsFlow {
  const isEnabled = options.isEnabled ?? shouldEnableDiagnosticsByDefault;
  const now = options.now ?? (() => new Date());
  const startedAt = now();
  let totalEvents = 0;
  let errorEvents = 0;
  let lastEventName: string | null = null;
  const eventCounts = new Map<string, number>();

  function render() {
    let paneEl: HTMLDivElement;
    try {
      paneEl = options.getDebugDiagnosticsPaneEl();
    } catch (_) {
      return;
    }

    if (!isEnabled()) {
      paneEl.hidden = true;
      return;
    }

    paneEl.hidden = false;
    paneEl.textContent = buildDiagnosticsText(
      startedAt,
      totalEvents,
      errorEvents,
      lastEventName,
      eventCounts,
    );
    paneEl.classList.toggle('empty', totalEvents === 0);
  }

  function recordDebugEvent(eventName: string, payload?: unknown) {
    if (!isEnabled()) return;
    totalEvents += 1;
    if (isDebugErrorEvent(eventName, payload)) {
      errorEvents += 1;
    }
    lastEventName = eventName;
    const nextCount = (eventCounts.get(eventName) ?? 0) + 1;
    eventCounts.set(eventName, nextCount);
    render();
  }

  render();

  return {
    recordDebugEvent,
    isEnabled,
  };
}

export type { CreatePanelDebugDiagnosticsFlowOptions, PanelDebugDiagnosticsFlow };
