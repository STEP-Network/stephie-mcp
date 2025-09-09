import { getTasksTechIntelligence } from "../../../lib/tools/tasks/getTasksTechIntelligence.js";
import { createToolTestSuite } from "../../utils/test-factory.js";

createToolTestSuite({
	toolName: "getTasksTechIntelligence",
	toolFunction: getTasksTechIntelligence,
	boardKey: "tasksTechIntelligence",
	titleText: "# Tasks - Tech & Intelligence",

	parameters: {
		search: true,
		limit: true,
		statusFields: ["status", "priority"],
		dateFields: ["due_date", "created_at"],
		customFields: [
			{
				param: "people",
				type: "string",
				testValue: "admin",
			},
			{
				param: "task_type",
				type: "string",
				testValue: "Analysis",
			},
		],
	},

	testData: {
		validSearchTerms: ["analysis", "report", "research"],
		validStatusValues: [0, 1, 2, 3],
		validDateValues: ["2024-03-01", "2024-08-15"],
	},
});
