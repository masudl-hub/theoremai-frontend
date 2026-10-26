/**
 * One-time kernel registration for site hosts (Live relay, Th30).
 * Google builtins and harness tools are not registered on import.
 */
import { registerHarnessTools, registerTools } from '@theoremjs/agents';
import { GOOGLE_BUILTIN_TOOLS } from '@theoremjs/studio';
import { ensureTh30ProfileRegistered } from './th30';

let initialized = false;

export function ensureKernelInitialized(): void {
	if (initialized) return;
	registerTools(GOOGLE_BUILTIN_TOOLS);
	registerHarnessTools();
	ensureTh30ProfileRegistered();
	initialized = true;
}
