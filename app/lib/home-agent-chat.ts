/**
 * The conversation the goals screen opens on: one exchange with the concierge, written here and
 * not run. The agent gets it as history, so the next message is a follow-up.
 */
import { branchInterfaceTurnSession, emptyInterfaceTurnSession } from '@theoremjs/agents/interface';
import type { ChatSnapshot } from '@theoremjs/react';

const blocks: ChatSnapshot['blocks'] = [
	{ id: 'home-ask', kind: 'user-text', text: 'Two days in Lisbon in March. Where should I stay?' },
	{
		id: 'home-reply',
		kind: 'text',
		text: [
			'Stay in Chiado.',
			'',
			'- You can walk to Baixa, Bairro Alto and the river.',
			'- Tram 28 and the Baixa-Chiado metro are a few minutes away.',
			'- It is quieter at night than Bairro Alto.',
			'',
			'Tell me your budget and I will name a hotel.',
		].join('\n'),
	},
	{ id: 'home-done', kind: 'turn-done' },
];

export const HOME_CHAT: ChatSnapshot = {
	blocks,
	session: branchInterfaceTurnSession(emptyInterfaceTurnSession(), blocks),
};
