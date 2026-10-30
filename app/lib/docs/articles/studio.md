---
title: Theorem Studio
updated: 2026-10-30
summary: Edit, run and test Theorem agents on your own project with one command, or as a screen in your own app.
entry: studio/mod.ts
covers: studio, studio/server.ts
cover: /imagery/th30_glacialcrevass.png
coverAlt: Luminous deep cyan blue ice inside deep glacial crevasses
coverPosition: 50% 50%
---

Theorem Studio is a screen for one agent profile at a time. You edit the profile as a form or as code, run it in a chat beside the editor, and probe its guardrails. You can open it on your own project with one command, or show it as a screen in your own app.

The screen keeps the profile it edits in the browser, as a draft, and sends the draft with every request to a server under `/api/studio`. You choose which server answers:

```text
                    ┌──────────────────────────────┐
                    │ BROWSER                      │
                    │ <StudioScreen />             │
                    │ edits the draft · runs it    │
                    └──────────────┬───────────────┘
                                   │ POST /api/studio/*
                                   │ (the draft rides along)
                 ┌─────────────────┴──────────────────┐
                 ▼                                    ▼
┌────────────────────────────────┐  ┌────────────────────────────────┐
│ THE COMMAND                    │  │ YOUR APP                       │
│ npx theorem-studio             │  │ createStudioDraftHandler()     │
│                                │  │                                │
│ your project, on this machine  │  │ any visitor, on your server    │
│ saves edits to your files      │  │ saves nothing                  │
└────────────────────────────────┘  └────────────────────────────────┘
```

## What Studio Gives You

1. **Form and Code Editing**: Edit a profile as form fields or as TypeScript, in one editor with two views.
2. **Draft Checks**: Studio checks the draft as it changes and shows each problem on its field or line, before you run a turn.
3. **Workspace Map**: A map of the project's providers, models, shared settings, profiles and tools, and how they join.
4. **Chat and Tool Approvals**: Run the profile in a chat beside the editor, and allow or deny a gated tool call from its card.
5. **Trace Replay**: Import recorded turns and run them again through the profile as it is now, with no model calls.

## The Studio Workbench

### 1. Form and Code Editor

The editor has two views, **Editor** and **Code**. One button switches between them.

* **Editor**: The profile as form fields: its model, prompt, tools, guardrails and other sections.
* **Code**: The TypeScript the profile is declared in, in a code editor with completions, signature help, hover documentation and type errors against `@theoremjs/agents`.
* **Reading Code Back**: When you edit the code, Studio reads it back into the draft. Anything it cannot read is shown as an error at that spot, and the draft is left as it was.

### 2. Draft Checks

Studio checks the draft again each time it changes. It does not wait for a turn to fail:

* **Model Routes**: Each model's provider must exist in the workspace and serve the agent's type on the model's protocol. The check does not read your keys: the command checks each provider's key once when the project opens, and a run whose key slot is empty fails with an `auth` error.
* **Tools**: Each tool needs a name, used once. A tool's input and output JSON schemas must parse, an MCP tool needs its tool name, and an agent tool needs its agent.
* **Structured Output**: A structured reply needs a schema id, and its schema must parse.
* **Guardrails**: Allowed hosts and allowed names may not be blank, and custom detectors and their patterns must be valid.
* **Where Problems Show**: Each problem shows on the node it belongs to, and in the code editor on its line.

### 3. Workspace Map

The map shows the providers, models, shared settings, profiles and tools in columns, with a line from each to what it feeds:

```text
[ Providers ] ──serves──> [ Models ] ──runs──> [ Profiles ] ──allows──> [ Tools ]
                                                    ▲                      │
                                                    └─────────asks─────────┘
                                                     (an agent tool asks its profile)
```

* **Links**: A provider `serves` a model, a model `runs` a profile, a profile `allows` a tool, an agent tool `asks` its profile, a shared setting `sets` a section of a profile or a tool, and a profile can have another write its summaries (`summarised`).
* **Providers**: Studio registers Gemini, OpenRouter, Local (a server such as Ollama, llama.cpp, vLLM or LM Studio), and TypeSafe. A project can register its own.
* **Agent Tools**: An agent tool (`type: 'agent'`) lets one profile ask another.
* **Reading the Map**: **Expand** shows each profile as a card of its sections. Drag a node to move it, and **Tidy** puts every node back. Right-click a node to see only what feeds it and what it feeds. A search shows the same for every node it finds. The map changes nothing; a node opens what it stands for.

