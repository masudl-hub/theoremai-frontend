---
title: Command-Line Evals & Testing
updated: 2026-10-30
summary: Command line test runner for batch evals, prompt regression matrix testing, and trace replays.
entry: src/cli/index.ts
covers: src/cli, src/cli/commands
cover: /imagery/th30_autumn.png
coverAlt: Fiery orange and crimson autumn tree leaves in dense woodland
coverPosition: 50% 50%
---

Automated evaluation and regression testing must integrate into continuous integration (CI) workflows, pre-push git hooks, and headless test runners. Spinning up web browsers or HTTP servers to verify model behavior introduces flakiness, latency, and unnecessary architectural complexity.

Theorem includes a command-line interface, `@theoremjs/agents/cli`. The `agents` binary runs eval suites against live models or recorded traces, runs test turns against a profile, inspects registered profiles, and runs adversarial guardrail fuzzers. It does not embed your app's profiles. Give `test`, `run` or `profile` your [setup file](/docs/studio/setup#the-setup-file) with `--setup`, and they use your app's own wiring. Run `agents help` for the full list.

## Command Inventory

| Command | Purpose | Key Flags |
| :--- | :--- | :--- |
| [`agents eval`](#1-eval-suite-execution-agents-eval) | Evaluates a test suite module against live models or recorded trace cassettes | `--recorded`, `--trials`, `--threshold`, `--concurrency`, `--max-cost-usd`, `--json` |
| [`agents test`](#2-stress-testing-matrix-agents-test) | Runs a ping or a stress turn against one profile, or all of them | `--setup`, `--profile`, `--all`, `--lite`, `--matrix`, `--mode`, `--search`, `--map`, `--trace`, `--trace-dir`, `--verbose` |
| [`agents run`](#3-interactive-turn-execution-agents-run) | Executes a single turn against a registered profile with live streaming output | `--setup`, `--profile`, `--prompt`, `--mode`, `--search`, `--map`, `--trace`, `--trace-dir`, `--verbose` |
| [`agents profile`](#4-profile-introspection-agents-profile) | Lists registered profiles, or prints one as JSON | `--setup`, `list`, `show <id>` |
| [`agents fuzz`, `agents fuzz-canary`](#5-adversarial-red-teaming--fuzzing) | Fuzzes inbound sanitization and canary egress gates | none |
| [`agents bench`](#6-synthetic-kernel-benchmarks-agents-bench) | Measures the kernel's own overhead against a mock provider | `--chunks`, `--iterations`, `--warmup` |
| `agents studio` | Runs the studio this project installed (`@theoremjs/studio`), with its own arguments | `status`, `errors` |

## Installation & Invocation

The CLI is packaged inside `@theoremjs/agents` as the `agents` binary. The package needs Node 20 or later:

```bash
agents <command> [options]
```

> [!NOTE]
> The CLI operates on `defaultKernelScope` and reads no API key. `test` and `run` use the keys your `--setup` wiring's provider holds. For `agents eval`, export `provider` from the suite module, or pass `--recorded <traces>`.

## Run on Your App's Wiring (`--setup`)

`--setup <file>` tests or runs a profile exactly as your app runs it. It takes the same setup file Studio reads:

```bash
agents test --setup studio.setup.ts --profile research.scout --lite
agents run --setup studio.setup.ts --profile research.scout --prompt "ping"
```

The CLI loads the setup file, then the entry it names, and reads the entry's `theorem` export. Then it:

1. Calls `theorem.register` once.
2. Sends each turn through `theorem.prepare`. The profile stays the one `--profile` names.
3. Runs each turn on `theorem.provider`.

`agents profile --setup <file>` registers your profiles the same way before it lists or shows them.

`test` and `run` send no slots and no conditions. A profile with a prompt line that reads one needs `theorem.prepare` to state it, or the turn is refused with a `request` error. The scout's `reader` slot is such a slot, so the samples on this page need a `prepare` that chooses it.

Without `--setup`, `test` and `run` have no provider, so they fail and exit `1`. A setup file with no `entry`, an entry with no `theorem`, or a setup file that still exports `default` or `provider` stops the command with the same message Studio gives. Under Node, the setup file and the entry must be files Node can import.

## 1. Eval Suite Execution (`agents eval`)

The `eval` command evaluates an [`EvalSuite`](/docs/observability/evals) module against live providers or recorded trace files.

### Live Suite Execution

Run a test suite against live models with concurrency and cost guardrails:

```bash
agents eval ./evals/research-scout.eval.ts \
	--trials 3 \
	--concurrency 2 \
	--threshold 0.95 \
	--max-cost-usd 2.50 \
	--trace-dir /var/log/theorem/evals
```

- **`--trials <k>`**: Number of repetitions per test case, overriding the suite's default `trials.repeat`.
- **`--concurrency <n>`**: Number of concurrent trial runs in flight (defaults to `1`).
- **`--threshold <fraction>`**: The required fraction of decided cases that must pass for exit code `0` (defaults to `1.0`, meaning 100% pass required).
- **`--max-cost-usd <n>`**: Cost ceiling. The runner stops launching new trials once accumulated model spend crosses this dollar limit.
- **`--trace-dir <path>`**: Appends the trial and run records as JSON Lines under the directory.

### Offline Cassette Grading

To grade earlier runs in CI without running the profile again, grade recorded traces:

```bash
agents eval ./evals/research-scout.eval.ts \
	--recorded ./tests/cassettes/research/ \
	--threshold 1.0 \
	--json
```

`--recorded` takes a `.jsonl` file, or a directory whose `.jsonl` files are read in name order. The CLI does not run the profile. It runs the suite's graders over the recorded records. A `judge` grader still calls its judge profile.

## 2. Stress Testing Matrix (`agents test`)

The `test` command runs test turns against a profile, so you can see that it answers, takes its attachments and voice, and switches models:

```bash
# One ping turn
agents test --setup studio.setup.ts --profile research.scout --lite

# A ping turn and a stress turn
agents test --setup studio.setup.ts --profile research.scout --matrix --trace

# Every registered profile
agents test --setup studio.setup.ts --all --lite
```

### Lite, Stress and Matrix

- **Lite (`--lite`)**: Sends one short ping. It uses the `fast` model when the profile has one and `allowModelSelect` is on.
- **Stress (no `--lite`)**: Sends one request built from test fixtures:
  - A text prompt.
  - One attachment, when the profile accepts attachments: a PNG, PDF or plain-text fixture, in that order of preference, or a fixture for the first type it accepts.
  - A 0.1 second, 16 kHz WAV clip, when the profile accepts voice.
  - The `smart` model when `allowModelSelect` is on and the profile has one; otherwise the last model, when there is more than one. `--mode <id>` picks the model instead.
- **Matrix (`--matrix`)**: Runs both the Lite and the Stress turn.
- **`--search`, `--map`**: Fail the test unless the model has `googleSearch` or `googleMaps` in its `builtInTools`.

Each turn prints its setup, its events, and a status line. A summary of every turn follows. The base `research.scout` has no `smart` model and takes no attachments or voice, so its stress turn runs on its last model, `gemini`, with the text prompt alone:

```text
▶ [THEOREM TEST] research.scout [Stress Combo]
  Profile:     research.scout (Model: gemini)
  Custom:      search_web, read_pages, list_arxiv, search_models, search_datasets, read_model_card, read_dataset_card, search_github, read_readme, find_library, read_library_docs, ask_repo_docs, export_report, check_device
  Builtins:    none
  Attachments: 0 file(s) | Voice: no
  ------------------------------------------------------------

  ✓ STATUS: PASSED (took 2.14s, 1420 tokens, includes estimates)
```

The command exits `1` when any turn fails.

## 3. Interactive Turn Execution (`agents run`)

Execute a single prompt from the terminal with real-time streaming output and event logging:

```bash
agents run \
	--setup studio.setup.ts \
	--profile research.scout \
	--prompt "Find recent papers, models, or datasets on episodic memory for language models." \
	--mode gemini \
	--verbose \
	--trace
```

The command exits `1` when the turn cannot run or ends in an error.

### Diagnostic Flags

- **`--verbose`, `-v`**: Prints raw internal error details (`errorInternal`) and upstream evidence payloads (`evidence.raw`) during turn execution.
- **`--trace`**: Dumps the complete `TraceRecord` JSON structure to standard error upon turn completion.
- **`--trace-dir <dir>`**: Persists trace JSON Lines files to disk for downstream telemetry pipelines.

## 4. Profile Introspection (`agents profile`)

Inspect the profiles registered in the default scope, to check their models, inputs and tools:

```bash
# List all registered profiles
agents profile list --setup studio.setup.ts

# Print one profile as JSON
agents profile show research.scout --setup studio.setup.ts
```

`list` prints a card for each profile: its handle and type, its model ids, its inputs, its tools and its structured output. A profile whose slot picks its reply shape, as the scout's `focus` does, prints `custom`:

```text
 • Profile: research.scout   (handle: scout) [text]
   - Models:     open, gemini
   - Inputs:     text
   - Tools:      search_web, read_pages, list_arxiv, search_models, search_datasets, read_model_card, read_dataset_card, search_github, read_readme, find_library, read_library_docs, ask_repo_docs, export_report, check_device
   - Structured: custom
----------------------------------------------------------------------
```

## 5. Adversarial Red-Teaming & Fuzzing

The CLI includes fuzzers for the guardrails, and a compiler for detector patterns:

```bash
# Fuzz inbound sanitization
agents fuzz

# Fuzz canary egress gates (stream and Live)
agents fuzz-canary

# Compile the patterns in a module's detect setting
agents detect-compile ./src/guardrails/custom-rules.ts --out ./src/guardrails/compiled.ts
```

- **`fuzz`**: Runs the adversarial inbound fuzzer. It exits `1` when an expected catch is missed.
- **`fuzz-canary`**: Runs the adversarial canary egress fuzzer over streamed replies and Live gates. It exits `1` when it fails.
- **`detect-compile`**: Compiles the patterns of the module's `detect` export and writes them to `--out`. Use `--export <name>` to read a different export.

## 6. Synthetic Kernel Benchmarks (`agents bench`)

To measure the overhead of the Theorem kernel itself, apart from network latency, run the benchmark:

```bash
agents bench --chunks 200 --iterations 50 --warmup 5
```

The benchmark registers a mock provider. It reads the provider's stream raw, then runs the same stream through `runTurn`. For each, it prints the median, p95 and mean of:
- **Time to First Event (TTFE)**: Profile resolution and provider setup, up to the first event.
- **Time to First Token (TTFT)**: From the request to the first text delta.
- **Throughput**: Text events per second.

It then prints the kernel's overhead over the raw stream, a breakdown of the setup phase, how sanitizing scales with input length, and per-event micro-benchmarks. The defaults are 200 chunks, 50 iterations and 5 warmup runs.

## Related Guides

* **[Trace Spans Catalog](/docs/observability)**: Catalog of kernel trace spans and telemetry structures emitted by `--trace`.
* **[Telemetry Destinations](/docs/observability/destinations)**: Exporting trace files collected via `--trace-dir` into OpenTelemetry and Datadog.
* **[Evals & Benchmarks](/docs/observability/evals)**: Authoring `EvalSuite` specifications and custom trajectory graders.
* **[The Five Boundaries](/docs/guardrails)**: Guardrail enforcement tested by `fuzz` and `fuzz-canary`.
