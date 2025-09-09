import { getAccounts } from "../../../lib/tools/crm/getAccounts.js";
import { createToolTestSuite } from "../../utils/test-factory.js";

createToolTestSuite({
	toolName: "getAccounts",
	toolFunction: getAccounts,
	boardKey: "accounts",
	titleText: "# Accounts",

	parameters: {
		search: true,
		limit: true,
		statusFields: ["status", "status5"],
		relationFields: [
			{
				param: "contactsId",
				relatedTool: "getContacts",
				relationName: "Contact",
			},
			{
				param: "opportunitiesId",
				relatedTool: "getOpportunities",
				relationName: "Opportunity",
			},
			{
				param: "leadsId",
				relatedTool: "getLeads",
				relationName: "Lead",
			},
		],
		customFields: [
			{
				param: "people",
				type: "string",
				testValue: "admin",
			},
		],
	},

	testData: {
		validSearchTerms: ["test", "demo", "agency"],
		validStatusValues: [0, 1, 2, 3],
	},
});
