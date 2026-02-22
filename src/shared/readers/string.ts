/** 값을 읽어 검증/변환 */
export function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
