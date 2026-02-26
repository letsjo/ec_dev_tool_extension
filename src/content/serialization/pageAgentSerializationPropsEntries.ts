import { summarizeChildrenValue } from "./pageAgentSerializerSummary";
import { makeSerializer } from "./pageAgentSerializationValue";

interface SerializePropsObjectEntriesOptions {
  maxKeys: number;
  perKeySerializeBudget: number;
}

function readErrorMessage(error: unknown): string {
  const typedError = error as { message?: unknown } | null;
  return String(typedError && typedError.message);
}

/** props 객체 키를 budget 범위 안에서 직렬화하고 children 특수 규칙을 적용한다. */
function serializePropsObjectEntries(
  props: Record<string, unknown>,
  options: SerializePropsObjectEntriesOptions,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys = Object.keys(props);
  const maxKeys = Math.min(keys.length, options.maxKeys);

  for (let i = 0; i < maxKeys; i += 1) {
    const key = keys[i];
    if (key === "children") {
      try {
        out.children = summarizeChildrenValue(props.children);
      } catch (error) {
        out.children = "[Thrown: " + readErrorMessage(error) + "]";
      }
      continue;
    }

    try {
      const propSerialize = makeSerializer({
        maxSerializeCalls: options.perKeySerializeBudget,
        maxDepth: 2,
        maxArrayLength: 80,
        maxObjectKeys: 80,
        maxMapEntries: 60,
        maxSetEntries: 60,
      });
      out[key] = propSerialize(props[key]);
    } catch (error) {
      out[key] = "[Thrown: " + readErrorMessage(error) + "]";
    }
  }

  if (keys.length > maxKeys) {
    out.__truncated__ = "[+" + String(keys.length - maxKeys) + " keys]";
  }

  return out;
}

export { serializePropsObjectEntries };
export type { SerializePropsObjectEntriesOptions };
