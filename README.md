# Ultrafast

A TypeScript/Deno port of the original jev-ultrafast, maintained by Syncretic.

Ultrafast is a browser agent that takes one natural-language goal and works through a real page until the goal is met or it's stuck. We use it to drive our own apps from scripts, tests and coding agents without writing selectors.

## How it works

Each step runs the same loop:

1. **Observe.** One browser call reads the visible controls (buttons, links, fields, dropdowns) into a numbered element table, along with the visible page text.
2. **Choose.** One request to [TypeSafe's Jev](https://docs.typesafe.ai/introduction) picks an operation (`CLICK`, `TYPE_TEXT`, `SELECT`, `SCROLL_UP`, `SCROLL_DOWN`, `WAIT`, `DONE` or `BLOCKED`) and its target from that table.
3. **Write text, if needed.** For `TYPE_TEXT`, a small text model writes the value from the goal. Password fields get a password supplied by code instead.
4. **Execute.** Code checks that the page hasn't changed, then clicks or types on the chosen element. The model never produces selectors, coordinates or code.

The run ends when Jev chooses `DONE` or `BLOCKED`, or after three actions in a row that change nothing.

**Terms used in this repo**

- **Jev**: TypeSafe's choice model. It only picks from the offered options and never writes strings.
- **Ultrafast**: the agent in this repo. Runs, steps and errors belong to Ultrafast, not Jev.
- **Text helper**: the small model that writes `TYPE_TEXT` values (OpenAI `gpt-6-luna` by default).
- **Secret**: a password supplied by code, typed directly and never sent to any model.

## Setup

Requires Deno 2.9+ and Chrome.

```bash
git clone https://github.com/syncretic-cc/jev-ultrafast-typescript.git
cd jev-ultrafast-typescript
cp .env.example .env   # add TYPESAFE_API_KEY and OPENAI_API_KEY
deno task demo:chrome
```

`deno task demo:chrome` starts a separate Chrome with remote debugging (port 9223, its own profile under `artifacts/`), runs the local inspector, and opens it at http://127.0.0.1:8766. The inspector shows the element table, Jev's probabilities and each executed action.

## Run a goal

From this repo:

```bash
ULTRAFAST_CDP_URL=http://127.0.0.1:9223 deno task example --url http://localhost:3100 --goal "Open the settings page"
```

From another repo, add a pinned script that runs the published CLI:

```json
"scripts": {
  "browse": "deno run -A jsr:@syncretic/jev-ultrafast@0.2/cli"
}
```

```bash
ULTRAFAST_CDP_URL=http://127.0.0.1:9223 npm run browse -- --url http://localhost:3100 --goal "Sign in with email testing@example.com and the configured password"
```

The CLI reads `./.env`, prints one line per step, and exits 0 when the run is done or 1 when it's blocked. `--json` prints the whole run as JSON. Start the debug Chrome first; on macOS:

```bash
open -na "Google Chrome" --args --remote-debugging-port=9223 --user-data-dir="$HOME/.ultrafast-chrome"
```

As a library:

```ts
import { Agent } from "jsr:@syncretic/jev-ultrafast@0.2";

await using agent = await Agent.create("http://localhost:3100", "Open the settings page");
for await (const state of agent.run()) console.log(state.status, state.history.at(-1)?.action);
```

## Configuration

Set these in `.env`. Variables already set in the environment take precedence.

| Variable | Purpose |
| --- | --- |
| `TYPESAFE_API_KEY` | Required. Jev's choices. |
| `OPENAI_API_KEY` | Required for typing text. |
| `OPENAI_MODEL`, `OPENAI_REASONING_EFFORT` | Optional. Default `gpt-6-luna` and `none`. |
| `USE_OPENAI=false` | Use an OpenAI-compatible endpoint instead, set by `TEXT_MODEL_API_KEY`, `TEXT_MODEL_BASE_URL`, `TEXT_MODEL` and `TEXT_MODEL_REASONING`. |
| `JEV_PASSWORD` | Optional. Password for password fields. Keep it out of the goal. |
| `ULTRAFAST_CDP_URL` / `ULTRAFAST_CDP_WS` | Optional. Which Chrome to connect to. Without them, Ultrafast looks for a Chrome with remote debugging enabled. |

Password fields are hidden unless `JEV_PASSWORD` or the `password` Agent option is set. When one is set, the field is shown with a masked value and code types the password; history and the inspector show `••••••••`.

## Development

```bash
deno task check
```

This runs formatting, lint, type checks, the offline tests (no credentials, no paid calls) and a publish dry run. `deno task demo`, `example`, `flights` and `smoke` call the paid model APIs.

## License

MIT. See [LICENSE](LICENSE), which keeps the original copyright notice as the license requires.
