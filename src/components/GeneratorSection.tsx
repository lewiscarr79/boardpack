import React, { useState, useEffect } from 'react';
import { Play, Sparkles, CheckCircle2, AlertCircle, Loader2, Presentation, ArrowRight } from 'lucide-react';
import { SlideTemplateData, ParsedSheetData, MappingPair } from '../types';

interface GeneratorSectionProps {
  templateData: SlideTemplateData | null;
  sheetData: ParsedSheetData | null;
  mappings: MappingPair[];
  isGenerating: boolean;
  onGenerate: (presentationTitle: string) => void;
  isAuthenticated: boolean;
  onLogin: () => void;
}

export const GeneratorSection: React.FC<GeneratorSectionProps> = ({
  templateData,
  sheetData,
  mappings,
  isGenerating,
  onGenerate,
  isAuthenticated,
  onLogin,
}) => {
  const [deckTitle, setDeckTitle] = useState('');

  // Auto-generate a smart default presentation title when template or sheet is loaded
  useEffect(() => {
    if (templateData || sheetData) {
      const company = mappings.find(m => m.rawKey.toLowerCase().includes('company'))?.value || '';
      const meetingDate = mappings.find(m => m.rawKey.toLowerCase().includes('date'))?.value || '';
      const quarter = mappings.find(m => m.rawKey.toLowerCase().includes('quarter'))?.value || '';

      const prefix = company ? `${company} - ` : '';
      const suffix = quarter ? ` (${quarter})` : meetingDate ? ` (${meetingDate})` : '';

      setDeckTitle(`${prefix}Board Meeting Presentation${suffix}`);
    }
  }, [templateData?.title, sheetData?.spreadsheetTitle, mappings.length]);

  const activeMappings = mappings.filter(m => m.value.trim().length > 0);
  const canGenerate = Boolean(templateData && sheetData && activeMappings.length > 0 && deckTitle.trim());

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-slate-800 space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/60 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              4
            </span>
            <h2 className="text-lg font-bold text-white">Generate Final Presentation Deck</h2>
          </div>
          <p className="text-xs text-slate-300">
            Copies the template in Drive and updates all placeholders with Google Sheets data in seconds
          </p>
        </div>

        {/* Action Button */}
        <div>
          {!isAuthenticated ? (
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Sparkles className="w-4 h-4 text-slate-900" />
              Connect Google Account to Generate
            </button>
          ) : (
            <button
              onClick={() => onGenerate(deckTitle)}
              disabled={!canGenerate || isGenerating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 disabled:opacity-50 shadow-xl shadow-amber-500/20 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Presentation in Drive...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Generate Google Slides Presentation
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Presentation Name Input */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-200">
          New Google Slides Presentation Title:
        </label>
        <input
          type="text"
          value={deckTitle}
          onChange={(e) => setDeckTitle(e.target.value)}
          placeholder="e.g. Acme Corp - Q3 2026 Board Meeting Deck"
          className="w-full text-xs font-medium px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
        />
      </div>

      {/* Pre-flight Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
        {/* Step 1 Status */}
        <div className={`p-3 rounded-xl border ${templateData ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
          <div className="flex items-center gap-2 font-semibold mb-1">
            {templateData ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />}
            1. Slide Template
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {templateData ? templateData.title : 'No template loaded'}
          </p>
        </div>

        {/* Step 2 Status */}
        <div className={`p-3 rounded-xl border ${sheetData ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
          <div className="flex items-center gap-2 font-semibold mb-1">
            {sheetData ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />}
            2. Sheet Data
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {sheetData ? sheetData.spreadsheetTitle : 'No sheet loaded'}
          </p>
        </div>

        {/* Step 3 Status */}
        <div className={`p-3 rounded-xl border ${activeMappings.length > 0 ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
          <div className="flex items-center gap-2 font-semibold mb-1">
            {activeMappings.length > 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />}
            3. Active Replacements
          </div>
          <p className="text-[11px] text-slate-400 truncate">
            {activeMappings.length} keys ready to populate
          </p>
        </div>
      </div>
    </div>
  );
};
