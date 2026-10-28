# Benchmarks

Speed and memory of this package against [`jsonc`](https://www.npmjs.com/package/jsonc) and [`strip-json-comments`](https://www.npmjs.com/package/strip-json-comments). `strip-json-comments` is the stripper that `jsonc` uses.

## Setup

- CPU: AMD EPYC 9V45 96-Core Processor, ~4.3 GHz, Linux 7.0.0
- Runtimes: bun 1.4.3, node 26.12.0
- Packages: jsonc 3.0.0, strip-json-comments 5.0.3, mitata 1.0.34
- Options: `jsonc.parse(input, { allowTrailingCommas: true })` and `strip(input, { trailingCommas: true })`, so all libraries do the same work.

Run:

```sh
bun run bench    # speed, bun then node
bun run memory   # memory, bun then node
```

## Fixtures

All fixtures are in `fixtures.ts`.

| fixture | size | contents |
|---|---|---|
| small | 191 chars | a `tsconfig.json`-like file with line and block comments and trailing commas |
| medium | 18 KB | 100 items with a line comment, a multi-line block comment, a `//` inside a string, escaped quotes, and trailing commas |
| large | 905 KB | 5000 of the same items |
| plain | 825 KB | `large` with no comments and no trailing commas |
| dense | 1.2 MB | 5000 items with a comment on almost every line |

## Results

Results for commit `5c06145`. "Faster" and "less" are npm divided by local.

### Speed: `parse`

| fixture | bun local | bun npm:jsonc | faster | node local | node npm:jsonc | faster |
|---|---|---|---|---|---|---|
| small | 551 ns | 7.74 µs | 14.0x | 1.04 µs | 3.32 µs | 3.2x |
| medium | 46.0 µs | 794 µs | 17.3x | 80.5 µs | 325 µs | 4.0x |
| large | 2.19 ms | 62.3 ms | 28.5x | 3.83 ms | 21.4 ms | 5.6x |
| plain | 1.40 ms | 41.3 ms | 29.5x | 2.50 ms | 16.7 ms | 6.7x |
| dense | 4.17 ms | 101.0 ms | 24.2x | 7.50 ms | 38.9 ms | 5.2x |

### Speed: `toJSON`

| fixture | bun local | bun strip-json-comments | faster | node local | node strip-json-comments | faster |
|---|---|---|---|---|---|---|
| small | 325 ns | 6.99 µs | 21.5x | 454 ns | 2.52 µs | 5.6x |
| medium | 30.1 µs | 745 µs | 24.8x | 48.8 µs | 280 µs | 5.7x |
| large | 1.42 ms | 43.1 ms | 30.3x | 2.25 ms | 16.4 ms | 7.3x |
| plain | 599 µs | 34.5 ms | 57.5x | 963 µs | 13.2 ms | 13.7x |
| dense | 3.30 ms | 82.8 ms | 25.1x | 5.93 ms | 36.2 ms | 6.1x |

### Memory: bytes allocated per call (node)

From V8's `total_allocated_bytes` counter, so the values are exact. Bun has no such counter.

| fixture | parse local | parse npm:jsonc | less | toJSON local | toJSON strip-json-comments | less |
|---|---|---|---|---|---|---|
| small | 1.0 KB | 7.2 KB | 7.2x | 802 B | 6.6 KB | 8.4x |
| medium | 117 KB | 742 KB | 6.4x | 86 KB | 697 KB | 8.1x |
| large | 6.14 MB | 36.0 MB | 5.9x | 5.10 MB | 34.0 MB | 6.7x |
| plain | 1.19 MB | 29.3 MB | 24.6x | 3.0 KB | 27.3 MB | 9300x |
| dense | 12.0 MB | 64.2 MB | 5.3x | 11.3 MB | 62.1 MB | 5.5x |

For `plain`, `toJSON` returns the input unchanged, so it allocates almost nothing. `parse` then allocates only for `JSON.parse`.

### Memory: extra peak RSS for one call

One call in a fresh process, minus a process that only reads the input. Median of 5 runs. On Linux this uses `VmHWM`, because `maxRSS` is inherited from the parent process across exec. The values have a floor of about 5 MB from heap growth and the first-call compile, so they are useful only for large inputs.

| fixture | runtime | parse local | parse npm:jsonc | toJSON local | toJSON strip-json-comments |
|---|---|---|---|---|---|
| large | bun | 15.5 MB | 42.6 MB | 13.9 MB | 40.6 MB |
| large | node | 13.0 MB | 28.0 MB | 11.5 MB | 27.3 MB |
| plain | bun | 6.7 MB | 36.0 MB | 4.4 MB | 35.3 MB |
| plain | node | 6.8 MB | 19.2 MB | 4.9 MB | 17.2 MB |
| dense | bun | 24.1 MB | 44.2 MB | 21.9 MB | 42.3 MB |
| dense | node | 20.6 MB | 34.9 MB | 19.7 MB | 33.2 MB |

## History

Each optimization step, with results measured at that commit. Values are bun / node.

### `parse` before the fixtures were added

| commit | change | small | medium | large |
|---|---|---|---|---|
| `df5bb6e` | original | 2.07 µs / 1.83 µs | 361 µs / 289 µs | 306 ms / 2.32 s |
| `3c00438` | linear `toJSON` | 1.38 µs / 1.53 µs | 127 µs / 123 µs | 6.22 ms / 7.67 ms |

The original was quadratic. At each `}` or `]` it read back from the output string, which made the engine flatten the whole string. A trailing comma also made a full copy.

### `toJSON`

| commit | change | small | medium | large | plain | dense |
|---|---|---|---|---|---|---|
| `3c00438` | linear `toJSON` | 1.15 µs / 857 ns | 112 µs / 97 µs | 5.55 / 7.86 ms | 1.43 / 2.44 ms | 19.0 / 15.9 ms |
| `e990a42` | look ahead past commas | 1.05 µs / 751 ns | 96 µs / 76 µs | 4.66 / 4.55 ms | 0.71 / 1.08 ms | 19.6 / 15.8 ms |
| `3a514c6` | fast path for comments with no tab or line break | 464 / 497 ns | 85 µs / 73 µs | 4.09 / 3.93 ms | 0.66 / 1.09 ms | 6.2 / 8.6 ms |
| `11a36a5` | blank comments by run, no regex | 341 / 435 ns | 32 µs / 53 µs | 1.51 / 2.36 ms | 0.71 / 1.11 ms | 3.48 / 7.28 ms |
| `5c06145` | look ahead past comments, no pending comma | 325 / 454 ns | 30 µs / 49 µs | 1.42 / 2.25 ms | 0.60 / 0.96 ms | 3.30 / 5.93 ms |

Bytes allocated per call by `toJSON` on node:

| commit | medium | large | dense |
|---|---|---|---|
| `3a514c6` | 171 KB | 9.12 MB | 22.8 MB |
| `11a36a5` | 104 KB | 5.37 MB | 13.9 MB |
| `5c06145` | 86 KB | 5.10 MB | 11.3 MB |

### Rejected

| change | result |
|---|---|
| Blank comments with a regex replace of character runs instead of single characters | Slower on node, mixed on bun. |
| Skip strings with `indexOf('"')` instead of a character loop | 4–14% slower on short strings, 6.5x (bun) and 8.5x (node) faster on strings of about 540 characters. Most JSONC input is config with short strings. |
