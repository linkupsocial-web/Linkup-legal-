import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const watch = process.argv.includes("--watch");
const root = process.cwd();
const sourceRoot = path.join(root, "src");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "service-connect-hub-tests-"));
const tscPath = path.join(root, "node_modules", "typescript", "lib", "tsc.js");

function collectTestFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

const testFiles = collectTestFiles(sourceRoot);

if (!testFiles.length) {
  console.log("No test files found.");
  process.exit(0);
}

const testTsconfigPath = path.join(tempRoot, "tsconfig.json");
fs.writeFileSync(
  testTsconfigPath,
  JSON.stringify(
    {
      extends: path.join(root, "tsconfig.json").replaceAll("\\", "/"),
      compilerOptions: {
        noEmit: false,
        module: "CommonJS",
        moduleResolution: "Node",
        target: "ES2022",
        rootDir: sourceRoot,
        outDir: tempRoot,
        incremental: false,
      },
      files: testFiles,
      include: [],
      exclude: [],
    },
    null,
    2
  )
);

const compileArgs = [tscPath, "--project", testTsconfigPath];

const runCompiledTests = () =>
  testFiles.map((file) =>
    path.join(tempRoot, path.relative(sourceRoot, file)).replace(/\.ts$/, ".js")
  );

const compileOnce = () => spawnSync(process.execPath, compileArgs, { stdio: "inherit" });
const executeTests = () => {
  for (const testFile of runCompiledTests()) {
    const result = spawnSync(process.execPath, [testFile], { stdio: "inherit" });
    if (result.status !== 0) {
      return result.status ?? 1;
    }
  }
  return 0;
};

if (!watch) {
  const compileResult = compileOnce();
  if (compileResult.status !== 0) {
    process.exit(compileResult.status ?? 1);
  }

  process.exit(executeTests());
}

const runWatchCycle = () => {
  const compileResult = compileOnce();
  if (compileResult.status !== 0) {
    process.exit(compileResult.status ?? 1);
  }
  const exitCode = executeTests();
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
  console.log("Watching for changes...");
};

runWatchCycle();

let debounce;
const watcher = fs.watch(sourceRoot, { recursive: true }, () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    console.log("Change detected, rerunning tests...");
    runWatchCycle();
  }, 100);
});

const shutdown = (code = 0) => {
  watcher.close();
  process.exit(code);
};

process.on("SIGINT", () => shutdown(130));
process.on("SIGTERM", () => shutdown(143));

if (watch) {
  await new Promise(() => {});
}
