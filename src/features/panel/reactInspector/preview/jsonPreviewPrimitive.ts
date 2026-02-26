import { isDehydratedToken } from '../../../../shared/inspector';

const SELF_CLOSING_TAG_PATTERN = /^<[a-zA-Z][\w:-]*\s*\/>$/;

/** 표시용 문자열을 포맷 */
export function formatPrimitive(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (SELF_CLOSING_TAG_PATTERN.test(trimmed)) return trimmed;
    return `"${value.length > 60 ? `${value.slice(0, 60)}…` : value}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (typeof value === 'symbol') return String(value);
  return String(value);
}

/** hook inline preview에서 primitive/string 값을 짧은 문자열로 포맷한다. */
export function formatHookInlinePrimitive(value: unknown): string | null {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (SELF_CLOSING_TAG_PATTERN.test(trimmed)) return trimmed;
    const text = value.length > 36 ? `${value.slice(0, 36)}…` : value;
    return `"${text}"`;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    typeof value === 'symbol'
  ) {
    return String(value);
  }
  return null;
}

/** 표시용 문자열을 포맷 */
export function readDehydratedPreviewText(value: unknown): string {
  if (!isDehydratedToken(value)) return '{…}';
  if (typeof value.preview === 'string' && value.preview.trim()) {
    return value.preview;
  }
  const sizeText =
    typeof value.size === 'number' && Number.isFinite(value.size)
      ? `(${Math.max(0, Math.floor(value.size))})`
      : '';
  if (value.valueType === 'array') return `Array${sizeText}`;
  if (value.valueType === 'map') return `Map${sizeText}`;
  if (value.valueType === 'set') return `Set${sizeText}`;
  if (value.valueType === 'object') return `Object${sizeText}`;
  return '{…}';
}
