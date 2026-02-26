/** 값을 읽어 검증/변환 */
export function readStoredJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** 값을 저장 */
export function writeStoredJson<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /** localStorage 저장 실패는 무시한다. */
  }
}
