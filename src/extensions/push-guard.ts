import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execSync } from "node:child_process";

function hasUnpushedCommits(cwd: string): boolean {
	try {
		execSync("git rev-parse --abbrev-ref @{u}", { cwd, stdio: "pipe" });
		const out = execSync("git rev-list --count @{u}..HEAD", { cwd, encoding: "utf8", stdio: "pipe" });
		return parseInt(out.trim(), 10) > 0;
	} catch {
		// No upstream or not a git repo
		return false;
	}
}

function hasUncommittedChanges(cwd: string): boolean {
	try {
		const out = execSync("git status --porcelain", { cwd, encoding: "utf8", stdio: "pipe" });
		return out.trim().length > 0;
	} catch {
		return false;
	}
}

export default function (pi: ExtensionAPI) {
	pi.on("session_shutdown", async (_event, ctx) => {
		const cwd = ctx.cwd;
		if (hasUncommittedChanges(cwd)) {
			ctx.ui.notify(
				"DIRECTOR: Uncommitted changes in " + cwd + " — STAGE, COMMIT, PUSH before exiting.",
				"error",
			);
		}
		if (hasUnpushedCommits(cwd)) {
			ctx.ui.notify(
				"DIRECTOR: Unpushed commits in " + cwd + " — PUSH before exiting.",
				"error",
			);
		}
	});

	pi.registerCommand("status-check", {
		description: "Check for unpushed/uncommitted changes in current repo",
		handler: async (_args, ctx) => {
			const cwd = ctx.cwd;
			const uncommitted = hasUncommittedChanges(cwd);
			const unpushed = hasUnpushedCommits(cwd);

			if (!uncommitted && !unpushed) {
				ctx.ui.notify("All clean — nothing to commit or push.", "info");
				return;
			}

			if (uncommitted) {
				ctx.ui.notify("Uncommitted changes detected. Run git status for details.", "warning");
			}
			if (unpushed) {
				ctx.ui.notify("Unpushed commits detected. Push now.", "warning");
			}
		},
	});
}
