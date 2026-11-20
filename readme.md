# @lukeed/jsonc

> A fast JSONC parser that keeps source positions

- **Fast:** 28–90x faster than `strip-json-comments` on Bun, and 7–17x on Node.js.
- **Positions:** comments and trailing commas become spaces, so every line, column, and offset still matches your source.
- **Small:** no dependencies.
- **Familiar:** `parse()` works like `JSON.parse()`, reviver and all.

## Install

```sh
$ bun add @lukeed/jsonc
```

<!-- size:start -->

> **Size (gzip):** 791 bytes

<!-- size:end -->

## Usage

```ts
import { parse, toJSON } from "@lukeed/jsonc";

let config = parse<{ port: number; hosts: string[] }>(`{
  // dev server
  "port": 8080,
  "hosts": ["localhost",],
}`);

config.port; //=> 8080
config.hosts; //=> ["localhost"]

toJSON('{ "a": 1, // one\n}');
//=> '{ "a": 1        \n}'
```

## API

### parse<T>(input: string, reviver?: Function): T

Parse a JSONC string. It's `JSON.parse(toJSON(input), reviver)`, so it throws a `SyntaxError` for invalid input, just like `JSON.parse()` does.

The `T` type is a hint only. It's not checked at runtime.

### toJSON(input: string): string

Convert JSONC into valid JSON, without parsing it. The output is always the same length as the input:

- `// line` and `/* block */` comments become spaces. Tabs and line breaks inside them are kept.
- A trailing comma before `}` or `]` becomes a space.
- A leading byte order mark (BOM) becomes a space.

A line comment ends at `\n` or `\r`. An unterminated `/*` comment is left as is, so `JSON.parse()` throws right where it starts.

If there's nothing to change, you get the same string back.

## Support

Node.js 22 and newer, and Bun. In browsers, it needs `TextEncoder`, `TextDecoder`, and [`String.prototype.isWellFormed`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/isWellFormed) (Chrome 111, Firefox 119, Safari 16.4).

## Benchmarks

> Bun 1.4.4 and Node.js 26.13.1, on a shared VM with 8 vCPUs (AMD EPYC 9V45), 2026-11-20. See [`bench/readme.md`](bench/readme.md) for every fixture, memory, and history.

| `toJSON()` vs `strip-json-comments` | Bun                | Node.js            |
| ----------------------------------- | ------------------ | ------------------ |
| small (191 chars)                   | 282 ns vs 7.79 µs  | 328 ns vs 2.66 µs  |
| medium (18 KB)                      | 16.9 µs vs 833 µs  | 23.4 µs vs 298 µs  |
| large (905 KB)                      | 805 µs vs 51.1 ms  | 1.25 ms vs 17.7 ms |
| unicode (625 KB)                    | 1.25 ms vs 34.8 ms | 1.97 ms vs 14.1 ms |

| `parse()` vs `jsonc` | Bun                | Node.js            |
| -------------------- | ------------------ | ------------------ |
| small (191 chars)    | 440 ns vs 8.63 µs  | 974 ns vs 3.79 µs  |
| medium (18 KB)       | 35.6 µs vs 907 µs  | 57.0 µs vs 343 µs  |
| large (905 KB)       | 1.69 ms vs 80.8 ms | 3.12 ms vs 22.1 ms |
| unicode (625 KB)     | 1.88 ms vs 49.9 ms | 2.86 ms vs 15.2 ms |

## Credits

Based on [tidwall/jsonc](https://github.com/tidwall/jsonc) (MIT).

## License

MIT © [Luke Edwards](https://lukeed.com)
