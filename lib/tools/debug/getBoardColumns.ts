import { mondayApi } from "../../monday/client.js";
import { createListResponse } from "../json-output.js";

export async function getBoardColumns(boardId: string = "1222800432") {
	const query = `
    query GetBoardColumns($boardId: ID!) {
      boards(ids: [$boardId]) {
        id
        name
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `;

	const variables = { boardId };

	try {
		const response = await mondayApi(query, variables);

		if (!response.data?.boards || response.data.boards.length === 0) {
			return JSON.stringify({ error: "Board not found", columns: [] as unknown[] }, null, 2);
		}

		const board = response.data.boards[0];
		const columns = board.columns || [];

		// Parse settings for status and dropdown columns
		const parseColumnSettings = (col: Record<string, unknown>) => {
			const baseInfo = {
				id: col.id,
				title: col.title,
				type: col.type,
			};

			// Parse settings_str for status and dropdown columns
			if (
				(col.type === "status" ||
					col.type === "dropdown" ||
					col.type === "color") &&
				col.settings_str
			) {
				try {
					const settings = JSON.parse(col.settings_str as string);
					if (settings.labels) {
						// Convert labels object to array with indices
						const options = Object.entries(settings.labels)
							.map(([index, label]: [string, unknown]) => ({
								index: parseInt(index, 10),
								label: typeof label === "string" ? label : label.toString(),
							}))
							.sort((a, b) => a.index - b.index);

						return {
							...baseInfo,
							options,
						};
					}
				} catch (e) {
					console.error(`Failed to parse settings for column ${col.id}:`, e);
				}
			}

			return baseInfo;
		};

		// Find format-related columns
		const formatColumns = columns.filter((col: Record<string, unknown>) => {
			const title = (col.title as string).toLowerCase();
			return (
				title.includes("scroll") ||
				title.includes("banner") ||
				title.includes("video") ||
				title.includes("sticky") ||
				title.includes("wall") ||
				title.includes("cube") ||
				title.includes("format")
			);
		});

		return JSON.stringify(
			createListResponse(
				"getBoardColumns",
				[{
					boardName: board.name,
					totalColumns: columns.length,
					columns: columns.map(parseColumnSettings),
					formatColumns: formatColumns.map(parseColumnSettings),
				}],
				{
					boardId: boardId,
					boardName: board.name,
					totalColumns: columns.length,
					formatColumnsCount: formatColumns.length
				},
				{
					summary: `Board "${board.name}" has ${columns.length} columns (${formatColumns.length} format-related)`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching board columns:", error);
		throw error;
	}
}
