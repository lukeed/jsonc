import { describe, expect, it } from "bun:test";
import * as JSONC from "./index";

describe("jsonc", () => {
	describe("toJSON", () => {
		it("should be a function", () => {
			expect(typeof JSONC.toJSON).toBe("function");
		});

		it("should remove single-line comments", () => {
			let input = '{"key": "value"} // comment';
			let output = JSONC.toJSON(input);
			let parsed = JSON.parse(output);
			expect(parsed.key).toBe("value");
		});

		it("should remove block comments", () => {
			let input = '{"key": /* comment */ "value"}';
			let output = JSONC.toJSON(input);
			let parsed = JSON.parse(output);
			expect(parsed.key).toBe("value");
		});

		it("should remove trailing commas in objects", () => {
			let input = '{"key": "value", }';
			let output = JSONC.toJSON(input);
			let parsed = JSON.parse(output);
			expect(parsed.key).toBe("value");
		});

		it("should remove trailing commas in arrays", () => {
			let input = "[1, 2, 3, ]";
			let output = JSONC.toJSON(input);
			let parsed = JSON.parse(output);
			expect(parsed.length).toBe(3);
		});

		// Regression: starship-io/starship#241 (Bug 2)
		// Trailing commas immediately adjacent to the closing bracket (no
		// whitespace between) were not removed because the backward scan
		// started at `result.length - 2` instead of `result.length - 1`.
		it("should remove trailing comma adjacent to closing brace", () => {
			let output = JSONC.toJSON('{"a":1,}');
			let parsed = JSON.parse(output);
			expect(parsed.a).toBe(1);
		});

		it("should remove trailing comma adjacent to closing bracket", () => {
			let output = JSONC.toJSON("[1,2,3,]");
			let parsed = JSON.parse(output);
			expect(parsed.length).toBe(3);
			expect(parsed[2]).toBe(3);
		});

		it("should remove trailing comma in nested compact structures", () => {
			let output = JSONC.toJSON('{"a":[1,2,],"b":{"c":3,}}');
			let parsed = JSON.parse(output);
			expect(parsed.a).toEqual([1, 2]);
			expect(parsed.b.c).toBe(3);
		});

		it("should remove trailing comma followed by comments", () => {
			let output = JSONC.toJSON('{"a":[1, // one\n],"b":2, /* two */\n}');
			let parsed = JSON.parse(output);
			expect(parsed.a).toEqual([1]);
			expect(parsed.b).toBe(2);
		});

		it("should preserve length with unterminated block comment", () => {
			let input = '{"a":1} /* open';
			let output = JSONC.toJSON(input);
			expect(output.length).toBe(input.length);
			expect(JSON.parse(output).a).toBe(1);
		});

		it("should preserve comments inside strings", () => {
			let input = '{"key": "value with // comment"}';
			let output = JSONC.toJSON(input);
			let parsed = JSON.parse(output);
			expect(parsed.key).toBe("value with // comment");
		});

		it("should preserve block comments inside strings", () => {
			let input = '{"key": "value with /* comment */"}';
			let output = JSONC.toJSON(input);
			let parsed = JSON.parse(output);
			expect(parsed.key).toBe("value with /* comment */");
		});

		it("should handle escaped quotes in strings", () => {
			let input = '{"key": "value with \\"quote\\""}';
			let output = JSONC.toJSON(input);
			let parsed = JSON.parse(output);
			expect(parsed.key).toBe('value with "quote"');
		});

		it("should preserve line breaks for error reporting", () => {
			let input = '{\n  // comment\n  "key": "value"\n}';
			let output = JSONC.toJSON(input);
			let lines = output.split("\n");
			expect(lines.length).toBe(4);
		});

		it("should handle nested structures with comments", () => {
			let input = `{
  "outer": {
    "inner": "value" // comment
  } // outer comment
}`;
			let output = JSONC.toJSON(input);
			let parsed = JSON.parse(output);
			expect(parsed.outer.inner).toBe("value");
		});
	});

	describe("parse", () => {
		it("should be a function", () => {
			expect(typeof JSONC.parse).toBe("function");
		});

		it("should parse JSONC and return typed object", () => {
			let input = '{"key": "value"} // comment';
			let parsed = JSONC.parse<{ key: string }>(input);
			expect(parsed.key).toBe("value");
		});

		it("should parse array JSONC", () => {
			let input = "[1, 2, 3, ] // array comment";
			let parsed = JSONC.parse<number[]>(input);
			expect(Array.isArray(parsed)).toBe(true);
			expect(parsed.length).toBe(3);
		});

		it("should throw on invalid JSON after conversion", () => {
			let input = '{"key": }'; // Invalid, missing value
			let threw = false;
			try {
				JSONC.parse(input);
			} catch {
				threw = true;
			}
			expect(threw).toBe(true);
		});
	});

	describe("edge cases", () => {
		it("should handle multiple single-line comments on same line", () => {
			let input = '{"a": 1, // first comment\n"b": 2 // second comment\n}';
			let parsed = JSONC.parse<{ a: number; b: number }>(input);
			expect(parsed.a).toBe(1);
			expect(parsed.b).toBe(2);
		});

		it("should handle block comments with text after */", () => {
			let input = '{"key": /* comment */ "value"}';
			let output = JSONC.toJSON(input);
			let parsed = JSON.parse(output);
			expect(parsed.key).toBe("value");
		});

		it("should handle empty objects with comments", () => {
			let input = "{ /* comment */ }";
			let parsed = JSONC.parse<Record<string, unknown>>(input);
			expect(Object.keys(parsed).length).toBe(0);
		});

		it("should handle empty arrays with comments", () => {
			let input = "[ /* comment */ ]";
			let parsed = JSONC.parse<unknown[]>(input);
			expect(parsed.length).toBe(0);
		});

		it("should handle trailing comma before closing bracket", () => {
			let input = "[1, 2, 3, ]"; // Single trailing comma
			let output = JSONC.toJSON(input);
			let parsed = JSON.parse(output);
			expect(parsed.length).toBe(3);
		});

		it("should handle mixed tabs and spaces in comments", () => {
			let input = '{"key": "value"}\t// \t comment \t with \t tabs';
			let parsed = JSONC.parse<{ key: string }>(input);
			expect(parsed.key).toBe("value");
		});

		it("should handle carriage returns in comments", () => {
			let input = '{"key": "value"} // comment\r\n{"next": "object"}';
			let output = JSONC.toJSON(input);
			// Should have carriage return preserved
			expect(output).toContain("value");
		});

		it("should handle strings with escaped backslashes", () => {
			let input = '{"path": "C:\\\\Users\\\\file.txt"}';
			let parsed = JSONC.parse<{ path: string }>(input);
			expect(parsed.path).toBe("C:\\Users\\file.txt");
		});

		it("should handle strings with escaped forward slashes", () => {
			let input = '{"url": "https:\\/\\/example.com"}';
			let parsed = JSONC.parse<{ url: string }>(input);
			expect(parsed.url).toContain("example.com");
		});

		it("should handle unicode escape sequences in strings", () => {
			let input = '{"emoji": "\\u{1F600}"}'; // This may not work with JSON.parse
			let output = JSONC.toJSON(input);
			expect(output).toContain("emoji");
		});

		it("should handle numbers in various formats", () => {
			let input = `{
  "int": 42,
  "float": 3.14,
  "exp": 1e10,
  "neg": -100
  // comment
}`;
			let parsed = JSONC.parse<{
				int: number;
				float: number;
				exp: number;
				neg: number;
			}>(input);
			expect(parsed.int).toBe(42);
			expect(parsed.float).toBe(3.14);
			expect(parsed.neg).toBe(-100);
		});

		it("should handle booleans and null", () => {
			let input = `{
  "bool_true": true,  // comment
  "bool_false": false, /* comment */
  "null_value": null
}`;
			let parsed = JSONC.parse<{
				bool_true: boolean;
				bool_false: boolean;
				null_value: null;
			}>(input);
			expect(parsed.bool_true).toBe(true);
			expect(parsed.bool_false).toBe(false);
			expect(parsed.null_value).toBe(null);
		});

		it("should preserve position accuracy for error reporting", () => {
			let input = `{
  "line1": "value1",
  "line2": "value2" // comment
}`;
			let output = JSONC.toJSON(input);
			let lines = output.split("\n");
			expect(lines[1]).toContain("line1");
			expect(lines[2]).toContain("line2");
		});

		it("should handle deeply nested structures", () => {
			let input = `{
  "level1": {
    "level2": {
      "level3": {
        "value": "deep" // deep comment
      } // level3 comment
    } // level2 comment
  } // level1 comment
} // root comment`;
			let parsed = JSONC.parse<{
				level1: { level2: { level3: { value: string } } };
			}>(input);
			expect(parsed.level1.level2.level3.value).toBe("deep");
		});

		it("should handle comments between array elements", () => {
			let input = `[
  1, // first
  2, /* second */
  3  // third
]`;
			let parsed = JSONC.parse<number[]>(input);
			expect(parsed).toContain(1);
			expect(parsed).toContain(2);
			expect(parsed).toContain(3);
		});

		it("should handle key-value pairs with various comment positions", () => {
			let input = `{
  // comment before key
  "key1": "value1",
  "key2": /* comment in middle */ "value2",
  "key3": "value3" // comment after value
}`;
			let parsed = JSONC.parse<{
				key1: string;
				key2: string;
				key3: string;
			}>(input);
			expect(parsed.key1).toBe("value1");
			expect(parsed.key2).toBe("value2");
			expect(parsed.key3).toBe("value3");
		});

		it("should handle comment containing comment delimiters", () => {
			let input = '{"key": "value"} // comment with // extra slashes';
			let parsed = JSONC.parse<{ key: string }>(input);
			expect(parsed.key).toBe("value");
		});

		it("should handle block comment with star patterns", () => {
			let input = `{
  "key": "value" /* comment * with * stars */
}`;
			let parsed = JSONC.parse<{ key: string }>(input);
			expect(parsed.key).toBe("value");
		});

		it("should handle realistic config file", () => {
			let input = `{
  // Database configuration
  "database": {
    "host": "localhost", // default host
    "port": 5432,
    "name": "mydb" /* production database name */
  },
  // Server settings
  "server": {
    "timeout": 3000,
    "debug": true // enable debug mode
  }, // trailing comma allowed
}`;
			let parsed = JSONC.parse<{
				database: { host: string; port: number; name: string };
				server: { timeout: number; debug: boolean };
			}>(input);
			expect(parsed.database.host).toBe("localhost");
			expect(parsed.database.port).toBe(5432);
			expect(parsed.server.timeout).toBe(3000);
		});

		it("should handle URLs and special strings", () => {
			let input = `{
  "url": "https://example.com/path?query=value&other=123",
  "regex": "^[a-z]+$", // regex pattern
  "path": "C:\\\\Program Files\\\\App" /* windows path */
}`;
			let parsed = JSONC.parse<{
				url: string;
				regex: string;
				path: string;
			}>(input);
			expect(parsed.url).toContain("example.com");
			expect(parsed.path).toContain("Program Files");
		});

		it("should handle empty strings", () => {
			let input = '{"empty": "", "key": "value"}';
			let parsed = JSONC.parse<{ empty: string; key: string }>(input);
			expect(parsed.empty).toBe("");
			expect(parsed.key).toBe("value");
		});

		it("should handle whitespace preservation in values", () => {
			let input = '{"spaces": "  value  ", "newline": "line1\\nline2"}';
			let parsed = JSONC.parse<{ spaces: string; newline: string }>(input);
			expect(parsed.spaces).toBe("  value  ");
			expect(parsed.newline).toContain("line1");
		});
	});
});
