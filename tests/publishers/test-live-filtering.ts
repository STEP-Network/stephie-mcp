import { config } from "dotenv";
import { getAllPublishers } from "../../lib/tools/getAllPublishers.js";
import { getPublisherFormats } from "../../lib/tools/getPublisherFormats.js";

config({ path: "../../.env.local" });

(async () => {
	console.log("Testing Live filtering in publisher tools...\n");

	// Test getAllPublishers
	console.log("=== getAllPublishers ===");
	const publishersResult = await getAllPublishers({});
	const pubLines = publishersResult.split("\n");
	const pubTotalLine = pubLines.find((line) => line.includes("**Total:**"));
	const pubStatusLine = pubLines.find((line) =>
		line.includes("**Status Filter:**"),
	);
	console.log(pubTotalLine);
	console.log(pubStatusLine);

	// Test getPublisherFormats
	console.log("\n=== getPublisherFormats ===");
	const formatsResult = await getPublisherFormats({});
	const formatLines = formatsResult.split("\n");
	const formatTotalLine = formatLines.find((line) =>
		line.includes("**Total Publishers:**"),
	);
	const formatStatusLine = formatLines.find((line) =>
		line.includes("**Status Filter:**"),
	);
	console.log(formatTotalLine);
	console.log(formatStatusLine);
})();
