import React, { useState, useEffect } from 'react';
import { Search, Filter, RefreshCw, MoreVertical, X, Check, ExternalLink, FileText, Download, Loader2 } from 'lucide-react';
import { Anchor, Status } from '../types';
import { Badge } from './ui/Badge';
import { Toast } from './ui/Toast';
import { Modal } from './ui/Modal';
import { fetchWithRetry } from '../utils/api';

// Button Styles reused for consistency
const btnPrimary = "px-4 py-2 bg-[#BE3F2F] text-white text-sm font-medium rounded shadow-sm hover:bg-[#a33224] transition-colors";
const btnSecondary = "px-4 py-2 bg-white border border-[#d6d3d0] text-[#5d5c58] text-sm font-medium rounded hover:bg-[#fbfbfa] transition-colors";
const formInputClass = "w-full bg-[#fcfbf9] border border-[#d6d3d0] rounded px-3 py-2.5 text-sm text-[#1f1e1d] placeholder-[#a8a29e] focus:outline-none focus:ring-1 focus:ring-[#BE3F2F] focus:border-[#BE3F2F] transition-all shadow-inner";

export const Anchors: React.FC = () => {
  // Real data state
  const [anchors, setAnchors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnchor, setSelectedAnchor] = useState<any | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  
  // Submit Anchor Modal State
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [submitData, setSubmitData] = useState({ events: '', submitter: 'admin-console' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter & Refresh Logic
  const [filterQuery, setFilterQuery] = useState('');

  // Fetch real data from the NestJS Query Service
//   const fetchAnchors = async () => {
//     try {
//       setIsLoading(true);
//       const token = localStorage.getItem("access_token");
//       if (!token) throw new Error("No auth token");

//       const response = await fetchWithRetry("/query/anchors", {
//         method: "GET",
//         headers: { "Authorization": `Bearer ${token}` }
//       });
//       const data = await response.json();
//       setAnchors(data.items || []);
//     } catch (err: any) {
//       console.error(err);
//       setToast("Failed to load anchors from database");
//     } finally {
//       setIsLoading(false);
//     }
//   };

  // Add 'silent' parameter to prevent the giant overlay from flashing
  const fetchAnchors = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true); // Only show overlay if NOT silent
      
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No auth token");

      const response = await fetchWithRetry("/query/anchors", {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      setAnchors(data.items || []);

      // Keep the side drawer updated if a transaction finishes!
    //   if (selectedAnchor) {
    //      const updatedSelected = (data.items || []).find((a: any) => a.requestId === selectedAnchor.requestId);
    //      if (updatedSelected) setSelectedAnchor(updatedSelected);
    //   }
    if (selectedAnchor) {
         const updatedSelected = (data.items || []).find((a: any) => a.requestId === selectedAnchor.requestId);
         if (updatedSelected) {
             // Update status and blockchain info, but PROTECT our hydrated JSON!
             setSelectedAnchor((prev: any) => ({
                 ...updatedSelected,
                 eventsJson: prev?.eventsJson || updatedSelected.eventsJson
             }));
         }
      }
      
    } catch (err: any) {
      console.error(err);
      if (!silent) setToast("Failed to load anchors from database");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Set up the polling interval
  // 1. INITIAL PAGE LOAD (Runs exactly once, shows the spinner)
  useEffect(() => {
    fetchAnchors(false);
  }, []);

  // 2. BACKGROUND POLLING (Silent, re-binds safely if selectedAnchor changes)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnchors(true); 
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedAnchor]);

  // Load data on mount
  useEffect(() => {
    fetchAnchors();
  }, []);

  const handleSelectAnchor = async (anchor: any) => {
      // 1. Set shallow data immediately for a snappy UI
      setSelectedAnchor(anchor); 
      
      try {
          const token = localStorage.getItem("access_token");
          if (!token) return;

          // 2. Fetch the deep, hydrated data from MinIO!
          const response = await fetchWithRetry(`/query/anchors/${anchor.requestId}`, {
              method: "GET",
              headers: { "Authorization": `Bearer ${token}` }
          });
          
          const data = await response.json();
          if (data.item) {
              // 3. Overwrite the drawer with the fully populated JSON payload
              setSelectedAnchor(data.item); 
          }
      } catch (err) {
          console.error("Failed to fetch deep anchor data", err);
      }
  };

  const handleRefresh = () => {
    fetchAnchors();
    setToast("Anchors list refreshed from backend");
  };

  const handleFilter = () => {
      setToast(filterQuery ? `Filter applied: "${filterQuery}"` : "Filter cleared");
  };

  const handleSubmitAnchor = async () => {
      if (!submitData.events) return;
      setIsSubmitting(true);
      
      try {
          // 1. Grab the token you saved during Login
          const token = localStorage.getItem("access_token");
          if (!token) throw new Error("No auth token found. Please log in again.");

          // Optional: Validate that the input is actually a JSON array before sending
          try {
              JSON.parse(submitData.events);
          } catch (e) {
              throw new Error("Events payload must be valid JSON.");
          }

          // 2. Send the real request to the Kubernetes Ingest Service
          const response = await fetchWithRetry("/ingest", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                  // Send exactly what the user typed in the textarea
                  events: submitData.events, 
                  submitter: submitData.submitter
              })
          });

          const data = await response.json();

          // 3. Handle the response
          if (response.status === 202) {
              setToast(`✅ Queued successfully! ID: ${data.requestId}`);
              setIsSubmitOpen(false); // Close the modal
              setSubmitData({ events: '', submitter: 'admin-console' }); // Reset form
              fetchAnchors(); // Refresh the table to show the new data (once the consumer is built!)
          } else {
              setToast(`❌ Failed: ${data.error || 'Unknown error'}`);
          }

      } catch (err: any) {
          console.error("Submission error:", err);
          setToast(`❌ Error: ${err.message}`);
      } finally {
          setIsSubmitting(false);
      }
  };


