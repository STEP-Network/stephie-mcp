// Monday.com column value types for mutations

export interface StatusColumnValue {
	index: number;
}

export interface PriorityColumnValue {
	index: number;
}

export interface PeopleColumnValue {
	personsAndTeams: Array<{
		id: number;
		kind: "person" | "team";
	}>;
}

export interface DateColumnValue {
	date: string;
}

export interface ConnectBoardsColumnValue {
	item_ids: number[];
}

export interface DropdownColumnValue {
	labels: string[];
}

export interface NumbersColumnValue {
	[key: string]: number | string;
}

export type MondayColumnValue =
	| string
	| number
	| StatusColumnValue
	| PriorityColumnValue
	| PeopleColumnValue
	| DateColumnValue
	| ConnectBoardsColumnValue
	| DropdownColumnValue
	| NumbersColumnValue
	| { text: string } // long_text
	| { email: string; text: string } // email
	| { phone: string; countryShortName?: string } // phone
	| { url: string; text?: string } // link
	| { checked: "true" | "false" } // checkbox
	| Record<string, unknown>; // For any other column types

export type MondayColumnValues = Record<string, MondayColumnValue>;

export interface GraphQLError {
	message: string;
	extensions?: Record<string, unknown>;
	path?: Array<string | number>;
}

// Monday.com query response types
export interface MondayColumnValueResponse {
	id: string;
	type?: string;
	text?: string;
	value?: string;
	display_value?: string;
	number?: number | string;
	column?: {
		title: string;
		id: string;
		type?: string;
	};
	linked_items?: Array<{
		id: string;
		name: string;
	}>;
	linked_item_ids?: string[];
	[key: string]: unknown; // Allow additional properties
}

export interface MondayItemResponse {
	id: string;
	name: string;
	state?: string;
	updated_at?: string;
	group?: {
		id: string;
		title: string;
	};
	column_values: MondayColumnValueResponse[];
	subitems?: MondayItemResponse[];
	[key: string]: unknown; // Allow additional properties
}

export interface MondayBoardResponse {
	id: string;
	name?: string;
	items_page?: {
		items: MondayItemResponse[];
	};
	groups?: Array<{
		id: string;
		title: string;
		items_page?: {
			items: MondayItemResponse[];
		};
	}>;
	columns?: Array<{
		id: string;
		title: string;
		type: string;
		settings_str?: string;
	}>;
	[key: string]: unknown; // Allow additional properties
}

export interface MondayApiResponse {
	data?: {
		boards?: MondayBoardResponse[];
		items?: MondayItemResponse[];
		[key: string]: unknown;
	};
	errors?: GraphQLError[];
}
