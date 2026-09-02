import type { PlaygroundNode } from '$lib/playground/types';

export type KernelMeta = {
	version: string;
	submoduleHead: string | null;
};

export type TurnRequestPayload = {
	/** Facet graph from the playground canvas. */
	nodes: PlaygroundNode[];
	text: string;
	/** First model.select key when omitted. */
	select?: string;
};

export type TurnResponsePayload =
	| {
			ok: true;
			agentId: string;
			stop: unknown;
			text: string;
			trace?: unknown[];
	  }
	| {
			ok: false;
			error: string;
	  };
