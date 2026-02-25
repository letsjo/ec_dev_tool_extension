import { describe, expect, it } from 'vitest';
import type { PanelDomRefs } from '../../src/features/panel/domRefs';
import { createPanelControllerContext } from '../../src/features/panel/controllerContext';
import type { WorkspaceLayoutManager } from '../../src/features/panel/workspace/manager';

function createDomRefsFixture(): PanelDomRefs {
  const outputEl = document.createElement('div');
  const panelWorkspaceEl = document.createElement('div');
  const panelContentEl = document.createElement('div');
  const workspacePanelToggleBarEl = document.createElement('div');
  const workspaceDockPreviewEl = document.createElement('div');
  const selectElementBtnEl = document.createElement('button');
  const componentSearchInputEl = document.createElement('input');
  const elementOutputEl = document.createElement('div');
  const domTreeStatusEl = document.createElement('div');
  const domTreeOutputEl = document.createElement('div');
  const reactStatusEl = document.createElement('div');
  const reactComponentListEl = document.createElement('div');
  const treePaneEl = document.createElement('div');
  const reactComponentDetailEl = document.createElement('div');
  const workspacePanelElements = new Map([
    ['componentsTreeSection', document.createElement('details')],
  ]) as PanelDomRefs['workspacePanelElements'];

  return {
    outputEl,
    targetSelectEl: document.createElement('select'),
    fetchBtnEl: document.createElement('button'),
    panelWorkspaceEl,
    panelContentEl,
    workspacePanelToggleBarEl,
    workspaceDockPreviewEl,
    selectElementBtnEl,
    componentSearchInputEl,
    elementOutputEl,
    domTreeStatusEl,
    domTreeOutputEl,
    reactStatusEl,
    reactComponentListEl,
    treePaneEl,
    reactComponentDetailEl,
    workspacePanelElements,
  };
}

describe('createPanelControllerContext', () => {
  it('requires dom refs to be initialized before reading them', () => {
    const context = createPanelControllerContext({
      initPanelDomRefs: () => createDomRefsFixture(),
    });

    expect(() => context.getOutputEl()).toThrowError('Panel DOM refs are not initialized');
  });

  it('binds picker button state and exposes initialized refs', () => {
    const refs = createDomRefsFixture();
    const context = createPanelControllerContext({
      initPanelDomRefs: () => refs,
    });
    context.initDomRefs();

    context.setPickerModeActive(true);
    expect(context.isPickerModeActive()).toBe(true);
    expect(context.getSelectElementBtnEl().classList.contains('active')).toBe(true);
    expect(context.getSelectElementBtnEl().getAttribute('aria-pressed')).toBe('true');

    context.setPickerModeActive(false);
    expect(context.isPickerModeActive()).toBe(false);
    expect(context.getSelectElementBtnEl().classList.contains('active')).toBe(false);
    expect(context.getOutputEl()).toBe(refs.outputEl);
    expect(context.getWorkspacePanelElements()).toBe(refs.workspacePanelElements);
  });

  it('stores lifecycle handles through dedicated setters', () => {
    const context = createPanelControllerContext({
      initPanelDomRefs: () => createDomRefsFixture(),
    });
    const workspaceManager = {} as WorkspaceLayoutManager;
    const destroyWheel = () => {};
    const removeRuntimeMessageListener = () => {};

    context.setWorkspaceLayoutManager(workspaceManager);
    context.setDestroyWheelScrollFallback(destroyWheel);
    context.setRemoveRuntimeMessageListener(removeRuntimeMessageListener);

    expect(context.getWorkspaceLayoutManager()).toBe(workspaceManager);
    expect(context.getDestroyWheelScrollFallback()).toBe(destroyWheel);
    expect(context.getRemoveRuntimeMessageListener()).toBe(removeRuntimeMessageListener);
  });
});
