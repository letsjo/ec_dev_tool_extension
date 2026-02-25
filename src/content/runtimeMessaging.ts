/** chrome.runtime.sendMessage 실패를 무시하며 안전하게 전송한다. */
function sendRuntimeMessageSafe(message: Record<string, unknown>) {
  try {
    const maybePromise: unknown = chrome.runtime.sendMessage(message);
    if (
      typeof maybePromise === "object" &&
      maybePromise !== null &&
      "catch" in maybePromise
    ) {
      const maybeCatch = (maybePromise as { catch?: unknown }).catch;
      if (typeof maybeCatch === "function") {
        (maybePromise as Promise<unknown>).catch(() => {});
      }
    }
  } catch {
    /** extension context unavailable or tab teardown race */
  }
}

/** 요소 선택 모드 종료 상태를 runtime으로 알린다. */
function notifyPickerStopped(reason: "selected" | "cancelled") {
  sendRuntimeMessageSafe({
    action: "elementPickerStopped",
    reason,
  });
}

/** 페이지 런타임 변경 이벤트를 runtime으로 알린다. */
function notifyRuntimeChanged() {
  sendRuntimeMessageSafe({
    action: "pageRuntimeChanged",
  });
}

export {
  notifyPickerStopped,
  notifyRuntimeChanged,
  sendRuntimeMessageSafe,
};
