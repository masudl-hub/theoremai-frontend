---
title: Draft Compiler & Code Export
updated: 2026-10-29
summary: How Studio checks a draft as it changes, reads code back into it, and saves edits to your files.
entry: studio/compile.ts
covers: studio/compile.ts, studio/compile-workspace.ts
cover: /imagery/th30_hill.png
coverAlt: Gentle rolling green hills glowing in soft morning light
coverPosition: 50% 50%
---

Studio lets you edit a profile as form fields or as TypeScript, checks the draft each time it changes, and writes your edits back to your project's files when you save.

## Form and Code

The editor has two views of the same profile, **Editor** and **Code**. One button switches between them.

* **Editor**: The profile as form fields: its model, prompt, tools, guardrails and other sections.
* **Code**: The TypeScript the profile is declared in, in a code editor with completions, signature help, hover documentation and type errors against `@theoremjs/agents`.
* **Reading Code Back**: When you edit the code, Studio reads it back into the draft. Anything it cannot read is an error at that spot, and the draft is left as it was. A name in `tools.allow` that no tool registers is an error too.

## Draft Checks

A configuration mistake, such as a model with no provider or a schema that does not parse, would otherwise show only when a turn fails. Studio checks the draft again each time it changes:

### 1. Model Routes
Each model's provider must exist in the workspace and serve the agent's type on the model's protocol. Otherwise the editor shows an issue such as "No provider is defined as openai." An API model also needs its model name.

The check does not read your keys. When a project opens, the studio command asks each provider about its key once and prints one line for each, such as `key for gemini (gemini) works`, `refused`, `is empty` or `could not be checked`. The `--offline` flag skips this. A run whose key slot is empty fails with an `auth` error.

### 2. Tools and Schemas
Each tool needs a name, and no two tools may share one. A tool's input and output JSON schemas must parse. An MCP tool needs the name of its tool on the server, and an agent tool needs the agent it asks. A structured reply needs a schema id, and its schema must parse.

### 3. Guardrails
Allowed hosts and allowed names may not be blank. A custom detector needs a valid name, may be listed once, and its patterns must be valid.

### Finding Issues
* The toolbar shows how many issues the draft has.
* Each issue shows on the field it belongs to.
* In the code editor, the line is marked, with the message on hover.

## Saving Changes

With the command (`npx theorem-studio`), Studio writes your edits back to your project's files. Click **Save** in the editor's toolbar to review the changes first.

The review dialog is titled **Save to** and your project's name. Under the title it says: "Save writes all of these lines or none. It then type-checks and loads the project, and puts your files back unless it runs as what you tested." At the bottom are **Discard all**, **Cancel** and **Save**.

### Reviewing Changes
The dialog shows the changed lines of each file:
* **By File or All Changes**: See one file at a time, or every change at once.
* **What Save Changes**: Save rewrites each changed value of a profile or a tool where your file sets it. A value written in the call is changed in place. A value from a constant is changed where the constant is set, when every profile and tool that reads it makes the same change. A tool's Zod schema is changed one part at a time. The rest of the file is left as it was.

### All or Nothing
Save writes every change or none. It then type-checks and loads the project. If the project does not type-check, does not start, or does not load as what you tested, Save puts your files back and says why. Your files then hold what you tested, or what they held before.

### Changes Save Does Not Write
The review lists each change Save cannot write, and why. For example:
* **Changed Files**: "… changed after the studio opened it. Reload the studio." If your files change after the review was made, Save writes nothing and says: "Your files changed after this review was made. Close it and review again."
* **Values Set in Code**: "Set in code at …. Change it there." Edit that value in your own editor.
* **Shared Constants**: A constant that other profiles or tools read, and that they would not change the same way, is not written. The review names who shares it.

### Undo Save
After a save, a message names the files Studio wrote, with an **Undo** button for 15 seconds. **Undo** puts the files back as they were before the save. Your edits stay in Studio, unsaved again.

### Discard All
**Discard all**, in the review dialog, puts the project back to its files and drops every unsaved edit. Studio asks first: "Discard every unsaved edit?" **Undo** in the next message brings the edits back.

## Related Guides

* **[Theorem Studio Overview](/docs/studio)**: What Studio does, and the two ways to run it.
* **[Project Setup & Workspaces](/docs/studio/setup)**: The setup file, keys, and who a run acts as.
* **[Embedded Studio Screen](/docs/studio/embedded)**: Showing `<StudioScreen />` in a React app with lent keys.
* **[Profiles & State Management](/docs/profiles)**: The fields of a Theorem agent profile.
