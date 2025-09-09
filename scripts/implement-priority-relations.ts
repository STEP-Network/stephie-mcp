#!/usr/bin/env tsx
/**
 * Implements priority board relation parameters for key tools
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Priority relations to implement (most valuable for users)
const PRIORITY_RELATIONS = {
	// CRM Core Relations
	getAccounts: [
		{
			param: "contactsId",
			column: "account_contact",
			title: "Contacts",
			description: "Filter by linked contacts (use getContacts to find IDs)",
		},
		{
			param: "opportunitiesId",
			column: "account_deal",
			title: "Opportunities",
			description:
				"Filter by linked opportunities (use getOpportunities to find IDs)",
		},
		{
			param: "leadsId",
			column: "connect_boards9",
			title: "Leads",
			description: "Filter by linked leads (use getLeads to find IDs)",
		},
	],
	getContacts: [
		{
			param: "accountId",
			column: "contact_account",
			title: "Account",
			description: "Filter by linked account (use getAccounts to find IDs)",
		},
		{
			param: "opportunitiesId",
			column: "contact_deal",
			title: "Opportunities",
			description:
				"Filter by linked opportunities (use getOpportunities to find IDs)",
		},
	],
	getOpportunities: [
		{
			param: "accountId",
			column: "connect_boards31",
			title: "Advertiser/Publisher",
			description: "Filter by linked account (use getAccounts to find IDs)",
		},
		{
			param: "contactId",
			column: "deal_contact",
			title: "Agency Contact",
			description: "Filter by linked contact (use getContacts to find IDs)",
		},
		{
			param: "bookingId",
			column: "connect_boards8__1",
			title: "Booking",
			description: "Filter by linked booking (use getBookings to find IDs)",
		},
	],
	getDeals: [
		{
			param: "agencyId",
			column: "connect_boards_mkmjpjjc",
			title: "Agency",
			description: "Filter by agency account (use getAccounts to find IDs)",
		},
		{
			param: "advertiserId",
			column: "connect_boards_mkmjr3e3",
			title: "Advertiser",
			description: "Filter by advertiser account (use getAccounts to find IDs)",
		},
		{
			param: "contactsId",
			column: "connect_boards3__1",
			title: "Contacts",
			description: "Filter by linked contacts (use getContacts to find IDs)",
		},
	],

	// Task Relations (Key Results are critical)
	getTasksTechIntelligence: [
		{
			param: "keyResultId",
			column: "board_relation_mkpjqgpv",
			title: "Key Result",
			description: "Filter by linked key result (use OKR subitems to find IDs)",
		},
		{
			param: "teamTaskId",
			column: "connect_boards_Mjj8XLFi",
			title: "Team Task",
			description: "Filter by linked team tasks",
		},
	],
	getTasksAdOps: [
		{
			param: "keyResultId",
			column: "board_relation_mkpjy03a",
			title: "Key Result",
			description: "Filter by linked key result (use OKR subitems to find IDs)",
		},
		{
			param: "publisherId",
			column: "connect_boards_mkkxdfax",
			title: "Publisher",
			description: "Filter by publisher (use getAllPublishers to find IDs)",
		},
	],
	getTasksMarketing: [
		{
			param: "keyResultId",
			column: "board_relation_mkpjg0ky",
			title: "Key Result",
			description: "Filter by linked key result (use OKR subitems to find IDs)",
		},
		{
			param: "budgetId",
			column: "budgets_mkn2xpkt",
			title: "Budget",
			description:
				"Filter by linked budget (use getMarketingBudgets to find IDs)",
		},
	],

	// OKR Relations (beyond team)
	getOKR: [
		{
			param: "strategiesId",
			column: "link_to_strategies__1",
			title: "Strategies",
			description:
				"Filter by linked strategies (use getStrategies to find IDs)",
		},
		{
			param: "peopleId",
			column: "connect_boards35__1",
			title: "People",
			description: "Filter by linked people (use getPeople to find IDs)",
		},
	],

	// Other important relations
	getTickets: [
		{
			param: "contactId",
			column: "connect_boards8__1",
			title: "Contacts",
			description: "Filter by linked contact (use getContacts to find IDs)",
		},
		{
			param: "assignedId",
			column: "connect_boards__1",
			title: "Assigned",
			description: "Filter by assigned person (use getPeople to find IDs)",
		},
		{
			param: "publisherId",
			column: "connect_boards08__1",
			title: "Publisher",
			description: "Filter by publisher (use getAllPublishers to find IDs)",
		},
	],
};

async function updateToolDefinitions() {
	console.log("📝 Updating Tool Definitions with Priority Relations\n");

	// Load current definitions
	const boardDefPath = path.join(
		__dirname,
		"../lib/mcp/boardToolDefinitions.json",
	);
	const boardDefs = JSON.parse(fs.readFileSync(boardDefPath, "utf-8"));

	const toolDefPath = path.join(__dirname, "../lib/mcp/toolDefinitions.ts");
	let toolDefContent = fs.readFileSync(toolDefPath, "utf-8");

	// Update each tool
	for (const [toolName, relations] of Object.entries(PRIORITY_RELATIONS)) {
		console.log(`\nUpdating ${toolName}:`);

		// Find tool in boardToolDefinitions.json
		const toolDef = boardDefs.find((t: any) => t.name === toolName);
		if (toolDef) {
			// Add new parameters
			relations.forEach((rel) => {
				if (!toolDef.inputSchema.properties[rel.param]) {
					toolDef.inputSchema.properties[rel.param] = {
						type: "string",
						description: rel.description,
					};
					console.log(`  ✅ Added ${rel.param} parameter`);
				} else {
					console.log(`  ⏭️  ${rel.param} already exists`);
				}
			});
		}

		// Update in toolDefinitions.ts as well
		const toolDefRegex = new RegExp(
			`name: '${toolName}'[^}]+inputSchema: {[^}]+properties: {([^}]+)}`,
			"s",
		);
		const match = toolDefContent.match(toolDefRegex);
		if (match) {
			let properties = match[1];
			relations.forEach((rel) => {
				if (!properties.includes(rel.param)) {
					// Add property before the closing brace
					const newProp = `,\n        ${rel.param}: { type: 'string', description: '${rel.description.replace(/'/g, "\\'")}' }`;
					properties = properties.trimEnd() + newProp;
					console.log(`  ✅ Added ${rel.param} to TypeScript definitions`);
				}
			});

			// Replace the properties section
			const newSection = match[0].replace(match[1], properties);
			toolDefContent = toolDefContent.replace(match[0], newSection);
		}
	}

	// Save updated definitions
	fs.writeFileSync(boardDefPath, JSON.stringify(boardDefs, null, 2));
	fs.writeFileSync(toolDefPath, toolDefContent);

	console.log("\n✅ Tool definitions updated!");
}

async function generateImplementationGuide() {
	console.log("\n📋 Generating Implementation Guide\n");

	const guidePath = path.join(
		__dirname,
		"../docs/implementation/PRIORITY_RELATIONS_IMPLEMENTATION.md",
	);

	let content = `# Priority Board Relations Implementation Guide

Generated: ${new Date().toISOString()}

## Priority Relations to Implement

These are the most valuable board relations that should be implemented first:

`;

	for (const [toolName, relations] of Object.entries(PRIORITY_RELATIONS)) {
		content += `### ${toolName}\n\n`;
		relations.forEach((rel) => {
			content += `- **${rel.param}**: ${rel.title} (\`${rel.column}\`)\n`;
			content += `  - ${rel.description}\n`;
		});
		content += "\n";
	}

	content += `## Implementation Pattern

For each relation parameter, add to the tool file:

\`\`\`typescript
// In the params interface
${Object.keys(PRIORITY_RELATIONS)[0]}Id?: string; // Filter by linked ${Object.keys(PRIORITY_RELATIONS)[0]} (use get${Object.keys(PRIORITY_RELATIONS)[0]} to find IDs)

// In the filtering logic (after fetching items)
if (${Object.keys(PRIORITY_RELATIONS)[0]}Id) {
  items = items.filter((item: any) => {
    const relationCol = item.column_values.find((c: any) => c.id === 'column_id_here');
    if (relationCol?.value) {
      try {
        const linked = JSON.parse(relationCol.value);
        return linked?.linkedItemIds?.includes(${Object.keys(PRIORITY_RELATIONS)[0]}Id);
      } catch {
        return false;
      }
    }
    return false;
  });
}

// In the output section
if (${Object.keys(PRIORITY_RELATIONS)[0]}Id) {
  // Show the related item name if possible
  lines.push(\`**Filter:** Related to ID \${${Object.keys(PRIORITY_RELATIONS)[0]}Id}\`);
}
\`\`\`

## Testing Checklist

- [ ] Parameter accepts Monday.com item IDs
- [ ] Filtering correctly checks linkedItemIds array
- [ ] Tool description mentions using related tool first
- [ ] Output shows both name and ID when possible
- [ ] Error handling for invalid JSON
`;

	fs.writeFileSync(guidePath, content);
	console.log(`📄 Implementation guide saved to ${guidePath}`);
}

async function main() {
	await updateToolDefinitions();
	await generateImplementationGuide();
	console.log("\n🎉 Priority relations setup complete!");
	console.log("\nNext steps:");
	console.log("1. Implement the filtering logic in each tool file");
	console.log("2. Update server.ts with new parameters");
	console.log("3. Test with actual Monday.com data");
}

main().catch(console.error);
