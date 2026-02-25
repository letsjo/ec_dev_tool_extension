import type {
  JsonPathSegment,
  JsonSectionKind,
  ReactComponentInfo,
} from '../../../shared/inspector/types';

export interface JsonRenderContext {
  component: ReactComponentInfo;
  section: JsonSectionKind;
  path: JsonPathSegment[];
  refMap: Map<number, unknown>;
  refStack: number[];
  allowInspect: boolean;
}

export type JsonInspectPathContext = Pick<
  JsonRenderContext,
  'component' | 'section' | 'path' | 'allowInspect'
>;

export type InspectFunctionAtPathHandler = (
  component: ReactComponentInfo,
  section: JsonSectionKind,
  path: JsonPathSegment[],
) => void;

export type FetchSerializedValueAtPathHandler = (
  component: ReactComponentInfo,
  section: JsonSectionKind,
  path: JsonPathSegment[],
  onDone: (value: unknown | null) => void,
) => void;
