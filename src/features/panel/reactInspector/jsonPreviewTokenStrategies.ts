import {
  isCircularRefToken,
  isDehydratedToken,
  isFunctionToken,
} from '../../../shared/inspector/guards';
import { readDehydratedPreviewText } from './jsonPreviewPrimitive';

/** JSON summary preview의 function/circular/dehydrated token 분기를 처리한다. */
export function buildJsonSummaryTokenPreview(value: unknown): string | null {
  if (isFunctionToken(value)) return `function ${value.name ?? '(anonymous)'}`;
  if (isCircularRefToken(value)) return `[Circular #${value.refId}]`;
  if (isDehydratedToken(value)) return readDehydratedPreviewText(value);
  return null;
}

/** Hook inline preview의 function/circular/dehydrated token 분기를 처리한다. */
export function buildHookInlineTokenPreview(value: unknown): string | null {
  if (isFunctionToken(value)) {
    const fnName = typeof value.name === 'string' ? value.name.trim() : '';
    return fnName ? `${fnName}() {}` : '() => {}';
  }
  if (isCircularRefToken(value)) return '{…}';
  if (isDehydratedToken(value)) return readDehydratedPreviewText(value);
  return null;
}
