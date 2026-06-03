const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const tests = require("./test-manifest.cjs");

function resolveEntry(entry) {
  if (entry.cmd === "node") return { command: process.execPath, args: entry.args };
  if (entry.cmd === "tsc") {
    return {
      command: process.execPath,
      args: [require.resolve("typescript/bin/tsc"), ...entry.args],
    };
  }

  const binName = process.platform === "win32" ? `${entry.cmd}.cmd` : entry.cmd;
  const localBin = path.join(process.cwd(), "node_modules", ".bin", binName);
  if (fs.existsSync(localBin)) return { command: localBin, args: entry.args };

  return { command: entry.cmd, args: entry.args };
}

function formatTest(entry) {
  return [entry.cmd, ...entry.args].join(" ");
}

for (const [index, entry] of tests.entries()) {
  const number = index + 1;
  console.log(`\n[${number}/${tests.length}] ${formatTest(entry)}`);
  const resolved = resolveEntry(entry);
  const result = spawnSync(resolved.command, resolved.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(`\nTest command failed to start: ${formatTest(entry)}`);
    console.error(result.error);
    process.exit(1);
  }
  if (result.signal) {
    console.error(`\nTest command stopped by signal ${result.signal}: ${formatTest(entry)}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`\nTest command failed with exit code ${result.status}: ${formatTest(entry)}`);
    process.exit(result.status ?? 1);
  }
}

console.log(`\nAll ${tests.length} test commands passed.`);
