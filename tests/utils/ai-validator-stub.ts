/**
 * Stub implementation of AI validator when AI SDK is not available
 * This allows tests to run without the AI SDK installed
 */

export interface AIValidationResult {
	valid: boolean;
	confidence: number;
	issues: string[];
	suggestions: string[];
	analysis: string;
}

export interface AIValidationConfig {
	enabled: boolean;
	apiKey?: string;
	model?: string;
	maxTokens?: number;
	temperature?: number;
}

let aiConfig: AIValidationConfig = {
	enabled: false,
	model: "gpt-3.5-turbo",
	maxTokens: 1000,
	temperature: 0.1,
};

export async function validateWithAI(
	_output: string,
	_expectedBehavior: string,
	_context?: any,
): Promise<AIValidationResult> {
	return {
		valid: true,
		confidence: 0,
		issues: ["AI validation not available"],
		suggestions: [],
		analysis: "AI SDK not installed - using basic validation",
	};
}

export async function discoverTestValuesWithAI(
	_output: string,
	_fieldType: string,
): Promise<string[]> {
	return [];
}

export async function generateTestScenariosWithAI(
	_toolDescription: string,
	_capabilities: string[],
): Promise<Array<any>> {
	return [];
}

export async function validateConsistencyWithAI(
	_output1: string,
	_output2: string,
	_context: string,
): Promise<any> {
	return {
		consistent: true,
		explanation: "AI validation unavailable",
		differences: [],
	};
}

export function configureAIValidation(config: Partial<AIValidationConfig>) {
	aiConfig = { ...aiConfig, ...config };
	if (aiConfig.enabled) {
		console.info("ℹ️ AI validation requested but AI SDK not installed");
		aiConfig.enabled = false;
	}
}

export function isAIValidationAvailable(): boolean {
	return false;
}
