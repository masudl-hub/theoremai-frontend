export const PLAYGROUND_CTX = 'theorem-playground';

import type { Protocol, Provider } from '@theoremai/agents/schema';
import type { PlaygroundNode } from './types';

export type PlaygroundHub = {
	protocol: Protocol;
	provider: Provider;
};

export type PlaygroundUi = {
	panelNodeId: string | null;
};

export type PlaygroundCtx = {
	addModelBinding: () => void;
	addToolSpec: () => void;
	addBranchSpec: (hubId: string) => void;
	/** Live Models hub pairing — reactive when read in components */
	hub: PlaygroundHub;
	/** Reactive UI shell state (panel open/close). */
	ui: PlaygroundUi;
	patchNode: (id: string, partial: Partial<PlaygroundNode['data']>) => void;
	togglePanel: (id: string, open: boolean) => void;
	closePanel: (id: string) => void;
	toggleBranchCollapsed: (id: string) => void;
	getNodes: () => PlaygroundNode[];
};
