import type { OutputsData } from './types';

/** Playground mirror of the kernel's mutually exclusive primary output modes. */
export type OutputRole = 'text' | 'structured' | 'image' | 'speech';

export const OUTPUT_ROLE_OPTIONS: { value: OutputRole; label: string }[] = [
	{ value: 'text', label: 'Chat (text only)' },
	{ value: 'structured', label: 'Structured JSON' },
	{ value: 'image', label: 'Image (+ interleaved text)' },
	{ value: 'speech', label: 'Speech (TTS)' },
];

export function outputRoleFromData(data: OutputsData): OutputRole {
	if (data.imageEnabled) return 'image';
	if (data.speechEnabled) return 'speech';
	if (data.mode === 'structured') return 'structured';
	return 'text';
}

export function outputRoleLabel(role: OutputRole): string {
	switch (role) {
		case 'text':
			return 'text';
		case 'structured':
			return 'structured';
		case 'image':
			return 'image';
		case 'speech':
			return 'speech';
	}
}

/** Returns every mode currently flagged — more than one means an invalid profile. */
export function conflictingOutputRoles(data: OutputsData): OutputRole[] {
	const active: OutputRole[] = [];
	if (data.mode === 'structured') active.push('structured');
	if (data.imageEnabled) active.push('image');
	if (data.speechEnabled) active.push('speech');
	return active;
}

export function patchOutputRole(role: OutputRole): Partial<OutputsData> {
	return {
		mode: role === 'structured' ? 'structured' : 'text',
		imageEnabled: role === 'image',
		speechEnabled: role === 'speech',
	};
}
