/// <reference types="node" />
/**
 * Exposure match for the stills in public/imagery: a CSS filter that brings each one to the
 * lavender still's brightness and contrast. Worked out from the pixels at compose time.
 */

import path from 'node:path';
import sharp from 'sharp';

const REFERENCE = '/imagery/th30_lavender.png';
const BRIGHTNESS = { min: 0.62, max: 1.24 };
const CONTRAST = { min: 0.78, max: 1.32 };

type Luma = { mean: number; spread: number };

async function luma(file: string): Promise<Luma> {
	const { data, info } = await sharp(file)
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const pixels = info.width * info.height;
	let sum = 0;
	let squares = 0;
	for (let i = 0; i < pixels; i++) {
		const y = (0.2126 * data[3 * i] + 0.7152 * data[3 * i + 1] + 0.0722 * data[3 * i + 2]) / 255;
		sum += y;
		squares += y * y;
	}
	const mean = sum / pixels;
	return { mean, spread: Math.sqrt(squares / pixels - mean * mean) };
}

function clamp(value: number, range: { min: number; max: number }): number {
	return Math.round(Math.min(range.max, Math.max(range.min, value)) * 1000) / 1000;
}

/** src → CSS filter, for every /imagery still among `srcs`. Other paths get none. */
export async function stillFilters(
	publicRoot: string,
	srcs: readonly string[],
): Promise<Map<string, string>> {
	const target = await luma(path.join(publicRoot, REFERENCE));
	const stills = [...new Set(srcs)].filter((src) => src.startsWith('/imagery/'));
	const entries = await Promise.all(
		stills.map(async (src): Promise<[string, string]> => {
			const still = await luma(path.join(publicRoot, src));
			const brightness = clamp(target.mean / still.mean, BRIGHTNESS);
			const contrast = clamp(target.spread / still.spread, CONTRAST);
			return [src, `brightness(${String(brightness)}) contrast(${String(contrast)})`];
		}),
	);
	return new Map(entries);
}
