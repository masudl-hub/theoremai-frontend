import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { StackItem } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { IconEye, IconEyeOff, IconKey, IconPlus, IconTrash } from '@tabler/icons-react';
import { isKeySlotName, type KeyVault } from '@theoremjs/agents';
import {
	type ModelBindingDraft,
	modelBindingViolation,
	type PlaygroundConnectionMode,
	sectionNote,
} from '@theoremjs/playground';
import {
	keyKind,
	type ListedProfileType,
	type ListedProvider,
	listLocalPlaygroundModels,
	listProviderModels,
	localPlaygroundConfig,
	PLAYGROUND_KEY_SLOT_CAP,
	type PlaygroundBrowserConnection,
	type PlaygroundBrowserRuntime,
	type ProviderModel,
	playgroundVault,
} from '@theoremjs/playground/browser';
import { useEffect, useMemo, useState } from 'react';
import { IconGemini, IconOpenRouter } from './brand-icons';
import { InspectorSection } from './inspector';

const withoutSlot = (vault: KeyVault, slot: string): KeyVault =>
	Object.fromEntries(Object.entries(vault).filter(([name]) => name !== slot));
type KeyEntry = { id: string; slot: string };

/** Models select execution; the vault and connection settings remain in this tab's memory. */
export function usePlaygroundConnection(
	models: readonly (Pick<ModelBindingDraft, 'protocol' | 'provider' | 'apiId'> & {
		builtInTools?: string[];
	})[],
	initialBaseUrl = 'http://127.0.0.1:11434',
	namedSlots: readonly string[] = [],
) {
	const [entries, setEntries] = useState<KeyEntry[]>([]);
	const [vault, setVault] = useState<KeyVault>({});
	const [local, setLocal] = useState<PlaygroundBrowserConnection['local']>({
		baseUrl: initialBaseUrl,
	});
	const [localModels, setLocalModels] = useState<{
		status: 'idle' | 'loading' | 'ready' | 'error';
		ids: string[];
		error?: string;
	}>({ status: 'idle', ids: [] });
	const [remoteTools, setRemoteTools] = useState(false);
	const slotNames = [...new Set([...namedSlots, ...Object.keys(vault)])].join('\n');
	const slots = useMemo(() => (slotNames ? slotNames.split('\n') : []), [slotNames]);
	// A row follows a slot the draft names or a key the vault holds; typing a slot name in the
	// editor must not leave a row behind for every prefix. Unnamed rows stay until removed.
	useEffect(() => {
		setEntries((current) => [
			...current.filter((entry) => !entry.slot || slots.includes(entry.slot)),
			...slots
				.filter((slot) => !current.some((entry) => entry.slot === slot))
				.map((slot) => ({ id: crypto.randomUUID(), slot })),
		]);
	}, [slots]);
	const hasLocal = models.some((model) => model.provider === 'local');
	useEffect(() => {
		if (!hasLocal || !local.baseUrl.trim()) {
			setLocalModels({ status: 'idle', ids: [] });
			return;
		}
		const controller = new AbortController();
		setLocalModels({ status: 'loading', ids: [] });
		const timer = window.setTimeout(() => {
			void listLocalPlaygroundModels(
				local,
				AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
			)
				.then((ids) => {
					if (!controller.signal.aborted) setLocalModels({ status: 'ready', ids });
				})
				.catch(() => {
					if (!controller.signal.aborted)
						setLocalModels({
							status: 'error',
							ids: [],
							error: 'Couldn’t load models. Check the endpoint and local server.',
						});
				});
		}, 350);
		return () => {
			window.clearTimeout(timer);
			controller.abort();
		};
	}, [hasLocal, local]);
	const hasKeys = Object.values(vault).some((key) => Boolean(key?.trim()));
	const hasProvidedModels = models.every(
		(model) => modelBindingViolation({ ...model, builtInTools: model.builtInTools ?? [] }) === null,
	);
	const mode: PlaygroundConnectionMode =
		hasLocal && models.every((model) => model.provider === 'local')
			? 'local'
			: hasLocal || hasKeys || !hasProvidedModels
				? 'byok'
				: 'demo';
	const connection = useMemo(() => {
		if (mode === 'demo') return null;
		const controller = new AbortController();
		let localConfig: ReturnType<typeof localPlaygroundConfig>;
		if (hasLocal) {
			// Invalid edits refuse execution; never fall back to the hosted demo.
			try {
				localConfig = localPlaygroundConfig(local);
			} catch (error) {
				localConfig = {
					baseUrl: local.baseUrl,
					fetch: () => Promise.reject(error instanceof Error ? error : new Error(String(error))),
				};
			}
		}
		const slotted = playgroundVault(slots, vault);
		return {
			controller,
			runtime: {
				mode,
				signal: controller.signal,
				remoteTools: hasLocal ? remoteTools : true,
				providers: { vault: slotted, ...(localConfig ? { local: localConfig } : {}) },
				decision: { vault: slotted },
			} satisfies PlaygroundBrowserRuntime,
		};
	}, [mode, hasLocal, vault, local, remoteTools, slots]);
	useEffect(
		() => () => {
			connection?.controller.abort();
		},
		[connection],
	);
	return {
		entries,
		setEntries,
		localModels,
		mode,
		runtime: connection?.runtime ?? null,
		vault,
		setVault,
		slots,
		local,
		setLocal,
		remoteTools,
		setRemoteTools,
	};
}

