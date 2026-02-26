/** content -> panel runtime 이벤트를 background에서 재전달한다. */
function relayRuntimeMessage(payload: Record<string, unknown>) {
  chrome.runtime.sendMessage(payload).catch(() => {});
}

export { relayRuntimeMessage };
