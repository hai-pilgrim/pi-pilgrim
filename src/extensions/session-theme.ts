import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Container, SelectList, type SelectItem, Text } from "@earendil-works/pi-tui";

const ENTRY_TYPE = "session-theme";

interface ThemeMapping {
	sessionFile: string | null;
	sessionName: string | null;
	theme: string;
}

function hashString(str: string): number {
	let h = 0;
	for (let i = 0; i < str.length; i++) {
		h = ((h << 5) - h + str.charCodeAt(i)) | 0;
	}
	return Math.abs(h);
}

function getSavedMapping(ctx: ExtensionContext): ThemeMapping | undefined {
	const entries = ctx.sessionManager.getEntries();
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type === "custom" && entry.customType === ENTRY_TYPE) {
			return entry.data as ThemeMapping;
		}
	}
	return undefined;
}

function getAvailableThemeNames(ctx: ExtensionContext): string[] {
	return ctx.ui.getAllThemes().map((t) => t.name);
}

export default function (pi: ExtensionAPI) {
	// Apply saved or auto-assigned theme on session start
	pi.on("session_start", async (_event, ctx) => {
		const sessionFile = ctx.sessionManager.getSessionFile();
		const sessionName = pi.getSessionName();
		const available = getAvailableThemeNames(ctx);
		if (available.length === 0) return;

		const saved = getSavedMapping(ctx);
		if (saved && saved.theme && available.includes(saved.theme)) {
			ctx.ui.setTheme(saved.theme);
			ctx.ui.notify(`Theme: ${saved.theme}`, "info");
			return;
		}

		// Auto-assign by hashing session file path or name
		const seed = sessionFile ?? sessionName ?? "default";
		const idx = hashString(seed) % available.length;
		const autoTheme = available[idx]!;
		ctx.ui.setTheme(autoTheme);
		pi.appendEntry(ENTRY_TYPE, {
			sessionFile,
			sessionName,
			theme: autoTheme,
		});
		ctx.ui.notify(`Auto theme: ${autoTheme}`, "info");
	});

	pi.registerCommand("session-theme", {
		description: "Set or show the theme for this session (usage: /session-theme [theme-name])",
		getArgumentCompletions: (prefix: string, ctx) => {
			const themes = getAvailableThemeNames(ctx);
			const matches = themes.filter((t) => t.toLowerCase().startsWith(prefix.toLowerCase()));
			return matches.map((value) => ({ value, label: value }));
		},
		handler: async (args, ctx) => {
			const available = getAvailableThemeNames(ctx);
			if (available.length === 0) {
				ctx.ui.notify("No themes available", "warning");
				return;
			}

			const arg = args.trim();
			if (arg) {
				const themeName = available.find((t) => t.toLowerCase() === arg.toLowerCase());
				if (!themeName) {
					ctx.ui.notify(`Unknown theme: ${arg}`, "error");
					return;
				}
				ctx.ui.setTheme(themeName);
				pi.appendEntry(ENTRY_TYPE, {
					sessionFile: ctx.sessionManager.getSessionFile(),
					sessionName: pi.getSessionName(),
					theme: themeName,
				});
				ctx.ui.notify(`Session theme set: ${themeName}`, "info");
				return;
			}

			// Interactive picker
			const current = ctx.ui.theme.name;
			const items: SelectItem[] = available.map((name) => ({
				value: name,
				label: name === current ? `${name} (current)` : name,
			}));

			const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
				const container = new Container();
				container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
				container.addChild(new Text(theme.fg("accent", theme.bold("Select Session Theme")), 1, 0));

				const selectList = new SelectList(items, Math.min(items.length, 12), {
					selectedPrefix: (t) => theme.fg("accent", t),
					selectedText: (t) => theme.fg("accent", t),
					scrollInfo: (t) => theme.fg("dim", t),
				});
				selectList.onSelect = (item) => done(item.value);
				selectList.onCancel = () => done(null);
				container.addChild(selectList);
				container.addChild(new Text(theme.fg("dim", "↑↓ navigate • enter select • esc cancel"), 1, 0));
				container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

				return {
					render: (w) => container.render(w),
					invalidate: () => container.invalidate(),
					handleInput: (data) => {
						selectList.handleInput(data);
						tui.requestRender();
					},
				};
			});

			if (result) {
				ctx.ui.setTheme(result);
				pi.appendEntry(ENTRY_TYPE, {
					sessionFile: ctx.sessionManager.getSessionFile(),
					sessionName: pi.getSessionName(),
					theme: result,
				});
				ctx.ui.notify(`Session theme set: ${result}`, "info");
			}
		},
	});
}
