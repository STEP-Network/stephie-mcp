import { mondayApi, BOARD_IDS } from '../monday/client.js';

export async function getPublishersByFormats(args: {
  formats: string[];
  includeInactive?: boolean;
}) {
  const { formats, includeInactive = false } = args;

  const query = `
    query GetPublishers($boardId: ID!, $limit: Int!) {
      boards(ids: [$boardId]) {
        id
        name
        items_page(limit: $limit) {
          items {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }
  `;

  const variables = {
    boardId: BOARD_IDS.PUBLISHERS,
    limit: 500,
  };

  try {
    const response = await mondayApi(query, variables);
    
    // Check if we got boards
    if (!response.data?.boards || response.data.boards.length === 0) {
      console.error('No boards found in response');
      return { publishers: [], total: 0, error: 'No boards found' };
    }
    
    const board = response.data.boards[0];
    const items = board?.items_page?.items || [];

    // Parse publisher data using actual column IDs
    const publishers = items.map((item: any) => {
      const columnValues = item.column_values || [];
      
      // Helper to find column value by ID
      const getColumnValue = (id: string) => {
        return columnValues.find((col: any) => col.id === id);
      };
      
      // Get all column values matching /stephie implementation
      const statusCol = getColumnValue('status8'); // Publisher status
      const websiteCol = getColumnValue('link__1'); // Hjemmeside link
      const contactEmailCol = getColumnValue('email'); // Kontakt email
      
      // Get ALL format-related columns from /stephie
      const formatColumns = {
        // Status-based formats
        videoFunction: getColumnValue('color_mkr4s6rs'), // Click To Play / Autoplay funktion
        ott: getColumnValue('color_mkr4rzd3'), // OTT (video)
        readStatus: getColumnValue('color_mksdc9rp'), // RE-AD status
        
        // Device-based formats with dropdowns
        topscrollAdnami: getColumnValue('dropdown_mksd7frz'),
        topscrollExpandAdnami: getColumnValue('dropdown_mksdjeft'),
        doubleMidscrollAdnami: getColumnValue('dropdown_mksdbwbf'),
        midscrollAdnami: getColumnValue('dropdown_mksd17vw'),
        adnamiNative: getColumnValue('dropdown_mksdb150'),
        
        topscrollHighImpact: getColumnValue('dropdown_mksdcgvj'),
        midscrollHighImpact: getColumnValue('dropdown_mksdjpqx'),
        
        wallpaper: getColumnValue('dropdown_mksdytf0'),
        anchor: getColumnValue('dropdown_mksdr0q2'),
        trueNative: getColumnValue('dropdown_mksdh745'),
        googleInterstitial: getColumnValue('dropdown_mksdfx54'),
        outstream: getColumnValue('dropdown_mksd6yy'),
        video: getColumnValue('dropdown_mksddmgt'),
        vertikalVideo: getColumnValue('dropdown_mksdw0qh'),
      };
      
      // Helper function to check if format is active
      const isFormatActive = (value: string | undefined) => {
        return value && value !== 'Nej' && value !== 'N/A' && value !== '';
      };
      
      // Build formats array with simplified names for matching
      const publisherFormats = [];
      
      // Status-based formats
      if (formatColumns.videoFunction?.text === 'Live') {
        publisherFormats.push({ name: 'video-function', devices: 'all' });
      }
      if (formatColumns.ott?.text === 'Live') {
        publisherFormats.push({ name: 'ott', devices: 'all' });
      }
      if (formatColumns.readStatus?.text === 'Aktiv') {
        publisherFormats.push({ name: 're-ad', devices: 'all' });
      }
      
      // Device-based formats
      if (isFormatActive(formatColumns.topscrollAdnami?.text)) {
        publisherFormats.push({ name: 'topscroll', devices: formatColumns.topscrollAdnami.text });
      }
      if (isFormatActive(formatColumns.topscrollExpandAdnami?.text)) {
        publisherFormats.push({ name: 'topscroll-expand', devices: formatColumns.topscrollExpandAdnami.text });
      }
      if (isFormatActive(formatColumns.doubleMidscrollAdnami?.text)) {
        publisherFormats.push({ name: 'double-midscroll', devices: formatColumns.doubleMidscrollAdnami.text });
      }
      if (isFormatActive(formatColumns.midscrollAdnami?.text)) {
        publisherFormats.push({ name: 'midscroll', devices: formatColumns.midscrollAdnami.text });
      }
      if (isFormatActive(formatColumns.adnamiNative?.text)) {
        publisherFormats.push({ name: 'adnami-native', devices: formatColumns.adnamiNative.text });
      }
      if (isFormatActive(formatColumns.topscrollHighImpact?.text)) {
        publisherFormats.push({ name: 'topscroll-highimpact', devices: formatColumns.topscrollHighImpact.text });
      }
      if (isFormatActive(formatColumns.midscrollHighImpact?.text)) {
        publisherFormats.push({ name: 'midscroll-highimpact', devices: formatColumns.midscrollHighImpact.text });
      }
      if (isFormatActive(formatColumns.wallpaper?.text)) {
        publisherFormats.push({ name: 'wallpaper', devices: formatColumns.wallpaper.text });
      }
      if (isFormatActive(formatColumns.anchor?.text)) {
        publisherFormats.push({ name: 'anchor', devices: formatColumns.anchor.text });
      }
      if (isFormatActive(formatColumns.trueNative?.text)) {
        publisherFormats.push({ name: 'true-native', devices: formatColumns.trueNative.text });
      }
      if (isFormatActive(formatColumns.googleInterstitial?.text)) {
        publisherFormats.push({ name: 'interstitial', devices: formatColumns.googleInterstitial.text });
      }
      if (isFormatActive(formatColumns.outstream?.text)) {
        publisherFormats.push({ name: 'outstream', devices: formatColumns.outstream.text });
      }
      if (isFormatActive(formatColumns.video?.text)) {
        publisherFormats.push({ name: 'video', devices: formatColumns.video.text });
      }
      if (isFormatActive(formatColumns.vertikalVideo?.text)) {
        publisherFormats.push({ name: 'vertikal-video', devices: formatColumns.vertikalVideo.text });
      }
      
      // Check if publisher is active based on status
      const isActive = statusCol?.text === 'Done' || statusCol?.text === 'Onboardet' || statusCol?.text === 'Live';
      
      // Convert formats to string array for output
      const formatsForOutput = publisherFormats.map(f => `${f.name} (${f.devices})`);
      
      return {
        id: item.id,
        name: item.name,
        website: websiteCol?.text || '',
        status: statusCol?.text || 'Unknown',
        active: isActive,
        formats: formatsForOutput,
        publisherFormatsDetailed: publisherFormats,
        contactEmail: contactEmailCol?.text || '',
      };
    });

    // Filter publishers based on requested formats
    const normalizedRequestedFormats = formats.map(f => f.toLowerCase().trim());
    
    let filteredPublishers = publishers.filter(publisher => {
      // Check if publisher has any of the requested formats
      const hasMatchingFormat = normalizedRequestedFormats.some(requestedFormat => {
        return publisher.publisherFormatsDetailed.some((pf: any) => {
          const formatName = pf.name.toLowerCase();
          // Match format names flexibly
          return formatName.includes(requestedFormat) || 
                 requestedFormat.includes(formatName) ||
                 (requestedFormat === 'topscroll' && formatName.includes('topscroll')) ||
                 (requestedFormat === 'midscroll' && formatName.includes('midscroll')) ||
                 (requestedFormat === 'wallpaper' && (formatName.includes('wallpaper') || formatName.includes('skin'))) ||
                 (requestedFormat === 'video' && formatName.includes('video'));
        });
      });
      
      // Apply active filter if not including inactive
      const passesActiveFilter = includeInactive || publisher.active;
      
      return hasMatchingFormat && passesActiveFilter;
    });

    // Sort by number of matching formats (most relevant first)
    filteredPublishers = filteredPublishers.sort((a, b) => {
      const aMatchCount = a.formats.filter((f: string) => 
        normalizedRequestedFormats.some(rf => f.toLowerCase().includes(rf))
      ).length;
      const bMatchCount = b.formats.filter((f: string) => 
        normalizedRequestedFormats.some(rf => f.toLowerCase().includes(rf))
      ).length;
      return bMatchCount - aMatchCount;
    });

    return {
      publishers: filteredPublishers,
      total: filteredPublishers.length,
      requestedFormats: formats,
      message: filteredPublishers.length > 0 ? 
        `Found ${filteredPublishers.length} publishers supporting the requested formats` :
        'No publishers found supporting the requested formats'
    };
  } catch (error) {
    console.error('Error fetching publishers by formats:', error);
    throw new Error(`Failed to fetch publishers by formats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}