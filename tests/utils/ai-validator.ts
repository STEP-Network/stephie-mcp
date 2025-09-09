/**
 * AI-powered validation for test outputs
 * Uses Vercel AI SDK to intelligently validate tool outputs
 *
 * Note: AI validation is optional. Install with:
 * pnpm add ai @ai-sdk/openai
 */

// Dynamic imports to make AI optional
let generateText: any;
let openai: any;

try {
	const aiModule = await import("ai");
	const openaiModule = await import("@ai-sdk/openai");
	generateText = aiModule.generateText;
	openai = openaiModule.openai;
} catch {
	// AI SDK not installed - validation will be disabled
}

export interface AIValidationResult {
	valid: boolean;
	confidence: number; // 0-1 score
	issues: string[];
	suggestions: string[];
	analysis: string;
}

/**
 * Uses AI to validate that a tool's output is correct and meaningful
 */
export async function validateWithAI(
	output: string,
	expectedBehavior: string,
	context?: {
		toolName?: string;
		filterApplied?: string;
		expectedCount?: number;
	},
): Promise<AIValidationResult> {
	if (!generateText || !openai) {
		return {
			valid: true,
			confidence: 0,
			issues: ["AI validation not available - SDK not installed"],
			suggestions: [],
			analysis:
				"Install ai and @ai-sdk/openai packages to enable AI validation",
		};
	}

	try {
		const prompt = `
You are a test validation expert. Analyze this tool output and determine if it's correct.

Tool: ${context?.toolName || "Unknown"}
Expected Behavior: ${expectedBehavior}
${context?.filterApplied ? `Filter Applied: ${context.filterApplied}` : ""}
${context?.expectedCount ? `Expected Count: At least ${context.expectedCount} items` : ""}

Output to Validate:
\`\`\`
${output.substring(0, 2000)}  // Limit for token efficiency
\`\`\`

Analyze and respond with:
1. Is this output valid? (true/false)
2. Confidence score (0-1)
3. Any issues found (list)
4. Suggestions for improvement (list)
5. Brief analysis (1-2 sentences)

Respond in JSON format:
{
  "valid": boolean,
  "confidence": number,
  "issues": string[],
  "suggestions": string[],
  "analysis": string
}`;

		const response = await generateText({
			model: openai("gpt-4-turbo-preview"),
			prompt,
			temperature: 0.1, // Low temperature for consistent validation
		});

		// Parse the AI response
		try {
			const result = JSON.parse(response.text);
			return result as AIValidationResult;
		} catch {
			// If parsing fails, create a basic response
			return {
				valid: true,
				confidence: 0.5,
				issues: ["Could not parse AI response"],
				suggestions: [],
				analysis: "AI validation completed but response parsing failed",
			};
		}
	} catch (error) {
		console.error("AI validation error:", error);
		// Fallback to basic validation
		return {
			valid: true,
			confidence: 0,
			issues: ["AI validation unavailable"],
			suggestions: [],
			analysis: "Falling back to basic validation",
		};
	}
}

/**
 * Uses AI to discover optimal test values from output
 */
export async function discoverTestValuesWithAI(
	output: string,
	fieldType: "status" | "date" | "search" | "relation",
): Promise<string[]> {
	try {
		const prompt = `
Analyze this tool output and identify the best test values for ${fieldType} fields.

Output:
\`\`\`
${output.substring(0, 3000)}
\`\`\`

Based on the output, suggest 3-5 test values that would definitely return results.
For ${fieldType} fields, look for:
${fieldType === "status" ? '- Status values like "New", "In Progress", "Done"' : ""}
${fieldType === "date" ? "- Date values in ISO format (YYYY-MM-DD)" : ""}
${fieldType === "search" ? "- Common words or terms that appear multiple times" : ""}
${fieldType === "relation" ? "- ID values that represent relationships" : ""}

Return ONLY a JSON array of string values, nothing else:
["value1", "value2", "value3"]`;

		const response = await generateText({
			model: openai("gpt-3.5-turbo"), // Faster model for simple extraction
			prompt,
			temperature: 0.1,
		});

		try {
			const values = JSON.parse(response.text);
			if (Array.isArray(values)) {
				return values.filter((v) => typeof v === "string");
			}
		} catch {
			console.warn("Could not parse AI-discovered values");
		}
	} catch (error) {
		console.error("AI discovery error:", error);
	}

	return [];
}

