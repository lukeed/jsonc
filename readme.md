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

> Bun 1.4.4 and Node.js 26.13.1, on a shared VM with 8 vCPUs (AMD EPYC 9V45), 2026-11-20. Time is per call. Memory is the extra peak RSS of one call, Bun / Node; `–` means the input is too small to measure. `strip-json-comments` only does what `toJSON()` does. See [`bench/readme.md`](bench/readme.md) for every fixture and the full history.

```txt
Code size (gzip)
  @lukeed/jsonc                        791 B
  strip-json-comments                  579 B
  jsonc                             11,834 B

parse :: 191 B input                       Bun      Node           Memory
  @lukeed/jsonc                        0.44 µs   0.97 µs                –
  jsonc                                8.63 µs   3.79 µs                –

parse :: 18 KB input                       Bun      Node           Memory
  @lukeed/jsonc                        35.6 µs   57.0 µs                –
  jsonc                               906.6 µs  343.4 µs                –

parse :: 905 KB input                      Bun      Node           Memory
  @lukeed/jsonc                        1.69 ms   3.12 ms    9.5 /  3.7 MB
  jsonc                               80.82 ms  22.05 ms   40.7 / 23.4 MB

parse :: 625 KB non-ASCII input            Bun      Node           Memory
  @lukeed/jsonc                        1.88 ms   2.86 ms    9.2 /  3.9 MB
  jsonc                               49.89 ms  15.18 ms   42.2 / 20.2 MB

toJSON :: 191 B input                      Bun      Node           Memory
  @lukeed/jsonc                        0.28 µs   0.33 µs                –
  strip-json-comments                  7.79 µs   2.66 µs                –

toJSON :: 18 KB input                      Bun      Node           Memory
  @lukeed/jsonc                        16.9 µs   23.4 µs                –
  strip-json-comments                 832.5 µs  298.4 µs                –

toJSON :: 905 KB input                     Bun      Node           Memory
  @lukeed/jsonc                        0.80 ms   1.25 ms    7.4 /  2.8 MB
  strip-json-comments                 51.05 ms  17.67 ms   38.6 / 22.6 MB

toJSON :: 625 KB non-ASCII input           Bun      Node           Memory
  @lukeed/jsonc                        1.25 ms   1.97 ms    7.4 /  3.6 MB
  strip-json-comments                 34.83 ms  14.13 ms   40.6 / 18.0 MB
```

## License

MIT © [Luke Edwards](https://lukeed.com)

Originally inspired by [tidwall/jsonc](https://github.com/tidwall/jsonc)
