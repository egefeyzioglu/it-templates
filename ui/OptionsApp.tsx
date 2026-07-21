import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { filters, placeholders } from "../lib/placeholders";
import {
  cloneDefaults,
  loadTemplates,
  saveTemplates,
  validateTemplates,
} from "../lib/templateStorage";
import type { TicketFields, TicketTemplate } from "../lib/templates";
import { PlaceholderEditor } from "./PlaceholderEditor";

const FIELDS: {
  key: keyof TicketFields;
  label: string;
  multiline?: boolean;
}[] = [
  { key: "shortDescription", label: "Short description" },
  { key: "description", label: "Description", multiline: true },
  { key: "workNotes", label: "Work notes", multiline: true },
  { key: "category", label: "Category" },
  { key: "subcategory", label: "Subcategory" },
  { key: "assignmentGroup", label: "Assignment group" },
  { key: "impact", label: "Impact" },
  { key: "urgency", label: "Urgency" },
];

function uniqueId(templates: TicketTemplate[]) {
  let id = `template-${Date.now().toString(36)}`;
  while (templates.some((item) => item.id === id)) id += "-copy";
  return id;
}

function download(templates: TicketTemplate[], filename: string) {
  const data = { version: 1, exportedAt: new Date().toISOString(), templates };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

type Dialog = "import" | "export" | null;
type ImportMode = "append" | "replace";
const SUGGESTED_FIELDS = new Set<keyof TicketFields>([
  "category",
  "subcategory",
  "assignmentGroup",
  "impact",
  "urgency",
]);

function inheritedFields(
  template: TicketTemplate,
  templates: TicketTemplate[],
): TicketFields {
  const byId = new Map(templates.map((item) => [item.id, item]));
  const visit = (
    item: TicketTemplate | undefined,
    seen: Set<string>,
  ): TicketFields => {
    if (!item || seen.has(item.id)) return {};
    seen.add(item.id);
    return {
      ...visit(item.parentId ? byId.get(item.parentId) : undefined, seen),
      ...item.fields,
    };
  };
  return visit(
    template.parentId ? byId.get(template.parentId) : undefined,
    new Set([template.id]),
  );
}

function treeTemplates(
  templates: TicketTemplate[],
): { template: TicketTemplate; depth: number }[] {
  const ids = new Set(templates.map((item) => item.id));
  const children = new Map<string, TicketTemplate[]>();
  templates.forEach((item) => {
    const key = item.parentId && ids.has(item.parentId) ? item.parentId : "";
    children.set(key, [...(children.get(key) ?? []), item]);
  });
  const result: { template: TicketTemplate; depth: number }[] = [];
  const walk = (parentId: string, depth: number, seen: Set<string>) =>
    (children.get(parentId) ?? []).forEach((item) => {
      if (seen.has(item.id)) return;
      seen.add(item.id);
      result.push({ template: item, depth });
      walk(item.id, depth + 1, seen);
    });
  walk("", 0, new Set());
  return result;
}

export function OptionsApp() {
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [activeId, setActiveId] = useState("");
  const [view, setView] = useState<"tree" | "flat">("tree");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [exportIds, setExportIds] = useState<Set<string>>(new Set());
  const [importText, setImportText] = useState("");
  const [importMode, setImportMode] = useState<ImportMode>("append");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const active = templates.find((item) => item.id === activeId);
  const rows = useMemo(
    () =>
      view === "tree" && !query
        ? treeTemplates(templates)
        : [...templates]
            .sort((a, b) => a.title.localeCompare(b.title))
            .map((template) => ({ template, depth: 0 })),
    [templates, view, query],
  );
  const filtered = useMemo(
    () =>
      rows.filter(({ template }) =>
        `${template.title} ${template.summary} ${template.keywords.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [rows, query],
  );
  const inherited = active ? inheritedFields(active, templates) : {};
  const suggestions = useMemo(
    () =>
      Object.fromEntries(
        FIELDS.map(({ key }) => [
          key,
          [
            ...new Set(
              templates
                .map((item) => item.fields[key])
                .filter((value): value is string => Boolean(value)),
            ),
          ],
        ]),
      ) as Record<keyof TicketFields, string[]>,
    [templates],
  );

  useEffect(() => {
    void loadTemplates().then((items) => {
      setTemplates(items);
      setActiveId(items[0]?.id ?? "");
    });
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 2500);
    return () => clearTimeout(timer);
  }, [notice]);
  const persist = (
    next: TicketTemplate[],
    message = "Changes saved locally",
  ) => {
    setTemplates(next);
    void saveTemplates(next);
    setNotice(message);
  };
  const update = (changes: Partial<TicketTemplate>) =>
    active &&
    persist(
      templates.map((item) =>
        item.id === active.id ? { ...item, ...changes } : item,
      ),
    );
  const updateField = (key: keyof TicketFields, value: string) =>
    active &&
    update({ fields: { ...active.fields, [key]: value || undefined } });
  const add = () => {
    const id = uniqueId(templates);
    persist(
      [
        ...templates,
        {
          id,
          title: "Untitled template",
          summary: "",
          keywords: [],
          fields: {},
        },
      ],
      "Template created",
    );
    setActiveId(id);
  };
  const duplicate = () => {
    if (!active) return;
    const id = uniqueId(templates);
    persist(
      [
        ...templates,
        { ...structuredClone(active), id, title: `${active.title} copy` },
      ],
      "Template duplicated",
    );
    setActiveId(id);
  };
  const remove = () => {
    if (!active || !confirm(`Delete “${active.title}”?`)) return;
    const next = templates
      .filter((item) => item.id !== active.id)
      .map((item) =>
        item.parentId === active.id ? { ...item, parentId: undefined } : item,
      );
    persist(next, "Template deleted");
    setActiveId(next[0]?.id ?? "");
  };
  const reset = () => {
    if (
      !confirm(
        "Restore all built-in templates? Your current library will be replaced.",
      )
    )
      return;
    const next = cloneDefaults();
    persist(next, "Defaults restored");
    setActiveId(next[0].id);
  };
  const chooseFile = async (file?: File) => {
    if (!file) return;
    setImportText(await file.text());
    if (fileRef.current) fileRef.current.value = "";
  };
  const runImport = () => {
    try {
      const incoming = validateTemplates(JSON.parse(importText));
      if (
        importMode === "replace" &&
        !confirm(
          `Replace all ${templates.length} existing templates with ${incoming.length} imported templates?`,
        )
      )
        return;
      const next =
        importMode === "replace"
          ? incoming
          : [
              ...new Map(
                [...templates, ...incoming].map((item) => [item.id, item]),
              ).values(),
            ];
      persist(
        next,
        `${incoming.length} template${incoming.length === 1 ? "" : "s"} imported`,
      );
      setActiveId(incoming[0].id);
      setDialog(null);
      setImportText("");
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "Could not import this JSON.",
      );
    }
  };
  const runExport = () => {
    const items = exportIds.size
      ? templates.filter((item) => exportIds.has(item.id))
      : templates;
    download(
      items,
      exportIds.size
        ? "it-ticket-templates-selected.json"
        : "it-ticket-templates.json",
    );
    setNotice(
      `${items.length} template${items.length === 1 ? "" : "s"} exported`,
    );
    setDialog(null);
  };

  return (
    <div className="options-shell">
      <header className="options-header">
        <div>
          <span className="eyebrow">IT TEMPLATES</span>
          <h1>Template settings</h1>
          <p>
            Shape your ticket library. Every change is saved to this browser.
          </p>
        </div>
        <div className="header-actions">
          <button className="secondary" onClick={() => setDialog("import")}>
            Import
          </button>
          <button
            className="primary"
            onClick={() => {
              setExportIds(new Set());
              setDialog("export");
            }}
          >
            Export
          </button>
        </div>
      </header>
      <main className="workspace">
        <aside className="library">
          <div className="library-head">
            <div>
              <h2>Library</h2>
              <span>{templates.length} templates</span>
            </div>
            <button className="icon-button" onClick={add} title="New template">
              +
            </button>
          </div>
          <div className="library-tools">
            <div className="search">
              <span>⌕</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search templates"
              />
            </div>
            <div className="view-toggle" aria-label="Template list view">
              <button
                className={view === "tree" ? "active" : ""}
                onClick={() => setView("tree")}
              >
                Tree
              </button>
              <button
                className={view === "flat" ? "active" : ""}
                onClick={() => setView("flat")}
              >
                Flat
              </button>
            </div>
          </div>
          <div className="template-list">
            {filtered.map(({ template: item, depth }) => (
              <div
                className={`library-item ${item.id === activeId ? "active" : ""}`}
                style={{ "--depth": depth } as CSSProperties}
                key={item.id}
              >
                <button
                  className="item-main"
                  onClick={() => setActiveId(item.id)}
                >
                  <strong>
                    {depth > 0 && <span className="tree-mark">↳</span>}
                    {item.title}
                  </strong>
                  <small>
                    {item.parentId
                      ? `Inherits ${templates.find((parent) => parent.id === item.parentId)?.title ?? "unknown"}`
                      : item.summary || "No summary"}
                  </small>
                </button>
              </div>
            ))}
          </div>
          <div className="library-foot">
            <button onClick={reset}>Restore defaults</button>
            <span>
              {view === "tree" && !query
                ? "Grouped by inheritance"
                : "All templates"}
            </span>
          </div>
        </aside>
        <section className="editor">
          {active ? (
            <>
              <div className="editor-head">
                <div>
                  <span className="status-dot" />
                  Saved locally
                </div>
                <div>
                  <button onClick={duplicate}>Duplicate</button>
                  <button className="danger" onClick={remove}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="editor-body">
                <div className="title-row">
                  <input
                    className="title-input"
                    value={active.title}
                    onChange={(event) => update({ title: event.target.value })}
                    aria-label="Template title"
                  />
                </div>
                <label>
                  Summary
                  <input
                    value={active.summary}
                    onChange={(event) =>
                      update({ summary: event.target.value })
                    }
                    placeholder="When should this template be used?"
                  />
                </label>
                <div className="two-col">
                  <label>
                    Keywords
                    <input
                      value={active.keywords.join(", ")}
                      onChange={(event) =>
                        update({
                          keywords: event.target.value
                            .split(",")
                            .map((word) => word.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="wifi, wireless, network"
                    />
                    <small>Comma-separated; used in search.</small>
                  </label>
                  <label>
                    Inherits from
                    <select
                      value={active.parentId ?? ""}
                      onChange={(event) =>
                        update({ parentId: event.target.value || undefined })
                      }
                    >
                      <option value="">Nothing (top-level)</option>
                      {templates
                        .filter(
                          (item) =>
                            item.id !== active.id &&
                            item.parentId !== active.id,
                        )
                        .map((item) => (
                          <option value={item.id} key={item.id}>
                            {item.title}
                          </option>
                        ))}
                    </select>
                    <small>Blank fields fall back to the parent.</small>
                  </label>
                </div>
                <div className="section-title">
                  <h2>Ticket fields</h2>
                  <p>
                    Inherited values are shown below. Typing replaces the
                    inherited value for this template. Dynamic placeholders are
                    replaced when you apply it.
                  </p>
                </div>
                <details className="placeholder-help">
                  <summary>Dynamic placeholder reference</summary>
                  <div className="placeholder-grid">
                    {placeholders.flatMap((placeholder) =>
                      placeholder.examples.map((example) => (
                        <Fragment key={example.value}>
                          <code>{example.value}</code>
                          <span>{example.label}</span>
                        </Fragment>
                      )),
                    )}
                  </div>
                  <p className="placeholder-note">
                    Filters:{" "}
                    {filters.map((filter, index) => (
                      <Fragment key={filter.name}>
                        {index > 0 && ", "}
                        <code>{filter.example}</code> ({filter.description})
                      </Fragment>
                    ))}
                    .
                  </p>
                </details>
                <div className="field-grid">
                  {FIELDS.map(({ key, label, multiline }) => {
                    const isInherited =
                      active.fields[key] === undefined &&
                      inherited[key] !== undefined;
                    const value = active.fields[key] ?? inherited[key] ?? "";
                    return (
                      <label className={multiline ? "wide" : ""} key={key}>
                        <span className="field-label">
                          {label}
                          {isInherited && (
                            <span className="inherited-badge">Inherited</span>
                          )}
                          {active.fields[key] !== undefined &&
                            inherited[key] !== undefined && (
                              <button
                                type="button"
                                onClick={() => updateField(key, "")}
                              >
                                Use inherited
                              </button>
                            )}
                        </span>
                        <PlaceholderEditor
                          multiline={Boolean(multiline)}
                          inherited={isInherited}
                          value={value}
                          onChange={(nextValue) => updateField(key, nextValue)}
                          suggestions={suggestions[key]}
                          suggestionsId={
                            SUGGESTED_FIELDS.has(key)
                              ? `values-${key}`
                              : undefined
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <span>◇</span>
              <h2>Create your first template</h2>
              <p>Add a template to start building your library.</p>
              <button className="primary" onClick={add}>
                New template
              </button>
            </div>
          )}
        </section>
      </main>
      {notice && <div className="options-toast">✓ {notice}</div>}
      {dialog === "import" && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDialog(null)
          }
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
          >
            <div className="modal-head">
              <div>
                <h2 id="import-title">Import templates</h2>
                <p>Paste exported JSON or choose a file.</p>
              </div>
              <button
                className="close-button"
                onClick={() => setDialog(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <textarea
                className="json-input"
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder={'{\n  "templates": [...]\n}'}
                rows={10}
              />
              <button
                className="file-button"
                onClick={() => fileRef.current?.click()}
              >
                Choose JSON file
              </button>
              <input
                ref={fileRef}
                hidden
                type="file"
                accept="application/json,.json"
                onChange={(event) => void chooseFile(event.target.files?.[0])}
              />
              <div className="choice-group">
                <label>
                  <input
                    type="radio"
                    checked={importMode === "append"}
                    onChange={() => setImportMode("append")}
                  />
                  <span>
                    <strong>Append to library</strong>
                    <small>
                      Add new templates and update matching imported templates.
                    </small>
                  </span>
                </label>
                <label>
                  <input
                    type="radio"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                  />
                  <span>
                    <strong>Overwrite everything</strong>
                    <small>
                      Replace the entire library. You will be asked to confirm.
                    </small>
                  </span>
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setDialog(null)}>Cancel</button>
              <button
                className="primary"
                disabled={!importText.trim()}
                onClick={runImport}
              >
                Import templates
              </button>
            </div>
          </section>
        </div>
      )}
      {dialog === "export" && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) =>
            event.target === event.currentTarget && setDialog(null)
          }
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-title"
          >
            <div className="modal-head">
              <div>
                <h2 id="export-title">Export templates</h2>
                <p>
                  Select specific templates, or leave everything unselected to
                  export all.
                </p>
              </div>
              <button
                className="close-button"
                onClick={() => setDialog(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="export-list">
              {treeTemplates(templates).map(({ template, depth }) => (
                <label
                  className="export-item"
                  style={{ "--depth": depth } as CSSProperties}
                  key={template.id}
                >
                  <input
                    type="checkbox"
                    checked={exportIds.has(template.id)}
                    onChange={() =>
                      setExportIds((current) => {
                        const copy = new Set(current);
                        copy.has(template.id)
                          ? copy.delete(template.id)
                          : copy.add(template.id);
                        return copy;
                      })
                    }
                  />
                  <span>
                    <strong>{template.title}</strong>
                    {template.parentId && (
                      <small>
                        Inherits{" "}
                        {
                          templates.find(
                            (item) => item.id === template.parentId,
                          )?.title
                        }
                      </small>
                    )}
                  </span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button onClick={() => setDialog(null)}>Cancel</button>
              <button className="primary" onClick={runExport}>
                Export{" "}
                {exportIds.size
                  ? `${exportIds.size} selected`
                  : `all ${templates.length}`}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
