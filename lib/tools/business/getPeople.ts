import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";

interface Person {
	mondayItemId: string;
	name: string;
	email?: string;
	phone?: string;
	role?: string;
	team?: Array<{ id: string; name: string }>;
	manager?: string;
	status?: string;
	startDate?: string;
	[key: string]: any; // For dynamic columns
}

export async function getPeople() {
	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1612664689";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);
	
	// Ensure email__1 is included
	if (!dynamicColumns.includes("email__1")) {
		dynamicColumns.push("email__1");
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
						column_values(ids: [${dynamicColumns.map((id) => `"${id}"`).join(", ")}]) {
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
		console.error("[getPeople] Fetching people...");
		
		const response = await mondayApi(query);
		const board = response.data?.boards?.[0];
		if (!board) throw new Error("Board not found");

		const items = board.items_page?.items || [];

		// Process people
		const people: Person[] = [];
		const roleCounts = new Map<string, number>();
		const departmentCounts = new Map<string, number>();
		const statusCounts = new Map<string, number>();

		for (const item of items as MondayItemResponse[]) {
			const columnValues = item.column_values || [];

			// Helper to find column value by type
			const findColumnByType = (type: string) => {
				return columnValues.find((col: MondayColumnValueResponse) => 
					col.column?.type === type
				);
			};

			// Helper to find column by title keywords
			const findColumnByTitle = (keywords: string[]) => {
				return columnValues.find((col: MondayColumnValueResponse) => {
					const title = col.column?.title?.toLowerCase() || '';
					return keywords.some(keyword => title.includes(keyword.toLowerCase()));
				});
			};

			// Helper to find column by ID
			const findColumnById = (id: string) => {
				return columnValues.find((col: MondayColumnValueResponse) => col.id === id);
			};

			// Try to identify key columns
			const emailCol = findColumnById("email__1") || findColumnByType("email");
			const phoneCol = findColumnByType("phone");
			const statusCol = findColumnByType("status");
			const dateCol = findColumnByType("date");
			const teamCol = findColumnByType("board_relation");
			
			// Try to find role/department by title
			const roleCol = findColumnByTitle(["role", "position", "title"]);

			// Parse values - for email__1, use text directly
			const email = emailCol?.id === "email__1" ? emailCol.text : 
				(emailCol?.value ? JSON.parse(emailCol.value)?.email || emailCol.text : null);
			const phone = phoneCol?.value ? JSON.parse(phoneCol.value)?.phone || phoneCol.text : null;
			const status = statusCol?.text || "Active";
			const startDate = dateCol?.value ? JSON.parse(dateCol.value)?.date || dateCol.text : null;
			
			// Extract role and department from various sources
			const name = String(item.name);
			let role = roleCol?.text || "Employee";

			// Try to extract from name if it follows patterns
			if (name.includes(" - ")) {
				const parts = name.split(" - ");
				if (parts.length === 2) {
					role = parts[1];
				}
			}

			// Parse team relations
			let team: Array<{ id: string; name: string }> = [];
			if (teamCol) {
				const col = teamCol as MondayColumnValueResponse & { 
					linked_items?: Array<{ id: string; name: string }> 
				};
				team = col.linked_items || [];
			}

			const person: Person = {
				mondayItemId: String(item.id),
				name,
				email,
				phone,
				role,
				team,
				status,
				startDate,
			};

			// Add remaining dynamic columns
			for (const col of columnValues) {
				const column = col as MondayColumnValueResponse;
				if (!['email', 'phone', 'status', 'date', 'board_relation'].includes(column.column?.type || '')) {
					if (!person[column.id]) {
						person[column.id] = column.text || null;
					}
				}
			}

			people.push(person);

			// Count statistics
			roleCounts.set(role, (roleCounts.get(role) || 0) + 1);
			statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
		}

		// Calculate statistics
		const totalPeople = people.length;
		const activeCount = statusCounts.get("Active") || 0;
		const withEmail = people.filter(p => p.email).length;
		const withPhone = people.filter(p => p.phone).length;
		const withTeam = people.filter(p => p.team && p.team.length > 0).length;

		// Get top roles
		const topRoles = Array.from(roleCounts.entries())
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)
			.map(([role, count]) => ({ role, count }));

		// Build metadata
		const metadata = {
			boardId: BOARD_ID,
			boardName: board.name,
			totalPeople,
			totalRoles: roleCounts.size,
			statusBreakdown: {
				active: activeCount,
				inactive: totalPeople - activeCount
			},
			dataCompleteness: {
				withEmail,
				withPhone,
				withTeam
			},
			topRoles,
			dynamicColumnsCount: dynamicColumns.length
		};

		const summary = `Found ${totalPeople} ${totalPeople === 1 ? 'person' : 'people'} (${activeCount} active, ${roleCounts.size} unique role${roleCounts.size !== 1 ? 's' : ''})`;

		return JSON.stringify(
			{
				tool: "getPeople",
				timestamp: new Date().toISOString(),
				status: "success",
				data: departmentGroups,
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