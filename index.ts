/**
 * Converts JSONC (JSON with comments) to valid JSON per RFC8259.
 * Preserves line breaks and positions to maintain correct error reporting offsets.
 * @param input - The source JSONC string
 * @source https://github.com/tidwall/jsonc (MIT)
 * @returns Valid JSON string with comments stripped and trailing commas removed
 */
export function toJSON(input: string): string {
	let result = "",
		c: number;
	let string = false,
		escape = false;
	let i = 0,
		j = 0,
		len = input.length;

	for (; i < len; i++) {
		c = input.charCodeAt(i);

		// track string state
		// '"'
		if (c === 34) {
			if (escape) {
				escape = false;
				result += input[i];
				continue;
			}
			string = !string;
			result += input[i];
			continue;
		}

		// track escape sequences
		// "\\"
		if (c === 92 && string) {
			escape = !escape;
			result += input[i];
			continue;
		}

		escape = false;

		if (string) {
			// ignore special chars if within string
		} else {
			// "/"
			if (c === 47) {
				if (i < len - 1) {
					// "//"
					if (input.charCodeAt(i + 1) === 47) {
						result += "  "; // Preserve spacing
						for (i += 2; i < len; i++) {
							c = input.charCodeAt(i);
							// "\n"
							if (c === 10) {
								result += "\n";
								break;
							}
							// "\t" or "\r"
							if (c === 9 || c === 13) {
								result += input[i];
							} else {
								result += " ";
							}
						}
						continue;
					}
					// "/*"
					if (input.charCodeAt(i + 1) === 42) {
						result += "  ";

						for (i += 2; i < len - 1; i++) {
							c = input.charCodeAt(i);
							// "*/"
							if (c === 42 && input.charCodeAt(i + 1) === 47) {
								result += "  ";
								i++;
								break;
							}
							// "\n" or "\t" or "\r"
							if (c === 10 || c === 9 || c === 13) {
								result += input[i];
							} else {
								result += " ";
							}
						}

						continue;
					}
				}
			}

			// "}" or "]"
			if (c === 125 || c === 93) {
				for (j = result.length - 1; j >= 0; j--) {
					c = result.charCodeAt(j);
					if (c <= 32) continue;
					if (c === 44) {
						result = result.slice(0, j) + " " + result.slice(j + 1);
					}
					break;
				}
			}
		}

		result += input[i];
	}

	return result;
}

export function parse<T>(str: string): T {
	return JSON.parse(toJSON(str));
}
