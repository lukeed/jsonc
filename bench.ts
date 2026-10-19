import { bench, group, run, summary } from "mitata";
import { jsonc } from "jsonc";

import * as local from "./index.ts";

let small = `{
	// compiler options
	"compilerOptions": {
		"target": "esnext", /* modern */
		"module": "esnext",
		"strict": true,
		"paths": { "~/*": ["./src/*"], },
	},
	"include": ["src", "test",],
}`;

let item = `{
		// item
		"id": 123,
		"name": "item \\"quoted\\" // not a comment",
		/* block
		   comment */
		"tags": ["a", "b", "c",],
		"nested": { "x": 1.5, "y": null, "z": false, },
	}`;

let medium = `[\n\t${Array(100).fill(item).join(",\n\t")},\n]`;
let large = `[\n\t${Array(5000).fill(item).join(",\n\t")},\n]`;

for (let [name, input] of [["small", small], ["medium", medium], ["large", large]]) {
	summary(() => {
		group(`${name} (${input.length} chars)`, () => {
			bench("local", () => local.parse(input));
			bench("npm:jsonc", () => jsonc.parse(input, { allowTrailingCommas: true }));
		});
	});
}

await run();
