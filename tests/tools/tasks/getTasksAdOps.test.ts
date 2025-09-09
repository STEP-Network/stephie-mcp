import { getTasksAdOps } from "../../../lib/tools/tasks/getTasksAdOps.js";
import { createToolTestSuite } from "../../utils/test-factory.js";

createToolTestSuite({
	toolName: "getTasksAdOps",
	toolFunction: getTasksAdOps,
	boardKey: "tasksAdOps",
	titleText: "# Tasks - AdOps",

	parameters: {
		search: true,
		limit: true,
		statusFields: ["status", "priority", "urgency"],
		dateFields: ["due_date", "start_date"],
		customFields: [
			{
				param: "people",
				type: "string",
				testValue: "admin",
			},
			{
				param: "campaign_type",
				type: "string",
				testValue: "Display",
			},
		],
	},

	testData: {
		validSearchTerms: ["campaign", "setup", "trafficking"],
		validStatusValues: [0, 1, 2, 3, 4],
		validDateValues: ["2024-04-01", "2024-09-30"],
	},
});
