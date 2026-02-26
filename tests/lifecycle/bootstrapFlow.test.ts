import { describe, expect, it, vi } from 'vitest';
import { createPanelBootstrapFlow } from '../../src/features/panel/lifecycle/bootstrapFlow';

describe('createPanelBootstrapFlow', () => {
  it('initializes pane state and binds toolbar/list handlers', () => {
    const fetchBtnEl = document.createElement('button');
    const selectElementBtnEl = document.createElement('button');
    const payloadModeBtnEl = document.createElement('button');
    const componentSearchInputEl = document.createElement('input');
    const reactComponentListEl = document.createElement('div');

    const mountPanelView = vi.fn();
    const initDomRefs = vi.fn();
    const initializeWorkspaceLayout = vi.fn();
    const initializeWheelFallback = vi.fn();
    const setPickerModeActive = vi.fn();
    const populateTargetSelect = vi.fn();
    const setElementOutput = vi.fn();
    const setDomTreeStatus = vi.fn();
    const setDomTreeEmpty = vi.fn();
    const onFetch = vi.fn();
    const onSelectElement = vi.fn();
    const onTogglePayloadMode = vi.fn();
    const onComponentSearchInput = vi.fn();
    const clearPageHoverPreview = vi.fn();
    const addNavigatedListener = vi.fn();
    const onBeforeUnload = vi.fn();
    const runInitialRefresh = vi.fn();

    const { bootstrapPanel } = createPanelBootstrapFlow({
      mountPanelView,
      initDomRefs,
      initializeWorkspaceLayout,
      initializeWheelFallback,
      setPickerModeActive,
      populateTargetSelect,
      setElementOutput,
      setDomTreeStatus,
      setDomTreeEmpty,
      getFetchBtnEl: () => fetchBtnEl,
      getSelectElementBtnEl: () => selectElementBtnEl,
      getPayloadModeBtnEl: () => payloadModeBtnEl,
      getComponentSearchInputEl: () => componentSearchInputEl,
      getReactComponentListEl: () => reactComponentListEl,
      onFetch,
      onSelectElement,
      onTogglePayloadMode,
      onComponentSearchInput,
      clearPageHoverPreview,
      addNavigatedListener,
      onBeforeUnload,
      runInitialRefresh,
    });

    bootstrapPanel();

    expect(mountPanelView).toHaveBeenCalledTimes(1);
    expect(initDomRefs).toHaveBeenCalledTimes(1);
    expect(initializeWorkspaceLayout).toHaveBeenCalledTimes(1);
    expect(initializeWheelFallback).toHaveBeenCalledTimes(1);
    expect(setPickerModeActive).toHaveBeenCalledWith(false);
    expect(populateTargetSelect).toHaveBeenCalledTimes(1);
    expect(setElementOutput).toHaveBeenCalledWith('런타임 트리를 자동으로 불러오는 중입니다.');
    expect(setDomTreeStatus).toHaveBeenCalledWith('요소를 선택하면 DOM 트리를 표시합니다.');
    expect(setDomTreeEmpty).toHaveBeenCalledWith('요소를 선택하면 DOM 트리를 표시합니다.');

    fetchBtnEl.dispatchEvent(new MouseEvent('click'));
    selectElementBtnEl.dispatchEvent(new MouseEvent('click'));
    payloadModeBtnEl.dispatchEvent(new MouseEvent('click'));
    componentSearchInputEl.dispatchEvent(new Event('input'));
    reactComponentListEl.dispatchEvent(new MouseEvent('mouseleave'));

    expect(onFetch).toHaveBeenCalledTimes(1);
    expect(onSelectElement).toHaveBeenCalledTimes(1);
    expect(onTogglePayloadMode).toHaveBeenCalledTimes(1);
    expect(onComponentSearchInput).toHaveBeenCalledTimes(1);
    expect(clearPageHoverPreview).toHaveBeenCalledTimes(1);
    expect(addNavigatedListener).toHaveBeenCalledTimes(1);
    expect(runInitialRefresh).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('beforeunload'));
    expect(onBeforeUnload).toHaveBeenCalledTimes(1);
  });

  it('skips fetch button binding when button is absent', () => {
    const selectElementBtnEl = document.createElement('button');
    const payloadModeBtnEl = document.createElement('button');
    const componentSearchInputEl = document.createElement('input');
    const reactComponentListEl = document.createElement('div');
    const onFetch = vi.fn();

    const { bootstrapPanel } = createPanelBootstrapFlow({
      mountPanelView: vi.fn(),
      initDomRefs: vi.fn(),
      initializeWorkspaceLayout: vi.fn(),
      initializeWheelFallback: vi.fn(),
      setPickerModeActive: vi.fn(),
      populateTargetSelect: vi.fn(),
      setElementOutput: vi.fn(),
      setDomTreeStatus: vi.fn(),
      setDomTreeEmpty: vi.fn(),
      getFetchBtnEl: () => null,
      getSelectElementBtnEl: () => selectElementBtnEl,
      getPayloadModeBtnEl: () => payloadModeBtnEl,
      getComponentSearchInputEl: () => componentSearchInputEl,
      getReactComponentListEl: () => reactComponentListEl,
      onFetch,
      onSelectElement: vi.fn(),
      onTogglePayloadMode: vi.fn(),
      onComponentSearchInput: vi.fn(),
      clearPageHoverPreview: vi.fn(),
      addNavigatedListener: vi.fn(),
      onBeforeUnload: vi.fn(),
      runInitialRefresh: vi.fn(),
    });

    bootstrapPanel();
    expect(onFetch).not.toHaveBeenCalled();
  });
});
