export type LiveCaptionTurn = {
	id: string;
	role: 'user' | 'agent';
	text: string;
};

export type LiveCaptionState = {
	turns: LiveCaptionTurn[];
	interimUser: string;
	interimAgent: string;
};

export function emptyLiveCaptionState(): LiveCaptionState {
	return { turns: [], interimUser: '', interimAgent: '' };
}

/**
 * Fold streaming ASR events into turn-by-turn caption lines.
 * Each non-interim chunk becomes its own turn — the UI previously concatenated
 * by role (`+=`), which collapsed the whole session into two blocks.
 */
export function applyLiveTranscript(
	state: LiveCaptionState,
	text: string,
	isUser: boolean,
	interim?: boolean,
): LiveCaptionState {
	if (interim) {
		return isUser ? { ...state, interimUser: text } : { ...state, interimAgent: text };
	}

	const role = isUser ? 'user' : 'agent';
	const turn: LiveCaptionTurn = {
		id: `${String(Date.now())}-${String(state.turns.length)}`,
		role,
		text,
	};

	return {
		turns: [...state.turns, turn],
		interimUser: isUser ? '' : state.interimUser,
		interimAgent: isUser ? state.interimAgent : '',
	};
}
