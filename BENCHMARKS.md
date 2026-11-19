# Benchmarks

Speed and memory of this package against [`jsonc`](https://www.npmjs.com/package/jsonc) and [`strip-json-comments`](https://www.npmjs.com/package/strip-json-comments). `strip-json-comments` is the stripper that `jsonc` uses.

## Setup

- CPU: AMD EPYC 9V45 96-Core Processor, ~4.3 GHz, shared VM with 8 vCPUs, Linux 7.0.0
- Runtimes: bun 1.4.3, node 26.12.0
- Packages: jsonc 3.0.0, strip-json-comments 5.0.3, mitata 1.0.34
- Options: `jsonc.parse(input, { allowTrailingCommas: true })` and `strip(input, { trailingCommas: true })`, so all libraries do the same work.

Check the CPU load before each run, with `uptime` and `mpstat 1 3`. Other work on the machine changed results by up to 50%, also for code that did not change. Run only when the CPUs are at least 95% idle.

Run:

```sh
bun run bench    # speed, bun then node
bun run memory   # memory, bun then node
```

## Fixtures

All fixtures are in `fixtures.ts`.

| fixture | size      | contents                                                                                                               |
| ------- | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| small   | 191 chars | a `tsconfig.json`-like file with line and block comments and trailing commas                                           |
| medium  | 18 KB     | 100 items with a line comment, a multi-line block comment, a `//` inside a string, escaped quotes, and trailing commas |
| large   | 905 KB    | 5000 of the same items                                                                                                 |
| plain   | 825 KB    | `large` with no comments and no trailing commas                                                                        |
| dense   | 1.2 MB    | 5000 items with a comment on almost every line                                                                         |

## Results

Results for commit `384ad93`. The CPUs were 97–99% idle for all runs. "Faster" and "less" are npm divided by local.

### Speed: `parse`

| fixture | bun local | bun npm:jsonc | faster | node local | node npm:jsonc | faster |
| ------- | --------- | ------------- | ------ | ---------- | -------------- | ------ |
| small   | 607 ns    | 8.69 µs       | 14.3x  | 1.12 µs    | 3.72 µs        | 3.3x   |
| medium  | 49.8 µs   | 892 µs        | 17.9x  | 87.5 µs    | 342 µs         | 3.9x   |
| large   | 2.36 ms   | 83.7 ms       | 35.5x  | 3.91 ms    | 22.9 ms        | 5.8x   |
| plain   | 1.41 ms   | 47.5 ms       | 33.7x  | 2.55 ms    | 18.5 ms        | 7.3x   |
| dense   | 4.21 ms   | 135.8 ms      | 32.3x  | 8.05 ms    | 44.7 ms        | 5.6x   |

### Speed: `toJSON`

| fixture | bun local | bun strip-json-comments | faster | node local | node strip-json-comments | faster |
| ------- | --------- | ----------------------- | ------ | ---------- | ------------------------ | ------ |
| small   | 355 ns    | 7.46 µs                 | 21.0x  | 477 ns     | 2.66 µs                  | 5.6x   |
| medium  | 32.8 µs   | 821 µs                  | 25.1x  | 51.3 µs    | 301 µs                   | 5.9x   |
| large   | 1.49 ms   | 55.1 ms                 | 37.0x  | 2.26 ms    | 18.5 ms                  | 8.2x   |
| plain   | 618 µs    | 41.9 ms                 | 67.8x  | 1.03 ms    | 15.2 ms                  | 14.8x  |
| dense   | 3.29 ms   | 98.6 ms                 | 30.0x  | 6.28 ms    | 39.2 ms                  | 6.2x   |

### Memory: bytes allocated per call (node)

From V8's `total_allocated_bytes` counter, so the values are exact. Bun has no such counter.

| fixture | parse local | parse npm:jsonc | less  | toJSON local | toJSON strip-json-comments | less  |
| ------- | ----------- | --------------- | ----- | ------------ | -------------------------- | ----- |
| small   | 1003 B      | 7.2 KB          | 7.4x  | 747 B        | 6.6 KB                     | 9.0x  |
| medium  | 111 KB      | 742 KB          | 6.7x  | 76 KB        | 697 KB                     | 9.2x  |
| large   | 5.61 MB     | 36.0 MB         | 6.4x  | 4.38 MB      | 34.0 MB                    | 7.8x  |
| plain   | 1.19 MB     | 29.3 MB         | 24.6x | 3.0 KB       | 27.3 MB                    | 9300x |
| dense   | 10.5 MB     | 64.2 MB         | 6.1x  | 9.53 MB      | 62.1 MB                    | 6.5x  |

For `plain`, `toJSON` returns the input unchanged, so it allocates almost nothing. `parse` then allocates only for `JSON.parse`.

### Memory: extra peak RSS for one call

One call in a fresh process, minus a process that only reads the input. Median of 5 runs. On Linux this uses `VmHWM`, because `maxRSS` is inherited from the parent process across exec. The values have a floor of about 5 MB from heap growth and the first-call compile, so they are useful only for large inputs.

| fixture | runtime | parse local | parse npm:jsonc | toJSON local | toJSON strip-json-comments |
| ------- | ------- | ----------- | --------------- | ------------ | -------------------------- |
| large   | bun     | 12.8 MB     | 41.1 MB         | 11.1 MB      | 39.6 MB                    |
| large   | node    | 12.8 MB     | 28.4 MB         | 11.1 MB      | 27.5 MB                    |
| plain   | bun     | 6.2 MB      | 36.6 MB         | 4.0 MB       | 34.4 MB                    |
| plain   | node    | 7.0 MB      | 19.5 MB         | 4.8 MB       | 17.4 MB                    |
| dense   | bun     | 18.5 MB     | 46.0 MB         | 16.7 MB      | 45.4 MB                    |
| dense   | node    | 17.7 MB     | 35.2 MB         | 16.7 MB      | 33.4 MB                    |

## History

Each optimization step, with results measured at that commit. Values are bun / node. The CPU load was not recorded for these runs, so treat differences under about 10% as noise.

### `parse` before the fixtures were added

| commit    | change          | small             | medium          | large             |
| --------- | --------------- | ----------------- | --------------- | ----------------- |
| `df5bb6e` | original        | 2.07 µs / 1.83 µs | 361 µs / 289 µs | 306 ms / 2.32 s   |
| `3c00438` | linear `toJSON` | 1.38 µs / 1.53 µs | 127 µs / 123 µs | 6.22 ms / 7.67 ms |

The original was quadratic. At each `}` or `]` it read back from the output string, which made the engine flatten the whole string. A trailing comma also made a full copy.

### `toJSON`

| commit    | change                                           | small            | medium         | large          | plain          | dense          |
| --------- | ------------------------------------------------ | ---------------- | -------------- | -------------- | -------------- | -------------- |
| `3c00438` | linear `toJSON`                                  | 1.15 µs / 857 ns | 112 µs / 97 µs | 5.55 / 7.86 ms | 1.43 / 2.44 ms | 19.0 / 15.9 ms |
| `e990a42` | look ahead past commas                           | 1.05 µs / 751 ns | 96 µs / 76 µs  | 4.66 / 4.55 ms | 0.71 / 1.08 ms | 19.6 / 15.8 ms |
| `3a514c6` | fast path for comments with no tab or line break | 464 / 497 ns     | 85 µs / 73 µs  | 4.09 / 3.93 ms | 0.66 / 1.09 ms | 6.2 / 8.6 ms   |
| `11a36a5` | blank comments by run, no regex                  | 341 / 435 ns     | 32 µs / 53 µs  | 1.51 / 2.36 ms | 0.71 / 1.11 ms | 3.48 / 7.28 ms |
| `5c06145` | look ahead past comments, no pending comma       | 325 / 454 ns     | 30 µs / 49 µs  | 1.42 / 2.25 ms | 0.60 / 0.96 ms | 3.30 / 5.93 ms |
| `01d1494` | cache short blanks                               | 317 / 424 ns     | 29 µs / 48 µs  | 1.46 / 2.08 ms | 0.63 / 0.96 ms | 3.13 / 5.50 ms |

Bytes allocated per call by `toJSON` on node:

| commit    | medium | large   | dense   |
| --------- | ------ | ------- | ------- |
| `3a514c6` | 171 KB | 9.12 MB | 22.8 MB |
| `11a36a5` | 104 KB | 5.37 MB | 13.9 MB |
| `5c06145` | 86 KB  | 5.10 MB | 11.3 MB |
| `01d1494` | 76 KB  | 4.38 MB | 9.51 MB |

### Bug fixes

`83944e0` (keep unterminated `/*`), `d006892` (blank leading BOM), `911c626` (end `//` at `\r`) and `384ad93` (drop blank growth) were compared with `d72298c` in one process, with the CPUs 97% idle. All differences were within ±5% and went both ways, except `small`: the BOM check made it 3–8% slower on bun and about 2% slower on node (10–25 ns per call). Two other forms of the BOM check were no faster.

### Rejected

| change                                                                             | result                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blank comments with a regex replace of character runs instead of single characters | Slower on node, mixed on bun.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Skip strings with `indexOf('"')` instead of a character loop                       | 4–14% slower on short strings, 6.5x (bun) and 8.5x (node) faster on strings of about 540 characters. Most JSONC input is config with short strings.                                                                                                                                                                                                                                                                                                   |
| Reuse one module-level parts array across calls                                    | `length = 0` frees the backing store in V8, so allocation did not change. Writing by index, then `fill("")` after `join`, cut node allocations on repeated input (large 4.38 → 2.61 MB, dense 9.51 → 5.43 MB). But `length = n` shrinks the array when input size changes, so large and small inputs in turn saved only 4.41 → 4.19 MB. Speed changed by −13% (node small) to +9% (dense). The array also keeps its largest size alive between calls. |
