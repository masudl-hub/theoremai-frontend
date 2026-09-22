/**
 * Turn-composer voice draft wiring — prepareUserTurn + encoded voice blobs.
 *
 * Run: npx vite-node scripts/pressure-interface-voice.mjs
 */
import assert from 'node:assert/strict';
import { defineProfile } from '@theoremai/agents';
import { interfaceFromProfile, prepareUserTurn } from '@theoremai/agents/interface';
import { filesToPending } from '../../theoremai/react/src/client/encode-files.ts';
import {
	float32RmsToLevel,
	INPUT_LEVEL_GAIN,
	timeDomainBytesToLevel,
} from '../../theoremai/react/src/client/audio-level.ts';

const profile = defineProfile({
	id: 'pressure.voice.composer',
	type: 'text',
	identity: { handle: 'voice_bot' },
	models: {
		gemini35FlashLite: {
			protocol: 'openAi',
			provider: 'openrouter',
			apiId: 'google/gemini-2.5-flash-lite',
			efforts: { normal: 'minimal' },
			summaries: true,
			maxOutputTokens: 1024,
			temperature: 1,
			builtInTools: [],
		},
	},
	tools: { allow: [] },
	inputs: {
		text: true,
		voice: { accept: ['audio/webm', 'audio/wav'] },
		maxFiles: 2,
		maxBytes: 1_000_000,
		maxTurnBytes: 2_000_000,
	},
});

const iface = interfaceFromProfile(profile);
const voiceFile = new File([new Uint8Array([1, 2, 3])], 'voice-note.webm', {
	type: 'audio/webm',
});

const draft = {
	voice: filesToPending([voiceFile]),
};
assert.equal(draft.voice.length, 1);
assert.equal(draft.voice[0]?.name, 'voice-note.webm');

const prepared = prepareUserTurn(
	iface.inputs,
	{ voice: filesToPending([voiceFile]) },
	iface.guardrails,
);
assert.equal(prepared.ok, true);
if (!prepared.ok) throw new Error('expected prepared draft');
assert.equal(prepared.blocks.some((block) => block.kind === 'user-voice'), true);

const silent = new Float32Array(128);
assert.equal(float32RmsToLevel(silent), 0);
assert.equal(INPUT_LEVEL_GAIN, 4);

const loud = new Float32Array(128).fill(0.25);
assert.ok(float32RmsToLevel(loud) > 0.5);

const bytes = new Uint8Array(128).fill(128);
assert.equal(timeDomainBytesToLevel(bytes), 0);

console.log('pressure-interface-voice: ok');
