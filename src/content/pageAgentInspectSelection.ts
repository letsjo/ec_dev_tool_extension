type AnyRecord = Record<string, any>;

interface ResolveSelectedComponentIndexArgs {
  components: AnyRecord[];
  idByFiber: Map<object, string>;
  preferredFiber: AnyRecord | null | undefined;
  targetMatchedIndex: number;
  resolvePreferredFiberDomInfo: () => { domSelector?: string | null } | null;
}

function findComponentIndexById(components: AnyRecord[], id: string) {
  for (let idx = 0; idx < components.length; idx += 1) {
    if (components[idx].id === id) return idx;
  }
  return -1;
}

/** preferred fiber/target match 규칙에 따라 최종 selectedIndex를 계산한다. */
function resolveSelectedComponentIndex(args: ResolveSelectedComponentIndexArgs) {
  const {
    components,
    idByFiber,
    preferredFiber,
    targetMatchedIndex,
    resolvePreferredFiberDomInfo,
  } = args;

  let selectedIndex = -1;
  if (preferredFiber && idByFiber.has(preferredFiber)) {
    const preferredId = idByFiber.get(preferredFiber);
    if (preferredId) {
      selectedIndex = findComponentIndexById(components, preferredId);
    }
  }

  if (selectedIndex < 0 && targetMatchedIndex >= 0 && targetMatchedIndex < components.length) {
    selectedIndex = targetMatchedIndex;
  }

  if (selectedIndex < 0 && preferredFiber) {
    const preferredDomInfo = resolvePreferredFiberDomInfo();
    if (preferredDomInfo && preferredDomInfo.domSelector) {
      let bestDepth = -1;
      for (let d = 0; d < components.length; d += 1) {
        const candidate = components[d];
        if (candidate.kind === "HostComponent") continue;
        if (candidate.domSelector !== preferredDomInfo.domSelector) continue;
        if (candidate.depth >= bestDepth) {
          bestDepth = candidate.depth;
          selectedIndex = d;
        }
      }
    }
  }

  if (selectedIndex < 0) {
    for (let i = 0; i < components.length; i += 1) {
      if (components[i].kind !== "HostComponent") {
        selectedIndex = i;
        break;
      }
    }
  }

  if (selectedIndex < 0) return 0;
  return selectedIndex;
}

export { resolveSelectedComponentIndex };
