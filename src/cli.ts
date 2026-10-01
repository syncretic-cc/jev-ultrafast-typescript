/**
 * Ultrafast from the command line, for use from any repo:
 *
 *   deno run -A jsr:@syncretic/jev-ultrafast/cli --url URL --goal 'A narrow goal'
 *
 * Reads keys from ./.env (existing variables win). Exits 0 when the run is done, 1 when it is blocked or fails.
 */

import { parseArgs } from "@std/cli/parse-args";
import { Agent } from "./agent.ts";
import { loadEnvironment } from "./env.ts";
import { UltrafastError } from "./errors.ts";
import type { AgentSnapshot } from "./types.ts";

const USAGE = "usage: ultrafast [-h] --url URL --goal GOAL [--goal GOAL ...] [--json]";

const HELP = `${USAGE}

Run the Ultrafast browser agent once against a page.

options:
  --url URL    Page to open in the connected Chrome.
  --goal GOAL  Natural-language goal. Repeat for an ordered list of goals.
  --json       Print the final run as JSON instead of one line per step.

environment (also read from ./.env):
  TYPESAFE_API_KEY   Required. Jev chooses every action.
  OPENAI_API_KEY     Required for typing text (USE_OPENAI=false switches to TEXT_MODEL_*).
  JEV_PASSWORD       Optional. Typed into password fields; keep it out of the goal.
  ULTRAFAST_CDP_URL  Optional. Chrome debug endpoint, e.g. http://127.0.0.1:9223.`;

/** Parse arguments, run the agent, and return the process exit code. */
export async function main(argv: readonly string[]): Promise<number> {
  let unknown: string | null = null;
  const args = parseArgs([...argv], {
    string: ["url", "goal"],
    collect: ["goal"],
    boolean: ["help", "json"],
    alias: { h: "help" },
    unknown: (arg) => {
      unknown ??= arg;
      return false;
    },
  });
  if (args.help) {
    console.log(HELP);
    return 0;
  }
  if (unknown) {
    console.error(`${USAGE}\nultrafast: error: unrecognized arguments: ${unknown}`);
    return 2;
  }
  const missing = [!args.url && "--url", !args.goal.length && "--goal"].filter(Boolean);
  if (missing.length) {
    console.error(`${USAGE}\nultrafast: error: the following arguments are required: ${missing.join(", ")}`);
    return 2;
  }
  loadEnvironment();
  let state: AgentSnapshot | null = null;
  try {
    await using agent = await Agent.create(args.url!, args.goal);
    state = agent.snapshot();
    for await (state of agent.run()) {
      const step = state.history.at(-1);
      if (!args.json && step) {
        const text = step.text === null ? "" : ` "${step.text}"`;
        console.log(`${String(state.elapsed_ms).padStart(6)} ms  ${step.operation} ${step.action}${text}`);
      }
    }
  } catch (error) {
    if (!(error instanceof UltrafastError)) throw error;
    console.error(`ultrafast: error: ${error.message}`);
    if (!state) return 1;
  }
  const result = {
    status: state!.status,
    url: state!.page.url,
    elapsed_ms: state!.elapsed_ms,
    steps: state!.history.map((h) => ({ operation: h.operation, action: h.action, text: h.text })),
  };
  console.log(args.json ? JSON.stringify(result, null, 2) : `${result.status} at ${result.url}`);
  return result.status === "done" ? 0 : 1;
}

if (import.meta.main) Deno.exit(await main(Deno.args));
