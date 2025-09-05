import { mondayApi } from '../monday/client.js';

const PRODUCT_GROUPS_BOARD_ID = '1611223368';
const PRODUCTS_BOARD_ID = '1983692701';

export async function getAllProducts(args: {
  limit?: number;
}) {
  const { limit = 100 } = args;

  try {
    // Fetch from both boards in parallel
    const queries = [
      // Product Groups query
      `{
        board1: boards(ids: ${PRODUCT_GROUPS_BOARD_ID}) {
          items_page(limit: ${limit}) {
            items {
              name
              column_values {
                column {
                  title
                }
                text
                ... on BoardRelationValue {
                  linked_items {
                    name
                  }
                }
              }
            }
          }
        }
      }`,
      // Products query
      `{
        board2: boards(ids: ${PRODUCTS_BOARD_ID}) {
          items_page(limit: ${limit}) {
            items {
              name
              column_values {
                column {
                  title
                }
                text
                ... on BoardRelationValue {
                  linked_items {
                    name
                  }
                }
              }
            }
          }
        }
      }`
    ];

    console.error('[getAllProducts] Fetching product groups and products...');

    const [groupsResponse, productsResponse] = await Promise.all(
      queries.map(query => mondayApi(query))
    );
    
    // Process Product Groups
    const productGroups = [];
    if (groupsResponse.data?.board1?.[0]?.items_page?.items) {
      const items = groupsResponse.data.board1[0].items_page.items;
      
      for (const item of items) {
        const columnValues: Record<string, any> = {};
        
        item.column_values?.forEach((col: any) => {
          const title = col.column.title;
          if (col.linked_items && col.linked_items.length > 0) {
            columnValues[title] = col.linked_items.map((i: any) => i.name);
          } else {
            columnValues[title] = col.text || '';
          }
        });
        
        productGroups.push({
          type: 'group',
          name: item.name,
          description: columnValues['Produkt Beskrivelse'] || '',
          products: columnValues['Annonce Produkter'] || [],
          formats: columnValues['Annonce Formater'] || [],
          sizes: columnValues['Placeringer / Ad Unit Størrelser'] || []
        });
      }
    }
    
    // Process Products
    const products = [];
    if (productsResponse.data?.board2?.[0]?.items_page?.items) {
      const items = productsResponse.data.board2[0].items_page.items;
      
      for (const item of items) {
        const columnValues: Record<string, any> = {};
        
        item.column_values?.forEach((col: any) => {
          const title = col.column.title;
          if (col.linked_items && col.linked_items.length > 0) {
            columnValues[title] = col.linked_items.map((i: any) => i.name);
          } else {
            columnValues[title] = col.text || '';
          }
        });
        
        products.push({
          type: 'product',
          name: item.name,
          productGroup: columnValues['*Produktgrupper'] ? columnValues['*Produktgrupper'][0] : '',
          description: columnValues['Produkt Beskrivelse'] || '',
          formats: columnValues['Annonce Formater'] || [],
          sizes: columnValues['Placeringer / Ad Unit Størrelser'] || []
        });
      }
    }

    // Format as text output
    const textLines: string[] = [];
    textLines.push(`PRODUKTER OG PRODUKTGRUPPER`);
    textLines.push('═'.repeat(50));
    textLines.push('');
    
    // Display Product Groups
    if (productGroups.length > 0) {
      textLines.push(`PRODUKTGRUPPER (${productGroups.length})`);
      textLines.push('─'.repeat(40));
      
      for (const group of productGroups) {
        textLines.push(`▸ ${group.name}`);
        
        if (group.products.length > 0) {
          textLines.push(`  Produkter: ${group.products.join(', ')}`);
        }
        
        if (group.formats.length > 0) {
          const formatList = group.formats.slice(0, 5).join(', ');
          const more = group.formats.length > 5 ? ` (+${group.formats.length - 5} flere)` : '';
          textLines.push(`  Formater: ${formatList}${more}`);
        }
        
        if (group.description) {
          textLines.push(`  ${group.description.substring(0, 100)}${group.description.length > 100 ? '...' : ''}`);
        }
        textLines.push('');
      }
    }
    
    // Display Products
    if (products.length > 0) {
      textLines.push(`PRODUKTER (${products.length})`);
      textLines.push('─'.repeat(40));
      
      // Group products by product group
      const productsByGroup: Record<string, any[]> = {};
      for (const product of products) {
        const group = product.productGroup || 'Uncategorized';
        if (!productsByGroup[group]) {
          productsByGroup[group] = [];
        }
        productsByGroup[group].push(product);
      }
      
      for (const [groupName, groupProducts] of Object.entries(productsByGroup)) {
        textLines.push(`${groupName}:`);
        
        for (const product of groupProducts) {
          textLines.push(`  • ${product.name}`);
          
          if (product.formats.length > 0) {
            const formatList = product.formats.slice(0, 3).join(', ');
            const more = product.formats.length > 3 ? ` (+${product.formats.length - 3})` : '';
            textLines.push(`    Formater: ${formatList}${more}`);
          }
          
          if (product.sizes.length > 0) {
            const sizeList = product.sizes.slice(0, 5).join(', ');
            const more = product.sizes.length > 5 ? ` (+${product.sizes.length - 5})` : '';
            textLines.push(`    Størrelser: ${sizeList}${more}`);
          }
        }
        textLines.push('');
      }
    }
    
    textLines.push(`Total: ${productGroups.length} produktgrupper, ${products.length} produkter`);

    return textLines.join('\n');
  } catch (error) {
    console.error('Error fetching products:', error);
    throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}