export type PlaygroundConnectionState = ReturnType<typeof usePlaygroundConnection>;

export type ProviderModels =
	| { status: 'idle' | 'loading'; models: ProviderModel[] }
	| { status: 'ready'; models: ProviderModel[] }
	| { status: 'error'; models: ProviderModel[]; error: string };

/** Lists already fetched this tab, by provider, profile type and key; a list barely changes. */
const listed = new Map<string, ProviderModel[]>();

/**
 * The models a provider offers for this profile type, listed with the key in the slot the model
 * reads. OpenRouter lists without a key; Gemini waits for one.
 */
export function useProviderModels(
	provider: ListedProvider | undefined,
	type: ListedProfileType,
	secret: string | undefined,
): ProviderModels {
	const key = secret?.trim() ?? '';
	const id = provider ? [provider, type, key].join('\n') : '';
	const [state, setState] = useState<ProviderModels & { id: string }>({
		id: '',
		status: 'idle',
		models: [],
	});
	useEffect(() => {
		const cached = listed.get(id);
		if (!provider || cached) {
			setState({ id, status: cached ? 'ready' : 'idle', models: cached ?? [] });
			return;
		}
		if (provider === 'google' && !key) {
			setState({ id, status: 'idle', models: [] });
			return;
		}
		const controller = new AbortController();
		setState({ id, status: 'loading', models: [] });
		const timer = window.setTimeout(() => {
			void listProviderModels(
				provider,
				type,
				key || undefined,
				AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
			)
				.then((models) => {
					listed.set(id, models);
					if (!controller.signal.aborted) setState({ id, status: 'ready', models });
				})
				.catch((error: unknown) => {
					if (!controller.signal.aborted)
						setState({
							id,
							status: 'error',
							models: [],
							error: error instanceof Error ? error.message : 'Couldn’t list models.',
						});
				});
		}, 350);
		return () => {
			window.clearTimeout(timer);
			controller.abort();
		};
	}, [id, provider, type, key]);
	// Until the effect catches up with a new key, the old list isn't this key's.
	return state.id === id ? state : { status: provider ? 'loading' : 'idle', models: [] };
}

/** What a slot holds, for a slot picker: the service its key is for, or that it is empty. */
export function slotDescription(secret: string | undefined): string {
	if (!secret?.trim()) return 'No key yet';
	const kind = keyKind(secret);
	return kind ? KEY_KINDS[kind].label : 'Key';
}

/** The icon follows the pasted key; a key whose service its prefix doesn't show gets a plain key. */
const KEY_KINDS = {
	google: { icon: IconGemini, label: 'Gemini key' },
	openrouter: { icon: IconOpenRouter, label: 'OpenRouter key' },
};

