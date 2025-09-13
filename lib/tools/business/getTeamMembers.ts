import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";

interface Person {
	mondayItemId: string;
	peopleId: string; // ID from person column
	name: string;
	jobTitle?: string; // text__1
	startDate?: string; // date__1
	email?: string; // email__1
	taskBoardId?: string; // lookup_mkqn1bdr
	teams?: Array<{ id: string; name: string }>; // link_to_teams__1
	objectives?: Array<{ id: string; name: string }>; // link_to_objectives__1
}

interface LeaderGroup {
	leaderId: string;
	leaderName: string;
	people: Person[];
}

export async function getTeamMembers() {
	const BOARD_ID = "1612664689";
	
	// Hardcoded column IDs based on the provided structure
	const COLUMN_IDS = [
		"text__1", // Job Title
		"person", // Person
		"people__1", // Leader
		"date__1", // Start Date
		"email__1", // Email
		"lookup_mkqn1bdr", // Task Board ID
		"link_to_teams__1", // Teams
		"link_to_objectives__1" // link to Objectives
	];

	const query = `
		query {
			boards(ids: [${BOARD_ID}]) {
				id
				name
				items_page(limit: 500) {
					items {
						id
						name
						column_values(ids: [${COLUMN_IDS.map((id) => `"${id}"`).join(", ")}]) {
							id
							text
							value
							... on BoardRelationValue {
								linked_items { id name }
							}
							... on MirrorValue {
								display_value
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
		console.error("[getTeamMembers] Fetching team members...");
		
		const response = await mondayApi(query);
		const board = response.data?.boards?.[0];
		if (!board) throw new Error("Board not found");

		const items = board.items_page?.items || [];

		// Process people and group by leaders
		const leaderGroups: Map<string, LeaderGroup> = new Map();
		const unassignedPeople: Person[] = [];
		const totalStats = {
			totalPeople: 0,
			withEmail: 0,
			withJobTitle: 0,
			withLeader: 0,
			withStartDate: 0
		};

		for (const item of items as MondayItemResponse[]) {
			const columnValues = item.column_values || [];

			// Helper to find column by ID
			const findColumnById = (id: string) => {
				return columnValues.find((col: MondayColumnValueResponse) => col.id === id);
			};

			// Get column values by specific IDs
			const jobTitleCol = findColumnById("text__1");
			const personCol = findColumnById("person");
			const leaderCol = findColumnById("people__1");
			const startDateCol = findColumnById("date__1");
			const emailCol = findColumnById("email__1");
			const taskBoardIdCol = findColumnById("lookup_mkqn1bdr") as MondayColumnValueResponse & { display_value?: string };
			const teamsCol = findColumnById("link_to_teams__1");
			const objectivesCol = findColumnById("link_to_objectives__1");

			// Parse values
			const jobTitle = jobTitleCol?.text || null;
			
			// Extract peopleId from person column
			let peopleId = "";
			if (personCol?.value) {
				try {
					const parsedValue = JSON.parse(personCol.value);
					if (parsedValue?.personsAndTeams?.[0]) {
						peopleId = String(parsedValue.personsAndTeams[0].id);
					}
				} catch (e) {
					// If parsing fails, use item ID as fallback
					peopleId = String(item.id);
				}
			} else {
				peopleId = String(item.id);
			}
			
			// Extract leader for grouping (but don't include in person object)
			const leader = leaderCol?.text || null;
			const startDate = startDateCol?.text || null;
			const email = emailCol?.text || null;
			
			// Extract taskBoardId from mirror column
			const taskBoardId = taskBoardIdCol?.display_value || taskBoardIdCol?.text || null;

			// Parse team relations
			let teams: Array<{ id: string; name: string }> = [];
			if (teamsCol) {
				const col = teamsCol as MondayColumnValueResponse & { 
					linked_items?: Array<{ id: string; name: string }> 
				};
				teams = col.linked_items || [];
			}

			// Parse objectives relations
			let objectives: Array<{ id: string; name: string }> = [];
			if (objectivesCol) {
				const col = objectivesCol as MondayColumnValueResponse & { 
					linked_items?: Array<{ id: string; name: string }> 
				};
				objectives = col.linked_items || [];
			}

			const person: Person = {
				mondayItemId: String(item.id),
				peopleId,
				name: String(item.name),
				jobTitle,
				startDate,
				email,
				taskBoardId,
				teams,
				objectives
			};

			// Update statistics
			totalStats.totalPeople++;
			if (email) totalStats.withEmail++;
			if (jobTitle) totalStats.withJobTitle++;
			if (leader) totalStats.withLeader++;
			if (startDate) totalStats.withStartDate++;
			if (leader) totalStats.withLeader++;

			// Group by leader
			if (leader) {
				// Use leader name as both ID and name since we only have the text value
				const leaderKey = leader;
				if (!leaderGroups.has(leaderKey)) {
					leaderGroups.set(leaderKey, {
						leaderId: leaderKey,
						leaderName: leader,
						people: []
					});
				}
				const leaderGroup = leaderGroups.get(leaderKey);
				if (leaderGroup) {
					leaderGroup.people.push(person);
				}
			} else {
				unassignedPeople.push(person);
			}
		}

		// Convert map to array and sort by leader name
		const leaderGroupsArray = Array.from(leaderGroups.values())
			.sort((a, b) => a.leaderName.localeCompare(b.leaderName));

		// Build metadata
		const metadata = {
			boardId: BOARD_ID,
			boardName: board.name,
			totalLeaders: leaderGroupsArray.length,
			unassignedCount: unassignedPeople.length,
			...totalStats,
			columnsUsed: COLUMN_IDS
		};

		const summary = `Found ${totalStats.totalPeople} people across ${leaderGroupsArray.length} leaders (${unassignedPeople.length} unassigned)`;

		// Prepare final data structure
		const data = {
			leaderGroups: leaderGroupsArray,
			unassignedPeople
		};

		return JSON.stringify(
			{
				tool: "getTeamMembers",
				timestamp: new Date().toISOString(),
				status: "success",
				data,
				metadata,
				options: { summary }
			},
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching People:", error);
		throw error;
	}
}