import { createRoot } from "react-dom/client";
import { forwardPaletteHotkey } from "../lib/hotkey";
import { TemplatePalette } from "../ui/TemplatePalette";
import styles from "../ui/styles.css?inline";

// Classic (UI16) incident form, the document ServiceNow loads into iframe#gsft_main.
const FORM_DOC = `<!doctype html>
<html lang="en">
  <head>
    <style>
      :root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #172033; background: #eef2f6; }
      * { box-sizing: border-box; }
      body { margin: 0; }
      main { width: min(1100px, calc(100vw - 48px)); margin: 28px auto; }
      h1 { margin: 0 0 15px; font-size: 22px; }
      form { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 22px; padding: 24px; border: 1px solid #d1d9e2; border-radius: 8px; background: #fff; box-shadow: 0 2px 7px rgb(15 23 42 / 6%); }
      label { display: flex; flex-direction: column; gap: 7px; color: #344256; font-size: 13px; font-weight: 650; }
      label.wide { grid-column: 1 / -1; }
      input, textarea, select { width: 100%; border: 1px solid #b8c3d0; border-radius: 4px; background: #fff; color: #172033; font: 14px/1.4 inherit; padding: 9px 10px; }
      textarea { min-height: 112px; resize: vertical; }
      input:focus, textarea:focus, select:focus { outline: 2px solid #78aef3; outline-offset: 1px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Create Incident</h1>
      <form>
        <label>Caller<input id="incident.caller_id" name="incident.caller_id" /></label>
        <label>On behalf of<input id="incident.u_on_behalf_of" name="incident.u_on_behalf_of" /></label>
        <label>Location<input id="incident.location" name="incident.location" /></label>
        <label>Channel<select id="incident.contact_type" name="incident.contact_type"><option></option><option>Phone</option><option>Email</option><option>Self-service</option></select></label>
        <label>State<select id="incident.state" name="incident.state"><option></option><option>New</option><option>In Progress</option><option>Resolved</option></select></label>
        <label>Category<select id="incident.category" name="incident.category"><option></option><option>Access</option><option>Network</option><option>Email</option><option>Software</option><option>Hardware</option><option>Security</option></select></label>
        <label>Subcategory 1<input id="incident.subcategory" name="incident.subcategory" /></label>
        <label>Subcategory 2<input id="incident.u_subcategory_2" name="incident.u_subcategory_2" /></label>
        <label>Subcategory 3<input id="incident.u_subcategory_3" name="incident.u_subcategory_3" /></label>
        <label>Assignment group<input id="incident.assignment_group" name="incident.assignment_group" /></label>
        <label>Assigned to<input id="incident.assigned_to" name="incident.assigned_to" /></label>
        <label>Impact<select id="incident.impact" name="incident.impact"><option></option><option>1 - High</option><option>2 - Medium</option><option>3 - Low</option></select></label>
        <label>Urgency<select id="incident.urgency" name="incident.urgency"><option></option><option>1 - High</option><option>2 - Medium</option><option>3 - Low</option></select></label>
        <label class="wide">Short description<input id="incident.short_description" name="incident.short_description" /></label>
        <label class="wide">Description<textarea id="incident.description" name="incident.description"></textarea></label>
        <label class="wide">Additional comments (Customer visible)<textarea id="incident.comments" name="incident.comments"></textarea></label>
        <label class="wide">Work notes<textarea id="incident.work_notes" name="incident.work_notes"></textarea></label>
        <label>Resolution code<select id="incident.close_code" name="incident.close_code"><option></option><option>Solved (Permanently)</option><option>Solved (Work Around)</option></select></label>
        <label class="wide">Resolution notes (Customer visible)<textarea id="incident.close_notes" name="incident.close_notes"></textarea></label>
      </form>
    </main>
  </body>
</html>`;

// Mirror the Next Experience page: the form iframe sits behind nested open
// shadow roots (shell → macroponent), so lookups must pierce both layers and
// cross a frame boundary, like on a real instance.
const stage = document.getElementById("stage")!;
const shellRoot = stage.attachShadow({ mode: "open" });
const macroponent = document.createElement("macroponent-form");
shellRoot.append(macroponent);
const componentRoot = macroponent.attachShadow({ mode: "open" });

const frame = document.createElement("iframe");
frame.id = "gsft_main";
frame.title = "Main content";
frame.style.display = "block";
frame.style.width = "100%";
frame.style.height = "100%";
frame.style.border = "0";
frame.srcdoc = FORM_DOC;
frame.addEventListener("load", () => {
  // The extension's content script does this in every child frame.
  if (frame.contentWindow) forwardPaletteHotkey(frame.contentWindow);
});

macroponent.style.display = "block";
macroponent.style.height = "100%";
componentRoot.append(frame);

const host = document.getElementById("root")!;
host.style.position = "fixed";
host.style.inset = "0";
host.style.zIndex = "2147483647";
host.style.pointerEvents = "none";
const shadow = host.attachShadow({ mode: "open" });
const style = document.createElement("style");
style.textContent = styles;
const app = document.createElement("div");
shadow.append(style, app);
createRoot(app).render(<TemplatePalette />);
