import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
const roots = {};
for (const v of ["B", "C"]) {
  const root = join(mkdtempSync(join(tmpdir(), `diag2-${v}-`)), "gentle-shell");
  const nodeDir = join(root, "runtime", "node-24.21.0");
  mkdirSync(nodeDir, { recursive: true }); mkdirSync(join(root, "bin"));
  copyFileSync(process.execPath, join(nodeDir, "node.exe")); writeFileSync(join(root, "bin", "gentle-shell.cmd"), "@echo off\r\n"); writeFileSync(join(root, ".gentle-shell-bundle"), "x");
  // Run the scheduler with the copied node.exe (the file to delete), like a real self-uninstall.
  const r = spawnSync(join(nodeDir, "node.exe"), [join(process.cwd(), "diag-child.mjs"), v, root], { encoding: "utf8" });
  console.log("CHILD", v, r.status, r.stdout.trim(), r.stderr.trim().slice(0, 300));
  roots[v] = root;
}
const deadline = Date.now() + 40000;
while (Object.values(roots).some((r) => existsSync(r)) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 1000));
for (const [v, r] of Object.entries(roots)) console.log("RESULT", v, existsSync(r) ? JSON.stringify(readdirSync(r)) : "root-removed");
