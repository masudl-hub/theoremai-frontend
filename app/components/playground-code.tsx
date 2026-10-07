import type { PlaygroundSourceError, PlaygroundSourceSpan } from '@theoremjs/playground';
import type * as Monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';

/** What reading the file produced: errors at a spot, or the fields it read. */
export interface CodeApply {
	errors: PlaygroundSourceError[];
	spans: PlaygroundSourceSpan[];
}

interface OpenIssue {
	nodeId: string;
	field?: string;
	message: string;
}

const APPLY_MS = 300;

/**
 * Globals the package's declarations mention. The checker loads `es2022`
 * only: `lib.dom.d.ts` is about 1.9MB of types, and parsing it is what pushed
 * the tab to about 960MB. This file does not call the browser APIs.
 */
const HOST_LIB = `interface AbortSignal {
	readonly aborted: boolean;
}
interface Headers {}
interface Request {}
interface RequestInit {
	method?: string;
	headers?: Headers;
	body?: unknown;
	signal?: AbortSignal;
}
interface Response {
	ok: boolean;
	status: number;
}
interface WebSocket {
	close(code?: number, reason?: string): void;
}
interface URL {
	href: string;
}
declare function fetch(input: string | URL | Request, init?: RequestInit): Promise<Response>;
`;

interface ServiceModes {
	setModeConfiguration(configuration: Record<string, boolean>): void;
}

interface MarkerHost {
	editor: typeof Monaco.editor;
	MarkerSeverity: typeof Monaco.MarkerSeverity;
	Uri: typeof Monaco.Uri;
}

interface Session {
	editor?: Monaco.editor.IStandaloneCodeEditor;
	monaco?: MarkerHost;
	spans: PlaygroundSourceSpan[];
	errors: PlaygroundSourceError[];
	setting: boolean;
	dirty: boolean;
}

/**
 * The open agent's file. `text` is the latest print. While the visitor is
 * typing, the model keeps their text. `hold` means there is no new print,
 * so the text they have stays.
 */
