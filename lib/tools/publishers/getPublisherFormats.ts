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
		Mobil: "Mobile",
		Mobile: "Mobile",
		Desktop: "Desktop",
		App: "App",
		"Kun desktop": "Desktop",
		"Desktop - ikke programmatisk": "Desktop (non-programmatic)",
		"Mobile - ikke programmatisk": "Mobile (non-programmatic)",
		"Mobil, Desktop": "Mobile,Desktop",
		"Desktop, Mobil": "Desktop,Mobile",
		"Desktop, Mobile": "Desktop,Mobile",
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
			devices.push("Mobile");
		} else if (part.toLowerCase().includes("desktop")) {
			devices.push("Desktop");
		} else if (part.toLowerCase().includes("app")) {
			devices.push("App");
		}
	});

	return devices.length > 0 ? [...new Set(devices)] : null;
}

interface PublisherFormat {
	mondayItemId: string;
	name: string;
	publisherGroup: string;
	statusFormats: string[];
	deviceFormats: Array<{
		format: string;
		devices: string[];
	}>;
	totalFormats: number;
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
              linked_items {
                id
                name
              }
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
			throw new Error("No boards found in Monday.com response");
		}

		const items = response.data.boards[0]?.items_page?.items || [];

		// Process and format the results - already filtered for Live publishers
		const publishers: PublisherFormat[] = items.map((item: Record<string, unknown>) => {
			const columnValues: Record<string, unknown> = {};

			(item as MondayItemResponse).column_values?.forEach(
				(col: Record<string, unknown>) => {
					columnValues[col.id as string] = {
						title: (col as MondayColumnValueResponse).column?.title,
						value: col.text || col.display_value || "",
						linked_items: col.linked_items || null,
					};
				},
			);

			// Get publisher group from board relation
			const publisherGroupCol = columnValues.board_relation_mkp69z9s as Record<string, unknown>;
			const publisherGroup = publisherGroupCol?.linked_items?.[0]?.name || "No Group";

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

			// Extract status formats
			const statusFormats = Object.entries(formats)
				.filter(([_key, value]) => typeof value === "boolean" && value)
				.map(([key]) => formatNames[key] || key);

			// Extract device formats
			const deviceFormats = Object.entries(formats)
				.filter(([_key, value]) => value && typeof value === "object")
				.map(([key, value]) => ({
					format: formatNames[key] || key,
					devices: value as string[],
				}));

			return {
				mondayItemId: String(item.id),
				name: String(item.name),
				publisherGroup,
				statusFormats,
				deviceFormats,
				totalFormats: statusFormats.length + deviceFormats.length,
			};
		});

		// Filter by publisher group if specified
		let filteredPublishers = publishers;
		if (publisherGroupName) {
			filteredPublishers = publishers.filter((p) =>
				p.publisherGroup.toLowerCase().includes(publisherGroupName.toLowerCase()),
			);
		}

		// Group publishers by their publisher groups for better organization
		const publishersByGroup = new Map<string, PublisherFormat[]>();
		
		for (const publisher of filteredPublishers) {
			const groupName = publisher.publisherGroup || "No Group";
			if (!publishersByGroup.has(groupName)) {
				publishersByGroup.set(groupName, []);
			}
			publishersByGroup.get(groupName)?.push(publisher);
		}

		// Sort publishers within each group by name
		for (const [, groupPublishers] of publishersByGroup) {
			groupPublishers.sort((a, b) => 
				a.name.toLowerCase().localeCompare(b.name.toLowerCase())
			);
		}

		// Convert to hierarchical structure
		const publisherGroups = Array.from(publishersByGroup.entries())
			.sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
			.map(([group, groupPublishers]) => ({
				publisherGroup: group,
				publisherCount: groupPublishers.length,
				totalFormats: groupPublishers.reduce((sum, p) => sum + p.totalFormats, 0),
				publishers: groupPublishers
			}));

		// Calculate statistics
		const totalPublishers = filteredPublishers.length;
		const totalGroups = publishersByGroup.size;
		const totalStatusFormats = filteredPublishers.reduce((sum, p) => sum + p.statusFormats.length, 0);
		const totalDeviceFormats = filteredPublishers.reduce((sum, p) => sum + p.deviceFormats.length, 0);
		
		// Count unique format types
		const uniqueStatusFormats = new Set(filteredPublishers.flatMap(p => p.statusFormats));
		const uniqueDeviceFormats = new Set(filteredPublishers.flatMap(p => p.deviceFormats.map(f => f.format)));

		// Build metadata
		const metadata = {
			boardId: BOARD_IDS.PUBLISHERS,
			boardName: "Publishers",
			totalPublishers,
			totalGroups,
			totalFormats: totalStatusFormats + totalDeviceFormats,
			formatBreakdown: {
				statusFormats: totalStatusFormats,
				deviceFormats: totalDeviceFormats,
				uniqueStatusFormats: uniqueStatusFormats.size,
				uniqueDeviceFormats: uniqueDeviceFormats.size
			},
			filters: {
				status: "Live publishers only",
				...(publisherName && { publisherName }),
				...(publisherGroupName && { publisherGroupName })
			},
			deviceAbbreviations: {
				"M": "Mobile",
				"D": "Desktop",
				"A": "App"
			},
			notes: "Only ACTIVE formats shown. If a format is not listed = NOT available."
		};

		const summary = `Found ${totalPublishers} Live publisher${totalPublishers !== 1 ? 's' : ''} across ${totalGroups} group${totalGroups !== 1 ? 's' : ''} with ${totalStatusFormats + totalDeviceFormats} total format${(totalStatusFormats + totalDeviceFormats) !== 1 ? 's' : ''}`;

		return JSON.stringify(
			{
				tool: "getPublisherFormats",
				timestamp: new Date().toISOString(),
				status: "success",
				metadata,
				data: publisherGroups,
				options: { summary }
			},
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching publisher formats:", error);
		throw new Error(
			`Failed to fetch publisher formats: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}