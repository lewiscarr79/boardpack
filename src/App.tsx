import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { Header } from './components/Header';
import { TemplateSelector } from './components/TemplateSelector';
import { SheetSelector } from './components/SheetSelector';
import { PlaceholderMapper } from './components/PlaceholderMapper';
import { GeneratorSection } from './components/GeneratorSection';
import { ResultBanner } from './components/ResultBanner';
import { HistoryDrawer } from './components/HistoryDrawer';
import { openGoogleDrivePicker } from './services/googlePicker';
import {
  extractFileId,
  fetchSlideTemplate,
  fetchSheetData,
  buildPlaceholderMappings,
  copyPresentationFile,
  executeBatchReplaceInPresentation,
  createSampleBoardSheetInDrive,
  createSampleBoardSlideTemplateInDrive,
} from './services/googleApi';
import {
  SlideTemplateData,
  ParsedSheetData,
  MappingPair,
  GenerationHistoryItem,
} from './types';
import { Sparkles, FileSpreadsheet, Presentation, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

export default function App() {
  const {
    accessToken,
    isAuthenticated,
    isLoading: isAuthLoading,
    error: authError,
    login,
    logout,
    setToken,
  } = useGoogleAuth();

  // Template State
  const [templateData, setTemplateData] = useState<SlideTemplateData | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [isCreatingSampleTemplate, setIsCreatingSampleTemplate] = useState(false);

  // Sheet State
  const [sheetData, setSheetData] = useState<ParsedSheetData | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [isCreatingSampleSheet, setIsCreatingSampleSheet] = useState(false);

  // Mappings State
  const [mappings, setMappings] = useState<MappingPair[]>([]);

  // Generation & Results State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [activeResult, setActiveResult] = useState<GenerationHistoryItem | null>(null);

  // History Drawer State
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<GenerationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('deck_generation_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveHistoryItem = useCallback((item: GenerationHistoryItem) => {
    setHistoryItems((prev) => {
      const updated = [item, ...prev.filter((i) => i.id !== item.id)].slice(0, 20);
      localStorage.setItem('deck_generation_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('deck_generation_history');
    setHistoryItems([]);
  };

  // 1. Handle Template Selection
  const loadTemplate = useCallback(
    async (urlOrId: string) => {
      if (!accessToken) {
        setTemplateError('Please connect your Google Account first.');
        return;
      }

      const fileId = extractFileId(urlOrId);
      if (!fileId) {
        setTemplateError('Invalid Google Slides link or ID. Please check the URL.');
        return;
      }

      setTemplateLoading(true);
      setTemplateError(null);

      try {
        const data = await fetchSlideTemplate(fileId, accessToken);
        setTemplateData(data);
      } catch (err: any) {
        console.error('Error loading presentation template:', err);
        setTemplateError(err.message || 'Failed to load Google Slides template. Ensure the link is shared with your account.');
      } finally {
        setTemplateLoading(false);
      }
    },
    [accessToken]
  );

  // 2. Handle Sheet Selection
  const loadSheet = useCallback(
    async (urlOrId: string, sheetName?: string, rowIndex = 0) => {
      if (!accessToken) {
        setSheetError('Please connect your Google Account first.');
        return;
      }

      const fileId = extractFileId(urlOrId);
      if (!fileId) {
        setSheetError('Invalid Google Sheet link or ID. Please check the URL.');
        return;
      }

      setSheetLoading(true);
      setSheetError(null);

      try {
        const data = await fetchSheetData(fileId, accessToken, sheetName, rowIndex);
        setSheetData(data);
      } catch (err: any) {
        console.error('Error loading sheet data:', err);
        setSheetError(err.message || 'Failed to load Google Sheet. Ensure the link is shared with your account.');
      } finally {
        setSheetLoading(false);
      }
    },
    [accessToken]
  );

  // Auto-recalculate mappings when template or sheet changes
  useEffect(() => {
    if (templateData && sheetData) {
      const autoPairs = buildPlaceholderMappings(templateData.placeholders, sheetData.fields);
      setMappings(autoPairs);
    } else if (templateData) {
      const templateOnlyPairs = templateData.placeholders.map((ph) => ({
        placeholder: ph,
        rawKey: ph.replace(/[\{\}\[\]]/g, '').trim(),
        sheetKeyMatched: null,
        value: '',
      }));
      setMappings(templateOnlyPairs);
    }
  }, [templateData, sheetData]);

  // Handle Sheet tab change
  const handleSheetTabChange = (tabName: string) => {
    if (sheetData) {
      loadSheet(sheetData.spreadsheetId, tabName, 0);
    }
  };

  // Handle Sheet row index change
  const handleRowIndexChange = (rowIndex: number) => {
    if (sheetData) {
      loadSheet(sheetData.spreadsheetId, sheetData.selectedSheet, rowIndex);
    }
  };

  const pendingActionRef = useRef<'sample_template' | 'sample_sheet' | 'drive_template' | 'drive_sheet' | null>(null);

  // Auto-run pending action once login completes
  useEffect(() => {
    if (isAuthenticated && accessToken && pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      if (action === 'sample_template') {
        handleCreateSampleTemplate();
      } else if (action === 'sample_sheet') {
        handleCreateSampleSheet();
      } else if (action === 'drive_template') {
        handleOpenTemplateDrivePicker();
      } else if (action === 'drive_sheet') {
        handleOpenSheetDrivePicker();
      }
    }
  }, [isAuthenticated, accessToken]);

  // 3. Drive Picker Triggers
  const handleOpenTemplateDrivePicker = () => {
    if (!accessToken) {
      pendingActionRef.current = 'drive_template';
      login();
      return;
    }
    openGoogleDrivePicker({
      accessToken,
      mimeType: 'presentation',
      title: 'Select Master Google Slides Template',
      onSelect: (file) => {
        loadTemplate(file.id);
      },
    });
  };

  const handleOpenSheetDrivePicker = () => {
    if (!accessToken) {
      pendingActionRef.current = 'drive_sheet';
      login();
      return;
    }
    openGoogleDrivePicker({
      accessToken,
      mimeType: 'spreadsheet',
      title: 'Select Google Sheet Meeting Data Source',
      onSelect: (file) => {
        loadSheet(file.id);
      },
    });
  };

  // 4. Sample Creator Triggers
  const handleCreateSampleTemplate = async () => {
    if (!accessToken) {
      pendingActionRef.current = 'sample_template';
      login();
      return;
    }
    setIsCreatingSampleTemplate(true);
    setTemplateError(null);
    try {
      const created = await createSampleBoardSlideTemplateInDrive(accessToken);
      await loadTemplate(created.id);
    } catch (err: any) {
      console.error('Failed to create sample master slide deck:', err);
      setTemplateError(err.message || 'Failed to create sample master presentation in Drive.');
    } finally {
      setIsCreatingSampleTemplate(false);
    }
  };

  const handleCreateSampleSheet = async () => {
    if (!accessToken) {
      pendingActionRef.current = 'sample_sheet';
      login();
      return;
    }
    setIsCreatingSampleSheet(true);
    setSheetError(null);
    try {
      const created = await createSampleBoardSheetInDrive(accessToken);
      await loadSheet(created.id);
    } catch (err: any) {
      console.error('Failed to create sample board data sheet:', err);
      setSheetError(err.message || 'Failed to create sample data sheet in Drive.');
    } finally {
      setIsCreatingSampleSheet(false);
    }
  };

  // 5. Update Mapping Pair Value
  const handleUpdateMappingValue = (index: number, newValue: string) => {
    setMappings((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = {
          ...copy[index],
          value: newValue,
          isCustomOverride: true,
        };
      }
      return copy;
    });
  };

  const handleAddCustomMapping = (placeholder: string, value: string) => {
    setMappings((prev) => [
      ...prev,
      {
        placeholder,
        rawKey: placeholder.replace(/[\{\}\[\]]/g, '').trim(),
        sheetKeyMatched: null,
        value,
        isCustomOverride: true,
      },
    ]);
  };

  // 6. Generate Presentation
  const handleGenerate = async (presentationTitle: string) => {
    if (!accessToken || !templateData || !sheetData) return;

    setIsGenerating(true);
    setGenerationError(null);

    try {
      // Step A: Copy template in Drive
      const copiedFile = await copyPresentationFile(
        templateData.presentationId,
        presentationTitle,
        accessToken
      );

      // Step B: Replace all placeholders in copied file
      const activeMappings = mappings.filter((m) => m.placeholder && m.value.trim().length > 0);
      const replaceResult = await executeBatchReplaceInPresentation(
        copiedFile.id,
        activeMappings,
        accessToken
      );

      // Step C: Save Result
      const resultItem: GenerationHistoryItem = {
        id: copiedFile.id,
        timestamp: new Date().toISOString(),
        presentationId: copiedFile.id,
        presentationTitle: copiedFile.name,
        presentationUrl: copiedFile.webViewLink,
        templateId: templateData.presentationId,
        templateTitle: templateData.title,
        sheetId: sheetData.spreadsheetId,
        sheetTitle: sheetData.spreadsheetTitle,
        replacementsCount: replaceResult.totalReplacements,
        replacedKeys: activeMappings.map((m) => `${m.placeholder} → "${m.value}"`),
      };

      saveHistoryItem(resultItem);
      setActiveResult(resultItem);

      // Scroll smoothly to result banner
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error generating presentation deck:', err);
      setGenerationError(err.message || 'An error occurred while populating the Google Slides template.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Bar Header */}
      <Header
        isAuthenticated={isAuthenticated}
        onLogin={login}
        onLogout={logout}
        onManualTokenSubmit={(token) => setToken(token)}
        onOpenHistory={() => setHistoryOpen(true)}
        historyCount={historyItems.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Auth Error Warning if needed */}
        {authError && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{authError}</span>
            </div>
            <button
              onClick={login}
              className="px-3 py-1 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-colors"
            >
              Try Connecting Again
            </button>
          </div>
        )}

        {/* Generated Result Banner (Shows at top when generated) */}
        {activeResult && (
          <div className="animate-in fade-in slide-in-from-top duration-300">
            <ResultBanner item={activeResult} onClose={() => setActiveResult(null)} />
          </div>
        )}

        {/* Generation Error Alert */}
        {generationError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
            <strong>Generation Failed:</strong> {generationError}
          </div>
        )}

        {/* Hero Step Overview banner for first-time users */}
        {!isAuthenticated && !templateData && !sheetData && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-lg border border-slate-800 relative overflow-hidden">
            <div className="max-w-3xl space-y-3 relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                <Sparkles className="w-3 h-3 text-amber-400" /> Automated Board Reporting
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Generate consistent, perfectly formatted board decks in one click
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Connect your Google Account to select a Google Slides template deck and populated Google Sheet. The app copies the template and replaces placeholders (e.g. <code className="text-amber-300">&#123;&#123;ARR_AMOUNT&#125;&#125;</code>, <code className="text-amber-300">&#123;&#123;EBITDA_MARGIN&#125;&#125;</code>) with updated spreadsheet values instantly.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={login}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-900" />
                  Connect Google Workspace
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1 & 2 Inputs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TemplateSelector
            templateData={templateData}
            isLoading={templateLoading}
            error={templateError}
            onSelectTemplate={loadTemplate}
            onOpenDrivePicker={handleOpenTemplateDrivePicker}
            onCreateSampleTemplate={handleCreateSampleTemplate}
            isCreatingSample={isCreatingSampleTemplate}
            isAuthenticated={isAuthenticated}
          />

          <SheetSelector
            sheetData={sheetData}
            isLoading={sheetLoading}
            error={sheetError}
            onSelectSheet={(url) => loadSheet(url)}
            onSheetTabChange={handleSheetTabChange}
            onRowIndexChange={handleRowIndexChange}
            onOpenDrivePicker={handleOpenSheetDrivePicker}
            onCreateSampleSheet={handleCreateSampleSheet}
            isCreatingSample={isCreatingSampleSheet}
            isAuthenticated={isAuthenticated}
          />
        </div>

        {/* Step 3: Field Mapping & Override Table */}
        <PlaceholderMapper
          mappings={mappings}
          onUpdateMappingValue={handleUpdateMappingValue}
          onAddCustomMapping={handleAddCustomMapping}
        />

        {/* Step 4: Generation Action */}
        <GeneratorSection
          templateData={templateData}
          sheetData={sheetData}
          mappings={mappings}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
          isAuthenticated={isAuthenticated}
          onLogin={login}
        />
      </main>

      {/* History Drawer */}
      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        historyItems={historyItems}
        onClearHistory={clearHistory}
        onSelectHistoryItem={(item) => setActiveResult(item)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          Board Presentation Generator • Built with Google Workspace APIs (Google Sheets & Google Slides)
        </div>
      </footer>
    </div>
  );
}
