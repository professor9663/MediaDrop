import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const assets = [
  [".next/static", ".next/standalone/.next/static"],
  ["public", ".next/standalone/public"]
];

for (const [source, destination] of assets) {
  const target = resolve(destination);
  await mkdir(dirname(target), { recursive: true });
  await cp(resolve(source), target, { recursive: true, force: true });
}
