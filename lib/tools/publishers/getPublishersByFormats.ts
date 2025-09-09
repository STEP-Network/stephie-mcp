import {
	BOARD_IDS,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { createListResponse } from "../json-output.js";

// Device type options based on actual Monday.com columns
export type DeviceType = "Desktop" | "Mobile" | "App" | "All" | null;

export interface FormatFilters {
	// Adnami formats - Mobile/Desktop only
	topscroll?: "Desktop" | "Mobile" | "App" | "All"; // Topscroll - Adnami
	topscrollExpand?: "Desktop" | "Mobile" | "App" | "All"; // Topscroll Expand - Adnami
	doubleMidscroll?: "Desktop" | "Mobile" | "All"; // Double midscroll - Adnami (no App option)
	midscroll?: "Desktop" | "Mobile" | "All"; // Midscroll - Adnami (no App option)
	adnamiNative?: "Desktop" | "Mobile" | "All"; // Adnami native (no App option)

	// High-impact.js formats
	topscrollHighimpact?: "Desktop" | "Mobile" | "All"; // Topscroll - High-impact.js
	midscrollHighimpact?: "Desktop" | "Mobile" | "All"; // Midscroll - High-impact.js

	// Desktop-only format
	wallpaper?: "Desktop"; // Skin/Wallpaper - Desktop only

	// Various device options
	anchor?: "Desktop" | "Mobile" | "App" | "All"; // Anchor
	trueNative?: "Desktop" | "Mobile" | "All"; // True Native (no App option)
	interstitial?: "Desktop" | "Mobile" | "App" | "All"; // Google Interstitial

	// Video formats
	video?: "Desktop" | "Mobile" | "All"; // Video (dropdown)
	vertikalVideo?: "Desktop" | "Mobile" | "All"; // Vertikal video (dropdown)
	outstream?: "Desktop" | "Mobile" | "All"; // Outstream (display)

	// Status-based formats (boolean)
	videoPlayback?: boolean; // Click To Play / Autoplay funktion (video)
	ott?: boolean; // OTT (video)
	reAd?: boolean; // RE-AD Status

	// Index signature for dynamic access
	[key: string]: string | boolean | undefined;
}

export async function getPublishersByFormats(args: FormatFilters) {
	const formatFilters = args;

	// Build list of requested formats with their device requirements
	const requestedFormats: Map<string, string> = new Map();

	// Device-based format mappings to internal format names and column IDs
	const deviceFormats: Record<string, { name: string; columnId: string }> = {
		topscroll: { name: "topscroll", columnId: "dropdown_mksd7frz" },
		topscrollExpand: {
			name: "topscroll-expand",
			columnId: "dropdown_mksdjeft",
		},
		doubleMidscroll: {
			name: "double-midscroll",
			columnId: "dropdown_mksdbwbf",
		},
		midscroll: { name: "midscroll", columnId: "dropdown_mksd17vw" },
		wallpaper: { name: "wallpaper", columnId: "dropdown_mksdytf0" },
		anchor: { name: "anchor", columnId: "dropdown_mksdr0q2" },
		trueNative: { name: "true-native", columnId: "dropdown_mksdh745" },
		adnamiNative: { name: "adnami-native", columnId: "dropdown_mksdb150" },
		interstitial: { name: "interstitial", columnId: "dropdown_mksdfx54" },
		outstream: { name: "outstream", columnId: "dropdown_mksd6yy" },
		topscrollHighimpact: {
			name: "topscroll-highimpact",
			columnId: "dropdown_mksdcgvj",
		},
		midscrollHighimpact: {
			name: "midscroll-highimpact",
			columnId: "dropdown_mksdjpqx",
		},
		video: { name: "video", columnId: "dropdown_mksddmgt" },
		vertikalVideo: { name: "vertikal-video", columnId: "dropdown_mksdw0qh" },
	};

	// Boolean format mappings
	const booleanFormats: Record<string, { name: string; columnId: string }> = {
		videoPlayback: { name: "video-playback", columnId: "color_mkr4s6rs" },
		ott: { name: "ott", columnId: "color_mkr4rzd3" },
		reAd: { name: "re-ad", columnId: "color_mksdc9rp" },
	};

	// Collect device-based format requests
	for (const [param, formatInfo] of Object.entries(deviceFormats)) {
		const deviceType = formatFilters[param as keyof typeof deviceFormats];
		if (deviceType) {
			requestedFormats.set(formatInfo.name, deviceType as string);
		}
	}

	// Collect boolean format requests (these apply to all devices)
	for (const [param, formatInfo] of Object.entries(booleanFormats)) {
		if (formatFilters[param as keyof typeof booleanFormats]) {
			requestedFormats.set(formatInfo.name, "All");
		}
	}

	// If no formats specified, return error
	if (requestedFormats.size === 0) {
		return JSON.stringify(
			createListResponse(
				"getPublishersByFormats",
				[],
				{ error: "No formats selected" },
				{ 
					summary: "Please select at least one format to filter by. Set device type for display formats, or true for status formats."
				}
			),
			null,
			2
		);
	}

	const query = `
    query GetPublishers($boardId: ID!, $limit: Int!) {
      boards(ids: [$boardId]) {
        id
        name
        items_page(limit: $limit) {
          items {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }
  `;

	const variables = {
		boardId: BOARD_IDS.PUBLISHER_FORMATS,
		limit: 500,
	};

	try {
		const response = await mondayApi(query, variables);

		if (!response.data?.boards || response.data.boards.length === 0) {
			console.error("No boards found in response");
			return JSON.stringify(
				createListResponse(
					"getPublishersByFormats",
					[],
					{ error: "No publisher formats board found" },
					{ summary: "Failed to fetch publisher formats board" }
				),
				null,
				2
			);
		}

		const board = response.data.boards[0];
		const items = board?.items_page?.items || [];

		// Map column IDs to format names for checking
		const columnToFormat: Record<string, string> = {};
		for (const [_, info] of Object.entries(deviceFormats)) {
			columnToFormat[info.columnId] = info.name;
		}
		for (const [_, info] of Object.entries(booleanFormats)) {
			columnToFormat[info.columnId] = info.name;
		}

		// Process publishers and their formats
		const matchingPublishers: Array<Record<string, unknown>> = [];

		for (const item of items) {
			const publisherName = item.name;
			const columnValues = (item as MondayItemResponse).column_values || [];

			// IMPORTANT: Only include Live publishers (status8 column)
			const statusCol = columnValues.find(
				(col: Record<string, unknown>) => col.id === "status8",
			);
			const isLive = statusCol?.text === "Live";

			// Skip non-Live publishers - ALWAYS filter by Live status
			if (!isLive) {
				continue;
			}

			const supportedFormats: Map<string, string> = new Map();
			let matchesFilter = false;

			// Check each column value
			for (const col of columnValues) {
				const formatName = columnToFormat[col.id];
				if (!formatName) continue;

				const requestedDevice = requestedFormats.get(formatName);
				if (!requestedDevice) continue;

				// Parse the column value
				if (col.value) {
					try {
						const parsed = JSON.parse(col.value);

						// For dropdown columns, check the labels
						if (parsed.labels) {
							// Get selected label IDs
							const selectedIds = Array.isArray(parsed)
								? parsed
								: parsed.ids || [];

							// Map label IDs to device types - must be column-specific!
							// Different columns use different IDs for the same device
							const columnSpecificMappings: Record<
								string,
								Record<number, string>
							> = {
								// Adnami formats
								dropdown_mksd7frz: { 1: "Mobile", 8: "Desktop", 15: "App" }, // Topscroll - Adnami
								dropdown_mksdjeft: { 1: "Mobile", 8: "Desktop", 15: "App" }, // Topscroll Expand - Adnami
								dropdown_mksdbwbf: { 1: "Mobile", 8: "Desktop" }, // Double midscroll - Adnami
								dropdown_mksd17vw: { 1: "Mobile", 4: "Desktop" }, // Midscroll - Adnami
								dropdown_mksdh745: { 1: "Mobile", 8: "Desktop" }, // True Native
								dropdown_mksdb150: { 1: "Mobile", 8: "Desktop" }, // Adnami Native

								// High-impact.js formats
								dropdown_mksdcgvj: { 20: "Mobile", 108: "Desktop" }, // Topscroll - High-impact.js
								dropdown_mksdjpqx: { 4: "Mobile", 108: "Desktop" }, // Midscroll - High-impact.js

								// Other formats
								dropdown_mksdytf0: { 8: "Desktop" }, // Wallpaper (Desktop only)
								dropdown_mksdr0q2: { 1: "Mobile", 8: "Desktop", 15: "App" }, // Anchor
								dropdown_mksdfx54: { 1: "Mobile", 8: "Desktop", 15: "App" }, // Interstitial
								dropdown_mksd6yy: { 1: "Mobile", 8: "Desktop" }, // Outstream
								dropdown_mksddmgt: { 16: "Desktop", 17: "Mobile" }, // Video
								dropdown_mksdw0qh: { 1: "Mobile", 8: "Desktop" }, // Vertical Video
							};

							// Get the correct mapping for this column
							const deviceMappings = columnSpecificMappings[col.id] || {};

							for (const id of selectedIds) {
								const deviceType = deviceMappings[id];
								// Only count if it's a valid device type (not "Nej", "N/A", etc.)
								if (
									deviceType &&
									isDeviceCompatible(requestedDevice, deviceType)
								) {
									matchesFilter = true;
									supportedFormats.set(formatName, deviceType);
									break;
								}
							}
						} else if (col.text) {
							// For text-based columns, parse the text
							const text = col.text.toLowerCase();
							let deviceType: string | null = null;

							if (text.includes("desktop")) {
								deviceType = "Desktop";
							} else if (text.includes("mobil") || text.includes("mobile")) {
								deviceType = "Mobile";
							} else if (text.includes("app")) {
								deviceType = "App";
							} else if (text === "live" || text === "aktiv" || text === "on") {
								deviceType = "All devices";
							}

							if (
								deviceType &&
								isDeviceCompatible(requestedDevice, deviceType)
							) {
								matchesFilter = true;
								supportedFormats.set(formatName, deviceType);
							}
						}
					} catch (_e) {
						// Try text-based parsing as fallback
						if (col.text && col.text !== "N/A" && col.text !== "Nej") {
							const text = col.text.toLowerCase();
							let deviceType = "Unknown";

							if (text.includes("desktop")) deviceType = "Desktop";
							else if (text.includes("mobil") || text.includes("mobile"))
								deviceType = "Mobile";
							else if (text.includes("app")) deviceType = "App";
							else if (text === "live" || text === "on")
								deviceType = "All devices";

							if (
								deviceType !== "Unknown" &&
								isDeviceCompatible(requestedDevice, deviceType)
							) {
								matchesFilter = true;
								supportedFormats.set(formatName, deviceType);
							}
						}
					}
				}
			}

			if (matchesFilter) {
				matchingPublishers.push({
					name: publisherName,
					supportedFormats: Array.from(supportedFormats.entries()),
				});
			}
		}

		// Sort by number of matching formats
		matchingPublishers.sort(
			(a, b) =>
				(b.supportedFormats as string[]).length -
				(a.supportedFormats as string[]).length,
		);

		// Format output for JSON response
		const formattedPublishers = matchingPublishers.map(pub => ({
			name: pub.name,
			supportedFormats: (pub.supportedFormats as Array<[string, string]>).map(([format, device]) => ({
				format: formatLabels[format] || format,
				device
			}))
		}));

		// Format labels - explicitly show technology vendor
		const formatLabels: Record<string, string> = {
			video: "Video",
			"video-playback": "Video Playback (Click-To-Play/Autoplay)",
			outstream: "Outstream Video",
			"vertikal-video": "Vertical Video",
			ott: "OTT (Over-The-Top)",
			topscroll: "Topscroll (Adnami)",
			"topscroll-expand": "Topscroll Expand (Adnami)",
			"topscroll-highimpact": "Topscroll (High-impact.js)", // Explicitly High-impact.js
			midscroll: "Midscroll (Adnami)",
			"double-midscroll": "Double Midscroll (Adnami)",
			"midscroll-highimpact": "Midscroll (High-impact.js)", // Explicitly High-impact.js
			wallpaper: "Wallpaper/Skin",
			anchor: "Anchor",
			interstitial: "Google Interstitial",
			"true-native": "True Native",
			"adnami-native": "Adnami Native",
			"re-ad": "RE-AD (Responsible Ad)",
		};

		// Build metadata
		const appliedFilters: Array<{ format: string; device: string }> = [];
		requestedFormats.forEach((device, format) => {
			const label = formatLabels[format] || format;
			appliedFilters.push({
				format: label,
				device: device === "All" ? "All devices" : device
			});
		});

		const metadata: Record<string, any> = {
			boardId: BOARD_IDS.PUBLISHER_FORMATS,
			boardName: "Publisher Formats",
			totalPublishers: matchingPublishers.length,
			statusFilter: "Live publishers only",
			filtersApplied: appliedFilters
		};

		return JSON.stringify(
			createListResponse(
				"getPublishersByFormats",
				formattedPublishers,
				metadata,
				{
					summary: matchingPublishers.length === 0 
						? "No Live publishers found supporting the selected format and device combinations"
						: `Found ${matchingPublishers.length} Live publisher${matchingPublishers.length !== 1 ? 's' : ''} supporting the requested formats`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching publishers by formats:", error);
		throw new Error(
			`Failed to fetch publishers: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

// Helper function to check device compatibility
function isDeviceCompatible(requested: string, actual: string): boolean {
	if (requested === "All" || actual === "All devices") return true;
	if (requested === actual) return true;
	if (requested === "Desktop" && actual === "Desktop") return true;
	if (requested === "Mobile" && (actual === "Mobile" || actual === "Mobil"))
		return true;
	if (requested === "App" && actual === "App") return true;
	return false;
}
