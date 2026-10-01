/**
 * Launch a dedicated automation Chrome with remote debugging, run the demo against it, and open the inspector.
 *
 * Uses its own profile under artifacts/, so it never touches your everyday Chrome profile.
 * Usage: deno task demo:chrome [--port 9223]
 */

import { parseArgs } from "@std/cli/parse-args";
import { join, resolve } from "@std/path";

const CANDIDATES: Partial<Record<typeof Deno.build.os, string[]>> = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ],
  linux: ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"],
  windows: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ],
};

function findChrome(): string {
  const override = Deno.env.get("CHROME_PATH");
  if (override) return override;
  for (const path of CANDIDATES[Deno.build.os] ?? []) {
    try {
      if (Deno.statSync(path).isFile) return path;
    } catch {
      // Not installed here; try the next location.
    }
  }
  throw new Error("Chrome not found; set CHROME_PATH to the Chrome executable.");
}

async function main(): Promise<void> {
  const args = parseArgs(Deno.args, { string: ["port"], default: { port: "9223" } });
  const port = Number(args.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`demo_chrome.ts: error: invalid --port '${args.port}'`);
    Deno.exit(2);
  }
  const url = `http://127.0.0.1:${port}`;
  const profile = resolve(join("artifacts", "chrome-profile"));
  await Deno.mkdir(profile, { recursive: true });

  if (!(await listening(url))) {
    const chrome = new Deno.Command(findChrome(), {
      args: [
        `--remote-debugging-port=${port}`,
        `--user-data-dir=${profile}`,
        "--no-first-run",
        "--no-default-browser-check",
        "about:blank",
      ],
      stdin: "null",
      stdout: "null",
      stderr: "null",
    }).spawn();
    chrome.unref();
    const deadline = performance.now() + 15_000;
    while (!(await listening(url))) {
      if (performance.now() > deadline) {
        console.error(`demo_chrome.ts: error: Chrome did not answer on ${url} within 15s`);
        Deno.exit(1);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  console.log(`Automation Chrome on ${url}`);

  const demo = new Deno.Command(Deno.execPath(), { args: ["task", "demo"], env: { BU_CDP_URL: url } }).spawn();
  // Open the inspector in the automation Chrome once the demo server answers.
  const demoUrl = `http://127.0.0.1:${Deno.env.get("TYPESAFE_DEMO_PORT") || "8766"}/`;
  const deadline = performance.now() + 15_000;
  while (performance.now() < deadline && !(await answers(demoUrl))) await new Promise((r) => setTimeout(r, 250));
  const tab = await fetch(`${url}/json/new?${demoUrl}`, { method: "PUT" });
  await tab.body?.cancel();
  Deno.exit((await demo.status).code);
}

const listening = (url: string): Promise<boolean> => answers(`${url}/json/version`);

async function answers(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    await response.body?.cancel();
    return response.ok;
  } catch {
    return false;
  }
}

if (import.meta.main) await main();
