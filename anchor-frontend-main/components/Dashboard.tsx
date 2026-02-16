import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';
import { Activity, Anchor, AlertTriangle, Clock, Layers, ArrowRight } from 'lucide-react';
import { IllusBanner } from './ui/Assets';
import { Toast } from './ui/Toast';
import { fetchWithRetry } from '../utils/api';

const dataHourly = [
  { name: '00:00', anchors: 400 },
  { name: '04:00', anchors: 300 },
  { name: '08:00', anchors: 200 },
  { name: '12:00', anchors: 2780 },
  { name: '16:00', anchors: 1890 },
  { name: '20:00', anchors: 2390 },
  { name: '23:59', anchors: 3490 },
];

const dataStatus = [
  { name: 'Success', value: 85, color: '#10b981' }, // Emerald-500
  { name: 'Failed', value: 5, color: '#ef4444' },  // Red-500
  { name: 'Pending', value: 10, color: '#64748b' }, // Slate-500
];

const dataSubmitters = [
  { name: 'Client A', count: 4000 },
  { name: 'Client B', count: 3000 },
  { name: 'Client C', count: 2000 },
  { name: 'Internal', count: 2780 },
];

const KPICard = ({ title, value, sub, icon: Icon }: any) => (
  <div className="bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc] border-t-4 border-t-transparent hover:border-t-[#BE3F2F] transition-all group">
    <div className="flex justify-between items-start mb-4">
        <p className="text-sm font-semibold text-[#5d5c58] uppercase tracking-wide">{title}</p>
        <Icon size={18} className="text-[#8c8b88] group-hover:text-[#BE3F2F] transition-colors" />
    </div>
    <h3 className="text-3xl font-light text-[#1f1e1d] tracking-tight">{value}</h3>
    {sub && <p className={`text-xs mt-2 font-medium ${sub.includes('+') ? 'text-emerald-600' : 'text-[#8c8b88]'}`}>{sub}</p>}
  </div>
);

