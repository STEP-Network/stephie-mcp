import { z } from 'zod';
import { getAvailabilityForecast } from '../gam/soap.js';
import { parseStringPromise } from 'xml2js';
import { mondayApi } from '../monday/client.js';

export type ContendingLineItem = {
  lineItemId: number;
  lineItemName?: string;
  orderName?: string;
  priority?: number;
  contendingImpressions: number;
};

export type TargetingCriteriaBreakdown = {
  targetingCriterion: string;
  targetingDimension: string;
  availableUnits: number;
  matchedUnits: number;
};

export type CustomTargeting = {
  keyId: string;
  keyName?: string;
  valueIds: string[];
  valueNames?: string[];
  operator?: 'IS' | 'IS_NOT';
};

/**
 * Availability forecast tool for Google Ad Manager SOAP API
 * Returns markdown-formatted forecast data for LLM consumption
 */
export const availabilityForecast = async (params: {
  startDate: string;
  endDate: string;
  goalQuantity?: number | null;
  targetedAdUnitIds?: number[] | null;
  sizes: number[][];
  excludedAdUnitIds?: number[] | null;
  audienceSegmentIds?: string[] | null;
  customTargeting?: Array<{
    keyId: string;
    valueIds: string[];
    operator?: 'IS' | 'IS_NOT';
  }> | null;
  frequencyCapMaxImpressions?: number | null;
  frequencyCapTimeUnit?:
    | 'MINUTE'
    | 'HOUR'
    | 'DAY'
    | 'WEEK'
    | 'MONTH'
    | 'LIFETIME'
    | null;
  geoTargeting?: {
    targetedLocationIds?: string[];
    excludedLocationIds?: string[];
  } | null;
  targetedPlacementIds?: string[] | null;
}): Promise<string> => {
  console.error('[availabilityForecast] START. Tool execution started.');

  try {
    const {
      startDate,
      endDate,
      goalQuantity,
      targetedAdUnitIds,
      sizes,
      excludedAdUnitIds,
      audienceSegmentIds,
      customTargeting,
      frequencyCapMaxImpressions,
      frequencyCapTimeUnit = 'WEEK',
      geoTargeting,
      targetedPlacementIds,
    } = params;

    console.error('[availabilityForecast] Making GAM availability forecast with params:', {
      startDate,
      endDate,
      goalQuantity,
      targetedAdUnitIds: targetedAdUnitIds?.length || 0,
      excludedAdUnitIds: excludedAdUnitIds?.length || 0,
      sizes: sizes.length,
      audienceSegmentIds: audienceSegmentIds?.length || 0,
      customTargeting: customTargeting?.length || 0,
      frequencyCapMaxImpressions,
      frequencyCapTimeUnit,
      geoTargeting,
      targetedPlacementIds: targetedPlacementIds?.length || 0,
    });

    const sizeValues = sizes.map(([width, height]) => ({
      width,
      height,
    }));

    // Check if startDate is "now" for immediate start
    const isImmediateStart = startDate.toLowerCase() === 'now';

    // Call the SOAP implementation
    const soapResult = await getAvailabilityForecast({
      startDateTime: isImmediateStart ? 'IMMEDIATELY' : startDate,
      endDateTime: endDate,
      sizes: sizeValues,
      goalImpressions: goalQuantity || null,
      targetedAdUnitIds: targetedAdUnitIds || null,
      excludedAdUnitIds: excludedAdUnitIds || null,
      audienceSegmentIds: audienceSegmentIds || null,
      customTargeting: customTargeting || null,
      frequencyCapMaxImpressions: frequencyCapMaxImpressions || null,
      frequencyCapTimeUnit: frequencyCapTimeUnit || 'WEEK',
      geoTargeting: geoTargeting
        ? {
            targetedLocationIds: geoTargeting.targetedLocationIds?.map(
              (id) => Number.parseInt(id, 10),
            ),
            excludedLocationIds: geoTargeting.excludedLocationIds?.map(
              (id) => Number.parseInt(id, 10),
            ),
          }
        : null,
      targetedPlacementIds:
        targetedPlacementIds?.map((id) => Number.parseInt(id, 10)) || null,
    });

    if (!soapResult.success) {
      throw new Error(soapResult.error || 'SOAP request failed');
    }

    // Parse the SOAP response XML
    if (!soapResult.data) {
      throw new Error('No data returned from SOAP request');
    }
    const parsedSoapResult = await parseStringPromise(soapResult.data);

    // Navigate the XML structure for availability forecast
    const soapBody = parsedSoapResult['soap:Envelope']['soap:Body'][0];
    const getAvailabilityForecastResponse =
      soapBody.getAvailabilityForecastResponse[0];
    const rval = getAvailabilityForecastResponse.rval[0];

    // Extract availability metrics
    const availableUnits = Number.parseInt(
      rval.availableUnits?.[0] || '0',
      10,
    );
    const matchedUnits = Number.parseInt(rval.matchedUnits?.[0] || '0', 10);
    const possibleUnits = Number.parseInt(
      rval.possibleUnits?.[0] || '0',
      10,
    );
    const deliveredUnits = Number.parseInt(
      rval.deliveredUnits?.[0] || '0',
      10,
    );
    const reservedUnits = Number.parseInt(
      rval.reservedUnits?.[0] || '0',
      10,
    );

    // Extract contending line items
    const contendingLineItems: ContendingLineItem[] = [];
    if (rval.contendingLineItems) {
      const items = Array.isArray(rval.contendingLineItems)
        ? rval.contendingLineItems
        : [rval.contendingLineItems];

      items.forEach((item: any) => {
        if (item) {
          const lineItemId = Number.parseInt(
            item.lineItemId?.[0] || '0',
            10,
          );

          contendingLineItems.push({
            lineItemId,
            lineItemName: item.lineItemName?.[0] || item.name?.[0],
            priority: item.priority?.[0]
              ? Number.parseInt(item.priority[0], 10)
              : undefined,
            contendingImpressions: Number.parseInt(
              item.contendingImpressions?.[0] || '0',
              10,
            ),
          });
        }
      });
    }

    // Extract targeting criteria breakdown
    const targetingCriteriaBreakdown: TargetingCriteriaBreakdown[] = [];
    if (rval.targetingCriteriaBreakdowns?.[0]) {
      const breakdowns = Array.isArray(rval.targetingCriteriaBreakdowns)
        ? rval.targetingCriteriaBreakdowns
        : [rval.targetingCriteriaBreakdowns];

      breakdowns.forEach((breakdown: any) => {
        if (breakdown) {
          targetingCriteriaBreakdown.push({
            targetingCriterion:
              breakdown.targetingCriteriaName?.[0] ||
              breakdown.targetingCriterion?.[0] ||
              'Unknown',
            targetingDimension:
              breakdown.targetingDimension?.[0] || 'Unknown',
            availableUnits: Number.parseInt(
              breakdown.availableUnits?.[0] || '0',
              10,
            ),
            matchedUnits: Number.parseInt(
              breakdown.matchedUnits?.[0] || '0',
              10,
            ),
          });
        }
      });
    }

    console.error('[availabilityForecast] Availability Forecast Results:', {
      availableUnits,
      matchedUnits,
      possibleUnits,
      deliveredUnits,
      reservedUnits,
      contendingLineItems: contendingLineItems.length,
      targetingBreakdowns: targetingCriteriaBreakdown.length,
    });

    // Fetch ad unit names from Monday.com if we have IDs
    let adUnitNames: Record<number, string> = {};
    const allAdUnitIds = [
      ...(targetedAdUnitIds || []),
      ...(excludedAdUnitIds || []),
    ];

    if (allAdUnitIds.length > 0) {
      try {
        const query = `{
          boards(ids: 1558569789) {
            items_page(limit: 500, query_params: { 
              rules: [{
                column_id: "text__1",
                compare_value: [${allAdUnitIds.join(', ')}],
                operator: any_of
              }]
            }) {
              items {
                name
                column_values(ids: ["text__1"]) {
                  ... on TextValue {
                    text
                  }
                }
              }
            }
          }
        }`;

        const response = await mondayApi(query);
        const items = response.data?.boards?.[0]?.items_page?.items || [];

        items.forEach((item: any) => {
          const adUnitId = item.column_values?.[0]?.text;
          if (adUnitId) {
            const id = Number.parseInt(adUnitId, 10);
            if (!Number.isNaN(id)) {
              adUnitNames[id] = item.name;
            }
          }
        });

        console.error(
          `[availabilityForecast] Fetched ${Object.keys(adUnitNames).length} ad unit names from Monday.com`,
        );
      } catch (error) {
        console.error(
          '[availabilityForecast] Failed to fetch ad unit names from Monday.com:',
          error,
        );
      }
    }

    // Build markdown output
    const lines: string[] = [];

    // Header
    lines.push('# Google Ad Manager Availability Forecast');
    lines.push('');
    
    // Request details
    const formattedStartDate = startDate.toLowerCase() === 'now' ? 'now' : startDate;
    lines.push('## Request Details');
    lines.push(`**Period:** ${formattedStartDate} - ${endDate}`);
    lines.push(`**Sizes:** ${sizes.map(([w, h]) => `${w}x${h}`).join(', ')}`);
    if (goalQuantity) {
      lines.push(`**Goal:** ${goalQuantity.toLocaleString()} impressions`);
    }
    lines.push('');

    // Targeting details
    if (targetedAdUnitIds && targetedAdUnitIds.length > 0) {
      lines.push('### Targeted Ad Units');
      lines.push(`*Count: ${targetedAdUnitIds.length} units*`);
      lines.push('');
      targetedAdUnitIds.slice(0, 10).forEach((id) => {
        const name = adUnitNames[id] || `Ad Unit ${id}`;
        lines.push(`- **${name}** \`${id}\``);
      });
      if (targetedAdUnitIds.length > 10) {
        lines.push(`- ... and ${targetedAdUnitIds.length - 10} more`);
      }
      lines.push('');
    }

    if (excludedAdUnitIds && excludedAdUnitIds.length > 0) {
      lines.push('### Excluded Ad Units');
      lines.push(`*Count: ${excludedAdUnitIds.length} units*`);
      lines.push('');
      excludedAdUnitIds.slice(0, 5).forEach((id) => {
        const name = adUnitNames[id] || `Ad Unit ${id}`;
        lines.push(`- **${name}** \`${id}\``);
      });
      if (excludedAdUnitIds.length > 5) {
        lines.push(`- ... and ${excludedAdUnitIds.length - 5} more`);
      }
      lines.push('');
    }

    if (audienceSegmentIds && audienceSegmentIds.length > 0) {
      lines.push('### Audience Segments');
      audienceSegmentIds.forEach((id) => {
        lines.push(`- Segment \`${id}\``);
      });
      lines.push('');
    }

    if (customTargeting && customTargeting.length > 0) {
      lines.push('### Custom Targeting');
      customTargeting.forEach((ct) => {
        const operator = ct.operator || 'IS';
        lines.push(`- Key \`${ct.keyId}\` ${operator} [${ct.valueIds.join(', ')}]`);
      });
      lines.push('');
    }

    if (geoTargeting?.targetedLocationIds?.length) {
      lines.push('### Geographic Targeting');
      lines.push(`- Targeted locations: ${geoTargeting.targetedLocationIds.length} locations`);
      if (geoTargeting.excludedLocationIds?.length) {
        lines.push(`- Excluded locations: ${geoTargeting.excludedLocationIds.length} locations`);
      }
      lines.push('');
    }

    if (targetedPlacementIds && targetedPlacementIds.length > 0) {
      lines.push('### Placement Targeting');
      targetedPlacementIds.forEach((id) => {
        lines.push(`- Placement \`${id}\``);
      });
      lines.push('');
    }

    if (frequencyCapMaxImpressions) {
      lines.push('### Frequency Capping');
      lines.push(`- **Max impressions:** ${frequencyCapMaxImpressions} per ${frequencyCapTimeUnit?.toLowerCase() || 'week'}`);
      lines.push('');
    }

    // Forecast results
    lines.push('## Forecast Results');
    lines.push('');
    
    lines.push('| Metric | Value |');
    lines.push('|--------|--------|');
    lines.push(`| **Available Units** | ${availableUnits.toLocaleString()} |`);
    lines.push(`| **Matched Units** | ${matchedUnits.toLocaleString()} |`);
    lines.push(`| **Possible Units** | ${possibleUnits.toLocaleString()} |`);
    lines.push(`| **Delivered Units** | ${deliveredUnits.toLocaleString()} |`);
    lines.push(`| **Reserved Units** | ${reservedUnits.toLocaleString()} |`);
    lines.push('');

    // Goal achievement
    if (goalQuantity) {
      const percentageAvailable = (availableUnits / goalQuantity) * 100;
      lines.push('### Goal Achievement');
      lines.push(`**${Math.round(percentageAvailable)}%** of goal can be fulfilled`);
      if (percentageAvailable >= 95) {
        lines.push('✅ **Goal can be achieved**');
      } else if (percentageAvailable >= 75) {
        lines.push('⚠️ **Goal partially achievable**');
      } else {
        lines.push('❌ **Goal difficult to achieve**');
      }
      lines.push('');
    }

    // Contending line items
    if (contendingLineItems.length > 0) {
      lines.push('### Contending Line Items');
      lines.push(`*Found ${contendingLineItems.length} competing campaigns*`);
      lines.push('');
      lines.push('| Line Item | Priority | Contending Impressions |');
      lines.push('|-----------|----------|----------------------|');
      contendingLineItems.slice(0, 5).forEach((item) => {
        const name = item.lineItemName || `Line Item ${item.lineItemId}`;
        const priority = item.priority || 'N/A';
        lines.push(`| **${name}** | ${priority} | ${item.contendingImpressions.toLocaleString()} |`);
      });
      if (contendingLineItems.length > 5) {
        lines.push(`| ... | ... | *+${contendingLineItems.length - 5} more* |`);
      }
      lines.push('');
    }

    // Targeting criteria breakdown
    if (targetingCriteriaBreakdown.length > 0) {
      lines.push('### Targeting Breakdown');
      lines.push('');
      lines.push('| Criterion | Dimension | Available | Matched |');
      lines.push('|-----------|-----------|-----------|---------|');
      targetingCriteriaBreakdown.forEach((breakdown) => {
        lines.push(`| **${breakdown.targetingCriterion}** | ${breakdown.targetingDimension} | ${breakdown.availableUnits.toLocaleString()} | ${breakdown.matchedUnits.toLocaleString()} |`);
      });
      lines.push('');
    }

    // Summary
    lines.push('---');
    lines.push('');
    lines.push('**Summary:** ');
    if (goalQuantity) {
      const percentageAvailable = (availableUnits / goalQuantity) * 100;
      lines.push(`GAM can deliver ${availableUnits.toLocaleString()} impressions (${Math.round(percentageAvailable)}% of ${goalQuantity.toLocaleString()} goal) for the specified targeting and period.`);
    } else {
      lines.push(`GAM has ${availableUnits.toLocaleString()} available impressions for the specified targeting and period.`);
    }

    return lines.join('\n');

  } catch (error: any) {
    console.error('[availabilityForecast] ERROR in tool execution:', error);
    const errorMessage =
      error?.message ||
      (typeof error === 'string' ? error : 'Failed to fetch forecast');

    const lines: string[] = [];
    lines.push('# Availability Forecast Error');
    lines.push('');
    lines.push(`**Error:** ${errorMessage}`);
    lines.push('');
    lines.push('Please check the parameters and try again. Common issues:');
    lines.push('- Invalid date format (use YYYY-MM-DD)');
    lines.push('- Missing or invalid ad unit IDs');
    lines.push('- Google Ad Manager authentication issues');
    lines.push('- Network connectivity problems');

    return lines.join('\n');
  }
};

