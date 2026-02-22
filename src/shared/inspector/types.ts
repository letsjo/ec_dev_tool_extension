/**
 * 패널/브리지 간 공용 타입 정의.
 *
 * 흐름 요약:
 * 1. element picker/DOM tree/react inspect 응답 타입을 정의한다.
 * 2. JSON inspector에서 쓰는 token/function/ref/map/set 형태를 정의한다.
 * 3. controller, content, background가 동일 계약으로 통신하도록 맞춘다.
 */
export interface PickerStartResponse {
  ok: boolean;
  error?: string;
}

export interface PickPoint {
  x: number;
  y: number;
}

export interface ElementInfo {
  tagName?: unknown;
  id?: unknown;
  className?: unknown;
  domPath?: unknown;
  selector?: unknown;
  rect?: unknown;
  innerText?: unknown;
  clickPoint?: unknown;
}

export interface ElementSelectedMessage {
  action: string;
  tabId?: number;
  elementInfo?: ElementInfo;
  reason?: string;
}

export interface ReactComponentInfo {
  id: string;
  parentId: string | null;
  name: string;
  kind: string;
  depth: number;
  props: unknown;
  hooks: unknown;
  hookCount: number;
  hasSerializedData?: boolean;
  domSelector: string | null;
  domPath: string | null;
  domTagName: string | null;
}

export interface ReactInspectResult {
  selector?: string;
  selectedIndex?: number;
  components: ReactComponentInfo[];
}

export interface ReactComponentDetailResult {
  ok: boolean;
  error?: string;
  componentId?: string;
  props?: unknown;
  hooks?: unknown;
  hookCount?: number;
}

export interface PageHighlightResult {
  ok: boolean;
  error?: string;
  tagName?: string;
  selector?: string;
  domPath?: string;
  rect?: Record<string, unknown>;
}

export interface DomTreeAttribute {
  name: string;
  value: string;
}

export interface DomTreeNode {
  tagName: string;
  id: string | null;
  className: string | null;
  attributes: DomTreeAttribute[];
  childCount: number;
  truncatedChildren: number;
  textPreview: string | null;
  children: DomTreeNode[];
}

export interface DomTreeEvalResult {
  ok: boolean;
  error?: string;
  selector?: string | null;
  domPath?: string;
  root?: DomTreeNode;
}

export type JsonSectionKind = "props" | "hooks";
export type JsonPathSegment = string | number;

export interface FunctionToken {
  __ecType: "function";
  name?: string;
}

export interface CircularRefToken {
  __ecType: "circularRef";
  refId: number;
}

export interface MapEntryToken {
  key: unknown;
  value: unknown;
}

export interface MapToken {
  __ecType: "map";
  size?: number;
  entries?: unknown;
}

export interface SetToken {
  __ecType: "set";
  size?: number;
  entries?: unknown;
}

export interface DehydratedToken {
  __ecType: "dehydrated";
  valueType: "object" | "array" | "map" | "set" | "unknown";
  size?: number;
  preview?: string;
  reason?: string;
}

export interface ComponentFilterResult {
  visibleIndices: number[];
  matchedIndices: number[];
}
