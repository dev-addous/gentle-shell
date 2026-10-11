import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import * as bundled from "./scripts/bundled-install.mjs";
const base = mkdtempSync(join(tmpdir(), "diag-"));
const root = join(base, "a^b,c (d) !e %f% $x' ;", "gentle-shell");
const nodeDir = join(root, "runtime", "node-24.21.0");
const node = join(nodeDir, "node.exe");
const launcher = join(root, "bin", "gentle-shell.cmd");
const marker = join(root, ".gentle-shell-bundle");
mkdirSync(nodeDir, { recursive: true }); mkdirSync(dirname(launcher));
copyFileSync(process.execPath, node); writeFileSync(launcher, "@echo off\r\n"); writeFileSync(marker, "gentle-shell bundled install"); writeFileSync(join(root, "notes.txt"), "mine");
const running = spawn(node, ["-e", "setTimeout(() => {}, 5000)"], { stdio: "ignore", windowsHide: true });
await new Promise((r) => running.once("spawn", r));
for (const variant of ["piped", "real"]) {
  if (variant === "piped") {
    // Same call, but capture PowerShell's output instead of ignoring it.
    bundled.scheduleWindowsRemoval({ pid: running.pid, files: [join(base, "nothing.txt")], directories: [], last: undefined, env: process.env,
      spawn: (cmd, args, opts) => { console.log("CMD", cmd, JSON.stringify(args.slice(0, 4)), "len", args.at(-1).length);
        const c = spawn(cmd, args, { ...opts, detached: false, stdio: ["ignore", "pipe", "pipe"] });
        c.stdout.on("data", (d) => process.stdout.write("PS-OUT " + d)); c.stderr.on("data", (d) => process.stdout.write("PS-ERR " + d));
        c.on("exit", (code) => console.log("PS-EXIT", code)); c.on("error", (e) => console.log("PS-SPAWN-ERROR", e.message)); return { unref() {} }; } });
  } else {
    bundled.scheduleWindowsRemoval({ pid: running.pid, files: [node, launcher], directories: [nodeDir, join(root, "runtime"), join(root, "bin"), root], last: marker, env: process.env });
  }
}
const deadline = Date.now() + 60000;
while (existsSync(node) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 1000));
console.log("AFTER", JSON.stringify(readdirSync(root)), "node exists", existsSync(node));
