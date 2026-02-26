type SeenEntry = {
  value: object;
  id: number;
};

interface SeenReferenceStore {
  findSeenId: (value: object) => number | null;
  rememberSeen: (value: object, id: number) => void;
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

export { createSeenReferenceStore };
export type { SeenReferenceStore };
