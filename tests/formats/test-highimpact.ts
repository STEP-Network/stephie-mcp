import { config } from "dotenv";
import { getPublishersByFormats } from "../../lib/tools/getPublishersByFormats.js";

// Load environment variables
config({ path: "../../.env.local" });

(async () => {
	try {
		console.log(
			"Testing High-impact.js filtering (should return 92 publishers)...\n",
		);

		const result = await getPublishersByFormats({
			topscrollHighimpact: "All",
			midscrollHighimpact: "All",
		});

		// Count the results
		const lines = result.split("\n");
		const totalLine = lines.find((line) => line.includes("**Results:**"));
		if (totalLine) {
			console.log(totalLine);
		}

		// Show first few lines of the result
		console.log("\nFirst 20 lines of output:");
		console.log(lines.slice(0, 20).join("\n"));
	} catch (error) {
		console.error("Error:", error);
	}
})();
