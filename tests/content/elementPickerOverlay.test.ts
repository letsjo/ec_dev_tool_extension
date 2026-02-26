import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElementPickerOverlayController } from '../../src/content/elementPickerOverlay';

const OVERLAY_ID = 'ec-dev-tool-element-picker-overlay';
const initialElementFromPoint = (document as Document & {
  elementFromPoint?: (x: number, y: number) => Element | null;
}).elementFromPoint;

function removeOverlayIfExists() {
  document.getElementById(OVERLAY_ID)?.remove();
}

describe('elementPickerOverlay', () => {
  afterEach(() => {
    removeOverlayIfExists();
    if (initialElementFromPoint) {
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        value: initialElementFromPoint,
      });
    } else {
      delete (document as Document & { elementFromPoint?: unknown }).elementFromPoint;
    }
    vi.restoreAllMocks();
  });

  it('consumes pointer events and prevents bubbling to page listeners', () => {
    const notifyPickerStopped = vi.fn();
    const sendElementSelected = vi.fn();
    const target = document.createElement('div');
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => target),
    });

    const pageMouseDownListener = vi.fn();
    const pageClickListener = vi.fn();
    document.addEventListener('mousedown', pageMouseDownListener);
    document.addEventListener('click', pageClickListener);

    const picker = createElementPickerOverlayController({
      notifyPickerStopped,
      sendElementSelected,
    });
    picker.startPicking();

    const overlay = document.getElementById(OVERLAY_ID) as HTMLDivElement | null;
    expect(overlay).toBeTruthy();

    const downEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: 10,
      clientY: 20,
    });
    expect(overlay?.dispatchEvent(downEvent)).toBe(false);
    expect(downEvent.defaultPrevented).toBe(true);
    expect(pageMouseDownListener).not.toHaveBeenCalled();

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: 10,
      clientY: 20,
    });
    expect(overlay?.dispatchEvent(clickEvent)).toBe(false);
    expect(clickEvent.defaultPrevented).toBe(true);
    expect(pageClickListener).not.toHaveBeenCalled();

    expect(sendElementSelected).toHaveBeenCalledWith(10, 20, target);
    expect(notifyPickerStopped).toHaveBeenCalledWith('selected');
    expect(document.getElementById(OVERLAY_ID)).toBeNull();

    document.removeEventListener('mousedown', pageMouseDownListener);
    document.removeEventListener('click', pageClickListener);
  });

  it('consumes Escape keydown and stops picker in cancelled state', () => {
    const notifyPickerStopped = vi.fn();
    const picker = createElementPickerOverlayController({
      notifyPickerStopped,
      sendElementSelected: vi.fn(),
    });
    picker.startPicking();

    const pageKeyDownListener = vi.fn();
    document.addEventListener('keydown', pageKeyDownListener);

    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    expect(document.dispatchEvent(escapeEvent)).toBe(false);
    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(pageKeyDownListener).not.toHaveBeenCalled();
    expect(notifyPickerStopped).toHaveBeenCalledWith('cancelled');
    expect(document.getElementById(OVERLAY_ID)).toBeNull();

    document.removeEventListener('keydown', pageKeyDownListener);
  });
});
