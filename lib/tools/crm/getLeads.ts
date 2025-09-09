import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";

export async function getLeads(
	params: {
		limit?: number;
		search?: string;
		lead_owner?: string; // Owner
		lead_status?: number; // Status (numeric index)
		status_1__1?: number; // Type (husk at angiv!) (numeric index)
		date0__1?: string; // Created Date (YYYY-MM-DD)
		existingContactId?: string; // Filter by existing contact (use getContacts to find IDs)
		existingAccountId?: string; // Filter by existing account (use getAccounts to find IDs)
		opportunityId?: string; // Filter by linked opportunity (use getOpportunities to find IDs)
	} = {},
) {
	const {
		limit = 10,
		search,
		lead_owner,
		lead_status,
		status_1__1,
		date0__1,
		existingContactId,
		existingAccountId,
		opportunityId,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1402911026";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

	// Build filters
	const filters: Array<Record<string, unknown>> = [];
	if (search) {
		filters.push({
			column_id: "name",
			compare_value: search,
			operator: "contains_text",
		});
	}
	if (lead_owner)
		filters.push({
			column_id: "lead_owner",
			compare_value: lead_owner,
			operator: "contains_text",
		});
	if (lead_status !== undefined)
		filters.push({
			column_id: "lead_status",
			compare_value: [lead_status],
			operator: "any_of",
		});
	if (status_1__1 !== undefined)
		filters.push({
			column_id: "status_1__1",
			compare_value: [status_1__1],
			operator: "any_of",
		});
	if (date0__1)
		filters.push({
			column_id: "date0__1",
			compare_value: date0__1,
			operator: "contains_text",
		});

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
      boards(ids: [1402911026]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: [${dynamicColumns.map((id) => `"${id}"`).join(", ")}]) {
              id
              text
              value
              column {
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

		let items = board.items_page?.items || [];

		// Apply board relation filters
		if (existingContactId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "link_to_contacts",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(existingContactId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		if (existingAccountId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "link_to_accounts7",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(existingAccountId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		if (opportunityId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards70__1",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(opportunityId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		// Format response as markdown
		const lines: string[] = [];
		lines.push(`# Leads`);
		lines.push(`**Total Items:** ${items.length}`);

		// Show active filters
		if (existingContactId)
			lines.push(`**Filter:** Has existing Contact ID ${existingContactId}`);
		if (existingAccountId)
			lines.push(`**Filter:** Has existing Account ID ${existingAccountId}`);
		if (opportunityId)
			lines.push(`**Filter:** Related to Opportunity ID ${opportunityId}`);

		lines.push("");

		items.forEach((item: Record<string, unknown>) => {
			lines.push(`## ${item.name}`);
			lines.push(`- **ID:** ${item.id}`);

			(item as MondayItemResponse).column_values.forEach(
				(col: Record<string, unknown>) => {
					if (col.text) {
						lines.push(
							`- **${(col as MondayColumnValueResponse).column?.title}:** ${col.text}`,
						);
					}
				},
			);
			lines.push("");
		});

		return lines.join("\n");
	} catch (error) {
		console.error("Error fetching Leads items:", error);
		throw error;
	}
}
