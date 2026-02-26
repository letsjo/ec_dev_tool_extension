import {
  normalizeCollectionTokenForDisplay as normalizeCollectionTokenForDisplayValue,
} from './collectionDisplay';
import { createDehydratedTokenNode as createDehydratedTokenNodeValue } from './jsonDehydratedNode';
import { createObjectArrayJsonValueNode } from './jsonObjectArrayNode';
import { formatPrimitive } from './preview/jsonPreviewPrimitive';
import type {
  FetchSerializedValueAtPathHandler,
  InspectFunctionAtPathHandler,
  JsonRenderContext,
} from './jsonRenderTypes';
import {
  createCircularRefNode as createCircularRefNodeValue,
  createFunctionTokenNode as createFunctionTokenNodeValue,
} from './jsonTokenNodes';

interface CreateJsonValueNodeRendererOptions {
  onInspectFunctionAtPath: InspectFunctionAtPathHandler;
  fetchSerializedValueAtPath: FetchSerializedValueAtPathHandler;
}

/**
 * JSON value type(function/circular/dehydrated/object/array/primitive)별 렌더 전략을
 * 하나의 재귀 renderer로 조합한다.
 */
function createJsonValueNodeRenderer(options: CreateJsonValueNodeRendererOptions) {
  const { onInspectFunctionAtPath, fetchSerializedValueAtPath } = options;

  const renderJsonValueNode = (
    value: unknown,
    depth: number,
    context: JsonRenderContext,
  ): HTMLElement => {
    const functionTokenNode = createFunctionTokenNodeValue({
      value,
      context,
      onInspectFunctionAtPath,
    });
    if (functionTokenNode) {
      return functionTokenNode;
    }

    const circularRefNode = createCircularRefNodeValue({
      value,
      depth,
      context,
      createJsonValueNode: renderJsonValueNode,
    });
    if (circularRefNode) {
      return circularRefNode;
    }

    const dehydratedTokenNode = createDehydratedTokenNodeValue({
      value,
      depth,
      context,
      fetchSerializedValueAtPath,
      createReplacementJsonValueNode: (nextValue, nextDepth) =>
        renderJsonValueNode(nextValue, nextDepth, context),
    });
    if (dehydratedTokenNode) {
      return dehydratedTokenNode;
    }

    const normalizedCollectionValue = normalizeCollectionTokenForDisplayValue(value);
    if (normalizedCollectionValue !== value) {
      return renderJsonValueNode(normalizedCollectionValue, depth, context);
    }

    if (normalizedCollectionValue === null || typeof normalizedCollectionValue !== 'object') {
      const primitive = document.createElement('span');
      primitive.className = 'json-primitive';
      primitive.textContent = formatPrimitive(normalizedCollectionValue);
      return primitive;
    }

    return createObjectArrayJsonValueNode({
      value: normalizedCollectionValue as Record<string, unknown> | unknown[],
      depth,
      context,
      createJsonValueNode: renderJsonValueNode,
      fetchSerializedValueAtPath,
    });
  };

  return renderJsonValueNode;
}

export { createJsonValueNodeRenderer };
