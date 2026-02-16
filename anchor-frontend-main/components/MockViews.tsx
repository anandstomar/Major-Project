import React, { useState } from 'react';
import { 
  UploadCloud, List, Code, PlayCircle, FolderTree, Database, 
  Search as SearchIcon, Bell, Settings as SettingsIcon, Shield, Key, User,
  FileJson, Clock, RefreshCw, FileText, Activity, Cpu, Trash2, Plus, ArrowRight, Copy,
  CheckCircle, AlertCircle
} from 'lucide-react';
import { Badge } from './ui/Badge';
import { Status } from '../types';
import { Modal } from './ui/Modal';
import { IllusUpload, IllusTree } from './ui/Assets';
import { Toast } from './ui/Toast';

// --- Reusable Components ---

const Tabs = ({ tabs }: { tabs: { id: string, label: string, icon: any, content: React.ReactNode }[] }) => {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-[#e0e0dc] mb-8 space-x-8 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all relative ${
              activeTab === tab.id 
                ? 'text-[#BE3F2F]' 
                : 'text-[#8c8b88] hover:text-[#1f1e1d]'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#BE3F2F]"></span>
            )}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative">
        {tabs.find(t => t.id === activeTab)?.content}
      </div>
    </div>
  );
};

const SectionHeader = ({ title, action }: { title: string, action?: React.ReactNode }) => (
    <div className="flex justify-between items-center mb-5">
        <h3 className="text-lg font-light text-[#1f1e1d] tracking-tight">{title}</h3>
        {action}
    </div>
);

