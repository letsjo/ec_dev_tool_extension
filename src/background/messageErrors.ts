/** 표시/전달용 값으로 변환 */
function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** 조건 여부를 판별 */
function isMissingReceiverError(message: string): boolean {
  return /Receiving end does not exist|Could not establish connection/i.test(message);
}

export { isMissingReceiverError, toErrorMessage };
