import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import * as bundled from "./scripts/bundled-install.mjs";
function fixture(name) {
  const base = mkdtempSync(join(tmpdir(), `diag-${name}-`));
  const root = join(base, "gentle-shell");
  const nodeDir = join(root, "runtime", "node-24.21.0");
  const node = join(nodeDir, "node.exe");
  const launcher = join(root, "bin", "gentle-shell.cmd");
  const marker = join(root, ".gentle-shell-bundle");
  mkdirSync(nodeDir, { recursive: true }); mkdirSync(dirname(launcher));
  copyFileSync(process.execPath, node); writeFileSync(launcher, "@echo off\r\n"); writeFileSync(marker, "x");
  return { base, root, node, launcher, marker, nodeDir };
}
const running = spawn(process.execPath, ["-e", "setTimeout(() => {}, 5000)"], { stdio: "ignore", windowsHide: true });
await new Promise((r) => running.once("spawn", r));
const variants = {
  A_detached_log: (f) => (cmd, args, opts) => { const log = openSync(join(f.base, "ps.log"), "w"); const c = spawn(cmd, args, { ...opts, stdio: ["ignore", log, log] }); c.unref(); return c; },
  B_attached_unref: () => (cmd, args, opts) => { const c = spawn(cmd, args, { ...opts, detached: false }); c.unref(); return c; },
  C_cmd_start: (f) => (cmd, args, opts) => { const c = spawn(join(process.env.SystemRoot, "System32", "cmd.exe"), ["/d", "/c", "start", "\"\"", "/b", cmd, ...args], { ...opts, detached: false, windowsVerbatimArguments: false }); c.unref(); return c; },
  D_current: () => undefined,
};
const fx = {};
for (const [name, make] of Object.entries(variants)) {
  const f = fixture(name); fx[name] = f;
  const s = make(f);
  bundled.scheduleWindowsRemoval({ pid: running.pid, files: [f.node, f.launcher], directories: [f.nodeDir, join(f.root, "runtime"), join(f.root, "bin"), f.root], last: f.marker, env: process.env, ...(s ? { spawn: s } : {}) });
}
const deadline = Date.now() + 45000;
while (Object.values(fx).some((f) => existsSync(f.node)) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 1000));
for (const [name, f] of Object.entries(fx)) {
  console.log("RESULT", name, existsSync(f.root) ? JSON.stringify(readdirSync(f.root)) : "root-removed");
  if (existsSync(join(f.base, "ps.log"))) console.log("LOG", name, JSON.stringify(readFileSync(join(f.base, "ps.log"), "utf8").slice(0, 1500)));
}
