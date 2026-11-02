import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { type CSSProperties, useLayoutEffect, useRef, useState } from 'react';
import type { LanesFigure } from '../../lib/docs/figure';
import { FlowToken } from './flow-token';
import { mapPolyline } from './map-line';

type LaneStep = Omit<LanesFigure['steps'][number], 'lane'> & { lane?: string };

/** Below this width the lanes no longer fit side by side, so the steps stack and name their lane. */
export const LANES_MIN_WIDTH = 560;

const LINE_RADIUS = 10;
/** More parts than this take the whole line, not the step's lane. */
const PARTS_IN_LANE = 3;

interface Edge {
	x: number;
	top: number;
	bottom: number;
}

/** An element's middle and its top and bottom, in `root`'s coordinates. */
function edgeOf(el: Element, rootBox: DOMRect): Edge {
	const box = el.getBoundingClientRect();
	return {
		x: box.left - rootBox.left + box.width / 2,
		top: box.top - rootBox.top,
		bottom: box.bottom - rootBox.top,
	};
}

/** The line from each step down to the next: through its parts, then across to the next lane. */
function flowLines(root: HTMLElement): string[] {
	const rootBox = root.getBoundingClientRect();
	const tokens = [...root.querySelectorAll('[data-flow-step]')].map((el) => edgeOf(el, rootBox));
	const parts = new Map(
		[...root.querySelectorAll<HTMLElement>('[data-flow-parts]')].map((el) => [
			Number(el.dataset.flowParts),
			edgeOf(el, rootBox),
		]),
	);
	return tokens.flatMap((token, at) => {
		const held = parts.get(at);
		const bottom = held?.bottom ?? token.bottom;
		const into = held
			? [`M ${String(token.x)} ${String(token.bottom)} L ${String(token.x)} ${String(held.top)}`]
			: [];
		const next = tokens[at + 1];
		if (!next) return into;
		const middle = (bottom + next.top) / 2;
		return [
			...into,
			mapPolyline(
				[
					{ x: token.x, y: bottom },
					{ x: token.x, y: middle },
					{ x: next.x, y: middle },
					{ x: next.x, y: next.top },
				],
				LINE_RADIUS,
			),
		];
	});
}

/**
 * Each step sits in the lane of the actor that did it, and one line runs through them in order,
 * so the line's path shows who acts when.
 */
export function LanesFlow({
	lanes,
	steps,
}: {
	lanes: readonly string[];
	steps: readonly LaneStep[];
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const [lines, setLines] = useState<string[]>([]);
	const [size, setSize] = useState({ width: 0, height: 0 });

	const isStacked = size.width > 0 && size.width < LANES_MIN_WIDTH;
	const columns = isStacked ? 1 : lanes.length;
	const grid: CSSProperties = {
		display: 'grid',
		gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))`,
	};

	useLayoutEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const draw = () => {
			const box = root.getBoundingClientRect();
			setSize({ width: box.width, height: box.height });
			setLines(flowLines(root));
		};
		draw();
		const observer = new ResizeObserver(draw);
		observer.observe(root);
		return () => {
			observer.disconnect();
		};
	}, []);

	const laneColumn = (step: LaneStep) =>
		isStacked || step.lane === undefined ? 1 : lanes.indexOf(step.lane) + 1;

	return (
		<div
			ref={rootRef}
			style={{ position: 'relative', width: '100%', padding: isStacked ? '20px 8px' : '24px 36px' }}
		>
			<svg
				width={size.width}
				height={size.height}
				style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
				aria-hidden="true"
			>
				{lines.map((d) => (
					<path
						key={d}
						className="map-line"
						d={d}
						fill="none"
						stroke="var(--color-border-emphasized, #64748b)"
						strokeWidth={1.5}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				))}
			</svg>
			<VStack gap={6} width="100%" style={{ position: 'relative' }}>
				{lanes.length > 1 && !isStacked ? (
					<div style={grid}>
						{lanes.map((lane) => (
							<HStack key={lane} hAlign="center">
								<Text type="label" weight="medium" color="secondary">
									{lane}
								</Text>
							</HStack>
						))}
					</div>
				) : null}
				{steps.map((step, at) => (
					<VStack key={step.label} gap={4} width="100%">
						<div style={grid}>
							<HStack hAlign="center" style={{ gridColumn: laneColumn(step) }}>
								<VStack data-flow-step={at} gap={1} hAlign="center">
									{isStacked && step.lane !== undefined && step.lane !== steps[at - 1]?.lane ? (
										<Text type="supporting" color="secondary">
											{step.lane}
										</Text>
									) : null}
									<FlowToken
										label={step.label}
										kind={step.kind}
										text={step.text}
										placement="above"
									/>
								</VStack>
							</HStack>
						</div>
						{step.parts ? (
							<div style={grid}>
								<HStack
									data-flow-parts={at}
									gap={2}
									hAlign="center"
									wrap="wrap"
									style={
										step.parts.length > PARTS_IN_LANE
											? { gridColumn: '1 / -1' }
											: { gridColumn: laneColumn(step) }
									}
								>
									{step.parts.map((part) => (
										<FlowToken
											key={part.label}
											label={part.label}
											text={part.text}
											placement="below"
										/>
									))}
								</HStack>
							</div>
						) : null}
					</VStack>
				))}
			</VStack>
		</div>
	);
}
