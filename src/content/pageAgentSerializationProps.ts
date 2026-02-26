// @ts-nocheck
import { summarizeChildrenValue } from "./pageAgentSerializerSummary";
import { makeSerializer } from "./pageAgentSerializationValue";

type AnyRecord = Record<string, any>;

type FiberLike = AnyRecord & {
  tag?: number;
  memoizedProps?: any;
};

/** fiber.memoizedProps를 panel-friendly shape으로 제한 직렬화한다. */
function serializePropsForFiber(
  fiber: FiberLike | null | undefined,
  serialize: (value: unknown, depth?: number) => unknown,
) {
  const props = fiber ? fiber.memoizedProps : null;
  if (props && typeof props === "object" && !Array.isArray(props)) {
    const out = {} as Record<string, unknown>;
    const keys = Object.keys(props);
    const isHostFiber = fiber && fiber.tag === 5;
    const maxKeys = Math.min(keys.length, isHostFiber ? 100 : 180);
    const perKeyBudget = isHostFiber ? 7000 : 18000;

    for (let i = 0; i < maxKeys; i += 1) {
      const key = keys[i];
      if (key === "children") {
        try {
          out.children = summarizeChildrenValue(props.children);
        } catch (error) {
          out.children = "[Thrown: " + String(error && error.message) + "]";
        }
        continue;
      }

      try {
        const propSerialize = makeSerializer({
          maxSerializeCalls: perKeyBudget,
          maxDepth: 2,
          maxArrayLength: 80,
          maxObjectKeys: 80,
          maxMapEntries: 60,
          maxSetEntries: 60,
        });
        out[key] = propSerialize(props[key]);
      } catch (error) {
        out[key] = "[Thrown: " + String(error && error.message) + "]";
      }
    }

    if (keys.length > maxKeys) {
      out.__truncated__ = "[+" + String(keys.length - maxKeys) + " keys]";
    }
    return out;
  }

  return serialize(props);
}

export { serializePropsForFiber };
