import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getHeapStatistics } from "node:v8";
import { jsonc } from "jsonc";
import strip from "strip-json-comments";

import * as local from "../index.ts";

const cases: Record<string, (input: string) => unknown> = {
	"parse: local": (input) => local.parse(input),
	"parse: npm:jsonc": (input) =>
		jsonc.parse(input, { allowTrailingCommas: true }),
	"toJSON: local": (input) => local.toJSON(input),
	"toJSON: npm:strip-json-comments": (input) =>
		strip(input, { trailingCommas: true }),
};

let [file, name] = process.argv.slice(2);

if (file && name) {
	let input = readFileSync(file, "utf8");
	if (name !== "none") cases[name](input);
	// maxRSS is inherited from the parent on Linux; VmHWM is not
	let hwm =
		existsSync("/proc/self/status") &&
		readFileSync("/proc/self/status", "utf8").match(/VmHWM:\s+(\d+)/);
	console.log(hwm ? hwm[1] : process.resourceUsage().maxRSS);
	process.exit(0);
}

let { fixtures } = await import("./fixtures.ts");
let dir = mkdtempSync(join(tmpdir(), "jsonc-memory-"));
let exact = !process.versions.bun;

let bytes = (n: number) =>
	n < 1024
		? `${n.toFixed(0)} B`
		: n < 1024 ** 2
			? `${(n / 1024).toFixed(1)} KB`
			: `${(n / 1024 ** 2).toFixed(2)} MB`;

let peak = (file: string, name: string) => {
	let runs: number[] = [];
	for (let n = 0; n < 5; n++) {
		let child = spawnSync(process.execPath, [process.argv[1], file, name], {
			encoding: "utf8",
		});
		if (child.status !== 0) throw new Error(child.stderr);
		runs.push(Number(child.stdout) * 1024);
	}
	return runs.sort((a, b) => a - b)[2];
};

let allocated = (fn: () => unknown, runs: number) => {
	for (let n = 0; n < 20; n++) fn();
	let before = getHeapStatistics().total_allocated_bytes;
	for (let n = 0; n < runs; n++) fn();
	return (getHeapStatistics().total_allocated_bytes - before) / runs;
};

console.log(
	`runtime: ${process.versions.bun ? `bun ${process.versions.bun}` : `node ${process.version}`}`,
);
if (exact) console.log("allocated: bytes allocated per call");
else console.log("allocated: skipped, bun has no exact allocation counter");
console.log(
	"peak: extra peak RSS for one call in a fresh process, median of 5, inputs over 100K chars\n",
);

try {
	for (let [fixture, input] of Object.entries(fixtures)) {
		let big = input.length > 1e5;
		if (!exact && !big) continue;
		let file = join(dir, `${fixture}.jsonc`);
		writeFileSync(file, input);
		let base = big ? peak(file, "none") : 0;
		console.log(`• ${fixture} (${input.length} chars)`);
		for (let [name, fn] of Object.entries(cases)) {
			let line = `  ${name.padEnd(34)}`;
			if (exact)
				line += ` allocated ${bytes(allocated(() => fn(input), Math.max(50, Math.ceil(5e6 / input.length)))).padStart(9)}`;
			if (big)
				line += `   peak ${bytes(Math.max(0, peak(file, name) - base)).padStart(9)}`;
			console.log(line);
		}
	}
} finally {
	rmSync(dir, { recursive: true, force: true });
}
