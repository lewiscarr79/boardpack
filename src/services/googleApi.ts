import {
  ParsedSheetData,
  SlideTemplateData,
  SheetField,
  MappingPair,
  GoogleFileItem,
} from '../types';

export interface GoogleFileRef {
  id: string | null;
  error: string | null;
}

// Drive file IDs are long opaque strings. The floor rules out fragments such as
// the literal "e" in a /d/e/ publish link while staying below the shortest real ID.
const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{15,}$/;

const SHARE_LINK_HINT =
  'Open the file in Google Drive and use Share → Copy link — it looks like https://docs.google.com/presentation/d/FILE_ID/edit';

/**
 * Resolve a pasted Google link (or bare file ID) to a Drive file ID.
 *
 * Returns an explanatory `error` instead of a half-parsed ID when the link
 * cannot yield one, so the caller never sends a bogus ID to Google.
 */
export function parseGoogleFileRef(input: string): GoogleFileRef {
  const trimmed = (input || '').trim().replace(/^[<"'\s]+|[>"'\s]+$/g, '');

  if (!trimmed) {
    return { id: null, error: 'Paste a Google Drive link or file ID first.' };
  }

  // Bare file ID (no URL punctuation can survive DRIVE_ID_PATTERN)
  if (DRIVE_ID_PATTERN.test(trimmed)) {
    return { id: trimmed, error: null };
  }

  // "Publish to the web" links (/d/e/2PACX-.../pub) carry a publish token, not a
  // file ID. The old /\/d\/(...)/ match returned "e" here, and Google answered
  // that with a 400 HTML "unable to open the file" page.
  if (/\/d\/e\//.test(trimmed)) {
    return {
      id: null,
      error: `That is a "Publish to the web" link, which does not contain the file ID. ${SHARE_LINK_HINT}`,
    };
  }

  if (/\/drive\/(?:u\/\d+\/)?folders\//.test(trimmed)) {
    return {
      id: null,
      error: `That link points to a Drive folder, not a file. ${SHARE_LINK_HINT}`,
    };
  }

  // .../d/FILE_ID/... (also matches /presentation/u/0/d/FILE_ID/edit)
  const fromPath = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  // .../open?id=FILE_ID, .../uc?id=FILE_ID&export=download
  const fromQuery = trimmed.match(/[?&#]id=([a-zA-Z0-9_-]+)/);
  const candidate = (fromPath && fromPath[1]) || (fromQuery && fromQuery[1]) || null;

  if (!candidate) {
    return { id: null, error: `Could not find a Google file ID in that link. ${SHARE_LINK_HINT}` };
  }

  if (!DRIVE_ID_PATTERN.test(candidate)) {
    return {
      id: null,
      error: `"${candidate}" is not a valid Google file ID. ${SHARE_LINK_HINT}`,
    };
  }

  return { id: candidate, error: null };
}

/**
 * Extract Google File ID from full URL or return ID if raw string
 */
export function extractFileId(input: string): string | null {
  return parseGoogleFileRef(input).id;
}

function isHtmlBody(body: string): boolean {
  return /^\s*(<!doctype\s+html|<html)/i.test(body);
}

export class GoogleApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GoogleApiError';
    this.status = status;
  }
}

const MIME_PRESENTATION = 'application/vnd.google-apps.presentation';
const MIME_SPREADSHEET = 'application/vnd.google-apps.spreadsheet';

const MIME_LABELS: Record<string, string> = {
  [MIME_PRESENTATION]: 'a Google Slides presentation',
  [MIME_SPREADSHEET]: 'a Google Sheet',
  'application/vnd.google-apps.document': 'a Google Doc',
  'application/vnd.google-apps.folder': 'a Drive folder',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'an uploaded PowerPoint (.pptx) that has not been converted to Google Slides',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    'an uploaded Excel workbook (.xlsx) that has not been converted to Google Sheets',
  'application/pdf': 'a PDF',
};

function describeMime(mimeType: string): string {
  return MIME_LABELS[mimeType] || `a file of type "${mimeType}"`;
}

/**
 * Check a file's identity via the Drive API before handing the ID to the
 * Slides/Sheets API.
 *
 * Slides and Sheets answer an unknown or wrong-type file ID with a 400 and an
 * HTML "unable to open the file" page rather than a JSON error, which tells the
 * user nothing. Drive always answers with JSON, so this turns that dead end into
 * a specific message. Best-effort: anything inconclusive falls through to the
 * real call rather than blocking it.
 */
async function assertDriveFileType(
  fileId: string,
  token: string,
  expectedMime: string
): Promise<void> {
  let meta: any;
  try {
    const url =
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
      `?fields=id,name,mimeType&supportsAllDrives=true`;
    meta = await fetchGoogleApi(url, token);
  } catch (err: any) {
    if (err instanceof GoogleApiError && (err.status === 404 || err.status === 403)) {
      throw new Error(
        `Google could not open the file with ID "${fileId}" (HTTP ${err.status}). ` +
          'Either no such file exists, or the Google account you are signed in with does not have ' +
          'access to it. Open the file in Drive while signed in as that account to check, then copy ' +
          'the link again from Share → Copy link.'
      );
    }
    // Anything else (network blip, missing Drive scope) is inconclusive.
    return;
  }

  if (meta?.mimeType && meta.mimeType !== expectedMime) {
    const name = meta.name ? `"${meta.name}"` : `ID "${fileId}"`;
    throw new Error(
      `${name} is ${describeMime(meta.mimeType)}, not ${describeMime(expectedMime)}. ` +
        (meta.mimeType.startsWith('application/vnd.openxmlformats')
          ? 'Open it in Drive and use File → Save as Google Slides/Sheets, then use the link to the converted copy.'
          : 'Pick the right file and copy its link again.')
    );
  }
}

/**
 * Helper to fetch Google REST API with Bearer token
 */
async function fetchGoogleApi(url: string, token: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    ...(options.headers as Record<string, string> || {}),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Read the body once. Calling response.json() first and falling back to
    // response.text() throws "body already read" and loses the error entirely.
    const raw = await response.text().catch(() => '');
    console.error('Google API Error Response:', response.status, response.statusText, url, raw);

    let detail = '';
    let errorData: any = null;
    try {
      errorData = raw ? JSON.parse(raw) : null;
    } catch {
      errorData = null;
    }

    if (errorData) {
      detail = errorData.error?.message
        || (Array.isArray(errorData.error?.errors) && errorData.error.errors[0]?.message)
        || errorData.message
        || (typeof errorData.error === 'string' ? errorData.error : '');
    } else if (isHtmlBody(raw)) {
      // Slides/Docs answer an unknown or wrong-type file ID with an HTML
      // "unable to open the file" page rather than a JSON API error.
      detail =
        `Google returned an error page instead of an API response for ${url}. That usually means the file ID ` +
        'is wrong, the file has been deleted, or it is not the type this step expects (for example a .pptx/.xlsx ' +
        'upload that has not been converted to Google Slides/Sheets). Check the link, and that the Google account ' +
        'you are signed in with can open it.';
    } else {
      detail = raw.trim().slice(0, 300);
    }

    const statusText = response.statusText || 'Bad Request';
    const message = detail && detail !== '{}'
      ? `Google API error (${response.status}): ${detail}`
      : `Google API error (${response.status}: ${statusText})`;
    throw new GoogleApiError(message, response.status);
  }

  return response.json();
}

/**
 * Fetch Google Sheet metadata and values
 */
export async function fetchSheetData(
  spreadsheetId: string,
  token: string,
  sheetName?: string,
  rowIndex = 0
): Promise<ParsedSheetData> {
  await assertDriveFileType(spreadsheetId, token, MIME_SPREADSHEET);

  // 1. Get spreadsheet metadata
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`;
  const meta = await fetchGoogleApi(metaUrl, token);

  const title = meta.properties?.title || 'Untitled Sheet';
  const sheetNames = (meta.sheets || []).map((s: any) => s.properties?.title || 'Sheet1');
  const targetSheet = sheetName && sheetNames.includes(sheetName) ? sheetName : sheetNames[0] || 'Sheet1';

  // 2. Fetch cell values for sheet
  const range = `'${targetSheet}'!A1:Z200`;
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const valuesData = await fetchGoogleApi(valuesUrl, token);

  const rawRows: string[][] = valuesData.values || [];

  if (rawRows.length === 0) {
    return {
      spreadsheetId,
      spreadsheetTitle: title,
      sheets: sheetNames,
      selectedSheet: targetSheet,
      fields: [],
      rawHeaders: [],
      rawRows: [],
      selectedRowIndex: 0,
    };
  }

  // Determine format: Key-Value layout vs Header-Row table
  // Key-Value layout usually has 2-3 columns, with Col A containing variable names (e.g. BOARD_DATE, COMPANY_NAME)
  const fields: SheetField[] = [];
  const rawHeaders = rawRows[0] || [];

  // Check if Col A contains key-like strings in most rows
  let isKeyValueFormat = false;
  if (rawRows.length > 1 && rawRows[0].length <= 3) {
    const firstColKeys = rawRows.filter(r => r[0] && typeof r[0] === 'string' && r[0].trim().length > 0);
    if (firstColKeys.length / rawRows.length > 0.6) {
      isKeyValueFormat = true;
    }
  }

  if (isKeyValueFormat) {
    rawRows.forEach(row => {
      if (row[0] && row[0].trim()) {
        fields.push({
          key: row[0].trim(),
          value: row[1] !== undefined ? String(row[1]).trim() : '',
          sourceType: 'key-value',
        });
      }
    });
  } else {
    // Header-Row table format
    const dataRow = rawRows[1 + rowIndex] || rawRows[1] || [];
    rawHeaders.forEach((header, colIdx) => {
      if (header && header.trim()) {
        const val = dataRow[colIdx] !== undefined ? String(dataRow[colIdx]).trim() : '';
        fields.push({
          key: header.trim(),
          value: val,
          sourceType: 'table-column',
        });
      }
    });
  }

  return {
    spreadsheetId,
    spreadsheetTitle: title,
    sheets: sheetNames,
    selectedSheet: targetSheet,
    fields,
    rawHeaders,
    rawRows,
    selectedRowIndex: rowIndex,
  };
}

/**
 * Fetch Google Slides Presentation metadata and extract placeholders
 */
export async function fetchSlideTemplate(
  presentationId: string,
  token: string
): Promise<SlideTemplateData> {
  await assertDriveFileType(presentationId, token, MIME_PRESENTATION);

  const url = `https://slides.googleapis.com/v4/presentations/${presentationId}`;
  const presentation = await fetchGoogleApi(url, token);

  const title = presentation.title || 'Untitled Presentation';
  const slides = presentation.slides || [];
  const placeholderSet = new Set<string>();

  const slidesSummary = slides.map((slide: any, index: number) => {
    const slidePlaceholders: string[] = [];
    let slideTitleSnippet = `Slide ${index + 1}`;

    const processText = (text: string) => {
      // Matches {{PLACEHOLDER}}, [PLACEHOLDER], or {PLACEHOLDER}
      const matches = text.match(/(\{\{[a-zA-Z0-9_\-\s]+\}\}|\[[a-zA-Z0-9_\-\s]+\]|\{[a-zA-Z0-9_\-\s]+\})/g);
      if (matches) {
        matches.forEach(m => {
          placeholderSet.add(m);
          slidePlaceholders.push(m);
        });
      }
    };

    // Inspect page elements
    const pageElements = slide.pageElements || [];
    pageElements.forEach((el: any) => {
      // Shape with text
      if (el.shape?.text?.textElements) {
        el.shape.text.textElements.forEach((te: any) => {
          if (te.textRun?.content) {
            processText(te.textRun.content);
            if (index === 0 && !slideTitleSnippet.startsWith('Slide') && te.textRun.content.trim()) {
              slideTitleSnippet = te.textRun.content.trim().slice(0, 30);
            }
          }
        });
      }
      // Table cells
      if (el.table?.tableRows) {
        el.table.tableRows.forEach((row: any) => {
          (row.tableCells || []).forEach((cell: any) => {
            if (cell.text?.textElements) {
              cell.text.textElements.forEach((te: any) => {
                if (te.textRun?.content) {
                  processText(te.textRun.content);
                }
              });
            }
          });
        });
      }
    });

    return {
      slideId: slide.objectId,
      slideIndex: index + 1,
      titleSnippet: slideTitleSnippet,
      placeholdersFound: Array.from(new Set(slidePlaceholders)),
    };
  });

  return {
    presentationId,
    title,
    placeholders: Array.from(placeholderSet),
    slideCount: slides.length,
    slidesSummary,
  };
}

/**
 * Perform automatic smart matching between template placeholders and sheet fields
 */
export function buildPlaceholderMappings(
  placeholders: string[],
  sheetFields: SheetField[]
): MappingPair[] {
  const normalize = (str: string) =>
    str
      .replace(/[\{\}\[\]]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  return placeholders.map(placeholder => {
    const rawKey = placeholder.replace(/[\{\}\[\]]/g, '').trim();
    const normalizedRaw = normalize(rawKey);

    // Try exact or normalized match in sheetFields
    const exactMatch = sheetFields.find(f => f.key.trim() === rawKey);
    const normMatch = exactMatch || sheetFields.find(f => normalize(f.key) === normalizedRaw);

    if (normMatch) {
      return {
        placeholder,
        rawKey,
        sheetKeyMatched: normMatch.key,
        value: normMatch.value,
      };
    }

    return {
      placeholder,
      rawKey,
      sheetKeyMatched: null,
      value: '',
    };
  });
}

/**
 * Copy template presentation in Google Drive
 */
export async function copyPresentationFile(
  templateId: string,
  newTitle: string,
  token: string
): Promise<{ id: string; name: string; webViewLink: string }> {
  const url = `https://www.googleapis.com/drive/v3/files/${templateId}/copy?fields=id,name,webViewLink`;
  const result = await fetchGoogleApi(url, token, {
    method: 'POST',
    body: JSON.stringify({
      name: newTitle,
    }),
  });

  return {
    id: result.id,
    name: result.name,
    webViewLink: result.webViewLink || `https://docs.google.com/presentation/d/${result.id}/edit`,
  };
}

/**
 * Execute batchReplace in copied Google Presentation
 */
export async function executeBatchReplaceInPresentation(
  presentationId: string,
  mappings: MappingPair[],
  token: string
): Promise<{ totalReplacements: number }> {
  const requests = mappings
    .filter(m => m.placeholder && m.value !== undefined)
    .map(m => ({
      replaceAllText: {
        containsText: {
          text: m.placeholder,
          matchCase: true,
        },
        replaceText: m.value,
      },
    }));

  if (requests.length === 0) {
    return { totalReplacements: 0 };
  }

  const url = `https://slides.googleapis.com/v4/presentations/${presentationId}:batchUpdate`;
  const result = await fetchGoogleApi(url, token, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });

  let totalOccurrences = 0;
  if (result.replies) {
    result.replies.forEach((reply: any) => {
      if (reply.replaceAllText?.occurrencesChanged) {
        totalOccurrences += reply.replaceAllText.occurrencesChanged;
      }
    });
  }

  return { totalReplacements: totalOccurrences };
}

/**
 * Create a ready-to-use Sample Google Sheet in User's Google Drive
 */
export async function createSampleBoardSheetInDrive(token: string): Promise<GoogleFileItem> {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const body = {
    properties: {
      title: 'Sample Board Meeting Data (Q3 2026)',
    },
    sheets: [
      {
        properties: { title: 'Board Metrics' },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              { values: [{ userEnteredValue: { stringValue: 'Placeholder Key' } }, { userEnteredValue: { stringValue: 'Value' } }] },
              { values: [{ userEnteredValue: { stringValue: 'COMPANY_NAME' } }, { userEnteredValue: { stringValue: 'Acme Corporation' } }] },
              { values: [{ userEnteredValue: { stringValue: 'MEETING_DATE' } }, { userEnteredValue: { stringValue: 'August 15, 2026' } }] },
              { values: [{ userEnteredValue: { stringValue: 'QUARTER' } }, { userEnteredValue: { stringValue: 'Q3 2026' } }] },
              { values: [{ userEnteredValue: { stringValue: 'ARR_AMOUNT' } }, { userEnteredValue: { stringValue: '$14.8M' } }] },
              { values: [{ userEnteredValue: { stringValue: 'ARR_GROWTH' } }, { userEnteredValue: { stringValue: '+42% YoY' } }] },
              { values: [{ userEnteredValue: { stringValue: 'Q3_REVENUE' } }, { userEnteredValue: { stringValue: '$3.75M' } }] },
              { values: [{ userEnteredValue: { stringValue: 'EBITDA_MARGIN' } }, { userEnteredValue: { stringValue: '18.4%' } }] },
              { values: [{ userEnteredValue: { stringValue: 'CASH_RUNWAY' } }, { userEnteredValue: { stringValue: '28 Months' } }] },
              { values: [{ userEnteredValue: { stringValue: 'CEO_HIGHLIGHT_1' } }, { userEnteredValue: { stringValue: 'Closed 3 Fortune 500 enterprise deals in Q3' } }] },
              { values: [{ userEnteredValue: { stringValue: 'CEO_HIGHLIGHT_2' } }, { userEnteredValue: { stringValue: 'Launched AI Studio Integration Module ahead of schedule' } }] },
              { values: [{ userEnteredValue: { stringValue: 'KEY_RISK_1' } }, { userEnteredValue: { stringValue: 'Engineering hiring timeline extended by 3 weeks' } }] },
              { values: [{ userEnteredValue: { stringValue: 'HEADCOUNT' } }, { userEnteredValue: { stringValue: '86 FTEs' } }] },
              { values: [{ userEnteredValue: { stringValue: 'NPS_SCORE' } }, { userEnteredValue: { stringValue: '+68' } }] },
            ],
          },
        ],
      },
    ],
  };

  const created = await fetchGoogleApi(url, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return {
    id: created.spreadsheetId,
    name: created.properties?.title || 'Sample Board Meeting Data',
    mimeType: 'application/vnd.google-apps.spreadsheet',
    webViewLink: `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}/edit`,
  };
}

