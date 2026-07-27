export default defineBackground(() => {
  if (!import.meta.env.DEV) return;

  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === "install") {
      void browser.runtime.openOptionsPage();
    }
  });
});
