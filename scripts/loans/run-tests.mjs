import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const directory = new URL("./", import.meta.url);
const testFiles = readdirSync(directory).filter(name => name.endsWith(".test.mjs"))
  .map(name => fileURLToPath(new URL(name, directory)));
const result = spawnSync(process.execPath, ["--test", ...testFiles], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
