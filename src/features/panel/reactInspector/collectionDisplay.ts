/**
 * collection display 관련 public API 배럴.
 *
 * - token normalize/map entry 파싱: `collectionDisplayTokenNormalize.ts`
 * - display meta/path 역매핑: `collectionDisplayMeta.ts`
 */
export type { DisplayCollectionMeta } from './collectionDisplayMeta';
export {
  readDisplayCollectionMeta,
  resolveDisplayChildPathSegment,
} from './collectionDisplayMeta';
export {
  normalizeCollectionTokenForDisplay,
  readMapTokenEntryPair,
} from './collectionDisplayTokenNormalize';
