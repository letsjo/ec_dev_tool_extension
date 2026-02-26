import type { WorkspacePanelId } from "../workspacePanels";
import {
  collectPanelIdsFromLayout,
  stringifyWorkspaceNodePath,
  type WorkspaceLayoutNode,
  type WorkspaceNodePath,
} from "./layout/layoutModel";
import {
  collectWorkspacePanelIdsFromDom,
  findReusableWorkspaceDomRoot,
  isSameWorkspacePanelIdSet,
} from "./domReuse";
import { createWorkspaceSplitElement } from "./layout/layoutDom";

interface PatchWorkspaceLayoutDomNodeArgs {
  layoutNode: WorkspaceLayoutNode;
  existingRoot: HTMLElement | null;
  workspacePanelElements: Map<WorkspacePanelId, HTMLDetailsElement>;
  path?: WorkspaceNodePath;
}

/** layout 트리를 기존 DOM과 비교해 재사용 가능한 노드는 살리고 필요한 부분만 patch한다. */
function patchWorkspaceLayoutDomNode(args: PatchWorkspaceLayoutDomNodeArgs): HTMLElement {
  const {
    layoutNode,
    existingRoot,
    workspacePanelElements,
    path = [],
  } = args;
  const reusableRoot = findReusableWorkspaceDomRoot(layoutNode, existingRoot);

  if (layoutNode.type === "panel") {
    const panelEl = workspacePanelElements.get(layoutNode.panelId);
    if (!panelEl) {
      const fallback = document.createElement("div");
      fallback.className = "workspace-panel-missing";
      fallback.textContent = `패널을 찾을 수 없습니다: ${layoutNode.panelId}`;
      return fallback;
    }
    panelEl.classList.remove("workspace-split-child", "workspace-split-child-first", "workspace-split-child-second");
    return panelEl;
  }

  const splitEl =
    reusableRoot && reusableRoot.classList.contains("workspace-split") && reusableRoot.dataset.splitAxis === layoutNode.axis
      ? reusableRoot
      : createWorkspaceSplitElement(layoutNode.axis);
  splitEl.classList.add("workspace-split", `workspace-split-${layoutNode.axis}`);
  splitEl.classList.remove(layoutNode.axis === "row" ? "workspace-split-column" : "workspace-split-row");
  splitEl.dataset.splitAxis = layoutNode.axis;
  splitEl.dataset.splitPath = stringifyWorkspaceNodePath(path);
  splitEl.style.setProperty("--workspace-split-first", `${layoutNode.ratio}fr`);
  splitEl.style.setProperty("--workspace-split-second", `${1 - layoutNode.ratio}fr`);

  const firstSlot = splitEl.querySelector<HTMLElement>(":scope > .workspace-split-child-first");
  const divider = splitEl.querySelector<HTMLElement>(":scope > .workspace-split-divider");
  const secondSlot = splitEl.querySelector<HTMLElement>(":scope > .workspace-split-child-second");
  if (!firstSlot || !divider || !secondSlot) {
    return patchWorkspaceLayoutDomNode({
      layoutNode,
      existingRoot: createWorkspaceSplitElement(layoutNode.axis),
      workspacePanelElements,
      path,
    });
  }
  divider.className = `workspace-split-divider workspace-split-divider-${layoutNode.axis}`;
  divider.setAttribute("aria-orientation", layoutNode.axis === "row" ? "vertical" : "horizontal");
  splitEl.append(firstSlot, divider, secondSlot);

  const firstExpectedIds = collectPanelIdsFromLayout(layoutNode.first);
  const secondExpectedIds = collectPanelIdsFromLayout(layoutNode.second);
  let firstExistingRoot = firstSlot.firstElementChild as HTMLElement | null;
  let secondExistingRoot = secondSlot.firstElementChild as HTMLElement | null;

  if (!reusableRoot && existingRoot) {
    const existingIds = collectWorkspacePanelIdsFromDom(existingRoot);
    if (!firstExistingRoot && isSameWorkspacePanelIdSet(existingIds, firstExpectedIds)) {
      firstExistingRoot = existingRoot;
    } else if (!secondExistingRoot && isSameWorkspacePanelIdSet(existingIds, secondExpectedIds)) {
      secondExistingRoot = existingRoot;
    } else if (existingRoot.classList.contains("workspace-split")) {
      const existingFirst = existingRoot.querySelector<HTMLElement>(
        ":scope > .workspace-split-child-first > *",
      );
      const existingSecond = existingRoot.querySelector<HTMLElement>(
        ":scope > .workspace-split-child-second > *",
      );
      if (existingFirst && !firstExistingRoot) {
        const existingFirstIds = collectWorkspacePanelIdsFromDom(existingFirst);
        if (isSameWorkspacePanelIdSet(existingFirstIds, firstExpectedIds)) {
          firstExistingRoot = existingFirst;
        }
      }
      if (existingSecond && !secondExistingRoot) {
        const existingSecondIds = collectWorkspacePanelIdsFromDom(existingSecond);
        if (isSameWorkspacePanelIdSet(existingSecondIds, secondExpectedIds)) {
          secondExistingRoot = existingSecond;
        }
      }
    }
  }

  const firstPatched = patchWorkspaceLayoutDomNode({
    layoutNode: layoutNode.first,
    existingRoot: firstExistingRoot,
    workspacePanelElements,
    path: [...path, "first"],
  });
  const secondPatched = patchWorkspaceLayoutDomNode({
    layoutNode: layoutNode.second,
    existingRoot: secondExistingRoot,
    workspacePanelElements,
    path: [...path, "second"],
  });

  if (firstExistingRoot !== firstPatched || firstSlot.childElementCount !== 1) {
    firstSlot.replaceChildren(firstPatched);
  }
  if (secondExistingRoot !== secondPatched || secondSlot.childElementCount !== 1) {
    secondSlot.replaceChildren(secondPatched);
  }

  return splitEl;
}

export { patchWorkspaceLayoutDomNode };
