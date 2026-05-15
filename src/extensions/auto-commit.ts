import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

interface CommitState {
	lastCommitTurn: number;
}

function getState(ctx: ExtensionContext): CommitState {
	const entries = ctx.sessionManager.getEntries();
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type === "custom" && entry.customType === "auto-commit-state") {
			return entry.data as CommitState;
		}
	}
	return { lastCommitTurn: -1 };
}

function hasUncommittedChanges(cwd: string): boolean {
	const { execSync } = require("node:child_process");
	try {
		const out = execSync("git status --porcelain", { cwd, encoding: "utf8", stdio: "pipe" });
		return out.trim().length > 0;
	} catch {
		return false;
	}
}

function getLastCommitMessage(ctx: ExtensionContext): string {
	const entries = ctx.sessionManager.getEntries();
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type === "message" && entry.message.role === "assistant") {
			const content = entry.message.content;
			if (Array.isArray(content)) {
				const text = content
					.filter((c): c is { type: "text"; text: string } => c.type === "text")
					.map((c) => c.text)
					.join("\n");
				const firstLine = text.split("\n")[0] || "Work in progress";
				return `[pi] ${firstLine.slice(0, 50)}${firstLine.length > 50 ? "..." : ""}`;
			}
		}
	}
	return "[pi] Checkpoint";
}

export default function (pi: ExtensionAPI) {
	pi.on("turn_end", async (event, ctx) => {
		if (!hasUncommittedChanges(ctx.cwd)) return;

		const state = getState(ctx);
		// Only commit once per turn to avoid spam
		if (state.lastCommitTurn === event.turnIndex) return;

		const message = getLastCommitMessage(ctx);
		const piExec = pi.exec || require("node:child_process").execSync;

		try {
			// Stage and commit
			await piExec("git", ["add", "-A"], { cwd: ctx.cwd });
			const { code } = await piExec("git", ["commit", "-m", message], { cwd: ctx.cwd });

			if (code === 0 && ctx.hasUI) {
				ctx.ui.notify(`Auto-committed: ${message}`, "success");
				pi.appendEntry("auto-commit-state", { lastCommitTurn: event.turnIndex });
			}
		} catch (err) {
			// No changes or other error — silent
		}
	});

	pi.registerCommand("auto-commit", {
		description: "Toggle auto-commit on each turn",
		handler: async (args, ctx) => {
			// Simple on/off toggle could be implemented with a flag
			ctx.ui.notify("Auto-commit is active — commits happen at the end of each turn with changes", "info");
		},
	});
}
