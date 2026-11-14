---
title: Theorem Studio
updated: 2026-11-13
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
6. **Guardrail Test**: Send a sample text across one guardrail boundary and see what the draft's guardrails do with it.

## The Studio Workbench

### 1. Form and Code Editor

The editor has two views, **Editor** and **Code**. One button switches between them.

* **Editor**: The profile as form fields: its model, prompt, tools, guardrails and other sections. The prompt is one box, and a blank line starts a new line. It opens formatted: private text wears a wash, and each option is a token that opens its menu. The **Private** and **Option** buttons set either on what you select. The eye and code button shows the same prompt as markup text. Both views read back only what you change: a line you did not touch stays exactly as the file writes it, and a prompt the file writes as one text stays one text while it is one line. A prompt the formatted view cannot hold stays in code.
* **Code**: The TypeScript the profile is declared in, in a code editor with completions, signature help, hover documentation and type errors against `@theoremjs/agents`.
* **Reading Code Back**: When you edit the code, Studio reads it back into the draft. Anything it cannot read is shown as an error at that spot, and the draft is left as it was. Studio reads with the kernel's own checks, so a setting or value that `defineProfile` or `registerTool` refuses shows the kernel's message on its line.

### 2. Draft Checks

Studio checks the draft again each time it changes. It does not wait for a turn to fail:

* **Model Routes**: Each model's provider must exist in the workspace and serve the agent's type on the model's protocol. The check does not read your keys: the command checks each provider's key once when the project opens, and a run whose key slot is empty fails with an `auth` error.
* **Prompt**: A `when` line must read an option the profile declares, with a value it lists. Each option needs a name, used once, and at least one value.
* **Tools**: Each tool needs a name, used once. A tool's input and output JSON schemas must parse, an MCP tool needs its tool name, and an agent tool needs its agent. A tool's reader must be a decision agent with a choice question.
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
* **Providers**: Studio registers Gemini, OpenRouter, Local (a server such as Ollama, llama.cpp, vLLM or LM Studio), and TypeSafe. A project can register its own. While a run uses a local model, its HTTP and MCP tools reach no host unless the **Remote tools** switch is on. It is off by default.
* **Agent Tools**: An agent tool (`type: 'agent'`) lets one profile ask another.
* **Reading the Map**: **Expand** shows each profile as a card of its sections. Drag a node to move it, and **Tidy** puts every node back. Point at a node or a section, or focus it, and its whole family stays lit: everything that feeds it and everything it feeds, however many links away. Right-click a node to see only that family. A search shows the same for every node it finds. The map changes nothing; a node opens what it stands for.

### 4. Chat

The chat sits beside the editor, so you can test a change at once:

* **Streaming**: Thoughts, text and tool calls show as they arrive.
* **Tool Gates**: A gated tool call shows a card with its arguments. You allow it or deny it. With the command, Studio adds no gate of its own: a tool runs as its **Permission** says, in the chat and on a live call. A reload keeps an open gate and a running background call.
* **Background Tools**: A tool's **Background** setting, under **Policy**, says when the model gets its reply while the tool goes on: **Never**, **Model asks**, **Always** or **After a time**. Runs in the chat and on a live call follow it. A chat on lent keys does not: the model gets its reply when the tool ends. A tool the page answers and the profile's `tools.t2Loader` do not offer the setting.
* **Tool Readers**: A tool can name a decision agent as its reader, so the model reads less. When a tool returns text and its call carries a `question`, Studio splits the text at blank lines and the reader judges each passage. A passage stays when each of the reader's choice questions lands on its first choice. If the reader fails, the model reads the output whole. The kernel has no such setting: in your own app, you run a reader at `post_tool`.
* **Options**: **Options** sit in the editor's **System prompt** section, above the prompt. There is one row for each option: its name and its values. The marked value is the one the studio states. An option your code states starts unset, as your code may leave it, and a run sends no value for it. An option a person picks starts on its first value, as the chat's own picker does. Press a value to state it on the next run and on an open live call. Press the value your code states again to leave it unset. An option's pencil opens **Shown in interface**. Turn it on and the option goes on `inputs.options`, where a person picks it. Turn it off and the option goes on `identity.options`.
* **Unsaved Edits**: While a project has edits you have not saved, your files and your edits run side by side under one composer. What you send goes to both, and each side treats it as its own chat would. An idle side sends it, and a busy side queues it. A steer goes to each side whose running turn takes one. The composer's model control shows each side's models in two columns, so you can run a different model on each side and compare them. Each column offers only what that side's profile offers. If you attach a file that a side's profile does not take, that side refuses the turn in its own pane. If you pick no model, each side runs its own default.
* **Who a Run Acts As**: A setup file can export `people` and `host`. You then pick a place and a person in Settings, under People, and each run acts for that person. Each person keeps their own chat and session.

