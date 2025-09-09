import { config } from "dotenv";
import { getPublishersByFormats } from "../../lib/tools/getPublishersByFormats.js";

// Load environment variables
config({ path: "../../.env.local" });

(async () => {
	try {
		console.log(
			"Testing getPublishersByFormats with device-based parameters...\n",
		);

		const result = await getPublishersByFormats({
			topscroll: "Desktop",
			video: "Mobile",
			videoPlayback: true,
		});

		console.log(result);
	} catch (error) {
		console.error("Error:", error);
	}
})();
