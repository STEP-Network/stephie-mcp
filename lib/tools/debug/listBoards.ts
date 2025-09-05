import { mondayApi } from '../../monday/client.js';

const BOARDS_BOARD_ID = '1698570295'; // The "Boards" board that contains all board references

export async function listAllBoards() {
  const query = `
    query {
      boards(ids: [${BOARDS_BOARD_ID}]) {
        id
        name
        items_page(limit: 500) {
          items {
            id
            name
            column_values {
              id
              text
              value
              column {
                title
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await mondayApi(query);
    
    if (!response.data?.boards || response.data.boards.length === 0) {
      return { error: 'Boards board not found', boards: [] };
    }
    
    const boardItems = response.data.boards[0].items_page?.items || [];
    
    // Parse board items to extract board information
    const boards = boardItems.map((item: any) => {
      const columnValues: Record<string, any> = {};
      
      item.column_values?.forEach((col: any) => {
        columnValues[col.column.title] = col.text || col.value || '';
      });
      
      // Look for ID column or extract from specific columns
      const boardId = columnValues['Board ID'] || 
                     columnValues['ID'] || 
                     columnValues['Monday ID'] ||
                     '';
      
      return {
        id: boardId,
        name: item.name,
        description: columnValues['Description'] || columnValues['Beskrivelse'] || '',
        type: columnValues['Type'] || '',
        workspace: columnValues['Workspace'] || '',
        status: columnValues['Status'] || '',
        // Include all column values for debugging
        allColumns: columnValues
      };
    });
    
    // Group by type if available
    const boardsByType: Record<string, any[]> = {};
    boards.forEach((board: any) => {
      const type = board.type || 'Other';
      if (!boardsByType[type]) {
        boardsByType[type] = [];
      }
      boardsByType[type].push(board);
    });
    
    return {
      boards,
      total: boards.length,
      boardsByType,
      source: 'Boards board (1698570295)'
    };
  } catch (error) {
    console.error('Error listing boards:', error);
    throw error;
  }
}