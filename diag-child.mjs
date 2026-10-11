// The scheduler process: schedules removal of its own node.exe copy's files, then exits at once.
import { spawn } from "node:child_process";
import { join } from "node:path";
import * as bundled from "./scripts/bundled-install.mjs";
const [variant, root] = process.argv.slice(2);
const node = join(root, "runtime", "node-24.21.0", "node.exe");
const s = variant === "B" ? (cmd, args, opts) => { const c = spawn(cmd, args, { ...opts, detached: false }); c.unref(); return c; }
  : (cmd, args, opts) => { const c = spawn(join(process.env.SystemRoot, "System32", "cmd.exe"), ["/d", "/c", "start", "\"\"", "/b", cmd, ...args], { ...opts, detached: false }); c.unref(); return c; };
bundled.scheduleWindowsRemoval({ pid: process.pid, files: [node, join(root, "bin", "gentle-shell.cmd")], directories: [join(root, "runtime", "node-24.21.0"), join(root, "runtime"), join(root, "bin"), root], last: join(root, ".gentle-shell-bundle"), env: process.env, spawn: s });
console.log("scheduled", variant, "exiting");
process.exit(0);
