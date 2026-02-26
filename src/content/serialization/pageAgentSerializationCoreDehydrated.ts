/** 객체의 사용자 정의 class 이름을 안전하게 읽는다. */
function readObjectClassName(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  try {
    const proto = Object.getPrototypeOf(value);
    if (!proto || proto === Object.prototype) return null;
    const ctor = proto.constructor;
    if (!ctor || typeof ctor !== 'function') return null;
    const name = typeof ctor.name === 'string' ? ctor.name.trim() : '';
    if (!name || name === 'Object') return null;
    return name;
  } catch (_) {
    return null;
  }
}

/** depth/serialize-budget 한도에서 반환할 dehydrated 토큰을 생성한다. */
function buildDehydratedToken(value: unknown, reason: string) {
  try {
    if (Array.isArray(value)) {
      return {
        __ecType: 'dehydrated',
        valueType: 'array',
        size: value.length,
        preview: 'Array(' + String(value.length) + ')',
        reason,
      };
    }

    if (typeof Map !== 'undefined' && value instanceof Map) {
      return {
        __ecType: 'dehydrated',
        valueType: 'map',
        size: value.size,
        preview: 'Map(' + String(value.size) + ')',
        reason,
      };
    }

    if (typeof Set !== 'undefined' && value instanceof Set) {
      return {
        __ecType: 'dehydrated',
        valueType: 'set',
        size: value.size,
        preview: 'Set(' + String(value.size) + ')',
        reason,
      };
    }

    if (value && typeof value === 'object') {
      let keyCount = 0;
      try {
        keyCount = Object.keys(value).length;
      } catch (_) {
        keyCount = 0;
      }
      const className = readObjectClassName(value);
      const displayName = className || 'Object';
      return {
        __ecType: 'dehydrated',
        valueType: 'object',
        size: keyCount,
        preview: displayName + '(' + String(keyCount) + ')',
        reason,
      };
    }
  } catch (_) {
    /** fallback token을 반환한다. */
  }

  return {
    __ecType: 'dehydrated',
    valueType: 'unknown',
    preview: '{…}',
    reason,
  };
}

export { buildDehydratedToken, readObjectClassName };
