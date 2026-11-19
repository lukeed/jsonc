const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { ignoreBOM: true });

const spaces = " ".repeat(64);
const blanks = Array.from({ length: 64 }, (_, size) => spaces.slice(0, size));

function blank(size: number): string {
	return size < 64 ? blanks[size] : " ".repeat(size);
}

function slices(input: string): string {
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
			for (j = end; j < len - 1 && c === 47;) {
				next = input.charCodeAt(j + 1);
				if (next === 47) {
					for (
						j += 2;
						j < len && (c = input.charCodeAt(j)) !== 10 && c !== 13;
						j++
					);
				} else if (next === 42) {
					j = input.indexOf("*/", j + 2);
					if (j === -1) break;
					j += 2;
				} else break;
				for (; j < len && (c = input.charCodeAt(j)) <= 32; j++);
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
				if (next === 47) {
					for (
						end = i + 2;
						end < len && (c = input.charCodeAt(end)) !== 10 && c !== 13;
						end++
					);
				} else {
					end = input.indexOf("*/", i + 2);
					if (end === -1) break;
					end += 2;
				}
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

function bytes(input: string): string {
	let size = input.length,
		buf = new Uint8Array(size);
	if (encoder.encodeInto(input, buf).read < size) {
		if (!input.isWellFormed()) return slices(input);
		buf = encoder.encode(input);
		size = buf.length;
	}

	let edits = false,
		next: number,
		c: number;
	let i = 0,
		j = 0,
		end = 0,
		from = 0,
		w = 0;

	// BOM
	if (buf[0] === 239 && buf[1] === 187 && buf[2] === 191) {
		buf[0] = 32;
		from = i = 3;
		w = 1;
		edits = true;
	}

	for (; i < size; i++) {
		c = buf[i];

		// '"'
		if (c === 34) {
			for (i++; i < size; i++) {
				c = buf[i];
				// "\\"
				if (c === 92) i++;
				else if (c === 34) break;
			}
			continue;
		}

		// ","
		if (c === 44) {
			for (end = i + 1; end < size && (c = buf[end]) <= 32; end++);
			// skip "//" and "/*" comments
			for (j = end; j < size - 1 && c === 47;) {
				next = buf[j + 1];
				if (next === 47) {
					for (j += 2; j < size && (c = buf[j]) !== 10 && c !== 13; j++);
				} else if (next === 42) {
					for (
						j = j + 2;
						j < size - 1 && !(buf[j] === 42 && buf[j + 1] === 47);
						j++
					);
					if (j >= size - 1) break;
					j += 2;
				} else break;
				for (; j < size && (c = buf[j]) <= 32; j++);
			}
			// "}" or "]"
			if (j < size && (c === 125 || c === 93)) {
				if (w !== from) buf.copyWithin(w, from, i);
				w += i - from;
				buf[w++] = 32;
				from = i + 1;
				edits = true;
			}
			i = end - 1;
			continue;
		}

		// "/"
		if (c === 47 && i < size - 1) {
			next = buf[i + 1];
			// "//" or "/*"
			if (next === 47) {
				for (
					end = i + 2;
					end < size && (c = buf[end]) !== 10 && c !== 13;
					end++
				);
			} else if (next === 42) {
				for (
					end = i + 2;
					end < size - 1 && !(buf[end] === 42 && buf[end + 1] === 47);
					end++
				);
				if (end >= size - 1) break;
				end += 2;
			} else continue;
			if (w !== from) buf.copyWithin(w, from, i);
			w += i - from;
			for (j = i; j < end; j++) {
				c = buf[j];
				// "\t" or "\n" or "\r"
				if (c < 128) buf[w++] = c === 9 || c === 10 || c === 13 ? c : 32;
				else {
					// one space per UTF-16 unit
					buf[w++] = 32;
					if (c >= 240) {
						buf[w++] = 32;
						j += 3;
					} else j += c >= 224 ? 2 : 1;
				}
			}
			from = end;
			edits = true;
			i = end - 1;
		}
	}

	if (!edits) return input;
	if (w !== from) buf.copyWithin(w, from, size);
	w += size - from;
	return decoder.decode(w === size ? buf : buf.subarray(0, w));
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
	return input.length < 512 ? slices(input) : bytes(input);
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
export function parse<T>(
	str: string,
	reviver?: (this: unknown, key: string, value: unknown) => unknown,
): T {
	return JSON.parse(toJSON(str), reviver);
}
