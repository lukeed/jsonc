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

let dense = `{
		// id
		"id": 123, // trailing
		/* name */ "name": "item", /* trailing */
		// tags
		"tags": [
			"a", // first
			"b", /* second */
			"c", // third
		], // end tags
		"nested": { /* x */ "x": 1.5, // y
			"y": null, }, // end nested
	}`;

let large = `[\n\t${Array(5000).fill(item).join(",\n\t")},\n]`;

export const fixtures = {
	small,
	medium: `[\n\t${Array(100).fill(item).join(",\n\t")},\n]`,
	large,
	plain: JSON.stringify(JSON.parse(local.toJSON(large)), null, "\t"),
	dense: `[\n\t${Array(5000).fill(dense).join(",\n\t")},\n]`,
};
