import { Theme } from '@astryxdesign/core/theme';
import { useEffect, useRef, useState } from 'react';
import type { InkWaveStatus } from '../../../theoremai/react/src/client/ink-waveform.ts';
import { InkWaveform } from '../../../theoremai/react/src/components/InkWaveform.tsx';
import { theoremSiteTheme } from '../built/theorem-site';
import './th30-lab.css';

type LabState = 'idle' | 'hover' | 'listening' | 'speaking' | 'working';

type PaletteId = 'hero' | 'hero-deep' | 'hero-bright' | 'mixed';

const STATES: { id: LabState; label: string }[] = [
	{ id: 'idle', label: 'Idle' },
	{ id: 'hover', label: 'Hover' },
	{ id: 'listening', label: 'Listening' },
	{ id: 'speaking', label: 'Speaking' },
	{ id: 'working', label: 'Working' },
];

const PALETTES: Record<
	PaletteId,
	{ label: string; note: string; colors: [string, string, string, string] }
> = {
	mixed: {
		label: 'Mixed ref',
		note: 'Your orb screenshot — magenta · lavender · cream · mint.',
		colors: ['#e83a8a', '#b59ad4', '#e8d4a8', '#7ec9a6'],
	},
	hero: {
		label: 'Hero',
		note: 'Valley still — river blue, cloud white, deep canopy, mid leaf.',
		colors: ['#0b3452', '#f5edea', '#274832', '#3c6241'],
	},
	'hero-deep': {
		label: 'Hero deep',
		note: 'Darker water · chalk white · near-black green · mid canopy.',
		colors: ['#082239', '#fdf9f5', '#162b1f', '#30543c'],
	},
	'hero-bright': {
		label: 'Hero bright',
		note: 'More sky blue and leaf, still white-anchored.',
		colors: ['#15416d', '#fffbf6', '#3c6241', '#4c764b'],
	},
};

function hexToRgb(hex: string): [number, number, number] {
	const h = hex.replace('#', '');
	return [
		Number.parseInt(h.slice(0, 2), 16),
		Number.parseInt(h.slice(2, 4), 16),
		Number.parseInt(h.slice(4, 6), 16),
	];
}

function stateSpeed(state: LabState): number {
	switch (state) {
		case 'speaking':
			return 2.4;
		case 'listening':
			return 1.2;
		case 'working':
			return 0.65;
		case 'hover':
			return 0.4;
		default:
			return 0.15;
	}
}

function waveStatus(state: LabState, open: boolean): InkWaveStatus {
	if (!open) return 'ready';
	switch (state) {
		case 'listening':
			return 'listening';
		case 'speaking':
			return 'speaking';
		case 'working':
			return 'working';
		default:
			return 'ready';
	}
}

function waveLevels(state: LabState, open: boolean): { input: number; output: number } {
	if (!open) return { input: 0, output: 0 };
	switch (state) {
		case 'listening':
			return { input: 0.55, output: 0 };
		case 'speaking':
			return { input: 0, output: 0.7 };
		case 'working':
			return { input: 0.08, output: 0.12 };
		case 'hover':
			return { input: 0.18, output: 0 };
		default:
			return { input: 0, output: 0 };
	}
}

function hash2(x: number, y: number): number {
	const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
	return s - Math.floor(s);
}

function fade(t: number): number {
	return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}

/** Value noise on an integer lattice — organic, not circular. */
function valueNoise(x: number, y: number): number {
	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const fx = fade(x - x0);
	const fy = fade(y - y0);
	const v00 = hash2(x0, y0);
	const v10 = hash2(x0 + 1, y0);
	const v01 = hash2(x0, y0 + 1);
	const v11 = hash2(x0 + 1, y0 + 1);
	return lerp(lerp(v00, v10, fx), lerp(v01, v11, fx), fy);
}

function fbm(x: number, y: number, octaves = 4): number {
	let v = 0;
	let a = 0.5;
	let f = 1;
	let sum = 0;
	for (let i = 0; i < octaves; i++) {
		v += a * valueNoise(x * f, y * f);
		sum += a;
		a *= 0.5;
		f *= 2.05;
	}
	return v / sum;
}

/**
 * Fluid marble field → palette snap.
 * Multi-pass domain warp so colour territories ribbon and fold — not orbiting blobs.
 */
