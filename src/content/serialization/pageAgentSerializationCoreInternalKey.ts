/** React 내부 키를 사람이 읽기 쉬운 토큰으로 매핑한다. */
function mapSerializerInternalKey(key: string): string | null {
  if (key === '_owner') return '[ReactOwner]';
  if (
    key === '_store'
    || key === '__self'
    || key === '__source'
    || key === '_debugOwner'
    || key === '_debugSource'
  ) {
    return '[ReactInternal]';
  }
  return null;
}

export { mapSerializerInternalKey };
