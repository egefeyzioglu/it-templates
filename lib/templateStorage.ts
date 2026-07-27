import { browser } from "wxt/browser";
import {
  defaultTemplates,
  type TicketFields,
  type TicketTemplate,
} from "./templates";

export const TEMPLATE_STORAGE_KEY = "ticketTemplates";
const fieldNames: (keyof TicketFields)[] = [
  "caller",
  "onBehalfOf",
  "location",
  "shortDescription",
  "description",
  "additionalComments",
  "workNotes",
  "channel",
  "state",
  "category",
  "subcategory",
  "subcategory2",
  "subcategory3",
  "assignmentGroup",
  "assignedTo",
  "impact",
  "urgency",
  "resolutionCode",
  "resolutionNotes",
];

export function cloneDefaults(): TicketTemplate[] {
  return structuredClone(defaultTemplates);
}

export function validateTemplates(
  value: unknown,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): TicketTemplate[] {
  const candidates = Array.isArray(value)
    ? value
    : value &&
        typeof value === "object" &&
        Array.isArray((value as { templates?: unknown }).templates)
      ? (value as { templates: unknown[] }).templates
      : null;
  if (!candidates || (!allowEmpty && !candidates.length))
    throw new Error("The file does not contain any templates.");
  const ids = new Set<string>();
  for (const value of candidates) {
    if (!value || typeof value !== "object")
      throw new Error("One or more templates are invalid.");
    const item = value as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      !item.id.trim() ||
      typeof item.title !== "string" ||
      !item.title.trim() ||
      typeof item.summary !== "string" ||
      !Array.isArray(item.keywords) ||
      !item.keywords.every((word) => typeof word === "string") ||
      !item.fields ||
      typeof item.fields !== "object"
    )
      throw new Error(
        "Each template needs an ID, title, summary, keywords, and fields.",
      );
    if (ids.has(item.id)) throw new Error(`Duplicate template ID: ${item.id}`);
    if (
      !fieldNames.every(
        (name) =>
          (item.fields as Record<string, unknown>)[name] === undefined ||
          typeof (item.fields as Record<string, unknown>)[name] === "string",
      )
    )
      throw new Error(`Template “${item.title}” has an invalid ticket field.`);
    ids.add(item.id);
  }
  return structuredClone(candidates as TicketTemplate[]);
}

export async function loadTemplates(): Promise<TicketTemplate[]> {
  const stored = browser.storage?.local
    ? (await browser.storage.local.get(TEMPLATE_STORAGE_KEY))[
        TEMPLATE_STORAGE_KEY
      ]
    : JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) ?? "null");
  if (!stored) {
    const defaults = cloneDefaults();
    await saveTemplates(defaults);
    return defaults;
  }
  try {
    return validateTemplates(stored, { allowEmpty: true });
  } catch {
    return cloneDefaults();
  }
}

export async function saveTemplates(
  templates: TicketTemplate[],
): Promise<void> {
  if (browser.storage?.local) {
    await browser.storage.local.set({ [TEMPLATE_STORAGE_KEY]: templates });
    return;
  }
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
}

export function subscribeToTemplates(
  callback: (templates: TicketTemplate[]) => void,
): () => void {
  const listener = (
    changes: Record<string, Browser.storage.StorageChange>,
    area: string,
  ) => {
    if (area !== "local" || !changes[TEMPLATE_STORAGE_KEY]?.newValue) return;
    try {
      callback(
        validateTemplates(changes[TEMPLATE_STORAGE_KEY].newValue, {
          allowEmpty: true,
        }),
      );
    } catch {
      /* Ignore malformed external writes. */
    }
  };
  if (browser.storage?.onChanged) {
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  }
  const storageListener = (event: StorageEvent) => {
    if (event.key !== TEMPLATE_STORAGE_KEY || !event.newValue) return;
    try {
      callback(
        validateTemplates(JSON.parse(event.newValue), { allowEmpty: true }),
      );
    } catch {
      /* Ignore malformed external writes. */
    }
  };
  window.addEventListener("storage", storageListener);
  return () => window.removeEventListener("storage", storageListener);
}
