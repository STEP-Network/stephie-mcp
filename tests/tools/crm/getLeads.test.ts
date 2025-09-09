import { getLeads } from "../../../lib/tools/crm/getLeads.js";
import { createToolTestSuite } from "../../utils/test-factory.js";

createToolTestSuite({
	toolName: "getLeads",
	toolFunction: getLeads,
	boardKey: "leads",
	titleText: "# Leads",

	parameters: {
		search: true,
		limit: true,
		statusFields: ["status", "lead_source", "priority"],
		dateFields: ["created_date", "last_contact_date"],
		relationFields: [
			{
				param: "existingContactId",
				relatedTool: "getContacts",
				relationName: "Existing Contact",
			},
			{
				param: "existingAccountId",
				relatedTool: "getAccounts",
				relationName: "Existing Account",
			},
			{
				param: "opportunityId",
				relatedTool: "getOpportunities",
				relationName: "Opportunity",
			},
		],
		customFields: [
			{
				param: "people",
				type: "string",
				testValue: "admin",
			},
			{
				param: "industry",
				type: "string",
				testValue: "Technology",
			},
		],
	},

	testData: {
		validSearchTerms: ["demo", "trial", "contact"],
		validStatusValues: [0, 1, 2, 3],
		validDateValues: ["2024-01-01", "2024-06-30"],
	},
});
