import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react";
import { placeholders } from "../lib/placeholders";

type PlaceholderEditorProps = {
  multiline: boolean;
  value: string;
  inherited: boolean;
  suggestions?: string[];
  suggestionsId?: string;
  onChange: (value: string) => void;
};

type Trigger = {
  start: number;
  end: number;
  query: string;
};

const PLACEHOLDER_SUGGESTIONS = placeholders.flatMap(
  (placeholder) => placeholder.examples,
);

function findTrigger(value: string, caret: number): Trigger | null {
  const before = value.slice(0, caret);
  const braces = before.lastIndexOf("{{");
  if (braces > before.lastIndexOf("}}")) {
    return { start: braces, end: caret, query: before.slice(braces + 2) };
  }

  const slash = /(?:^|\s)\/([^\s{}]*)$/.exec(before);
  if (!slash) return null;
  return {
    start: caret - slash[1].length - 1,
    end: caret,
    query: slash[1],
  };
}

export function PlaceholderEditor({
  multiline,
  value,
  inherited,
  suggestions,
  suggestionsId,
  onChange,
}: PlaceholderEditorProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [selected, setSelected] = useState(0);
  const matches = useMemo(() => {
    if (!trigger) return [];
    const query = trigger.query.toLocaleLowerCase();
    return PLACEHOLDER_SUGGESTIONS.filter((item) =>
      `${item.value} ${item.label}`.toLocaleLowerCase().includes(query),
    );
  }, [trigger]);

  const refresh = (nextValue: string, caret: number | null) => {
    setTrigger(caret == null ? null : findTrigger(nextValue, caret));
    setSelected(0);
  };

  const insert = (placeholder: string) => {
    if (!trigger) return;
    const next = `${value.slice(0, trigger.start)}${placeholder}${value.slice(trigger.end)}`;
    const caret = trigger.start + placeholder.length;
    onChange(next);
    setTrigger(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(caret, caret);
    });
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    onChange(event.target.value);
    refresh(event.target.value, event.target.selectionStart);
  };

  const handleClick = (
    event: MouseEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => refresh(event.currentTarget.value, event.currentTarget.selectionStart);

  const handleKeyUp = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (
      !["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)
    ) {
      refresh(event.currentTarget.value, event.currentTarget.selectionStart);
    }
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (event.key === "Escape" && trigger) {
      event.preventDefault();
      setTrigger(null);
      return;
    }
    if (!trigger || !matches.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((index) => (index + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((index) => (index - 1 + matches.length) % matches.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      insert(matches[selected].value);
    }
  };

  const common = {
    ref: inputRef as never,
    className: inherited ? "inherited-input" : "",
    value,
    onChange: handleChange,
    onClick: handleClick,
    onKeyUp: handleKeyUp,
    onKeyDown: handleKeyDown,
    onBlur: () => window.setTimeout(() => setTrigger(null), 100),
    "aria-autocomplete": "list" as const,
    "aria-expanded": Boolean(trigger && matches.length),
  };

  return (
    <div className="placeholder-editor">
      {multiline ? (
        <textarea {...common} rows={6} />
      ) : (
        <input {...common} list={suggestionsId} />
      )}
      {suggestionsId && (
        <datalist id={suggestionsId}>
          {suggestions?.map((option) => (
            <option value={option} key={option} />
          ))}
        </datalist>
      )}
      {trigger && matches.length > 0 && (
        <div
          className="placeholder-menu"
          role="listbox"
          aria-label="Dynamic placeholders"
        >
          {matches.map((item, index) => (
            <button
              key={item.value}
              type="button"
              role="option"
              aria-selected={index === selected}
              className={index === selected ? "selected" : ""}
              onMouseDown={(event) => {
                event.preventDefault();
                insert(item.value);
              }}
            >
              <code>{item.value}</code>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
