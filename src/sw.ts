/// <reference lib="WebWorker" />

import { SYNC_TAG } from "./currency";

// export empty type because of tsc --isolatedModules flag
export type {};
declare const self: ServiceWorkerGlobalScope;

// @ts-expect-error ts(2552)
const git_hash: string = GIT_HASH;

// Following implementation based on
// https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
// with modification to the current use case.

const CACHE_VERSION = `v2-${git_hash}`;

const deleteOldCaches = async () => {
  const cacheKeepList = [CACHE_VERSION];
  const keyList = await caches.keys();
  const cachesToDelete = keyList.filter((key) => !cacheKeepList.includes(key));
  await Promise.all(
    cachesToDelete.map(async (key: string) => {
      await caches.delete(key);
    })
  );
};

const addResourcesToCache = async (resources) => {
  const cache = await caches.open(CACHE_VERSION);
  await cache.addAll(resources);
};

const putInCache = async (request, response) => {
  const cache = await caches.open(CACHE_VERSION);
  await cache.put(request, response);
};

const cacheFirst = async ({ request }) => {
  const responseFromCache = await caches.match(request);
  if (responseFromCache) {
    return responseFromCache;
  }

  try {
    const responseFromNetwork = await fetch(request.clone());

    putInCache(request, responseFromNetwork.clone());
    return responseFromNetwork;
  } catch (error) {
    return new Response("Network error happened", {
      status: 408,
      headers: { "Content-Type": "text/plain" },
    });
  }
};

self.addEventListener("install", (event: ExtendableEvent) => {
  // When you want skip second reload
  self.skipWaiting();

  event.waitUntil(
    addResourcesToCache([
      "/",
      "/favicon.ico",
      "/favicon.svg",
      "/index.css",
      "/index.html",
      "/index.js",
      "/data.json",
    ])
  );
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(deleteOldCaches());
});

self.addEventListener("fetch", (event: FetchEvent) => {
  event.respondWith(
    cacheFirst({
      request: event.request,
    })
  );
});

self.addEventListener("sync", function (event) {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(addResourcesToCache(["/data.json"]));
  }
});
