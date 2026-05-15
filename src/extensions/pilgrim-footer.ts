import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { execSync } from "node:child_process";

function getGitBranch(cwd: string): string | null {
	try {
		const out = execSync("git branch --show-current", { cwd, encoding: "utf8", stdio: "pipe" });
		const branch = out.trim();
		return branch.length > 0 ? branch : null;
	} catch {
		return null;
	}
}

function formatCwd(cwd: string): string {
	const home = process.env.HOME;
	if (home && cwd.startsWith(home)) {
		return `~${cwd.slice(home.length)}`;
	}
	return cwd;
}

function formatContext(ctx: ExtensionContext): string {
	const usage = ctx.getContextUsage();
	const contextWindow = usage?.contextWindow ?? ctx.model?.contextWindow;
	if (!contextWindow || !usage || usage.percent === null) {
		return "ctx ?";
	}
	return "ctx " + Math.round(usage.percent) + "%";
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.setFooter((tui, theme, footerData) => {
			const model = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "no model";
			const branch = getGitBranch(ctx.cwd);
			const thinking = pi.getThinkingLevel();
			const preset = pi.getCommands().find(c => c.name === "preset") ? "preset" : "--";
			const theme = ctx.ui.theme.name;

			const left = theme.fg("muted", ` ${model} · ${thinking} `);
			const right = theme.fg(
				"muted",
				` ${formatContext(ctx)} · ${formatCwd(ctx.cwd)}${branch ? ` (${branch})` : ""} `,
			);

			return {
				render(width: number): string[] {
					if (width <= 0) return [];
					const leftWidth = left.replace(/\x1b\[[0-9;]*m/g, "").length;
					const rightWidth = right.replace(/\x1b\[[0-9;]*m/g, "").length;
					const gap = Math.max(0, width - leftWidth - rightWidth);
					return [left + " ".repeat(gap) + right];
				},
				invalidate() {},
			};
		});
	});
}
