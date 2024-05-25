#!/usr/bin/env node

import * as esbuild from "esbuild";
import { execSync } from "child_process";
import http from "node:http";

import fs from "fs";

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

const args = process.argv.slice(2); // Skip the first two elements
const watchMode = args.includes("-w") || args.includes("--watch");
const serveMode = args.includes("-s") || args.includes("--serve");

const git_hash = execSync("git describe --abbrev --dirty --always")
  .toString()
  .trim();

let ctx = await esbuild.context({
  entryPoints: [
    "src/index.html",
    "src/index.tsx",
    "src/manifest.json",
    "src/favicon.ico",
    "src/favicon.svg",
  ],
  define: {
    ENV: serveMode || watchMode ? '"development"' : '"production"',
    GIT_HASH: `"${git_hash}"`,
  },
  bundle: true,
  platform: "browser",
  outdir: "dist",
  minify: !!args.includes("--minify"),
  format: "esm",
  publicPath: "/",
  loader: {
    ".html": "copy",
    ".json": "copy",
    ".ico": "copy",
    ".svg": "copy",
    ".woff2": "copy",
    ".woff": "copy",
  },
  plugins: [clearPlugin("dist")],
});

if (serveMode && watchMode) {
  console.log("serve mode and watch mode are mutually exclusive");
  await ctx.dispose();
} else if (watchMode) {
  await ctx.watch();
  console.log("watching...");
} else if (serveMode) {
  await ctx.watch();
  const { host, port } = await ctx.serve();

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
  await ctx.rebuild();
  await ctx.dispose();
}
