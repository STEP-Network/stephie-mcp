import {
	BOARD_IDS,
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";

// Helper function to parse device values from Monday.com
function parseDevices(value: string | undefined): string[] | null {
	if (!value || value === "N/A" || value === "Nej" || value === "") {
		return null;
	}

	// Map Monday.com values to standardized device names
	const deviceMap: Record<string, string> = {
		Mobil: "mobil",
		Mobile: "mobil",
		Desktop: "desktop",
		App: "app",
		"Kun desktop": "desktop",
		"Desktop - ikke programmatisk": "desktop_special",
		"Mobile - ikke programmatisk": "mobil_special",
		"Mobil, Desktop": "mobil,desktop",
		"Desktop, Mobil": "desktop,mobil",
		"Desktop, Mobile": "desktop,mobil",
	};

	// Check if it's a direct match
	if (deviceMap[value]) {
		return deviceMap[value].split(",");
	}

	// Try to parse comma-separated values
	const parts = value.split(",").map((p) => p.trim());
	const devices: string[] = [];

	parts.forEach((part) => {
		if (deviceMap[part]) {
			devices.push(...deviceMap[part].split(","));
		} else if (
			part.toLowerCase().includes("mobil") ||
			part.toLowerCase().includes("mobile")
		) {
			devices.push("mobil");
		} else if (part.toLowerCase().includes("desktop")) {
			devices.push("desktop");
		} else if (part.toLowerCase().includes("app")) {
			devices.push("app");
		}
	});

	return devices.length > 0 ? [...new Set(devices)] : null;
}

export async function getPublisherFormats(args: {
	publisherName?: string;
	publisherGroupName?: string;
}) {
	const { publisherName, publisherGroupName } = args;

	// Build filters for GraphQL query - ALWAYS include Live filter
	const filters: Array<Record<string, unknown>> = [
		// Always filter for Live publishers (status8 index 1)
		{
			column_id: "status8",
			compare_value: [1],
			operator: "any_of",
		},
	];

	if (publisherName) {
		filters.push({
			column_id: "name",
			compare_value: publisherName,
			operator: "contains_text",
		});
	}

	// Build filter string for GraphQL - always has at least the Live filter
	const rulesString = filters
		.map((f) => {
			const compareValue = Array.isArray(f.compare_value)
				? `[${f.compare_value.join(", ")}]`
				: `"${f.compare_value}"`;
			return `{
        column_id: "${f.column_id}",
        compare_value: ${compareValue},
        operator: ${f.operator}
      }`;
		})
		.join(", ");
	const filterString = `query_params: { rules: [${rulesString}] }`;

	// GraphQL query to fetch publishers with all format columns
	const query = `{
    boards(ids: ${BOARD_IDS.PUBLISHERS}) {
      items_page(limit: 500${filterString ? `, ${filterString}` : ""}) {
        items {
          id
          name
          column_values {
            id
            column {
              title
            }
            ... on StatusValue {
              text
            }
            ... on DropdownValue {
              text
            }
            ... on BoardRelationValue {
              display_value
            }
            ... on TextValue {
              text
            }
          }
        }
      }
    }
  }`;

	try {
		const response = await mondayApi(query);

		if (!response.data?.boards || response.data.boards.length === 0) {
			return "# Error\n\nNo boards found in Monday.com response";
		}

		const items = response.data.boards[0]?.items_page?.items || [];

		// Process and format the results - already filtered for Live publishers
		const publishers = items.map((item: Record<string, unknown>) => {
			const columnValues: Record<string, unknown> = {};

			(item as MondayItemResponse).column_values?.forEach(
				(col: Record<string, unknown>) => {
					columnValues[col.id as string] = {
						title: (col as MondayColumnValueResponse).column?.title,
						value: col.text || col.display_value || "",
					};
				},
			);

			// Determine available formats and devices
			const formats = {
				// Status-based formats
				videoFunction: (columnValues.color_mkr4s6rs as Record<string, unknown>)?.value === "Live",
				ott: (columnValues.color_mkr4rzd3 as Record<string, unknown>)?.value === "Live",
				readStatus: (columnValues.color_mksdc9rp as Record<string, unknown>)?.value === "Aktiv",

				// Device-based formats with their available devices
				topscrollAdnami: parseDevices(
					(columnValues.dropdown_mksd7frz as Record<string, unknown>)?.value as string,
				),
				topscrollExpandAdnami: parseDevices(
					(columnValues.dropdown_mksdjeft as Record<string, unknown>)?.value as string,
				),
				doubleMidscrollAdnami: parseDevices(
					(columnValues.dropdown_mksdbwbf as Record<string, unknown>)?.value as string,
				),
				midscrollAdnami: parseDevices(
					(columnValues.dropdown_mksd17vw as Record<string, unknown>)?.value as string,
				),
				adnamiNative: parseDevices(
					(columnValues.dropdown_mksdb150 as Record<string, unknown>)?.value as string,
				),

				topscrollHighImpact: parseDevices(
					(columnValues.dropdown_mksdcgvj as Record<string, unknown>)?.value as string,
				),
				midscrollHighImpact: parseDevices(
					(columnValues.dropdown_mksdjpqx as Record<string, unknown>)?.value as string,
				),

				wallpaper: parseDevices((columnValues.dropdown_mksdytf0 as Record<string, unknown>)?.value as string),
				anchor: parseDevices((columnValues.dropdown_mksdr0q2 as Record<string, unknown>)?.value as string),
				trueNative: parseDevices(
					(columnValues.dropdown_mksdh745 as Record<string, unknown>)?.value as string,
				),
				googleInterstitial: parseDevices(
					(columnValues.dropdown_mksdfx54 as Record<string, unknown>)?.value as string,
				),
				outstream: parseDevices((columnValues.dropdown_mksd6yy as Record<string, unknown>)?.value as string),
				video: parseDevices((columnValues.dropdown_mksddmgt as Record<string, unknown>)?.value as string),
				vertikalVideo: parseDevices(
					(columnValues.dropdown_mksdw0qh as Record<string, unknown>)?.value as string,
				),
			};

			return {
				id: item.id,
				name: item.name,
				publisherGroup: ((columnValues.board_relation__1 as Record<string, unknown>)?.value as string) || "",
				formats: formats,
				// Summary of available formats
				availableFormats: {
					statusFormats: Object.entries(formats)
						.filter(([_key, value]) => typeof value === "boolean" && value)
						.map(([key]) => key),
					deviceFormats: Object.entries(formats)
						.filter(([_key, value]) => value && typeof value === "object")
						.map(([key, value]) => ({
							format: key,
							devices: value as string[],
						})),
				},
			};
		});

		// Filter by publisher group if specified
		let filteredPublishers = publishers;
		if (publisherGroupName) {
			filteredPublishers = publishers.filter((p) =>
				(p.publisherGroup as string)
					.toLowerCase()
					.includes(publisherGroupName.toLowerCase()),
			);
		}

		// Group publishers by their publisher groups for better organization
		const groupedPublishers: Record<string, any[]> = {};

		filteredPublishers.forEach((publisher: any) => {
			const groupName = publisher.publisherGroup || "Uden Gruppe";
			if (!groupedPublishers[groupName]) {
				groupedPublishers[groupName] = [];
			}
			groupedPublishers[groupName].push(publisher);
		});

		// Format names mappings
		const formatNames: Record<string, string> = {
			videoFunction: "Video Function",
			ott: "OTT",
			readStatus: "RE-AD",
			topscrollAdnami: "Topscroll Adnami",
			topscrollExpandAdnami: "Topscroll Expand Adnami",
			doubleMidscrollAdnami: "Double Midscroll Adnami",
			midscrollAdnami: "Midscroll Adnami",
			adnamiNative: "Adnami Native",
			topscrollHighImpact: "Topscroll HI",
			midscrollHighImpact: "Midscroll HI",
			wallpaper: "Wallpaper",
			anchor: "Anchor",
			trueNative: "True Native",
			googleInterstitial: "Interstitial",
			outstream: "Outstream",
			video: "Video",
			vertikalVideo: "Vertikal Video",
		};

		const deviceNames: Record<string, string> = {
			mobil: "M",
			desktop: "D",
			app: "A",
			desktop_special: "D-spec",
			mobil_special: "M-spec",
		};

		const textLines: string[] = [];
		textLines.push("# Publisher Formats");
		textLines.push("");
		textLines.push(
			`**Total Publishers:** ${filteredPublishers.length} Live publishers`,
		);
		textLines.push(`**Status Filter:** Live publishers only`);
		if (publisherName) {
			textLines.push(`**Filter:** Publisher name contains "${publisherName}"`);
		}
		if (publisherGroupName) {
			textLines.push(`**Filter:** Publisher group "${publisherGroupName}"`);
		}
		textLines.push("");
		textLines.push(
			"> **Note:** Only ACTIVE formats shown. If a format is not listed = NOT available.",
		);
		textLines.push(
			"> **Devices:** M=Mobile, D=Desktop, A=App, D-spec=Desktop (non-programmatic), M-spec=Mobile (non-programmatic)",
		);
		textLines.push("");

		// Sort groups alphabetically
		const sortedGroups = Object.keys(groupedPublishers).sort();

		sortedGroups.forEach((groupName) => {
			const groupPublishers = groupedPublishers[groupName];
			textLines.push(`## ${groupName}`);
			textLines.push(`*${groupPublishers.length} publishers*`);
			textLines.push("");

			groupPublishers.forEach((publisher: any) => {
				// Build compact format line
				const formats: string[] = [];

				// Add status formats
				publisher.availableFormats.statusFormats.forEach((format: string) => {
					formats.push(formatNames[format] || format);
				});

				// Add device formats with devices
				publisher.availableFormats.deviceFormats.forEach(
					(item: Record<string, unknown>) => {
						const devices = (item.devices as string[])
							.map((d: string) => deviceNames[d] || d)
							.join("/");
						formats.push(
							`${formatNames[item.format as string] || item.format}[${devices}]`,
						);
					},
				);

				if (formats.length > 0) {
					textLines.push(`### ${publisher.name}`);
					textLines.push(`**Formats:** ${formats.join(", ")}`);
					textLines.push("");
				} else {
					textLines.push(`### ${publisher.name}`);
					textLines.push(`*No active formats*`);
					textLines.push("");
				}
			});
		});

		// Remove trailing empty line if present
		if (textLines[textLines.length - 1] === "") {
			textLines.pop();
		}

		return textLines.join("\n");
	} catch (error) {
		console.error("Error fetching publisher formats:", error);
		throw new Error(
			`Failed to fetch publisher formats: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}
