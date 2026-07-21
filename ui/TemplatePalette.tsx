import { useEffect, useMemo, useRef, useState } from "react";
import { browser } from "wxt/browser";
import { isPaletteHotkey, TOGGLE_MESSAGE_TYPE } from "../lib/hotkey";
import { applyTicketFields } from "../lib/servicenow";
import { expandTicketFields } from "../lib/placeholders";
import { loadTemplates, subscribeToTemplates } from "../lib/templateStorage";
import {
  defaultTemplates,
  searchTemplates,
  type ResolvedTemplate,
  type TicketTemplate,
} from "../lib/templates";

const FIELD_NAMES: Record<string, string> = {
  caller: "caller",
  onBehalfOf: "on behalf of",
  location: "location",
  shortDescription: "short description",
  description: "description",
  additionalComments: "additional comments",
  workNotes: "work notes",
  channel: "channel",
  state: "state",
  category: "category",
  subcategory: "subcategory",
  subcategory2: "subcategory 2",
  subcategory3: "subcategory 3",
  assignmentGroup: "assignment group",
  assignedTo: "assigned to",
  impact: "impact",
  urgency: "urgency",
  resolutionCode: "resolution code",
  resolutionNotes: "resolution notes",
};

export function TemplatePalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState("");
  const [templates, setTemplates] =
    useState<TicketTemplate[]>(defaultTemplates);
  const searchRef = useRef<HTMLInputElement>(null);
  const results = useMemo(
    () => searchTemplates(query, templates),
    [query, templates],
  );

  useEffect(() => {
    void loadTemplates().then(setTemplates);
    return subscribeToTemplates(setTemplates);
  }, []);

  const close = () => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  };

  const apply = (template: ResolvedTemplate) => {
    const expanded = expandTicketFields(template.fields);
    const result = applyTicketFields(expanded.fields);
    close();
    if (result.applied.length) {
      const applied = result.applied.map((key) => FIELD_NAMES[key]).join(", ");
      const unavailable = result.missing.length
        ? ` ${result.missing.length} unavailable field${result.missing.length === 1 ? "" : "s"} skipped.`
        : "";
      const unresolved = expanded.unresolved.length
        ? ` ${expanded.unresolved.length} unknown placeholder${expanded.unresolved.length === 1 ? "" : "s"} left unchanged.`
        : "";
      setStatus(
        `Applied “${template.title}”: ${applied}.${unavailable}${unresolved}`,
      );
    } else {
      setStatus("No supported incident fields were found on this page.");
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isPaletteHotkey(event)) {
        event.preventDefault();
        event.stopPropagation();
        setOpen((current) => !current);
        return;
      }
      if (!open) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) =>
          Math.min(current + 1, Math.max(results.length - 1, 0)),
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => Math.max(current - 1, 0));
      } else if (event.key === "Enter" && results[selectedIndex]) {
        event.preventDefault();
        apply(results[selectedIndex]);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, results, selectedIndex]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (
        (event.data as { type?: string } | null)?.type !== TOGGLE_MESSAGE_TYPE
      )
        return;
      setOpen((current) => !current);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => searchRef.current?.focus());
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!status) return;
    const timeout = window.setTimeout(() => setStatus(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  return (
    <>
      {open && (
        <div
          className="backdrop"
          role="presentation"
          onMouseDown={(event) =>
            event.target === event.currentTarget && close()
          }
        >
          <section
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="IT ticket templates"
          >
            <header className="search-row">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m21 21-4.35-4.35m2.35-5.15A7.5 7.5 0 1 1 4 11.5a7.5 7.5 0 0 1 15 0Z" />
              </svg>
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ticket templates…"
                aria-label="Search ticket templates"
                autoComplete="off"
              />
              <kbd>Esc</kbd>
            </header>
            <div className="result-count">
              {results.length} template{results.length === 1 ? "" : "s"}
            </div>
            <div className="results" role="listbox" aria-label="Templates">
              {results.map((template, index) => (
                <button
                  key={template.id}
                  type="button"
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={`template ${index === selectedIndex ? "selected" : ""} ${template.depth ? "child" : ""}`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => apply(template)}
                >
                  <span className="template-icon" aria-hidden="true">
                    {template.depth ? "↳" : "◇"}
                  </span>
                  <span className="template-copy">
                    <span className="template-title">{template.title}</span>
                    <span className="template-summary">{template.summary}</span>
                    {template.parent && (
                      <span className="inherits">
                        Inherits {template.parent.title}
                      </span>
                    )}
                  </span>
                  <span className="apply-hint">
                    Apply <span>↵</span>
                  </span>
                </button>
              ))}
              {!results.length && (
                <div className="empty">
                  <span>No matching templates</span>
                  <small>Try a service, symptom, or device name.</small>
                </div>
              )}
            </div>
            <footer>
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> navigate
              </span>
              <span>
                <kbd>Enter</kbd> apply
              </span>
              <button
                className="settings-link"
                type="button"
                onClick={() =>
                  void browser.tabs.create({
                    url: browser.runtime.getURL("/options.html"),
                  })
                }
              >
                Settings
              </button>
              <span className="brand">IT Templates</span>
            </footer>
          </section>
        </div>
      )}
      {status && (
        <div className="toast" role="status">
          {status}
        </div>
      )}
    </>
  );
}
