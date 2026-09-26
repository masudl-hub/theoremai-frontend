import { Button } from '@astryxdesign/core/Button';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { LiveSessionClient } from '@theoremai/react/client';
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { docsPath, highlightBlock } from '../lib/docs/th30-client';
import { TH30_PROFILE_ID } from '../lib/th30-id';

type Th30Api = {
	open: () => void;
	close: () => void;
};

const Th30Context = createContext<Th30Api>({
	open: () => undefined,
	close: () => undefined,
});

export function useTh30(): Th30Api {
	return useContext(Th30Context);
}

function asRecord(value: unknown): Record<string, unknown> {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	return {};
}

export function Th30Provider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [status, setStatus] = useState('idle');
	const clientRef = useRef<LiveSessionClient | null>(null);
	const navigate = useNavigate();

	const applyTool = useCallback(
		(name: string, args: Record<string, unknown>) => {
			if (name === 'navigate') {
				const slug = typeof args.slug === 'string' ? args.slug : '';
				const blockId = typeof args.blockId === 'string' ? args.blockId : undefined;
				if (slug) {
					void navigate(docsPath(slug, blockId));
					if (blockId) {
						window.setTimeout(() => {
							highlightBlock(blockId);
						}, 400);
					}
				}
			}
			if (name === 'highlight') {
				const blockId = typeof args.blockId === 'string' ? args.blockId : '';
				const label = typeof args.label === 'string' ? args.label : undefined;
				if (blockId) highlightBlock(blockId, label);
			}
		},
		[navigate],
	);

	const start = useCallback(async () => {
		if (clientRef.current) return;
		const client = new LiveSessionClient({
			profile: TH30_PROFILE_ID,
			voiceIngress: true,
			onStatusChange: (next) => {
				setStatus(next);
			},
			onToolCall: async (name, args, meta): Promise<Record<string, unknown>> => {
				applyTool(name, args);
				const live = clientRef.current;
				if (!live) return {};
				const result = await live.executeToolOnRelay({
					name,
					callId: meta.callId,
					input: args,
				});
				return asRecord(result.output);
			},
		});
		clientRef.current = client;
		setStatus('connecting');
		await client.connect();
	}, [applyTool]);

	const stop = useCallback(() => {
		clientRef.current?.disconnect();
		clientRef.current = null;
		setStatus('idle');
	}, []);

	const api: Th30Api = {
		open: () => {
			setOpen(true);
		},
		close: () => {
			setOpen(false);
			stop();
		},
	};

	return (
		<Th30Context.Provider value={api}>
			{children}
			<Dialog
				isOpen={open}
				onOpenChange={(next) => {
					setOpen(next);
					if (!next) stop();
				}}
			>
				<VStack gap={4} padding={4}>
					<Heading level={2}>T H 3 O · {status}</Heading>
					<Text color="secondary">
						Voice guide over the composed docs index. Navigate and highlight use the same block ids
						as the reader.
					</Text>
					<Button label="Start call" onClick={() => void start()} />
					<Button label="End call" variant="ghost" onClick={stop} />
				</VStack>
			</Dialog>
		</Th30Context.Provider>
	);
}
