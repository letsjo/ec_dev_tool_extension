import type {
  JsonPathSegment,
  JsonSectionKind,
  ReactComponentInfo,
} from '../../../shared/inspector/types';
import {
  resolveInspectPathLookup as resolveInspectPathLookupValue,
  type RuntimeRefreshLookup,
} from './lookup';

export type ReactInspectPathMode = 'inspectFunction' | 'serializeValue';

interface BuildReactInspectPathRequestArgsOptions {
  component: ReactComponentInfo;
  section: JsonSectionKind;
  path: JsonPathSegment[];
  mode: ReactInspectPathMode;
  serializeLimit?: number;
  storedLookup: RuntimeRefreshLookup | null;
}

/**
 * reactInspectPath 호출 인자를 조립한다.
 * component domSelector 우선 + stored lookup fallback 규칙과 serializeLimit 포함 여부를 함께 처리한다.
 */
export function buildReactInspectPathRequestArgs(
  options: BuildReactInspectPathRequestArgsOptions,
): Record<string, unknown> {
  const lookup = resolveInspectPathLookupValue(options.component.domSelector, options.storedLookup);
  return {
    componentId: options.component.id,
    selector: lookup.selector,
    pickPoint: lookup.pickPoint,
    section: options.section,
    path: options.path,
    mode: options.mode,
    ...(typeof options.serializeLimit === 'number'
      ? { serializeLimit: options.serializeLimit }
      : {}),
  };
}
