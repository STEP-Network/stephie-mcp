import { config } from 'dotenv';
import { getAllPublishers } from '../../lib/tools/getAllPublishers.js';

config({ path: '../../.env.local' });

(async () => {
  const result = await getAllPublishers();
  console.log(result);
})();