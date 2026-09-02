export type PackageNode = {
	id: string;
	label: string;
	path: string;
	kind: 'package' | 'folder' | 'file';
	children?: PackageNode[];
};

/** Complete src/ tree for theorum@1.0.0 — every folder and file under src/, plus root mod.ts. */
export const packageTree: PackageNode = {
	id: 'theorum',
	label: 'Theorum',
	path: 'theorum',
	kind: 'package',
	children: [
		{ id: 'mod', label: 'mod.ts', path: 'mod.ts', kind: 'file' },
		folder('kernel', 'kernel/', 'src/kernel/', [
			file('kernel_mod', 'mod.ts', 'src/kernel/mod.ts'),
			file('kernel_types', 'types.ts', 'src/kernel/types.ts'),
			file('kernel_schema', 'schema.ts', 'src/kernel/schema.ts'),
			file('kernel_stop', 'stop.ts', 'src/kernel/stop.ts'),
			folder('kernel_engine', 'engine/', 'src/kernel/engine/', [
				file('kernel_engine_assert', 'assert.ts', 'src/kernel/engine/assert.ts'),
				file('kernel_engine_boundary', 'boundary.ts', 'src/kernel/engine/boundary.ts'),
				file('kernel_engine_canary_gate', 'canary-gate.ts', 'src/kernel/engine/canary-gate.ts'),
				file('kernel_engine_compaction', 'compaction.ts', 'src/kernel/engine/compaction.ts'),
				file('kernel_engine_delta', 'delta.ts', 'src/kernel/engine/delta.ts'),
				file('kernel_engine_hash', 'hash.ts', 'src/kernel/engine/hash.ts'),
				file(
					'kernel_engine_history_tokens',
					'history-tokens.ts',
					'src/kernel/engine/history-tokens.ts',
				),
				file('kernel_engine_live_inbound', 'live-inbound.ts', 'src/kernel/engine/live-inbound.ts'),
				file('kernel_engine_record', 'record.ts', 'src/kernel/engine/record.ts'),
				file('kernel_engine_repair', 'repair.ts', 'src/kernel/engine/repair.ts'),
				file('kernel_engine_runner', 'runner.ts', 'src/kernel/engine/runner.ts'),
				file('kernel_engine_tree', 'tree.ts', 'src/kernel/engine/tree.ts'),
				folder('kernel_engine_runner_dir', 'runner/', 'src/kernel/engine/runner/', [
					file('kernel_engine_runner_mod', 'mod.ts', 'src/kernel/engine/runner/mod.ts'),
					file('kernel_engine_runner_gates', 'gates.ts', 'src/kernel/engine/runner/gates.ts'),
					file(
						'kernel_engine_runner_schema_validation',
						'schema-validation.ts',
						'src/kernel/engine/runner/schema-validation.ts',
					),
					file('kernel_engine_runner_state', 'state.ts', 'src/kernel/engine/runner/state.ts'),
					file('kernel_engine_runner_steps', 'steps.ts', 'src/kernel/engine/runner/steps.ts'),
					file('kernel_engine_runner_stream', 'stream.ts', 'src/kernel/engine/runner/stream.ts'),
					file('kernel_engine_runner_tokens', 'tokens.ts', 'src/kernel/engine/runner/tokens.ts'),
				]),
			]),
			folder('kernel_registry', 'registry/', 'src/kernel/registry/', [
				file('kernel_registry_attachments', 'attachments.ts', 'src/kernel/registry/attachments.ts'),
				file('kernel_registry_catalog', 'catalog.ts', 'src/kernel/registry/catalog.ts'),
				file('kernel_registry_ingress', 'ingress.ts', 'src/kernel/registry/ingress.ts'),
				file('kernel_registry_profiles', 'profiles.ts', 'src/kernel/registry/profiles.ts'),
				file(
					'kernel_registry_provider_request',
					'provider-request.ts',
					'src/kernel/registry/provider-request.ts',
				),
				file('kernel_registry_resolve', 'resolve.ts', 'src/kernel/registry/resolve.ts'),
				file('kernel_registry_schemas', 'schemas.ts', 'src/kernel/registry/schemas.ts'),
				file('kernel_registry_vault', 'vault.ts', 'src/kernel/registry/vault.ts'),
			]),
			folder('kernel_tools', 'tools/', 'src/kernel/tools/', [
				file('kernel_tools_mod', 'mod.ts', 'src/kernel/tools/mod.ts'),
				file('kernel_tools_execute', 'execute.ts', 'src/kernel/tools/execute.ts'),
				file('kernel_tools_harness', 'harness.ts', 'src/kernel/tools/harness.ts'),
				file('kernel_tools_invoke', 'invoke.ts', 'src/kernel/tools/invoke.ts'),
				file('kernel_tools_project', 'project.ts', 'src/kernel/tools/project.ts'),
				file('kernel_tools_registry', 'registry.ts', 'src/kernel/tools/registry.ts'),
				file('kernel_tools_resolve', 'resolve.ts', 'src/kernel/tools/resolve.ts'),
				file('kernel_tools_schema', 'schema.ts', 'src/kernel/tools/schema.ts'),
				file('kernel_tools_types', 'types.ts', 'src/kernel/tools/types.ts'),
			]),
		]),
		folder('providers', 'providers/', 'src/providers/', [
			file('providers_mod', 'mod.ts', 'src/providers/mod.ts'),
			file('providers_create_provider', 'create-provider.ts', 'src/providers/create-provider.ts'),
			file('providers_types', 'types.ts', 'src/providers/types.ts'),
			file(
				'providers_expose_for_tests',
				'expose-for-tests.ts',
				'src/providers/expose-for-tests.ts',
			),
			folder('providers_google', 'google/', 'src/providers/google/', [
				file('providers_google_keys', 'keys.ts', 'src/providers/google/keys.ts'),
				file('providers_google_urls', 'urls.ts', 'src/providers/google/urls.ts'),
				folder(
					'providers_google_interactions',
					'interactions/',
					'src/providers/google/interactions/',
					[
						file(
							'providers_google_interactions_framing',
							'framing.ts',
							'src/providers/google/interactions/framing.ts',
						),
						file(
							'providers_google_interactions_mod',
							'mod.ts',
							'src/providers/google/interactions/mod.ts',
						),
						file(
							'providers_google_interactions_stream',
							'stream.ts',
							'src/providers/google/interactions/stream.ts',
						),
					],
				),
				folder('providers_google_live', 'live/', 'src/providers/google/live/', [
					file(
						'providers_google_live_framing',
						'framing.ts',
						'src/providers/google/live/framing.ts',
					),
					file('providers_google_live_mod', 'mod.ts', 'src/providers/google/live/mod.ts'),
					file('providers_google_live_stream', 'stream.ts', 'src/providers/google/live/stream.ts'),
				]),
			]),
			folder('providers_openrouter', 'openrouter/', 'src/providers/openrouter/', [
				file('providers_openrouter_chat', 'chat.ts', 'src/providers/openrouter/chat.ts'),
				file('providers_openrouter_speech', 'speech.ts', 'src/providers/openrouter/speech.ts'),
				folder('providers_openrouter_openai', 'openai/', 'src/providers/openrouter/openai/', [
					file(
						'providers_openrouter_openai_chat_payload',
						'chat-payload.ts',
						'src/providers/openrouter/openai/chat-payload.ts',
					),
					file(
						'providers_openrouter_openai_compat',
						'compat.ts',
						'src/providers/openrouter/openai/compat.ts',
					),
					file(
						'providers_openrouter_openai_sdk_messages',
						'sdk-messages.ts',
						'src/providers/openrouter/openai/sdk-messages.ts',
					),
				]),
			]),
			folder('providers_local', 'local/', 'src/providers/local/', [
				file('providers_local_local', 'local.ts', 'src/providers/local/local.ts'),
				file('providers_local_mod', 'mod.ts', 'src/providers/local/mod.ts'),
			]),
			folder('providers_shared', 'shared/', 'src/providers/shared/', [
				file('providers_shared_pcm', 'pcm.ts', 'src/providers/shared/pcm.ts'),
				file('providers_shared_sse', 'sse.ts', 'src/providers/shared/sse.ts'),
				file(
					'providers_shared_upstream_tap',
					'upstream-tap.ts',
					'src/providers/shared/upstream-tap.ts',
				),
				file(
					'providers_shared_upstream_tape',
					'upstream-tape.ts',
					'src/providers/shared/upstream-tape.ts',
				),
			]),
		]),
		folder('guardrails', 'guardrails/', 'src/guardrails/', [
			file('guardrails_mod', 'mod.ts', 'src/guardrails/mod.ts'),
			file('guardrails_error', 'error.ts', 'src/guardrails/error.ts'),
			file('guardrails_egress', 'egress.ts', 'src/guardrails/egress.ts'),
			file('guardrails_injection', 'injection.ts', 'src/guardrails/injection.ts'),
			file(
				'guardrails_live_outbound_gate',
				'live-outbound-gate.ts',
				'src/guardrails/live-outbound-gate.ts',
			),
			file('guardrails_normalize', 'normalize.ts', 'src/guardrails/normalize.ts'),
			file('guardrails_quota', 'quota.ts', 'src/guardrails/quota.ts'),
			file('guardrails_sanitize', 'sanitize.ts', 'src/guardrails/sanitize.ts'),
			file('guardrails_sensitive', 'sensitive.ts', 'src/guardrails/sensitive.ts'),
		]),
		folder('observability', 'observability/', 'src/observability/', [
			file('observability_mod', 'mod.ts', 'src/observability/mod.ts'),
			file('observability_trace', 'trace.ts', 'src/observability/trace.ts'),
			file('observability_trace_record', 'trace-record.ts', 'src/observability/trace-record.ts'),
			file('observability_spans', 'spans.ts', 'src/observability/spans.ts'),
			file('observability_trace_attach', 'trace-attach.ts', 'src/observability/trace-attach.ts'),
			file('observability_trace_usage', 'trace-usage.ts', 'src/observability/trace-usage.ts'),
		]),
		folder('host', 'host/', 'src/host/', [
			file('host_mod', 'mod.ts', 'src/host/mod.ts'),
			file('host_reply', 'reply.ts', 'src/host/reply.ts'),
			file('host_mint_trace', 'mint-trace.ts', 'src/host/mint-trace.ts'),
			file(
				'host_read_streaming_json',
				'readStreamingJsonStringField.ts',
				'src/host/readStreamingJsonStringField.ts',
			),
		]),
		folder('cli', 'cli/', 'src/cli/', [
			file('cli_index', 'index.ts', 'src/cli/index.ts'),
			folder('cli_commands', 'commands/', 'src/cli/commands/', [
				file('cli_commands_bench', 'bench.ts', 'src/cli/commands/bench.ts'),
				file('cli_commands_fuzz', 'fuzz-guardrails.ts', 'src/cli/commands/fuzz-guardrails.ts'),
				file('cli_commands_profile', 'profile.ts', 'src/cli/commands/profile.ts'),
				file('cli_commands_run', 'run.ts', 'src/cli/commands/run.ts'),
				file('cli_commands_test', 'test.ts', 'src/cli/commands/test.ts'),
			]),
			folder('cli_matrix', 'matrix/', 'src/cli/matrix/', [
				file('cli_matrix_fixtures', 'fixtures.ts', 'src/cli/matrix/fixtures.ts'),
				file('cli_matrix_synthesizer', 'synthesizer.ts', 'src/cli/matrix/synthesizer.ts'),
			]),
		]),
		folder('presets', 'presets/', 'src/presets/', [
			file('presets_mod', 'mod.ts', 'src/presets/mod.ts'),
			file('presets_google', 'google.ts', 'src/presets/google.ts'),
			folder('presets_google_dir', 'google/', 'src/presets/google/', [
				file(
					'presets_google_speech_voices',
					'speech-voices.ts',
					'src/presets/google/speech-voices.ts',
				),
			]),
		]),
	],
};

