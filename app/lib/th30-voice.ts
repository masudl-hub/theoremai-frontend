/**
 * The call's live levels, 0 to 1. The light and the strip read them every frame,
 * so a level change never re-renders React.
 */
export const th30Voice = { user: 0, agent: 0 };

/** The louder of the two voices, for anything that only needs "someone is speaking". */
export function voiceLevel(): number {
	return Math.max(th30Voice.user, th30Voice.agent);
}
