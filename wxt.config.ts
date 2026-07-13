import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'IT Ticket Templates',
    description: 'Search and apply inherited templates to ServiceNow IT trouble tickets.',
    permissions: [],
    host_permissions: ['*://*.service-now.com/*', 'file:///*'],
  },
  webExt: {
    startUrls: [pathToFileURL(resolve('new_incident_page.html')).href],
  },
});
