# Ultrafast

Read README.md before editing. Keep the loop small: page -> indexed elements -> operation + target -> execution.

Concepts (use these names consistently):

- **Jev**: TypeSafe's choice model. It only picks from offered options (an operation and its target); it never writes strings.
- **Ultrafast**: the browser agent in this repo (`jev-ultrafast`), built around Jev. Runs, steps, tasks and errors belong to Ultrafast; say "Jev" only for the choice itself.
- **Text helper**: the small LLM (OpenAI-compatible, or OpenAI with `USE_OPENAI`) that writes TYPE_TEXT values from the goal.
- **Secret**: a password supplied by code (`password` option or `JEV_PASSWORD`). Code types it into password fields; it never reaches Jev, the text helper, state, history, or logs.

- The input is one natural-language goal. Do not add site-specific plans or hardcoded field values.
- TypeSafe chooses an operation and operation-specific target heads in one request. Consume only the selected operation's target.
- Targets must map to observed elements and supported operations. Never let the model emit selectors or executable code.
- TYPE_TEXT invokes the text LLM, except on password fields, which get the secret. Cache a stale retry's value only while its entire helper input is identical.
- Never retry a browser mutation. Log execution before observing its result.
- Screenshots are optional; the model does not consume them.
- Keep credentials server-side and .env ignored. Tests must not call paid APIs.
- Verify actual final outcomes independently. A DONE choice is not proof of success.
- Keep examples, README claims, raw evidence, and model-call counts consistent.
- Do not commit or push unless the user requests it.

Checks: deno task check (deno fmt --check, deno lint, deno check src tests examples scripts src/snapshot.js src/static/app.js, deno test --allow-read, deno publish --dry-run --allow-dirty).