function file(id: string, label: string, path: string): PackageNode {
	return { id, label, path, kind: 'file' };
}

function folder(id: string, label: string, path: string, children: PackageNode[]): PackageNode {
	return { id, label, path, kind: 'folder', children };
}

/** Export-style labels for top-level package areas (matches the original wide map). */
const DISPLAY: Record<string, string> = {
	kernel: 'Kernel',
	providers: 'Providers',
	guardrails: 'Guardrails',
	observability: 'Observability',
	host: 'Host',
	cli: 'CLI',
	presets: 'Presets',
};

function _displayLabel(node: PackageNode): string {
	return DISPLAY[node.id] ?? node.label;
}

type Seg = { t: 's'; v: string } | { t: 'n'; id: string; label: string };

function n(id: string, label: string): Seg {
	return { t: 'n', id, label };
}

function s(v: string): Seg {
	return { t: 's', v };
}

/**
 * Hand-aligned wide horizontal package map matching the original aesthetic.
 * Every line preserves column spines (│) and fork connectors (├── / └──)
 * without disjointed breaks or blank voids.
 */
const WIDE_MAP_LINES: Seg[][] = [
	// SECTION 1: KERNEL
	[
		n('theorum', 'Theorum'),
		s(' ──┬── '),
		n('kernel', 'Kernel'),
		s(' ─────────┬── '),
		n('kernel_engine', 'Engine'),
		s(' ──────────────────┬── '),
		n('kernel_engine_assert', 'assert.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_engine_boundary', 'boundary.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_engine_canary_gate', 'canary-gate.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_engine_compaction', 'compaction.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_engine_delta', 'delta.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_engine_hash', 'hash.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_engine_history_tokens', 'history-tokens.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_engine_live_inbound', 'live-inbound.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_engine_record', 'record.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_engine_repair', 'repair.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_engine_runner', 'runner.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_engine_tree', 'tree.ts'),
	],
	[
		s('          │                   │                            └── '),
		n('kernel_engine_runner_dir', 'Runner'),
		s(' ──────┬── '),
		n('kernel_engine_runner_mod', 'mod.ts'),
	],
	[
		s('          │                   │                                             ├── '),
		n('kernel_engine_runner_gates', 'gates.ts'),
	],
	[
		s('          │                   │                                             ├── '),
		n('kernel_engine_runner_schema_validation', 'schema-validation.ts'),
	],
	[
		s('          │                   │                                             ├── '),
		n('kernel_engine_runner_state', 'state.ts'),
	],
	[
		s('          │                   │                                             ├── '),
		n('kernel_engine_runner_steps', 'steps.ts'),
	],
	[
		s('          │                   │                                             ├── '),
		n('kernel_engine_runner_stream', 'stream.ts'),
	],
	[
		s('          │                   │                                             └── '),
		n('kernel_engine_runner_tokens', 'tokens.ts'),
	],
	[s('          │                   │')],
	[
		s('          │                   ├── '),
		n('kernel_registry', 'Registry'),
		s(' ────────────────┬── '),
		n('kernel_registry_attachments', 'attachments.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_registry_catalog', 'catalog.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_registry_ingress', 'ingress.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_registry_profiles', 'profiles.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_registry_provider_request', 'provider-request.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_registry_resolve', 'resolve.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_registry_schemas', 'schemas.ts'),
	],
	[
		s('          │                   │                            └── '),
		n('kernel_registry_vault', 'vault.ts'),
	],
	[s('          │                   │')],
	[
		s('          │                   ├── '),
		n('kernel_tools', 'Tools'),
		s(' ───────────────────┬── '),
		n('kernel_tools_mod', 'mod.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_tools_execute', 'execute.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_tools_harness', 'harness.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_tools_invoke', 'invoke.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_tools_project', 'project.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_tools_registry', 'registry.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_tools_resolve', 'resolve.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('kernel_tools_schema', 'schema.ts'),
	],
	[
		s('          │                   │                            └── '),
		n('kernel_tools_types', 'types.ts'),
	],
	[s('          │                   │')],
	[s('          │                   ├── '), n('kernel_mod', 'mod.ts')],
	[s('          │                   ├── '), n('kernel_types', 'types.ts')],
	[s('          │                   ├── '), n('kernel_schema', 'schema.ts')],
	[s('          │                   └── '), n('kernel_stop', 'stop.ts')],
	[s('          │')],

	// SECTION 2: PROVIDERS
	[
		s('          ├── '),
		n('providers', 'Providers'),
		s(' ──────┬── '),
		n('providers_google', 'Google'),
		s(' ──────────────────┬── '),
		n('providers_google_keys', 'keys.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('providers_google_urls', 'urls.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('providers_google_interactions', 'Interactions'),
		s(' ┬── '),
		n('providers_google_interactions_mod', 'mod.ts'),
	],
	[
		s('          │                   │                            │                ├── '),
		n('providers_google_interactions_framing', 'framing.ts'),
	],
	[
		s('          │                   │                            │                └── '),
		n('providers_google_interactions_stream', 'stream.ts'),
	],
	[
		s('          │                   │                            └── '),
		n('providers_google_live', 'Live'),
		s(' ────────┬── '),
		n('providers_google_live_mod', 'mod.ts'),
	],
	[
		s('          │                   │                                             ├── '),
		n('providers_google_live_framing', 'framing.ts'),
	],
	[
		s('          │                   │                                             └── '),
		n('providers_google_live_stream', 'stream.ts'),
	],
	[s('          │                   │')],
	[
		s('          │                   ├── '),
		n('providers_openrouter', 'OpenRouter'),
		s(' ──────────────┬── '),
		n('providers_openrouter_chat', 'chat.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('providers_openrouter_speech', 'speech.ts'),
	],
	[
		s('          │                   │                            └── '),
		n('providers_openrouter_openai', 'OpenAI'),
		s(' ──────┬── '),
		n('providers_openrouter_openai_chat_payload', 'chat-payload.ts'),
	],
	[
		s('          │                   │                                             ├── '),
		n('providers_openrouter_openai_compat', 'compat.ts'),
	],
	[
		s('          │                   │                                             └── '),
		n('providers_openrouter_openai_sdk_messages', 'sdk-messages.ts'),
	],
	[s('          │                   │')],
	[
		s('          │                   ├── '),
		n('providers_local', 'Local'),
		s(' ───────────────────┬── '),
		n('providers_local_local', 'local.ts'),
	],
	[
		s('          │                   │                            └── '),
		n('providers_local_mod', 'mod.ts'),
	],
	[s('          │                   │')],
	[
		s('          │                   ├── '),
		n('providers_shared', 'Shared'),
		s(' ──────────────────┬── '),
		n('providers_shared_pcm', 'pcm.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('providers_shared_sse', 'sse.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('providers_shared_upstream_tap', 'upstream-tap.ts'),
	],
	[
		s('          │                   │                            └── '),
		n('providers_shared_upstream_tape', 'upstream-tape.ts'),
	],
	[s('          │                   │')],
	[s('          │                   ├── '), n('providers_create_provider', 'create-provider.ts')],
	[s('          │                   ├── '), n('providers_expose_for_tests', 'expose-for-tests.ts')],
	[s('          │                   ├── '), n('providers_types', 'types.ts')],
	[s('          │                   └── '), n('providers_mod', 'mod.ts')],
	[s('          │')],

	// SECTION 3: GUARDRAILS
	[
		s('          ├── '),
		n('guardrails', 'Guardrails'),
		s(' ─────┬── '),
		n('guardrails_error', 'error.ts'),
	],
	[s('          │                   ├── '), n('guardrails_injection', 'injection.ts')],
	[s('          │                   ├── '), n('guardrails_egress', 'egress.ts')],
	[
		s('          │                   ├── '),
		n('guardrails_live_outbound_gate', 'live-outbound-gate.ts'),
	],
	[s('          │                   ├── '), n('guardrails_normalize', 'normalize.ts')],
	[s('          │                   ├── '), n('guardrails_quota', 'quota.ts')],
	[s('          │                   ├── '), n('guardrails_sanitize', 'sanitize.ts')],
	[s('          │                   ├── '), n('guardrails_sensitive', 'sensitive.ts')],
	[s('          │                   └── '), n('guardrails_mod', 'mod.ts')],
	[s('          │')],

	// SECTION 4: OBSERVABILITY
	[
		s('          ├── '),
		n('observability', 'Observability'),
		s(' ──┬── '),
		n('observability_spans', 'spans.ts'),
	],
	[s('          │                   ├── '), n('observability_trace', 'trace.ts')],
	[s('          │                   ├── '), n('observability_trace_attach', 'trace-attach.ts')],
	[s('          │                   ├── '), n('observability_trace_record', 'trace-record.ts')],
	[s('          │                   ├── '), n('observability_trace_usage', 'trace-usage.ts')],
	[s('          │                   └── '), n('observability_mod', 'mod.ts')],
	[s('          │')],

	// SECTION 5: HOST
	[
		s('          ├── '),
		n('host', 'Host'),
		s(' ───────────┬── '),
		n('host_mint_trace', 'mint-trace.ts'),
	],
	[
		s('          │                   ├── '),
		n('host_read_streaming_json', 'readStreamingJsonStringField.ts'),
	],
	[s('          │                   ├── '), n('host_reply', 'reply.ts')],
	[s('          │                   └── '), n('host_mod', 'mod.ts')],
	[s('          │')],

	// SECTION 6: CLI
	[
		s('          ├── '),
		n('cli', 'CLI'),
		s(' ────────────┬── '),
		n('cli_commands', 'Commands'),
		s(' ────────────────┬── '),
		n('cli_commands_bench', 'bench.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('cli_commands_fuzz', 'fuzz-guardrails.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('cli_commands_profile', 'profile.ts'),
	],
	[
		s('          │                   │                            ├── '),
		n('cli_commands_run', 'run.ts'),
	],
	[
		s('          │                   │                            └── '),
		n('cli_commands_test', 'test.ts'),
	],
	[s('          │                   │')],
	[
		s('          │                   ├── '),
		n('cli_matrix', 'Matrix'),
		s(' ──────────────────┬── '),
		n('cli_matrix_fixtures', 'fixtures.ts'),
	],
	[
		s('          │                   │                            └── '),
		n('cli_matrix_synthesizer', 'synthesizer.ts'),
	],
	[s('          │                   │')],
	[s('          │                   └── '), n('cli_index', 'index.ts')],
	[s('          │')],

	// SECTION 7: PRESETS
	[
		s('          └── '),
		n('presets', 'Presets'),
		s(' ────────┬── '),
		n('presets_google', 'google.ts'),
	],
	[
		s('                              ├── '),
		n('presets_google_dir', 'Google'),
		s(' ──────────────────┬── '),
		n('presets_google_speech_voices', 'speech-voices.ts'),
	],
	[s('                              └── '), n('presets_mod', 'mod.ts')],
];

export function walkPackageTree(
	node: PackageNode,
	visit: (node: PackageNode, depth: number) => void,
	depth = 0,
): void {
	visit(node, depth);
	for (const child of node.children ?? []) {
		walkPackageTree(child, visit, depth + 1);
	}
}

/** Wide horizontal package map — clean, unbroken spines with full repository coverage. */
export function renderPackageTree(render: (id: string, label: string) => string): string {
	return WIDE_MAP_LINES.map((line) =>
		line.map((seg) => (seg.t === 's' ? seg.v : render(seg.id, seg.label))).join(''),
	).join('\n');
}
