import type { CreatePageAgentRuntimeMethodExecutorOptions } from './pageAgentRuntimeTypes';

const COMPONENT_HIGHLIGHT_STORAGE_KEY = '__EC_DEV_TOOL_COMPONENT_HIGHLIGHT__';
const HOVER_PREVIEW_STORAGE_KEY = '__EC_DEV_TOOL_COMPONENT_HOVER_PREVIEW__';

const FIBER_ID_MAP_KEY = '__EC_DEV_TOOL_FIBER_ID_MAP__';
const FIBER_ID_SEQ_KEY = '__EC_DEV_TOOL_FIBER_ID_SEQ__';
const FUNCTION_INSPECT_REGISTRY_KEY = '__EC_DEV_TOOL_FUNCTION_INSPECT_REGISTRY__';
const FUNCTION_INSPECT_REGISTRY_ORDER_KEY = '__EC_DEV_TOOL_FUNCTION_INSPECT_REGISTRY_ORDER__';
const FUNCTION_INSPECT_SEQ_KEY = '__EC_DEV_TOOL_FUNCTION_INSPECT_SEQ__';

const MAX_TRAVERSAL = 12000;
const MAX_COMPONENTS = 3500;
const MAX_FUNCTION_INSPECT_REFS = 240;

/** pageAgent runtime method executor의 기본 옵션을 생성한다. */
export function createDefaultPageAgentRuntimeMethodExecutorOptions(
  runtimeWindow: Window,
): CreatePageAgentRuntimeMethodExecutorOptions {
  return {
    runtimeWindow,
    componentHighlightStorageKey: COMPONENT_HIGHLIGHT_STORAGE_KEY,
    hoverPreviewStorageKey: HOVER_PREVIEW_STORAGE_KEY,
    fiberIdMapKey: FIBER_ID_MAP_KEY,
    fiberIdSeqKey: FIBER_ID_SEQ_KEY,
    functionInspectRegistryKey: FUNCTION_INSPECT_REGISTRY_KEY,
    functionInspectRegistryOrderKey: FUNCTION_INSPECT_REGISTRY_ORDER_KEY,
    functionInspectSeqKey: FUNCTION_INSPECT_SEQ_KEY,
    maxTraversal: MAX_TRAVERSAL,
    maxComponents: MAX_COMPONENTS,
    maxFunctionInspectRefs: MAX_FUNCTION_INSPECT_REFS,
  };
}
