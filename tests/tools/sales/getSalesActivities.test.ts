import { getSalesActivities } from "../../../lib/tools/sales/getSalesActivities.js";
import { createToolTestSuite } from "../../utils/test-factory.js";

createToolTestSuite({
	toolName: "getSalesActivities",
	toolFunction: getSalesActivities,
	boardKey: "salesActivities",
	titleText: "# Sales Activities",

	parameters: {
		search: true,
		limit: true,
		statusFields: ["activity_status", "priority"],
		dateFields: ["activity_date", "follow_up_date"],
		relationFields: [
			{
				param: "accountId",
				relatedTool: "getAccounts",
				relationName: "Account",
			},
			{
				param: "contactId",
				relatedTool: "getContacts",
				relationName: "Contact",
			},
			{
				param: "opportunityId",
				relatedTool: "getOpportunities",
				relationName: "Opportunity",
			},
		],
		customFields: [
			{
				param: "activity_type",
				type: "string",
				testValue: "Call",
			},
			{
				param: "people",
				type: "string",
				testValue: "admin",
			},
		],
	},

	testData: {
		validSearchTerms: ["call", "meeting", "email"],
		validStatusValues: [0, 1, 2],
		validDateValues: ["2024-01-15", "2024-06-30"],
	},
});
