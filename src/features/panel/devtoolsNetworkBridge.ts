/** DevTools inspected tab id를 읽는다. */
function getInspectedTabId() {
  return chrome.devtools.inspectedWindow.tabId;
}

/** inspected page navigation 리스너를 등록한다. */
function addInspectedPageNavigatedListener(listener: (url: string) => void) {
  chrome.devtools.network.onNavigated.addListener(listener);
}

/** inspected page navigation 리스너를 해제한다. */
function removeInspectedPageNavigatedListener(listener: (url: string) => void) {
  chrome.devtools.network.onNavigated.removeListener(listener);
}

export {
  addInspectedPageNavigatedListener,
  getInspectedTabId,
  removeInspectedPageNavigatedListener,
};
