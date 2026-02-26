type AnyRecord = Record<string, any>;

/** 값이 null이 아니고 object/function 타입인지 판별 */
function isObjectLike(value: unknown) {
  const t = typeof value;
  return (t === "object" || t === "function") && value !== null;
}

/** window 전역에서 fiber id weak map을 복구/초기화한다. */
function getFiberIdMap(windowObj: AnyRecord, fiberIdMapKey: string): WeakMap<object, string> {
  let map = windowObj[fiberIdMapKey];
  if (!map || typeof map.get !== "function" || typeof map.set !== "function") {
    map = new WeakMap();
    windowObj[fiberIdMapKey] = map;
  }
  return map;
}

/** 다음 fiber id 시퀀스를 읽는다. */
function getNextFiberId(windowObj: AnyRecord, fiberIdSeqKey: string) {
  const next = Number(windowObj[fiberIdSeqKey]);
  if (!Number.isFinite(next) || next < 1) return 1;
  return Math.floor(next);
}

/** fiber/alternate 쌍에 대해 안정적인 id를 할당한다. */
function getStableFiberId(
  windowObj: AnyRecord,
  fiberIdSeqKey: string,
  fiber: AnyRecord | null | undefined,
  map: WeakMap<object, string>,
) {
  if (!isObjectLike(fiber)) return null;
  const fiberObject = fiber as AnyRecord;

  const existingId = map.get(fiberObject as object);
  if (typeof existingId === "string" && existingId) return existingId;

  if (isObjectLike(fiberObject.alternate)) {
    const alternateObject = fiberObject.alternate as object;
    const alternateId = map.get(alternateObject);
    if (typeof alternateId === "string" && alternateId) {
      map.set(fiberObject as object, alternateId);
      return alternateId;
    }
  }

  const nextId = getNextFiberId(windowObj, fiberIdSeqKey);
  const stableId = "f" + String(nextId);
  windowObj[fiberIdSeqKey] = nextId + 1;
  map.set(fiberObject as object, stableId);
  if (isObjectLike(fiberObject.alternate)) {
    map.set(fiberObject.alternate as object, stableId);
  }
  return stableId;
}

/** window 전역에서 function inspect registry를 복구/초기화한다. */
function getFunctionInspectRegistry(windowObj: AnyRecord, registryKey: string) {
  let registry = windowObj[registryKey];
  if (!registry || typeof registry !== "object") {
    registry = {};
    windowObj[registryKey] = registry;
  }
  return registry as Record<string, Function>;
}

/** window 전역에서 function inspect order 배열을 복구/초기화한다. */
function getFunctionInspectOrder(windowObj: AnyRecord, orderKey: string) {
  let order = windowObj[orderKey];
  if (!Array.isArray(order)) {
    order = [];
    windowObj[orderKey] = order;
  }
  return order as string[];
}

export interface RegisterFunctionInspectOptions {
  registryKey: string;
  orderKey: string;
  seqKey: string;
  maxFunctionInspectRefs: number;
}

/** function inspect registry에 함수를 등록하고 최대 개수를 유지한다. */
function registerFunctionForInspect(
  windowObj: AnyRecord,
  value: Function,
  options: RegisterFunctionInspectOptions,
) {
  const registry = getFunctionInspectRegistry(windowObj, options.registryKey);
  const order = getFunctionInspectOrder(windowObj, options.orderKey);
  const nextSeqRaw = Number(windowObj[options.seqKey]);
  const nextSeq =
    Number.isFinite(nextSeqRaw) && nextSeqRaw > 0 ? Math.floor(nextSeqRaw) : 1;
  const key = "fn" + String(nextSeq);
  windowObj[options.seqKey] = nextSeq + 1;

  registry[key] = value;
  order.push(key);

  while (order.length > options.maxFunctionInspectRefs) {
    const staleKey = order.shift();
    if (!staleKey) continue;
    if (staleKey === key) continue;
    delete registry[staleKey];
  }
  return key;
}

export {
  getFiberIdMap,
  getStableFiberId,
  registerFunctionForInspect,
};