### 4. Chat

The chat sits beside the editor, so you can test a change at once:

* **Streaming**: Thoughts, text and tool calls show as they arrive.
* **Tool Gates**: A gated tool call shows a card with its arguments. You allow it or deny it.
* **Who a Run Acts As**: A setup file can export `people` and `host`. You then pick a place and a person in Settings, under People, and each run acts for that person. Each person keeps their own chat and session.

### 5. Trace Replay

To check a prompt change against a real conversation, replay it:

1. **Importing Traces**: Click **Replay exchange** and choose a `.json` file of trace records, or a `.jsonl` file with one record on each line. Studio shows the conversation as the person saw it. A file with several conversations or agents opens on the first. The arrows beside **Conversation 1 of 3** step to the others.
2. **Replay**: Studio runs the conversation again through the profile as it is now. Every model call is answered from the recording, and so is every tool result unless **Live tools** is on. The profile's guardrails, stages and gates run for real. A replay needs no keys.
3. **Recorded and Replayed**: Switch between **Recorded** and **Replayed** to see what changed.
4. **Divergence and Continue Live**: When the profile asks for something the recording does not hold, the replay stops there and says why. **Continue live** goes on from that point with the real model.

## Two Ways to Run Studio

| Approach | How You Run It | Where It Runs | What It Saves |
| :--- | :--- | :--- | :--- |
| **The command** | `npx theorem-studio` | Your project, on this machine | Your edits, to your files |
| **The screen in your app** | `<StudioScreen />` and `createStudioDraftHandler()` | Any visitor, on your server | Nothing on the server; drafts stay in the browser tab |

### The Command

Run it in your project folder:

```bash
npx theorem-studio
```

The command starts two servers that only this machine reaches: your project's server, under Deno, and the studio's page. It opens the project's setup file, [`studio.setup.ts` or `<name>.studio.setup.ts`](/docs/studio/setup). When the project has several, it asks which one.

* **Saving**: **Save** writes your edits back to your project's files.
* **Keys**: Runs sign with the keys in your entry's `theorem.provider.vault`. Load the keys however your start script does. Studio never writes them down.
* **Your Editor**: Studio opens a line of your files in your editor (`--editor`; default `$VISUAL` or `$EDITOR`, else `code`).

### The Screen in Your App

Show the same studio to your users: a playground, or an internal tool.

```tsx
import { LayerProvider } from '@astryxdesign/core/Layer';
import { Theme } from '@astryxdesign/core/theme';
import { theoremStudioTheme } from '@theoremjs/studio/ui/built/theorem-studio.ts';
import { openStudio } from '@theoremjs/studio/ui/lib/studio-open.ts';
import { StudioScreen } from '@theoremjs/studio/ui/studio-screen.tsx';
import '@theoremjs/studio/ui/figtree.css';
import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import '@theoremjs/studio/ui/built/theme.css';
import '@theoremjs/studio/ui/motion.css';

// In the browser, before the first render: it reads this tab's kept workspace.
const opened = await openStudio();

export function Studio() {
	return (
		<Theme theme={theoremStudioTheme} mode="dark">
			<LayerProvider>
				<StudioScreen opened={opened} host={{ kernelVersion: '0.3.3' }} />
			</LayerProvider>
		</Theme>
	);
}
```

Your server answers `/api/studio` with one handler, `createStudioDraftHandler()`. It saves nothing.

* **Without Lent Keys**: Drafts run in the browser, on the builder's own keys.
* **Lent Keys**: You can lend your keys. A `LentKeys` says which models they run, which built-in tools each model may use, and how large a decision may be. A `spend` function counts each run for whoever sent it, and can refuse it.
* **Network**: The tool connection test reaches public hosts only.
* **Tab State**: Drafts and test conversations are kept in the browser's IndexedDB, under the tab. A reload keeps them. After the tab closes, a studio tab opened later clears them. Keys are never kept.

## Related Guides

* **[Project Setup & Workspaces](/docs/studio/setup)**: The setup file, who a run acts as, and the editor option (`--editor`).
* **[Draft Compiler & Code Synchronization](/docs/studio/compiler)**: How Studio checks drafts, reads code back, and saves edits to your files.
* **[Embedded Studio Screen & Lent Keys](/docs/studio/embedded)**: Showing `<StudioScreen />` in a React app, lending keys, and counting use.