/**
 * Create a ready-to-use Sample Google Slides Template in User's Google Drive
 */
export async function createSampleBoardSlideTemplateInDrive(token: string): Promise<GoogleFileItem> {
  // 1. Create a presentation
  const url = 'https://slides.googleapis.com/v4/presentations';
  const body = {
    title: 'Sample Board Meeting Deck Template (Master)',
  };

  const created = await fetchGoogleApi(url, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const presentationId = created.presentationId;

  // 2. Fetch full presentation details to reliably obtain initial slide ID
  let firstSlideId = created.slides?.[0]?.objectId;
  if (!firstSlideId) {
    try {
      const fullPresentation = await fetchGoogleApi(`https://slides.googleapis.com/v4/presentations/${presentationId}`, token);
      firstSlideId = fullPresentation.slides?.[0]?.objectId;
    } catch {
      firstSlideId = 'p';
    }
  }

  const requests: any[] = [];

  if (firstSlideId) {
    // Title slide setup
    requests.push({
      createShape: {
        objectId: 'TitleTextShape',
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: firstSlideId,
          size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 120, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, translateX: 50, translateY: 100 },
        },
      },
    });
    requests.push({
      insertText: {
        objectId: 'TitleTextShape',
        text: '{{COMPANY_NAME}} - Board Deck',
      },
    });
    requests.push({
      createShape: {
        objectId: 'SubtitleShape',
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: firstSlideId,
          size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 60, unit: 'PT' } },
          transform: { scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, translateX: 50, translateY: 230 },
        },
      },
    });
    requests.push({
      insertText: {
        objectId: 'SubtitleShape',
        text: 'Board Meeting Presentation | {{MEETING_DATE}} ({{QUARTER}})',
      },
    });
  }

  // Create Slide 2: Financial Metrics
  const slide2Id = 'Slide2_Financials';
  requests.push({
    createSlide: {
      objectId: slide2Id,
      insertionIndex: 1,
      slideLayoutReference: { predefinedLayout: 'BLANK' },
    },
  });
  requests.push({
    createShape: {
      objectId: 'Slide2Header',
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: slide2Id,
        size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 50, unit: 'PT' } },
        transform: { scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, translateX: 50, translateY: 40 },
      },
    },
  });
  requests.push({
    insertText: {
      objectId: 'Slide2Header',
      text: 'Executive Summary & Key Financials',
    },
  });
  requests.push({
    createShape: {
      objectId: 'Slide2Body',
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: slide2Id,
        size: { width: { magnitude: 620, unit: 'PT' }, height: { magnitude: 280, unit: 'PT' } },
        transform: { scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, translateX: 50, translateY: 100 },
      },
    },
  });
  requests.push({
    insertText: {
      objectId: 'Slide2Body',
      text: '• Annual Recurring Revenue (ARR): {{ARR_AMOUNT}} ({{ARR_GROWTH}})\n' +
            '• Quarterly Revenue: {{Q3_REVENUE}}\n' +
            '• EBITDA Margin: {{EBITDA_MARGIN}}\n' +
            '• Cash Runway: {{CASH_RUNWAY}}\n' +
            '• Total Team Headcount: {{HEADCOUNT}}\n' +
            '• Customer Net Promoter Score: {{NPS_SCORE}}',
    },
  });

  // Create Slide 3: Executive Highlights & Risks
  const slide3Id = 'Slide3_Highlights';
  requests.push({
    createSlide: {
      objectId: slide3Id,
      insertionIndex: 2,
      slideLayoutReference: { predefinedLayout: 'BLANK' },
    },
  });
  requests.push({
    createShape: {
      objectId: 'Slide3Header',
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: slide3Id,
        size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 50, unit: 'PT' } },
        transform: { scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, translateX: 50, translateY: 40 },
      },
    },
  });
  requests.push({
    insertText: {
      objectId: 'Slide3Header',
      text: 'Strategic Highlights & Key Risks',
    },
  });
  requests.push({
    createShape: {
      objectId: 'Slide3Body',
      shapeType: 'TEXT_BOX',
      elementProperties: {
        pageObjectId: slide3Id,
        size: { width: { magnitude: 620, unit: 'PT' }, height: { magnitude: 280, unit: 'PT' } },
        transform: { scaleX: 1, scaleY: 1, shearX: 0, shearY: 0, translateX: 50, translateY: 100 },
      },
    },
  });
  requests.push({
    insertText: {
      objectId: 'Slide3Body',
      text: 'CEO Key Highlights:\n' +
            '1) {{CEO_HIGHLIGHT_1}}\n' +
            '2) {{CEO_HIGHLIGHT_2}}\n\n' +
            'Key Focus / Risk Area:\n' +
            '• {{KEY_RISK_1}}',
    },
  });

  // Send batchUpdate
  await fetchGoogleApi(`https://slides.googleapis.com/v4/presentations/${presentationId}:batchUpdate`, token, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });

  return {
    id: presentationId,
    name: body.title,
    mimeType: 'application/vnd.google-apps.presentation',
    webViewLink: `https://docs.google.com/presentation/d/${presentationId}/edit`,
  };
}
