const DEFAULT_INLINE_CHILD_INDENT_PX = 16;

/** details open 상태를 토글하는 공용 버튼 노드를 생성한다. */
export function createDetailsToggleButton(detailsEl: HTMLDetailsElement): HTMLButtonElement {
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'json-row-toggle';
  toggle.setAttribute('aria-label', 'Toggle row details');

  const syncToggle = () => {
    toggle.textContent = detailsEl.open ? '▾' : '▸';
  };
  syncToggle();

  toggle.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    detailsEl.open = !detailsEl.open;
  });
  detailsEl.addEventListener('toggle', syncToggle);
  return toggle;
}

/** non-expandable row 정렬용 토글 spacer를 생성한다. */
export function createRowToggleSpacer(): HTMLSpanElement {
  const spacer = document.createElement('span');
  spacer.className = 'json-row-toggle-spacer';
  spacer.setAttribute('aria-hidden', 'true');
  return spacer;
}

export interface CreateExpandableValueRowOptions {
  keyEl: HTMLElement;
  valueDetails: HTMLDetailsElement;
  extraClassName?: string;
  inlineChildIndentPx?: number;
}

/** key/value expandable json row를 생성한다. */
export function createExpandableValueRow(
  options: CreateExpandableValueRowOptions,
): HTMLDivElement {
  const {
    keyEl,
    valueDetails,
    extraClassName,
    inlineChildIndentPx = DEFAULT_INLINE_CHILD_INDENT_PX,
  } = options;
  const row = document.createElement('div');
  row.className = `json-row json-row-expandable${extraClassName ? ` ${extraClassName}` : ''}`;

  const toggleDetailsOpenState = () => {
    valueDetails.open = !valueDetails.open;
  };

  const toggle = createDetailsToggleButton(valueDetails);

  valueDetails.classList.add('json-inline-value');
  keyEl.classList.add('json-key-toggle');
  keyEl.setAttribute('role', 'button');
  keyEl.tabIndex = 0;
  keyEl.setAttribute('aria-expanded', valueDetails.open ? 'true' : 'false');

  keyEl.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleDetailsOpenState();
  });
  keyEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    toggleDetailsOpenState();
  });

  const syncInlineChildrenOffset = () => {
    if (!valueDetails.open) return;
    const children = valueDetails.querySelector(':scope > .json-children');
    if (!(children instanceof HTMLElement)) return;
    const rowRect = row.getBoundingClientRect();
    const detailsRect = valueDetails.getBoundingClientRect();
    const offset = detailsRect.left - rowRect.left;
    const targetMargin = inlineChildIndentPx - offset;
    children.style.marginLeft = `${targetMargin}px`;
  };

  const scheduleInlineChildrenOffset = () => {
    requestAnimationFrame(syncInlineChildrenOffset);
  };

  valueDetails.addEventListener('toggle', () => {
    keyEl.setAttribute('aria-expanded', valueDetails.open ? 'true' : 'false');
    scheduleInlineChildrenOffset();
  });
  window.addEventListener('resize', scheduleInlineChildrenOffset);
  if (typeof MutationObserver === 'function') {
    const childrenObserver = new MutationObserver(() => {
      if (!row.isConnected || !valueDetails.open) return;
      scheduleInlineChildrenOffset();
    });
    childrenObserver.observe(valueDetails, { childList: true });
  }
  if (valueDetails.open) {
    scheduleInlineChildrenOffset();
  }

  row.appendChild(toggle);
  row.appendChild(keyEl);
  row.appendChild(document.createTextNode(': '));
  row.appendChild(valueDetails);
  return row;
}
