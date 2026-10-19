/**
 * Converts JSONC (JSON with comments) to valid JSON per RFC8259.
 * Preserves line breaks and positions to maintain correct error reporting offsets.
 * @param input - The source JSONC string
 * @source https://github.com/tidwall/jsonc (MIT)
 * @returns Valid JSON string with comments stripped and trailing commas removed
 */
export function toJSON(input: string): string {
	let parts: string[] = [],
		next: number,
		c: number;
	let i = 0,
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
			parts.push(input.slice(start, i));
			comma = parts.length;
			parts.push(",");
			start = i + 1;
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
				parts.push(input.slice(start, i), input.slice(i, end).replace(/[^\t\n\r]/g, " "));
				start = end;
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

export function parse<T>(str: string): T {
	return JSON.parse(toJSON(str));
}