function fieldColor(
	nx: number,
	ny: number,
	t: number,
	palette: [number, number, number][],
): [number, number, number] {
	const flow = t * 0.22;

	// Pass 1 — large slow drift
	let x = nx * 1.15 + flow * 0.4;
	let y = ny * 1.15 - flow * 0.25;
	const w1x = fbm(x + 2.1, y + flow) * 2 - 1;
	const w1y = fbm(x + 5.3, y - flow * 0.7) * 2 - 1;
	x += w1x * 0.85;
	y += w1y * 0.85;

	// Pass 2 — finer curl so edges feel liquid
	const w2x = fbm(x * 1.7 + 11.0, y * 1.7 - flow * 1.1) * 2 - 1;
	const w2y = fbm(x * 1.7 - 7.0, y * 1.7 + flow * 0.9) * 2 - 1;
	x += w2x * 0.4;
	y += w2y * 0.4;

	// Scalar that bands through the warped space (diagonal bias like the reference)
	const band = fbm(x * 0.9 + y * 0.55 + flow * 0.5, y * 0.9 - x * 0.35 - flow * 0.35, 5);
	// Secondary axis breaks bands into irregular pockets instead of stripes
	const pocket = fbm(x * 1.4 - flow, y * 1.4 + 3.7, 3);

	const mixed = band * 0.72 + pocket * 0.28;
	const n = palette.length;
	const idx = Math.min(n - 1, Math.max(0, Math.floor(mixed * n * 0.999)));
	return palette[idx];
}

/** Pure stipple: black ground, discrete dots only. No underpaint. */
function MarkStipple({ state, paletteId }: { state: LabState; paletteId: PaletteId }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const stateRef = useRef(state);
	stateRef.current = state;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const palette = PALETTES[paletteId].colors.map(hexToRgb);
		const colors = PALETTES[paletteId].colors;
		const size = 160;
		canvas.width = size;
		canvas.height = size;
		const cx = size / 2;
		const cy = size / 2;
		const radius = size / 2 - 1.2;

		const dots: { x: number; y: number; seed: number }[] = [];
		const step = 1.85;
		for (let y = step / 2; y < size; y += step) {
			for (let x = step / 2; x < size; x += step) {
				const jx = (hash2(x, y) - 0.5) * step * 0.9;
				const jy = (hash2(y, x) - 0.5) * step * 0.9;
				const px = x + jx;
				const py = y + jy;
				const d = Math.hypot(px - cx, py - cy);
				if (d <= radius) {
					dots.push({ x: px, y: py, seed: hash2(px * 0.13, py * 0.13) });
				}
			}
		}

		let frame = 0;
		let t = 0;
		const tick = () => {
			const s = stateRef.current;
			t += 0.016 * stateSpeed(s);
			ctx.clearRect(0, 0, size, size);
			ctx.save();
			ctx.beginPath();
			ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			ctx.clip();
			ctx.fillStyle = '#000000';
			ctx.fillRect(0, 0, size, size);

			const speakBoost = s === 'speaking' ? 1.15 : 1;
			for (const dot of dots) {
				const dist = Math.hypot(dot.x - cx, dot.y - cy);
				// Soft rim like the reference — stipple thins at the edge
				const rim = Math.min(1, (radius - dist) / (radius * 0.14));
				if (rim <= 0) continue;
				if (dot.seed > 0.35 + rim * 0.7) continue;

				const nx = (dot.x - cx) / radius;
				const ny = (dot.y - cy) / radius;
				const soft = fieldColor(nx, ny, t, palette);
				const r = (0.95 + dot.seed * 0.35) * speakBoost * (0.55 + rim * 0.45);
				const colorIndex = palette.findIndex(
					(c) => c[0] === soft[0] && c[1] === soft[1] && c[2] === soft[2],
				);
				ctx.fillStyle = colors[colorIndex >= 0 ? colorIndex : 0];
				ctx.beginPath();
				ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.restore();
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => {
			cancelAnimationFrame(frame);
		};
	}, [paletteId]);

	return (
		<canvas ref={canvasRef} className="th30-lab__trigger-svg th30-lab__orb-canvas" aria-hidden />
	);
}

