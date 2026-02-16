import React, { useState, useEffect } from 'react';
import { Search, Globe, ChevronRight, Sparkles, X, Loader2, Command } from 'lucide-react';
import { performSmartSearch } from '../services/geminiService';
import { SearchResult } from '../types';

interface SmartSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmartSearch: React.FC<SmartSearchProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'local' | 'web'>('local'); // Toggle between local app search and web/AI search

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (mode === 'web') {
      setIsLoading(true);
      setResult(null);
      const data = await performSmartSearch(query);
      setResult(data);
      setIsLoading(false);
    } else {
        // Mock local search behavior
        setResult({
            text: `Found 3 local results for "${query}" in Anchors and Logs.`,
            sources: []
        });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#1f1e1d]/40 backdrop-blur-sm z-50 flex items-start justify-center pt-[10vh]">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-[#e0e0dc] animate-in fade-in zoom-in-95 duration-200">
        {/* Search Input Area */}
        <div className="p-4 border-b border-[#f1f0ee] flex items-center gap-4">
          <Search className="text-[#8c8b88]" size={22} />
          <form onSubmit={handleSearch} className="flex-1">
             <input 
                autoFocus
                type="text" 
                placeholder={mode === 'web' ? "Ask the web about blockchain trends, docs, or protocols..." : "Search request_id, txHash, or submitter..."}
                className="w-full text-lg outline-none text-[#1f1e1d] placeholder-[#a8a29e] bg-transparent"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
             />
          </form>
          
          <div className="flex bg-[#fbfbfa] border border-[#e0e0dc] rounded-lg p-1 gap-1">
             <button 
                onClick={() => setMode('local')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    mode === 'local' 
                    ? 'bg-white shadow-sm text-[#1f1e1d] border border-[#e0e0dc]' 
                    : 'text-[#8c8b88] hover:text-[#5d5c58]'
                }`}
             >
                Console
             </button>
             <button 
                 onClick={() => setMode('web')}
                 className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                    mode === 'web' 
                    ? 'bg-[#BE3F2F]/5 text-[#BE3F2F] shadow-sm border border-[#BE3F2F]/20' 
                    : 'text-[#8c8b88] hover:text-[#5d5c58]'
                 }`}
             >
                <Sparkles size={12} />
                Smart Web
             </button>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-[#fbfbfa] rounded-md text-[#8c8b88] hover:text-[#1f1e1d] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#fbfbfa] min-h-[300px]">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center h-full text-[#8c8b88] gap-4">
                <Loader2 size={32} className="animate-spin text-[#BE3F2F]" />
                <p className="text-sm font-medium">Consulting Gemini Grounding...</p>
             </div>
          ) : result ? (
             <div className="space-y-6 animate-in fade-in duration-300">
                {mode === 'web' && (
                    <div className="flex items-center gap-2 text-[#BE3F2F] mb-3 p-3 bg-[#BE3F2F]/5 rounded-lg border border-[#BE3F2F]/10">
                        <Sparkles size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">AI Generated Answer</span>
                    </div>
                )}
                
                <div className="prose prose-sm max-w-none text-[#1f1e1d] leading-relaxed">
                    {result.text}
                </div>

                {result.sources.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-[#e0e0dc]">
                        <h4 className="text-[10px] font-bold text-[#8c8b88] uppercase tracking-widest mb-4">Sources & References</h4>
                        <div className="grid grid-cols-1 gap-3">
                            {result.sources.map((source, idx) => (
                                <a 
                                    key={idx} 
                                    href={source.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-3 p-3 bg-white rounded-lg border border-[#e0e0dc] hover:border-[#BE3F2F]/40 hover:shadow-sm transition-all group"
                                >
                                    <div className="mt-1 bg-[#f4f2f0] p-1.5 rounded text-[#5d5c58] group-hover:text-[#BE3F2F] group-hover:bg-[#BE3F2F]/5 transition-colors">
                                        <Globe size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-[#1f1e1d] truncate group-hover:text-[#BE3F2F] transition-colors">{source.title}</div>
                                        <div className="text-xs text-[#8c8b88] truncate mt-0.5">{source.uri}</div>
                                    </div>
                                    <ChevronRight size={16} className="text-[#d6d3d0] group-hover:text-[#BE3F2F] mt-2 transition-colors" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
             </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[#8c8b88] gap-6">
                <div className="w-16 h-16 bg-[#f1f0ee] rounded-full flex items-center justify-center text-[#d6d3d0]">
                    <Command size={32} strokeWidth={1.5} />
                </div>
                <div className="text-center">
                    <p className="text-lg font-light text-[#1f1e1d]">Type to search...</p>
                    <p className="text-xs mt-1 text-[#8c8b88]">Use <strong className="font-medium">Smart Web</strong> for AI-powered research</p>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                    <button onClick={() => { setQuery("latest ethereum block height"); setMode('web'); }} className="px-3 py-1.5 bg-white border border-[#e0e0dc] rounded-full text-xs text-[#5d5c58] hover:border-[#BE3F2F] hover:text-[#BE3F2F] transition-colors shadow-sm">
                        Latest Ethereum Block
                    </button>
                    <button onClick={() => { setQuery("req-12345"); setMode('local'); }} className="px-3 py-1.5 bg-white border border-[#e0e0dc] rounded-full text-xs text-[#5d5c58] hover:border-[#BE3F2F] hover:text-[#BE3F2F] transition-colors shadow-sm">
                        req-12345
                    </button>
                    <button onClick={() => { setQuery("Anchor protocol documentation"); setMode('web'); }} className="px-3 py-1.5 bg-white border border-[#e0e0dc] rounded-full text-xs text-[#5d5c58] hover:border-[#BE3F2F] hover:text-[#BE3F2F] transition-colors shadow-sm">
                        Docs: Protocol
                    </button>
                </div>
            </div>
          )}
        </div>
        
        <div className="p-2.5 bg-white border-t border-[#f1f0ee] text-[10px] text-center text-[#8c8b88] flex items-center justify-center gap-4">
            <span><kbd className="px-1.5 py-0.5 rounded bg-[#fbfbfa] border border-[#e0e0dc] font-sans mx-1">ESC</kbd> to close</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[#fbfbfa] border border-[#e0e0dc] font-sans mx-1">↵</kbd> to select</span>
        </div>
      </div>
    </div>
  );
};