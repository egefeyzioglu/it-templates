import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "IT Ticket Templates",
    description:
      "Search and apply inherited templates to ServiceNow IT trouble tickets.",
    permissions: ["storage"],
    host_permissions: ["*://*.service-now.com/*", "file:///*"],
    browser_specific_settings: {
      gecko: {
        id: "it-templates@begaydocrime.org",
        data_collection_permissions: {
          required: ["none"]
        }
      }
    }
  },
  webExt: {
    startUrls: [pathToFileURL(resolve("new_incident_page.html")).href],
  },
});