const ActivityItem = ({ title, time, type }: {title: string, time: string, type: 'success' | 'fail' | 'info' }) => (
    <div className="flex gap-4 items-center py-4 border-b border-[#f1f0ee] last:border-0 hover:bg-[#fcfbf9] px-2 -mx-2 rounded transition-colors cursor-default">
        <div className={`w-2 h-2 shrink-0 rounded-full ${
            type === 'success' ? 'bg-emerald-500' : type === 'fail' ? 'bg-red-500' : 'bg-blue-500'
        }`} />
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#1f1e1d] truncate">{title}</p>
            <p className="text-xs text-[#8c8b88] mt-0.5">{time}</p>
        </div>
        <ArrowRight size={14} className="text-[#d6d3d0]" />
    </div>
)

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);
  
  // State for real recent activity
  const [recentAnchors, setRecentAnchors] = useState<any[]>([]);

  // Fetch real data for the Activity Log
  useEffect(() => {
    async function loadRecentActivity() {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        const response = await fetchWithRetry("/query/anchors", {
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        
        // Grab only the top 5 most recent items
        setRecentAnchors((data.items || []).slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch recent anchors", err);
      }
    }
    loadRecentActivity();
  }, []);

  const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
     setToast(`Dashboard updated for: ${e.target.value}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Toast message={toast} onClose={() => setToast(null)} />
      
      {/* Welcome Banner */}
      <div className="bg-white rounded-lg shadow-sm border border-[#e0e0dc] p-8 flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
              <h1 className="text-2xl font-light text-[#1f1e1d] mb-2">Good morning, <span className="font-semibold">John Doe</span></h1>
              <p className="text-[#5d5c58]">System performance is nominal. You have 3 pending batches requiring authorization.</p>
              <div className="mt-6 flex gap-3">
                  <button 
                    onClick={() => navigate('/scheduler')}
                    className="px-4 py-2 bg-[#BE3F2F] text-white text-sm font-medium rounded shadow-sm hover:bg-[#a33224] transition-colors"
                  >
                    Review Batches
                  </button>
                  <button 
                    onClick={() => navigate('/search')}
                    className="px-4 py-2 bg-white border border-[#d6d3d0] text-[#5d5c58] text-sm font-medium rounded hover:bg-[#fbfbfa] transition-colors"
                  >
                    View System Logs
                  </button>
              </div>
          </div>
          <div className="hidden md:block opacity-80 scale-125 origin-right">
              <IllusBanner />
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Anchors Today" value="14,203" sub="+12% from yesterday" icon={Anchor} />
        <KPICard title="Pending Queue" value="45" sub="Next batch in 5m" icon={Clock} />
        <KPICard title="Failed (24h)" value="23" sub="0.16% failure rate" icon={AlertTriangle} />
        <KPICard title="Docs Indexed" value="8.4M" sub="OpenSearch Cluster A" icon={Layers} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc]">
          <div className="flex items-center justify-between mb-8">
             <div className="flex flex-col">
                 <h3 className="font-semibold text-[#1f1e1d]">Anchor Throughput</h3>
                 <span className="text-xs text-[#8c8b88] mt-1">Transaction volume per hour</span>
             </div>
             <select 
                onChange={handleTimeframeChange}
                className="text-xs border border-[#d6d3d0] rounded p-1.5 bg-[#fbfbfa] text-[#5d5c58] outline-none focus:border-[#BE3F2F]"
             >
                 <option>Last 24 Hours</option>
                 <option>Last 7 Days</option>
                 <option>Last 30 Days</option>
             </select>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataHourly}>
                <defs>
                  <linearGradient id="colorAnchors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#BE3F2F" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#BE3F2F" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f0ee" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#8c8b88'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#8c8b88'}} />
                <Tooltip 
                    contentStyle={{borderRadius: '4px', border: '1px solid #e0e0dc', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}} 
                />
                <Area type="monotone" dataKey="anchors" stroke="#BE3F2F" strokeWidth={2} fillOpacity={1} fill="url(#colorAnchors)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Feed - NOW DYNAMIC! */}
        <div className="bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc] flex flex-col">
          <h3 className="font-semibold text-[#1f1e1d] mb-6">Live Activity Log</h3>
          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-2 max-h-[320px]">
             {recentAnchors.length === 0 ? (
                 <p className="text-sm text-gray-400 p-4">No recent activity found.</p>
             ) : (
                 recentAnchors.map(anchor => (
                     <ActivityItem 
                         key={anchor.id}
                         title={`Request ${anchor.requestId} ${anchor.status === 'FAILED' ? 'failed' : 'processed'}`} 
                         time={anchor.submittedAt ? new Date(anchor.submittedAt).toLocaleTimeString() : 'Unknown time'} 
                         type={anchor.status === 'FAILED' ? 'fail' : anchor.status === 'OK' ? 'success' : 'info'} 
                     />
                 ))
             )}
          </div>
          <button 
            onClick={() => navigate('/notifications')}
            className="mt-6 w-full py-2.5 text-xs font-semibold text-[#5d5c58] bg-[#fbfbfa] border border-[#e0e0dc] rounded hover:bg-[#f4f2f0] transition-all uppercase tracking-wide"
          >
            View Full Log
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc]">
             <h3 className="font-semibold text-[#1f1e1d] mb-4">Status Breakdown</h3>
             <div className="h-[200px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={dataStatus} innerRadius={65} outerRadius={85} paddingAngle={2} dataKey="value">
                            {dataStatus.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="flex justify-center gap-6 text-xs text-[#5d5c58] mt-2">
                 {dataStatus.map(d => (
                     <span key={d.name} className="flex items-center gap-2">
                         <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: d.color}} /> {d.name}
                     </span>
                 ))}
             </div>
          </div>

          <div className="bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc] lg:col-span-2">
             <h3 className="font-semibold text-[#1f1e1d] mb-4">Top Submitters</h3>
             <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataSubmitters} layout="vertical" margin={{left: 20}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f0ee" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{fontSize: 12, fill: '#5d5c58'}} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '4px', border: '1px solid #e0e0dc'}} />
                        <Bar dataKey="count" fill="#4f46e5" radius={[0, 2, 2, 0]} barSize={16} />
                    </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>
    </div>
  );
};









// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { 
//   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
//   BarChart, Bar, PieChart, Pie, Cell 
// } from 'recharts';
// import { Activity, Anchor, AlertTriangle, Clock, Layers, ArrowRight } from 'lucide-react';
// import { IllusBanner } from './ui/Assets';
// import { Toast } from './ui/Toast';
// import { fetchWithRetry } from '../utils/api';

// const dataHourly = [
//   { name: '00:00', anchors: 400 },
//   { name: '04:00', anchors: 300 },
//   { name: '08:00', anchors: 200 },
//   { name: '12:00', anchors: 2780 },
//   { name: '16:00', anchors: 1890 },
//   { name: '20:00', anchors: 2390 },
//   { name: '23:59', anchors: 3490 },
// ];

// const dataStatus = [
//   { name: 'Success', value: 85, color: '#10b981' }, // Emerald-500
//   { name: 'Failed', value: 5, color: '#ef4444' },  // Red-500
//   { name: 'Pending', value: 10, color: '#64748b' }, // Slate-500 (Matches new Badge Pending)
// ];

// const dataSubmitters = [
//   { name: 'Client A', count: 4000 },
//   { name: 'Client B', count: 3000 },
//   { name: 'Client C', count: 2000 },
//   { name: 'Internal', count: 2780 },
// ];

// const KPICard = ({ title, value, sub, icon: Icon }: any) => (
//   <div className="bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc] border-t-4 border-t-transparent hover:border-t-[#BE3F2F] transition-all group">
//     <div className="flex justify-between items-start mb-4">
//         <p className="text-sm font-semibold text-[#5d5c58] uppercase tracking-wide">{title}</p>
//         <Icon size={18} className="text-[#8c8b88] group-hover:text-[#BE3F2F] transition-colors" />
//     </div>
//     <h3 className="text-3xl font-light text-[#1f1e1d] tracking-tight">{value}</h3>
//     {sub && <p className={`text-xs mt-2 font-medium ${sub.includes('+') ? 'text-emerald-600' : 'text-[#8c8b88]'}`}>{sub}</p>}
//   </div>
// );

// const ActivityItem = ({ title, time, type }: {title: string, time: string, type: 'success' | 'fail' | 'info' }) => (
//     <div className="flex gap-4 items-center py-4 border-b border-[#f1f0ee] last:border-0 hover:bg-[#fcfbf9] px-2 -mx-2 rounded transition-colors cursor-default">
//         <div className={`w-2 h-2 shrink-0 rounded-full ${
//             type === 'success' ? 'bg-emerald-500' : type === 'fail' ? 'bg-red-500' : 'bg-blue-500'
//         }`} />
//         <div className="flex-1 min-w-0">
//             <p className="text-sm font-medium text-[#1f1e1d] truncate">{title}</p>
//             <p className="text-xs text-[#8c8b88] mt-0.5">{time}</p>
//         </div>
//         <ArrowRight size={14} className="text-[#d6d3d0]" />
//     </div>
// )

// export const Dashboard: React.FC = () => {
//   const navigate = useNavigate();
//   const [toast, setToast] = useState<string | null>(null);

//   const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//      setToast(`Dashboard updated for: ${e.target.value}`);
//   };

//   return (
//     <div className="space-y-8 animate-in fade-in duration-500">
//       <Toast message={toast} onClose={() => setToast(null)} />
      
//       {/* Welcome Banner */}
//       <div className="bg-white rounded-lg shadow-sm border border-[#e0e0dc] p-8 flex items-center justify-between relative overflow-hidden">
//           <div className="relative z-10 max-w-xl">
//               <h1 className="text-2xl font-light text-[#1f1e1d] mb-2">Good morning, <span className="font-semibold">John Doe</span></h1>
//               <p className="text-[#5d5c58]">System performance is nominal. You have 3 pending batches requiring authorization.</p>
//               <div className="mt-6 flex gap-3">
//                   <button 
//                     onClick={() => navigate('/scheduler')}
//                     className="px-4 py-2 bg-[#BE3F2F] text-white text-sm font-medium rounded shadow-sm hover:bg-[#a33224] transition-colors"
//                   >
//                     Review Batches
//                   </button>
//                   <button 
//                     onClick={() => navigate('/search')}
//                     className="px-4 py-2 bg-white border border-[#d6d3d0] text-[#5d5c58] text-sm font-medium rounded hover:bg-[#fbfbfa] transition-colors"
//                   >
//                     View System Logs
//                   </button>
//               </div>
//           </div>
//           <div className="hidden md:block opacity-80 scale-125 origin-right">
//               <IllusBanner />
//           </div>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         <KPICard title="Anchors Today" value="14,203" sub="+12% from yesterday" icon={Anchor} />
//         <KPICard title="Pending Queue" value="45" sub="Next batch in 5m" icon={Clock} />
//         <KPICard title="Failed (24h)" value="23" sub="0.16% failure rate" icon={AlertTriangle} />
//         <KPICard title="Docs Indexed" value="8.4M" sub="OpenSearch Cluster A" icon={Layers} />
//       </div>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Main Chart */}
//         <div className="lg:col-span-2 bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc]">
//           <div className="flex items-center justify-between mb-8">
//              <div className="flex flex-col">
//                  <h3 className="font-semibold text-[#1f1e1d]">Anchor Throughput</h3>
//                  <span className="text-xs text-[#8c8b88] mt-1">Transaction volume per hour</span>
//              </div>
//              <select 
//                 onChange={handleTimeframeChange}
//                 className="text-xs border border-[#d6d3d0] rounded p-1.5 bg-[#fbfbfa] text-[#5d5c58] outline-none focus:border-[#BE3F2F]"
//              >
//                  <option>Last 24 Hours</option>
//                  <option>Last 7 Days</option>
//                  <option>Last 30 Days</option>
//              </select>
//           </div>
//           <div className="h-[320px]">
//             <ResponsiveContainer width="100%" height="100%">
//               <AreaChart data={dataHourly}>
//                 <defs>
//                   <linearGradient id="colorAnchors" x1="0" y1="0" x2="0" y2="1">
//                     <stop offset="5%" stopColor="#BE3F2F" stopOpacity={0.1}/>
//                     <stop offset="95%" stopColor="#BE3F2F" stopOpacity={0}/>
//                   </linearGradient>
//                 </defs>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f0ee" />
//                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#8c8b88'}} dy={10} />
//                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#8c8b88'}} />
//                 <Tooltip 
//                     contentStyle={{borderRadius: '4px', border: '1px solid #e0e0dc', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}} 
//                 />
//                 <Area type="monotone" dataKey="anchors" stroke="#BE3F2F" strokeWidth={2} fillOpacity={1} fill="url(#colorAnchors)" />
//               </AreaChart>
//             </ResponsiveContainer>
//           </div>
//         </div>

//         {/* Live Feed */}
//         <div className="bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc] flex flex-col">
//           <h3 className="font-semibold text-[#1f1e1d] mb-6">Live Activity Log</h3>
//           <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-2 max-h-[320px]">
//              <ActivityItem title="Batch #8821 confirmed on Solana" time="2 mins ago" type="success" />
//              <ActivityItem title="Ingest job 'manifest-prod-v2' completed" time="15 mins ago" type="success" />
//              <ActivityItem title="Validator warning: Schema mismatch in row 405" time="32 mins ago" type="fail" />
//              <ActivityItem title="Scheduler triggered gas estimation" time="45 mins ago" type="info" />
//              <ActivityItem title="User 'admin' updated ArgoCD App 'anchor-service'" time="1 hour ago" type="info" />
//           </div>
//           <button 
//             onClick={() => navigate('/notifications')}
//             className="mt-6 w-full py-2.5 text-xs font-semibold text-[#5d5c58] bg-[#fbfbfa] border border-[#e0e0dc] rounded hover:bg-[#f4f2f0] transition-all uppercase tracking-wide"
//           >
//             View Full Log
//           </button>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           <div className="bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc]">
//              <h3 className="font-semibold text-[#1f1e1d] mb-4">Status Breakdown</h3>
//              <div className="h-[200px] flex items-center justify-center">
//                 <ResponsiveContainer width="100%" height="100%">
//                     <PieChart>
//                         <Pie data={dataStatus} innerRadius={65} outerRadius={85} paddingAngle={2} dataKey="value">
//                             {dataStatus.map((entry, index) => (
//                                 <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
//                             ))}
//                         </Pie>
//                         <Tooltip />
//                     </PieChart>
//                 </ResponsiveContainer>
//              </div>
//              <div className="flex justify-center gap-6 text-xs text-[#5d5c58] mt-2">
//                  {dataStatus.map(d => (
//                      <span key={d.name} className="flex items-center gap-2">
//                          <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: d.color}} /> {d.name}
//                      </span>
//                  ))}
//              </div>
//           </div>

//           <div className="bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc] lg:col-span-2">
//              <h3 className="font-semibold text-[#1f1e1d] mb-4">Top Submitters</h3>
//              <div className="h-[200px]">
//                 <ResponsiveContainer width="100%" height="100%">
//                     <BarChart data={dataSubmitters} layout="vertical" margin={{left: 20}}>
//                         <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f0ee" />
//                         <XAxis type="number" hide />
//                         <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{fontSize: 12, fill: '#5d5c58'}} />
//                         <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '4px', border: '1px solid #e0e0dc'}} />
//                         <Bar dataKey="count" fill="#4f46e5" radius={[0, 2, 2, 0]} barSize={16} />
//                     </BarChart>
//                 </ResponsiveContainer>
//              </div>
//           </div>
//       </div>
//     </div>
//   );
// };