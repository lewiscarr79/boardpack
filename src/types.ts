export interface AuthState {
  accessToken: string | null;
  expiresAt: number | null;
  userEmail?: string;
}

export interface GoogleFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  iconLink?: string;
  modifiedTime?: string;
}

export interface SheetField {
  key: string;
  value: string;
  sourceType: 'key-value' | 'table-column';
}

export interface ParsedSheetData {
  spreadsheetId: string;
  spreadsheetTitle: string;
  sheets: string[];
  selectedSheet: string;
  fields: SheetField[];
  rawHeaders: string[];
  rawRows: string[][];
  selectedRowIndex: number;
}

export interface SlideTemplateData {
  presentationId: string;
  title: string;
  placeholders: string[];
  slideCount: number;
  slidesSummary: Array<{
    slideId: string;
    slideIndex: number;
    titleSnippet?: string;
    placeholdersFound: string[];
  }>;
}

export interface MappingPair {
  placeholder: string; // e.g. "{{COMPANY_NAME}}"
  rawKey: string;      // e.g. "COMPANY_NAME"
  sheetKeyMatched: string | null; // e.g. "COMPANY_NAME"
  value: string;
  isCustomOverride?: boolean;
}

export interface GenerationHistoryItem {
  id: string;
  timestamp: string;
  presentationId: string;
  presentationTitle: string;
  presentationUrl: string;
  templateId: string;
  templateTitle: string;
  sheetId: string;
  sheetTitle: string;
  replacementsCount: number;
  replacedKeys: string[];
}