// Export the tool schema for MCP
export const availabilityForecastTool = {
  name: 'availabilityForecast',
  description: 'Get availability forecast from Google Ad Manager. Returns impression availability for specified ad units, targeting, and date range.',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format or "now" for immediate start',
      },
      endDate: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format',
      },
      goalQuantity: {
        type: ['number', 'null'],
        description: 'Target number of impressions. Leave null for maximum available',
      },
      targetedAdUnitIds: {
        type: ['array', 'null'],
        items: { type: 'number' },
        description: 'Array of ad unit IDs to target (from findPublisherAdUnits)',
      },
      sizes: {
        type: 'array',
        items: {
          type: 'array',
          items: { type: 'number' },
          minItems: 2,
          maxItems: 2,
        },
        description: 'Array of ad sizes as [width, height] pairs, e.g. [[300,250], [728,90]]',
      },
      excludedAdUnitIds: {
        type: ['array', 'null'],
        items: { type: 'number' },
        description: 'Array of ad unit IDs to exclude from forecast',
      },
      audienceSegmentIds: {
        type: ['array', 'null'],
        items: { type: 'string' },
        description: 'Array of audience segment IDs for demographic targeting',
      },
      customTargeting: {
        type: ['array', 'null'],
        items: {
          type: 'object',
          properties: {
            keyId: { type: 'string' },
            valueIds: { type: 'array', items: { type: 'string' } },
            operator: { type: 'string', enum: ['IS', 'IS_NOT'] },
          },
          required: ['keyId', 'valueIds'],
        },
        description: 'Array of custom targeting key-value pairs',
      },
      frequencyCapMaxImpressions: {
        type: ['number', 'null'],
        description: 'Maximum impressions per user for frequency capping',
      },
      frequencyCapTimeUnit: {
        type: ['string', 'null'],
        enum: ['MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'LIFETIME'],
        description: 'Time unit for frequency capping',
      },
      geoTargeting: {
        type: ['object', 'null'],
        properties: {
          targetedLocationIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of location IDs to target',
          },
          excludedLocationIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of location IDs to exclude',
          },
        },
        description: 'Geographic targeting configuration',
      },
      targetedPlacementIds: {
        type: ['array', 'null'],
        items: { type: 'string' },
        description: 'Array of placement IDs to target',
      },
    },
    required: ['startDate', 'endDate', 'sizes'],
  },
} as const;