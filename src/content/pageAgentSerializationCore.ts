type SeenEntry = {
  value: object;
  id: number;
};

interface SeenReferenceStore {
  findSeenId: (value: object) => number | null;
  rememberSeen: (value: object, id: number) => void;
}

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

/** WeakMap 지원 여부에 따라 순환 참조 저장소를 구성한다. */
function createSeenReferenceStore(): SeenReferenceStore {
  const seenMap = typeof WeakMap === 'function' ? new WeakMap<object, number>() : null;
  const seenList: SeenEntry[] = [];

  function findSeenId(value: object) {
    if (seenMap) {
      const idFromMap = seenMap.get(value);
      return typeof idFromMap === 'number' ? idFromMap : null;
    }
    for (let i = 0; i < seenList.length; i += 1) {
      if (seenList[i].value === value) return seenList[i].id;
    }
    return null;
  }

  function rememberSeen(value: object, id: number) {
    if (seenMap) {
      seenMap.set(value, id);
      return;
    }
    seenList.push({ value, id });
  }

  return {
    findSeenId,
    rememberSeen,
  };
}

export {
  buildDehydratedToken,
  createSeenReferenceStore,
  mapSerializerInternalKey,
  readObjectClassName,
};
