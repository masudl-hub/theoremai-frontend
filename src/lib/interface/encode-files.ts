import type { PendingAttachment } from 'theorum/interface';

export function filesToPending(files: readonly File[]): PendingAttachment[] {
	return files.map((file) => ({
		name: file.name,
		mimeType: file.type || 'application/octet-stream',
		sizeBytes: file.size,
	}));
}

async function fileToBase64(file: File): Promise<string> {
	const buffer = await file.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

export async function encodeFiles(
	files: readonly File[],
): Promise<Array<{ name: string; mimeType: string; data: string }>> {
	const out: Array<{ name: string; mimeType: string; data: string }> = [];
	for (const file of files) {
		out.push({
			name: file.name,
			mimeType: file.type || 'application/octet-stream',
			data: await fileToBase64(file),
		});
	}
	return out;
}
