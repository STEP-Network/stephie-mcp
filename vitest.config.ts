import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		setupFiles: ["./tests/setup.ts"],
		testTimeout: 30000, // 30 seconds for API calls
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			exclude: ["node_modules/", "tests/", "*.config.ts", "dist/", "scripts/"],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./lib"),
		},
	},
});
