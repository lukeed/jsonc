import { bench, group, run, summary } from "mitata";
import { jsonc } from "jsonc";
import strip from "strip-json-comments";

import * as local from "./index.ts";
import { fixtures } from "./fixtures.ts";

for (let [name, input] of Object.entries(fixtures)) {
	summary(() => {
		group(`parse: ${name} (${input.length} chars)`, () => {
			bench("local", () => local.parse(input));
			bench("npm:jsonc", () =>
				jsonc.parse(input, { allowTrailingCommas: true }),
			);
		});
	});
}

for (let [name, input] of Object.entries(fixtures)) {
	summary(() => {
		group(`toJSON: ${name} (${input.length} chars)`, () => {
			bench("local", () => local.toJSON(input));
			bench("npm:strip-json-comments", () =>
				strip(input, { trailingCommas: true }),
			);
		});
	});
}

await run();
