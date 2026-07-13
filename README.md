# IT Ticket Templates

A Manifest V3 Chrome extension built with WXT and React. On supported ServiceNow pages, press **Ctrl + Space** to open an in-page template palette. Search by typing, navigate with the arrow keys, and press **Enter** to apply a template.

Child templates inherit every field from their parent and override only the fields they define. Seed templates live in `lib/templates.ts`.

## Development

```powershell
npm install
npm run dev
```

WXT launches Chrome and opens the saved `new_incident_page.html` fixture. Chrome requires **Allow access to file URLs** for the unpacked development extension before it can inject into a `file://` page. The extension also matches live `*.service-now.com` pages.

For an automation-friendly verification page with representative incident fields, run `npx vite --host 127.0.0.1 --port 4173` and open `http://127.0.0.1:4173/dev/preview.html`. It renders the same palette and field adapter used by the extension.

Useful checks:

```powershell
npm run compile
npm run build
```

The extension has no browser-action popup and requests no data/storage permissions. Its only UI is the isolated in-page palette.
