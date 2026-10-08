/** Vite virtual module emitted by studioTypeSources (scripts/studio-type-sources.mjs). */
declare module 'virtual:studio-type-sources' {
	export const typeSources: Record<string, string>;
}

/** The editor core. The full `monaco-editor` entry also registers every other language. */
declare module 'monaco-editor/editor/editor.api' {
	export const editor: typeof import('monaco-editor').editor;
	export const languages: typeof import('monaco-editor').languages;
	export const MarkerSeverity: typeof import('monaco-editor').MarkerSeverity;
	export const Uri: typeof import('monaco-editor').Uri;
}

/** The TypeScript language service, separate from the editor widget. */
declare module 'monaco-editor/languages/features/typescript/register' {
	export const typescriptDefaults: import('monaco-editor').typescript.LanguageServiceDefaults;
	export const ScriptTarget: typeof import('monaco-editor').typescript.ScriptTarget;
	export const ModuleKind: typeof import('monaco-editor').typescript.ModuleKind;
	export const ModuleResolutionKind: typeof import('monaco-editor').typescript.ModuleResolutionKind;
}

declare module 'monaco-editor/languages/definitions/typescript/register';
