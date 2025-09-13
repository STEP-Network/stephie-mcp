import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";

interface TechTask {
	mondayItemId: string;
	name: string;
	status?: string;
	priority?: string;
	assignee?: Array<{ id: string; name: string }>;
	dueDate?: string;
	keyResult?: Array<{ id: string; name: string }>;
	stephieFeature?: Array<{ id: string; name: string }>;
	effort?: string;
	impact?: string;
	category?: string;
	[key: string]: any; // For dynamic columns
}

export async function getTasksTechIntelligence() {
	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1631907569";
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
		console.error("[getTasksTechIntelligence] Fetching tech tasks...");
		
		const response = await mondayApi(query);
		const board = response.data?.boards?.[0];
		if (!board) throw new Error("Board not found");

		const items = board.items_page?.items || [];

		// Process tasks
		const tasks: TechTask[] = [];
		const statusCounts = new Map<string, number>();
		const priorityCounts = new Map<string, number>();
		const categoryCounts = new Map<string, number>();
		const effortCounts = new Map<string, number>();
		const impactCounts = new Map<string, number>();
		let totalAssigned = 0;
		let totalWithDueDate = 0;
		let totalWithKeyResult = 0;

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

			// Try to identify key columns
			const statusCol = findColumnByType("status");
			const dateCol = findColumnByType("date");
			const peopleCol = findColumnByType("multiple-person");
			const priorityCol = findColumnByTitle(["priority", "urgency"]);
			const effortCol = findColumnByTitle(["effort", "complexity", "size"]);
			const impactCol = findColumnByTitle(["impact", "value"]);
			const categoryCol = findColumnByTitle(["category", "type", "area"]);

			// Find specific board relations
			const keyResultCol = columnValues.find((col: MondayColumnValueResponse) => 
				col.id === 'board_relation_mkpjqgpv'
			);
			const stephieFeatureCol = columnValues.find((col: MondayColumnValueResponse) => 
				col.id === 'board_relation_mkqhkyb7'
			);

			// Parse values
			const status = statusCol?.text || "Not Started";
			const priority = priorityCol?.text || "Medium";
			const effort = effortCol?.text || null;
			const impact = impactCol?.text || null;
			const category = categoryCol?.text || "General";
			const dueDate = dateCol?.value ? JSON.parse(dateCol.value)?.date || dateCol.text : null;

			// Parse assignees
			let assignee: Array<{ id: string; name: string }> = [];
			if (peopleCol?.value) {
				const parsedValue = JSON.parse(peopleCol.value);
				assignee = parsedValue?.personsAndTeams || [];
			}

			// Parse board relations
			let keyResult: Array<{ id: string; name: string }> = [];
			if (keyResultCol) {
				const col = keyResultCol as MondayColumnValueResponse & { 
					linked_items?: Array<{ id: string; name: string }> 
				};
				keyResult = col.linked_items || [];
			}

			let stephieFeature: Array<{ id: string; name: string }> = [];
			if (stephieFeatureCol) {
				const col = stephieFeatureCol as MondayColumnValueResponse & { 
					linked_items?: Array<{ id: string; name: string }> 
				};
				stephieFeature = col.linked_items || [];
			}

			const task: TechTask = {
				mondayItemId: String(item.id),
				name: String(item.name),
				status,
				priority,
				assignee,
				dueDate,
				keyResult,
				stephieFeature,
				effort,
				impact,
				category
			};

			// Add remaining dynamic columns
			for (const col of columnValues) {
				const column = col as MondayColumnValueResponse;
				if (!['status', 'date', 'multiple-person', 'board_relation'].includes(column.column?.type || '')) {
					if (!task[column.id]) {
						task[column.id] = column.text || null;
					}
				}
			}

			tasks.push(task);

			// Count statistics
			statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
			priorityCounts.set(priority, (priorityCounts.get(priority) || 0) + 1);
			categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
			if (effort) effortCounts.set(effort, (effortCounts.get(effort) || 0) + 1);
			if (impact) impactCounts.set(impact, (impactCounts.get(impact) || 0) + 1);
			if (assignee.length > 0) totalAssigned++;
			if (dueDate) totalWithDueDate++;
			if (keyResult.length > 0) totalWithKeyResult++;
		}

		// Sort tasks by priority then status
		const priorityOrder = ["Critical", "High", "Medium", "Low"];
		const statusOrder = ["In Progress", "Ready", "Not Started", "Done", "Blocked"];

		tasks.sort((a, b) => {
			const aPriority = priorityOrder.indexOf(a.priority || "Medium");
			const bPriority = priorityOrder.indexOf(b.priority || "Medium");
			if (aPriority !== bPriority) {
				return aPriority - bPriority;
			}

			const aStatus = statusOrder.indexOf(a.status || "Not Started");
			const bStatus = statusOrder.indexOf(b.status || "Not Started");
			if (aStatus !== bStatus) {
				return aStatus - bStatus;
			}

			return a.name.localeCompare(b.name);
		});

		// Group tasks by status
		const tasksByStatus = new Map<string, TechTask[]>();
		for (const task of tasks) {
			const status = task.status || "Not Started";
			if (!tasksByStatus.has(status)) {
				tasksByStatus.set(status, []);
			}
			tasksByStatus.get(status)?.push(task);
		}

		// Convert to hierarchical structure
		const statusGroups = Array.from(tasksByStatus.entries())
			.sort(([a], [b]) => {
				const aIndex = statusOrder.indexOf(a);
				const bIndex = statusOrder.indexOf(b);
				if (aIndex !== -1 && bIndex !== -1) {
					return aIndex - bIndex;
				}
				if (aIndex !== -1) return -1;
				if (bIndex !== -1) return 1;
				return a.localeCompare(b);
			})
			.map(([status, statusTasks]) => {
				// Count priorities in this status
				const priorities = new Map<string, number>();
				for (const task of statusTasks) {
					const p = task.priority || "Medium";
					priorities.set(p, (priorities.get(p) || 0) + 1);
				}

				return {
					status,
					taskCount: statusTasks.length,
					assignedCount: statusTasks.filter(t => t.assignee && t.assignee.length > 0).length,
					withDueDate: statusTasks.filter(t => t.dueDate).length,
					priorityBreakdown: Object.fromEntries(priorities),
					tasks: statusTasks
				};
			});

		// Calculate statistics
		const totalTasks = tasks.length;
		const inProgressCount = statusCounts.get("In Progress") || 0;
		const doneCount = statusCounts.get("Done") || 0;
		const blockedCount = statusCounts.get("Blocked") || 0;
		const completionRate = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

		// Build metadata
		const metadata = {
			boardId: BOARD_ID,
			boardName: board.name,
			totalTasks,
			totalStatuses: tasksByStatus.size,
			statusBreakdown: {
				inProgress: inProgressCount,
				done: doneCount,
				blocked: blockedCount,
				other: totalTasks - inProgressCount - doneCount - blockedCount
			},
			taskMetrics: {
				assigned: totalAssigned,
				withDueDate: totalWithDueDate,
				withKeyResult: totalWithKeyResult,
				completionRate: `${completionRate}%`
			},
			priorityCounts: Object.fromEntries(priorityCounts),
			categoryCounts: Object.fromEntries(categoryCounts),
			effortCounts: Object.fromEntries(effortCounts),
			impactCounts: Object.fromEntries(impactCounts),
			dynamicColumnsCount: dynamicColumns.length
		};

		const summary = `Found ${totalTasks} tech task${totalTasks !== 1 ? 's' : ''} (${inProgressCount} in progress, ${doneCount} done, ${blockedCount} blocked)`;

		return JSON.stringify(
			{
				tool: "getTasksTechIntelligence",
				timestamp: new Date().toISOString(),
				status: "success",
				data: statusGroups,
				metadata,
				options: { summary }
			},
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching TasksTechIntelligence:", error);
		throw error;
	}
}