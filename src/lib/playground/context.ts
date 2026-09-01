export const PLAYGROUND_CTX = 'theorum-playground';

import type { Protocol, Provider } from './compat';
import type { PlaygroundNode } from './types';

export type PlaygroundHub = {
	protocol: Protocol;
	provider: Provider;
};

export type PlaygroundCtx = {
	addModelSpec: () => void;
	/** Live Models hub pairing — reactive when read in components */
	hub: PlaygroundHub;
	patchNode: (id: string, partial: Partial<PlaygroundNode['data']>) => void;
	closePanel: (id: string) => void;
	getNodes: () => PlaygroundNode[];
};
