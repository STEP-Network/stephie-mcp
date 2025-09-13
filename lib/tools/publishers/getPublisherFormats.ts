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

interface CompactPublisher {
	id: string; // mondayItemId
	publisher: string; // name
	statusFormats?: string[]; // statusFormats (omit if empty)
	deviceFormats?: Array<[string, string[]]>; // deviceFormats as tuples [format, devices[]] (omit if empty)
}

export async function getPublisherFormats(args: {
	names?: string[]; // Array of names to search in both publisher name and group name
}) {
	const { names } = args;

	// Build filter string for GraphQL - search in both name and group if provided
	let filterString = "";
	if (names && names.length > 0) {
		// Build rules array for all names searching in both columns
		const rules: string[] = [];
		for (const searchName of names) {
			rules.push(`{column_id: "name", compare_value: "${searchName}", operator: contains_text}`);
			rules.push(`{column_id: "board_relation_mkp69z9s", compare_value: "${searchName}", operator: contains_text}`);
		}
		
		// Search with OR across all name/group combinations
		filterString = `query_params: { 
			rules: [${rules.join(", ")}], 
			operator: or
		}`;
	}

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
              index
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
			topscrollHighImpact: "Topscroll high-impact.js (hi.js)",
			midscrollHighImpact: "Midscroll high-impact.js (hi.js)",
			wallpaper: "Wallpaper",
			anchor: "Anchor",
			trueNative: "True Native",
			googleInterstitial: "Interstitial",
			outstream: "Outstream",
			video: "Video",
			vertikalVideo: "Vertikal Video",
		};

		// Process and format the results - already filtered for Live publishers
		const publishersByGroup = new Map<string, CompactPublisher[]>();
		const allUniqueFormats = new Set<string>();
		const allUniqueDevices = new Set<string>();

		items.forEach((item: Record<string, unknown>) => {
			const columnValues: Record<string, unknown> = {};

			(item as MondayItemResponse).column_values?.forEach(
				(col: Record<string, unknown>) => {
					columnValues[col.id as string] = {
						title: (col as MondayColumnValueResponse).column?.title,
						value: col.text || col.display_value || "",
						linked_items: col.linked_items || null,
						index: col.index || null,
					};
				},
			);

			// Check if publisher is Live (status8 index 1)
			const statusCol = columnValues.status8 as Record<string, unknown>;
			if (!statusCol || statusCol.index !== 1) {
				return; // Skip non-Live publishers
			}

			// Get publisher group from board relation
			const publisherGroupCol = columnValues.board_relation_mkp69z9s as Record<string, unknown>;
			const linkedItems = publisherGroupCol?.linked_items as Array<{id: string; name: string}> | undefined;
			const publisherGroup = linkedItems?.[0]?.name || "No Group";

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
				.map(([key]) => {
					const format = formatNames[key] || key;
					allUniqueFormats.add(format);
					return format;
				});

			// Extract device formats as tuples
			const deviceFormats: Array<[string, string[]]> = Object.entries(formats)
				.filter(([_key, value]) => value && typeof value === "object")
				.map(([key, value]) => {
					const format = formatNames[key] || key;
					const devices = value as string[];
					allUniqueFormats.add(format);
					devices.forEach(d => { allUniqueDevices.add(d); });
					return [format, devices];
				});

			// Only add to results if we have names filter
			if (names && names.length > 0) {
				// Create compact publisher object
				const compactPublisher: CompactPublisher = {
					id: String(item.id),
					publisher: String(item.name),
				};

				// Only add non-empty arrays
				if (statusFormats.length > 0) {
					compactPublisher.statusFormats = statusFormats;
				}
				if (deviceFormats.length > 0) {
					compactPublisher.deviceFormats = deviceFormats;
				}

				// Add to group
				if (!publishersByGroup.has(publisherGroup)) {
					publishersByGroup.set(publisherGroup, []);
				}
				publishersByGroup.get(publisherGroup)?.push(compactPublisher);
			}
		});

		// Sort publishers within each group by name
		for (const [, groupPublishers] of publishersByGroup) {
			groupPublishers.sort((a, b) => 
				a.publisher.toLowerCase().localeCompare(b.publisher.toLowerCase())
			);
		}

		// Build data only if we have names filter
		let data = undefined;
		if (names && names.length > 0) {
			// Convert to hierarchical structure
			data = Array.from(publishersByGroup.entries())
				.sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
				.map(([group, pubs]) => ({
					publisherGroup: group,
					publishers: pubs
				}));
		}

		// Calculate statistics from Live publishers only
		let totalLivePublishers = 0;
		const liveGroups = new Set<string>();
		
		items.forEach((item: MondayItemResponse) => {
			const columnValues: Record<string, unknown> = {};
			item.column_values?.forEach(
				(col: Record<string, unknown>) => {
					columnValues[col.id as string] = col;
				},
			);
			// Only count Live publishers (status8 index 1)
			const statusCol = columnValues.status8 as Record<string, unknown>;
			if (statusCol && statusCol.index === 1) {
				totalLivePublishers++;
				const publisherGroupCol = columnValues.board_relation_mkp69z9s as Record<string, unknown>;
				const linkedItems = publisherGroupCol?.linked_items as Array<{id: string; name: string}> | undefined;
				const groupName = linkedItems?.[0]?.name || "No Group";
				liveGroups.add(groupName);
			}
		});
		
		const totalPublishers = totalLivePublishers;
		const totalGroups = liveGroups.size;

		// Count formats from filtered data if available, otherwise from all
		let statusCount = 0;
		let deviceCount = 0;
		
		if (data) {
			data.forEach(group => {
				group.publishers.forEach((pub: CompactPublisher) => {
					if (pub.statusFormats) statusCount += pub.statusFormats.length;
					if (pub.deviceFormats) deviceCount += pub.deviceFormats.length;
				});
			});
		}

		// Build metadata
		const metadata = {
			board: BOARD_IDS.PUBLISHERS,
			totalPublishers,
			totalGroups,
			availableFormats: Array.from(allUniqueFormats).sort(),
			availableDevices: Array.from(allUniqueDevices).sort(),
			...(names && names.length > 0 && { 
				filters: names,
				matchedPublishers: data ? data.reduce((sum, g) => sum + g.publishers.length, 0) : 0,
				matchedFormats: statusCount + deviceCount
			})
		};

		const summary = names && names.length > 0
			? `Found ${data ? data.reduce((sum, g) => sum + g.publishers.length, 0) : 0} publishers matching ${names.length === 1 ? `"${names[0]}"` : `${names.length} search terms`}`
			: `${totalPublishers} total publishers across ${totalGroups} groups`;

		return JSON.stringify(
			{
				tool: "getPublisherFormats",
				timestamp: new Date().toISOString(),
				status: "success",
				metadata,
				...(data && { data }),
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