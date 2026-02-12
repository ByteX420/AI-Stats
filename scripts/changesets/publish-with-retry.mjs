import { spawnSync } from "node:child_process";

const DUPLICATE_VERSION_RE = /You cannot publish over the previously published versions/i;

function runChangesetPublish() {
  const result = spawnSync("pnpm", ["exec", "changeset", "publish"], {
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32",
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
  };
}

const attempt = runChangesetPublish();

if (attempt.status === 0) {
  process.exit(0);
}

if (DUPLICATE_VERSION_RE.test(attempt.output)) {
  console.warn(
    "[changeset:publish] Detected already-published version conflict; treating as success.",
  );
  process.exit(0);
}

process.exit(attempt.status);
