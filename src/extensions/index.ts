import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import sessionTheme from "./session-theme.js";
import pushGuard from "./push-guard.js";
import autoCommit from "./auto-commit.js";
import pilgrimPresets from "./pilgrim-presets.js";
import pilgrimFooter from "./pilgrim-footer.js";
import gitCheckpoint from "./git-checkpoint.js";

export default function (pi: ExtensionAPI) {
	// PIlgrim footer: model, thinking, context %, branch
	pilgrimFooter(pi);

	// Each session gets its own theme (auto-assigned or persisted)
	sessionTheme(pi);

	// Warn when leaving a repo with unpushed commits
	pushGuard(pi);

	// Git stash checkpoint at the start of each turn
	gitCheckpoint(pi);

	// Auto-commit changes at the end of each turn
	autoCommit(pi);

	// PIlgrim presets: plan, implement, review, debug
	pilgrimPresets(pi);
}
