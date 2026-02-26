interface SourceElementSummary {
  selector: string;
  domPath: string;
  tagName: string;
}

interface BuildSourceElementSummaryOptions {
  sourceElement: Element | null;
  buildCssSelector: (el: Element | null) => string;
  getElementPath: (el: Element | null) => string;
}

/** nearest source element를 응답 payload용 selector/path/tag 요약으로 직렬화한다. */
function buildSourceElementSummary(
  options: BuildSourceElementSummaryOptions,
): SourceElementSummary | null {
  const { sourceElement, buildCssSelector, getElementPath } = options;
  if (!sourceElement) return null;

  return {
    selector: buildCssSelector(sourceElement),
    domPath: getElementPath(sourceElement),
    tagName: String(sourceElement.tagName || "").toLowerCase(),
  };
}

export { buildSourceElementSummary };
export type { SourceElementSummary, BuildSourceElementSummaryOptions };
