// @ts-nocheck
type AnyRecord = Record<string, any>;

type MethodHandler = (args: unknown) => unknown;

interface DomHandlers {
  getDomTree: MethodHandler;
  highlightComponent: MethodHandler;
  clearComponentHighlight: MethodHandler;
  previewComponent: MethodHandler;
  clearHoverPreview: MethodHandler;
}

interface CreatePageAgentMethodExecutorOptions {
  domHandlers: DomHandlers;
  inspectReactComponents: MethodHandler;
  inspectReactPath: MethodHandler;
}

/** 페이지/런타임 데이터를 조회 */
function fetchTargetData(args: AnyRecord | null | undefined) {
  const targetPath = typeof args?.targetPath === "string" ? args.targetPath : "";
  const methods = Array.isArray(args?.methods) ? args.methods : [];
  const autoDiscoverZeroArgMethods = args?.autoDiscoverZeroArgMethods === true;

  try {
    if (!targetPath) {
      return { error: "대상 경로가 비어 있습니다." };
    }

    const parts = targetPath.replace(/^window\./, "").split(".").filter(Boolean);
    let obj = window;
    for (let i = 0; i < parts.length; i += 1) {
      if (obj == null) break;
      obj = obj[parts[i]];
    }

    if (obj == null) {
      return { error: "객체를 찾을 수 없습니다: " + targetPath };
    }

    let methodList = methods.slice();
    if (methodList.length === 0) {
      if (!autoDiscoverZeroArgMethods) {
        return {
          error: "호출할 메서드가 설정되지 않았습니다. src/config.ts에서 methods를 지정하거나 autoDiscoverZeroArgMethods를 true로 설정하세요.",
          targetPath,
          availableMethods: Object.keys(obj).filter((k) => typeof obj[k] === "function"),
        };
      }
      methodList = Object.keys(obj).filter((k) => typeof obj[k] === "function" && obj[k].length === 0);
    }

    const results = {};
    for (let i = 0; i < methodList.length; i += 1) {
      const name = methodList[i];
      try {
        if (typeof obj[name] !== "function") {
          results[name] = { _skip: "not a function" };
          continue;
        }
        results[name] = obj[name].call(obj);
      } catch (e) {
        results[name] = { _error: String(e && e.message) };
      }
    }

    return { targetPath, results };
  } catch (e) {
    return { error: String(e && e.message) };
  }
}

/** pageAgent method -> handler 라우터를 구성한다. */
export function createPageAgentMethodExecutor(options: CreatePageAgentMethodExecutorOptions) {
  const domHandlers = options.domHandlers;
  const inspectReactComponents = options.inspectReactComponents;
  const inspectReactPath = options.inspectReactPath;

  /** 요청된 메서드를 실행 */
  return function executeMethod(method: string, args: unknown) {
    switch (method) {
      case "ping":
        return { ok: true };
      case "fetchTargetData":
        return fetchTargetData(args);
      case "getDomTree":
        return domHandlers.getDomTree(args);
      case "highlightComponent":
        return domHandlers.highlightComponent(args);
      case "clearComponentHighlight":
        return domHandlers.clearComponentHighlight();
      case "previewComponent":
        return domHandlers.previewComponent(args);
      case "clearHoverPreview":
        return domHandlers.clearHoverPreview();
      case "reactInspect":
        return inspectReactComponents(args);
      case "reactInspectPath":
        return inspectReactPath(args);
      default:
        return { ok: false, error: "알 수 없는 메서드입니다: " + String(method) };
    }
  };
}