### 5. Trace Replay

To check a prompt change against a real conversation, replay it:

1. **Importing Traces**: Click **Replay exchange** and choose a `.json` file of trace records, or a `.jsonl` file with one record on each line. Studio shows the conversation as the person saw it. A file with several conversations or agents opens on the first. The arrows beside **Conversation 1 of 3** step to the others.
2. **Replay**: Studio runs the conversation again through the profile as it is now. Every model call is answered from the recording, and so is every tool result unless **Live tools** is on. The profile's guardrails, stages and gates run for real. A replay needs no keys.
3. **Recorded and Replayed**: One button switches between the recorded and the replayed conversation, to show what changed.
4. **Divergence and Continue Live**: When the profile asks for something the recording does not hold, the replay stops there and says why. **Continue live** goes on from that point with the real model.

### 6. Guardrail Test

To see what the draft's guardrails do with a text, click **Test guardrails** in the editor. The test opens in the preview's place.

1. **Boundary**: Choose where the text enters the turn: a user message, an earlier message, host system text, a local or remote tool result, a tool error, tool arguments, the model's reply or its thought. Hover a boundary to see when the kernel reads it and what it does there.
2. **Send**: Type a text, or load the examples, and click **Send**. The turn is the kernel's own on a scripted model, so each check is the one a real turn runs, on the guardrails as the draft writes them. No model or host is called. A text is at most 8,000 characters.
3. **Result**: Each text comes back **Passed**, **Flagged**, **Redacted** or **Blocked**, with each guardrail decision of the turn and the text the model, the tool or the user got.

## Two Ways to Run Studio

| Approach | How You Run It | Where It Runs | What It Saves |
| :--- | :--- | :--- | :--- |
| **The command** | `npx theorem-studio` | Your project, on this machine | Your edits, to your files |
| **The screen in your app** | `<StudioScreen />` and `createStudioDraftHandler()` | Any visitor, on your server | Nothing. Drafts stay in the browser tab |

### The Command

Run it in your project folder:

```bash
npx theorem-studio
```

The command starts two servers that only this machine reaches: your project's server, under Deno, and the studio's page. It opens the project's setup file, [`studio.setup.ts` or `<name>.studio.setup.ts`](/docs/studio/setup). When the project has several, it asks which one.

* **Saving**: **Save** writes your edits back to your project's files.
* **Keys**: Runs sign with the keys in your entry's `theorem.provider.vault`. Load the keys however your start script does. Studio never writes them down.
* **Your Editor**: Studio opens a line of your files in your editor (`--editor`; default `$VISUAL` or `$EDITOR`, else `code`).
* **Tool Requests**: A draft that runs in the page sends its tool requests through your project's server, which reaches what the draft's network rules allow.

### The Screen in Your App

Show the same studio to your users: a playground, or an internal tool. [Embedded Studio Screen & Lent Keys](/docs/studio/embedded) lists its stylesheets.

```tsx
import { LayerProvider } from '@astryxdesign/core/Layer';
import { Theme } from '@astryxdesign/core/theme';
import { theoremStudioTheme } from '@theoremjs/studio/ui/built/theorem-studio.ts';
import { openStudio } from '@theoremjs/studio/ui/lib/studio-open.ts';
import { StudioScreen } from '@theoremjs/studio/ui/studio-screen.tsx';
// ...

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
* **Tool Requests**: A page reaches only hosts that allow it by CORS, so a draft that runs in the browser sends each HTTP and MCP tool request through your handler, which sends it on. The request's headers and body, the tool's credentials among them, pass through your server in memory only. The handler never logs or stores them. A request to a local or private address goes straight from the browser.
* **Header Size**: The host's headers come back to the page in one response header. A host whose headers are larger than your platform allows in one header (about 16 KB on Cloudflare Workers) fails the request.
* **Lent Keys**: You can lend your keys. A `LentKeys` says which models they run, which built-in tools each model may use, and how large a decision may be. A `spend` function counts each run for whoever sent it, and each passage a tool's reader reads, and can refuse it.
* **Network**: The tool connection test and the tool requests your handler sends on reach public hosts only.
* **Tab State**: Drafts and test conversations are kept in the browser's IndexedDB, under the tab. A reload keeps them. After the tab closes, another studio tab, open now or opened later, clears them a minute on. Keys are never kept.

## Related Guides

* **[Project Setup & Workspaces](/docs/studio/setup)**: The setup file, who a run acts as, and the editor option (`--editor`).
* **[Draft Compiler & Code Synchronization](/docs/studio/compiler)**: How Studio checks drafts, reads code back, and saves edits to your files.
* **[Embedded Studio Screen & Lent Keys](/docs/studio/embedded)**: Showing `<StudioScreen />` in a React app, lending keys, and counting use.