// Fix: Use interface with optional children and React.FC to properly support 'key' prop and optional children in JSX
interface CardProps {
  children?: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => (
    <div className={`bg-white border border-[#e0e0dc] rounded-sm shadow-[0_2px_6px_rgba(0,0,0,0.03)] ${className}`}>
        {children}
    </div>
);

const formInputClass = "w-full bg-[#fcfbf9] border border-[#d6d3d0] rounded px-3 py-2.5 text-sm text-[#1f1e1d] placeholder-[#a8a29e] focus:outline-none focus:ring-1 focus:ring-[#BE3F2F] focus:border-[#BE3F2F] transition-all shadow-inner";
const btnPrimary = "px-4 py-2 bg-[#BE3F2F] text-white text-sm font-medium rounded shadow-sm hover:bg-[#a33224] transition-colors";
const btnSecondary = "px-4 py-2 bg-white border border-[#d6d3d0] text-[#5d5c58] text-sm font-medium rounded hover:bg-[#fbfbfa] transition-colors";

// --- Page Implementations ---

export const Ingest = () => {
  const [toast, setToast] = useState<string | null>(null);
  
  const [uploads, setUploads] = useState([
    { name: 'user_events_2023_10_24.json', size: '24 MB', time: '10 mins ago', user: 'jdoe', status: 'Complete' },
    { name: 'tx_logs_v2.avro', size: '156 MB', time: '1 hour ago', user: 'system', status: 'Processing' },
    { name: 'legacy_import.csv', size: '4.2 MB', time: '3 hours ago', user: 'admin', status: 'Failed' },
  ]);

  const handleFileUpload = () => {
    setToast("File 'upload_manifest_v2.json' added to queue");
    setUploads(prev => [{
        name: 'upload_manifest_v2.json',
        size: '12 MB',
        time: 'Just now',
        user: 'you',
        status: 'Processing'
    }, ...prev]);
  };

  const UploadTab = () => (
      <div className="max-w-5xl mx-auto space-y-10">
          <div 
            onClick={handleFileUpload}
            className="border-2 border-dashed border-[#d6d3d0] rounded bg-[#fbfbfa] p-16 flex flex-col items-center justify-center text-center hover:border-[#BE3F2F] hover:bg-white transition-all cursor-pointer group"
          >
              <div className="mb-6 opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all">
                  <IllusUpload />
              </div>
              <h3 className="text-xl font-medium text-[#1f1e1d]">Upload Manifest</h3>
              <p className="text-sm text-[#8c8b88] mt-2 max-w-sm">Drag and drop JSON, AVRO, or CSV files here to start an ingestion job. Max size 500MB.</p>
              <button className={`mt-8 ${btnPrimary}`}>
                  Select Files
              </button>
          </div>
          
          <div>
              <SectionHeader title="Recent Uploads" />
              <Card>
                  {uploads.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-5 border-b border-[#f1f0ee] last:border-0 hover:bg-[#fcfbf9]   ">
                          <div className="flex items-center gap-4">
                              <div className="p-2 bg-[#f4f2f0] rounded text-[#8c8b88]">
                                <FileJson size={20} />
                              </div>
                              <div>
                                  <p className="text-sm font-medium text-[#1f1e1d]">{file.name}</p>
                                  <p className="text-xs text-[#8c8b88] mt-0.5">{file.size} • {file.user}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-6">
                              <span className="text-xs text-[#8c8b88]">{file.time}</span>
                              <Badge status={file.status === 'Complete' ? Status.OK : file.status === 'Processing' ? Status.PROCESSING : Status.FAILED} size="sm" />
                          </div>
                      </div>
                  ))}
              </Card>
          </div>
      </div>
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefreshJobs = () => {
      setIsRefreshing(true);
      setTimeout(() => {
          setIsRefreshing(false);
          setToast("Job statuses updated");
      }, 800);
  };

  const JobsTab = () => (
      <div>
          <SectionHeader title="Ingestion Jobs" action={
              <button 
                onClick={handleRefreshJobs} 
                className={`text-[#BE3F2F] text-sm font-medium flex items-center gap-1 hover:underline ${isRefreshing ? 'opacity-50' : ''}`}
              >
                  <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} /> Refresh
              </button>
          } />
          <Card className="overflow-hidden">
              <table className="w-full text-left text-sm">
                  <thead className="bg-[#fbfbfa] border-b border-[#e0e0dc]">
                      <tr>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58]">Job ID</th>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58]">Manifest</th>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58]">Rows</th>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58]">Duration</th>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58]">Status</th>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58] text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f0ee]">
                      {[
                          { id: 'job-8821', manifest: 'analytics_dump_a.json', rows: '45,200', dur: '4m 12s', status: Status.OK },
                          { id: 'job-8820', manifest: 'analytics_dump_b.json', rows: '12,500', dur: '1m 05s', status: Status.OK },
                          { id: 'job-8819', manifest: 'broken_schema.avro', rows: '0', dur: '12s', status: Status.FAILED },
                          { id: 'job-8818', manifest: 'stream_logs.csv', rows: '128,900', dur: 'Processing', status: Status.PROCESSING },
                          { id: 'job-8817', manifest: 'daily_sync.json', rows: '8,400', dur: '45s', status: Status.OK },
                      ].map((job) => (
                          <tr key={job.id} className="hover:bg-[#fcfbf9] transition-colors">
                              <td className="px-6 py-4 font-mono text-xs text-[#5d5c58]">{job.id}</td>
                              <td className="px-6 py-4 text-[#1f1e1d] font-medium">{job.manifest}</td>
                              <td className="px-6 py-4 text-[#5d5c58]">{job.rows}</td>
                              <td className="px-6 py-4 text-[#5d5c58]">{job.dur}</td>
                              <td className="px-6 py-4"><Badge status={job.status} size="sm" /></td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => setToast(`Opening logs for ${job.id}`)} className="text-[#BE3F2F] hover:text-[#a33224] cursor-pointer font-medium text-xs">View Logs</button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </Card>
      </div>
  );

  const [schemas, setSchemas] = useState([
    { name: 'UserEvent', ver: '1.2.0', type: 'AVRO', updated: '2 days ago' },
    { name: 'Transaction', ver: '2.0.1', type: 'PROTOBUF', updated: '5 days ago' },
    { name: 'SystemLog', ver: '0.9.0', type: 'JSON', updated: '1 week ago' },
    { name: 'AnchorProof', ver: '1.0.0', type: 'AVRO', updated: '2 weeks ago' },
  ]);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [newSchema, setNewSchema] = useState({ name: '', type: 'AVRO', def: '' });

  const handleRegisterSchema = () => {
    if (!newSchema.name) return;
    setSchemas([{ name: newSchema.name, ver: '0.0.1', type: newSchema.type, updated: 'Just now' }, ...schemas]);
    setToast(`Schema '${newSchema.name}' registered successfully`);
    setIsSchemaModalOpen(false);
    setNewSchema({ name: '', type: 'AVRO', def: '' });
  };

  const SchemaTab = () => (
      <div>
         <SectionHeader title="Schema Registry" action={
            <button 
                onClick={() => setIsSchemaModalOpen(true)}
                className={btnPrimary}
            >
                Register New Schema
            </button>
         } />
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {schemas.map((schema, i) => (
                 <Card key={i} className="p-6 hover:shadow-md transition-shadow cursor-pointer group">
                     <div className="flex justify-between items-start mb-4">
                         <div className="p-2 bg-[#f4f2f0] text-[#5d5c58] rounded group-hover:text-[#BE3F2F] transition-colors">
                             <Code size={20} />
                         </div>
                         <span className="px-2 py-1 bg-[#fbfbfa] border border-[#e0e0dc] rounded text-[10px] font-mono text-[#5d5c58] uppercase tracking-wide">{schema.type}</span>
                     </div>
                     <h4 className="font-semibold text-[#1f1e1d]">{schema.name}</h4>
                     <p className="text-xs text-[#8c8b88] mt-1">v{schema.ver} • Updated {schema.updated}</p>
                     <div className="mt-6 pt-4 border-t border-[#f1f0ee] flex gap-3">
                         <button onClick={() => setToast(`Viewing source: ${schema.name}`)} className="flex-1 text-xs font-medium text-[#5d5c58] hover:text-[#1f1e1d] bg-[#fbfbfa] py-2 rounded hover:bg-[#f4f2f0] transition-colors">View Source</button>
                         <button onClick={() => setToast(`Viewing history: ${schema.name}`)} className="flex-1 text-xs font-medium text-[#5d5c58] hover:text-[#1f1e1d] bg-[#fbfbfa] py-2 rounded hover:bg-[#f4f2f0] transition-colors">History</button>
                     </div>
                 </Card>
             ))}
         </div>

         <Modal
            isOpen={isSchemaModalOpen}
            onClose={() => setIsSchemaModalOpen(false)}
            title="Register New Schema"
            footer={
                <>
                    <button onClick={() => setIsSchemaModalOpen(false)} className={btnSecondary}>Cancel</button>
                    <button onClick={handleRegisterSchema} className={btnPrimary}>Register Schema</button>
                </>
            }
         >
            <div className="space-y-5">
                <div>
                    <label className="block text-xs font-semibold text-[#5d5c58] mb-1.5 uppercase tracking-wide">Schema Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. PaymentEvent"
                        className={formInputClass}
                        value={newSchema.name}
                        onChange={e => setNewSchema({...newSchema, name: e.target.value})}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-[#5d5c58] mb-1.5 uppercase tracking-wide">Type</label>
                    <select 
                        className={formInputClass}
                        value={newSchema.type}
                        onChange={e => setNewSchema({...newSchema, type: e.target.value})}
                    >
                        <option value="AVRO">Apache Avro</option>
                        <option value="PROTOBUF">Protobuf</option>
                        <option value="JSON">JSON Schema</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-[#5d5c58] mb-1.5 uppercase tracking-wide">Schema Definition</label>
                    <textarea 
                        rows={6}
                        placeholder="{ ... }"
                        className={`${formInputClass} font-mono`}
                        value={newSchema.def}
                        onChange={e => setNewSchema({...newSchema, def: e.target.value})}
                    />
                </div>
            </div>
         </Modal>
      </div>
  );

  const tabs = [
    { id: 'upload', label: 'Upload Manifest', icon: UploadCloud, content: <UploadTab /> },
    { id: 'jobs', label: 'Ingest Jobs', icon: List, content: <JobsTab /> },
    { id: 'schema', label: 'Schema Registry', icon: Code, content: <SchemaTab /> },
  ];
  return (
    <>
        <Tabs tabs={tabs} />
        <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
};

export const Validator = () => {
  const [toast, setToast] = useState<string | null>(null);

  const RunsTab = () => (
      <div>
           <div className="grid grid-cols-4 gap-6 mb-8">
              <Card className="p-5 border-t-4 border-t-emerald-500">
                  <div className="text-[10px] text-[#8c8b88] uppercase font-bold tracking-widest">Pass Rate (24h)</div>
                  <div className="text-3xl font-light text-[#1f1e1d] mt-2">98.2%</div>
              </Card>
              <Card className="p-5 border-t-4 border-t-[#d6d3d0]">
                  <div className="text-[10px] text-[#8c8b88] uppercase font-bold tracking-widest">Total Rows</div>
                  <div className="text-3xl font-light text-[#1f1e1d] mt-2">1.2M</div>
              </Card>
              <Card className="p-5 border-t-4 border-t-red-500">
                  <div className="text-[10px] text-[#8c8b88] uppercase font-bold tracking-widest">Schema Errors</div>
                  <div className="text-3xl font-light text-[#1f1e1d] mt-2">42</div>
              </Card>
           </div>

           <Card className="overflow-hidden">
              <table className="w-full text-left text-sm">
                  <thead className="bg-[#fbfbfa] border-b border-[#e0e0dc]">
                      <tr>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58]">Run ID</th>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58]">Batch Context</th>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58]">Issues</th>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58]">Duration</th>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58]">Status</th>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58] text-right">Report</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f0ee]">
                      {[
                          { id: 'val-901', ctx: 'batch-3312', issues: 0, dur: '1.2s', status: Status.OK },
                          { id: 'val-900', ctx: 'batch-3311', issues: 0, dur: '0.8s', status: Status.OK },
                          { id: 'val-899', ctx: 'batch-3310', issues: 5, dur: '1.5s', status: Status.DEGRADED },
                          { id: 'val-898', ctx: 'batch-3309', issues: 0, dur: '1.1s', status: Status.OK },
                          { id: 'val-897', ctx: 'manual-upload-22', issues: 124, dur: '2.4s', status: Status.FAILED },
                      ].map((run) => (
                          <tr key={run.id} className="hover:bg-[#fcfbf9] transition-colors">
                              <td className="px-6 py-4 font-mono text-xs text-[#5d5c58]">{run.id}</td>
                              <td className="px-6 py-4 text-[#1f1e1d]">{run.ctx}</td>
                              <td className="px-6 py-4 text-[#5d5c58]">{run.issues > 0 ? <span className="text-red-600 font-medium">{run.issues} Found</span> : 'None'}</td>
                              <td className="px-6 py-4 text-[#5d5c58]">{run.dur}</td>
                              <td className="px-6 py-4"><Badge status={run.status} size="sm" /></td>
                              <td className="px-6 py-4 text-right text-[#8c8b88] hover:text-[#5d5c58] cursor-pointer">
                                <FileText size={16} className="ml-auto" onClick={() => setToast(`Downloaded report for ${run.id}`)} />
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </Card>
      </div>
  );

  const MerkleTab = () => {
      const [input, setInput] = useState(`[
  "evt_8821992",
  "evt_8821993",
  "evt_8821994",
  "evt_8821995"
]`);
      const [root, setRoot] = useState('0x99281...a8b21');

      const handleCompute = () => {
          setToast("Computing Merkle Root...");
          setTimeout(() => {
              setRoot(`0x${Math.random().toString(16).slice(2)}...${Math.random().toString(16).slice(2)}`);
              setToast("Root computed successfully");
          }, 500);
      };

      return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          <div className="flex flex-col h-full">
              <h4 className="text-xs font-semibold text-[#5d5c58] uppercase tracking-wide mb-2">Input Data (JSON Array)</h4>
              <div className="flex-1 bg-white border border-[#d6d3d0] rounded-sm p-4 font-mono text-xs text-[#1f1e1d] shadow-inner overflow-hidden flex flex-col">
                  <textarea 
                    className="bg-transparent w-full h-full resize-none focus:outline-none"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
              </div>
              <div className="mt-4 flex gap-3">
                  <button onClick={handleCompute} className={btnPrimary}>
                      <span className="flex items-center gap-2"><PlayCircle size={16} /> Compute Root</span>
                  </button>
                  <button onClick={() => { setInput('[]'); setRoot('---'); }} className={btnSecondary}>
                      Clear
                  </button>
              </div>
          </div>
          <div className="flex flex-col gap-6">
               <Card className="p-6">
                   <h4 className="text-xs font-semibold text-[#5d5c58] uppercase tracking-wide mb-3">Computed Merkle Root</h4>
                   <div className="p-4 bg-[#fbfbfa] border border-[#e0e0dc] rounded font-mono text-sm text-[#BE3F2F] break-all flex items-center justify-between gap-2 shadow-inner">
                       <span>{root}</span>
                       <Copy 
                         size={14} 
                         className="text-[#8c8b88] cursor-pointer hover:text-[#1f1e1d]" 
                         onClick={() => setToast("Copied to clipboard")}
                       />
                   </div>
               </Card>
               
               <Card className="flex-1 p-8 flex flex-col items-center justify-center bg-[#fbfbfa]">
                    <div className="opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        <IllusTree />
                    </div>
                    <p className="mt-4 text-xs text-[#8c8b88]">Interactive Tree Visualization</p>
               </Card>
          </div>
      </div>
      );
  };

  const tabs = [
    { id: 'runs', label: 'Validation Runs', icon: Activity, content: <RunsTab /> },
    { id: 'merkle', label: 'Merkle Tools', icon: FolderTree, content: <MerkleTab /> },
  ];
  return (
    <>
        <Tabs tabs={tabs} />
        <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
};

export const SearchPage = () => {
  const [toast, setToast] = useState<string | null>(null);

  const IndexerTab = () => (
      <div>
          <div className="flex gap-4 mb-6">
               <div className="flex-1 relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8b88]" size={18} />
                  <input type="text" placeholder="SQL filter (e.g. SELECT * FROM anchors WHERE...)" className={`${formInputClass} pl-10`} />
               </div>
               <button onClick={() => setToast("Query executed (124ms)")} className={btnPrimary}>Run Query</button>
          </div>
          <Card className="overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-[#fbfbfa] border-b border-[#e0e0dc]">
                      <tr>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58] w-24">ID</th>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58]">Created At</th>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58]">Source</th>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58]">Payload Preview</th>
                          <th className="px-6 py-4 font-semibold text-[#5d5c58] text-right">Size</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f1f0ee] font-mono text-xs">
                      {Array.from({length: 10}).map((_, i) => (
                          <tr key={i} className="hover:bg-[#fcfbf9]">
                              <td className="px-6 py-3 text-[#BE3F2F]">{1000 + i}</td>
                              <td className="px-6 py-3 text-[#5d5c58]">{new Date().toISOString()}</td>
                              <td className="px-6 py-3 text-[#1f1e1d]">kafka.topic.events</td>
                              <td className="px-6 py-3 text-[#8c8b88] truncate max-w-xs">{`{"evt": "user_login", "uid": "u_${500+i}", "meta": { ... }}`}</td>
                              <td className="px-6 py-3 text-[#5d5c58] text-right">{120 + i * 2}b</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </Card>
      </div>
  );

  const OpenSearchTab = () => (
      <div className="flex flex-col h-full">
           <div className="flex gap-4 mb-6">
               <div className="flex-1 relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8c8b88]" size={18} />
                  <input type="text" placeholder="Full-text search..." className={`${formInputClass} pl-10`} />
               </div>
           </div>
           
           <div className="flex gap-8 flex-1">
               {/* Facets - Styled like enterprise filters */}
               <div className="w-64 space-y-8">
                   <div>
                       <h4 className="text-[10px] font-bold text-[#8c8b88] uppercase tracking-widest mb-3 pb-1 border-b border-[#e0e0dc]">Index</h4>
                       <div className="space-y-3 text-sm text-[#5d5c58]">
                           <label className="flex items-center gap-3"><input type="checkbox" className="accent-[#BE3F2F]" defaultChecked /> anchors-v1 (1.2M)</label>
                           <label className="flex items-center gap-3"><input type="checkbox" className="accent-[#BE3F2F]" /> logs-2023 (5.4M)</label>
                       </div>
                   </div>
                   <div>
                       <h4 className="text-[10px] font-bold text-[#8c8b88] uppercase tracking-widest mb-3 pb-1 border-b border-[#e0e0dc]">Status</h4>
                       <div className="space-y-3 text-sm text-[#5d5c58]">
                           <label className="flex items-center gap-3"><input type="checkbox" className="accent-[#BE3F2F]" defaultChecked /> Success</label>
                           <label className="flex items-center gap-3"><input type="checkbox" className="accent-[#BE3F2F]" /> Failure</label>
                       </div>
                   </div>
               </div>

               {/* Results */}
               <div className="flex-1 space-y-4">
                   {[1, 2, 3].map(i => (
                       <Card key={i} className="p-5 hover:border-[#BE3F2F] transition-colors cursor-pointer group">
                           <div className="flex justify-between items-start">
                               <h5 onClick={() => setToast(`Opening doc-${10203+i}`)} className="text-[#BE3F2F] font-medium text-sm hover:underline">Document ID: doc-{10203 + i}</h5>
                               <span className="text-xs text-[#8c8b88]">Score: 0.9{8-i}</span>
                           </div>
                           <p className="text-sm text-[#1f1e1d] mt-2 leading-relaxed font-light">
                               ... transaction confirmed with <span className="bg-[#fef3c7] font-normal">merkle_root</span> matching the request signature. 
                               Event propagated to <span className="bg-[#fef3c7] font-normal">indexer</span> service successfully...
                           </p>
                           <div className="mt-4 flex gap-2">
                               <span className="px-2 py-0.5 bg-[#f4f2f0] border border-[#e0e0dc] text-[#5d5c58] text-[10px] rounded uppercase tracking-wide">Log</span>
                               <span className="px-2 py-0.5 bg-[#f4f2f0] border border-[#e0e0dc] text-[#5d5c58] text-[10px] rounded uppercase tracking-wide">Prod</span>
                           </div>
                       </Card>
                   ))}
               </div>
           </div>
      </div>
  );

  const tabs = [
    { id: 'indexer', label: 'Index Explorer', icon: Database, content: <IndexerTab /> },
    { id: 'opensearch', label: 'Full-Text Search', icon: SearchIcon, content: <OpenSearchTab /> },
  ];
  return (
    <>
        <Tabs tabs={tabs} />
        <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
};

export const Scheduler = () => {
    const [toast, setToast] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);

    return (
        <div className="max-w-6xl mx-auto">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="p-6 flex items-center gap-4 border-l-4 border-l-indigo-500">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full"><Clock size={20} /></div>
                    <div>
                        <div className="text-2xl font-light text-[#1f1e1d]">45</div>
                        <div className="text-[10px] text-[#8c8b88] font-bold uppercase tracking-widest">Pending Requests</div>
                    </div>
                </Card>
                <Card className="p-6 flex items-center gap-4 border-l-4 border-l-emerald-500">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full"><Activity size={20} /></div>
                    <div>
                        <div className="text-2xl font-light text-[#1f1e1d]">24 Gwei</div>
                        <div className="text-[10px] text-[#8c8b88] font-bold uppercase tracking-widest">Current Gas Price</div>
                    </div>
                </Card>
                <Card className={`p-6 flex items-center gap-4 border-l-4 ${isPaused ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
                    <div className={`p-3 rounded-full ${isPaused ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Cpu size={20} />
                    </div>
                    <div>
                        <div className="text-2xl font-light text-[#1f1e1d]">{isPaused ? 'Paused' : 'Active'}</div>
                        <div className="text-[10px] text-[#8c8b88] font-bold uppercase tracking-widest">Scheduler Status</div>
                    </div>
                </Card>
             </div>

             <SectionHeader title="Batch Queue" action={<div className="flex gap-3">
                 <button 
                    onClick={() => {
                        setIsPaused(!isPaused);
                        setToast(isPaused ? "Scheduler resumed" : "Scheduler paused");
                    }}
                    className={btnSecondary}
                >
                    {isPaused ? "Resume Queue" : "Pause Queue"}
                 </button>
                 <button onClick={() => setToast("Batch scheduled for immediate execution")} className={btnPrimary}>Force Run Batch</button>
             </div>} />

             <Card className="overflow-hidden">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-[#fbfbfa] border-b border-[#e0e0dc]">
                          <tr>
                              <th className="px-6 py-4 font-semibold text-[#5d5c58]">Batch ID</th>
                              <th className="px-6 py-4 font-semibold text-[#5d5c58]">Request Count</th>
                              <th className="px-6 py-4 font-semibold text-[#5d5c58]">Est. Cost</th>
                              <th className="px-6 py-4 font-semibold text-[#5d5c58]">Created</th>
                              <th className="px-6 py-4 font-semibold text-[#5d5c58]">Status</th>
                              <th className="px-6 py-4 font-semibold text-[#5d5c58] text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f0ee]">
                          {[
                              { id: 'batch-3012', count: 450, cost: '0.04 SOL', time: '2m ago', status: Status.PENDING },
                              { id: 'batch-3011', count: 120, cost: '0.01 SOL', time: '15m ago', status: Status.PROCESSING },
                              { id: 'batch-3010', count: 500, cost: '0.05 SOL', time: '45m ago', status: Status.SUBMITTED },
                              { id: 'batch-3009', count: 488, cost: '0.04 SOL', time: '1h ago', status: Status.OK },
                          ].map((batch) => (
                              <tr key={batch.id} className="hover:bg-[#fcfbf9]">
                                  <td className="px-6 py-4 font-mono text-xs text-[#5d5c58]">{batch.id}</td>
                                  <td className="px-6 py-4 text-[#1f1e1d] font-medium">{batch.count}</td>
                                  <td className="px-6 py-4 text-[#5d5c58]">{batch.cost}</td>
                                  <td className="px-6 py-4 text-[#5d5c58]">{batch.time}</td>
                                  <td className="px-6 py-4"><Badge status={batch.status} size="sm" /></td>
                                  <td className="px-6 py-4 text-right">
                                      <button onClick={() => setToast(`Inspecting ${batch.id}`)} className="text-[#8c8b88] hover:text-[#BE3F2F] transition-colors"><ArrowRight size={16} className="ml-auto" /></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
             </Card>
             <Toast message={toast} onClose={() => setToast(null)} />
        </div>
    );
};

export const Analytics = () => {
    const [toast, setToast] = useState<string | null>(null);
    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                 <Card className="p-6">
                     <h4 className="text-[#5d5c58] font-medium text-xs uppercase tracking-wider mb-2">Total Anchors (Monthly)</h4>
                     <div className="text-3xl font-light text-[#1f1e1d]">482,900</div>
                     <div className="text-emerald-600 text-xs mt-3 font-medium flex items-center gap-1"><ArrowRight size={10} className="-rotate-45" /> +14.2% growth</div>
                 </Card>
                 <Card className="p-6">
                     <h4 className="text-[#5d5c58] font-medium text-xs uppercase tracking-wider mb-2">Cost Efficiency</h4>
                     <div className="text-3xl font-light text-[#1f1e1d]">$0.004</div>
                     <div className="text-[#8c8b88] text-xs mt-3">Avg cost per anchor</div>
                 </Card>
                 <Card className="p-6">
                     <h4 className="text-[#5d5c58] font-medium text-xs uppercase tracking-wider mb-2">Data Ingested</h4>
                     <div className="text-3xl font-light text-[#1f1e1d]">1.4 TB</div>
                     <div className="text-[#8c8b88] text-xs mt-3">Parquet store size</div>
                 </Card>
            </div>

            <SectionHeader title="Hourly Aggregates" action={<button onClick={() => setToast("Downloading CSV report...")} className="text-[#BE3F2F] text-sm font-medium hover:underline">Download CSV</button>} />
            <Card className="overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#fbfbfa] border-b border-[#e0e0dc]">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58]">Hour</th>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58]">Total Requests</th>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58]">Batches</th>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58]">Avg Latency</th>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58] text-right">Success Rate</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f0ee]">
                        {[
                            { hr: '14:00', req: 12400, bat: 12, lat: '45ms', rate: '100%' },
                            { hr: '13:00', req: 11200, bat: 10, lat: '48ms', rate: '99.9%' },
                            { hr: '12:00', req: 14500, bat: 15, lat: '52ms', rate: '99.5%' },
                            { hr: '11:00', req: 9800, bat: 9, lat: '41ms', rate: '100%' },
                            { hr: '10:00', req: 10100, bat: 11, lat: '44ms', rate: '100%' },
                        ].map((row, i) => (
                            <tr key={i} className="hover:bg-[#fcfbf9]">
                                <td className="px-6 py-4 font-medium text-[#1f1e1d]">{row.hr}</td>
                                <td className="px-6 py-4 text-[#5d5c58]">{row.req.toLocaleString()}</td>
                                <td className="px-6 py-4 text-[#5d5c58]">{row.bat}</td>
                                <td className="px-6 py-4 text-[#5d5c58]">{row.lat}</td>
                                <td className="px-6 py-4 text-right text-emerald-600 font-medium">{row.rate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
            <Toast message={toast} onClose={() => setToast(null)} />
        </div>
    );
};

export const Notifications = () => {
    const [toast, setToast] = useState<string | null>(null);
    const [notifications, setNotifications] = useState([
         { title: 'Batch #3012 Successfully Anchored', desc: 'The batch was confirmed on Solana block 229102.', time: '2 mins ago', type: 'success' },
         { title: 'High Latency Warning', desc: 'Ingestion endpoint p99 latency exceeded 200ms for 5 minutes.', time: '1 hour ago', type: 'warning' },
         { title: 'New Schema Registered', desc: 'User "jdoe" registered schema "UserEvent v1.3.0".', time: '3 hours ago', type: 'info' },
         { title: 'Validator Connection Lost', desc: 'Connection to Validator Service pod-2 timed out.', time: 'Yesterday', type: 'error' },
    ]);

    const handleLoadMore = () => {
        setNotifications(prev => [
            ...prev,
            { title: 'System Maintenance Completed', desc: 'Scheduled maintenance for DB cluster finished.', time: '2 days ago', type: 'info' },
            { title: 'API Key Expiring', desc: 'Service account "Mobile App" token expires in 3 days.', time: '2 days ago', type: 'warning' }
        ]);
        setToast("Loaded 2 older notifications");
    }

    const FeedTab = () => (
        <div className="max-w-3xl mx-auto space-y-4">
             {notifications.map((notif, i) => (
                 <Card key={i} className="p-4 flex gap-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-[#BE3F2F]">
                     <div className={`mt-1 p-2 rounded-full h-fit border ${
                         notif.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                         notif.type === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                         notif.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                         'bg-blue-50 text-blue-700 border-blue-200'
                     }`}>
                         {notif.type === 'success' ? <CheckCircle size={18} /> :
                          notif.type === 'warning' ? <AlertCircle size={18} /> :
                          notif.type === 'error' ? <AlertCircle size={18} /> :
                          <Bell size={18} />}
                     </div>
                     <div className="flex-1">
                         <div className="flex justify-between items-start">
                             <h4 className="font-semibold text-[#1f1e1d] text-sm">{notif.title}</h4>
                             <span className="text-xs text-[#8c8b88]">{notif.time}</span>
                         </div>
                         <p className="text-sm text-[#5d5c58] mt-1">{notif.desc}</p>
                     </div>
                 </Card>
             ))}
             <button onClick={handleLoadMore} className="w-full py-2.5 text-sm text-[#5d5c58] hover:text-[#1f1e1d] border border-[#d6d3d0] rounded hover:bg-[#fbfbfa] transition-colors uppercase tracking-wide font-medium">Load Older Notifications</button>
        </div>
    );

    const [alertRules, setAlertRules] = useState([
        { id: 1, name: 'Anchor Failure Rate', cond: '> 1% failures / 5m', sev: 'Critical', chan: 'Slack #ops-alerts' },
        { id: 2, name: 'High Ingest Latency', cond: 'p99 > 500ms', sev: 'Warning', chan: 'Email' },
        { id: 3, name: 'Batch Stuck', cond: 'status=PENDING > 30m', sev: 'High', chan: 'PagerDuty' },
    ]);
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [newRule, setNewRule] = useState({ name: '', cond: '', sev: 'Warning', chan: 'Email' });

    const handleCreateRule = () => {
        if (!newRule.name || !newRule.cond) return;
        setAlertRules([{ id: Date.now(), ...newRule }, ...alertRules]);
        setToast(`Alert rule '${newRule.name}' created`);
        setIsRuleModalOpen(false);
        setNewRule({ name: '', cond: '', sev: 'Warning', chan: 'Email' });
    };

    const AlertsTab = () => (
        <div>
            <div className="flex justify-end mb-6">
                <button 
                    onClick={() => setIsRuleModalOpen(true)}
                    className={btnPrimary}
                >
                    <span className="flex items-center gap-2"><Plus size={16} /> Create Alert Rule</span>
                </button>
            </div>
            <Card className="overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#fbfbfa] border-b border-[#e0e0dc]">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58]">Rule Name</th>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58]">Condition</th>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58]">Severity</th>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58]">Channel</th>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58] text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f0ee]">
                        {alertRules.map((rule) => (
                            <tr key={rule.id} className="hover:bg-[#fcfbf9]">
                                <td className="px-6 py-4 font-medium text-[#1f1e1d]">{rule.name}</td>
                                <td className="px-6 py-4 text-[#5d5c58] font-mono text-xs">{rule.cond}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                        rule.sev === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                                        rule.sev === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                        'bg-amber-50 text-amber-700 border-amber-200'
                                    }`}>{rule.sev}</span>
                                </td>
                                <td className="px-6 py-4 text-[#5d5c58]">{rule.chan}</td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button className="p-1.5 text-[#8c8b88] hover:text-[#BE3F2F] hover:bg-[#f4f2f0] rounded"><SettingsIcon size={14} /></button>
                                    <button 
                                        onClick={() => {
                                            setAlertRules(prev => prev.filter(r => r.id !== rule.id));
                                            setToast("Rule deleted");
                                        }}
                                        className="p-1.5 text-[#8c8b88] hover:text-red-600 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            <Modal
                isOpen={isRuleModalOpen}
                onClose={() => setIsRuleModalOpen(false)}
                title="Create Alert Rule"
                footer={
                    <>
                        <button onClick={() => setIsRuleModalOpen(false)} className={btnSecondary}>Cancel</button>
                        <button onClick={handleCreateRule} className={btnPrimary}>Create Rule</button>
                    </>
                }
            >
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-[#5d5c58] mb-1.5 uppercase tracking-wide">Rule Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. High Error Rate"
                            className={formInputClass}
                            value={newRule.name}
                            onChange={e => setNewRule({...newRule, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#5d5c58] mb-1.5 uppercase tracking-wide">Condition (PromQL / SQL)</label>
                        <input 
                            type="text" 
                            placeholder="rate(http_requests_total[5m]) > 100"
                            className={formInputClass}
                            value={newRule.cond}
                            onChange={e => setNewRule({...newRule, cond: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-[#5d5c58] mb-1.5 uppercase tracking-wide">Severity</label>
                            <select 
                                className={formInputClass}
                                value={newRule.sev}
                                onChange={e => setNewRule({...newRule, sev: e.target.value})}
                            >
                                <option>Warning</option>
                                <option>High</option>
                                <option>Critical</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[#5d5c58] mb-1.5 uppercase tracking-wide">Channel</label>
                            <select 
                                className={formInputClass}
                                value={newRule.chan}
                                onChange={e => setNewRule({...newRule, chan: e.target.value})}
                            >
                                <option>Email</option>
                                <option>Slack</option>
                                <option>PagerDuty</option>
                                <option>Webhook</option>
                            </select>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );

    const tabs = [
        { id: 'feed', label: 'Activity Feed', icon: Bell, content: <FeedTab /> },
        { id: 'alerts', label: 'Alert Rules', icon: Shield, content: <AlertsTab /> },
    ];
    return (
    <>
        <Tabs tabs={tabs} />
        <Toast message={toast} onClose={() => setToast(null)} />
    </>
    );
};

export const Settings = () => {
    const [toast, setToast] = useState<string | null>(null);

    // Profile State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [profile, setProfile] = useState({ name: 'John Doe', email: 'john.doe@example.com', role: 'Admin' });
    const [editProfileData, setEditProfileData] = useState(profile);

    const handleSaveProfile = () => {
        setProfile(editProfileData);
        setToast("Profile updated successfully");
        setIsProfileModalOpen(false);
    };

    const ProfileTab = () => (
        <div className="max-w-3xl">
             <Card className="p-10">
                 <div className="flex items-center gap-8 mb-10">
                     <div className="w-24 h-24 bg-[#f4f2f0] rounded flex items-center justify-center text-[#8c8b88] text-3xl font-light">
                         {profile.name.split(' ').map(n => n[0]).join('')}
                     </div>
                     <div>
                         <h3 className="text-2xl font-light text-[#1f1e1d] mb-1">{profile.name}</h3>
                         <p className="text-[#5d5c58] font-medium">Senior DevOps Engineer</p>
                         <p className="text-[#8c8b88] text-sm mt-1">{profile.email}</p>
                     </div>
                     <button 
                        onClick={() => {
                            setEditProfileData(profile);
                            setIsProfileModalOpen(true);
                        }}
                        className={`ml-auto ${btnSecondary}`}
                     >
                         Edit Profile
                     </button>
                 </div>
                 
                 <div className="space-y-8 max-w-xl">
                     <div>
                         <label className="block text-xs font-semibold text-[#5d5c58] mb-2 uppercase tracking-wide">Full Name</label>
                         <input type="text" readOnly value={profile.name} className="w-full px-4 py-3 border border-[#e0e0dc] rounded bg-[#fbfbfa] text-[#5d5c58]" />
                     </div>
                     <div>
                         <label className="block text-xs font-semibold text-[#5d5c58] mb-2 uppercase tracking-wide">Email Address</label>
                         <input type="email" readOnly value={profile.email} className="w-full px-4 py-3 border border-[#e0e0dc] rounded bg-[#fbfbfa] text-[#5d5c58]" />
                     </div>
                     <div>
                         <label className="block text-xs font-semibold text-[#5d5c58] mb-2 uppercase tracking-wide">Role</label>
                         <input type="text" disabled value={profile.role} className="w-full px-4 py-3 border border-[#e0e0dc] rounded bg-[#fbfbfa] text-[#8c8b88]" />
                     </div>
                 </div>
             </Card>

             <Modal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                title="Edit Profile"
                footer={
                    <>
                        <button onClick={() => setIsProfileModalOpen(false)} className={btnSecondary}>Cancel</button>
                        <button onClick={handleSaveProfile} className={btnPrimary}>Save Changes</button>
                    </>
                }
             >
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-[#5d5c58] mb-1.5 uppercase tracking-wide">Full Name</label>
                        <input 
                            type="text" 
                            className={formInputClass}
                            value={editProfileData.name}
                            onChange={e => setEditProfileData({...editProfileData, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-[#5d5c58] mb-1.5 uppercase tracking-wide">Email Address</label>
                        <input 
                            type="email" 
                            className={formInputClass}
                            value={editProfileData.email}
                            onChange={e => setEditProfileData({...editProfileData, email: e.target.value})}
                        />
                    </div>
                </div>
             </Modal>
        </div>
    );

    const [tokens, setTokens] = useState([
        { id: 1, name: 'CI/CD Pipeline', prefix: 'sk_live_...9a2b', created: '2 months ago', used: 'Just now' },
        { id: 2, name: 'Mobile App', prefix: 'sk_live_...8821', created: '1 year ago', used: '2 hours ago' },
        { id: 3, name: 'Test Script', prefix: 'sk_test_...1102', created: '3 days ago', used: 'Never' },
    ]);
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
    const [newTokenName, setNewTokenName] = useState('');

    const handleGenerateToken = () => {
        if (!newTokenName) return;
        setTokens(prev => [{
            id: Date.now(),
            name: newTokenName,
            prefix: `sk_live_...${Math.floor(Math.random()*10000)}`,
            created: 'Just now',
            used: 'Never'
        }, ...prev]);
        setToast(`Token '${newTokenName}' generated`);
        setIsTokenModalOpen(false);
        setNewTokenName('');
    }

    const TokensTab = () => (
        <div>
             <div className="flex justify-between items-center mb-6">
                 <p className="text-sm text-[#5d5c58]">Manage API tokens for service accounts and external integrations.</p>
                 <button 
                    onClick={() => setIsTokenModalOpen(true)}
                    className={btnPrimary}
                 >
                    <span className="flex items-center gap-2"><Plus size={16} /> Generate New Token</span>
                 </button>
             </div>
             <Card className="overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-[#fbfbfa] border-b border-[#e0e0dc]">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58]">Token Name</th>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58]">Prefix</th>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58]">Created</th>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58]">Last Used</th>
                            <th className="px-6 py-4 font-semibold text-[#5d5c58] text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f0ee]">
                        {tokens.map((token) => (
                            <tr key={token.id} className="hover:bg-[#fcfbf9]">
                                <td className="px-6 py-4 font-medium text-[#1f1e1d]">{token.name}</td>
                                <td className="px-6 py-4 text-[#5d5c58] font-mono text-xs">{token.prefix}</td>
                                <td className="px-6 py-4 text-[#5d5c58]">{token.created}</td>
                                <td className="px-6 py-4 text-[#5d5c58]">{token.used}</td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => {
                                            setTokens(prev => prev.filter(t => t.id !== token.id));
                                            setToast("Token revoked");
                                        }}
                                        className="text-[#BE3F2F] hover:text-[#a33224] font-medium text-xs uppercase tracking-wide"
                                    >
                                        Revoke
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            <Modal
                isOpen={isTokenModalOpen}
                onClose={() => setIsTokenModalOpen(false)}
                title="Generate API Token"
                footer={
                    <>
                        <button onClick={() => setIsTokenModalOpen(false)} className={btnSecondary}>Cancel</button>
                        <button onClick={handleGenerateToken} className={btnPrimary}>Generate</button>
                    </>
                }
            >
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-[#5d5c58] mb-1.5 uppercase tracking-wide">Token Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Production Backend"
                            className={formInputClass}
                            value={newTokenName}
                            onChange={e => setNewTokenName(e.target.value)}
                        />
                        <p className="text-xs text-[#8c8b88] mt-2">
                            The token will be displayed only once. Make sure to copy it immediately.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
    
    const AppSettingsTab = () => (
         <div className="max-w-5xl space-y-8">
             <Card className="p-8">
                 <h4 className="font-light text-xl text-[#1f1e1d] mb-6">Environment Configuration</h4>
                 <div className="grid grid-cols-2 gap-8">
                     <div>
                         <label className="block text-xs font-bold text-[#8c8b88] uppercase tracking-widest mb-2">Anchor Service Endpoint</label>
                         <div className="p-3 bg-[#fbfbfa] rounded border border-[#e0e0dc] text-sm font-mono text-[#5d5c58]">http://anchor-service.internal:8080</div>
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-[#8c8b88] uppercase tracking-widest mb-2">Indexer Endpoint</label>
                         <div className="p-3 bg-[#fbfbfa] rounded border border-[#e0e0dc] text-sm font-mono text-[#5d5c58]">http://indexer-service.internal:3000</div>
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-[#8c8b88] uppercase tracking-widest mb-2">OpenSearch Host</label>
                         <div className="p-3 bg-[#fbfbfa] rounded border border-[#e0e0dc] text-sm font-mono text-[#5d5c58]">https://opensearch-cluster-a.aws.com</div>
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-[#8c8b88] uppercase tracking-widest mb-2">Kafka Broker</label>
                         <div className="p-3 bg-[#fbfbfa] rounded border border-[#e0e0dc] text-sm font-mono text-[#5d5c58]">kafka-prod-01:9092</div>
                     </div>
                 </div>
             </Card>
             <Card className="p-8 border-l-4 border-l-red-500">
                 <h4 className="font-light text-xl text-[#1f1e1d] mb-2">Danger Zone</h4>
                 <p className="text-sm text-[#5d5c58] mb-6">Actions here can cause system instability or data loss. Proceed with caution.</p>
                 <div className="flex gap-4">
                     <button onClick={() => setToast("Cache flushed")} className="px-4 py-2 bg-white border border-red-200 text-red-600 font-medium rounded hover:bg-red-50 shadow-sm text-sm">Flush Redis Cache</button>
                     <button onClick={() => setToast("Re-index job started")} className="px-4 py-2 bg-white border border-red-200 text-red-600 font-medium rounded hover:bg-red-50 shadow-sm text-sm">Re-Index All Anchors</button>
                 </div>
             </Card>
         </div>
    );

    const tabs = [
        { id: 'profile', label: 'My Profile', icon: User, content: <ProfileTab /> },
        { id: 'tokens', label: 'API Tokens', icon: Key, content: <TokensTab /> },
        { id: 'app', label: 'App Settings', icon: SettingsIcon, content: <AppSettingsTab /> },
    ];
    return (
    <>
        <Tabs tabs={tabs} />
        <Toast message={toast} onClose={() => setToast(null)} />
    </>
    );
};