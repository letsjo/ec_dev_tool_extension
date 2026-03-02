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

  it('selects focused element on Enter key without mouse click', () => {
    const notifyPickerStopped = vi.fn();
    const sendElementSelected = vi.fn();
    const picker = createElementPickerOverlayController({
      notifyPickerStopped,
      sendElementSelected,
    });
    picker.startPicking();

    const focusedInput = document.createElement('input');
    focusedInput.value = 'focused';
    focusedInput.getBoundingClientRect = () =>
      ({
        left: 10,
        top: 20,
        width: 50,
        height: 30,
        right: 60,
        bottom: 50,
        x: 10,
        y: 20,
        toJSON() {
          return {};
        },
      } as DOMRect);
    document.body.appendChild(focusedInput);
    focusedInput.focus();

    const pageKeyDownListener = vi.fn();
    document.addEventListener('keydown', pageKeyDownListener);

    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    expect(document.dispatchEvent(enterEvent)).toBe(false);
    expect(enterEvent.defaultPrevented).toBe(true);
    expect(pageKeyDownListener).not.toHaveBeenCalled();
    expect(sendElementSelected).toHaveBeenCalledWith(35, 35, focusedInput);
    expect(notifyPickerStopped).toHaveBeenCalledWith('selected');
    expect(document.getElementById(OVERLAY_ID)).toBeNull();

    document.removeEventListener('keydown', pageKeyDownListener);
    focusedInput.remove();
  });

  it('falls back to highlighted element when focused element is not available', () => {
    const notifyPickerStopped = vi.fn();
    const sendElementSelected = vi.fn();
    const target = document.createElement('button');
    target.textContent = 'target';
    target.getBoundingClientRect = () =>
      ({
        left: 100,
        top: 40,
        width: 20,
        height: 20,
        right: 120,
        bottom: 60,
        x: 100,
        y: 40,
        toJSON() {
          return {};
        },
      } as DOMRect);
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => target),
    });

    const picker = createElementPickerOverlayController({
      notifyPickerStopped,
      sendElementSelected,
    });
    picker.startPicking();

    const overlay = document.getElementById(OVERLAY_ID) as HTMLDivElement | null;
    const moveEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: 110,
      clientY: 50,
    });
    overlay?.dispatchEvent(moveEvent);

    document.body.focus();
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(enterEvent);

    expect(sendElementSelected).toHaveBeenCalledWith(110, 50, target);
    expect(notifyPickerStopped).toHaveBeenCalledWith('selected');
  });

  it('prefers highlighted element over focused element on Enter key', () => {
    const notifyPickerStopped = vi.fn();
    const sendElementSelected = vi.fn();
    const highlightedTarget = document.createElement('button');
    highlightedTarget.textContent = 'highlighted';
    highlightedTarget.getBoundingClientRect = () =>
      ({
        left: 200,
        top: 70,
        width: 30,
        height: 20,
        right: 230,
        bottom: 90,
        x: 200,
        y: 70,
        toJSON() {
          return {};
        },
      } as DOMRect);
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: vi.fn(() => highlightedTarget),
    });

    const picker = createElementPickerOverlayController({
      notifyPickerStopped,
      sendElementSelected,
    });
    picker.startPicking();

    const focusedInput = document.createElement('input');
    focusedInput.getBoundingClientRect = () =>
      ({
        left: 10,
        top: 20,
        width: 50,
        height: 30,
        right: 60,
        bottom: 50,
        x: 10,
        y: 20,
        toJSON() {
          return {};
        },
      } as DOMRect);
    document.body.appendChild(focusedInput);
    focusedInput.focus();

    const overlay = document.getElementById(OVERLAY_ID) as HTMLDivElement | null;
    overlay?.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: 215,
        clientY: 80,
      }),
    );

    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(enterEvent);

    expect(sendElementSelected).toHaveBeenCalledWith(215, 80, highlightedTarget);
    expect(notifyPickerStopped).toHaveBeenCalledWith('selected');
    focusedInput.remove();
  });
});
