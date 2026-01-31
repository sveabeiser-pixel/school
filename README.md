# School Webpages – Open Teaching Material Standard

This repository provides a simple, human‑readable HTML standard for creating online teaching material with the help of coding agents. Content pages stay clean and focused, while all control logic and styling live in the shared `assets/` folder. The goal is to let teachers use AI tools (OpenAI, Google, Anthropic, etc.) to generate lessons and interactive assignments without needing to become programmers.

Beyond the technical setup, the bigger idea is community: an open, non‑commercial space where educators can build, share, and remix high‑quality teaching materials together. No lock‑in, no ads, no closed platforms.

## What this repo is

- A unified HTML layout for lessons and interactive assignments
- A shared `assets/` system for UI, logic, and styling
- A workflow that lets teachers prompt an AI agent to create new content
- Optional SCORM export for LMS platforms like Moodle

## How students submit assignments

There are three built‑in options for student submissions:

1) **Download**: students download the result and send it to the teacher (email, LMS upload, etc.)
2) **Webhooks**: connect to services like Microsoft Teams or other platforms that can receive webhook data
3) **SCORM**: package content for LMS platforms such as Moodle

You can choose the method per assignment.

## Quick start tutorial (no coding experience needed)

### 1) Create a GitHub account, fork the repo, and deploy your pages

If you have never used GitHub before:

1. Go to `https://github.com` and create a free account.
2. Ask your admin or the repo owner for the repository link.
3. Open the repo and click **Fork** (top right). This makes your own copy.
4. In your fork, click **Settings** → **Pages**.
5. Under **Source**, select the branch (usually `main`) and the root folder.
6. Click **Save**. GitHub will publish your pages in a few minutes.
7. The page URL will be shown in the same settings area.

That URL is your live teaching website.

### 2) Install a coding environment (VS Code) and connect an AI agent

You do not need to be a developer to follow this.

1. Install **Visual Studio Code** (free): `https://code.visualstudio.com`
2. Install **Git** (only once): `https://git-scm.com/downloads`
3. Open VS Code and sign in to GitHub when asked.
4. Clone your fork:
   - Open the Command Palette (`Ctrl+Shift+P`)
   - Run **Git: Clone**
   - Paste your fork URL
5. In VS Code, install an AI assistant extension:
   - Examples: OpenAI Codex, Claude, or similar tools
   - Most extensions will ask for your API key or account login

To preview your HTML pages in the browser:

1. Install the **Live Server** extension in VS Code.
2. Open any HTML file from your content folders.
3. Click **Go Live** (bottom right).
4. Your browser opens `http://localhost:5500` (or similar).

Now you can see changes immediately as you or the AI edit files.

### 3) Use the agent to create teaching material

You can ask your AI agent to generate content directly in the standard layout. Example prompts:

- “Create a 45‑minute lesson about the water cycle for grade 6, including 3 short quizzes.”
- “Turn this PDF into a lesson page following the repo’s HTML standard.”
- “Create an interactive assignment that lets students explore binary numbers.”

The agent should place new HTML pages in the content folders and reuse the shared `assets/` UI.

Tip: ask the agent to keep the HTML clean and human‑readable, and to avoid adding styles or scripts outside `assets/`.

### 4) Decide how student results are submitted

When you create an assignment, choose one of these options:

- **Download**: easiest and works everywhere. Students download their work and send it to you.
- **Webhooks**: best for automated workflows (e.g., Teams, Slack, custom server). Requires a webhook URL.
- **SCORM**: best for Moodle or other LMS platforms that accept SCORM packages.

To build a SCORM package, use the PowerShell script:

```powershell
./scripts/build-scorm.ps1 -InputHtml path\to\your.html
```

This produces a ZIP file you can upload to your LMS.

## Community vision

This project is meant to grow through teachers helping each other. If you improve a lesson, add a new topic, or find a better prompt for agents, share it back. The more we share, the more we reduce dependence on commercial content platforms and create truly open education materials.
