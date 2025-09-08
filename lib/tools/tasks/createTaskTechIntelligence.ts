import { mondayApi } from '../../monday/client.js';

interface CreateParams {
  name: string;
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
  groupId?: string;
}

export async function createTaskTechIntelligence(params: CreateParams) {
  const { name, groupId, ...fields } = params;
  
  if (!name) {
    throw new Error('name is required');
  }
  
  const BOARD_ID = '1631907569';
  const columnValues: any = {};
  
  if (fields.person !== undefined) {
    columnValues.person = { personsAndTeams: [{ id: parseInt(fields.person), kind: 'person' }] };
  }
  
  if (fields.status_19__1 !== undefined) {
    columnValues.status_19__1 = { index: fields.status_19__1 };
  }
  
  if (fields.type_1__1 !== undefined) {
    columnValues.type_1__1 = { index: fields.type_1__1 };
  }
  
  if (fields.priority_1__1 !== undefined) {
    columnValues.priority_1__1 = { index: fields.priority_1__1 };
  }
  
  if (fields.date__1 !== undefined) {
    columnValues.date__1 = { date: fields.date__1 };
  }
  
  if (fields.text__1 !== undefined) {
    columnValues.text__1 = fields.text__1;
  }
  
  if (fields.text0__1 !== undefined) {
    columnValues.text0__1 = fields.text0__1;
  }
  
  if (fields.long_text__1 !== undefined) {
    columnValues.long_text__1 = { text: fields.long_text__1 };
  }
  
  if (fields.link__1 !== undefined) {
    columnValues.link__1 = fields.link__1;
  }
  
  if (fields.numbers__1 !== undefined) {
    columnValues.numbers__1 = fields.numbers__1.toString();
  }
  
  if (fields.keyResultId !== undefined) {
    columnValues.board_relation_mkpjqgpv = { item_ids: [fields.keyResultId] };
  }
  
  if (fields.teamTaskId !== undefined) {
    columnValues.connect_boards_Mjj8XLFi = { item_ids: [fields.teamTaskId] };
  }
  
  const groupParam = groupId ? `, group_id: "${groupId}"` : '';
  const columnValuesParam = Object.keys(columnValues).length > 0 
    ? `, column_values: ${JSON.stringify(JSON.stringify(columnValues))}`
    : '';
  
  const mutation = `
    mutation {
      create_item(
        board_id: ${BOARD_ID},
        item_name: "${name.replace(/"/g, '\\"')}"${groupParam}${columnValuesParam}
      ) {
        id
        name
        created_at
        column_values {
          id
          text
          value
          column {
            title
            type
          }
        }
      }
    }
  `;
  
  try {
    const response = await mondayApi(mutation);
    const createdItem = response.data?.create_item;
    
    if (!createdItem) {
      throw new Error('Failed to create item');
    }
    
    const lines: string[] = [];
    lines.push(`# Task Created Successfully`);
    lines.push(`**Item ID:** ${createdItem.id}`);
    lines.push(`**Name:** ${createdItem.name}`);
    lines.push(`**Created At:** ${createdItem.created_at}`);
    lines.push('');
    lines.push('## Fields');
    
    createdItem.column_values.forEach((col: any) => {
      if (col.text) {
        lines.push(`- **${col.column.title}:** ${col.text}`);
      }
    });
    
    return lines.join('\n');
  } catch (error) {
    console.error('Error creating TaskTechIntelligence item:', error);
    throw error;
  }
}