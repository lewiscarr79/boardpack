import React from 'react';
import { ArrowRight, CheckCircle2, AlertTriangle, Edit3, Plus, Sparkles } from 'lucide-react';
import { MappingPair } from '../types';

interface PlaceholderMapperProps {
  mappings: MappingPair[];
  onUpdateMappingValue: (index: number, newValue: string) => void;
  onAddCustomMapping: (placeholder: string, value: string) => void;
}

export const PlaceholderMapper: React.FC<PlaceholderMapperProps> = ({
  mappings,
  onUpdateMappingValue,
  onAddCustomMapping,
}) => {
  const [newPlaceholder, setNewPlaceholder] = React.useState('');
  const [newValue, setNewValue] = React.useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaceholder.trim()) {
      let formattedPh = newPlaceholder.trim();
      if (!formattedPh.startsWith('{{') && !formattedPh.startsWith('[')) {
        formattedPh = `{{${formattedPh}}}`;
      }
      onAddCustomMapping(formattedPh, newValue);
      setNewPlaceholder('');
      setNewValue('');
    }
  };

  const matchedCount = mappings.filter(m => m.sheetKeyMatched || m.value).length;
  const missingCount = mappings.length - matchedCount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Field & Placeholder Mapping</h2>
              <p className="text-xs text-slate-500">Verify and customize data replacements before deck generation</p>
            </div>
          </div>
        </div>

        {/* Status Counts */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {matchedCount} Ready
          </span>
          {missingCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              {missingCount} Unmatched
            </span>
          )}
        </div>
      </div>

      {/* Mappings Table */}
      {mappings.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-2.5 px-4">Slide Placeholder</th>
                <th className="py-2.5 px-4">Matched Sheet Field</th>
                <th className="py-2.5 px-4 min-w-[220px]">Replacement Value</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {mappings.map((m, idx) => {
                const isMatched = Boolean(m.sheetKeyMatched || m.value);
                return (
                  <tr key={`${m.placeholder}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    {/* Placeholder Tag */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {m.placeholder}
                      </span>
                    </td>

                    {/* Sheet Field Key */}
                    <td className="py-3 px-4">
                      {m.sheetKeyMatched ? (
                        <span className="font-mono text-slate-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          {m.sheetKeyMatched}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No direct match</span>
                      )}
                    </td>

                    {/* Editable Replacement Value */}
                    <td className="py-2 px-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={m.value}
                          onChange={(e) => onUpdateMappingValue(idx, e.target.value)}
                          placeholder="Enter replacement text..."
                          className="w-full text-xs font-semibold text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-white"
                        />
                        <Edit3 className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-right">
                      {isMatched ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          Empty
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-xs">
          Load a Google Slides template and Google Sheet above to view automatic variable mappings.
        </div>
      )}

      {/* Add Custom Placeholder Mapping Form */}
      <div className="pt-2">
        <form onSubmit={handleAddSubmit} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newPlaceholder}
            onChange={(e) => setNewPlaceholder(e.target.value)}
            placeholder="New Placeholder (e.g. {{DEPARTMENT}})"
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 flex-1 min-w-[160px]"
          />
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Value (e.g. Engineering)"
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-slate-50/50 flex-1 min-w-[160px]"
          />
          <button
            type="submit"
            disabled={!newPlaceholder.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Custom Mapping
          </button>
        </form>
      </div>
    </div>
  );
};
