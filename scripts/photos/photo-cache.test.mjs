import test from "node:test";
import assert from "node:assert/strict";
import { createServiceWorkerFixture } from "./ServiceWorkerFixture.mjs";

const request = { url: "https://example.test/player-photo/asetov.png", mode: "same-origin" };
test("missing optional player photos do not block service worker installation", async () => {
  const worker = createServiceWorkerFixture(); await worker.dispatch("install");
  assert.ok(worker.precached.includes("./src/state/PlayerPhotoRestoration.js"));
  assert.ok(worker.precached.every(path => !path.startsWith("./player-photo/")));
  assert.equal(new Set(worker.precached).size, worker.precached.length);
});
test("photo requests refresh old cached portraits and retain an offline fallback", async () => {
  const worker = createServiceWorkerFixture(); worker.stored.set(request.url, new Response("old-photo"));
  assert.equal(await (await worker.dispatch("fetch", request)).text(), "new-photo");
  assert.equal(worker.requests[0].options.cache, "no-cache");
  await new Promise(setImmediate);
  worker.setOffline(true);
  assert.equal(await (await worker.dispatch("fetch", request)).text(), "new-photo");
});
test("a missing photo never overwrites a valid cache entry with a 404 response", async () => {
  const worker = createServiceWorkerFixture(); worker.stored.set(request.url, new Response("old-photo"));
  worker.setStatus(404);
  assert.equal((await worker.dispatch("fetch", request)).status, 404);
  await new Promise(setImmediate);
  assert.equal(await worker.stored.get(request.url).text(), "old-photo");
});
