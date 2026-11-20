import { readFile, rm, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";

import { $ } from "bun";

const OUTDIR = "dist";
const START = "<!-- size:start -->";
const END = "<!-- size:end -->";

function size(bytes: number): string {
	return bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} kB`;
}

await rm(OUTDIR, { recursive: true, force: true });

let result = await Bun.build({
	entrypoints: ["src/index.ts"],
	root: "src",
	outdir: OUTDIR,
	target: "node",
	packages: "external",
	minify: true,
});

if (!result.success) {
	for (let log of result.logs) console.error(log);
	process.exit(1);
}

for (let output of result.outputs) {
	let kb = (output.size / 1024).toFixed(2).padStart(6);
	console.log(`${kb} kB  ${output.path.slice(process.cwd().length + 1)}`);
}

await $`bun x tsc -p tsconfig.build.json`;

let gzip = gzipSync(await result.outputs[0].text()).length;
let section = `> **Size (gzip):** ${size(gzip)}`;
console.log(`\n${section}`);

if (process.argv.includes("--readme")) {
	let readme = await readFile("readme.md", "utf8");
	let a = readme.indexOf(START);
	let b = readme.indexOf(END);
	if (a === -1 || b === -1)
		throw new Error(`readme.md needs ${START} and ${END} markers`);
	await writeFile(
		"readme.md",
		readme.slice(0, a) + `${START}\n\n${section}\n\n` + readme.slice(b),
	);
}
