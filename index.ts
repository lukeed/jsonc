let spaces = " ".repeat(64);
const blanks = Array.from({ length: 64 }, (_, size) => spaces.slice(0, size));

function blank(size: number): string {
	if (size < 64) return blanks[size];
	if (size > spaces.length) spaces = " ".repeat(size);
	return spaces.slice(0, size);
}

/**
 * Converts JSONC (JSON with comments) to valid JSON per RFC8259.
 * Preserves line breaks and positions to maintain correct error reporting offsets.
 * @param input - The source JSONC string
 * @source https://github.com/tidwall/jsonc (MIT)
 * @returns Valid JSON string with comments stripped and trailing commas removed
 * @example
 * toJSON('{ "a": 1, // one\n}'); //=> '{ "a": 1        \n}'
 */
export function toJSON(input: string): string {
	let parts: string[] = [],
		next: number,
		run: number,
		c: number;
	let i = 0,
		j = 0,
		end = 0,
		start = 0,
		len = input.length;

	// BOM
	if (input.charCodeAt(0) === 65279) {
		parts.push(" ");
		start = i = 1;
	}

	for (; i < len; i++) {
		c = input.charCodeAt(i);

		// track string state
		// '"'
		if (c === 34) {
			for (i++; i < len; i++) {
				c = input.charCodeAt(i);
				// "\\"
				if (c === 92) i++;
				else if (c === 34) break;
			}
			continue;
		}

		// ","
		if (c === 44) {
			for (end = i + 1; end < len && (c = input.charCodeAt(end)) <= 32; end++);
			// skip "//" and "/*" comments
			for (j = end; j < len - 1 && c === 47; ) {
				next = input.charCodeAt(j + 1);
				if (next !== 47 && next !== 42) break;
				j = next === 47 ? input.indexOf("\n", j + 2) : input.indexOf("*/", j + 2);
				if (j === -1) break;
				for (j += next === 47 ? 1 : 2; j < len && (c = input.charCodeAt(j)) <= 32; j++);
			}
			// "}" or "]"
			if (j < len && (c === 125 || c === 93)) {
				parts.push(input.slice(start, i), " ");
				start = i + 1;
			}
			i = end - 1;
			continue;
		}

		// "/"
		if (c === 47 && i < len - 1) {
			next = input.charCodeAt(i + 1);
			// "//" or "/*"
			if (next === 47 || next === 42) {
				end = next === 47 ? input.indexOf("\n", i + 2) : input.indexOf("*/", i + 2);
				if (end === -1 && next === 42) break;
				end = end === -1 ? len : next === 47 ? end : end + 2;
				for (run = j = i; j < end; j++) {
					c = input.charCodeAt(j);
					// "\t" or "\n" or "\r"
					if (c === 9 || c === 10 || c === 13) {
						if (j > run) {
							parts.push(input.slice(start, run), blank(j - run));
							start = j;
						}
						run = j + 1;
					}
				}
				if (end > run) {
					parts.push(input.slice(start, run), blank(end - run));
					start = end;
				}
				i = end - 1;
				continue;
			}
		}
	}

	if (parts.length === 0) return input;
	parts.push(input.slice(start));
	return parts.join("");
}

/**
 * Parses a JSONC string into a value, like `JSON.parse` but with comments and trailing commas allowed.
 * @param str - The source JSONC string
 * @param reviver - Optional `JSON.parse` reviver, called for each key and value
 * @returns The parsed value; `T` is not validated at runtime
 * @example
 * parse<{ a: number }>('{ "a": 1, // one\n}'); //=> { a: 1 }
 * parse('[1, 2,]', (key, value) => (typeof value === "number" ? value * 2 : value)); //=> [2, 4]
 */
export function parse<T>(str: string, reviver?: (this: unknown, key: string, value: unknown) => unknown): T {
	return JSON.parse(toJSON(str), reviver);
}
