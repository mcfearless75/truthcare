#!/usr/bin/env node
/**
 * Cross-platform launcher for the claude-flow (ruflo) MCP server.
 *
 * Why this file exists rather than calling npx straight from .mcp.json:
 * neither obvious one-liner survives both of the ways an MCP client can spawn
 * a server process. Measured on Windows 11 / Node 24:
 *
 *   "command": "npx"                  -> ENOENT without a shell (npx is a .cmd
 *                                        shim, and Node blocks .cmd execution
 *                                        without shell:true), works with one.
 *   "command": "node", "-e" <script>  -> works without a shell, but breaks with
 *                                        one, because shell:true concatenates
 *                                        args unescaped and mangles the script.
 *
 * "node scripts/mcp-claude-flow.mjs" survives both: node is a real executable
 * on every platform (so it needs no shell), and the argument is a plain path
 * with nothing for a shell to mangle. The shell requirement then moves in here,
 * where it is ours to control.
 *
 * The command is passed as ONE string with shell:true deliberately — that form
 * resolves npx via cmd.exe on Windows and /bin/sh elsewhere, and avoids Node's
 * DEP0190 warning that fires when an args array is combined with shell:true.
 * Nothing here is interpolated from user input, so there is no injection risk.
 *
 * stdio is inherited, so the client speaks JSON-RPC to ruflo directly and this
 * process adds no framing of its own. Keep it that way: anything written to
 * stdout here would corrupt the protocol stream.
 */
import { spawn } from "node:child_process";

const child = spawn("npx -y ruflo@latest mcp start", {
  shell: true,
  stdio: "inherit",
});

child.on("error", (err) => {
  // stderr, never stdout — stdout is the protocol channel.
  console.error("[mcp-claude-flow] failed to start:", err.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});

// Forward termination so the client killing us does not orphan ruflo.
for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig);
  });
}
