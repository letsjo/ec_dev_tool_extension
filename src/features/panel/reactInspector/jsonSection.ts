import type {
  JsonPathSegment,
  JsonSectionKind,
  ReactComponentInfo,
} from '../../../shared/inspector';
import { buildHookTree as buildHookTreeValue } from './hookTreeModel';
import { appendHookTreeNodes } from './jsonHookTreeRenderer';
import { collectJsonRefMap } from './jsonRefMap';
import type {
  FetchSerializedValueAtPathHandler,
  InspectFunctionAtPathHandler,
  JsonRenderContext,
} from './jsonRenderTypes';
import { createJsonValueNodeRenderer } from './jsonValueNode';

/**
 * controller의 pageAgent 브리지를 모듈 외부에 두고,
 * 렌더러는 콜백 핸들러를 통해서만 inspect/serialize를 호출한다.
 */
let currentInspectFunctionAtPathHandler: InspectFunctionAtPathHandler = () => {};
let currentFetchSerializedValueAtPathHandler: FetchSerializedValueAtPathHandler = (
  _component,
  _section,
  _path,
  onDone,
) => {
  onDone(null);
};

/** 경로 기준 inspect 동작을 수행 */
function inspectFunctionAtPath(
  component: ReactComponentInfo,
  section: JsonSectionKind,
  path: JsonPathSegment[],
) {
  currentInspectFunctionAtPathHandler(component, section, path);
}

/** 페이지/런타임 데이터를 조회 */
function fetchSerializedValueAtPath(
  component: ReactComponentInfo,
  section: JsonSectionKind,
  path: JsonPathSegment[],
  onDone: (value: unknown | null) => void,
) {
  currentFetchSerializedValueAtPathHandler(component, section, path, onDone);
}

const createJsonValueNode = createJsonValueNodeRenderer({
  onInspectFunctionAtPath: inspectFunctionAtPath,
  fetchSerializedValueAtPath,
});

/** 렌더링에 사용할 DOM/데이터 구조를 생성 */
function createJsonSection(
  title: string,
  value: unknown,
  component: ReactComponentInfo,
  sectionKind: JsonSectionKind,
): HTMLElement {
  const sectionEl = document.createElement('div');
  sectionEl.className = 'json-section';

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'json-section-title';
  sectionTitle.textContent = title;
  sectionEl.appendChild(sectionTitle);

  const refMap = collectJsonRefMap(value);
  const baseContext: JsonRenderContext = {
    component,
    section: sectionKind,
    path: [],
    refMap,
    refStack: [],
    allowInspect: true,
  };

  if (sectionKind === 'hooks' && Array.isArray(value)) {
    const hooksRows = document.createElement('div');
    hooksRows.className = 'json-children';

    if (value.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'json-row';
      empty.textContent = '(empty)';
      hooksRows.appendChild(empty);
    } else {
      const tree = buildHookTreeValue(value);
      appendHookTreeNodes({
        container: hooksRows,
        nodes: tree,
        context: baseContext,
        createJsonValueNode,
      });
    }

    sectionEl.appendChild(hooksRows);
    return sectionEl;
  }

  sectionEl.appendChild(createJsonValueNode(value, 0, baseContext));
  return sectionEl;
}

export interface CreateReactJsonSectionOptions {
  title: string;
  value: unknown;
  component: ReactComponentInfo;
  sectionKind: JsonSectionKind;
  onInspectFunctionAtPath: InspectFunctionAtPathHandler;
  onFetchSerializedValueAtPath: FetchSerializedValueAtPathHandler;
}

/** React 상세 패널 JSON/hook 섹션 DOM을 생성한다. */
export function createReactJsonSection(options: CreateReactJsonSectionOptions): HTMLElement {
  currentInspectFunctionAtPathHandler = options.onInspectFunctionAtPath;
  currentFetchSerializedValueAtPathHandler = options.onFetchSerializedValueAtPath;
  return createJsonSection(
    options.title,
    options.value,
    options.component,
    options.sectionKind,
  );
}
