import { mondayApi } from '../../monday/client.js';

interface UpdateParams {
  itemId: string;
  name?: string;
  person?: string;
  status_19__1?: number;
  type_1__1?: number;
  priority_1__1?: number;
  date__1?: string;
  text__1?: string;
  text0__1?: string;
  long_text__1?: string;
  link__1?: { url: string; text: string };
  numbers__1?: number;
  keyResultId?: string;
  teamTaskId?: string;
}

export async function updateTaskTechIntelligence(params: UpdateParams) {
  const { itemId, ...updates } = params;
  
  if (!itemId) {
    throw new Error('itemId is required');
  }
  
  const BOARD_ID = '1631907569';
  const columnValues: any = {};
  
  if (updates.name !== undefined) {
    columnValues.name = updates.name;
  }
  
  if (updates.person !== undefined) {
    columnValues.person = { personsAndTeams: [{ id: parseInt(updates.person), kind: 'person' }] };
  }
  
  if (updates.status_19__1 !== undefined) {
    columnValues.status_19__1 = { index: updates.status_19__1 };
  }
  
  if (updates.type_1__1 !== undefined) {
    columnValues.type_1__1 = { index: updates.type_1__1 };
  }
  
  if (updates.priority_1__1 !== undefined) {
    columnValues.priority_1__1 = { index: updates.priority_1__1 };
  }
  
  if (updates.date__1 !== undefined) {
    columnValues.date__1 = { date: updates.date__1 };
  }
  
  if (updates.text__1 !== undefined) {
    columnValues.text__1 = updates.text__1;
  }
  
  if (updates.text0__1 !== undefined) {
    columnValues.text0__1 = updates.text0__1;
  }
  
  if (updates.long_text__1 !== undefined) {
    columnValues.long_text__1 = { text: updates.long_text__1 };
  }
  
  if (updates.link__1 !== undefined) {
    columnValues.link__1 = updates.link__1;
  }
  
  if (updates.numbers__1 !== undefined) {
    columnValues.numbers__1 = updates.numbers__1.toString();
  }
  
  if (updates.keyResultId !== undefined) {
    columnValues.board_relation_mkpjqgpv = { item_ids: [updates.keyResultId] };
  }
  
  if (updates.teamTaskId !== undefined) {
    columnValues.connect_boards_Mjj8XLFi = { item_ids: [updates.teamTaskId] };
  }
  
  if (Object.keys(columnValues).length === 0) {
    throw new Error('No fields to update');
  }
  
  const mutation = `
    mutation {
      change_multiple_column_values(
        board_id: ${BOARD_ID},
        item_id: ${itemId},
        column_values: ${JSON.stringify(JSON.stringify(columnValues))}
      ) {
        id
        name
        updated_at
        column_values {
          id
          text
          value
        }
      }
    }
  `;
  
  try {
    const response = await mondayApi(mutation);
    const updatedItem = response.data?.change_multiple_column_values;
    
    if (!updatedItem) {
      throw new Error('Failed to update item');
    }
    
    const lines: string[] = [];
    lines.push(`# Task Updated Successfully`);
    lines.push(`**Item ID:** ${updatedItem.id}`);
    lines.push(`**Name:** ${updatedItem.name}`);
    lines.push(`**Updated At:** ${updatedItem.updated_at}`);
    lines.push('');
    lines.push('## Updated Fields');
    
    updatedItem.column_values.forEach((col: any) => {
      if (col.text) {
        lines.push(`- **${col.id}:** ${col.text}`);
      }
    });
    
    return lines.join('\n');
  } catch (error) {
    console.error('Error updating TaskTechIntelligence item:', error);
    throw error;
  }
}