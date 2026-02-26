import { resolveFiberPropsBudget } from "./pageAgentSerializationPropsBudget";
import { serializePropsObjectEntries } from "./pageAgentSerializationPropsEntries";

type FiberLike = {
  tag?: number;
  memoizedProps?: unknown;
};

/** fiber.memoizedProps를 panel-friendly shape으로 제한 직렬화한다. */
function serializePropsForFiber(
  fiber: FiberLike | null | undefined,
  serialize: (value: unknown, depth?: number) => unknown,
) {
  const props = fiber ? fiber.memoizedProps : null;
  if (props && typeof props === "object" && !Array.isArray(props)) {
    const typedProps = props as Record<string, unknown>;
    const budget = resolveFiberPropsBudget(fiber?.tag, Object.keys(typedProps).length);
    return serializePropsObjectEntries(typedProps, {
      maxKeys: budget.maxKeys,
      perKeySerializeBudget: budget.perKeySerializeBudget,
    });
  }

  return serialize(props);
}

export { serializePropsForFiber };
