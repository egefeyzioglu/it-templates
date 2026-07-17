import type { TicketFields } from './templates';

type FieldKey = keyof TicketFields;
type WritableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement;

const FIELD_LABELS: Record<FieldKey, string[]> = {
  shortDescription: ['Short description'],
  description: ['Description'],
  workNotes: ['Work notes', 'Additional comments'],
  category: ['Category'],
  subcategory: ['Subcategory', 'Sub-category'],
  assignmentGroup: ['Assignment group'],
  impact: ['Impact'],
  urgency: ['Urgency'],
};

const FIELD_TOKENS: Record<FieldKey, string[]> = {
  shortDescription: ['short_description', 'short-description', 'shortdescription'],
  description: ['description'],
  workNotes: ['work_notes', 'work-notes', 'comments'],
  category: ['category'],
  subcategory: ['subcategory', 'sub_category', 'sub-category'],
  assignmentGroup: ['assignment_group', 'assignment-group', 'assignmentgroup'],
  impact: ['impact'],
  urgency: ['urgency'],
};

// Elements can come from other frames' documents, where our realm's HTML*
// constructors don't apply, so every check here must avoid `instanceof`.
function isElement(node: unknown): node is HTMLElement {
  return !!node && (node as Node).nodeType === Node.ELEMENT_NODE;
}

function shadowRootOf(element: Element): ShadowRoot | null {
  if (element.shadowRoot) return element.shadowRoot;
  const gecko = (element as Element & { openOrClosedShadowRoot?: ShadowRoot | null }).openOrClosedShadowRoot;
  if (gecko) return gecko;
  try {
    type ChromeDom = { dom?: { openOrClosedShadowRoot?: (el: Element) => ShadowRoot | null } };
    return (globalThis as { chrome?: ChromeDom }).chrome?.dom?.openOrClosedShadowRoot?.(element) ?? null;
  } catch {
    return null;
  }
}

function collectRoots(): Array<Document | ShadowRoot> {
  const roots: Array<Document | ShadowRoot> = [document];
  for (let index = 0; index < roots.length; index += 1) {
    for (const element of Array.from(roots[index].querySelectorAll('*'))) {
      const shadow = shadowRootOf(element);
      if (shadow && !roots.includes(shadow)) roots.push(shadow);
      if (element.localName === 'iframe' || element.localName === 'frame') {
        try {
          const doc = (element as HTMLIFrameElement).contentDocument;
          if (doc && !roots.includes(doc)) roots.push(doc);
        } catch {
          // Cross-origin frames are intentionally skipped.
        }
      }
    }
  }
  return roots;
}

function escapeSelector(value: string): string {
  return CSS.escape(value);
}

function normalizeText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function findByLabel(root: Document | ShadowRoot, labels: string[]): WritableElement | null {
  for (const labelText of labels) {
    const labelsInRoot = Array.from(root.querySelectorAll('label'));
    const label = labelsInRoot.find((candidate) => normalizeText(candidate.textContent) === labelText.toLocaleLowerCase());
    if (!label) continue;
    const targetId = label.getAttribute('for');
    const target = targetId ? root.querySelector(`#${escapeSelector(targetId)}`) : label.querySelector('input, textarea, select, [contenteditable="true"]');
    if (isElement(target)) return target;
  }
  return null;
}

function findField(key: FieldKey, roots: Array<Document | ShadowRoot>): WritableElement | null {
  for (const root of roots) {
    const byLabel = findByLabel(root, FIELD_LABELS[key]);
    if (byLabel) return byLabel;

    for (const token of FIELD_TOKENS[key]) {
      const escaped = escapeSelector(token);
      const selectors = [
        `[name="${escaped}"]`,
        `[name$=".${escaped}"]`,
        `[id="${escaped}"]`,
        `[id$=".${escaped}"]`,
        `[data-field="${escaped}"]`,
        `[data-field-name="${escaped}"]`,
      ];
      for (const selector of selectors) {
        const candidate = root.querySelector(selector);
        if (isElement(candidate)) return candidate;
      }
    }
  }
  return null;
}

function notify(element: HTMLElement): void {
  for (const type of ['input', 'change', 'blur']) {
    element.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
  }
}

function setNativeValue(element: WritableElement, value: string): boolean {
  const tag = element.localName;

  if (tag === 'select') {
    const select = element as HTMLSelectElement;
    const wanted = value.toLocaleLowerCase();
    const option = Array.from(select.options).find((item) =>
      item.value.toLocaleLowerCase() === wanted || item.text.toLocaleLowerCase() === wanted || item.text.toLocaleLowerCase().includes(wanted),
    );
    if (!option) return false;
    select.value = option.value;
    notify(select);
    return true;
  }

  if (tag === 'input' || tag === 'textarea') {
    const field = element as HTMLInputElement | HTMLTextAreaElement;
    // Use the prototype from the element's own realm so framework-managed
    // value descriptors on the instance are bypassed even in other frames.
    const view = field.ownerDocument.defaultView;
    const ctor = tag === 'textarea' ? view?.HTMLTextAreaElement : view?.HTMLInputElement;
    const setter = ctor ? Object.getOwnPropertyDescriptor(ctor.prototype, 'value')?.set : undefined;
    if (setter) setter.call(field, value);
    else field.value = value;
    notify(field);
    return true;
  }

  if (element.matches('[contenteditable="true"]')) {
    element.textContent = value;
    notify(element);
    return true;
  }

  const inner = shadowRootOf(element)?.querySelector('input, textarea, select, [contenteditable="true"]');
  if (isElement(inner)) return setNativeValue(inner, value);

  if ('value' in element) {
    (element as HTMLElement & { value: string }).value = value;
    notify(element);
    return true;
  }
  return false;
}

export type ApplyResult = {
  applied: FieldKey[];
  missing: FieldKey[];
};

export function applyTicketFields(fields: TicketFields): ApplyResult {
  const applied: FieldKey[] = [];
  const missing: FieldKey[] = [];
  const roots = collectRoots();

  for (const [key, value] of Object.entries(fields) as Array<[FieldKey, string | undefined]>) {
    if (value == null) continue;
    const element = findField(key, roots);
    if (element && setNativeValue(element, value)) applied.push(key);
    else missing.push(key);
  }

  return { applied, missing };
}
