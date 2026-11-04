import fs from "node:fs";
import vm from "node:vm";

export const createServiceWorkerFixture = () => {
  const handlers = new Map(), stored = new Map(), requests = [], precached = [];
  let offline = false, status = 200;
  const cache = { addAll: async paths => precached.push(...paths), put: async (request, response) => stored.set(request.url, response) };
  const context = { URL, self: { addEventListener: (name, handler) => handlers.set(name, handler), skipWaiting() {} },
    caches: { open: async () => cache, match: async request => stored.get(request.url) },
    fetch: async (request, options) => {
      requests.push({ request, options });
      if (offline) throw new Error("OFFLINE");
      return new Response("new-photo", { status });
    } };
  vm.runInNewContext(fs.readFileSync(new URL("../../sw.js", import.meta.url), "utf8"), context);
  const dispatch = (name, request) => {
    let pending;
    handlers.get(name)({ request, waitUntil: promise => { pending = promise; }, respondWith: promise => { pending = promise; } });
    return pending;
  };
  return { stored, requests, precached, dispatch, setOffline: value => { offline = value; }, setStatus: value => { status = value; } };
};