export function PlaygroundCode({
	text,
	hold,
	issues,
	onApply,
}: {
	text: string;
	hold: boolean;
	issues: readonly OpenIssue[];
	onApply: (text: string) => CodeApply;
}) {
	const node = useRef<HTMLDivElement>(null);
	const apply = useRef(onApply);
	const printed = useRef(text);
	const issuesRef = useRef(issues);
	const session = useRef<Session>({ spans: [], errors: [], setting: false, dirty: false });
	apply.current = onApply;
	printed.current = text;
	issuesRef.current = issues;

	useEffect(() => {
		const host = node.current;
		if (!host) return;
		const life = { disposed: false };
		let timer: ReturnType<typeof setTimeout> | undefined;
		const paint = () => {
			const { editor, monaco, spans, errors } = session.current;
			const model = editor?.getModel();
			if (!monaco || !model) return;
			monaco.editor.setModelMarkers(model, 'playground', [
				...errors.map((error) => marker(monaco, error.line, error.column, error.message)),
				...issueMarkers(monaco, spans, issuesRef.current),
			]);
		};
		const libs: { dispose(): void }[] = [];
		void (async () => {
			const monaco = await import('./playground-monaco');
			await import('monaco-editor/languages/definitions/typescript/register');
			const typescript = await import('monaco-editor/languages/features/typescript/register');
			const editorWorker = (await import('monaco-editor/editor/editor.worker?worker')).default;
			const tsWorker = (await import('./playground-ts.worker?worker')).default;
			(self as MonacoHost).MonacoEnvironment = {
				getWorker(_id, label) {
					if (label === 'typescript' || label === 'javascript') return new tsWorker();
					return new editorWorker();
				},
			};
			const { typeSources } = await import('virtual:playground-type-sources');
			const defaults = typescript.typescriptDefaults;
			(defaults as ServiceModes).setModeConfiguration({
				completionItems: true,
				hovers: true,
				definitions: true,
				signatureHelp: true,
				diagnostics: true,
				documentSymbols: false,
				references: false,
				documentHighlights: false,
				rename: false,
				documentRangeFormattingEdits: false,
				onTypeFormattingEdits: false,
				codeActions: false,
				inlayHints: false,
			});
			defaults.setCompilerOptions({
				allowNonTsExtensions: true,
				// ESNext selects `lib.esnext.full.d.ts`, which pulls in the DOM library.
				target: typescript.ScriptTarget.ES2020,
				lib: ['es2022', 'host'],
				module: typescript.ModuleKind.ESNext,
				moduleResolution: 100 as Monaco.typescript.ModuleResolutionKind,
				strict: true,
				noEmit: true,
				skipLibCheck: true,
				allowImportingTsExtensions: true,
				paths: {
					'@theoremjs/agents': ['file:///node_modules/@theoremjs/agents/mod.d.ts'],
					'@theoremjs/agents/guardrails/compile': [
						'file:///node_modules/@theoremjs/agents/src/guardrails/compile-egress.d.ts',
					],
					zod: ['file:///node_modules/zod/index.d.ts'],
				},
			});
			libs.push(defaults.addExtraLib(HOST_LIB, 'lib.host.d.ts'));
			for (const [file, content] of Object.entries(typeSources)) {
				libs.push(defaults.addExtraLib(content, file));
			}
			if (life.disposed || !host.isConnected) {
				for (const lib of libs) lib.dispose();
				libs.length = 0;
				return;
			}
			const dark =
				document.documentElement.dataset.theme === 'dark' ||
				window.matchMedia('(prefers-color-scheme: dark)').matches;
			const uri = monaco.Uri.parse('file:///agent.ts');
			monaco.editor.getModel(uri)?.dispose();
			const model = monaco.editor.createModel(printed.current, 'typescript', uri);
			const editor = monaco.editor.create(host, {
				model,
				language: 'typescript',
				theme: dark ? 'vs-dark' : 'vs',
				minimap: { enabled: false },
				fontSize: 13,
				wordWrap: 'on',
				wrappingIndent: 'indent',
				scrollBeyondLastLine: false,
				automaticLayout: true,
				fixedOverflowWidgets: true,
				tabSize: 2,
				padding: { top: 12 },
				quickSuggestions: { other: true, comments: false, strings: true },
				suggestOnTriggerCharacters: true,
				acceptSuggestionOnEnter: 'on',
				tabCompletion: 'on',
				wordBasedSuggestions: 'off',
				parameterHints: { enabled: true },
				suggest: { preview: true, showIcons: true },
			});
			session.current.editor = editor;
			session.current.monaco = monaco;
			editor.onDidChangeModelContent(() => {
				if (session.current.setting) return;
				const value = editor.getValue();
				session.current.dirty = value !== printed.current;
				if (timer) clearTimeout(timer);
				timer = setTimeout(() => {
					const applied = apply.current(value);
					session.current.spans = applied.spans;
					session.current.errors = applied.errors;
					paint();
				}, APPLY_MS);
			});
			paint();
		})();
		return () => {
			life.disposed = true;
			if (timer) clearTimeout(timer);
			for (const lib of libs) lib.dispose();
			const model = session.current.editor?.getModel();
			session.current.editor?.dispose();
			model?.dispose();
			session.current.editor = undefined;
		};
	}, []);

	useEffect(() => {
		const { editor } = session.current;
		if (!editor || hold) return;
		if (session.current.dirty && editor.getValue() !== text) return;
		if (editor.getValue() === text) {
			session.current.dirty = false;
			return;
		}
		session.current.setting = true;
		editor.setValue(text);
		session.current.setting = false;
		session.current.dirty = false;
	}, [text, hold]);

	useEffect(() => {
		const { editor, monaco, spans, errors } = session.current;
		const model = editor?.getModel();
		if (!monaco || !model) return;
		monaco.editor.setModelMarkers(model, 'playground', [
			...errors.map((error) => marker(monaco, error.line, error.column, error.message)),
			...issueMarkers(monaco, spans, issues),
		]);
	}, [issues]);

	return <div ref={node} style={{ height: '100%', width: '100%' }} />;
}

/** `self` in the browser, which Monaco reads for its workers. */
interface MonacoHost {
	MonacoEnvironment?: {
		getWorker(workerId: string, label: string): Worker;
	};
}

function marker(
	monaco: MarkerHost,
	line: number,
	column: number,
	message: string,
): Monaco.editor.IMarkerData {
	return {
		startLineNumber: line,
		startColumn: column,
		endLineNumber: line,
		endColumn: column + 1,
		message,
		severity: monaco.MarkerSeverity.Error,
	};
}

function issueMarkers(
	monaco: MarkerHost,
	spans: readonly PlaygroundSourceSpan[],
	issues: readonly OpenIssue[],
): Monaco.editor.IMarkerData[] {
	return issues.flatMap((issue) => {
		const exact = issue.field ? `${issue.nodeId}.${issue.field}` : issue.nodeId;
		const span =
			spans.find((item) => item.path === exact) ??
			(issue.field ? spans.find((item) => item.path === issue.field) : undefined);
		if (!span) return [];
		return [marker(monaco, span.line, span.column, issue.message)];
	});
}
