import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";

const GAM_BOARD_ID = "1558569789";
const VERTICALS_BOARD_ID = "2054670440";

export async function findPublisherAdUnits(args: {
	names?: string[];
	verticals?: Array<
		| "News"
		| "Sport"
		| "Auto"
		| "Pets"
		| "Food & Lifestyle"
		| "Home & Garden"
		| "Gaming & Tech"
	>;
	countOnly?: boolean;
	source?: "Google Ad Manager" | "Adform";
}) {
	const {
		names,
		verticals,
		countOnly = false,
		source = "Google Ad Manager",
	} = args;

	// Map source names to status indices
	// Based on observation: index 0 = Google Ad Manager, index 1 = Adform
	const sourceIndexMap: Record<string, number> = {
		"Google Ad Manager": 0,
		Adform: 1,
	};
	const sourceIndex = sourceIndexMap[source];

	console.error(
		`[findPublisherAdUnits] Source filter: ${source} -> index ${sourceIndex}`,
	);

	try {
		console.error(`[findPublisherAdUnits] Finding publisher ad units...`);

		// Filter for Publisher Groups (4) and Publishers (3) from Type column
		const publisherTypes = [3, 4];

		// sourceIndex is already defined above based on sourceIndexMap

		// Base rules for Type and Source filters
		const typeRuleString = `{column_id: "color_mkqp16yy", compare_value: [${publisherTypes.join(", ")}], operator: any_of}`;
		const sourceRuleString = `{column_id: "color_mkqpmnmr", compare_value: [${sourceIndex}], operator: any_of}`;

		console.error("[findPublisherAdUnits] sourceRuleString:", sourceRuleString);

		const rulesForQueryArray = [typeRuleString, sourceRuleString];
		let queryOperator = "and";

		// Collect all search rules
		const allSearchRules = [];

		if (names && names.length > 0) {
			// Create rules for name searches
			const nameRules = names.map((n) => {
				const escapedName = n.replace(/"/g, '\\\\"');
				return `{column_id: "name", compare_value: "${escapedName}", operator: contains_text}`;
			});
			allSearchRules.push(...nameRules);
		}

		// Handle verticals - query the Vertikaler board for ad unit IDs
		const verticalAdUnitIds: number[] = [];
		if (verticals && verticals.length > 0) {
			const verticalRules = verticals
				.map(
					(v) =>
						`{column_id: "name", compare_value: "${v}", operator: contains_text}`,
				)
				.join(", ");

			const verticalQuery = `{
        boards(ids: ${VERTICALS_BOARD_ID}) {
          items_page(
            query_params: {
              rules: [
                {column_id: "color_mksxpbk5", compare_value: 1, operator: any_of}${verticalRules ? `, ${verticalRules}` : ""}
              ],
              operator: ${verticals.length > 1 ? "or" : "and"}
            }
          ) {
            items {
              name
              column_values(ids: ["lookup_mktdz674"]) {
                ... on MirrorValue {
                  display_value
                }
              }
            }
          }
        }
      }`;

			console.error(
				"[findPublisherAdUnits] Querying Vertikaler board for GAM IDs",
			);

			const verticalResponse = await mondayApi(verticalQuery);

			// Extract ad unit IDs from the vertical results
			verticalResponse.data?.boards?.[0]?.items_page?.items?.forEach(
				(item: Record<string, unknown>) => {
					const adUnitIdsCol = (item as MondayItemResponse).column_values?.find(
						(col: Record<string, unknown>) => col.display_value,
					);
					if (adUnitIdsCol?.display_value) {
						const ids = adUnitIdsCol.display_value
							.split(",")
							.map((id: string) => id.trim());
						ids.forEach((id: string) => {
							const parsed = Number.parseInt(id, 10);
							if (!Number.isNaN(parsed)) {
								verticalAdUnitIds.push(parsed);
							}
						});
					}
				},
			);

			console.error(
				`[findPublisherAdUnits] Found ${verticalAdUnitIds.length} ad unit IDs in verticals`,
			);

			// Add ad unit ID rules based on vertical results
			if (verticalAdUnitIds.length > 0) {
				const adUnitIdRule = `{column_id: "text__1", compare_value: [${verticalAdUnitIds.map((id) => `"${id}"`).join(", ")}], operator: any_of}`;
				allSearchRules.push(adUnitIdRule);
			}
		}

		if (allSearchRules.length > 0) {
			// Handle search logic
			if (names && names.length > 1) {
				// Multiple names - use OR logic
				rulesForQueryArray.push(...allSearchRules);
				queryOperator = "or";
			} else {
				// Single search term - simple AND
				rulesForQueryArray.push(...allSearchRules);
				queryOperator = "and";
			}
		}

		const rulesQueryParamSegment = rulesForQueryArray.join(", ");

		const query = `{
      boards(ids: ${GAM_BOARD_ID}) {
        items_page(limit: 500, query_params: { rules: [${rulesQueryParamSegment}], operator: ${queryOperator} }) {
          items {
            name
            column_values(ids: ["text__1", "text2__1", "color_mkqp16yy", "board_relation_mkqp4eh1"]) {
              column {
                title
              }
              ... on TextValue {
                text
              }
              ... on BoardRelationValue {
                display_value
              }
              ... on StatusValue {
                text
                index
              }
            }
          }
        }
      }
    }`;

		console.error("[findPublisherAdUnits] Query:", query.substring(0, 500));
		console.error("[findPublisherAdUnits] Executing query");

		const response = await mondayApi(query);

		console.error("[findPublisherAdUnits] Response structure:", {
			hasData: !!response?.data,
			hasBoards: !!response?.data?.boards,
			boardsLength: response?.data?.boards?.length,
			hasItemsPage: !!response?.data?.boards?.[0]?.items_page,
			itemsCount: response?.data?.boards?.[0]?.items_page?.items?.length ?? 0,
		});

		const allItems = response?.data?.boards?.[0]?.items_page?.items ?? [];

		// Process and simplify the results
		const publishers = allItems
			.map((item: Record<string, unknown>) => {
				const result: {
					name: string;
					adUnitId: string | null;
					parentAdUnitId: string | null;
					type: string;
					parentPublisher?: string;
				} = {
					name: item.name as string,
					adUnitId: null,
					parentAdUnitId: null,
					type: "Unknown",
					parentPublisher: undefined,
				};

				(item as MondayItemResponse).column_values.forEach(
					(col: Record<string, unknown>) => {
						const title = (col as MondayColumnValueResponse).column?.title;
						if (title === "Ad Unit ID") {
							result.adUnitId = (col.text as string) || null;
						} else if (title === "Parent Ad Unit ID") {
							result.parentAdUnitId = (col.text as string) || null;
						} else if (title === "Type") {
							// Map type index to readable string
							if (col.index === 4) {
								result.type = "Publisher Group";
							} else if (col.index === 3) {
								result.type = "Publisher";
							}
						} else if (title === "Parent Ad Unit") {
							// Only use for display name
							if (col.display_value) {
								result.parentPublisher = col.display_value as string;
							}
						}
					},
				);
				return result;
			})
			// Filter out items that don't have the correct type when using OR logic
			.filter((item: Record<string, unknown>) => {
				if (queryOperator === "or" && names && names.length > 1) {
					return item.type === "Publisher Group" || item.type === "Publisher";
				}
				return true;
			});

		// If we found publishers by name, also fetch their parent groups
		let parentGroups: Array<Record<string, unknown>> = [];
		if (names && names.length > 0 && publishers.length > 0) {
			// Get unique parent GAM IDs from publishers
			const parentGamIds = [
				...new Set(
					publishers
						.filter((p) => p.parentAdUnitId)
						.map((p) => p.parentAdUnitId),
				),
			];

			if (parentGamIds.length > 0) {
				console.error(
					`[findPublisherAdUnits] Fetching parent groups for GAM IDs: ${parentGamIds.join(", ")}`,
				);

				// Search for parent groups that have these GAM IDs
				const parentQuery = `{
          boards(ids: ${GAM_BOARD_ID}) {
            items_page(limit: 500, query_params: { 
              rules: [
                {column_id: "color_mkqp16yy", compare_value: [4], operator: any_of},
                {column_id: "color_mkqpmnmr", compare_value: [${sourceIndex}], operator: any_of}
              ],
              operator: and
            }) {
              items {
                name
                column_values {
                  column {
                    title
                  }
                  ... on TextValue {
                    text
                  }
                  ... on StatusValue {
                    index
                  }
                }
              }
            }
          }
        }`;

				const parentResponse = await mondayApi(parentQuery);
				const allParentItems =
					parentResponse?.data?.boards?.[0]?.items_page?.items || [];

				// Filter parent groups to only those matching our GAM IDs
				parentGroups = allParentItems
					.map((item: Record<string, unknown>) => {
						const result: any = {
							name: item.name,
							adUnitId: null,
							type: "Publisher Group",
						};

						(item as MondayItemResponse).column_values.forEach(
							(col: Record<string, unknown>) => {
								if (
									(col as MondayColumnValueResponse).column?.title ===
									"Ad Unit ID"
								) {
									result.adUnitId = col.text || null;
								}
							},
						);

						return result;
					})
					.filter((group: Record<string, unknown>) =>
						parentGamIds.includes(group.adUnitId as string),
					);

				console.error(
					`[findPublisherAdUnits] Found ${parentGroups.length} parent groups`,
				);
			}
		}

		// If we're searching for specific names, fetch child ad units
		let childAdUnits: Array<Record<string, unknown>> = [];
		if (names && names.length > 0 && publishers.length > 0) {
			console.error(
				"[findPublisherAdUnits] Fetching child ad units for found publishers...",
			);

			// Get the GAM IDs of all found publishers
			const publisherGamIds = publishers
				.filter((p) => p.adUnitId)
				.map((p) => p.adUnitId);
			console.error(
				`[findPublisherAdUnits] Publisher GAM IDs to search children for: ${publisherGamIds.join(", ")}`,
			);

			// Query for child ad units by matching Parent Ad Unit ID with publisher GAM IDs
			// We filter by text2__1 (Parent Ad Unit ID) matching any of our publisher GAM IDs
			const childQuery = `{
        boards(ids: ${GAM_BOARD_ID}) {
          items_page(
            limit: 500,
            query_params: {
              rules: [
                {column_id: "text2__1", compare_value: [${publisherGamIds.map((id) => `"${id}"`).join(", ")}], operator: any_of},
                {column_id: "color_mkqpmnmr", compare_value: [${sourceIndex}], operator: any_of}
              ],
              operator: and
            }
          ) {
            items {
              name
              column_values {
                column {
                  title
                }
                ... on TextValue {
                  text
                }
                ... on BoardRelationValue {
                  display_value
                }
                ... on StatusValue {
                  text
                  index
                }
                ... on NumbersValue {
                  number
                }
              }
            }
          }
        }
      }`;

			const childResponse = await mondayApi(childQuery);
			const allChildItems =
				childResponse?.data?.boards?.[0]?.items_page?.items || [];

			console.error(
				`[findPublisherAdUnits] Child query returned ${allChildItems.length} items of types 1 or 2`,
			);

			// Debug: log first few items to see their parent relationships
			if (allChildItems.length > 0) {
				console.error(
					`[findPublisherAdUnits] Sample child items (first 3):`,
					allChildItems.slice(0, 3).map((item: Record<string, unknown>) => ({
						name: item.name,
						parentAdUnitId: (item as MondayItemResponse).column_values?.find(
							(col: Record<string, unknown>) =>
								(col as MondayColumnValueResponse).column?.title ===
								"Parent Ad Unit ID",
						)?.text,
					})),
				);
			}

			// Map all child items to extract their data (already filtered by query)
			childAdUnits = allChildItems.map((item: Record<string, unknown>) => {
				const result: any = {
					name: item.name,
					type: "Child Ad Unit",
					adUnitId: null,
					parentAdUnitId: null,
					parent: null,
				};

				(item as MondayItemResponse).column_values.forEach(
					(col: Record<string, unknown>) => {
						const title = (col as MondayColumnValueResponse).column?.title;

						switch (title) {
							case "Ad Unit ID":
								result.adUnitId = col.text || null;
								break;
							case "Parent Ad Unit ID":
								result.parentAdUnitId = col.text || null;
								break;
							case "Type":
								// Type might be different for child units
								if (col.index !== undefined) {
									result.typeIndex = col.index;
								}
								break;
							case "Parent Ad Unit":
								// Only for display name
								result.parent = col.display_value || null;
								break;
						}
					},
				);

				return result;
			});

			console.error(
				`[findPublisherAdUnits] Found ${childAdUnits.length} child ad units`,
			);
		}

		if (countOnly) {
			const _totalCount =
				parentGroups.length + publishers.length + childAdUnits.length;
			return JSON.stringify({
				tool: "findPublisherAdUnits",
				timestamp: new Date().toISOString(),
				status: "success",
				data: {
					counts: {
						publisherGroups: parentGroups.length,
						publishers: publishers.length,
						childAdUnits: childAdUnits.length,
						total: parentGroups.length + publishers.length + childAdUnits.length
					}
				},
				metadata: {
					source,
					searchCriteria: {
						names: names || [],
						verticals: verticals || []
					}
				}
			}, null, 2);
		}

		// Combine parent groups with those found directly
		const allPublisherGroups = [
			...parentGroups,
			...publishers.filter((p) => p.type === "Publisher Group"),
		].filter(
			(group, index, self) =>
				index === self.findIndex((g) => (g as any).adUnitId === (group as any).adUnitId), // unique by adUnitId
		);

		// Group by type for better organization
		const publisherGroups = allPublisherGroups;
		const regularPublishers = publishers.filter((p) => p.type === "Publisher");
		const childAdUnitItems = childAdUnits.filter((c) => c.type === "Ad Unit");
		const childAdPlacements = childAdUnits.filter(
			(c) => c.type === "Ad Placement",
		);

		// Build hierarchical structure
		const hierarchicalData = [];

		// Add publisher groups with their children
		for (const pg of publisherGroups) {
			const groupEntry: any = {
				name: pg.name,
				type: "Publisher Group",
				adUnitId: pg.adUnitId || null,
				children: []
			};

			// Find publishers belonging to this group
			const groupPublishers = regularPublishers.filter(p => p.parentAdUnitId === pg.adUnitId);
			
			for (const pub of groupPublishers) {
				const pubEntry: any = {
					name: pub.name,
					type: "Publisher",
					adUnitId: pub.adUnitId || null,
					children: []
				};

				// Find ad units belonging to this publisher
				const pubChildren = childAdUnits.filter((c) => c.parentAdUnitId === pub.adUnitId);
				for (const child of pubChildren) {
					pubEntry.children.push({
						name: child.name,
						type: child.type,
						adUnitId: child.adUnitId || null
					});
				}

				groupEntry.children.push(pubEntry);
			}

			hierarchicalData.push(groupEntry);
		}

		// Add standalone publishers (those without parent groups in our results)
		const standalonePublishers = regularPublishers.filter(p => 
			!publisherGroups.some(pg => pg.adUnitId === p.parentAdUnitId)
		);

		for (const pub of standalonePublishers) {
			const pubEntry: any = {
				name: pub.name,
				type: "Publisher", 
				adUnitId: pub.adUnitId || null,
				parentAdUnitId: pub.parentAdUnitId || null,
				children: []
			};

			// Find ad units belonging to this publisher
			const pubChildren = childAdUnits.filter((c) => c.parentAdUnitId === pub.adUnitId);
			for (const child of pubChildren) {
				pubEntry.children.push({
					name: child.name,
					type: child.type,
					adUnitId: child.adUnitId || null
				});
			}

			hierarchicalData.push(pubEntry);
		}

		// Extract all IDs for easy use
		const allAdUnitIds = [
			...publisherGroups.map(p => p.adUnitId).filter(id => id !== null),
			...regularPublishers.map(p => p.adUnitId).filter(id => id !== null),
			...childAdUnits.map(c => c.adUnitId).filter(id => id !== null),
		];

		// Build metadata
		const metadata = {
			source,
			totalItems: publisherGroups.length + regularPublishers.length + childAdUnits.length,
			counts: {
				publisherGroups: publisherGroups.length,
				publishers: regularPublishers.length,
				adUnits: childAdUnitItems.length,
				adPlacements: childAdPlacements.length
			},
			searchCriteria: {
				names: names || [],
				verticals: verticals || []
			},
			forecastUsage: {
				hierarchy: "Publisher Group → Publisher → Ad Unit",
				guidelines: [
					"Never include more than one hierarchy level when forecasting with targetedAdUnitIds",
					"Can include publisher group in targetedAdUnits and exclude specific publisher(s) in excludedAdUnitIds",
					"Can target publisher and exclude specific ad unit(s)",
					"Only use IDs for forecasting, not names"
				],
				allAdUnitIds
			}
		};

		return JSON.stringify({
			tool: "findPublisherAdUnits",
			timestamp: new Date().toISOString(),
			status: "success",
			metadata,
			data: hierarchicalData,
			options: {
				summary: `Found ${metadata.counts.publisherGroups} publisher groups, ${metadata.counts.publishers} publishers, and ${metadata.counts.adUnits + metadata.counts.adPlacements} ad units`
			}
		}, null, 2);
	} catch (error) {
		console.error("Error finding publisher ad units:", error);
		throw new Error(
			`Failed to find publisher ad units: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}
