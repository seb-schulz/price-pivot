import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import "./index.css";

import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./app";
import { SYNC_TAG } from "./currency";

interface SyncManager {
  getTags(): Promise<string[]>;
  register(tag: string): Promise<void>;
}

declare global {
  interface ServiceWorkerRegistration {
    readonly sync: SyncManager;
  }

  interface SyncEvent extends ExtendableEvent {
    readonly lastChance: boolean;
    readonly tag: string;
  }

  interface ServiceWorkerGlobalScopeEventMap {
    sync: SyncEvent;
  }
}

// @ts-ignore ts(2304)
if (ENV === "production" || WITH_SW === "1") {
  (async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("sw.js", {
          scope: "./",
        });

        registration.addEventListener("updatefound", () => {
          console.log("update found", registration.installing);
          registration.installing.addEventListener("statechange", (e) => {
            const sw = e.target as ServiceWorker;
            console.log("reload page", sw.state);
            if (sw.state == "activated") window.location.reload();
          });
        });

        setInterval(
          async () => {
            console.log("Run update");
            await registration.update();
          },
          60 * 60 * 1000
        );

        if ("SyncManager" in window) {
          await registration.sync.register(SYNC_TAG);
          console.log("register sync", SYNC_TAG);
        }
      } catch (error) {
        console.error(`Registration failed with ${error}`);
      }
    }
  })();
} else {
  console.log("Run without service worker");
  new EventSource("/esbuild").addEventListener("change", () =>
    location.reload()
  );

  (async () => {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!!registration) {
        registration.unregister();
      }
    }
  })();
}

function rootElement() {
  const element = document.createElement("div");
  element.id = "root";

  const root = ReactDOM.createRoot(element);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  return element;
}

document.body.appendChild(rootElement());
