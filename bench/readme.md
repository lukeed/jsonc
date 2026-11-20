# Benchmarks

Speed and memory of this package against [`jsonc`](https://www.npmjs.com/package/jsonc) and [`strip-json-comments`](https://www.npmjs.com/package/strip-json-comments). `strip-json-comments` is the stripper that `jsonc` uses.

## Setup

- CPU: AMD EPYC 9V45 96-Core Processor, ~4.3 GHz, shared VM with 8 vCPUs, Linux 7.0.0
- Runtimes: bun 1.4.4, node 26.13.1 for the results below. History rows up to `384ad93` used bun 1.4.3 and node 26.12.0.
- Packages: jsonc 3.0.0, strip-json-comments 5.0.3, mitata 1.0.34
- Options: `jsonc.parse(input, { allowTrailingCommas: true })` and `strip(input, { trailingCommas: true })`, so all libraries do the same work.

Check the CPU load before each run, with `uptime` and `mpstat 1 3`. Other work on the machine changed results by up to 50%, also for code that did not change. Run only when the CPUs are at least 95% idle.

This directory is the `bench` workspace. `index.ts` measures speed, `memory.ts` measures memory, and `fixtures.ts` has the inputs. The other libraries are dev dependencies in `package.json`.

Run from the project root:

```sh
bun run bench speed    # bun, then node
bun run bench memory   # bun, then node
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
| unicode | 625 KB    | 5000 items with non-ASCII chars (`é`, `中`, `😀`) in strings and comments                                              |

## Results

Results for commit `bc13505` on branch `dev/u8`. The CPUs were 94–98% idle for all runs. "Faster" is npm divided by local.

`toJSON` has one scanner. It encodes the input to UTF-8 bytes, writes spaces in place, and decodes once. Inputs of up to 5461 chars encode into one fixed 16 KB module-level buffer; larger inputs get their own buffer from `TextEncoder.encode()`.

### Speed: `parse`

| fixture | bun local | bun npm:jsonc | faster | node local | node npm:jsonc | faster |
| ------- | --------- | ------------- | ------ | ---------- | -------------- | ------ |
| small   | 440 ns    | 8.63 µs       | 19.6x  | 974 ns     | 3.79 µs        | 3.9x   |
| medium  | 35.6 µs   | 907 µs        | 25.5x  | 57.0 µs    | 343 µs         | 6.0x   |
| large   | 1.69 ms   | 80.8 ms       | 47.8x  | 3.12 ms    | 22.1 ms        | 7.1x   |
| plain   | 1.44 ms   | 49.9 ms       | 34.7x  | 2.78 ms    | 17.7 ms        | 6.4x   |
| dense   | 2.34 ms   | 125.6 ms      | 53.7x  | 3.74 ms    | 42.8 ms        | 11.5x  |
| unicode | 1.88 ms   | 49.9 ms       | 26.5x  | 2.86 ms    | 15.2 ms        | 5.3x   |

### Speed: `toJSON`

| fixture | bun local | bun strip-json-comments | faster | node local | node strip-json-comments | faster |
| ------- | --------- | ----------------------- | ------ | ---------- | ------------------------ | ------ |
| small   | 282 ns    | 7.79 µs                 | 27.6x  | 328 ns     | 2.66 µs                  | 8.1x   |
| medium  | 16.9 µs   | 833 µs                  | 49.2x  | 23.4 µs    | 298 µs                   | 12.8x  |
| large   | 805 µs    | 51.1 ms                 | 63.4x  | 1.25 ms    | 17.7 ms                  | 14.1x  |
| plain   | 483 µs    | 43.6 ms                 | 90.2x  | 865 µs     | 14.6 ms                  | 16.8x  |
| dense   | 1.46 ms   | 98.4 ms                 | 67.4x  | 2.33 ms    | 39.3 ms                  | 16.9x  |
| unicode | 1.25 ms   | 34.8 ms                 | 27.9x  | 1.97 ms    | 14.1 ms                  | 7.2x   |

### Memory: bytes allocated per call (node)

From V8's `total_allocated_bytes` counter. Bun has no such counter. The counter does not see `Uint8Array` storage, and it does not seem to see the decoded output string either (`dense` shows 22 KB for a 1.2 MB output). So the local values are too low; use the peak values below.

| fixture | parse local | parse npm:jsonc | toJSON local | toJSON strip-json-comments |
| ------- | ----------- | --------------- | ------------ | -------------------------- |
| small   | 796 B       | 7.2 KB          | 444 B        | 6.6 KB                     |
| medium  | 50.2 KB     | 742 KB          | 19.3 KB      | 697 KB                     |
| large   | 2.05 MB     | 36.0 MB         | 895 KB       | 34.0 MB                    |
| plain   | 1.19 MB     | 29.3 MB         | 2.9 KB       | 27.3 MB                    |
| dense   | 944 KB      | 64.2 MB         | 22.1 KB      | 62.1 MB                    |
| unicode | 2.08 MB     | 30.1 MB         | 1.20 MB      | 28.0 MB                    |

### Memory: extra peak RSS for one call

One call in a fresh process, minus a process that only reads the input. Every version is loaded in every process, so all share one baseline. Median of 7 runs. On Linux this uses `VmHWM`, because `maxRSS` is inherited from the parent process across exec. Differences under a few MB are noise.

| fixture | runtime | parse local | parse npm:jsonc | toJSON local | toJSON strip-json-comments |
| ------- | ------- | ----------- | --------------- | ------------ | -------------------------- |
| large   | bun     | 9.5 MB      | 40.7 MB         | 7.4 MB       | 38.6 MB                    |
| large   | node    | 3.7 MB      | 23.4 MB         | 2.8 MB       | 22.6 MB                    |
| plain   | bun     | 7.4 MB      | 36.7 MB         | 5.2 MB       | 34.2 MB                    |
| plain   | node    | 2.9 MB      | 15.1 MB         | 2.1 MB       | 13.1 MB                    |
| dense   | bun     | 12.0 MB     | 45.6 MB         | 10.1 MB      | 44.2 MB                    |
| dense   | node    | 3.5 MB      | 30.6 MB         | 3.3 MB       | 28.4 MB                    |
| unicode | bun     | 9.2 MB      | 42.2 MB         | 7.4 MB       | 40.6 MB                    |
| unicode | node    | 3.9 MB      | 20.2 MB         | 3.6 MB       | 18.0 MB                    |

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

### Byte scanner (`dev/u8`)

`e372110` added the byte scanner, `690fe46` tuned it, `bcb6e06` raised its threshold, and `f2f5d47` changed it to encode in one call. Compared with `main` (`77faad6`) in one process, CPUs 97% idle. Values are bun / node.

| fixture | main             | dev/u8                             |
| ------- | ---------------- | ---------------------------------- |
| small   | 341 / 464 ns     | 355 / 486 ns (same scanner, noise) |
| medium  | 31.7 / 53.6 µs   | 19.1 / 17.9 µs                     |
| large   | 1.46 / 2.38 ms   | 0.89 / 1.11 ms                     |
| plain   | 616 µs / 1.03 ms | 621 / 559 µs                       |
| dense   | 3.37 / 6.57 ms   | 1.75 / 1.86 ms                     |
| unicode | 1.14 / 2.14 ms   | 1.21 / 1.93 ms                     |

Peak RSS for one `toJSON` call, main → dev/u8: bun large 11.1 → 7.3 MB, dense 15.9 → 10.3 MB, unicode 8.9 → 7.6 MB, plain 3.9 → 5.1 MB (the encode buffer); node large 11.0 → 2.9 MB, dense 16.7 → 3.7 MB, unicode 8.7 → 3.8 MB, plain 4.7 → 2.1 MB.

Tuning steps:

- Search for `*/` with a byte loop, not `Uint8Array.prototype.indexOf`: the call cost was more than it saved on short comments (large 0.89 → 0.72 ms on bun, 1.23 → 0.84 ms on node).
- Decode the buffer itself when nothing shifted, not `buf.subarray(0, w)`: `subarray` made bun's decode much slower on small input (359 chars: 885 → 435 ns).
- Threshold 2048 chars: node's `TextEncoder` costs about 1 µs per call. With 512, ASCII input was already faster on node, but non-ASCII input under about 2000 chars was up to 2x slower. At 2048 the byte scanner is faster for both on bun and node.
- `encode()`, not `encodeInto()` into a buffer of input length: on bun, `encodeInto` into a buffer too small for non-ASCII input took 1.36 ms on `unicode`, against 0.17 ms for `encode()`.

### Single scanner (`dev/u8`)

`bc13505` drops the slice scanner, so `toJSON` has one scanner for all inputs. `toJSON`, with each version in its own process, CPUs 87–98% idle. "two" is `96dd167`, the two-scanner version. Values are bun / node.

| input          | main             | two            | single         |
| -------------- | ---------------- | -------------- | -------------- |
| small (191)    | 320 / 484 ns     | 356 / 471 ns   | 256 / 249 ns   |
| ASCII 715      | 1.29 / 2.09 µs   | 1.34 / 2.16 µs | 0.78 / 0.89 µs |
| ASCII 2851     | 4.72 / 8.54 µs   | 2.84 / 4.36 µs | 2.78 / 3.07 µs |
| non-ASCII 181  | 348 / 558 ns     | 341 / 587 ns   | 392 / 365 ns   |
| non-ASCII 2851 | 4.62 / 8.32 µs   | 3.38 / 4.32 µs | 3.20 / 3.11 µs |
| medium         | 32.7 / 52.4 µs   | 19.5 / 18.0 µs | 18.1 / 19.7 µs |
| large          | 1.44 / 2.42 ms   | 0.84 / 0.90 ms | 0.87 / 0.98 ms |
| plain          | 619 µs / 1.03 ms | 597 / 554 µs   | 613 / 621 µs   |
| dense          | 3.51 / 6.44 ms   | 1.73 / 1.86 ms | 1.65 / 2.00 ms |
| unicode        | 1.17 / 2.49 ms   | 1.31 / 1.94 ms | 1.18 / 1.95 ms |

On node, the single scanner is 8–12% slower than "two" on large ASCII inputs. The code path for those inputs is the same in both, apart from the encode branch; the gap went from 12–49% to 8–12% with the BOM fix below, and no other change closed it. Peak RSS is the same as "two" within ±0.3 MB.

Steps:

- Reuse one fixed 16 KB buffer for inputs of up to 5461 chars (3 bytes per char at most). On node, `new Uint8Array(191)` costs about 1.07 µs, against under 1 ns on bun. `TextEncoder.encode()` and `encodeInto()` into a new buffer cost about the same, so the allocation was the cost, not the encoding.
- Use the default `TextDecoder`: `ignoreBOM: true` cost 127 ns against 54 ns on node for 191 bytes. The output never starts with U+FEFF, because a leading BOM becomes a space.
- Lone surrogates: `TextEncoder` writes each as U+FFFD, which is also one UTF-16 unit, so output positions still match the input. `restore()` puts the input's surrogates back, only when `isWellFormed()` is false.
- Check for a BOM in the buffer, not with `input.charCodeAt(0)`: on node, the string read made large inputs 10–25% slower.

### Rejected

| change                                                                                                   | result                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blank comments with a regex replace of character runs instead of single characters                       | Slower on node, mixed on bun.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Skip strings with `indexOf('"')` instead of a character loop                                             | 4–14% slower on short strings, 6.5x (bun) and 8.5x (node) faster on strings of about 540 characters. Most JSONC input is config with short strings.                                                                                                                                                                                                                                                                                                   |
| Fall back to the slice scanner for non-ASCII input under 2048 chars, with a 512-char threshold for ASCII | The wasted partial `encodeInto` cost more than it saved: node non-ASCII 1071 chars went 3.66 → 4.44 µs, against 3.06 µs for the slice scanner.                                                                                                                                                                                                                                                                                                        |
| Fill the buffer with a `charCodeAt` loop for small ASCII inputs, instead of `TextEncoder`                | Slower than `TextEncoder` on both runtimes (node 191 chars: 1.69 µs against 1.31 µs). The cost on node was the buffer allocation, not the encoder.                                                                                                                                                                                                                                                                                                    |
| Drop `ignoreBOM: true` from the decoder (two-scanner version)                                            | No gain beyond noise at that time. The single scanner drops it, because of its cost on small inputs.                                                                                                                                                                                                                                                                                                                                                  |
| Reuse one module-level parts array across calls                                                          | `length = 0` frees the backing store in V8, so allocation did not change. Writing by index, then `fill("")` after `join`, cut node allocations on repeated input (large 4.38 → 2.61 MB, dense 9.51 → 5.43 MB). But `length = n` shrinks the array when input size changes, so large and small inputs in turn saved only 4.41 → 4.19 MB. Speed changed by −13% (node small) to +9% (dense). The array also keeps its largest size alive between calls. |
