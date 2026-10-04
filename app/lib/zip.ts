/**
 * A .zip of text files, stored without compression: an export is a few small
 * source files, so a deflate library would cost more than it saves.
 */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of bytes) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

/** A little-endian record of 16- and 32-bit fields. */
function record(fields: readonly [number, 2 | 4][]): Uint8Array {
	const bytes = new Uint8Array(fields.reduce((size, [, width]) => size + width, 0));
	const view = new DataView(bytes.buffer);
	let at = 0;
	for (const [value, width] of fields) {
		if (width === 2) view.setUint16(at, value, true);
		else view.setUint32(at, value, true);
		at += width;
	}
	return bytes;
}

/** 1 January 1980, the earliest date a zip can hold: every export has the same bytes. */
const DOS_DATE = 0x21;
/** Names are UTF-8. */
const UTF8 = 0x800;

/** The files as a .zip, each at its path. */
export function zipFiles(
	files: readonly { path: string; code: string }[],
): Uint8Array<ArrayBuffer> {
	const encoder = new TextEncoder();
	const parts: Uint8Array[] = [];
	const directory: Uint8Array[] = [];
	let offset = 0;
	for (const file of files) {
		const name = encoder.encode(file.path);
		const data = encoder.encode(file.code);
		const crc = crc32(data);
		const shared: [number, 2 | 4][] = [
			[20, 2],
			[UTF8, 2],
			[0, 2],
			[0, 2],
			[DOS_DATE, 2],
			[crc, 4],
			[data.length, 4],
			[data.length, 4],
			[name.length, 2],
			[0, 2],
		];
		const local = record([[0x04034b50, 4], ...shared]);
		parts.push(local, name, data);
		directory.push(
			record([[0x02014b50, 4], [20, 2], ...shared, [0, 2], [0, 2], [0, 2], [0, 4], [offset, 4]]),
			name,
		);
		offset += local.length + name.length + data.length;
	}
	const size = directory.reduce((total, part) => total + part.length, 0);
	const end = record([
		[0x06054b50, 4],
		[0, 2],
		[0, 2],
		[files.length, 2],
		[files.length, 2],
		[size, 4],
		[offset, 4],
		[0, 2],
	]);
	const all = [...parts, ...directory, end];
	const out = new Uint8Array(all.reduce((total, part) => total + part.length, 0));
	let at = 0;
	for (const part of all) {
		out.set(part, at);
		at += part.length;
	}
	return out;
}
