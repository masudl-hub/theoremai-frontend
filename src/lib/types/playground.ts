export type KernelMeta = {
	version: string;
	submoduleHead: string | null;
};

export type TurnRequestPayload = {
	profileId: string;
	text: string;
};

export type TurnResponsePayload =
	| {
			ok: true;
			stop: unknown;
			text: string;
			trace?: unknown[];
	  }
	| {
			ok: false;
			error: string;
	  };
