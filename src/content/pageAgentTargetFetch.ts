import { isRecord } from '../shared/inspector/guards';

interface FetchTargetDataArgs {
  targetPath: string;
  methods: string[];
  autoDiscoverZeroArgMethods: boolean;
}

function readFetchTargetDataArgs(args: unknown): FetchTargetDataArgs {
  if (!isRecord(args)) {
    return {
      targetPath: '',
      methods: [],
      autoDiscoverZeroArgMethods: false,
    };
  }

  const rawMethods = Array.isArray(args.methods) ? args.methods : [];
  const methods = rawMethods.filter((item): item is string => typeof item === 'string');

  return {
    targetPath: typeof args.targetPath === 'string' ? args.targetPath : '',
    methods,
    autoDiscoverZeroArgMethods: args.autoDiscoverZeroArgMethods === true,
  };
}

/** 페이지/런타임 데이터를 조회 */
function fetchTargetData(args: unknown) {
  const { targetPath, methods, autoDiscoverZeroArgMethods } = readFetchTargetDataArgs(args);

  try {
    if (!targetPath) {
      return { error: '대상 경로가 비어 있습니다.' };
    }

    const parts = targetPath.replace(/^window\./, '').split('.').filter(Boolean);
    let current: unknown = window;
    for (let index = 0; index < parts.length; index += 1) {
      if (!isRecord(current)) {
        current = null;
        break;
      }
      current = current[parts[index]];
    }

    if (current == null || (!isRecord(current) && typeof current !== 'function')) {
      return { error: `객체를 찾을 수 없습니다: ${targetPath}` };
    }

    const targetObject = current as Record<string, unknown>;
    let methodList = methods.slice();
    if (methodList.length === 0) {
      if (!autoDiscoverZeroArgMethods) {
        return {
          error:
            '호출할 메서드가 설정되지 않았습니다. src/config.ts에서 methods를 지정하거나 autoDiscoverZeroArgMethods를 true로 설정하세요.',
          targetPath,
          availableMethods: Object.keys(targetObject).filter(
            (key) => typeof targetObject[key] === 'function',
          ),
        };
      }
      methodList = Object.keys(targetObject).filter((key) => {
        const method = targetObject[key];
        return typeof method === 'function' && method.length === 0;
      });
    }

    const results: Record<string, unknown> = {};
    for (let index = 0; index < methodList.length; index += 1) {
      const methodName = methodList[index];
      try {
        const method = targetObject[methodName];
        if (typeof method !== 'function') {
          results[methodName] = { _skip: 'not a function' };
          continue;
        }
        results[methodName] = method.call(targetObject);
      } catch (error: unknown) {
        results[methodName] = {
          _error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return { targetPath, results };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export { fetchTargetData };
