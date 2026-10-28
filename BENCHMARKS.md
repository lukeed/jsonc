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

Results for commit `11a36a5`. "Faster" and "less" are npm divided by local.

### Speed: `parse`

| fixture | bun local | bun npm:jsonc | faster | node local | node npm:jsonc | faster |
|---|---|---|---|---|---|---|
| small | 570 ns | 7.79 µs | 13.7x | 1.05 µs | 3.34 µs | 3.2x |
| medium | 47.7 µs | 798 µs | 16.7x | 82.5 µs | 317 µs | 3.8x |
| large | 2.32 ms | 64.6 ms | 27.8x | 3.86 ms | 20.8 ms | 5.4x |
| plain | 1.47 ms | 41.6 ms | 28.3x | 2.51 ms | 15.8 ms | 6.3x |
| dense | 4.30 ms | 104.7 ms | 24.3x | 8.32 ms | 37.8 ms | 4.5x |

### Speed: `toJSON`

| fixture | bun local | bun strip-json-comments | faster | node local | node strip-json-comments | faster |
|---|---|---|---|---|---|---|
| small | 341 ns | 6.95 µs | 20.4x | 435 ns | 2.50 µs | 5.7x |
| medium | 31.6 µs | 749 µs | 23.7x | 53.2 µs | 277 µs | 5.2x |
| large | 1.51 ms | 48.3 ms | 32.0x | 2.36 ms | 16.2 ms | 6.9x |
| plain | 712 µs | 36.9 ms | 51.9x | 1.11 ms | 13.2 ms | 11.9x |
| dense | 3.48 ms | 82.1 ms | 23.6x | 7.28 ms | 35.0 ms | 4.8x |

### Memory: bytes allocated per call (node)

From V8's `total_allocated_bytes` counter, so the values are exact. Bun has no such counter.

| fixture | parse local | parse npm:jsonc | less | toJSON local | toJSON strip-json-comments | less |
|---|---|---|---|---|---|---|
| small | 1.1 KB | 7.2 KB | 6.5x | 825 B | 6.6 KB | 8.2x |
| medium | 134 KB | 743 KB | 5.6x | 104 KB | 697 KB | 6.7x |
| large | 6.37 MB | 36.0 MB | 5.7x | 5.37 MB | 34.0 MB | 6.3x |
| plain | 1.19 MB | 29.3 MB | 24.6x | 3.0 KB | 27.3 MB | 9300x |
| dense | 14.9 MB | 64.2 MB | 4.3x | 13.9 MB | 62.1 MB | 4.5x |

For `plain`, `toJSON` returns the input unchanged, so it allocates almost nothing. `parse` then allocates only for `JSON.parse`.

### Memory: extra peak RSS for one call

One call in a fresh process, minus a process that only reads the input. Median of 5 runs. On Linux this uses `VmHWM`, because `maxRSS` is inherited from the parent process across exec. The values have a floor of about 5 MB from heap growth and the first-call compile, so they are useful only for large inputs.

| fixture | runtime | parse local | parse npm:jsonc | toJSON local | toJSON strip-json-comments |
|---|---|---|---|---|---|
| large | bun | 15.7 MB | 42.8 MB | 14.2 MB | 40.1 MB |
| large | node | 13.2 MB | 28.1 MB | 11.7 MB | 27.2 MB |
| plain | bun | 6.7 MB | 36.2 MB | 4.6 MB | 34.3 MB |
| plain | node | 6.7 MB | 19.1 MB | 5.0 MB | 17.2 MB |
| dense | bun | 24.4 MB | 45.2 MB | 23.8 MB | 43.9 MB |
| dense | node | 21.7 MB | 34.9 MB | 20.8 MB | 33.0 MB |

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

Bytes allocated per call by `toJSON` on node:

| commit | medium | large | dense |
|---|---|---|---|
| `3a514c6` | 171 KB | 9.12 MB | 22.8 MB |
| `11a36a5` | 104 KB | 5.37 MB | 13.9 MB |

### Rejected

| change | result |
|---|---|
| Blank comments with a regex replace of character runs instead of single characters | Slower on node, mixed on bun. |
| Skip strings with `indexOf('"')` instead of a character loop | 4–14% slower on short strings, 6.5x (bun) and 8.5x (node) faster on strings of about 540 characters. Most JSONC input is config with short strings. |
