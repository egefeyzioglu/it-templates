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

function collectRoots(): Array<Document | ShadowRoot> {
  const roots: Array<Document | ShadowRoot> = [document];
  for (let index = 0; index < roots.length; index += 1) {
    for (const element of Array.from(roots[index].querySelectorAll('*'))) {
      if (element.shadowRoot && !roots.includes(element.shadowRoot)) roots.push(element.shadowRoot);
      if (element instanceof HTMLIFrameElement) {
        try {
          if (element.contentDocument && !roots.includes(element.contentDocument)) roots.push(element.contentDocument);
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

function findByLabel(root: Document | ShadowRoot, labels: string[]): WritableElement | null {
  for (const labelText of labels) {
    const labelsInRoot = Array.from(root.querySelectorAll('label'));
    const label = labelsInRoot.find((candidate) => candidate.textContent?.trim().toLocaleLowerCase() === labelText.toLocaleLowerCase());
    if (!label) continue;
    const targetId = label.getAttribute('for');
    const target = targetId ? root.querySelector(`#${escapeSelector(targetId)}`) : label.querySelector('input, textarea, select, [contenteditable="true"]');
    if (target instanceof HTMLElement) return target;
  }
  return null;
}

function findField(key: FieldKey): WritableElement | null {
  const roots = collectRoots();
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
        if (candidate instanceof HTMLElement) return candidate;
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
  if (element instanceof HTMLSelectElement) {
    const wanted = value.toLocaleLowerCase();
    const option = Array.from(element.options).find((item) =>
      item.value.toLocaleLowerCase() === wanted || item.text.toLocaleLowerCase() === wanted || item.text.toLocaleLowerCase().includes(wanted),
    );
    if (!option) return false;
    element.value = option.value;
    notify(element);
    return true;
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    setter?.call(element, value);
    if (!setter) element.value = value;
    notify(element);
    return true;
  }

  const editable = element.matches('[contenteditable="true"]')
    ? element
    : element.shadowRoot?.querySelector<HTMLElement>('input, textarea, select, [contenteditable="true"]');
  if (editable) return setNativeValue(editable, value);

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

  for (const [key, value] of Object.entries(fields) as Array<[FieldKey, string | undefined]>) {
    if (value == null) continue;
    const element = findField(key);
    if (element && setNativeValue(element, value)) applied.push(key);
    else missing.push(key);
  }

  return { applied, missing };
}
