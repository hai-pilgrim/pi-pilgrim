import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		const indicator = ctx.ui.theme.fg("accent", "●");
		const dim = ctx.ui.theme.fg("dim", "·");

		ctx.ui.setWorkingIndicator({
			frames: [
				dim,
				ctx.ui.theme.fg("muted", "•"),
				indicator,
				ctx.ui.theme.fg("muted", "•"),
			],
			intervalMs: 180,
		});
	});
}