const getParsedEvents = (data?: any) => {
    console.log("Parsing eventsJson:", data);
    if (!data) return [];
    
    // 1. If the backend already hydrated it into an array (The New Way!)
    if (Array.isArray(data)) {
      // We map over it to beautifully expand any nested JSON strings
      return data.map(item => {
          if (item && typeof item.events === 'string') {
              try {
                  return { ...item, events: JSON.parse(item.events) };
              } catch {
                  return item;
              }
          }
          return item;
      });
    }
    
    // 2. If it's still a raw string from Postgres (Fallback)
    // if (typeof data === 'string') {
    //   try {
    //     return JSON.parse(data);
    //   } catch {
    //     return [];
    //   }
    // }
    
    return [];
  };

  const handleReVerify = async () => {
      if (!selectedAnchor || !selectedAnchor.eventsJson) return;
      
      try {
          setToast("Running mathematical verification via Java Validator...");
          
          const token = localStorage.getItem("access_token");
          if (!token) throw new Error("No auth token");

          // Send the EXACT raw string stored in PostgreSQL. 
          // Do not use JSON.parse or JSON.stringify, as it will alter the hash!
          const response = await fetchWithRetry("/validator/reverify", {
              method: "POST",
              headers: { 
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}` 
              },
              body: typeof selectedAnchor.eventsJson === 'string' 
                      ? selectedAnchor.eventsJson 
                      : JSON.stringify(selectedAnchor.eventsJson) 
          });
          
          if (!response.ok) throw new Error("Validation service unavailable");
          
          const data = await response.json();
          const isValid = data.computedMerkleRoot === selectedAnchor.merkleRoot;

          if (isValid) {
              setToast(`✅ Valid! The calculated root matches the Solana Blockchain.`);
          } else {
              setToast(`❌ Mismatch! Calculated: ${data.computedMerkleRoot}, Blockchain: ${selectedAnchor.merkleRoot}`);
          }
          
      } catch (err: any) {
          console.error(err);
          setToast(`❌ Error contacting Validator Service: ${err.message}`);
      }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] relative">
        <Toast message={toast} onClose={() => setToast(null)} />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col pr-6 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8b88]" size={16} />
                        <input 
                            type="text" 
                            placeholder="Filter anchors..." 
                            className="pl-9 pr-4 py-2 bg-white border border-[#d6d3d0] rounded-lg text-sm w-64 text-[#1f1e1d] placeholder-[#a8a29e] focus:outline-none focus:ring-1 focus:ring-[#BE3F2F] focus:border-[#BE3F2F] transition-all shadow-sm" 
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                        />
                    </div>
                    <button 
                        onClick={handleFilter}
                        className="p-2 bg-white border border-[#d6d3d0] rounded-lg hover:bg-[#fbfbfa] text-[#5d5c58] transition-colors shadow-sm"
                        title="Apply Filter"
                    >
                        <Filter size={16} />
                    </button>
                    <button 
                        onClick={handleRefresh}
                        className="p-2 bg-white border border-[#d6d3d0] rounded-lg hover:bg-[#fbfbfa] text-[#5d5c58] transition-colors shadow-sm"
                        title="Refresh List"
                    >
                        <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                    </button>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsSubmitOpen(true)}
                        className={btnPrimary}
                    >
                        Submit Anchor
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col relative">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-white/80 z-30">
                        <Loader2 size={32} className="animate-spin text-[#BE3F2F] mb-4" />
                        Loading data from Kubernetes...
                    </div>
                )}
                <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider sticky top-0 z-20">
                                <th className="p-4 pl-5 font-medium">Request ID</th>
                                <th className="p-4 font-medium">Merkle Root</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Submitter</th>
                                <th className="p-4 font-medium">Time</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {anchors.length === 0 && !isLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-12 text-gray-500">
                                        No anchors found in the database.
                                    </td>
                                </tr>
                            ) : anchors.map((anchor) => (
                                <tr 
                                    key={anchor.requestId} 
                                    onClick={() => handleSelectAnchor(anchor)}
                                    className={`group border-b border-[#f1f0ee] last:border-0 cursor-pointer transition-all duration-200 ease-in-out relative
                                        ${selectedAnchor?.requestId === anchor.requestId 
                                            ? 'bg-[#f4f2f0] border-l-4 border-l-[#BE3F2F]' 
                                            : 'hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:z-10 border-l-4 border-l-transparent'
                                        }`}
                                >
                                    <td className="p-4 pl-4 font-medium text-gray-900">{anchor.requestId}</td>
                                    <td className="p-4 text-gray-500 font-mono text-xs">{anchor.merkleRoot || '---'}</td>
                                    <td className="p-4"><Badge status={anchor.status || Status.PENDING} /></td>
                                    <td className="p-4 text-gray-600">{anchor.submitter || 'system'}</td>
                                    <td className="p-4 text-gray-500">{anchor.submittedAt ? new Date(anchor.submittedAt).toLocaleTimeString() : '---'}</td>
                                    <td className="p-4 text-right">
                                        <button className="p-1.5 text-[#8c8b88] hover:text-[#1f1e1d] rounded-md hover:bg-white opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-transparent hover:border-[#d6d3d0]">
                                            <MoreVertical size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 bg-gray-50 z-30 relative">
                     <span>Showing 1-{anchors.length} of {anchors.length}</span>
                     <div className="flex gap-1">
                         <button onClick={() => setToast("Loaded previous page")} className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50">Prev</button>
                         <button onClick={() => setToast("Loaded next page")} className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50">Next</button>
                     </div>
                </div>
            </div>
        </div>

        {/* Detail Drawer (Slide-over) */}
        <div className={`fixed right-0 top-[64px] bottom-0 w-[400px] bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 flex flex-col z-30 ${selectedAnchor ? 'translate-x-0' : 'translate-x-full'}`}>
             {selectedAnchor ? (
                 <>
                    <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-slate-50">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">{selectedAnchor.requestId}</h2>
                            <p className="text-xs text-gray-500 mt-1 font-mono">{selectedAnchor.merkleRoot || 'Pending Merkle Root'}</p>
                        </div>
                        <button onClick={() => setSelectedAnchor(null)} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Status Timeline */}
                        <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Processing Timeline</h4>
                            <div className="space-y-4 pl-2 border-l-2 border-gray-100">
                                <div className="relative pl-4">
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                                    <p className="text-sm font-medium">Ingest Accepted</p>
                                    <p className="text-xs text-gray-400">{selectedAnchor.submittedAt ? new Date(selectedAnchor.submittedAt).toLocaleTimeString() : '---'}</p>
                                </div>
                                <div className="relative pl-4">
                                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${selectedAnchor.merkleRoot ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                    <p className="text-sm font-medium">Validated</p>
                                </div>
                            
                                <div className="relative pl-4">
                                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${selectedAnchor.status === 'FAILED' ? 'bg-red-500' : selectedAnchor.status === 'OK' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                <p className="text-sm font-medium">Anchored on Chain</p>
    
                                    {selectedAnchor.txHash && (
                                <a 
                                href={`https://explorer.solana.com/tx/${selectedAnchor.txHash}?cluster=devnet`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-start gap-1 text-xs text-blue-600 hover:underline mt-1 break-all pr-4"
                                >
                                {selectedAnchor.txHash} 
                                <ExternalLink size={12} className="flex-shrink-0 mt-0.5" />
                                </a>
                                )}
                            </div>
                            </div>
                       </div>

                       
                        <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Metadata</h4>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Submitter</span>
                                    <span className="font-medium text-gray-900">
                                        {/* Look for the submitter inside the parsed JSON first, fallback to the DB submitter */}
                                        {getParsedEvents(selectedAnchor.eventsJson).length > 0 && getParsedEvents(selectedAnchor.eventsJson)[0].submitter 
                                            ? getParsedEvents(selectedAnchor.eventsJson)[0].submitter 
                                            : selectedAnchor.submitter || 'system'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Block Number</span>
                                    <span className="font-medium text-gray-900">
                                        {selectedAnchor.blockNumber || 'Pending Confirmation'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Event Count</span>
                                    <span className="font-medium text-gray-900">
                                        {/* Dynamically count the items INSIDE the nested events array */}
                                        {getParsedEvents(selectedAnchor.eventsJson).reduce((total: number, item: any) => {
                                            if (item && Array.isArray(item.events)) return total + item.events.length;
                                            return total + 1;
                                        }, 0)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Events JSON Preview */}
                         <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Payload Snippet</h4>
                            <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                                <pre className="text-xs text-blue-300 font-mono">
{selectedAnchor.eventsJson 
  ? JSON.stringify(getParsedEvents(selectedAnchor.eventsJson), null, 2) 
  : "No payload available"}
                                </pre>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2">
                        <button 
                            onClick={() => setToast("Downloading JSON payload...")}
                            className="flex-1 py-2 px-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 flex justify-center items-center gap-2"
                        >
                            <Download size={16} /> JSON
                        </button>
                        <button 
                            onClick={handleReVerify}
                            className="flex-1 py-2 px-3 bg-slate-900 text-white rounded-lg shadow-sm text-sm font-medium hover:bg-slate-800 flex justify-center items-center gap-2"
                        >
                            <Check size={16} /> Re-Verify
                        </button>
                    </div>
                 </>
             ) : (
                 <div className="flex items-center justify-center h-full text-gray-400">Select an anchor</div>
             )}
        </div>

        {/* Submit Anchor Modal */}
        <Modal
            isOpen={isSubmitOpen}
            onClose={() => setIsSubmitOpen(false)}
            title="Submit New Anchor"
            footer={
                <>
                    <button onClick={() => setIsSubmitOpen(false)} className={btnSecondary} disabled={isSubmitting}>Cancel</button>
                    <button onClick={handleSubmitAnchor} className={btnPrimary} disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit Request"}
                    </button>
                </>
            }
        >
            <div className="space-y-5">
                <div>
                    <label className="block text-xs font-semibold text-[#5d5c58] mb-1.5 uppercase tracking-wide">Submitter ID</label>
                    <input 
                        type="text" 
                        value={submitData.submitter}
                        onChange={e => setSubmitData({...submitData, submitter: e.target.value})}
                        className={formInputClass}
                        disabled
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-[#5d5c58] mb-1.5 uppercase tracking-wide">Events Payload (JSON Array)</label>
                    <textarea 
                        rows={8}
                        placeholder='["evt_1", "evt_2"]'
                        className={`${formInputClass} font-mono`}
                        value={submitData.events}
                        onChange={e => setSubmitData({...submitData, events: e.target.value})}
                    />
                    <p className="text-xs text-gray-500 mt-2">Enter a valid JSON array of event hashes or strings.</p>
                </div>
            </div>
        </Modal>
    </div>
  );
};








// import React, { useState } from 'react';
// import { Search, Filter, RefreshCw, MoreVertical, X, Check, ExternalLink, FileText, Download } from 'lucide-react';
// import { Anchor, Status } from '../types';
// import { Badge } from './ui/Badge';
// import { Toast } from './ui/Toast';
// import { Modal } from './ui/Modal';

// // Mock Data
// const MOCK_ANCHORS: Anchor[] = Array.from({ length: 15 }).map((_, i) => ({
//     requestId: `req-${1000 + i}`,
//     merkleRoot: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
//     status: i === 0 ? Status.PROCESSING : i === 2 ? Status.FAILED : Status.OK,
//     submittedAt: new Date(Date.now() - i * 3600000).toISOString(),
//     submitter: i % 2 === 0 ? 'Service-A' : 'Client-B',
//     events: ['evt_user_signup', 'evt_tx_deposit'],
//     txHash: i !== 0 ? '0x882...19a' : undefined
// }));

// // Button Styles reused for consistency
// const btnPrimary = "px-4 py-2 bg-[#BE3F2F] text-white text-sm font-medium rounded shadow-sm hover:bg-[#a33224] transition-colors";
// const btnSecondary = "px-4 py-2 bg-white border border-[#d6d3d0] text-[#5d5c58] text-sm font-medium rounded hover:bg-[#fbfbfa] transition-colors";
// const formInputClass = "w-full bg-[#fcfbf9] border border-[#d6d3d0] rounded px-3 py-2.5 text-sm text-[#1f1e1d] placeholder-[#a8a29e] focus:outline-none focus:ring-1 focus:ring-[#BE3F2F] focus:border-[#BE3F2F] transition-all shadow-inner";

// export const Anchors: React.FC = () => {
//   const [selectedAnchor, setSelectedAnchor] = useState<Anchor | null>(null);
//   const [toast, setToast] = useState<string | null>(null);
  
//   // Submit Anchor Modal State
//   const [isSubmitOpen, setIsSubmitOpen] = useState(false);
//   const [submitData, setSubmitData] = useState({ events: '', submitter: 'admin-console' });
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // Filter & Refresh Logic
//   const [isRefreshing, setIsRefreshing] = useState(false);
//   const [filterQuery, setFilterQuery] = useState('');

//   const handleRefresh = () => {
//     setIsRefreshing(true);
//     // Simulate API call
//     setTimeout(() => {
//         setIsRefreshing(false);
//         setToast("Anchors list refreshed");
//     }, 800);
//   };

//   const handleFilter = () => {
//       setToast(filterQuery ? `Filter applied: "${filterQuery}"` : "Filter cleared");
//   };

//   const handleSubmitAnchor = () => {
//       if (!submitData.events) return;
//       setIsSubmitting(true);
      
//       // Simulate submission delay
//       setTimeout(() => {
//           setIsSubmitting(false);
//           setIsSubmitOpen(false);
//           setToast("Anchor request submitted successfully");
//           setSubmitData({ events: '', submitter: 'admin-console' });
//       }, 1500);
//   };

//   return (
//     <div className="flex h-[calc(100vh-100px)] relative">
//         <Toast message={toast} onClose={() => setToast(null)} />
        
//         {/* Main Content */}
//         <div className="flex-1 flex flex-col pr-6 overflow-hidden">
//             {/* Toolbar */}
//             <div className="flex items-center justify-between mb-4">
//                 <div className="flex items-center gap-2">
//                     <div className="relative">
//                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8b88]" size={16} />
//                         <input 
//                             type="text" 
//                             placeholder="Filter anchors..." 
//                             className="pl-9 pr-4 py-2 bg-white border border-[#d6d3d0] rounded-lg text-sm w-64 text-[#1f1e1d] placeholder-[#a8a29e] focus:outline-none focus:ring-1 focus:ring-[#BE3F2F] focus:border-[#BE3F2F] transition-all shadow-sm" 
//                             value={filterQuery}
//                             onChange={(e) => setFilterQuery(e.target.value)}
//                             onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
//                         />
//                     </div>
//                     <button 
//                         onClick={handleFilter}
//                         className="p-2 bg-white border border-[#d6d3d0] rounded-lg hover:bg-[#fbfbfa] text-[#5d5c58] transition-colors shadow-sm"
//                         title="Apply Filter"
//                     >
//                         <Filter size={16} />
//                     </button>
//                     <button 
//                         onClick={handleRefresh}
//                         className="p-2 bg-white border border-[#d6d3d0] rounded-lg hover:bg-[#fbfbfa] text-[#5d5c58] transition-colors shadow-sm"
//                         title="Refresh List"
//                     >
//                         <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
//                     </button>
//                 </div>
//                 <div className="flex gap-2">
//                     <button 
//                         onClick={() => setIsSubmitOpen(true)}
//                         className={btnPrimary}
//                     >
//                         Submit Anchor
//                     </button>
//                 </div>
//             </div>

//             {/* Table */}
//             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
//                 <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
//                     <table className="w-full text-left border-collapse">
//                         <thead>
//                             <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider sticky top-0 z-20">
//                                 <th className="p-4 pl-5 font-medium">Request ID</th>
//                                 <th className="p-4 font-medium">Merkle Root</th>
//                                 <th className="p-4 font-medium">Status</th>
//                                 <th className="p-4 font-medium">Submitter</th>
//                                 <th className="p-4 font-medium">Time</th>
//                                 <th className="p-4 font-medium text-right">Actions</th>
//                             </tr>
//                         </thead>
//                         <tbody className="text-sm">
//                             {MOCK_ANCHORS.map((anchor) => (
//                                 <tr 
//                                     key={anchor.requestId} 
//                                     onClick={() => setSelectedAnchor(anchor)}
//                                     className={`group border-b border-[#f1f0ee] last:border-0 cursor-pointer transition-all duration-200 ease-in-out relative
//                                         ${selectedAnchor?.requestId === anchor.requestId 
//                                             ? 'bg-[#f4f2f0] border-l-4 border-l-[#BE3F2F]' 
//                                             : 'hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:z-10 border-l-4 border-l-transparent'
//                                         }`}
//                                 >
//                                     <td className="p-4 pl-4 font-medium text-gray-900">{anchor.requestId}</td>
//                                     <td className="p-4 text-gray-500 font-mono text-xs">{anchor.merkleRoot}</td>
//                                     <td className="p-4"><Badge status={anchor.status} /></td>
//                                     <td className="p-4 text-gray-600">{anchor.submitter}</td>
//                                     <td className="p-4 text-gray-500">{new Date(anchor.submittedAt).toLocaleTimeString()}</td>
//                                     <td className="p-4 text-right">
//                                         <button className="p-1.5 text-[#8c8b88] hover:text-[#1f1e1d] rounded-md hover:bg-white opacity-0 group-hover:opacity-100 transition-all shadow-sm border border-transparent hover:border-[#d6d3d0]">
//                                             <MoreVertical size={16} />
//                                         </button>
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>
//                 <div className="p-3 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 bg-gray-50 z-30 relative">
//                      <span>Showing 1-15 of 1240</span>
//                      <div className="flex gap-1">
//                          <button onClick={() => setToast("Loaded previous page")} className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50">Prev</button>
//                          <button onClick={() => setToast("Loaded next page")} className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50">Next</button>
//                      </div>
//                 </div>
//             </div>
//         </div>

//         {/* Detail Drawer (Slide-over) */}
//         <div className={`fixed right-0 top-[64px] bottom-0 w-[400px] bg-white border-l border-gray-200 shadow-2xl transform transition-transform duration-300 flex flex-col z-30 ${selectedAnchor ? 'translate-x-0' : 'translate-x-full'}`}>
//              {selectedAnchor ? (
//                  <>
//                     <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-slate-50">
//                         <div>
//                             <h2 className="text-lg font-bold text-gray-900">{selectedAnchor.requestId}</h2>
//                             <p className="text-xs text-gray-500 mt-1 font-mono">{selectedAnchor.merkleRoot}</p>
//                         </div>
//                         <button onClick={() => setSelectedAnchor(null)} className="text-gray-400 hover:text-gray-600">
//                             <X size={20} />
//                         </button>
//                     </div>
                    
//                     <div className="flex-1 overflow-y-auto p-6 space-y-8">
//                         {/* Status Timeline */}
//                         <div>
//                             <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Processing Timeline</h4>
//                             <div className="space-y-4 pl-2 border-l-2 border-gray-100">
//                                 <div className="relative pl-4">
//                                     <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
//                                     <p className="text-sm font-medium">Ingest Accepted</p>
//                                     <p className="text-xs text-gray-400">10:00:01 AM</p>
//                                 </div>
//                                 <div className="relative pl-4">
//                                     <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
//                                     <p className="text-sm font-medium">Validated</p>
//                                     <p className="text-xs text-gray-400">10:00:02 AM</p>
//                                 </div>
//                                 <div className="relative pl-4">
//                                     <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${selectedAnchor.status === Status.FAILED ? 'bg-red-500' : 'bg-emerald-500'}`} />
//                                     <p className="text-sm font-medium">Anchored on Solana</p>
//                                     <p className="text-xs text-gray-400">10:01:15 AM</p>
//                                     {selectedAnchor.txHash && (
//                                         <a href="#" className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
//                                             {selectedAnchor.txHash} <ExternalLink size={10} />
//                                         </a>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Metadata */}
//                         <div>
//                             <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Metadata</h4>
//                             <div className="bg-gray-50 rounded-lg p-4 space-y-3">
//                                 <div className="flex justify-between text-sm">
//                                     <span className="text-gray-500">Submitter</span>
//                                     <span className="font-medium text-gray-900">{selectedAnchor.submitter}</span>
//                                 </div>
//                                 <div className="flex justify-between text-sm">
//                                     <span className="text-gray-500">Block Number</span>
//                                     <span className="font-medium text-gray-900">{selectedAnchor.blockNumber || '---'}</span>
//                                 </div>
//                                 <div className="flex justify-between text-sm">
//                                     <span className="text-gray-500">Event Count</span>
//                                     <span className="font-medium text-gray-900">{selectedAnchor.events.length}</span>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Events JSON Preview */}
//                          <div>
//                             <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Payload Snippet</h4>
//                             <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
//                                 <pre className="text-xs text-blue-300 font-mono">
// {JSON.stringify({ 
//   event_type: "user_action", 
//   user: "u_123", 
//   meta: { src: "web" } 
// }, null, 2)}
//                                 </pre>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Footer Actions */}
//                     <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-2">
//                         <button 
//                             onClick={() => setToast("Downloading JSON payload...")}
//                             className="flex-1 py-2 px-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 flex justify-center items-center gap-2"
//                         >
//                             <Download size={16} /> JSON
//                         </button>
//                         <button 
//                             onClick={() => setToast("Verification process queued")}
//                             className="flex-1 py-2 px-3 bg-slate-900 text-white rounded-lg shadow-sm text-sm font-medium hover:bg-slate-800 flex justify-center items-center gap-2"
//                         >
//                             <Check size={16} /> Re-Verify
//                         </button>
//                     </div>
//                  </>
//              ) : (
//                  <div className="flex items-center justify-center h-full text-gray-400">Select an anchor</div>
//              )}
//         </div>

//         {/* Submit Anchor Modal */}
//         <Modal
//             isOpen={isSubmitOpen}
//             onClose={() => setIsSubmitOpen(false)}
//             title="Submit New Anchor"
//             footer={
//                 <>
//                     <button onClick={() => setIsSubmitOpen(false)} className={btnSecondary} disabled={isSubmitting}>Cancel</button>
//                     <button onClick={handleSubmitAnchor} className={btnPrimary} disabled={isSubmitting}>
//                         {isSubmitting ? "Submitting..." : "Submit Request"}
//                     </button>
//                 </>
//             }
//         >
//             <div className="space-y-5">
//                 <div>
//                     <label className="block text-xs font-semibold text-[#5d5c58] mb-1.5 uppercase tracking-wide">Submitter ID</label>
//                     <input 
//                         type="text" 
//                         value={submitData.submitter}
//                         onChange={e => setSubmitData({...submitData, submitter: e.target.value})}
//                         className={formInputClass}
//                         disabled
//                     />
//                 </div>
//                 <div>
//                     <label className="block text-xs font-semibold text-[#5d5c58] mb-1.5 uppercase tracking-wide">Events Payload (JSON Array)</label>
//                     <textarea 
//                         rows={8}
//                         placeholder='["evt_1", "evt_2"]'
//                         className={`${formInputClass} font-mono`}
//                         value={submitData.events}
//                         onChange={e => setSubmitData({...submitData, events: e.target.value})}
//                     />
//                     <p className="text-xs text-gray-500 mt-2">Enter a valid JSON array of event hashes or strings.</p>
//                 </div>
//             </div>
//         </Modal>
//     </div>
//   );
// };