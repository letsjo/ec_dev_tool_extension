import { isCircularRefToken, isFunctionToken } from '../../../shared/inspector/guards';
import type {
  InspectFunctionAtPathHandler,
  JsonRenderContext as JsonTokenRenderContext,
} from './jsonRenderTypes';

interface CreateFunctionTokenNodeOptions {
  value: unknown;
  context: JsonTokenRenderContext;
  onInspectFunctionAtPath: InspectFunctionAtPathHandler;
}

interface CreateCircularRefNodeOptions {
  value: unknown;
  depth: number;
  context: JsonTokenRenderContext;
  createJsonValueNode: (
    value: unknown,
    depth: number,
    context: JsonTokenRenderContext,
  ) => HTMLElement;
}

/**
 * function token을 텍스트/inspect 버튼 노드로 렌더링한다.
 * inspect 허용 여부에 따라 클릭 가능 링크를 조건부로 노출한다.
 */
export function createFunctionTokenNode(
  options: CreateFunctionTokenNodeOptions,
): HTMLElement | null {
  const token = options.value;
  if (!isFunctionToken(token)) {
    return null;
  }

  const fnName = typeof token.name === 'string' ? token.name.trim() : '';
  const functionText = fnName ? `${fnName}() {}` : '() => {}';

  if (!options.context.allowInspect) {
    const text = document.createElement('span');
    text.className = 'json-primitive';
    text.textContent = functionText;
    return text;
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'json-link';
  button.textContent = functionText;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    options.onInspectFunctionAtPath(
      options.context.component,
      options.context.section,
      options.context.path,
    );
  });
  return button;
}

/**
 * circular ref token을 지연 렌더 details 노드로 생성한다.
 * 실제 참조 대상은 toggle 시점에 resolve해서 중첩 순환 루프를 방지한다.
 */
export function createCircularRefNode(
  options: CreateCircularRefNodeOptions,
): HTMLDetailsElement | null {
  const token = options.value;
  if (!isCircularRefToken(token)) {
    return null;
  }

  const wrapper = document.createElement('details');
  wrapper.className = 'json-node';

  const summary = document.createElement('summary');
  summary.textContent = '[Circular]';
  wrapper.appendChild(summary);

  let rendered = false;
  const renderCircularTarget = () => {
    if (rendered) return;
    rendered = true;

    const target = options.context.refMap.get(token.refId);
    if (!target) {
      const notFound = document.createElement('div');
      notFound.className = 'json-row';
      notFound.textContent = '참조 대상을 찾을 수 없습니다.';
      wrapper.appendChild(notFound);
      return;
    }

    if (options.context.refStack.includes(token.refId)) {
      const loop = document.createElement('div');
      loop.className = 'json-row';
      loop.textContent = '순환 참조가 반복되어 더 이상 확장하지 않습니다.';
      wrapper.appendChild(loop);
      return;
    }

    const nested = options.createJsonValueNode(target, options.depth + 1, {
      ...options.context,
      refStack: [...options.context.refStack, token.refId],
      allowInspect: false,
    });
    wrapper.appendChild(nested);
  };

  wrapper.addEventListener('toggle', () => {
    if (wrapper.open) {
      renderCircularTarget();
    }
  });

  return wrapper;
}
