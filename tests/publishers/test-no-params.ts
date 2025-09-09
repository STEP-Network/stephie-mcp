import { config } from "dotenv";
import { getAllPublishers } from "../../lib/tools/getAllPublishers.js";

config({ path: "../../.env.local" });

(async () => {
	console.log("Testing getAllPublishers with no parameters...\n");

	const result = await getAllPublishers();
	const lines = result.split("\n");
	const totalLine = lines.find((line) => line.includes("**Total:**"));
	console.log(totalLine);
})();
