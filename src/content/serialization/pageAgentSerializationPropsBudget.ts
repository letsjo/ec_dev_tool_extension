interface FiberPropsBudget {
  maxKeys: number;
  perKeySerializeBudget: number;
}

/**
 * fiber tag 기준으로 props 직렬화 키 개수/키당 serialize budget을 결정한다.
 * Host fiber(tag=5)는 payload 폭발을 막기 위해 더 낮은 budget을 적용한다.
 */
function resolveFiberPropsBudget(fiberTag: number | undefined, keyCount: number): FiberPropsBudget {
  const isHostFiber = fiberTag === 5;
  const maxKeys = Math.min(keyCount, isHostFiber ? 100 : 180);
  const perKeySerializeBudget = isHostFiber ? 7000 : 18000;
  return {
    maxKeys,
    perKeySerializeBudget,
  };
}

export { resolveFiberPropsBudget };
export type { FiberPropsBudget };
