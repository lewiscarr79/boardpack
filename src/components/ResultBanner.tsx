import React, { useState } from 'react';
import { ExternalLink, CheckCircle2, Sparkles, Presentation, FileSpreadsheet, Tag, Copy, Eye } from 'lucide-react';
import { GenerationHistoryItem } from '../types';

interface ResultBannerProps {
  item: GenerationHistoryItem;
  onClose?: () => void;
}

export const ResultBanner: React.FC<ResultBannerProps> = ({ item, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(item.presentationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-emerald-500/80 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-100 rounded-full blur-3xl opacity-60 pointer-events-none" />

      {/* Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Presentation Created
              </span>
              <span className="text-xs text-slate-400">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              {item.presentationTitle}
            </h2>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied Link!' : 'Copy Link'}
          </button>

          <a
            href={item.presentationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-all"
          >
            Open in Google Slides
            <ExternalLink className="w-4 h-4 text-amber-400" />
          </a>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-emerald-600" /> Total Tag Occurrences
          </p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">
            {item.replacementsCount} Replacements Made
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Presentation className="w-3.5 h-3.5 text-amber-600" /> Master Template
          </p>
          <p className="text-xs font-bold text-slate-800 mt-1 truncate">
            {item.templateTitle}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" /> Data Source
          </p>
          <p className="text-xs font-bold text-slate-800 mt-1 truncate">
            {item.sheetTitle}
          </p>
        </div>
      </div>

      {/* Toggle Embed Preview */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4 text-amber-600" />
            {showPreview ? 'Hide Embedded Deck Preview' : 'Show Embedded Deck Preview'}
          </button>
          <span className="text-[11px] text-slate-400">Interactive Google Slides View</span>
        </div>

        {showPreview && (
          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video max-h-[420px] shadow-inner">
            <iframe
              src={`https://docs.google.com/presentation/d/${item.presentationId}/embed?start=false&loop=false&delayms=3000`}
              title="Generated Google Slides Deck"
              className="w-full h-full border-0"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* Replaced Keys Pills */}
      {item.replacedKeys && item.replacedKeys.length > 0 && (
        <div className="pt-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Populated Variables ({item.replacedKeys.length}):
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {item.replacedKeys.map((k) => (
              <span
                key={k}
                className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
