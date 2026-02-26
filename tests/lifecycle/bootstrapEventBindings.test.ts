import { describe, expect, it, vi } from 'vitest';
import { bindPanelBootstrapEvents } from '../../src/features/panel/lifecycle/bootstrapEventBindings';

describe('bindPanelBootstrapEvents', () => {
  it('binds toolbar/list/window handlers', () => {
    const fetchBtnEl = document.createElement('button');
    const selectElementBtnEl = document.createElement('button');
    const payloadModeBtnEl = document.createElement('button');
    const componentSearchInputEl = document.createElement('input');
    const reactComponentListEl = document.createElement('div');
    const onFetch = vi.fn();
    const onSelectElement = vi.fn();
    const onTogglePayloadMode = vi.fn();
    const onComponentSearchInput = vi.fn();
    const clearPageHoverPreview = vi.fn();
    const onBeforeUnload = vi.fn();

    bindPanelBootstrapEvents({
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
      onBeforeUnload,
    });

    fetchBtnEl.dispatchEvent(new MouseEvent('click'));
    selectElementBtnEl.dispatchEvent(new MouseEvent('click'));
    payloadModeBtnEl.dispatchEvent(new MouseEvent('click'));
    componentSearchInputEl.dispatchEvent(new Event('input'));
    reactComponentListEl.dispatchEvent(new MouseEvent('mouseleave'));
    window.dispatchEvent(new Event('beforeunload'));

    expect(onFetch).toHaveBeenCalledTimes(1);
    expect(onSelectElement).toHaveBeenCalledTimes(1);
    expect(onTogglePayloadMode).toHaveBeenCalledTimes(1);
    expect(onComponentSearchInput).toHaveBeenCalledTimes(1);
    expect(clearPageHoverPreview).toHaveBeenCalledTimes(1);
    expect(onBeforeUnload).toHaveBeenCalledTimes(1);
  });

  it('skips fetch button binding when fetch button is absent', () => {
    const onFetch = vi.fn();

    bindPanelBootstrapEvents({
      getFetchBtnEl: () => null,
      getSelectElementBtnEl: () => document.createElement('button'),
      getPayloadModeBtnEl: () => document.createElement('button'),
      getComponentSearchInputEl: () => document.createElement('input'),
      getReactComponentListEl: () => document.createElement('div'),
      onFetch,
      onSelectElement: vi.fn(),
      onTogglePayloadMode: vi.fn(),
      onComponentSearchInput: vi.fn(),
      clearPageHoverPreview: vi.fn(),
      onBeforeUnload: vi.fn(),
    });

    expect(onFetch).not.toHaveBeenCalled();
  });
});
