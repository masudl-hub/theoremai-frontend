import type { TurnEvent } from 'theorum';
import type { ProfileInterface, TranscriptBlock } from 'theorum/interface';
import { encodeFiles, filesToPending } from './encode-files';
import type { PlaygroundRunPayload } from './run-payload';
import { foldAssistantTurn, projectUserTurn, streamPlaygroundTurn } from './turn-client';

export function buildDraft(text: string, pendingFiles: readonly File[]) {
	return {
		...(text.trim() ? { text } : {}),
		...(pendingFiles.length ? { attachments: filesToPending(pendingFiles) } : {}),
	};
}

export function prepareInterfaceDraft(
	iface: ProfileInterface,
	text: string,
	pendingFiles: readonly File[],
) {
	return projectUserTurn(iface, buildDraft(text, pendingFiles));
}

export async function streamInterfaceTurn(args: {
	iface: ProfileInterface;
	payload: PlaygroundRunPayload;
	text: string;
	pendingFiles: readonly File[];
	onStream: (blocks: TranscriptBlock[]) => void;
}): Promise<{ ok: true; assistantBlocks: TranscriptBlock[] } | { ok: false; error: string }> {
	const events: TurnEvent[] = [];
	try {
		const prepared = prepareInterfaceDraft(args.iface, args.text, args.pendingFiles);
		if (!prepared.ok) {
			return { ok: false, error: prepared.issues.join(' ') };
		}

		const encodedAttachments = args.pendingFiles.length
			? await encodeFiles(args.pendingFiles)
			: undefined;

		await streamPlaygroundTurn(
			{
				profile: args.payload.profile,
				customTools: args.payload.customTools,
				structured: args.payload.structured,
				input: {
					...(prepared.draft.text ? { text: prepared.draft.text } : {}),
					...(encodedAttachments ? { attachments: encodedAttachments } : {}),
				},
			},
			(event) => {
				events.push(event);
				args.onStream(foldAssistantTurn(args.iface, events));
			},
		);

		return { ok: true, assistantBlocks: foldAssistantTurn(args.iface, events) };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return { ok: false, error: message };
	}
}
