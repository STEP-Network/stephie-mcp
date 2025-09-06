import { config } from 'dotenv';
import { getBoardColumns } from './lib/tools/debug/getBoardColumns.js';
config({ path: '.env.local' });

(async () => {
  const result = await getBoardColumns('1222800432');
  const boardRelations = result.columns.filter((col: any) => col.type === 'board-relation');
  console.log('Board relation columns:');
  boardRelations.forEach((col: any) => {
    console.log('- ID:', col.id, '| Title:', col.title);
  });
})();