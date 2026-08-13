import React from 'react';
import { History, ExternalLink, Trash2, X, Presentation, Calendar, ArrowUpRight } from 'lucide-react';
import { GenerationHistoryItem } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  historyItems: GenerationHistoryItem[];
  onClearHistory: () => void;
  onSelectHistoryItem: (item: GenerationHistoryItem) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  historyItems,
  onClearHistory,
  onSelectHistoryItem,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">Generated Decks History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {historyItems.length > 0 ? (
            historyItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-amber-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3
                      onClick={() => {
                        onSelectHistoryItem(item);
                        onClose();
                      }}
                      className="text-xs font-bold text-slate-900 group-hover:text-amber-700 cursor-pointer flex items-center gap-1.5"
                    >
                      <Presentation className="w-4 h-4 text-amber-600 shrink-0" />
                      {item.presentationTitle}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>{item.replacementsCount} replacements</span>
                    </p>
                  </div>

                  <a
                    href={item.presentationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-amber-600 p-1"
                    title="Open in Google Slides"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-0.5">
                  <p className="truncate"><strong className="text-slate-700">Template:</strong> {item.templateTitle}</p>
                  <p className="truncate"><strong className="text-slate-700">Data:</strong> {item.sheetTitle}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              No presentations generated yet.
            </div>
          )}
        </div>

        {/* Footer */}
        {historyItems.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">
              {historyItems.length} Saved Presentation{historyItems.length === 1 ? '' : 's'}
            </span>
            <button
              onClick={onClearHistory}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
