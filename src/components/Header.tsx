import React, { useState } from 'react';
import { Presentation, CheckCircle2, AlertCircle, Key, LogOut, History, Sparkles } from 'lucide-react';

interface HeaderProps {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onManualTokenSubmit: (token: string) => void;
  onOpenHistory: () => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isAuthenticated,
  onLogin,
  onLogout,
  onManualTokenSubmit,
  onOpenHistory,
  historyCount,
}) => {
  const [showManualTokenModal, setShowManualTokenModal] = useState(false);
  const [manualToken, setManualToken] = useState('');

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualToken.trim()) {
      onManualTokenSubmit(manualToken.trim());
      setShowManualTokenModal(false);
      setManualToken('');
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-snug flex items-center gap-2">
              Board Deck Automation
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Sheets to Slides
              </span>
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Generate consistent board meeting presentations from Google Sheets templates
            </p>
          </div>
        </div>

        {/* Right Actions & Auth Status */}
        <div className="flex items-center gap-3">
          {/* Recent History Button */}
          <button
            onClick={onOpenHistory}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Recent Decks</span>
            {historyCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-200 font-bold text-slate-800 text-[10px]">
                {historyCount}
              </span>
            )}
          </button>

          {/* Auth Connection Pill */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="hidden md:inline">Google Connected</span>
              <button
                onClick={onLogout}
                title="Disconnect Google Account"
                className="ml-1 text-emerald-700 hover:text-emerald-900 p-0.5 rounded hover:bg-emerald-100"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onLogin}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all hover:shadow cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Connect Google Account
              </button>

              <button
                onClick={() => setShowManualTokenModal(true)}
                title="Enter access token directly"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs"
              >
                <Key className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Manual Token Modal */}
      {showManualTokenModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-500" />
              Enter Google Access Token
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              If OAuth popup is blocked by iframe browser constraints, you can paste an authorized OAuth access token directly.
            </p>
            <form onSubmit={handleManualSubmit}>
              <textarea
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="ya29.a0A..."
                rows={3}
                className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 mb-4"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualTokenModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  Set Access Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
