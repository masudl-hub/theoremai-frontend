import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { Token, type TokenColor } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import {
	IconActivity,
	IconArrowLeft,
	IconArrowRight,
	IconCpu,
	IconDatabase,
	IconPlayerPlay,
	IconRobot,
	IconShieldCheck,
	IconTool,
} from '@tabler/icons-react';
import {
	type CSSProperties,
	type ReactNode,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';
import type { SwitchbackFigure, SwitchbackStep } from '../../lib/docs/figure';
import { type MapCurve, mapRail } from './map-line';

function tokenIcon(kind?: string): ReactNode {
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
		case 'runner':
			return <Icon icon={IconPlayerPlay} size="sm" />;
		default:
			return undefined;
	}
}

interface StepBox {
	row: number;
	col: number;
	left: number;
	right: number;
	top: number;
	bottom: number;
	midY: number;
	midX: number;
}

interface ConnectionLine {
	d: string;
	key: string;
	isHairpin: boolean;
}

export function SwitchbackFlow({ figure }: { figure: SwitchbackFigure }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [lines, setLines] = useState<ConnectionLine[]>([]);
	const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

	useLayoutEffect(() => {
		const root = containerRef.current;
		if (!root) return;

		const updateLines = () => {
			const rootBox = root.getBoundingClientRect();
			const elements = root.querySelectorAll<HTMLElement>('[data-switchback-step]');
			const stepBoxes = new Map<string, StepBox>();

			for (const el of elements) {
				const id = el.dataset.switchbackStep;
				if (!id) continue;
				const [rStr, cStr] = id.split('-');
				const row = Number.parseInt(rStr ?? '0', 10);
				const col = Number.parseInt(cStr ?? '0', 10);
				const box = el.getBoundingClientRect();
				const left = box.left - rootBox.left;
				const right = box.right - rootBox.left;
				const top = box.top - rootBox.top;
				const bottom = box.bottom - rootBox.top;
				stepBoxes.set(id, {
					row,
					col,
					left,
					right,
					top,
					bottom,
					midY: top + box.height / 2,
					midX: left + box.width / 2,
				});
			}

			const newLines: ConnectionLine[] = [];
			const radius = 16;
			const loopOffset = 24;

			for (let r = 0; r < figure.rows.length; r++) {
				const rowDef = figure.rows[r];
				if (!rowDef) continue;
				const isLtr = rowDef.direction !== 'rtl';
				const count = rowDef.steps.length;

				// 1. In-row connections
				for (let c = 0; c < count - 1; c++) {
					const fromBox = stepBoxes.get(`${r}-${c}`);
					const toBox = stepBoxes.get(`${r}-${c + 1}`);
					if (!fromBox || !toBox) continue;

					if (isLtr) {
						// Left to Right: from right of C to left of C+1
						const from = { x: fromBox.right, y: fromBox.midY };
						const to = { x: toBox.left, y: toBox.midY };
						const d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
						newLines.push({ d, key: `row-${r}-step-${c}`, isHairpin: false });
					} else {
						// Right to Left: from left of C to right of C+1
						const from = { x: fromBox.left, y: fromBox.midY };
						const to = { x: toBox.right, y: toBox.midY };
						const d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
						newLines.push({ d, key: `row-${r}-step-${c}`, isHairpin: false });
					}
				}

				// 2. Inter-row switchback hairpin loop (connecting row r to row r+1)
				if (r < figure.rows.length - 1) {
					const nextRowDef = figure.rows[r + 1];
					if (!nextRowDef) continue;
					const lastStepIdx = count - 1;
					const fromBox = stepBoxes.get(`${r}-${lastStepIdx}`);
					const toBox = stepBoxes.get(`${r + 1}-0`);

					if (fromBox && toBox) {
						if (isLtr) {
							// Exiting on the right side
							const railX = Math.max(fromBox.right, toBox.right) + loopOffset;
							const from = { x: fromBox.right, y: fromBox.midY };
							const to = { x: toBox.right, y: toBox.midY };
							const curve = mapRail(from, to, railX, radius);
							newLines.push({ d: curve.d, key: `hairpin-${r}`, isHairpin: true });
						} else {
							// Exiting on the left side
							const railX = Math.min(fromBox.left, toBox.left) - loopOffset;
							const from = { x: fromBox.left, y: fromBox.midY };
							const to = { x: toBox.left, y: toBox.midY };
							const curve = mapRail(from, to, railX, radius);
							newLines.push({ d: curve.d, key: `hairpin-${r}`, isHairpin: true });
						}
					}
				}
			}

			setSvgSize({ width: rootBox.width, height: rootBox.height });
			setLines(newLines);
		};

		updateLines();
		const observer = new ResizeObserver(updateLines);
		observer.observe(root);
		return () => observer.disconnect();
	}, [figure]);

	let stepCounter = 0;

	return (
		<div
			ref={containerRef}
			className="docs-switchback-container"
			style={{ position: 'relative', width: '100%', padding: '16px 36px' }}
		>
			<svg
				className="docs-switchback-svg"
				width={svgSize.width}
				height={svgSize.height}
				style={{
					position: 'absolute',
					inset: 0,
					pointerEvents: 'none',
					zIndex: 0,
					overflow: 'visible',
				}}
				aria-hidden="true"
			>
				<defs>
					<marker
						id="switchback-arrow"
						viewBox="0 0 8 8"
						refX="6"
						refY="4"
						markerWidth="7"
						markerHeight="7"
						orient="auto"
					>
						<path d="M 0 1 L 7 4 L 0 7 z" fill="color-mix(in srgb, var(--color-border-emphasized) 75%, transparent)" />
					</marker>
				</defs>
				{lines.map((line) => (
					<path
						key={line.key}
						d={line.d}
						fill="none"
						stroke="color-mix(in srgb, var(--color-border-emphasized) 60%, transparent)"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
						markerEnd="url(#switchback-arrow)"
					/>
				))}
			</svg>

			<VStack gap={8} width="100%">
				{figure.rows.map((row, rIdx) => {
					const isRtl = row.direction === 'rtl';
					return (
						<HStack
							key={`row-${String(rIdx)}`}
							gap={6}
							hAlign={isRtl ? 'end' : 'start'}
							vAlign="stretch"
							width="100%"
							style={{ flexDirection: isRtl ? 'row-reverse' : 'row', position: 'relative', zIndex: 1 }}
						>
							{row.steps.map((step, sIdx) => {
								stepCounter++;
								const num = stepCounter;
								const icon = tokenIcon(step.token?.kind);
								return (
									<div
										key={step.label}
										data-switchback-step={`${rIdx}-${sIdx}`}
										style={{ flex: '1 1 0px', minWidth: 200, maxWidth: 360 }}
									>
										<Card
											variant="glass"
											padding={3}
											elevation="med"
											width="100%"
											height="100%"
											style={{
												border: '1px solid color-mix(in srgb, var(--color-border-subtle) 80%, transparent)',
												backdropFilter: 'blur(8px)',
											}}
										>
											<VStack gap={2} height="100%" justify="between">
												<VStack gap={1.5}>
													<HStack justify="between" vAlign="center">
														<Badge label={String(num)} />
														{step.badge && (
															<Text type="supporting" color="secondary">
																{step.badge}
															</Text>
														)}
													</HStack>
													<Text type="large" weight="medium">
														{step.label}
													</Text>
													{step.text && (
														<Text type="supporting" color="secondary">
															{step.text}
														</Text>
													)}
												</VStack>

												{step.token && (
													<HStack vAlign="center" paddingBlockStart={1}>
														<Token
															size="sm"
															label={step.token.label}
															icon={icon}
															color={step.token.color as TokenColor | undefined}
														/>
													</HStack>
												)}
											</VStack>
										</Card>
									</div>
								);
							})}
						</HStack>
					);
				})}
			</VStack>
		</div>
	);
}
