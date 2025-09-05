import { mondayApi } from '../../monday/client.js';

export async function getBoardColumns(boardId: string = '1222800432') {
  const query = `
    query GetBoardColumns($boardId: ID!) {
      boards(ids: [$boardId]) {
        id
        name
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `;

  const variables = { boardId };

  try {
    const response = await mondayApi(query, variables);
    
    if (!response.data?.boards || response.data.boards.length === 0) {
      return { error: 'Board not found', columns: [] };
    }
    
    const board = response.data.boards[0];
    const columns = board.columns || [];
    
    // Find format-related columns
    const formatColumns = columns.filter((col: any) => {
      const title = col.title.toLowerCase();
      return title.includes('scroll') || 
             title.includes('banner') || 
             title.includes('video') || 
             title.includes('sticky') || 
             title.includes('wall') || 
             title.includes('cube') ||
             title.includes('format');
    });
    
    return {
      boardName: board.name,
      totalColumns: columns.length,
      columns: columns.map((col: any) => ({
        id: col.id,
        title: col.title,
        type: col.type
      })),
      formatColumns: formatColumns.map((col: any) => ({
        id: col.id,
        title: col.title,
        type: col.type
      }))
    };
  } catch (error) {
    console.error('Error fetching board columns:', error);
    throw error;
  }
}