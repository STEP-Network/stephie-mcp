import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";

interface ChangelogEntry {
	id: string;
	name: string;
	date: string | null;
	publisher: string[];
	topic: string[];
	yieldStatus: string | null;
	createdBy: string | null;
	createdAt: string;
	lastUpdatedBy: string | null;
	lastUpdatedAt: string;
	boardCreatedAt: string;
	boardUpdatedAt: string;
}

export async function getChangelog(params: { search?: string; limit?: number } = {}) {
	const { search, limit = 100 } = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1222800670";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

	// Include static columns we know about
	const staticColumns = [
		"date1", // Date
		"publisher_", // Publisher tags
		"tags", // Topic tags
		"creation_log", // Creation Log
		"last_updated", // Last Updated
		"status__1", // Yield status
	];

	// Combine static and dynamic columns
	const allColumns = [...new Set([...staticColumns, ...dynamicColumns])];

	// Build filters
	const filters: Array<Record<string, unknown>> = [];
	if (search) {
		filters.push({
			column_id: "name",
			compare_value: search,
			operator: "contains_text",
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

	const query = `
    query {
      boards(ids: [${BOARD_ID}]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: [${allColumns.map((id) => `"${id}"`).join(", ")}]) {
              id
              text
              value
              column {
                id
                title
                type
              }
            }
          }
        }
      }
    }
  `;

	try {
		const response = await mondayApi(query);
		const board = response.data?.boards?.[0];
		if (!board) throw new Error("Board not found");

		const items = board.items_page?.items || [];

		// Process changelog entries
		const changelogEntries: ChangelogEntry[] = [];
		const topicCounts = new Map<string, number>();
		const publisherCounts = new Map<string, number>();

		for (const item of items) {
			const mondayItem = item as MondayItemResponse;
			const columnValues = mondayItem.column_values || [];

			// Helper to find column value by ID
			const getColumnValue = (id: string) => {
				return columnValues.find(
					(col: Record<string, unknown>) => col.id === id,
				) as MondayColumnValueResponse | undefined;
			};

			// Extract key fields
			const dateCol = getColumnValue("date1");
			const publisherCol = getColumnValue("publisher_");
			const topicCol = getColumnValue("tags");
			const creationLogCol = getColumnValue("creation_log");
			const lastUpdatedCol = getColumnValue("last_updated");
			const yieldCol = getColumnValue("status__1");

			// Parse date
			let date: string | null = null;
			if (dateCol?.value) {
				const parsedDate = JSON.parse(dateCol.value);
				date = parsedDate?.date || null;
			}

			// Parse tags (publisher and topic)
			let publishers: string[] = [];
			if (publisherCol?.value) {
				const parsedTags = JSON.parse(publisherCol.value);
				if (parsedTags?.tag_ids) {
					publishers = parsedTags.tag_ids.map((id: number) => {
						// Map tag ID to name if possible
						return publisherCol.text?.split(',').map((t: string) => t.trim()) || [];
					}).flat();
				} else if (publisherCol.text) {
					publishers = publisherCol.text.split(',').map((t: string) => t.trim());
				}
			}

			let topics: string[] = [];
			if (topicCol?.value) {
				const parsedTags = JSON.parse(topicCol.value);
				if (parsedTags?.tag_ids) {
					topics = parsedTags.tag_ids.map((id: number) => {
						// Map tag ID to name if possible
						return topicCol.text?.split(',').map((t: string) => t.trim()) || [];
					}).flat();
				} else if (topicCol.text) {
					topics = topicCol.text.split(',').map((t: string) => t.trim());
				}
			}

			// Parse creation and update logs
			let createdBy: string | null = null;
			let createdAtTime: string | null = null;
			if (creationLogCol?.text) {
				// Format: "Sep 12 by Nathaniel Refslund"
				const match = creationLogCol.text.match(/(.+) by (.+)/);
				if (match) {
					createdAtTime = match[1];
					createdBy = match[2];
				}
			}

			let lastUpdatedBy: string | null = null;
			let lastUpdatedAtTime: string | null = null;
			if (lastUpdatedCol?.text) {
				const match = lastUpdatedCol.text.match(/(.+) by (.+)/);
				if (match) {
					lastUpdatedAtTime = match[1];
					lastUpdatedBy = match[2];
				}
			}

			const entry: ChangelogEntry = {
				id: String(mondayItem.id),
				name: String(mondayItem.name),
				date,
				publisher: publishers,
				topic: topics,
				yieldStatus: yieldCol?.text || null,
				createdBy,
				createdAt: createdAtTime || String(mondayItem.created_at),
				lastUpdatedBy,
				lastUpdatedAt: lastUpdatedAtTime || String(mondayItem.updated_at),
				boardCreatedAt: String(mondayItem.created_at),
				boardUpdatedAt: String(mondayItem.updated_at),
			};

			changelogEntries.push(entry);

			// Count topics and publishers
			for (const topic of topics) {
				topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
			}
			for (const publisher of publishers) {
				publisherCounts.set(publisher, (publisherCounts.get(publisher) || 0) + 1);
			}
		}

		// Sort entries by date (most recent first)
		changelogEntries.sort((a, b) => {
			if (a.date && b.date) {
				return new Date(b.date).getTime() - new Date(a.date).getTime();
			}
			// Fall back to board creation date if no date
			return new Date(b.boardCreatedAt).getTime() - new Date(a.boardCreatedAt).getTime();
		});

		// Group entries by month for better organization
		const entriesByMonth = new Map<string, ChangelogEntry[]>();
		for (const entry of changelogEntries) {
			const date = entry.date ? new Date(entry.date) : new Date(entry.boardCreatedAt);
			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			
			if (!entriesByMonth.has(monthKey)) {
				entriesByMonth.set(monthKey, []);
			}
			entriesByMonth.get(monthKey)?.push(entry);
		}

		// Convert to hierarchical structure
		const monthGroups = Array.from(entriesByMonth.entries())
			.sort(([a], [b]) => b.localeCompare(a)) // Sort months descending
			.map(([month, monthEntries]) => ({
				month,
				entryCount: monthEntries.length,
				entries: monthEntries
			}));

		// Get top topics and publishers
		const topTopics = Array.from(topicCounts.entries())
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)
			.map(([topic, count]) => ({ topic, count }));

		const topPublishers = Array.from(publisherCounts.entries())
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)
			.map(([publisher, count]) => ({ publisher, count }));

		// Build metadata
		const totalEntries = changelogEntries.length;
		const entriesWithYield = changelogEntries.filter(e => e.yieldStatus === "Yield").length;

		const metadata = {
			boardId: BOARD_ID,
			boardName: "Changelog",
			totalEntries,
			totalMonths: entriesByMonth.size,
			entriesWithYield,
			topTopics,
			topPublishers,
			dynamicColumnsCount: dynamicColumns.length,
			filters: search ? { search } : {}
		};

		// Return formatted response
		return JSON.stringify(
			{
				tool: "getChangelog",
				timestamp: new Date().toISOString(),
				status: "success",
				data: monthGroups,
				metadata,
				options: {
					summary: `Found ${totalEntries} changelog ${totalEntries === 1 ? 'entry' : 'entries'} across ${entriesByMonth.size} month${entriesByMonth.size !== 1 ? 's' : ''}${search ? ` matching "${search}"` : ''}`
				}
			},
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching Changelog:", error);
		throw error;
	}
}