/** Останавливает e2e-PocketBase, поднятый в global-setup. */

import { readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = join(
  resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  ".pb-e2e-data",
);

export default async function globalTeardown(): Promise<void> {
  try {
    const pid = Number(readFileSync(join(DATA_DIR, "pb.pid"), "utf8"));
    if (pid > 0) process.kill(pid);
  } catch {
    // уже остановлен или не поднимался
  }
  rmSync(DATA_DIR, { recursive: true, force: true });
}
