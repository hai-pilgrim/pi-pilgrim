import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { Container, Key, type SelectItem, SelectList, Text } from "@earendil-works/pi-tui";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadPresets(): Record<string, PresetConfig> {
	const defaultPath = join(__dirname, "..", "presets", "default-presets.json");
	const userPath = join(process.env.HOME || "", ".pi", "agent", "presets.json");
	const projectPath = join(process.cwd(), ".pi", "presets.json");

	let merged: Record<string, PresetConfig> = {};

	// Load PIlgrim defaults
	if (existsSync(defaultPath)) {
		try {
			merged = JSON.parse(readFileSync(defaultPath, "utf-8"));
		} catch (err) {
			console.error("Failed to load PIlgrim presets:", err);
		}
	}

	// Merge user presets
	if (existsSync(userPath)) {
		try {
			const user = JSON.parse(readFileSync(userPath, "utf-8"));
			merged = { ...merged, ...user };
		} catch (err) {
			console.error("Failed to load user presets:", err);
		}
	}

	// Project presets take highest precedence
	if (existsSync(projectPath)) {
		try {
			const project = JSON.parse(readFileSync(projectPath, "utf-8"));
			merged = { ...merged, ...project };
		} catch (err) {
			console.error("Failed to load project presets:", err);
		}
	}

	return merged;
}

interface PresetConfig {
	provider?: string;
	model?: string;
	thinkingLevel?: "off" | "minimal" | "low" | "medium" | "high" | "xhigh";
	tools?: string[];
	instructions?: string;
}

export default function (pi: ExtensionAPI) {
	let presets: Record<string, PresetConfig> = {};
	let activePresetName: string | undefined;
	let activePreset: PresetConfig | undefined;

	async function applyPreset(name: string, preset: PresetConfig, ctx: any): Promise<boolean> {
		if (preset.provider && preset.model) {
			const model = ctx.modelRegistry.find(preset.provider, preset.model);
			if (model) {
				const success = await pi.setModel(model);
				if (!success) {
					ctx.ui.notify(`Preset "${name}": No API key for ${preset.provider}/${preset.model}`, "warning");
				}
			} else {
				ctx.ui.notify(`Preset "${name}": Model ${preset.provider}/${preset.model} not found`, "warning");
			}
		}

		if (preset.thinkingLevel) {
			pi.setThinkingLevel(preset.thinkingLevel);
		}

		if (preset.tools && preset.tools.length > 0) {
			const allTools = pi.getAllTools().map((t) => t.name);
			const valid = preset.tools.filter((t) => allTools.includes(t));
			const invalid = preset.tools.filter((t) => !allTools.includes(t));
			if (invalid.length > 0) {
				ctx.ui.notify(`Preset "${name}": Unknown tools: ${invalid.join(", ")}`, "warning");
			}
			if (valid.length > 0) {
				pi.setActiveTools(valid);
			}
		}

		activePresetName = name;
		activePreset = preset;
		ctx.ui.setStatus("preset", ctx.ui.theme.fg("accent", `preset:${name}`));
		return true;
	}

	function buildDescription(preset: PresetConfig): string {
		const parts: string[] = [];
		if (preset.provider && preset.model) parts.push(`${preset.provider}/${preset.model}`);
		if (preset.thinkingLevel) parts.push(`thinking:${preset.thinkingLevel}`);
		if (preset.tools) parts.push(`tools:${preset.tools.join(",")}`);
		return parts.join(" | ");
	}

	async function showSelector(ctx: any): Promise<void> {
		const names = Object.keys(presets);
		if (names.length === 0) {
			ctx.ui.notify("No presets loaded. Check src/presets/default-presets.json", "warning");
			return;
		}

		const items: SelectItem[] = names.map((name) => ({
			value: name,
			label: name === activePresetName ? `${name} (active)` : name,
			description: buildDescription(presets[name]),
		}));

		items.push({ value: "(none)", label: "(none)", description: "Restore default model/tools" });

		const result = await ctx.ui.custom<string | null>((tui, theme, _kb, done) => {
			const container = new Container();
			container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
			container.addChild(new Text(theme.fg("accent", theme.bold("PIlgrim Presets")), 1, 0));

			const list = new SelectList(items, Math.min(items.length, 10), {
				selectedPrefix: (t) => theme.fg("accent", t),
				selectedText: (t) => theme.fg("accent", t),
				scrollInfo: (t) => theme.fg("dim", t),
			});
			list.onSelect = (item) => done(item.value);
			list.onCancel = () => done(null);
			container.addChild(list);
			container.addChild(new Text(theme.fg("dim", "↑↓ navigate • enter select • esc cancel"), 1, 0));
			container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

			return {
				render: (w) => container.render(w),
				invalidate: () => container.invalidate(),
				handleInput: (data) => { list.handleInput(data); tui.requestRender(); },
			};
		});

		if (!result || result === "(none)") {
			activePresetName = undefined;
			activePreset = undefined;
			ctx.ui.setStatus("preset", undefined);
			pi.setActiveTools(["read", "bash", "edit", "write"]);
			ctx.ui.notify("Preset cleared", "info");
			return;
		}

		await applyPreset(result, presets[result], ctx);
		ctx.ui.notify(`Preset "${result}" activated`, "info");
	}

	pi.registerCommand("preset", {
		description: "Activate a PIlgrim preset (plan, implement, review, debug)",
		handler: async (args, ctx) => {
			presets = loadPresets();

			if (args.trim()) {
				const name = args.trim();
				const preset = presets[name];
				if (!preset) {
					const available = Object.keys(presets).join(", ");
					ctx.ui.notify(`Unknown preset "${name}". Available: ${available}`, "error");
					return;
				}
				await applyPreset(name, preset, ctx);
				ctx.ui.notify(`Preset "${name}" activated`, "info");
				return;
			}

			await showSelector(ctx);
		},
	});

	// Keyboard shortcut: Shift+Ctrl+U to cycle presets
	pi.registerShortcut(Key.ctrlShift("u"), {
		description: "Cycle through PIlgrim presets",
		handler: async (_args, ctx) => {
			presets = loadPresets();
			const names = Object.keys(presets).sort();
			const cycleList = ["(none)", ...names];
			const current = activePresetName ?? "(none)";
			const idx = cycleList.indexOf(current);
			const nextIdx = (idx + 1) % cycleList.length;
			const next = cycleList[nextIdx];

			if (next === "(none)") {
				activePresetName = undefined;
				activePreset = undefined;
				ctx.ui.setStatus("preset", undefined);
				pi.setActiveTools(["read", "bash", "edit", "write"]);
				ctx.ui.notify("Preset cleared", "info");
			} else {
				await applyPreset(next, presets[next], ctx);
				ctx.ui.notify(`Preset: ${next}`, "info");
			}
		},
	});

	// Inject preset instructions into system prompt
	pi.on("before_agent_start", async (event) => {
		if (activePreset?.instructions) {
			return {
				systemPrompt: `${event.systemPrompt}\n\n${activePreset.instructions}`,
			};
		}
	});

	pi.on("session_start", async (_event, ctx) => {
		presets = loadPresets();
		// Show active preset in status if restored
		if (activePresetName) {
			ctx.ui.setStatus("preset", ctx.ui.theme.fg("accent", `preset:${activePresetName}`));
		}
	});
}
