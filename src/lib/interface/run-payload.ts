import type { ProfileDefinition } from 'theorum';
import { browser } from '$app/environment';
import type { StructuredRegistration, ToolRegistration } from '$lib/playground/types';

export const PLAYGROUND_RUN_PAYLOAD_KEY = 'theorum.playground.run';

export type PlaygroundRunPayload = {
	agentId: string;
	profile: ProfileDefinition;
	customTools: ToolRegistration[];
	structured?: StructuredRegistration;
};

/**
 * Persist compiled agent for the run tab. Uses `localStorage` (not `sessionStorage`)
 * so `window.open` handoffs work — session storage is per-tab only.
 */
function storage(): Storage | null {
	if (!browser) return null;
	try {
		return localStorage;
	} catch {
		return null;
	}
}

export function savePlaygroundRunPayload(payload: PlaygroundRunPayload): void {
	const store = storage();
	if (!store) return;
	store.setItem(PLAYGROUND_RUN_PAYLOAD_KEY, JSON.stringify(payload));
}

export function loadPlaygroundRunPayload(): PlaygroundRunPayload | null {
	const store = storage();
	if (!store) return null;
	const raw = store.getItem(PLAYGROUND_RUN_PAYLOAD_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as PlaygroundRunPayload;
	} catch {
		return null;
	}
}

export function clearPlaygroundRunPayload(): void {
	const store = storage();
	if (!store) return;
	store.removeItem(PLAYGROUND_RUN_PAYLOAD_KEY);
}
