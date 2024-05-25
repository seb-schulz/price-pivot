#!/usr/bin/env node

import * as esbuild from "esbuild";
import { execSync } from "child_process";
import http from "node:http";
import fs from "node:fs";

function clearPlugin(path) {
  return {
    name: "Clear",
    setup: (build) => {
      build.onStart(() => {
        if (fs.existsSync(path)) {
          fs.rmSync(path, { recursive: true });
        }
      });
    },
  };
}

function sheBang() {
  return {
    name: "Insert SheBash",
    setup: (build) => {
      build.onEnd((result) => {
        if (result.errors.length === 0) {
          const outputs = result.metafile.outputs;

          for (const file in outputs) {
            if (outputs[file].entryPoint) {
              const originalContent = fs.readFileSync(file, "utf8");
              const newContent = `#!/usr/bin/env node\n${originalContent}`;
              fs.writeFileSync(file, newContent, "utf8");
            }
          }
        }
      });
    },
  };
}

const args = process.argv.slice(2); // Skip the first two elements
const watchMode = args.includes("-w") || args.includes("--watch");
const serveMode = args.includes("-s") || args.includes("--serve");

const git_hash = execSync("git describe --abbrev --dirty --always")
  .toString()
  .trim();

const contextOpts = {
  define: {
    ENV: serveMode || watchMode ? '"development"' : '"production"',
    GIT_HASH: `"${git_hash}"`,
  },
  bundle: true,
  minify: !!args.includes("--minify"),
  format: "esm",
};

const web_ctx = await esbuild.context({
  ...contextOpts,
  entryPoints: [
    "src/index.html",
    "src/index.tsx",
    "src/manifest.json",
    "src/favicon.ico",
    "src/favicon.svg",
  ],
  outdir: "dist/browser",
  platform: "browser",
  publicPath: "/",
  loader: {
    ".html": "copy",
    ".json": "copy",
    ".ico": "copy",
    ".svg": "copy",
    ".woff2": "copy",
    ".woff": "copy",
  },
  plugins: [clearPlugin("dist/browser")],
});

const node_ctx = await esbuild.context({
  ...contextOpts,
  entryPoints: ["src/fetch-data.ts"],
  outdir: "dist/node",
  platform: "node",
  target: "node18",
  metafile: true,
  plugins: [clearPlugin("dist/node"), sheBang()],
});

if (serveMode && watchMode) {
  console.log("serve mode and watch mode are mutually exclusive");
  await web_ctx.dispose();
  await node_ctx.dispose();
} else if (watchMode) {
  await web_ctx.watch();
  await node_ctx.watch();
  console.log("watching...");
} else if (serveMode) {
  await web_ctx.watch();
  await node_ctx.watch();
  const { host, port } = await web_ctx.serve();

  let count = 0;
  http
    .createServer((req, res) => {
      if (req.url === "/data.json") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            time: `2024-05-20-#${count}`,
            data: {
              EUR: 1,
              USD: 1.0861,
              DKK: 7.4611,
              GBP: 0.85548,
              SEK: 11.6127,
              CHF: 0.988,
              CAD: 1.4798,
            },
          })
        );
        count++;
        return;
      }

      const options = {
        hostname: host,
        port: port,
        path: req.url,
        method: req.method,
        headers: req.headers,
      };

      // Forward each incoming request to esbuild
      const proxyReq = http.request(options, (proxyRes) => {
        // If esbuild returns "not found", send a custom 404 page
        if (proxyRes.statusCode === 404) {
          res.writeHead(404, { "Content-Type": "text/html" });
          res.end("<h1>A 404 page</h1>");
          return;
        }

        // Otherwise, forward the response from esbuild to the client
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });

      // Forward the body of the request to esbuild
      req.pipe(proxyReq, { end: true });
    })
    .listen(3000);

  console.log(`serve page under ${host}:3000`);
} else {
  await web_ctx.rebuild();
  await node_ctx.rebuild();
  await web_ctx.dispose();
  await node_ctx.dispose();
}
