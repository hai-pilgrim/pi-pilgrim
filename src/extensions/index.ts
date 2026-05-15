import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import sessionTheme from "./session-theme.js";
import pushGuard from "./push-guard.js";

export default function (pi: ExtensionAPI) {
	// Each session gets its own theme (auto-assigned or persisted)
	sessionTheme(pi);

	// Warn when leaving a repo with unpushed commits
	pushGuard(pi);
}
