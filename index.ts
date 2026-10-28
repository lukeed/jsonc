let spaces = " ".repeat(64);

function blank(size: number): string {
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
		comma = -1,
		len = input.length;

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
			comma = -1;
			continue;
		}

		// ","
		if (c === 44) {
			for (end = i + 1; end < len && (c = input.charCodeAt(end)) <= 32; end++);
			// "}" or "]"
			if (end < len && (c === 125 || c === 93)) {
				parts.push(input.slice(start, i), " ");
				start = i + 1;
				comma = -1;
				i = end;
				continue;
			}
			// not "/"
			if (end < len && c !== 47) {
				comma = -1;
				i = end - 1;
				continue;
			}
			parts.push(input.slice(start, i));
			comma = parts.length;
			parts.push(",");
			start = i + 1;
			i = end - 1;
			continue;
		}

		// "}" or "]"
		if (c === 125 || c === 93) {
			if (comma !== -1) parts[comma] = " ";
			comma = -1;
			continue;
		}

		// "/"
		if (c === 47 && i < len - 1) {
			next = input.charCodeAt(i + 1);
			// "//" or "/*"
			if (next === 47 || next === 42) {
				end = next === 47 ? input.indexOf("\n", i + 2) : input.indexOf("*/", i + 2);
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

		if (c > 32) comma = -1;
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
