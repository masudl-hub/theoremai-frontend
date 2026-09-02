/**
 * One-time kernel registration for site hosts (Live relay, Th30).
 * Google builtins and harness tools are not registered on import.
 */
import { registerHarnessTools } from 'theorum';
import { registerGooglePreset } from 'theorum/presets/google';
import { ensureTh30ProfileRegistered } from './th30';

let initialized = false;

export function ensureKernelInitialized(): void {
	if (initialized) return;
	registerGooglePreset();
	registerHarnessTools();
	ensureTh30ProfileRegistered();
	initialized = true;
}
