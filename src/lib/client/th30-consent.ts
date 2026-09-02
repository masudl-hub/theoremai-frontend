const STORAGE_KEY = 'theorum.th30.gemini-consent';

export function hasTh30GeminiConsent(): boolean {
	try {
		return localStorage.getItem(STORAGE_KEY) === 'accepted';
	} catch {
		return false;
	}
}

export function acceptTh30GeminiConsent(): void {
	try {
		localStorage.setItem(STORAGE_KEY, 'accepted');
	} catch {
		/* private mode / blocked storage — session still proceeds */
	}
}
