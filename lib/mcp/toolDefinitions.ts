/**
 * Shared MCP Tool Definitions
 * Single source of truth for all MCP server implementations
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'getAllPublishers',
    description: 'Get all Live publishers/sites from Monday.com Publishers board. Returns all Live publishers/sites with essential information: Publisher/Site name, GAM Ad Unit ID, Vertical, Publisher Group, and Approval status (Gambling/Finance). Results are sorted by Vertical, then alphabetically by name.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'getPublisherFormats',
    description: 'Get detailed matrix of publishers/sites and their available ad formats grouped by device type. Shows ONLY ACTIVE formats per publisher/site - if a format is not listed, the publisher/site does NOT support it. Device abbreviations: M=Mobile, D=Desktop, A=App. Useful for finding which publishers/sites support specific format combinations.',
    inputSchema: {
      type: 'object',
      properties: {
        publisherName: { 
          type: 'string',
          description: 'Filter by publisher/site name (partial match, case-insensitive)'
        },
        publisherGroupName: {
          type: 'string',
          description: 'Filter by publisher/site group name (e.g., "JFM", "HeyMate")'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of publishers/sites to return (1-500, default: 100)',
          default: 100
        }
      }
    }
  },
  {
    name: 'getPublishersByFormats',
    description: 'Find publishers/sites that support specific ad formats on specific devices. Each format has its own available device options based on Monday.com configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        // Adnami formats with full device options
        topscroll: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'App', 'All'],
          description: 'Topscroll (Adnami) - Desktop: 970x510, Mobile: 300x220/300x280'
        },
        topscrollExpand: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'App', 'All'],
          description: 'Topscroll Expand (Adnami) - Desktop: 970x510, Mobile: 300x280'
        },
        // Adnami formats without App option
        doubleMidscroll: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'All'],
          description: 'Double Midscroll (Adnami) - Desktop: 970x550, Mobile: 300x210'
        },
        midscroll: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'All'],
          description: 'Midscroll (Adnami) - Desktop: 970x250, Mobile: 300x100'
        },
        midscrollExpand: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'All'],
          description: 'Midscroll Expand (Adnami) - Desktop: 970x250, Mobile: 300x200'
        },
        slider: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'All'],
          description: 'Slider (Adnami) format'
        },
        parallax: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'All'],
          description: 'Parallax (Adnami) effect format'
        },
        // High-impact.js formats
        topscrollHighimpact: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'All'],
          description: 'Topscroll (High-impact.js) - Desktop: 970x510, Mobile: 300x250'
        },
        midscrollHighimpact: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'All'],
          description: 'Midscroll (High-impact.js) - Desktop: 970x250, Mobile: 300x200'
        },
        // Other formats with full device options
        sticky: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'App', 'All'],
          description: 'Anchor/sticky format'
        },
        interstitial: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'App', 'All'],
          description: 'Google Interstitial (full-screen between pages)'
        },
        // Native format without App
        trueNative: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'All'],
          description: 'True Native format (matches site content)'
        },
        // Video formats without App option
        video: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'All'],
          description: 'Standard video format'
        },
        vertikalVideo: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'All'],
          description: 'Vertical/portrait video format'
        },
        outstream: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'All'],
          description: 'Outstream video (plays in content)'
        },
        // Status-based formats (boolean)
        videoPlayback: {
          type: 'boolean',
          description: 'Video Click-To-Play (CTP) and Autoplay (AP) support'
        },
        ott: {
          type: 'boolean',
          description: 'OTT (Over-The-Top) streaming video'
        },
        reAd: {
          type: 'boolean',
          description: 'RE-AD (Responsible Advertisement) - environmental friendly single ad per page'
        }
      }
    }
  },
  {
    name: 'getAllProducts',
    description: 'Get all ad products and product groups from Monday.com boards (Produktgrupper: 1611223368, Produkt: 1983692701). Shows product hierarchy with associated formats and ad unit sizes. Product groups contain multiple products (e.g., Display group contains Standard, High Impact products).',
    inputSchema: {
      type: 'object',
      properties: {
        includeIds: {
          type: 'boolean',
          description: 'Include Monday.com item IDs in output',
          default: false
        }
      }
    }
  },
  {
    name: 'getAllFormats',
    description: 'Get all ad format specifications from Monday.com Formater board (1983719743). Shows format dimensions, devices, and technical specifications. Formats are grouped by device type (Desktop, Mobile, App).',
    inputSchema: {
      type: 'object',
      properties: {
        device: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'App', 'All'],
          description: 'Filter by device type'
        },
        includeIds: {
          type: 'boolean',
          description: 'Include format IDs in output',
          default: false
        }
      }
    }
  },
  {
    name: 'getAllSizes',
    description: 'Get all ad unit sizes from Monday.com Sizes board (1558597958). Returns width, height, aspect ratio, and IAB standards compliance. Sizes are sorted by width then height.',
    inputSchema: {
      type: 'object',
      properties: {
        minWidth: {
          type: 'number',
          description: 'Minimum width in pixels'
        },
        maxWidth: {
          type: 'number',
          description: 'Maximum width in pixels'
        },
        includeIds: {
          type: 'boolean',
          description: 'Include size IDs in output',
          default: false
        }
      }
    }
  },
  {
    name: 'getAllAdPrices',
    description: 'Get all ad pricing from Monday.com Priser board (1432155906). Shows CPM rates by format and market segment. Prices are in DKK (Danish Kroner).',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description: 'Filter by format name'
        },
        includeIds: {
          type: 'boolean',
          description: 'Include price IDs in output',
          default: false
        }
      }
    }
  },
  {
    name: 'findPublisherAdUnits',
    description: 'Find ad units for publishers/sites with complete 3-level hierarchy: Publisher Groups (Level 1) → Publishers/Sites (Level 2) → Child Ad Units (Level 3). Returns all GAM IDs needed for forecasting. Essential for availabilityForecast tool.',
    inputSchema: {
      type: 'object',
      properties: {
        names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Publisher/site names to search for (e.g., ["jv.dk", "berlingske.dk"])'
        }
      },
      required: ['names']
    }
  },
  {
    name: 'getKeyValues',
    description: 'Get custom targeting key-values from Monday.com Key Values board (1802371471). Contains 22,000+ targeting options for content, demographics, and behavior. Returns keys with their associated values for GAM custom targeting.',
    inputSchema: {
      type: 'object',
      properties: {
        keySearch: {
          type: 'string',
          description: 'Search term for key names (e.g., "sport", "age")'
        },
        valueSearch: {
          type: 'string',
          description: 'Search term for values within keys'
        },
        limit: {
          type: 'number',
          description: 'Maximum keys to return (default: 50)',
          default: 50
        },
        valueLimit: {
          type: 'number',
          description: 'Maximum values per key (default: 50)',
          default: 50
        },
        totalValueLimit: {
          type: 'number',
          description: 'Maximum total values across all keys (default: 500)',
          default: 500
        }
      }
    }
  },
  {
    name: 'getAudienceSegments',
    description: 'Get demographic and behavioral audience segments from Monday.com Audience board (2051827669). Includes age, gender, interests, and third-party data segments. Returns segment IDs for GAM audience targeting.',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Search term for segment names or descriptions'
        },
        limit: {
          type: 'number',
          description: 'Maximum segments to return (default: 100)',
          default: 100
        }
      }
    }
  },
  {
    name: 'getAllPlacements',
    description: 'Get all GAM placements and content verticals from Monday.com Ad Placements board (1935559241). Returns placement names and IDs for targeting. Note: RON, Gambling, Finance, and RE-AD are special placements, not content verticals.',
    inputSchema: {
      type: 'object',
      properties: {
        includeIds: {
          type: 'boolean',
          description: 'Include GAM placement IDs in output',
          default: false
        }
      }
    }
  },
  {
    name: 'getGeoLocations',
    description: 'Search geographic locations for targeting in Denmark. Includes 1700+ cities, regions, postal codes, and municipalities. Returns location names with GAM criteria IDs for geographic targeting.',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Search term for location (city, postal code, region)',
          required: true
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (default: 50)',
          default: 50
        }
      },
      required: ['search']
    }
  },
  {
    name: 'getContextualTargeting',
    description: 'Get Neuwo contextual targeting categories from Google Ad Manager REST API. Returns content categories like news, sports, entertainment with their GAM IDs. Requires GAM authentication.',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: 'Search term for category names'
        },
        limit: {
          type: 'number',
          description: 'Maximum categories to return (default: 100)',
          default: 100
        }
      }
    }
  },
  {
    name: 'availabilityForecast',
    description: 'Get inventory availability forecast from Google Ad Manager SOAP API (v202502). Provides impression availability, contending line items, and optimization suggestions. Supports comprehensive targeting options.',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Campaign start date (YYYY-MM-DD) or "now" for immediate start',
          required: true
        },
        endDate: {
          type: 'string',
          description: 'Campaign end date (YYYY-MM-DD)',
          required: true
        },
        sizes: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'number' }
          },
          description: 'Ad sizes as [width, height] arrays (e.g., [[300, 250], [728, 90]])',
          required: true
        },
        adUnitIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'GAM ad unit IDs to target (get from findPublisherAdUnits)'
        },
        excludeAdUnitDescendants: {
          type: 'boolean',
          description: 'Exclude child ad units (default: false)',
          default: false
        },
        geoTargeting: {
          type: 'object',
          properties: {
            include: {
              type: 'array',
              items: { type: 'string' },
              description: 'Location IDs to include'
            },
            exclude: {
              type: 'array',
              items: { type: 'string' },
              description: 'Location IDs to exclude'
            }
          },
          description: 'Geographic targeting criteria'
        },
        customTargeting: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              keyId: { type: 'string' },
              valueIds: {
                type: 'array',
                items: { type: 'string' }
              },
              operator: {
                type: 'string',
                enum: ['IS', 'IS_NOT']
              }
            }
          },
          description: 'Custom key-value targeting'
        },
        audienceSegmentIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Audience segment IDs for targeting'
        },
        placementIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Placement IDs for content vertical targeting'
        },
        frequencyCap: {
          type: 'object',
          properties: {
            maxImpressions: { type: 'number' },
            numTimeUnits: { type: 'number' },
            timeUnit: {
              type: 'string',
              enum: ['MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'LIFETIME', 'POD', 'STREAM', 'UNKNOWN']
            }
          },
          description: 'Frequency capping settings'
        },
        goalQuantity: {
          type: 'number',
          description: 'Desired number of impressions'
        },
        includeContendingLineItems: {
          type: 'boolean',
          description: 'Include analysis of competing line items',
          default: false
        },
        includeTargetingCriteriaBreakdown: {
          type: 'boolean',
          description: 'Include breakdown by targeting criteria',
          default: false
        }
      },
      required: ['startDate', 'endDate', 'sizes']
    }
  },
  // Debug tools
  {
    name: 'listBoards',
    description: 'List all Monday.com boards from the Boards meta board (1698570295). Useful for discovering board structure and IDs.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'getBoardColumns',
    description: 'Get column structure for any Monday.com board. Shows column IDs, types, and for status/dropdown columns shows available options with their indices/values. Use this before getItems to understand what values to filter by.',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: {
          type: 'string',
          description: 'Monday.com board ID',
          required: true
        }
      },
      required: ['boardId']
    }
  },
  {
    name: 'getItems',
    description: `Fetch and filter items from any Monday.com board.

TIP: Use getBoardColumns first to see column IDs, types, and available values.

Column value formats by type:
• STATUS: Use index number only (e.g., 4 for "In Progress") - check getBoardColumns for mapping
• DROPDOWN: Use index/label ID only - check getBoardColumns for available options
• TEXT/LONG_TEXT: Any string value
• NUMBERS: Numeric values
• DATE: "YYYY-MM-DD" or relative ("TODAY", "THIS_WEEK", "ONE_MONTH_AGO")
• PEOPLE: User ID, name, or "me" for current user
• BOARD_RELATION: Item IDs or item names for connected items
• CHECKBOX: true/false or "checked"/"unchecked"
• EMAIL/LINK: String values
• PHONE: Phone numbers or partial matches

Operator selection (defaults applied if omitted):
• Status/Dropdown: equals (default), notEquals, empty, notEmpty
• Text/Email: contains (default), equals, notContains, empty
• Numbers: equals, greater, less, between, empty
• Date: exact, greater, less, between, empty
• People: equals, contains, me (assigned to me), empty
• Board Relations: equals (by ID), contains (by name), empty
• Checkbox: checked, unchecked`,
    inputSchema: {
      type: 'object',
      properties: {
        boardId: {
          type: 'string',
          description: 'Monday.com board ID',
          required: true
        },
        limit: {
          type: 'number',
          description: 'Maximum items to return (default: 10)',
          default: 10
        },
        columnIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific column IDs to fetch (optional - fetches all if not specified)'
        },
        itemIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific item IDs to fetch (overrides other filters)'
        },
        search: {
          type: 'string',
          description: 'Search items by name (partial match)'
        },
        columnFilters: {
          type: 'array',
          description: 'Filter items by column values. For status columns, use the label text (e.g., "In Progress", "Done") - NOT "IS" or other operators.',
          items: {
            type: 'object',
            properties: {
              columnId: {
                type: 'string',
                description: 'Column ID to filter by (e.g., "status_19__1" for status, "text__1" for text)'
              },
              value: {
                description: 'Value to filter by. Examples: "In Progress" (status), "me" (people), ["2024-01-01", "2024-12-31"] (date range), true (checkbox), ["item-123", "item-456"] (board relation IDs)'
              },
              operator: {
                type: 'string',
                description: 'OPTIONAL - Default operator is applied based on column type if omitted. Common: equals, contains, greater, less, between, empty. Special: "me" for people assigned to current user.',
                enum: ['equals', 'notEquals', 'contains', 'notContains', 'greater', 'greaterOrEqual', 'less', 'lessOrEqual', 'between', 'empty', 'notEmpty', 'me', 'checked', 'unchecked']
              }
            },
            required: ['columnId', 'value']
          }
        },
        includeColumnMetadata: {
          type: 'boolean',
          description: 'Include column type and settings information in response',
          default: false
        }
      },
      required: ['boardId']
    }
  }
];