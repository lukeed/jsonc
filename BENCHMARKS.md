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

Results for commit `01d1494`. "Faster" and "less" are npm divided by local.

### Speed: `parse`

| fixture | bun local | bun npm:jsonc | faster | node local | node npm:jsonc | faster |
|---|---|---|---|---|---|---|
| small | 534 ns | 7.82 µs | 14.6x | 1.09 µs | 3.37 µs | 3.1x |
| medium | 45.4 µs | 780 µs | 17.2x | 78.4 µs | 316 µs | 4.0x |
| large | 2.18 ms | 63.4 ms | 29.1x | 3.69 ms | 19.9 ms | 5.4x |
| plain | 1.40 ms | 41.9 ms | 29.9x | 2.48 ms | 15.9 ms | 6.4x |
| dense | 3.90 ms | 104.4 ms | 26.8x | 6.86 ms | 38.7 ms | 5.6x |

### Speed: `toJSON`

| fixture | bun local | bun strip-json-comments | faster | node local | node strip-json-comments | faster |
|---|---|---|---|---|---|---|
| small | 317 ns | 7.25 µs | 22.9x | 424 ns | 2.47 µs | 5.8x |
| medium | 28.9 µs | 756 µs | 26.1x | 48.5 µs | 281 µs | 5.8x |
| large | 1.46 ms | 44.0 ms | 30.2x | 2.08 ms | 15.9 ms | 7.6x |
| plain | 629 µs | 35.4 ms | 56.3x | 962 µs | 13.1 ms | 13.6x |
| dense | 3.13 ms | 87.8 ms | 28.0x | 5.50 ms | 35.3 ms | 6.4x |

### Memory: bytes allocated per call (node)

From V8's `total_allocated_bytes` counter, so the values are exact. Bun has no such counter.

| fixture | parse local | parse npm:jsonc | less | toJSON local | toJSON strip-json-comments | less |
|---|---|---|---|---|---|---|
| small | 1.0 KB | 7.2 KB | 7.2x | 765 B | 6.6 KB | 8.8x |
| medium | 109 KB | 742 KB | 6.8x | 76 KB | 697 KB | 9.2x |
| large | 5.61 MB | 36.0 MB | 6.4x | 4.38 MB | 34.0 MB | 7.8x |
| plain | 1.19 MB | 29.3 MB | 24.6x | 3.0 KB | 27.3 MB | 9300x |
| dense | 10.5 MB | 64.2 MB | 6.1x | 9.51 MB | 62.1 MB | 6.5x |

For `plain`, `toJSON` returns the input unchanged, so it allocates almost nothing. `parse` then allocates only for `JSON.parse`.

### Memory: extra peak RSS for one call

One call in a fresh process, minus a process that only reads the input. Median of 5 runs. On Linux this uses `VmHWM`, because `maxRSS` is inherited from the parent process across exec. The values have a floor of about 5 MB from heap growth and the first-call compile, so they are useful only for large inputs.

| fixture | runtime | parse local | parse npm:jsonc | toJSON local | toJSON strip-json-comments |
|---|---|---|---|---|---|
| large | bun | 14.3 MB | 42.5 MB | 12.9 MB | 40.6 MB |
| large | node | 12.6 MB | 28.2 MB | 10.5 MB | 27.3 MB |
| plain | bun | 6.6 MB | 36.6 MB | 4.3 MB | 34.0 MB |
| plain | node | 6.7 MB | 19.2 MB | 4.7 MB | 17.2 MB |
| dense | bun | 19.5 MB | 44.0 MB | 18.3 MB | 43.4 MB |
| dense | node | 16.7 MB | 35.1 MB | 15.8 MB | 32.8 MB |

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
| `01d1494` | cache short blanks | 317 / 424 ns | 29 µs / 48 µs | 1.46 / 2.08 ms | 0.63 / 0.96 ms | 3.13 / 5.50 ms |

Bytes allocated per call by `toJSON` on node:

| commit | medium | large | dense |
|---|---|---|---|
| `3a514c6` | 171 KB | 9.12 MB | 22.8 MB |
| `11a36a5` | 104 KB | 5.37 MB | 13.9 MB |
| `5c06145` | 86 KB | 5.10 MB | 11.3 MB |
| `01d1494` | 76 KB | 4.38 MB | 9.51 MB |

### Rejected

| change | result |
|---|---|
| Blank comments with a regex replace of character runs instead of single characters | Slower on node, mixed on bun. |
| Skip strings with `indexOf('"')` instead of a character loop | 4–14% slower on short strings, 6.5x (bun) and 8.5x (node) faster on strings of about 540 characters. Most JSONC input is config with short strings. |
| Reuse one module-level parts array across calls | `length = 0` frees the backing store in V8, so allocation did not change. Writing by index, then `fill("")` after `join`, cut node allocations on repeated input (large 4.38 → 2.61 MB, dense 9.51 → 5.43 MB). But `length = n` shrinks the array when input size changes, so large and small inputs in turn saved only 4.41 → 4.19 MB. Speed changed by −13% (node small) to +9% (dense). The array also keeps its largest size alive between calls. |
