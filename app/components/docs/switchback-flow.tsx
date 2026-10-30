import { HStack } from '@astryxdesign/core/HStack';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { VStack } from '@astryxdesign/core/VStack';
import {
	IconActivity,
	IconArrowLeft,
	IconArrowRight,
	IconCpu,
	IconDatabase,
	IconFileSmile,
	IconPlayerPlay,
	IconShieldCheck,
	IconWorld,
} from '@tabler/icons-react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { SwitchbackFigure } from '../../lib/docs/figure';
import { mapPolyline } from './map-line';

/** Exact icon mapping from `@theoremjs/studio/ui/lib/type-icons.ts` */
function stepIcon(kind?: string): IconType | undefined {
	switch (kind) {
		case 'profile':
			return IconFileSmile;
		case 'model':
			return IconCpu;
		case 'tool':
			return IconWorld;
		case 'ingress':
			return IconArrowRight;
		case 'egress':
			return IconArrowLeft;
		case 'guardrail':
			return IconShieldCheck;
		case 'stream':
			return IconActivity;
		case 'store':
			return IconDatabase;
		case 'runner':
			return IconPlayerPlay;
		default:
			return undefined;
	}
}

/** A step's left and right edges and middle height, in the figure's own coordinates. */
interface TokenBox {
	left: number;
	right: number;
	midY: number;
}

interface ConnectionLine {
	d: string;
	key: string;
}

type SwitchbackRow = SwitchbackFigure['rows'][number];

const HAIRPIN_RADIUS = 14;
/** How far a hairpin's rail stands off the row's outer step. */
const HAIRPIN_OFFSET = 24;

/** Each step's box in `root`, keyed `row-step`. */
function stepBoxes(root: HTMLElement, rootBox: DOMRect): Map<string, TokenBox> {
	const boxes = new Map<string, TokenBox>();
	for (const el of root.querySelectorAll<HTMLElement>('[data-map-step]')) {
		const id = el.dataset.mapStep;
		if (!id) continue;
		const box = el.getBoundingClientRect();
		boxes.set(id, {
			left: box.left - rootBox.left,
			right: box.right - rootBox.left,
			midY: box.top - rootBox.top + box.height / 2,
		});
	}
	return boxes;
}

/** The straight lines between a row's steps, in its reading direction. */
function rowLines(boxes: Map<string, TokenBox>, r: number, row: SwitchbackRow): ConnectionLine[] {
	const ltr = row.direction !== 'rtl';
	const lines: ConnectionLine[] = [];
	for (let c = 0; c < row.steps.length - 1; c++) {
		const from = boxes.get(`${String(r)}-${String(c)}`);
		const to = boxes.get(`${String(r)}-${String(c + 1)}`);
		if (!from || !to) continue;
		const fromX = ltr ? from.right : from.left;
		const toX = ltr ? to.left : to.right;
		lines.push({
			d: `M ${String(fromX)} ${String(from.midY)} L ${String(toX)} ${String(to.midY)}`,
			key: `line-${String(r)}-${String(c)}`,
		});
	}
	return lines;
}

/** The hairpin from a row's last step to the next row's first, on the side the row ends. */
function hairpin(
	boxes: Map<string, TokenBox>,
	r: number,
	row: SwitchbackRow,
): ConnectionLine | undefined {
	const from = boxes.get(`${String(r)}-${String(row.steps.length - 1)}`);
	const to = boxes.get(`${String(r + 1)}-0`);
	if (!from || !to) return undefined;
	const ltr = row.direction !== 'rtl';
	const fromX = ltr ? from.right : from.left;
	const toX = ltr ? to.right : to.left;
	const railX = ltr
		? Math.max(from.right, to.right) + HAIRPIN_OFFSET
		: Math.min(from.left, to.left) - HAIRPIN_OFFSET;
	const d = mapPolyline(
		[
			{ x: fromX, y: from.midY },
			{ x: railX, y: from.midY },
			{ x: railX, y: to.midY },
			{ x: toX, y: to.midY },
		],
		HAIRPIN_RADIUS,
	);
	return { d, key: `hairpin-${String(r)}` };
}

export function SwitchbackFlow({ figure }: { figure: SwitchbackFigure }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [lines, setLines] = useState<ConnectionLine[]>([]);
	const [svgSize, setSvgSize] = useState<{ width: number; height: number }>({
		width: 0,
		height: 0,
	});

	useLayoutEffect(() => {
		const root = containerRef.current;
		if (!root) return;

		const updateLines = () => {
			const rootBox = root.getBoundingClientRect();
			const boxes = stepBoxes(root, rootBox);
			const last = figure.rows.length - 1;
			const newLines = figure.rows.flatMap((row, r) => {
				const turn = r < last ? hairpin(boxes, r, row) : undefined;
				return turn ? [...rowLines(boxes, r, row), turn] : rowLines(boxes, r, row);
			});
			setSvgSize({ width: rootBox.width, height: rootBox.height });
			setLines(newLines);
		};

		updateLines();
		const observer = new ResizeObserver(updateLines);
		observer.observe(root);
		return () => {
			observer.disconnect();
		};
	}, [figure]);

	return (
		<div
			ref={containerRef}
			className="studio-tree-map-frame"
			style={{
				position: 'relative',
				width: '100%',
				padding: '24px 36px',
			}}
		>
			<svg
				className="studio-tree-map-lines"
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
				{lines.map((line) => (
					<path
						key={line.key}
						className="map-line"
						d={line.d}
						fill="none"
						stroke="var(--color-border-emphasized, #64748b)"
						strokeWidth={1.5}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				))}
			</svg>

			<VStack gap={6} width="100%">
				{figure.rows.map((row, rIdx) => {
					const isRtl = row.direction === 'rtl';
					return (
						<HStack
							key={`row-${String(rIdx)}`}
							justify="between"
							vAlign="center"
							width="100%"
							style={{
								flexDirection: isRtl ? 'row-reverse' : 'row',
								position: 'relative',
								zIndex: 1,
							}}
						>
							{row.steps.map((step, sIdx) => {
								const label = step.token?.label ?? step.label;
								const kind = step.token?.kind;
								const icon = stepIcon(kind);

								const tooltipText =
									step.text ?? step.parts?.map((p) => p.text ?? p.label).join(' · ');

								return (
									<div
										key={label}
										data-map-step={`${String(rIdx)}-${String(sIdx)}`}
										style={{ display: 'inline-flex', flexShrink: 0 }}
									>
										{tooltipText ? (
											<Tooltip
												content={tooltipText}
												placement={rIdx === 0 ? 'above' : 'below'}
												hasHoverIndication={false}
												delay={120}
											>
												<Token
													size="sm"
													label={label}
													icon={icon && <Icon icon={icon} size="sm" />}
													description={tooltipText}
												/>
											</Tooltip>
										) : (
											<Token
												size="sm"
												label={label}
												icon={icon && <Icon icon={icon} size="sm" />}
											/>
										)}
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
