import React, { useState } from 'react';
import { FileSpreadsheet, FolderOpen, ExternalLink, CheckCircle2, Search, Table, Sparkles, Loader2 } from 'lucide-react';
import { ParsedSheetData } from '../types';

interface SheetSelectorProps {
  sheetData: ParsedSheetData | null;
  isLoading: boolean;
  error: string | null;
  onSelectSheet: (urlOrId: string) => void;
  onSheetTabChange: (tabName: string) => void;
  onRowIndexChange: (index: number) => void;
  onOpenDrivePicker: () => void;
  onCreateSampleSheet: () => void;
  isCreatingSample: boolean;
  isAuthenticated: boolean;
}

export const SheetSelector: React.FC<SheetSelectorProps> = ({
  sheetData,
  isLoading,
  error,
  onSelectSheet,
  onSheetTabChange,
  onRowIndexChange,
  onOpenDrivePicker,
  onCreateSampleSheet,
  isCreatingSample,
  isAuthenticated,
}) => {
  const [inputUrl, setInputUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onSelectSheet(inputUrl.trim());
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between transition-all">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Google Sheet Data Source</h2>
              <p className="text-xs text-slate-500">Spreadsheet with meeting values</p>
            </div>
          </div>

          {sheetData && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Sheet Loaded
            </span>
          )}
        </div>

        {/* Input Form & Drive Actions */}
        <form onSubmit={handleSubmit} className="mb-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Paste Google Sheet Link or File ID..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50/50"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <button
              type="submit"
              disabled={isLoading || !inputUrl.trim()}
              className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={onOpenDrivePicker}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
              Pick from Drive
            </button>

            <button
              type="button"
              onClick={onCreateSampleSheet}
              disabled={isCreatingSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isCreatingSample ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              )}
              Create Sample Data Sheet in Drive
            </button>
          </div>
        </form>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Loaded Sheet Metadata & Data Selector */}
        {sheetData && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  {sheetData.spreadsheetTitle}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>{sheetData.fields.length} Data Fields Extracted</span>
                  <span>•</span>
                  <span className="capitalize">{sheetData.fields[0]?.sourceType || 'key-value'} layout</span>
                </p>
              </div>

              <a
                href={`https://docs.google.com/spreadsheets/d/${sheetData.spreadsheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                title="Open in Google Sheets"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Tab Selection */}
            {sheetData.sheets.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-semibold text-slate-600">Sheet Tab:</label>
                <select
                  value={sheetData.selectedSheet}
                  onChange={(e) => onSheetTabChange(e.target.value)}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {sheetData.sheets.map((tab) => (
                    <option key={tab} value={tab}>
                      {tab}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Row Selection if Table Format */}
            {sheetData.rawRows.length > 2 && sheetData.fields[0]?.sourceType === 'table-column' && (
              <div className="flex items-center gap-2 pt-1">
                <label className="text-[11px] font-semibold text-slate-600">Select Row:</label>
                <select
                  value={sheetData.selectedRowIndex}
                  onChange={(e) => onRowIndexChange(Number(e.target.value))}
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-xs truncate"
                >
                  {sheetData.rawRows.slice(1).map((row, idx) => (
                    <option key={idx} value={idx}>
                      Row {idx + 1}: {row.slice(0, 2).filter(Boolean).join(' - ') || `Meeting ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Data Preview Pills */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <Table className="w-3 h-3" /> Extracted Field Preview
              </p>
              <div className="max-h-28 overflow-y-auto pr-1 space-y-1">
                {sheetData.fields.slice(0, 8).map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center justify-between text-[11px] bg-white px-2.5 py-1 rounded-md border border-slate-200"
                  >
                    <span className="font-mono font-medium text-slate-700 truncate max-w-[140px]">
                      {f.key}
                    </span>
                    <span className="text-slate-900 font-semibold truncate max-w-[180px]">
                      {f.value || <span className="text-slate-300 italic">empty</span>}
                    </span>
                  </div>
                ))}
                {sheetData.fields.length > 8 && (
                  <p className="text-[10px] text-slate-400 text-center pt-1 font-medium">
                    + {sheetData.fields.length - 8} more fields
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {!sheetData && !isLoading && (
        <div className="mt-4 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
          <p className="text-xs text-slate-500">
            Enter a Google Sheet URL or click <strong>Create Sample Data Sheet</strong> to generate test meeting data.
          </p>
        </div>
      )}
    </div>
  );
};
