type AnyRecord = Record<string, any>;
type PathSegment = string | number;

/** 입력 데이터를 표시/비교용으로 정규화 */
function normalizeDispatcherRef(injectedRef: AnyRecord | null | undefined) {
  if (!injectedRef || typeof injectedRef !== "object") return null;
  if (typeof injectedRef.H !== "undefined") {
    return injectedRef;
  }
  if (typeof injectedRef.current !== "undefined") {
    return {
      get H() {
        return injectedRef.current;
      },
      set H(value) {
        injectedRef.current = value;
      },
    };
  }
  return null;
}

/** 필요한 값/상태를 계산해 반환 */
function getNestedValue(root: any, path: PathSegment[]) {
  let value = root;
  for (let i = 0; i < path.length; i += 1) {
    if (!value || (typeof value !== "object" && typeof value !== "function")) {
      return null;
    }
    value = value[path[i]];
  }
  return value;
}

/** 필요한 값/상태를 계산해 반환 */
function getDispatcherRefFromRenderer(renderer: AnyRecord | null | undefined) {
  if (!renderer || typeof renderer !== "object") return null;
  const candidates = [
    renderer.currentDispatcherRef,
    renderer.ReactCurrentDispatcher,
    renderer.currentDispatcher,
    getNestedValue(renderer, [
      "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED",
      "ReactCurrentDispatcher",
    ]),
    getNestedValue(renderer, [
      "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED",
      "ReactSharedInternals",
    ]),
    renderer.sharedInternals,
    renderer,
  ];

  for (let i = 0; i < candidates.length; i += 1) {
    const normalized = normalizeDispatcherRef(candidates[i]);
    if (normalized) return normalized;
  }
  return null;
}

/** 필요한 값/상태를 계산해 반환 */
function getDispatcherRefFromGlobalHook() {
  const globalHook = (
    window as Window & { __REACT_DEVTOOLS_GLOBAL_HOOK__?: AnyRecord }
  ).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!globalHook || !globalHook.renderers) return null;

  const rendererEntries: AnyRecord[] = [];
  const renderers = globalHook.renderers;
  if (typeof renderers.forEach === "function") {
    renderers.forEach((renderer: AnyRecord) => {
      rendererEntries.push(renderer);
    });
  } else if (Array.isArray(renderers)) {
    rendererEntries.push(...renderers);
  } else if (typeof renderers === "object") {
    for (const key in renderers) {
      rendererEntries.push(renderers[key]);
    }
  }

  for (let i = 0; i < rendererEntries.length; i += 1) {
    const renderer = rendererEntries[i];
    const dispatcherRef = getDispatcherRefFromRenderer(renderer);
    if (dispatcherRef) return dispatcherRef;
  }

  return null;
}

/** 입력/참조를 실제 대상으로 해석 */
function resolveRenderFunctionForHookInspect(fiber: AnyRecord | null | undefined) {
  if (!fiber) return null;
  if (fiber.tag === 11 && fiber.type && typeof fiber.type.render === "function") {
    return fiber.type.render;
  }
  if (typeof fiber.type === "function") return fiber.type;
  if (fiber.type && typeof fiber.type === "object") {
    if (typeof fiber.type.type === "function") return fiber.type.type;
    if (typeof fiber.type.render === "function") return fiber.type.render;
  }
  if (typeof fiber.elementType === "function") return fiber.elementType;
  if (fiber.elementType && typeof fiber.elementType === "object") {
    if (typeof fiber.elementType.type === "function") return fiber.elementType.type;
    if (typeof fiber.elementType.render === "function") return fiber.elementType.render;
  }
  return null;
}

/** 입력/참조를 실제 대상으로 해석 */
function resolveDefaultPropsForHookInspect(
  type: AnyRecord | null | undefined,
  baseProps: AnyRecord | null | undefined,
) {
  if (type && type.defaultProps) {
    const props: AnyRecord = {};
    if (baseProps && typeof baseProps === "object") {
      for (const key in baseProps) {
        props[key] = baseProps[key];
      }
    }
    const defaultProps = type.defaultProps;
    for (const propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
    return props;
  }
  return baseProps;
}

export {
  getDispatcherRefFromGlobalHook,
  resolveDefaultPropsForHookInspect,
  resolveRenderFunctionForHookInspect,
};
