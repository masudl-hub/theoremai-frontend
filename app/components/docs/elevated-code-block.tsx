import { Badge } from '@astryxdesign/core/Badge';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Divider } from '@astryxdesign/core/Divider';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { Text } from '@astryxdesign/core/Text';
import { Token, type TokenColor } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import {
	IconActivity,
	IconArrowLeft,
	IconArrowRight,
	IconCode,
	IconCpu,
	IconDatabase,
	IconExternalLink,
	IconPlayerPlay,
	IconRobot,
	IconShieldCheck,
	IconTool,
} from '@tabler/icons-react';
import {
	type CSSProperties,
	type ReactNode,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { CopyIconButton } from './copy-button';

export interface ElevatedTokenSpec {
	id: string;
	literal: string;
	label: string;
	kind?: 'profile' | 'model' | 'tool' | 'ingress' | 'egress' | 'guardrail' | 'stream' | 'store';
	color?: TokenColor;
}

function tokenIcon(kind: ElevatedTokenSpec['kind']): ReactNode {
	switch (kind) {
		case 'profile':
			return <Icon icon={IconRobot} size="sm" />;
		case 'model':
			return <Icon icon={IconCpu} size="sm" />;
		case 'tool':
			return <Icon icon={IconTool} size="sm" />;
		case 'ingress':
			return <Icon icon={IconArrowRight} size="sm" />;
		case 'egress':
			return <Icon icon={IconArrowLeft} size="sm" />;
		case 'guardrail':
			return <Icon icon={IconShieldCheck} size="sm" />;
		case 'stream':
			return <Icon icon={IconActivity} size="sm" />;
		case 'store':
			return <Icon icon={IconDatabase} size="sm" />;
		default:
			return undefined;
	}
}

interface NamePosition {
	id: string;
	line: number;
	column: number;
	literal: string;
	room: number;
	token: ElevatedTokenSpec;
}

/** Extracts names in code matching token literals */
function findTokensInCode(lines: readonly string[], tokenSpecs: readonly ElevatedTokenSpec[]): NamePosition[] {
	const out: NamePosition[] = [];
	const map = new Map(tokenSpecs.map((spec) => [spec.literal, spec]));

	lines.forEach((text, lineIdx) => {
		for (const [literal, spec] of map.entries()) {
			const col = text.indexOf(literal);
			if (col !== -1) {
				// Estimate character room for token (approx 1 token = 14-22 chars room)
				const room = Math.max(literal.length, spec.label.length + 6);
				out.push({
					id: `${spec.id}-${String(lineIdx)}-${String(col)}`,
					line: lineIdx,
					column: col,
					literal,
					room,
					token: spec,
				});
			}
		}
	});

	return out;
}

/** Expands monospace text room for tokens */
function formatCodeWithRoom(lines: readonly string[], positions: readonly NamePosition[]) {
	const posByLine = new Map<number, NamePosition[]>();
	for (const pos of positions) {
		const existing = posByLine.get(pos.line) ?? [];
		existing.push(pos);
		posByLine.set(pos.line, existing);
	}

	return lines
		.map((text, lineIdx) => {
			const inLine = posByLine.get(lineIdx);
			if (!inLine || inLine.length === 0) return text;

			// Sort right-to-left so replacing does not shift earlier column offsets
			const sorted = [...inLine].sort((a, b) => b.column - a.column);
			let out = text;
			for (const p of sorted) {
				const padding = ' '.repeat(p.room);
				out = out.slice(0, p.column) + padding + out.slice(p.column + p.literal.length);
			}
			return out;
		})
		.join('\n');
}

export function ElevatedCodeBlock({
	code,
	language = 'typescript',
	seed,
	tokens = [],
}: {
	code: string;
	language?: string;
	seed?: string;
	tokens?: readonly ElevatedTokenSpec[];
}) {
	const [view, setView] = useState<'code' | 'studio' | 'preview'>('code');
	const lines = useMemo(() => code.split('\n'), [code]);
	const positions = useMemo(() => findTokensInCode(lines, tokens), [lines, tokens]);
	const displayCode = useMemo(() => {
		if (tokens.length === 0) return code;
		return formatCodeWithRoom(lines, positions);
	}, [code, lines, positions, tokens]);

	const codeRef = useRef<HTMLDivElement>(null);
	const [tokenCoords, setTokenCoords] = useState<Map<string, { x: number; y: number }>>(new Map());

	useLayoutEffect(() => {
		if (tokens.length === 0 || view !== 'code') return;
		const container = codeRef.current;
		if (!container) return;

		const measure = () => {
			const coords = new Map<string, { x: number; y: number }>();
			const lineElements = container.querySelectorAll<HTMLElement>('[data-line]');
			const rootRect = container.getBoundingClientRect();

			for (const pos of positions) {
				const lineEl = lineElements[pos.line];
				if (!lineEl) continue;
				const lineRect = lineEl.getBoundingClientRect();
				const charWidth = 8.5; // monospaced glyph average
				const x = lineRect.left - rootRect.left + pos.column * charWidth;
				const y = lineRect.top - rootRect.top;
				coords.set(pos.id, { x, y });
			}
			setTokenCoords(coords);
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(container);
		return () => observer.disconnect();
	}, [positions, tokens, view]);

	const isTs = language === 'ts' || language === 'typescript';
	const showSegmented = Boolean(seed);

	return (
		<Card padding={0} width="100%" className="docs-elevated-code-card">
			<HStack justify="between" vAlign="center" paddingInline={3} paddingBlock={2}>
				{showSegmented ? (
					<SegmentedControl
						label="Code block view"
						size="sm"
						value={view}
						onChange={(val) => setView(val as 'code' | 'studio' | 'preview')}
					>
						<SegmentedControlItem value="code" label="Code" />
						<SegmentedControlItem value="studio" label="Studio View" />
						<SegmentedControlItem value="preview" label="Interactive Run" />
					</SegmentedControl>
				) : (
					<Text type="supporting" color="secondary">
						{isTs ? 'TypeScript' : language}
					</Text>
				)}

				<HStack gap={1} vAlign="center">
					{seed && (
						<IconButton
							label="Open in Theorem Studio"
							tooltip="Open in Theorem Studio"
							variant="ghost"
							size="sm"
							icon={<IconPlayerPlay />}
							href={`/studio?seed=${seed}`}
							target="_blank"
						/>
					)}
					<CopyIconButton label="Copy code" copiedLabel="Copied" text={code} />
				</HStack>
			</HStack>

			<Divider />

			{view === 'code' && (
				<div ref={codeRef} style={{ position: 'relative', width: '100%' }}>
					<CodeBlock
						language={isTs ? 'typescript' : language}
						code={tokens.length > 0 ? displayCode : code}
						container="section"
						hasLanguageLabel={false}
						hasCopyButton={false}
						hasLineNumbers={isTs}
						highlightMode="spans"
						isWrapped={isTs}
						width="100%"
					/>

					{/* Token Overlays */}
					{positions.map((pos) => {
						const coord = tokenCoords.get(pos.id);
						if (!coord) return null;
						return (
							<div
								key={pos.id}
								style={{
									position: 'absolute',
									left: coord.x,
									top: coord.y,
									transform: 'translateY(-2px)',
									zIndex: 2,
									pointerEvents: 'auto',
								}}
							>
								<Token
									size="sm"
									label={pos.token.label}
									icon={tokenIcon(pos.token.kind)}
									color={pos.token.color}
								/>
							</div>
						);
					})}
				</div>
			)}

			{view === 'studio' && (
				<div
					style={{
						height: 480,
						width: '100%',
						position: 'relative',
						background: 'var(--color-background-surface)',
					}}
				>
					<iframe
						src={`/studio?seed=${seed ?? 'firstTurn'}&locked=1`}
						title="Theorem Studio Preview"
						style={{
							width: '100%',
							height: '100%',
							border: 'none',
							background: 'var(--color-background-surface)',
						}}
					/>
				</div>
			)}

			{view === 'preview' && (
				<div
					style={{
						padding: '24px',
						width: '100%',
						background: 'var(--color-background-card)',
					}}
				>
					<VStack gap={4}>
						<HStack justify="between" vAlign="center">
							<VStack gap={0.5}>
								<Text type="large" weight="medium">
									Research Scout Execution Bench
								</Text>
								<Text type="supporting" color="secondary">
									Replaying recorded arXiv and GitHub discovery turn from COOKBOOKS.research
								</Text>
							</VStack>
							<Button
								label="Launch in Studio"
								variant="primary"
								size="sm"
								icon={<IconPlayerPlay />}
								onClick={() => {
									window.open(`/studio?seed=${seed ?? 'firstTurn'}`, '_blank');
								}}
							/>
						</HStack>

						<Card variant="glass" padding={3}>
							<VStack gap={2}>
								<Text type="supporting" weight="medium" color="secondary">
									Prompt Input
								</Text>
								<Text type="body">
									Find recent papers on episodic memory, vector-space memory stores, and context recombination for language models, and quote exact claims from their cards or abstracts.
								</Text>
							</VStack>
						</Card>

						<Card variant="muted" padding={3}>
							<VStack gap={2}>
								<HStack gap={2} vAlign="center">
									<Icon icon={IconTool} size="sm" color="secondary" />
									<Text type="supporting" weight="medium">
										Tool Call: search_github &#123; q: &apos;llm episodic memory&apos; &#125;
									</Text>
									<Badge label="200 OK" />
								</HStack>
								<Divider />
								<HStack gap={2} vAlign="center">
									<Icon icon={IconActivity} size="sm" color="secondary" />
									<Text type="supporting" weight="medium">
										Streaming Tokens: &apos;CapMem: A Benchmark for Caption-Based Episodic Memory...&apos;
									</Text>
								</HStack>
							</VStack>
						</Card>
					</VStack>
				</div>
			)}
		</Card>
	);
}
