import { Badge } from '@astryxdesign/core/Badge';
import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { ScrollableArea } from '@astryxdesign/core/ScrollableArea';
import { Section } from '@astryxdesign/core/Section';
import { Selector } from '@astryxdesign/core/Selector';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextArea } from '@astryxdesign/core/TextArea';
import { VStack } from '@astryxdesign/core/VStack';
import { IconShieldSearch } from '@tabler/icons-react';
import {
	type GuardrailProbeResult,
	type PlaygroundRunPayload,
	PROBE_BOUNDARIES,
	PROBE_BOUNDARY_NOTES,
	PROBE_TEXT_LIMIT,
	type ProbeBoundary,
	probeDraft,
	probeRefusal,
} from '@theoremjs/playground';
import { useState } from 'react';

const BOUNDARY_OPTIONS = PROBE_BOUNDARIES.map((value) => ({
	value,
	label: PROBE_BOUNDARY_NOTES[value].label,
}));

/** One probe sent, and what came back: the guardrails' answer, or why there is none. */
type Sent = {
	id: number;
	boundary: ProbeBoundary;
	text: string;
	result?: GuardrailProbeResult;
	error?: string;
};

type Outcome = Pick<Sent, 'result' | 'error'>;

async function sendProbe(
	payload: PlaygroundRunPayload,
	boundary: ProbeBoundary,
	text: string,
): Promise<Outcome> {
	try {
		const response = await fetch('/api/playground/probe', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...probeDraft(payload), probe: { boundary, text } }),
		});
		const body = await response.json<GuardrailProbeResult | { error?: string }>();
		if (response.ok && 'hit' in body) return { result: body };
		return { error: ('error' in body && body.error) || "The probe didn't run." };
	} catch {
		return { error: "Couldn't reach the playground server." };
	}
}

function verdict(result: GuardrailProbeResult) {
	if (result.refused) return <Badge variant="success" label="Refused" />;
	return result.hit ? (
		<Badge variant="success" label="Hit" />
	) : (
		<Badge variant="warning" label="No hit" />
	);
}

/** Who reads the text once it is past `boundary`. */
function passedLabel(boundary: ProbeBoundary): string {
	if (boundary === 'reply' || boundary === 'thought') return 'The user got';
	return boundary === 'tool_arguments' ? 'The tool got' : 'The model read';
}

function Decisions({ result }: { result: GuardrailProbeResult }) {
	const decisions = result.guardrails.filter((event) => event.hits.length > 0);
	if (!decisions.length) return null;
	return (
		<VStack gap={1}>
			{decisions.map((event) => (
				<Text key={`${event.stage}:${event.hits.map((hit) => hit.rule).join()}`} type="supporting">
					{`${event.stage} · ${event.action} · ${[...new Set(event.hits.map((hit) => hit.label ?? hit.rule))].join(', ')}`}
				</Text>
			))}
		</VStack>
	);
}

function SentProbe({ sent }: { sent: Sent }) {
	const { result, error } = sent;
	return (
		<Card variant="muted" padding={3}>
			<VStack gap={2}>
				<HStack gap={2} vAlign="center">
					{result && verdict(result)}
					<Text type="supporting" color="secondary">
						{PROBE_BOUNDARY_NOTES[sent.boundary].label}
					</Text>
				</HStack>
				<Text>{sent.text}</Text>
				{error && <Banner status="error" title={error} />}
				{result && <Decisions result={result} />}
				{result?.refused?.message && (
					<Text type="supporting" color="secondary">
						{result.refused.message}
					</Text>
				)}
				{result?.passed !== undefined && (
					<CodeBlock
						title={passedLabel(sent.boundary)}
						code={result.passed}
						language="text"
						hasLanguageLabel={false}
						isWrapped
						width="100%"
					/>
				)}
			</VStack>
		</Card>
	);
}

/**
 * Sends texts across one guardrail boundary of the compiled agent and lists what its guardrails
 * did with each, newest first. The model is scripted, so a probe spends no key.
 */
export function GuardrailTester({ payload }: { payload: PlaygroundRunPayload }) {
	const [boundary, setBoundary] = useState<ProbeBoundary>('user');
	const [text, setText] = useState('');
	const [busy, setBusy] = useState(false);
	const [sent, setSent] = useState<Sent[]>([]);
	const refusal = probeRefusal(payload.profile);
	if (refusal) {
		return <EmptyState icon={<Icon icon={IconShieldSearch} />} title={refusal} />;
	}
	const send = async () => {
		const probe = text.trim();
		if (!probe || busy) return;
		setBusy(true);
		const outcome = await sendProbe(payload, boundary, probe);
		setSent((before) => [{ id: before.length, boundary, text: probe, ...outcome }, ...before]);
		setBusy(false);
	};
	return (
		<VStack height="100%">
			<Section variant="transparent" padding={3}>
				<VStack gap={2}>
					<Selector
						label="Send as"
						size="sm"
						value={boundary}
						options={BOUNDARY_OPTIONS}
						description={PROBE_BOUNDARY_NOTES[boundary].note}
						onChange={(next) => {
							const picked = PROBE_BOUNDARIES.find((candidate) => candidate === next);
							if (picked) setBoundary(picked);
						}}
					/>
					<TextArea
						label="Text"
						isLabelHidden
						rows={4}
						maxLength={PROBE_TEXT_LIMIT}
						hasSpellCheck={false}
						placeholder="Text to send across this boundary"
						value={text}
						onChange={setText}
					/>
					<HStack>
						<Button
							label="Send"
							variant="primary"
							isLoading={busy}
							isDisabled={!text.trim()}
							onClick={() => {
								void send();
							}}
						/>
					</HStack>
				</VStack>
			</Section>
			<StackItem size="fill">
				<ScrollableArea label="Probes sent">
					<Section variant="transparent" padding={3}>
						<VStack gap={3}>
							{sent.map((probe) => (
								<SentProbe key={probe.id} sent={probe} />
							))}
						</VStack>
					</Section>
				</ScrollableArea>
			</StackItem>
		</VStack>
	);
}
