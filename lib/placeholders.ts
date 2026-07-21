import type { TicketFields } from "./templates";

export type TemplateContext = {
  now?: Date;
  ticketNumber?: string;
  pageTitle?: string;
  pageUrl?: string;
  selectedText?: string;
  prompt?: (message: string, defaultValue?: string) => string | null;
  uuid?: () => string;
};

export type ExpansionResult = {
  fields: TicketFields;
  unresolved: string[];
};

const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;
const TICKET_NUMBER_SELECTOR = [
  'input[id="sys_readonly.incident.number"]',
  'input[id="sys_readonly.sc_req_item.number"]',
  'input[id="sys_readonly.sc_task.number"]',
  'input[id="sys_readonly.incident_task.number"]',
].join(", ");

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function offsetDate(date: Date, value: string): Date | null {
  const match = /^([+-]?\d+)\s*(m|h|d|w)$/i.exec(value.trim());
  if (!match) return null;

  const units = {
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  const unit = match[2].toLowerCase() as keyof typeof units;
  return new Date(date.getTime() + Number(match[1]) * units[unit]);
}

function formatDate(date: Date, pattern: string): string {
  const zone = -date.getTimezoneOffset();
  const values: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
    Z: `${zone >= 0 ? "+" : "-"}${pad(Math.floor(Math.abs(zone) / 60))}:${pad(Math.abs(zone) % 60)}`,
  };
  return pattern.replace(/YYYY|MM|DD|HH|mm|ss|Z/g, (token) => values[token]);
}

function resolveDate(
  name: string,
  options: string[],
  now: Date,
): string | null {
  let state: DateFilterState = {
    date: new Date(now),
    format:
      name === "date"
        ? "YYYY-MM-DD"
        : name === "time"
          ? "HH:mm"
          : "YYYY-MM-DD HH:mm",
  };
  for (const option of options) {
    const separator = option.indexOf(":");
    const filterName = separator < 0 ? option : option.slice(0, separator);
    const argument = separator < 0 ? "" : option.slice(separator + 1);
    const filter = filters.find((definition) => definition.name === filterName);
    if (!filter?.applyDate) continue;
    const next = filter.applyDate(state, argument);
    if (!next) return null;
    state = next;
  }
  return formatDate(state.date, state.format);
}

type ResolvedContext = TemplateContext & { now: Date };

type PlaceholderDefinition = {
  names: readonly string[];
  examples: readonly {
    value: string;
    label: string;
  }[];
  description: string;
  matches?: (name: string) => boolean;
  resolve: (
    name: string,
    options: string[],
    context: ResolvedContext,
  ) => string | null;
};

type DateFilterState = {
  date: Date;
  format: string;
};

type FilterDefinition = {
  name: string;
  example: string;
  description: string;
  apply?: (value: string, argument: string) => string;
  applyDate?: (
    state: DateFilterState,
    argument: string,
  ) => DateFilterState | null;
};

function definePlaceholders(
  definitions: readonly PlaceholderDefinition[],
): readonly PlaceholderDefinition[] {
  return definitions;
}

function defineFilters(
  definitions: readonly FilterDefinition[],
): readonly FilterDefinition[] {
  return definitions;
}

export const placeholders = definePlaceholders([
  {
    names: ["date", "time", "datetime"],
    examples: [
      { value: "{{date}}", label: "Current date" },
      { value: "{{time}}", label: "Current time" },
      { value: "{{datetime}}", label: "Current date and time" },
      { value: "{{time|offset:+2h}}", label: "Time with offset" },
      {
        value: "{{datetime|format:DD/MM/YYYY HH:mm}}",
        label: "Formatted date and time",
      },
    ],
    description: "The current date or time.",
    resolve: (name, options, context) =>
      resolveDate(name, options, context.now),
  },
  {
    names: ["ticket.number", "ticket"],
    examples: [
      {
        value: "{{ticket.number|default:New ticket}}",
        label: "Ticket number",
      },
    ],
    description: "The current ticket number.",
    resolve: (_name, _options, context) => context.ticketNumber ?? "",
  },
  {
    names: ["prompt"],
    examples: [{ value: "{{prompt:Caller name}}", label: "Ask for a value" }],
    description: "Ask for a value when the template is applied.",
    matches: (name) => name.startsWith("prompt:"),
    resolve: (name, options, context) => {
      const label = name.slice(7).trim();
      if (!label) return null;
      const fallback = options.find((part) => part.startsWith("default:"));
      return (context.prompt ?? window.prompt)(label, fallback?.slice(8)) ?? "";
    },
  },
  {
    names: ["page.title"],
    examples: [{ value: "{{page.title}}", label: "Page title" }],
    description: "The current page title.",
    resolve: (_name, _options, context) => context.pageTitle ?? "",
  },
  {
    names: ["page.url"],
    examples: [{ value: "{{page.url}}", label: "Page URL" }],
    description: "The current page URL.",
    resolve: (_name, _options, context) => context.pageUrl ?? "",
  },
  {
    names: ["selection"],
    examples: [{ value: "{{selection|trim}}", label: "Selected page text" }],
    description: "Text selected on the current page.",
    resolve: (_name, _options, context) => context.selectedText ?? "",
  },
  {
    names: ["uuid"],
    examples: [{ value: "{{uuid}}", label: "Unique identifier" }],
    description: "A new unique identifier.",
    resolve: (_name, _options, context) =>
      (context.uuid ?? crypto.randomUUID.bind(crypto))(),
  },
]);

