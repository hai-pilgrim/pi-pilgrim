# PIlgrim

A customized harness for the [pi coding agent](https://github.com/earendil-works/pi-coding-agent).

PIlgrim extends pi with per-session themes, push guards, auto-commit, and built-in presets for plan/implement/review/debug workflows.

---

## Quick Start

```bash
# Clone
git clone https://github.com/hai-pilgrim/pi-pilgrim

# Run pi with PIlgrim extensions
pi --extension ./src/extensions/index.ts

# Or install as a package
cd pi-pilgrim
npm install
pi install
```

## Features

### Session Themes

Each session automatically gets its own theme (hashed from the session path). You can override with `/session-theme` — an interactive theme picker with tab-completion.

Themes included:
- `pilgrim-dark` — navy, cyan, rose
- `pilgrim-light` — warm stone, teal, coral
- `pilgrim-ocean` — deep abyss, foam, sand

### Push Guard

PIlgrim warns before shutdown if there are uncommitted changes or unpushed commits. The DIRECTIVE skill enforces: **if you touch git, you push**.

### Auto-Commit

Changes are automatically committed at the end of each turn using the last assistant message as the commit message.

### Presets

Built-in presets for common agent modes:

| Preset | Model | Tools | Thinking |
|--------|-------|-------|----------|
| `plan` | Claude Sonnet | read, bash, find, ls | high |
| `implement` | Claude Sonnet 4.5 | read, bash, edit, write | medium |
| `review` | Claude Sonnet | read, bash, edit, write, grep | low |
| `debug` | Claude Sonnet 4.5 | read, bash, edit, write, grep, ls | high |

Activate:
- `/preset` — interactive picker
- `/preset plan` — direct activation
- `Ctrl+Shift+U` — cycle presets

### Custom Presets

Add your own presets to `~/.pi/agent/presets.json` or `.pi/presets.json`:

```json
{
  "custom": {
    "provider": "openrouter",
    "model": "anthropic/claude-sonnet-4",
    "thinkingLevel": "medium",
    "tools": ["read", "bash", "edit", "write", "grep"],
    "instructions": "Your custom system prompt instructions here."
  }
}
```

## Structure

```
src/
  extensions/
    index.ts          — Main entry point, loads all extensions
    session-theme.ts  — Auto-assigns theme per session
    push-guard.ts     — Warns on unpushed/uncommitted work
    auto-commit.ts    — Commits changes at end of each turn
    pilgrim-presets.ts — Preset manager with built-in configs
  presets/
    default-presets.json — Built-in plan/implement/review/debug
  themes/
    pilgrim-dark.json
    pilgrim-light.json
    pilgrim-ocean.json
  skills/
    PUSH_BEFORE_DONE.md — The DIRECTIVE skill
  prompts/
    (custom prompt templates)
```

## Commands

| Command | Description |
|---------|-------------|
| `/session-theme [name]` | Set or select session theme |
| `/preset [name]` | Set or select agent preset |
| `/status-check` | Check for unpushed/uncommitted work |

## License

MIT
