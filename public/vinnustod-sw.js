// Þjónustuforrit Vinnustöðvar Fjarlækninga — AÐEINS tilkynningar í tæki.
// Engin fetch-meðhöndlun og ekkert skyndiminni: síðurnar hegða sér nákvæmlega
// eins og án þess. Sjá src/lib/vinnustod/live.ts.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || "Ný skilaboð — Fjarlækningar";
  event.waitUntil((async () => {
    // Opnar síður fá líka tafarlaust merki; láta þær vita svo þær uppfærist.
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of windows) w.postMessage({ type: "vs-new-message" });
    await self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || "vs-message",
      renotify: true,
      icon: "/fjarlaekningar-mark-512.png",
      badge: "/fjarlaekningar-mark-512.png",
      data: { url: data.url || "/vinnustod" },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/vinnustod", self.location.origin);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    // Síða sem er þegar opin á sömu slóð fær fókus í stað þess að opna nýja.
    for (const w of windows) {
      const u = new URL(w.url);
      if (u.origin === url.origin && u.pathname === url.pathname) {
        await w.focus();
        return;
      }
    }
    await self.clients.openWindow(url.href);
  })());
});