/** Key mappings use the editor's own section and compact controls. */
export function PlaygroundKeys({
	connection,
	onRenameSlot,
	onAddSlot,
	onRemoveSlot,
}: {
	connection: PlaygroundConnectionState;
	onRenameSlot?: (from: string, to: string) => void;
	onAddSlot?: (slot: string) => void;
	onRemoveSlot?: (slot: string) => void;
}) {
	return (
		<InspectorSection note={sectionNote('connection')}>
			<VStack gap={2}>
				{connection.entries.map((entry) => (
					<KeyRow
						key={entry.id}
						entry={entry}
						connection={connection}
						onRenameSlot={onRenameSlot}
						onAddSlot={onAddSlot}
						onRemoveSlot={onRemoveSlot}
					/>
				))}
				<HStack>
					<IconButton
						label="Add key"
						variant="ghost"
						size="sm"
						icon={<Icon icon={IconPlus} size="sm" />}
						isDisabled={connection.entries.length >= PLAYGROUND_KEY_SLOT_CAP}
						onClick={() => {
							connection.setEntries((current) => [
								...current,
								{ id: crypto.randomUUID(), slot: '' },
							]);
						}}
					/>
				</HStack>
			</VStack>
		</InspectorSection>
	);
}

function KeyRow({
	entry,
	connection,
	onRenameSlot,
	onAddSlot,
	onRemoveSlot,
}: {
	entry: KeyEntry;
	connection: PlaygroundConnectionState;
	onRenameSlot?: (from: string, to: string) => void;
	onAddSlot?: (slot: string) => void;
	onRemoveSlot?: (slot: string) => void;
}) {
	const [name, setName] = useState(entry.slot);
	useEffect(() => {
		setName(entry.slot);
	}, [entry.slot]);
	const [error, setError] = useState<string>();
	const [visible, setVisible] = useState(false);
	const secret = Object.hasOwn(connection.vault, entry.slot)
		? (connection.vault[entry.slot] ?? '')
		: '';
	const kind = keyKind(secret);
	// Where the profile can't drop a slot it names (the run tab), its row stays and only the key goes.
	const removable = onRemoveSlot !== undefined || !entry.slot;
	const rename = () => {
		if (name === entry.slot) return;
		if (!isKeySlotName(name)) {
			setError('Use a valid slot name, up to 32 characters.');
			return;
		}
		if (connection.entries.some((other) => other.id !== entry.id && other.slot === name)) {
			setError('This key name already exists.');
			return;
		}
		connection.setVault((current) => ({
			...withoutSlot(current, entry.slot),
			[name]: secret || undefined,
		}));
		connection.setEntries((current) =>
			current.map((other) => (other.id === entry.id ? { ...other, slot: name } : other)),
		);
		if (entry.slot) onRenameSlot?.(entry.slot, name);
		else onAddSlot?.(name);
		setError(undefined);
	};
	return (
		<HStack gap={2} vAlign="center">
			<StackItem size="static">
				<Icon
					icon={kind ? KEY_KINDS[kind].icon : IconKey}
					size="sm"
					color="secondary"
					label={kind ? KEY_KINDS[kind].label : 'Key'}
				/>
			</StackItem>
			<StackItem size="fill">
				<TextInput
					label="Key name"
					hasAutoFocus={!entry.slot}
					isLabelHidden
					size="sm"
					value={name}
					placeholder="Key name"
					onChange={setName}
					onBlur={rename}
					status={error ? { type: 'error', message: error } : undefined}
				/>
			</StackItem>
			<StackItem size="fill">
				<TextInput
					label="API key"
					isLabelHidden
					size="sm"
					type={visible ? 'text' : 'password'}
					value={secret}
					placeholder="API key"
					autoComplete="off"
					isDisabled={!entry.slot}
					onChange={(value) => {
						connection.setVault((current) => ({
							...current,
							[entry.slot]: value.trim() || undefined,
						}));
					}}
				/>
			</StackItem>
			<StackItem size="static">
				<HStack gap={1}>
					<IconButton
						label={visible ? 'Hide key' : 'Show key'}
						variant="ghost"
						size="sm"
						icon={<Icon icon={visible ? IconEyeOff : IconEye} size="sm" />}
						onClick={() => {
							setVisible((current) => !current);
						}}
					/>
					<IconButton
						label={removable ? 'Remove key' : 'Clear key'}
						variant="ghost"
						size="sm"
						icon={<Icon icon={IconTrash} size="sm" />}
						onClick={() => {
							connection.setVault((current) => withoutSlot(current, entry.slot));
							if (!removable) return;
							connection.setEntries((current) => current.filter((other) => other.id !== entry.id));
							onRemoveSlot?.(entry.slot);
						}}
					/>
				</HStack>
			</StackItem>
		</HStack>
	);
}
