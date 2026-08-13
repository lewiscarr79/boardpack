import React, { useState } from 'react';
import { Presentation, FolderOpen, PlusCircle, ExternalLink, CheckCircle2, Search, Layers, Tag, Loader2, Sparkles } from 'lucide-react';
import { SlideTemplateData } from '../types';

interface TemplateSelectorProps {
  templateData: SlideTemplateData | null;
  isLoading: boolean;
  error: string | null;
  onSelectTemplate: (urlOrId: string) => void;
  onOpenDrivePicker: () => void;
  onCreateSampleTemplate: () => void;
  isCreatingSample: boolean;
  isAuthenticated: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templateData,
  isLoading,
  error,
  onSelectTemplate,
  onOpenDrivePicker,
  onCreateSampleTemplate,
  isCreatingSample,
  isAuthenticated,
}) => {
  const [inputUrl, setInputUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      onSelectTemplate(inputUrl.trim());
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col justify-between transition-all">
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Google Slides Template</h2>
              <p className="text-xs text-slate-500">Master presentation with placeholders</p>
            </div>
          </div>

          {templateData && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
              Template Loaded
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
                placeholder="Paste Google Slides Link or File ID..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-slate-50/50"
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
              <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
              Pick from Drive
            </button>

            <button
              type="button"
              onClick={onCreateSampleTemplate}
              disabled={isCreatingSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isCreatingSample ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              )}
              Create Sample Master Deck in Drive
            </button>
          </div>
        </form>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Loaded Template Metadata & Placeholders Preview */}
        {templateData && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Presentation className="w-4 h-4 text-amber-600" />
                  {templateData.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>{templateData.slideCount} Slides</span>
                  <span>•</span>
                  <span>{templateData.placeholders.length} Placeholders Detected</span>
                </p>
              </div>

              <a
                href={`https://docs.google.com/presentation/d/${templateData.presentationId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-amber-600 transition-colors p-1"
                title="Open in Google Slides"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Placeholders Pills */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Detected Placeholders
              </p>
              {templateData.placeholders.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {templateData.placeholders.map((ph) => (
                    <span
                      key={ph}
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-white text-slate-700 border border-slate-200 font-medium"
                    >
                      {ph}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  No placeholders (e.g. &#123;&#123;KEY&#125;&#125; or [KEY]) detected in this deck yet. You can still map custom keys below.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {!templateData && !isLoading && (
        <div className="mt-4 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
          <p className="text-xs text-slate-500">
            Enter a Google Slides presentation URL or click <strong>Create Sample Master Deck</strong> to generate one instantly in your Drive.
          </p>
        </div>
      )}
    </div>
  );
};
