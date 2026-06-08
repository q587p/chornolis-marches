#!/usr/bin/env node

const { spawn } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");
const manifest = require("./test-manifest.cjs");
const tests = Array.isArray(manifest) ? manifest : manifest.tests;

const repoRoot = path.resolve(__dirname, "..", "..");
const MAX_TEST_JOBS = 8;

function resolveEntry(entry) {
  if (typeof entry === "string") {
    return {
      cmd: process.execPath,
      args: [entry],
    };
  }
  if (!entry || typeof entry !== "object" || !entry.cmd) {
    throw new Error(`Invalid test manifest entry: ${JSON.stringify(entry)}`);
  }
  const cmd = entry.cmd === "node" ? process.execPath : entry.cmd;
  const args = Array.isArray(entry.args) ? entry.args : [];
  return { cmd, args };
}

function formatTest(entry) {
  if (typeof entry === "string") {
    return `node ${entry}`;
  }
  const args = Array.isArray(entry.args) ? entry.args.join(" ") : "";
  return `${entry.cmd}${args ? ` ${args}` : ""}`;
}

function quoteWindowsShellArg(value) {
  const stringValue = String(value);
  if (/^[A-Za-z0-9_./:\\-]+$/.test(stringValue)) return stringValue;
  return `"${stringValue.replace(/"/g, '\\"')}"`;
}

function resolveSpawnSpec(cmd, args) {
  if (process.platform !== "win32" || cmd === process.execPath) {
    return { args, cmd };
  }

  return {
    args: [
      "/d",
      "/s",
      "/c",
      [cmd, ...args].map(quoteWindowsShellArg).join(" "),
    ],
    cmd: process.env.ComSpec || "cmd.exe",
  };
}

function parseTestJobs(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(MAX_TEST_JOBS, parsed);
}

function elapsedMsSince(startedAt) {
  return Number(process.hrtime.bigint() - startedAt) / 1_000_000;
}

function formatDuration(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatFailure(result) {
  if (result.error) {
    return `failed to start: ${result.error.message}`;
  }
  if (result.signal) {
    return `terminated by signal ${result.signal}`;
  }
  return `exited with code ${result.code}`;
}

function writeBufferedOutput(result) {
  if (result.stdout.length > 0) {
    process.stdout.write(Buffer.concat(result.stdout));
  }
  if (result.stderr.length > 0) {
    process.stderr.write(Buffer.concat(result.stderr));
  }
}

function runTest(entry, index, total, options) {
  const resolved = resolveEntry(entry);
  const spawnSpec = resolveSpawnSpec(resolved.cmd, resolved.args);
  const display = formatTest(entry);
  const startedAt = process.hrtime.bigint();
  const stdio = options.bufferOutput ? ["ignore", "pipe", "pipe"] : "inherit";

  console.log(`[${index + 1}/${total}] ${display}`);

  return new Promise((resolve) => {
    const result = {
      args: resolved.args,
      cmd: resolved.cmd,
      code: null,
      display,
      durationMs: 0,
      error: null,
      index,
      signal: null,
      stderr: [],
      stdout: [],
    };

    let child;
    try {
      child = spawn(spawnSpec.cmd, spawnSpec.args, {
        cwd: repoRoot,
        env: options.env,
        stdio,
      });
    } catch (error) {
      result.error = error;
      result.durationMs = elapsedMsSince(startedAt);
      resolve(result);
      return;
    }

    if (options.bufferOutput) {
      child.stdout.on("data", (chunk) => result.stdout.push(chunk));
      child.stderr.on("data", (chunk) => result.stderr.push(chunk));
    }

    child.on("error", (error) => {
      result.error = error;
    });

    child.on("close", (code, signal) => {
      result.code = code;
      result.signal = signal;
      result.durationMs = elapsedMsSince(startedAt);
      resolve(result);
    });
  });
}

function printResult(result, total) {
  if (result.error || result.code !== 0 || result.signal) {
    console.error(
      `[${result.index + 1}/${total}] failed in ${formatDuration(
        result.durationMs,
      )}: ${formatFailure(result)}`,
    );
    console.error(`Command: ${result.display}`);
    return;
  }

  console.log(
    `[${result.index + 1}/${total}] passed in ${formatDuration(
      result.durationMs,
    )}`,
  );
}

function printSuccessSummary(results, totalDurationMs, testJobs) {
  const slowest = [...results]
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, 10);

  console.log("");
  console.log(
    `All ${results.length} test commands passed in ${formatDuration(
      totalDurationMs,
    )} with TEST_JOBS=${testJobs}.`,
  );
  console.log("Slowest test commands:");
  slowest.forEach((result, index) => {
    console.log(
      `${index + 1}. ${formatDuration(result.durationMs)} - ${result.display}`,
    );
  });
}

async function runSerial(env) {
  const results = [];
  for (let index = 0; index < tests.length; index += 1) {
    const entry = tests[index];
    const result = await runTest(entry, index, tests.length, {
      bufferOutput: false,
      env,
    });
    results.push(result);
    printResult(result, tests.length);
    if (result.error || result.code !== 0 || result.signal) {
      return { failed: result, results };
    }
  }
  return { failed: null, results };
}

async function runParallel(testJobs, env) {
  const results = new Array(tests.length);
  const running = new Set();
  let failed = null;
  let nextIndex = 0;

  async function startNext() {
    if (failed || nextIndex >= tests.length) return;

    const index = nextIndex;
    nextIndex += 1;

    const promise = runTest(tests[index], index, tests.length, {
      bufferOutput: true,
      env,
    }).then((result) => {
      running.delete(promise);
      results[index] = result;
      writeBufferedOutput(result);
      printResult(result, tests.length);
      if (!failed && (result.error || result.code !== 0 || result.signal)) {
        failed = result;
      }
    });

    running.add(promise);
  }

  for (let count = 0; count < testJobs && count < tests.length; count += 1) {
    await startNext();
  }

  while (running.size > 0) {
    await Promise.race(running);
    while (!failed && running.size < testJobs && nextIndex < tests.length) {
      await startNext();
    }
  }

  return { failed, results: results.filter(Boolean) };
}

async function main() {
  for (const entry of tests) {
    if (typeof entry === "string" && !existsSync(path.join(repoRoot, entry))) {
      console.warn(`Warning: test script not found: ${entry}`);
    }
  }

  const testJobs = parseTestJobs(process.env.TEST_JOBS);
  const localBinPath = path.join(repoRoot, "node_modules", ".bin");
  const existingPath = process.env.Path || process.env.PATH || "";
  const childPath = `${localBinPath}${path.delimiter}${existingPath}`;
  const env = {
    ...process.env,
    Path: childPath,
    PATH: childPath,
    TS_NODE_TRANSPILE_ONLY: process.env.TS_NODE_TRANSPILE_ONLY ?? "1",
  };
  const startedAt = process.hrtime.bigint();
  const { failed, results } =
    testJobs === 1 ? await runSerial(env) : await runParallel(testJobs, env);
  const totalDurationMs = elapsedMsSince(startedAt);

  if (failed) {
    console.error("");
    console.error(
      `Stopped after ${results.length}/${tests.length} test commands in ${formatDuration(
        totalDurationMs,
      )} with TEST_JOBS=${testJobs}.`,
    );
    process.exit(failed.code && failed.code > 0 ? failed.code : 1);
  }

  printSuccessSummary(results, totalDurationMs, testJobs);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
