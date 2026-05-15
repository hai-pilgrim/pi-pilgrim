import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { execSync } from "node:child_process";

function hasUncommittedChanges(cwd: string): boolean {
	try {
		const out = execSync("git status --porcelain", { cwd, encoding: "utf8", stdio: "pipe" });
		return out.trim().length > 0;
	} catch {
		return false;
	}
}

function checkpoint(cwd: string, label: string): boolean {
	try {
		execSync("git add -A", { cwd, stdio: "pipe" });
		execSync(`git stash push -m "PIlgrim checkpoint: ${label}"`, { cwd, stdio: "pipe" });
		return true;
	} catch {
		return false;
	}
}

export default function (pi: ExtensionAPI) {
	pi.on("turn_start", async (event, ctx) => {
		if (!hasUncommittedChanges(ctx.cwd)) return;

		const label = `turn-${event.turnIndex}`;
		const ok = checkpoint(ctx.cwd, label);
		if (ok && ctx.hasUI) {
			ctx.ui.notify(`Git checkpoint: ${label}`, "info");
		}
	});

	pi.registerCommand("checkpoint", {
		description: "Manually create a git checkpoint (stash) of current work",
		handler: async (_args, ctx) => {
			if (!hasUncommittedChanges(ctx.cwd)) {
				ctx.ui.notify("No uncommitted changes to checkpoint", "warning");
				return;
			}
			const ok = checkpoint(ctx.cwd, "manual");
			if (ok) {
				ctx.ui.notify("Checkpoint created", "success");
			} else {
				ctx.ui.notify("Failed to create checkpoint", "error");
			}
		},
	});
}