function TriggerButton({
	state,
	paletteId,
	size,
	open,
	onToggle,
}: {
	state: LabState;
	paletteId: PaletteId;
	size: 'rail' | 'search';
	open: boolean;
	onToggle: () => void;
}) {
	return (
		<button
			type="button"
			className={`th30-lab__trigger th30-lab__trigger--${size}`}
			aria-pressed={open}
			aria-label={`stipple trigger, ${open ? 'session open' : 'session closed'}`}
			onClick={onToggle}
		>
			<MarkStipple state={state} paletteId={paletteId} />
		</button>
	);
}

function PaletteSwatch({ colors }: { colors: readonly string[] }) {
	return (
		<span className="th30-lab__swatch" aria-hidden>
			{colors.map((c) => (
				<span key={c} style={{ background: c }} />
			))}
		</span>
	);
}

export function meta() {
	return [{ title: 'TH30 mark lab' }];
}

export default function Th30Lab() {
	const [state, setState] = useState<LabState>('listening');
	const [paletteId, setPaletteId] = useState<PaletteId>('mixed');
	const [open, setOpen] = useState(true);
	const palette = PALETTES[paletteId];
	const levels = waveLevels(state, open);

	return (
		<Theme theme={theoremSiteTheme} mode="light">
			<main className="th30-lab">
				<header className="th30-lab__header">
					<p className="th30-lab__eyebrow">Temporary · /th30-lab</p>
					<h1 className="th30-lab__title">Stipple</h1>
					<p className="th30-lab__lede">
						Black ground. Discrete dots. Big drifting colour fields underneath — same grammar as
						before, fields punched up to match the orb reference.
					</p>
					<div className="th30-lab__controls" role="group" aria-label="Voice state">
						<span className="th30-lab__controls-label">State</span>
						{STATES.map((s) => (
							<button
								key={s.id}
								type="button"
								className="th30-lab__chip"
								aria-pressed={state === s.id}
								onClick={() => {
									setState(s.id);
								}}
							>
								{s.label}
							</button>
						))}
					</div>
					<div className="th30-lab__controls" role="group" aria-label="Colour palette">
						<span className="th30-lab__controls-label">Palette</span>
						{(Object.keys(PALETTES) as PaletteId[]).map((id) => (
							<button
								key={id}
								type="button"
								className="th30-lab__chip th30-lab__chip--palette"
								aria-pressed={paletteId === id}
								onClick={() => {
									setPaletteId(id);
								}}
							>
								<PaletteSwatch colors={PALETTES[id].colors} />
								{PALETTES[id].label}
							</button>
						))}
					</div>
					<p className="th30-lab__palette-note">{palette.note}</p>
				</header>

				<section className="th30-lab__grid">
					<article className="th30-lab__card">
						<header className="th30-lab__card-head">
							<h2 className="th30-lab__card-name">Stipple</h2>
							<p className="th30-lab__card-note">
								Pointillist only — no filled underpaint. Colour territories from a warped field.
							</p>
						</header>

						<div className="th30-lab__stages">
							<div className="th30-lab__stage th30-lab__stage--rail">
								<div className="th30-lab__stage-meta">
									<span className="th30-lab__stage-label">Sidenav rail</span>
									<span className="th30-lab__stage-hint">24px on black</span>
								</div>
								<TriggerButton
									state={state}
									paletteId={paletteId}
									size="rail"
									open={open}
									onToggle={() => {
										setOpen((v) => !v);
									}}
								/>
							</div>
							<div className="th30-lab__stage th30-lab__stage--search">
								<div className="th30-lab__stage-meta">
									<span className="th30-lab__stage-label">Docs search</span>
									<span className="th30-lab__stage-hint">~30px beside the field</span>
								</div>
								<TriggerButton
									state={state}
									paletteId={paletteId}
									size="search"
									open={open}
									onToggle={() => {
										setOpen((v) => !v);
									}}
								/>
							</div>
						</div>

						<div className="th30-lab__hero-orb" data-surface="dark">
							<div className="th30-lab__hero-orb-mark">
								<MarkStipple state={state} paletteId={paletteId} />
							</div>
						</div>

						{open ? (
							<div className="th30-lab__live">
								<p className="th30-lab__live-label">Live · InkWaveform (unchanged)</p>
								<div className="th30-lab__wave-slot">
									<InkWaveform
										status={waveStatus(state, open)}
										inputLevel={levels.input}
										outputLevel={levels.output}
										variant="pill"
									/>
								</div>
							</div>
						) : null}
					</article>
				</section>
			</main>
		</Theme>
	);
}
