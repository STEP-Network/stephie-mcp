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

	// Map Monday.com values to standardized device names (using abbreviations)
	const deviceMap: Record<string, string> = {
		Mobil: "M",
		Mobile: "M",
		Desktop: "D",
		App: "A",
		"Kun desktop": "D",
		"Desktop - ikke programmatisk": "D*",
		"Mobile - ikke programmatisk": "M*",
		"Mobil, Desktop": "M,D",
		"Desktop, Mobil": "D,M",
		"Desktop, Mobile": "D,M",
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
			devices.push("M");
		} else if (part.toLowerCase().includes("desktop")) {
			devices.push("D");
		} else if (part.toLowerCase().includes("app")) {
			devices.push("A");
		}
	});

	return devices.length > 0 ? [...new Set(devices)] : null;
}

interface CompactPublisher {
	id: string; // mondayItemId
	n: string; // name
	s?: string[]; // statusFormats (omit if empty)
	d?: Array<[string, string[]]>; // deviceFormats as tuples [format, devices[]] (omit if empty)
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

		// Use abbreviated format names
		const formatAbbrev: Record<string, string> = {
			videoFunction: "VF",
			ott: "OTT",
			readStatus: "READ",
			topscrollAdnami: "TSA",
			topscrollExpandAdnami: "TSE",
			doubleMidscrollAdnami: "DMA",
			midscrollAdnami: "MSA",
			adnamiNative: "AN",
			topscrollHighImpact: "TSHI",
			midscrollHighImpact: "MSHI",
			wallpaper: "WP",
			anchor: "ANC",
			trueNative: "TN",
			googleInterstitial: "INT",
			outstream: "OUT",
			video: "VID",
			vertikalVideo: "VV",
		};

		// Process and format the results - already filtered for Live publishers
		const publishersByGroup = new Map<string, CompactPublisher[]>();

		items.forEach((item: Record<string, unknown>) => {
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

			// Skip if filtering by group and doesn't match
			if (publisherGroupName && !publisherGroup.toLowerCase().includes(publisherGroupName.toLowerCase())) {
				return;
			}

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

			// Extract status formats (abbreviated)
			const statusFormats = Object.entries(formats)
				.filter(([_key, value]) => typeof value === "boolean" && value)
				.map(([key]) => formatAbbrev[key] || key);

			// Extract device formats as tuples
			const deviceFormats: Array<[string, string[]]> = Object.entries(formats)
				.filter(([_key, value]) => value && typeof value === "object")
				.map(([key, value]) => [
					formatAbbrev[key] || key,
					value as string[]
				]);

			// Create compact publisher object
			const compactPublisher: CompactPublisher = {
				id: String(item.id),
				n: String(item.name),
			};

			// Only add non-empty arrays
			if (statusFormats.length > 0) {
				compactPublisher.s = statusFormats;
			}
			if (deviceFormats.length > 0) {
				compactPublisher.d = deviceFormats;
			}

			// Add to group
			if (!publishersByGroup.has(publisherGroup)) {
				publishersByGroup.set(publisherGroup, []);
			}
			publishersByGroup.get(publisherGroup)?.push(compactPublisher);
		});

		// Sort publishers within each group by name
		for (const [, groupPublishers] of publishersByGroup) {
			groupPublishers.sort((a, b) => 
				a.n.toLowerCase().localeCompare(b.n.toLowerCase())
			);
		}

		// Convert to compact hierarchical structure
		const data = Array.from(publishersByGroup.entries())
			.sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
			.map(([group, pubs]) => ({
				group: group,
				publishers: pubs
			}));

		// Calculate statistics
		const totalPublishers = data.reduce((sum, g) => sum + g.publishers.length, 0);
		const totalGroups = data.length;
		
		// Count formats
		let statusCount = 0;
		let deviceCount = 0;
		const uniqueStatus = new Set<string>();
		const uniqueDevice = new Set<string>();
		
		data.forEach(group => {
			group.publishers.forEach(pub => {
				if (pub.s) {
					statusCount += pub.s.length;
					pub.s.forEach(s => uniqueStatus.add(s));
				}
				if (pub.d) {
					deviceCount += pub.d.length;
					pub.d.forEach(([format]) => uniqueDevice.add(format));
				}
			});
		});

		// Build compact metadata
		const metadata = {
			board: BOARD_IDS.PUBLISHERS,
			stats: {
				publishers: totalPublishers,
				groups: totalGroups,
				formats: statusCount + deviceCount,
				unique: {
					status: uniqueStatus.size,
					device: uniqueDevice.size
				}
			},
			legend: {
				devices: { M: "Mobile", D: "Desktop", A: "App", "D*": "Desktop (non-prog)", "M*": "Mobile (non-prog)" },
				formats: {
					VF: "Video Function", OTT: "OTT", READ: "RE-AD",
					TSA: "Topscroll Adnami", TSE: "Topscroll Expand", DMA: "Double Midscroll",
					MSA: "Midscroll Adnami", AN: "Adnami Native",
					TSHI: "Topscroll HI", MSHI: "Midscroll HI",
					WP: "Wallpaper", ANC: "Anchor", TN: "True Native",
					INT: "Interstitial", OUT: "Outstream", VID: "Video", VV: "Vertikal Video"
				}
			},
			...(publisherName && { filter: { name: publisherName }}),
			...(publisherGroupName && { filter: { group: publisherGroupName }})
		};

		return JSON.stringify(
			{
				tool: "getPublisherFormats",
				timestamp: new Date().toISOString(),
				status: "success",
				metadata,
				data,
				options: {
					summary: `${totalPublishers} publishers, ${totalGroups} groups, ${statusCount + deviceCount} formats`
				}
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