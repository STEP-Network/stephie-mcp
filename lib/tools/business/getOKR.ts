import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse } from "../json-output.js";

export async function getOKR(
	params: {
		limit?: number;
		search?: string;
		status?: number; // Objective status (0=Planned, 1=In Progress, 2=On Hold, 3=Done, 4=Cancelled)
		teamId?: string; // Filter by team ID (use getTeams to find team IDs)
		includeKeyResults?: boolean; // Whether to include Key Results (default: true)
		onlyActive?: boolean; // Filter to only active objectives (In Progress)
		strategiesId?: string; // Filter by linked strategies (use getStrategies to find IDs)
		peopleId?: string; // Filter by linked people (use getPeople to find IDs)
	} = {},
) {
	const {
		limit = 10,
		search,
		status,
		teamId,
		includeKeyResults = true,
		onlyActive = false,
		strategiesId,
		peopleId,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1631918659";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

	// Build filters for objectives
	const filters: Array<Record<string, unknown>> = [];
	if (search) {
		filters.push({
			column_id: "name",
			compare_value: search,
			operator: "contains_text",
		});
	}

	if (status !== undefined) {
		filters.push({
			column_id: "color_mkpksp3f",
			compare_value: [status],
			operator: "any_of",
		});
	} else if (onlyActive) {
		// In Progress = index 1
		filters.push({
			column_id: "color_mkpksp3f",
			compare_value: [1],
			operator: "any_of",
		});
	}

	const queryParams =
		filters.length > 0
			? `, query_params: { rules: [${filters
					.map(
						(f) => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === "string" ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`,
					)
					.join(",")}]}`
			: "";

	// Build the query with optional subitems
	const subitems = includeKeyResults
		? `
    subitems {
      id
      name
      column_values(ids: [${dynamicColumns.map((id) => `"${id}"`).join(", ")}]) {
        id
        text
        value
        column {
          title
        }
      }
    }`
		: "";

	const query = `
    query {
      boards(ids: [1631918659]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: ["color_mkpksp3f", "people__1", "lookup_mkpkjxjy", "date4", "description_mkmp3w28", "connect_boards__1", "link_to_strategies__1", "connect_boards35__1"]) {
              id
              text
              value
              column {
                title
                type
              }
            }
            ${subitems}
          }
        }
      }
    }
  `;

	try {
		const response = await mondayApi(query);
		const board = response.data?.boards?.[0];
		if (!board) throw new Error("OKR board not found");

		let items = board.items_page?.items || [];

		// Filter by team ID if specified (post-query filtering since board_relation doesn't support query params)
		if (teamId) {
			items = items.filter((item: Record<string, unknown>) => {
				const teamCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards__1",
				);
				// Parse the value field which contains linked item IDs
				if (teamCol?.value) {
					try {
						const linkedItems = JSON.parse(teamCol.value);
						// Check if the teamId is in the linkedItemIds array
						return linkedItems?.linkedItemIds?.includes(teamId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		// Filter by strategies ID if specified
		if (strategiesId) {
			items = items.filter((item: Record<string, unknown>) => {
				const stratCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "link_to_strategies__1",
				);
				if (stratCol?.value) {
					try {
						const linked = JSON.parse(stratCol.value);
						return linked?.linkedItemIds?.includes(strategiesId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		// Filter by people ID if specified
		if (peopleId) {
			items = items.filter((item: Record<string, unknown>) => {
				const peopleCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards35__1",
				);
				if (peopleCol?.value) {
					try {
						const linked = JSON.parse(peopleCol.value);
						return linked?.linkedItemIds?.includes(peopleId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		// Format items for JSON response
		const formattedItems = items.map((item: Record<string, unknown>) => {
			const formatted: any = {
				id: item.id,
				name: item.name,
				createdAt: item.created_at,
				updatedAt: item.updated_at,
			};

			// Parse objective columns
			const statusCol = (item as MondayItemResponse).column_values.find(
				(c: Record<string, unknown>) => c.id === "color_mkpksp3f",
			);
			const ownerCol = (item as MondayItemResponse).column_values.find(
				(c: Record<string, unknown>) => c.id === "people__1",
			);
			const progressCol = (item as MondayItemResponse).column_values.find(
				(c: Record<string, unknown>) => c.id === "lookup_mkpkjxjy",
			);
			const deadlineCol = (item as MondayItemResponse).column_values.find(
				(c: Record<string, unknown>) => c.id === "date4",
			);
			const descCol = (item as MondayItemResponse).column_values.find(
				(c: Record<string, unknown>) => c.id === "description_mkmp3w28",
			);
			const teamCol = (item as MondayItemResponse).column_values.find(
				(c: Record<string, unknown>) => c.id === "connect_boards__1",
			);
			const strategiesCol = (item as MondayItemResponse).column_values.find(
				(c: Record<string, unknown>) => c.id === "link_to_strategies__1",
			);
			const peopleCol = (item as MondayItemResponse).column_values.find(
				(c: Record<string, unknown>) => c.id === "connect_boards35__1",
			);

			// Parse status
			const statusLabels = ["Planned", "In Progress", "On Hold", "Done", "Cancelled"];
			const statusValue = statusCol?.value ? JSON.parse(statusCol.value) : null;
			formatted.status = {
				index: statusValue?.index,
				label: statusCol?.text || null,
				value: statusLabels[statusValue?.index] || statusCol?.text || null
			};

			// Parse other fields
			formatted.owner = ownerCol?.text || null;
			formatted.progress = progressCol?.text || null;
			formatted.deadline = deadlineCol?.text || null;
			formatted.description = descCol?.text || null;
			formatted.team = teamCol?.text || null;

			// Parse board relations
			if (teamCol?.value) {
				try {
					const linked = JSON.parse(teamCol.value);
					formatted.teamIds = linked?.linkedItemIds || [];
				} catch {
					formatted.teamIds = [];
				}
			}

			if (strategiesCol?.value) {
				try {
					const linked = JSON.parse(strategiesCol.value);
					formatted.strategiesIds = linked?.linkedItemIds || [];
				} catch {
					formatted.strategiesIds = [];
				}
			}

			if (peopleCol?.value) {
				try {
					const linked = JSON.parse(peopleCol.value);
					formatted.peopleIds = linked?.linkedItemIds || [];
				} catch {
					formatted.peopleIds = [];
				}
			}

			// Add Key Results if included
			if (includeKeyResults && item.subitems) {
				formatted.keyResults = (item.subitems as MondayItemResponse[]).map((kr: MondayItemResponse) => {
					const krStatus = kr.column_values?.find(
						(c: Record<string, unknown>) => c.id === "status0__1",
					);
					const krOwner = kr.column_values?.find(
						(c: Record<string, unknown>) => c.id === "person",
					);
					const krProgress = kr.column_values?.find(
						(c: Record<string, unknown>) => c.id === "numbers__1",
					);
					const krDeadline = kr.column_values?.find(
						(c: Record<string, unknown>) => c.id === "date8__1",
					);
					const krDesc = kr.column_values?.find(
						(c: Record<string, unknown>) => c.id === "text_1__1",
					);

					return {
						id: kr.id,
						name: kr.name,
						status: krStatus?.text || null,
						owner: krOwner?.text || null,
						progress: krProgress?.text || null,
						deadline: krDeadline?.text || null,
						description: krDesc?.text || null
					};
				});
			} else if (item.subitems) {
				formatted.keyResultsCount = (item.subitems as string[]).length;
			}

			return formatted;
		});

		// Calculate statistics
		const stats = {
			totalObjectives: formattedItems.length,
			totalKeyResults: 0,
			byStatus: {} as Record<string, number>,
			averageKRsPerObjective: 0
		};

		formattedItems.forEach(item => {
			const statusLabel = item.status?.label || "No Status";
			stats.byStatus[statusLabel] = (stats.byStatus[statusLabel] || 0) + 1;
			if (item.keyResults) {
				stats.totalKeyResults += item.keyResults.length;
			} else if (item.keyResultsCount) {
				stats.totalKeyResults += item.keyResultsCount;
			}
		});

		if (stats.totalObjectives > 0) {
			stats.averageKRsPerObjective = Number((stats.totalKeyResults / stats.totalObjectives).toFixed(1));
		}

		// Build metadata
		const metadata: Record<string, any> = {
			boardId: BOARD_ID,
			boardName: "OKR",
			limit,
			filters: {},
			statistics: stats
		};

		if (search) metadata.filters.search = search;
		if (status !== undefined) metadata.filters.status = status;
		if (teamId) metadata.filters.teamId = teamId;
		if (strategiesId) metadata.filters.strategiesId = strategiesId;
		if (peopleId) metadata.filters.peopleId = peopleId;
		if (onlyActive) metadata.filters.onlyActive = true;
		if (!includeKeyResults) metadata.filters.includeKeyResults = false;

		return JSON.stringify(
			createListResponse(
				"getOKR",
				formattedItems,
				metadata,
				{
					summary: `Found ${formattedItems.length} objective${formattedItems.length !== 1 ? 's' : ''}${includeKeyResults ? ` with ${stats.totalKeyResults} key result${stats.totalKeyResults !== 1 ? 's' : ''}` : ''}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching OKR items:", error);
		throw error;
	}
}
