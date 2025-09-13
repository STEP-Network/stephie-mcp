import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";

interface Team {
	mondayItemId: string;
	name: string;
	lead?: { id: string; name: string };
	teamMembers?: Array<{ id: string; name: string }>;
	boardId?: string;
	objectives?: Array<{ id: string; name: string }>;
}

export async function getTeams() {
	const BOARD_ID = "1631927696";
	
	// Specific columns to fetch
	// Lead: person column (need to find by type)
	// Team Members: multiple_person_mkvrqa7z
	// Board ID: board_id_mkn336m7
	// Objectives: link_to_okrs__1
	const specificColumns = [
		"multiple_person_mkvrqa7z", // Team Members
		"board_id_mkn336m7", // Board ID
		"link_to_okrs__1" // Objectives
	];

	// First query to get all columns and identify the person column for Lead
	const columnsQuery = `
		query {
			boards(ids: [${BOARD_ID}]) {
				columns {
					id
					title
					type
				}
			}
		}
	`;

	const columnsResponse = await mondayApi(columnsQuery);
	const columns = columnsResponse.data?.boards?.[0]?.columns || [];
	
	// Find the person column (Lead)
	const personColumn = columns.find((col: any) => col.type === "person");
	if (personColumn) {
		specificColumns.push(personColumn.id);
	}

	const query = `
		query {
			boards(ids: [${BOARD_ID}]) {
				id
				name
				items_page(limit: 500) {
					items {
						id
						name
						column_values(ids: [${specificColumns.map((id) => `"${id}"`).join(", ")}]) {
							id
							text
							value
							... on BoardRelationValue {
								linked_items { id name }
							}
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
		console.error("[getTeams] Fetching teams with specific columns...");
		
		const response = await mondayApi(query);
		const board = response.data?.boards?.[0];
		if (!board) throw new Error("Board not found");

		const items = board.items_page?.items || [];

		// Process teams
		const teams: Team[] = [];
		let totalTeamMembers = 0;
		let totalObjectives = 0;

		for (const item of items as MondayItemResponse[]) {
			const columnValues = item.column_values || [];

			// Helper to find column value by ID
			const findColumnById = (id: string) => {
				return columnValues.find((col: MondayColumnValueResponse) => 
					col.id === id
				);
			};

			// Parse Lead (person column)
			let lead: { id: string; name: string } | undefined;
			const leadCol = personColumn ? findColumnById(personColumn.id) : null;
			if (leadCol?.text && leadCol?.value) {
				// Name is in the text field, ID is in the value field
				const parsedValue = JSON.parse(leadCol.value);
				if (parsedValue?.personsAndTeams?.[0]) {
					lead = {
						id: String(parsedValue.personsAndTeams[0].id),
						name: leadCol.text
					};
				}
			}

			// Parse Team Members
			let teamMembers: Array<{ id: string; name: string }> = [];
			const membersCol = findColumnById("multiple_person_mkvrqa7z");
			if (membersCol?.text && membersCol?.value) {
				// Names are in the text field, IDs are in the value field
				const names = membersCol.text.split(", ");
				const parsedValue = JSON.parse(membersCol.value);
				const persons = parsedValue?.personsAndTeams || [];
				
				teamMembers = persons.map((person: any, index: number) => ({
					id: String(person.id),
					name: names[index] || `Person ${person.id}`
				}));
			}

			// Parse Board ID
			const boardIdCol = findColumnById("board_id_mkn336m7");
			const boardId = boardIdCol?.text || undefined;

			// Parse Objectives (board relation)
			let objectives: Array<{ id: string; name: string }> = [];
			const objectivesCol = findColumnById("link_to_okrs__1");
			if (objectivesCol) {
				const col = objectivesCol as MondayColumnValueResponse & { 
					linked_items?: Array<{ id: string; name: string }> 
				};
				if (col.linked_items && col.linked_items.length > 0) {
					objectives = col.linked_items.map(item => ({
						id: String(item.id),
						name: item.name
					}));
				}
			}

			const team: Team = {
				mondayItemId: String(item.id),
				name: String(item.name),
				lead,
				teamMembers,
				boardId,
				objectives
			};

			teams.push(team);

			// Count statistics
			totalTeamMembers += teamMembers.length;
			totalObjectives += objectives.length;
		}

		// Sort teams by name
		teams.sort((a, b) => a.name.localeCompare(b.name));

		// Build metadata
		const totalTeams = teams.length;
		const teamsWithLead = teams.filter(t => t.lead).length;
		const teamsWithObjectives = teams.filter(t => t.objectives && t.objectives.length > 0).length;
		const averageTeamSize = totalTeams > 0 ? Math.round(totalTeamMembers / totalTeams) : 0;

		const metadata = {
			boardId: BOARD_ID,
			boardName: board.name,
			totalTeams,
			totalTeamMembers,
			totalObjectives,
			teamsWithLead,
			teamsWithObjectives,
			averageTeamSize,
			columnsQueried: [
				personColumn ? `Lead (${personColumn.id})` : "Lead (not found)",
				"Team Members (multiple_person_mkvrqa7z)",
				"Board ID (board_id_mkn336m7)",
				"Objectives (link_to_okrs__1)"
			]
		};

		const summary = `Found ${totalTeams} team${totalTeams !== 1 ? 's' : ''} (${teamsWithLead} with lead, ${totalTeamMembers} total member${totalTeamMembers !== 1 ? 's' : ''}, ${totalObjectives} objective${totalObjectives !== 1 ? 's' : ''})`;

		return JSON.stringify(
			{
				tool: "getTeams",
				timestamp: new Date().toISOString(),
				status: "success",
				data: teams,
				metadata,
				options: { summary }
			},
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching Teams:", error);
		throw error;
	}
}