export const filters = defineFilters([
  {
    name: "upper",
    example: "upper",
    description: "uppercase",
    apply: (value) => value.toLocaleUpperCase(),
  },
  {
    name: "lower",
    example: "lower",
    description: "lowercase",
    apply: (value) => value.toLocaleLowerCase(),
  },
  {
    name: "trim",
    example: "trim",
    description: "remove surrounding whitespace",
    apply: (value) => value.trim(),
  },
  {
    name: "default",
    example: "default:text",
    description: "use text when empty",
    apply: (value, argument) => value || argument,
  },
  {
    name: "offset",
    example: "offset:+2h",
    description: "shift a date or time (m/h/d/w)",
    applyDate: (state, argument) => {
      const date = offsetDate(state.date, argument);
      return date ? { ...state, date } : null;
    },
  },
  {
    name: "format",
    example: "format:YYYY-MM-DD HH:mm:ss Z",
    description: "format a date or time",
    applyDate: (state, argument) => ({
      ...state,
      format: argument || state.format,
    }),
  },
]);

function resolveBase(
  name: string,
  options: string[],
  context: ResolvedContext,
): string | null {
  const placeholder = placeholders.find(
    (definition) =>
      definition.names.includes(name) || definition.matches?.(name),
  );
  return placeholder?.resolve(name, options, context) ?? null;
}

function transform(value: string, options: string[]): string {
  return options.reduce((current, option) => {
    const separator = option.indexOf(":");
    const name = separator < 0 ? option : option.slice(0, separator);
    const argument = separator < 0 ? "" : option.slice(separator + 1);
    const filter = filters.find((definition) => definition.name === name);
    return filter?.apply ? filter.apply(current, argument) : current;
  }, value);
}

export function expandText(
  text: string,
  context: TemplateContext = {},
): { value: string; unresolved: string[] } {
  const unresolved: string[] = [];
  const resolvedContext = { ...context, now: context.now ?? new Date() };
  const value = text.replace(PLACEHOLDER, (source, expression: string) => {
    const [name, ...options] = expression.split("|").map((part) => part.trim());
    const resolved = resolveBase(name.toLowerCase(), options, resolvedContext);
    if (resolved == null) {
      unresolved.push(source);
      return source;
    }
    return transform(resolved, options);
  });
  return { value, unresolved };
}

export function expandTicketFields(
  fields: TicketFields,
  context: TemplateContext = {},
): ExpansionResult {
  const resolvedContext =
    typeof document === "undefined"
      ? context
      : { ...collectTemplateContext(document), ...context };
  const expanded: TicketFields = {};
  const unresolved = new Set<string>();
  for (const [key, value] of Object.entries(fields) as Array<
    [keyof TicketFields, string | undefined]
  >) {
    if (value == null) continue;
    const result = expandText(value, resolvedContext);
    expanded[key] = result.value;
    result.unresolved.forEach((item) => unresolved.add(item));
  }
  return { fields: expanded, unresolved: [...unresolved] };
}

function collectRoots(doc: Document): Array<Document | ShadowRoot> {
  const roots: Array<Document | ShadowRoot> = [doc];
  for (let index = 0; index < roots.length; index += 1) {
    for (const element of roots[index].querySelectorAll("*")) {
      if (element.shadowRoot && !roots.includes(element.shadowRoot)) {
        roots.push(element.shadowRoot);
      }
      if (element.localName === "iframe" || element.localName === "frame") {
        try {
          const child = (element as HTMLIFrameElement).contentDocument;
          if (child && !roots.includes(child)) roots.push(child);
        } catch {
          // Cross-origin frames are unavailable.
        }
      }
    }
  }
  return roots;
}

export function collectTemplateContext(
  doc: Document = document,
): TemplateContext {
  const roots = collectRoots(doc);
  const ticketNumber = roots
    .map((root) =>
      root
        .querySelector<HTMLInputElement>(TICKET_NUMBER_SELECTOR)
        ?.value.trim(),
    )
    .find(Boolean);
  const selectedText =
    roots
      .filter((root): root is Document => root.nodeType === Node.DOCUMENT_NODE)
      .map((root) => root.getSelection()?.toString())
      .find(Boolean) ?? "";

  return {
    ticketNumber,
    pageTitle: doc.title,
    pageUrl: doc.location.href,
    selectedText,
  };
}
