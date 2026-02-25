import type { CollectionPreviewBudget } from './jsonCollectionPreview';

interface BuildArrayPreviewOptions {
  value: unknown[];
  depth: number;
  budget: CollectionPreviewBudget;
  renderValue: (value: unknown, depth: number, budget: CollectionPreviewBudget) => string;
  maxDepth: number;
  maxLen: number;
  collapsedText: string;
}

interface BuildObjectPreviewOptions {
  value: Record<string, unknown>;
  depth: number;
  budget: CollectionPreviewBudget;
  renderValue: (value: unknown, depth: number, budget: CollectionPreviewBudget) => string;
  maxDepth: number;
  maxLen: number;
  isInternalMetaKey: (key: string) => boolean;
  getObjectDisplayName: (value: unknown) => string;
}

/** object/array preview에서 depth-limit에 걸린 배열 문자열을 구성한다. */
export function buildArrayPreview(options: BuildArrayPreviewOptions): string {
  if (options.value.length === 0) return '[]';
  if (options.depth >= options.maxDepth) return options.collapsedText;
  const maxLen = Math.min(options.value.length, options.maxLen);
  const previewItems: string[] = [];
  for (let i = 0; i < maxLen; i += 1) {
    previewItems.push(options.renderValue(options.value[i], options.depth + 1, options.budget));
    if (options.budget.remaining <= 0) break;
  }
  const suffix = options.value.length > maxLen ? ', …' : '';
  return `[${previewItems.join(', ')}${suffix}]`;
}

/** object preview에서 meta key를 제외한 entry preview 문자열을 구성한다. */
export function buildObjectPreview(options: BuildObjectPreviewOptions): string {
  const objectName = options.getObjectDisplayName(options.value);
  const entries = Object.entries(options.value).filter(([key]) => !options.isInternalMetaKey(key));
  if (entries.length === 0) return objectName === 'Object' ? '{}' : `${objectName} {}`;
  if (options.depth >= options.maxDepth) return `${objectName}(${entries.length})`;

  const maxLen = Math.min(entries.length, options.maxLen);
  const parts: string[] = [];
  for (let i = 0; i < maxLen; i += 1) {
    const [key, child] = entries[i];
    parts.push(`${key}: ${options.renderValue(child, options.depth + 1, options.budget)}`);
    if (options.budget.remaining <= 0) break;
  }
  const suffix = entries.length > maxLen ? ', …' : '';
  const objectBody = `{${parts.join(', ')}${suffix}}`;
  return objectName === 'Object' ? objectBody : `${objectName} ${objectBody}`;
}
