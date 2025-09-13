import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";

interface Team {
	mondayItemId: string;
	name: string;
	department?: string;
	teamLead?: string;
	members?: Array<{ id: string; name: string }>;
	projects?: Array<{ id: string; name: string }>;
	status?: string;
	[key: string]: any; // For dynamic columns
}

export async function getTeams() {
	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1631927696";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

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
		console.error("[getTeams] Fetching teams...");
		
		const response = await mondayApi(query);
		const board = response.data?.boards?.[0];
		if (!board) throw new Error("Board not found");

		const items = board.items_page?.items || [];

		// Process teams
		const teams: Team[] = [];
		const departmentCounts = new Map<string, number>();
		const statusCounts = new Map<string, number>();
		let totalMembers = 0;
		let totalProjects = 0;

		for (const item of items as MondayItemResponse[]) {
			const columnValues = item.column_values || [];

			// Helper to find column value by type
			const findColumnByType = (type: string) => {
				return columnValues.find((col: MondayColumnValueResponse) => 
					col.column?.type === type
				);
			};

			// Try to identify key columns based on type and title
			const statusCol = findColumnByType("status");
			const peopleCol = findColumnByType("multiple-person");
			const relationsCol = columnValues.filter((col: MondayColumnValueResponse) => 
				col.column?.type === "board_relation"
			);

			// Extract department from name if it follows a pattern
			const name = String(item.name);
			let department = "General";
			if (name.includes(" - ")) {
				department = name.split(" - ")[0];
			} else if (name.includes("Team")) {
				department = "Operations";
			}

			// Parse status
			const status = statusCol?.text || "Active";

			// Parse members
			let members: Array<{ id: string; name: string }> = [];
			if (peopleCol?.value) {
				const parsedValue = JSON.parse(peopleCol.value);
				members = parsedValue?.personsAndTeams || [];
			}

			// Parse related projects/items
			let projects: Array<{ id: string; name: string }> = [];
			for (const relationCol of relationsCol) {
				const col = relationCol as MondayColumnValueResponse & { 
					linked_items?: Array<{ id: string; name: string }> 
				};
				if (col.linked_items && col.linked_items.length > 0) {
					projects.push(...col.linked_items);
				}
			}

			const team: Team = {
				mondayItemId: String(item.id),
				name,
				department,
				status,
				members,
				projects
			};

			// Add remaining dynamic columns
			for (const col of columnValues) {
				const column = col as MondayColumnValueResponse;
				if (!['status', 'multiple-person', 'board_relation'].includes(column.column?.type || '')) {
					team[column.id] = column.text || null;
				}
			}

			teams.push(team);

			// Count statistics
			departmentCounts.set(department, (departmentCounts.get(department) || 0) + 1);
			statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
			totalMembers += members.length;
			totalProjects += projects.length;
		}

		// Sort teams by department then name
		teams.sort((a, b) => {
			if (a.department !== b.department) {
				return (a.department || '').localeCompare(b.department || '');
			}
			return a.name.localeCompare(b.name);
		});

		// Group teams by department
		const teamsByDepartment = new Map<string, Team[]>();
		for (const team of teams) {
			const dept = team.department || "General";
			if (!teamsByDepartment.has(dept)) {
				teamsByDepartment.set(dept, []);
			}
			teamsByDepartment.get(dept)?.push(team);
		}

		// Convert to hierarchical structure
		const departmentGroups = Array.from(teamsByDepartment.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([department, deptTeams]) => {
				const totalDeptMembers = deptTeams.reduce((sum, t) => sum + (t.members?.length || 0), 0);
				const totalDeptProjects = deptTeams.reduce((sum, t) => sum + (t.projects?.length || 0), 0);

				return {
					department,
					teamCount: deptTeams.length,
					totalMembers: totalDeptMembers,
					totalProjects: totalDeptProjects,
					teams: deptTeams
				};
			});

		// Build metadata
		const totalTeams = teams.length;
		const activeTeams = statusCounts.get("Active") || 0;
		const averageTeamSize = totalTeams > 0 ? Math.round(totalMembers / totalTeams) : 0;

		const metadata = {
			boardId: BOARD_ID,
			boardName: board.name,
			totalTeams,
			totalDepartments: teamsByDepartment.size,
			totalMembers,
			totalProjects,
			averageTeamSize,
			statusBreakdown: Object.fromEntries(statusCounts),
			departmentCounts: Object.fromEntries(departmentCounts),
			dynamicColumnsCount: dynamicColumns.length
		};

		const summary = `Found ${totalTeams} team${totalTeams !== 1 ? 's' : ''} across ${teamsByDepartment.size} department${teamsByDepartment.size !== 1 ? 's' : ''} (${totalMembers} member${totalMembers !== 1 ? 's' : ''}, ${totalProjects} project${totalProjects !== 1 ? 's' : ''})`;

		return JSON.stringify(
			{
				tool: "getTeams",
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
		console.error("Error fetching Teams:", error);
		throw error;
	}
}