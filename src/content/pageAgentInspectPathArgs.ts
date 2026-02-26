type InspectPathSection = 'props' | 'hooks';
type InspectPathMode = 'serializeValue' | 'inspectFunction';

interface ParsedInspectReactPathArgs {
  componentId: string;
  selector: string;
  pickPoint: unknown;
  section: InspectPathSection;
  path: Array<string | number>;
  mode: InspectPathMode;
  serializeLimit: number;
}

/** reactInspectPath 입력 payload를 안전하게 파싱/정규화한다. */
function parseInspectReactPathArgs(
  args: Record<string, unknown> | null | undefined,
): ParsedInspectReactPathArgs {
  const rawSerializeLimit = args?.serializeLimit;
  const path = Array.isArray(args?.path)
    ? args.path.filter((segment): segment is string | number => {
      return typeof segment === 'string' || typeof segment === 'number';
    })
    : [];

  return {
    componentId: typeof args?.componentId === 'string' ? args.componentId : '',
    selector: typeof args?.selector === 'string' ? args.selector : '',
    pickPoint: args?.pickPoint,
    section: args?.section === 'hooks' ? 'hooks' : 'props',
    path,
    mode: args?.mode === 'inspectFunction' ? 'inspectFunction' : 'serializeValue',
    serializeLimit: Number.isFinite(rawSerializeLimit)
      ? Math.max(1000, Math.floor(rawSerializeLimit as number))
      : 45000,
  };
}

export { parseInspectReactPathArgs };
export type { ParsedInspectReactPathArgs };