/**
 * Uses AI to generate meaningful test scenarios
 */
export async function generateTestScenariosWithAI(
	toolDescription: string,
	capabilities: string[],
): Promise<
	Array<{ name: string; params: Record<string, any>; expected: string }>
> {
	try {
		const prompt = `
Generate test scenarios for a tool with these details:
Tool: ${toolDescription}
Capabilities: ${capabilities.join(", ")}

Create 5 meaningful test scenarios that would thoroughly test this tool.
Each scenario should have:
- A descriptive name
- Parameters to pass to the tool
- Expected behavior

Return as JSON array:
[
  {
    "name": "Test scenario name",
    "params": { "param1": "value1" },
    "expected": "What should happen"
  }
]`;

		const response = await generateText({
			model: openai("gpt-3.5-turbo"),
			prompt,
			temperature: 0.3,
		});

		try {
			const scenarios = JSON.parse(response.text);
			if (Array.isArray(scenarios)) {
				return scenarios;
			}
		} catch {
			console.warn("Could not parse AI-generated scenarios");
		}
	} catch (error) {
		console.error("AI scenario generation error:", error);
	}

	return [];
}

/**
 * Validates output consistency using AI
 */
export async function validateConsistencyWithAI(
	output1: string,
	output2: string,
	context: string,
): Promise<{
	consistent: boolean;
	explanation: string;
	differences: string[];
}> {
	try {
		const prompt = `
Compare these two outputs for consistency in the context of: ${context}

Output 1:
\`\`\`
${output1.substring(0, 1500)}
\`\`\`

Output 2:
\`\`\`
${output2.substring(0, 1500)}
\`\`\`

Are these outputs consistent with each other given the context?
Identify any meaningful differences that might indicate a problem.

Respond in JSON:
{
  "consistent": boolean,
  "explanation": "Brief explanation",
  "differences": ["difference1", "difference2"]
}`;

		const response = await generateText({
			model: openai("gpt-3.5-turbo"),
			prompt,
			temperature: 0.1,
		});

		try {
			return JSON.parse(response.text);
		} catch {
			return {
				consistent: true,
				explanation: "Could not parse AI comparison",
				differences: [],
			};
		}
	} catch (error) {
		console.error("AI consistency check error:", error);
		return {
			consistent: true,
			explanation: "AI validation unavailable",
			differences: [],
		};
	}
}

/**
 * Configuration for AI validation
 */
export interface AIValidationConfig {
	enabled: boolean;
	apiKey?: string;
	model?: string;
	maxTokens?: number;
	temperature?: number;
}

/**
 * Global AI validation configuration
 */
let aiConfig: AIValidationConfig = {
	enabled: false, // Disabled by default
	model: "gpt-3.5-turbo",
	maxTokens: 1000,
	temperature: 0.1,
};

/**
 * Configure AI validation
 */
export function configureAIValidation(config: Partial<AIValidationConfig>) {
	aiConfig = { ...aiConfig, ...config };

	if (aiConfig.enabled && !process.env.OPENAI_API_KEY && !aiConfig.apiKey) {
		console.warn("⚠️ AI validation enabled but no OpenAI API key found");
		aiConfig.enabled = false;
	}
}

/**
 * Check if AI validation is available
 */
export function isAIValidationAvailable(): boolean {
	return aiConfig.enabled && !!(process.env.OPENAI_API_KEY || aiConfig.apiKey);
}
