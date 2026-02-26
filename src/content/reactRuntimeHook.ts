/**
 * Main world runtime hook:
 * React commit 이벤트(onCommitFiberRoot)를 감지해 content script로 postMessage 전달.
 */

import { installRuntimeHook } from "./reactRuntimeHookLifecycle";

const MESSAGE_SOURCE = "EC_DEV_TOOL_REACT_RUNTIME_HOOK";
const MESSAGE_ACTION = "reactCommit";
const STATE_KEY = "__EC_DEV_TOOL_REACT_RUNTIME_HOOK_STATE__";
const WRAPPED_KEY = "__EC_DEV_TOOL_REACT_RUNTIME_HOOK_WRAPPED__";

const POST_MIN_INTERVAL_MS = 400;
const HOOK_ATTACH_INTERVAL_MS = 2000;

installRuntimeHook(window, {
  messageSource: MESSAGE_SOURCE,
  messageAction: MESSAGE_ACTION,
  stateKey: STATE_KEY,
  wrappedKey: WRAPPED_KEY,
  postMinIntervalMs: POST_MIN_INTERVAL_MS,
  hookAttachIntervalMs: HOOK_ATTACH_INTERVAL_MS,
  now: Date.now,
});
