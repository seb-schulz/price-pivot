import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.min.css";
import "./index.css";

import * as React from "react";
import * as ReactDOM from "react-dom/client";
import App from "./app";

new EventSource("/esbuild").addEventListener("change", () => location.reload());

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
