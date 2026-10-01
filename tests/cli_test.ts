// Offline contracts for the command line: arguments are validated before any browser or model call.
import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import { main } from "../src/cli.ts";

function quiet<T>(fn: () => Promise<T>): Promise<T> {
  using _log = stub(console, "log");
  using _error = stub(console, "error");
  return fn();
}

Deno.test("--help exits 0", async () => {
  assertEquals(await quiet(() => main(["--help"])), 0);
});

Deno.test("missing --url or --goal exits 2 before opening a browser", async () => {
  assertEquals(await quiet(() => main([])), 2);
  assertEquals(await quiet(() => main(["--url", "http://localhost:3100"])), 2);
  assertEquals(await quiet(() => main(["--goal", "Sign in"])), 2);
});

Deno.test("unknown flags exit 2", async () => {
  assertEquals(await quiet(() => main(["--url", "u", "--goal", "g", "--headless"])), 2);
});
