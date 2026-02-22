import type {
  CircularRefToken,
  DehydratedToken,
  DomTreeAttribute,
  DomTreeEvalResult,
  DomTreeNode,
  FunctionToken,
  MapToken,
  PickPoint,
  PageHighlightResult,
  ReactComponentDetailResult,
  ReactComponentInfo,
  ReactInspectResult,
  SetToken,
} from './types';

/** 값이 null이 아닌 객체 레코드인지 판별 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/** 값이 문자열 또는 null인지 판별 */
export function isStringOrNull(value: unknown): value is string | null {
  return typeof value === 'string' || value === null;
}

/** 값이 x/y 숫자 좌표를 가진 선택 지점인지 판별 */
export function isPickPoint(value: unknown): value is PickPoint {
  if (!isRecord(value)) return false;
  return typeof value.x === 'number' && typeof value.y === 'number';
}

/** 값이 DOM 속성(name/value 문자열) 구조인지 판별 */
function isDomTreeAttribute(value: unknown): value is DomTreeAttribute {
  if (!isRecord(value)) return false;
  return typeof value.name === 'string' && typeof value.value === 'string';
}

/** 값이 DOM 트리 노드 구조인지 판별 */
function isDomTreeNode(value: unknown): value is DomTreeNode {
  if (!isRecord(value)) return false;
  return (
    typeof value.tagName === 'string' &&
    isStringOrNull(value.id) &&
    isStringOrNull(value.className) &&
    Array.isArray(value.attributes) &&
    value.attributes.every((attr) => isDomTreeAttribute(attr)) &&
    typeof value.childCount === 'number' &&
    typeof value.truncatedChildren === 'number' &&
    isStringOrNull(value.textPreview) &&
    Array.isArray(value.children) &&
    value.children.every((child) => isDomTreeNode(child))
  );
}

/** 값이 React 컴포넌트 트리 아이템 구조인지 판별 */
function isReactComponentInfo(value: unknown): value is ReactComponentInfo {
  if (!isRecord(value)) return false;
  const parentIdValue = value.parentId;
  const isParentIdValid = parentIdValue === undefined || isStringOrNull(parentIdValue);
  return (
    typeof value.id === 'string' &&
    isParentIdValid &&
    typeof value.name === 'string' &&
    typeof value.kind === 'string' &&
    typeof value.depth === 'number' &&
    typeof value.hookCount === 'number' &&
    isStringOrNull(value.domSelector) &&
    isStringOrNull(value.domPath) &&
    isStringOrNull(value.domTagName)
  );
}

/** 값이 React 컴포넌트 목록 응답 구조인지 판별 */
export function isReactInspectResult(value: unknown): value is ReactInspectResult {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value.components)) return false;
  return value.components.every((item) => isReactComponentInfo(item));
}

/** 값이 React 컴포넌트 상세 응답 최소 구조인지 판별 */
export function isReactComponentDetailResult(value: unknown): value is ReactComponentDetailResult {
  if (!isRecord(value)) return false;
  if (typeof value.ok !== 'boolean') return false;
  if (value.componentId !== undefined && typeof value.componentId !== 'string') return false;
  if (value.hookCount !== undefined && typeof value.hookCount !== 'number') return false;
  return true;
}

/** 값이 페이지 하이라이트 응답 구조인지 판별 */
export function isPageHighlightResult(value: unknown): value is PageHighlightResult {
  if (!isRecord(value)) return false;
  return typeof value.ok === 'boolean';
}

/** 값이 DOM 트리 평가 응답 구조인지 판별 */
export function isDomTreeEvalResult(value: unknown): value is DomTreeEvalResult {
  if (!isRecord(value)) return false;
  if (typeof value.ok !== 'boolean') return false;
  if (value.root !== undefined && !isDomTreeNode(value.root)) return false;
  return true;
}

/** 값이 함수 토큰(__ecType=function)인지 판별 */
export function isFunctionToken(value: unknown): value is FunctionToken {
  return isRecord(value) && value.__ecType === 'function';
}

/** 값이 순환 참조 토큰(__ecType=circularRef, refId 포함)인지 판별 */
export function isCircularRefToken(value: unknown): value is CircularRefToken {
  return isRecord(value) && value.__ecType === 'circularRef' && typeof value.refId === 'number';
}

/** 값이 Map 토큰(__ecType=map)인지 판별 */
export function isMapToken(value: unknown): value is MapToken {
  return isRecord(value) && value.__ecType === 'map';
}

/** 값이 Set 토큰(__ecType=set)인지 판별 */
export function isSetToken(value: unknown): value is SetToken {
  return isRecord(value) && value.__ecType === 'set';
}

/** 값이 dehydrate 토큰(__ecType=dehydrated)인지 판별 */
export function isDehydratedToken(value: unknown): value is DehydratedToken {
  if (!isRecord(value)) return false;
  if (value.__ecType !== 'dehydrated') return false;
  return (
    value.valueType === 'object' ||
    value.valueType === 'array' ||
    value.valueType === 'map' ||
    value.valueType === 'set' ||
    value.valueType === 'unknown'
  );
}

/** 값을 읽어 검증/변환 */
export function readObjectRefId(value: unknown): number | null {
  if (!isRecord(value)) return null;
  const maybeId = (value as { __ecRefId?: unknown }).__ecRefId;
  return typeof maybeId === 'number' ? maybeId : null;
}
