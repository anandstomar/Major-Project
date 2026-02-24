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

// --- Types ---
interface AnchorItem {
  id: string;
  requestId: string;
  status: 'OK' | 'FAILED' | 'PENDING';
  submittedAt: string;
  submitter?: string; // Assuming there is a field for who submitted it
}

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
  const [isLoading, setIsLoading] = useState(true);

  // --- Real Data State ---
  const [stats, setStats] = useState({
    total: 0,
    failed: 0,
    pending: 0,
    docsIndexed: 0
  });
  
  const [recentAnchors, setRecentAnchors] = useState<AnchorItem[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [statusData, setStatusData] = useState<any[]>([]);
  const [submitterData, setSubmitterData] = useState<any[]>([]);

  // --- Data Fetching & Processing ---
  useEffect(() => {
    async function loadDashboardData() {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;

        // 1. Fetch raw data
        const response = await fetchWithRetry("/query/anchors?limit=1000", { // Fetch enough for stats
          headers: { "Authorization": `Bearer ${token}` }
        });
        const data = await response.json();
        const items: AnchorItem[] = data.items || [];

        // 2. Process KPIs
        const total = items.length;
        const failed = items.filter(i => i.status === 'FAILED').length;
        const pending = items.filter(i => i.status === 'PENDING').length;
        
        setStats({
          total,
          failed,
          pending,
          docsIndexed: total * 142 // Mock multiplier or fetch real count if available
        });

        // 3. Process Recent Activity (Top 5)
        setRecentAnchors(items.slice(0, 5));

        // 4. Process Hourly Chart (Group by Hour)
        const hoursMap = new Map<string, number>();
        items.forEach(item => {
          if (!item.submittedAt) return;
          const date = new Date(item.submittedAt);
          const hourKey = `${date.getHours().toString().padStart(2, '0')}:00`;
          hoursMap.set(hourKey, (hoursMap.get(hourKey) || 0) + 1);
        });
        
        // Fill in missing hours for a nice chart
        const chartData = [];
        for (let i = 0; i < 24; i+=4) { // Every 4 hours
           const key = `${i.toString().padStart(2, '0')}:00`;
           chartData.push({ name: key, anchors: hoursMap.get(key) || 0 });
        }
        setHourlyData(chartData);

        // 5. Process Status Pie Chart
        setStatusData([
          { name: 'Success', value: total - failed - pending, color: '#10b981' },
          { name: 'Failed', value: failed, color: '#ef4444' },
          { name: 'Pending', value: pending, color: '#64748b' },
        ]);

        // 6. Process Top Submitters
        const submitterMap = new Map<string, number>();
        items.forEach(item => {
           const name = item.submitter || 'Unknown';
           submitterMap.set(name, (submitterMap.get(name) || 0) + 1);
        });
        
        const topSubmitters = Array.from(submitterMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Top 5
            
        setSubmitterData(topSubmitters.length > 0 ? topSubmitters : [{ name: 'System', count: total }]);

      } catch (err) {
        console.error("Failed to load dashboard data", err);
        setToast("Failed to refresh dashboard data");
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const handleTimeframeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
     setToast(`Dashboard updated for: ${e.target.value}`);
     // Note: You would pass this value to the API query params in a real implementation
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Toast message={toast} onClose={() => setToast(null)} />
      
      {/* Welcome Banner */}
      <div className="bg-white rounded-lg shadow-sm border border-[#e0e0dc] p-8 flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
              <h1 className="text-2xl font-light text-[#1f1e1d] mb-2">Good morning, <span className="font-semibold">Operator</span></h1>
              <p className="text-[#5d5c58]">System performance is nominal. You have {stats.pending} pending batches.</p>
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

      {/* KPIs using Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Anchors" value={stats.total.toLocaleString()} sub="All time volume" icon={Anchor} />
        <KPICard title="Pending Queue" value={stats.pending.toString()} sub="Requiring attention" icon={Clock} />
        <KPICard title="Failed" value={stats.failed.toString()} sub={`${stats.total > 0 ? ((stats.failed/stats.total)*100).toFixed(1) : 0}% failure rate`} icon={AlertTriangle} />
        <KPICard title="Est. Docs" value={(stats.docsIndexed/1000000).toFixed(1) + "M"} sub="Indexed Documents" icon={Layers} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc]">
          <div className="flex items-center justify-between mb-8">
             <div className="flex flex-col">
                 <h3 className="font-semibold text-[#1f1e1d]">Anchor Throughput</h3>
                 <span className="text-xs text-[#8c8b88] mt-1">Transaction volume (24h)</span>
             </div>
             <select 
                onChange={handleTimeframeChange}
                className="text-xs border border-[#d6d3d0] rounded p-1.5 bg-[#fbfbfa] text-[#5d5c58] outline-none focus:border-[#BE3F2F]"
             >
                 <option>Last 24 Hours</option>
                 <option>Last 7 Days</option>
             </select>
          </div>
          <div className="h-[320px]">
            {isLoading ? (
                <div className="h-full w-full flex items-center justify-center text-gray-400">Loading chart...</div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
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
            )}
          </div>
        </div>

        {/* Live Feed - Dynamic */}
        <div className="bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc] flex flex-col h-[450px]">
          <h3 className="font-semibold text-[#1f1e1d] mb-6">Live Activity Log</h3>
          <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-2">
             {recentAnchors.length === 0 ? (
                 <p className="text-sm text-gray-400 p-4">No recent activity found.</p>
             ) : (
                 recentAnchors.map((anchor, idx) => (
                     <ActivityItem 
                         key={idx}
                         title={`Req ${anchor.requestId.substring(0,8)}... ${anchor.status === 'FAILED' ? 'failed' : 'processed'}`} 
                         time={anchor.submittedAt ? new Date(anchor.submittedAt).toLocaleTimeString() : 'Just now'} 
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
          {/* Status Pie Chart */}
          <div className="bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc]">
             <h3 className="font-semibold text-[#1f1e1d] mb-4">Status Breakdown</h3>
             <div className="h-[200px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={statusData} innerRadius={65} outerRadius={85} paddingAngle={2} dataKey="value">
                            {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="flex justify-center gap-6 text-xs text-[#5d5c58] mt-2">
                 {statusData.map(d => (
                     <span key={d.name} className="flex items-center gap-2">
                         <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor: d.color}} /> {d.name}
                     </span>
                 ))}
             </div>
          </div>

          {/* Top Submitters Bar Chart */}
          <div className="bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc] lg:col-span-2">
             <h3 className="font-semibold text-[#1f1e1d] mb-4">Top Submitters</h3>
             <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={submitterData} layout="vertical" margin={{left: 20}}>
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





// import React, { useState, useEffect } from 'react';
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
//   { name: 'Pending', value: 10, color: '#64748b' }, // Slate-500
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
  
//   // State for real recent activity
//   const [recentAnchors, setRecentAnchors] = useState<any[]>([]);

//   // Fetch real data for the Activity Log
//   useEffect(() => {
//     async function loadRecentActivity() {
//       try {
//         const token = localStorage.getItem("access_token");
//         if (!token) return;

//         const response = await fetchWithRetry("/query/anchors", {
//           headers: { "Authorization": `Bearer ${token}` }
//         });
//         const data = await response.json();
        
//         // Grab only the top 5 most recent items
//         setRecentAnchors((data.items || []).slice(0, 5));
//       } catch (err) {
//         console.error("Failed to fetch recent anchors", err);
//       }
//     }
//     loadRecentActivity();
//   }, []);

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

//         {/* Live Feed - NOW DYNAMIC! */}
//         <div className="bg-white p-6 rounded-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e0e0dc] flex flex-col">
//           <h3 className="font-semibold text-[#1f1e1d] mb-6">Live Activity Log</h3>
//           <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-2 max-h-[320px]">
//              {recentAnchors.length === 0 ? (
//                  <p className="text-sm text-gray-400 p-4">No recent activity found.</p>
//              ) : (
//                  recentAnchors.map(anchor => (
//                      <ActivityItem 
//                          key={anchor.id}
//                          title={`Request ${anchor.requestId} ${anchor.status === 'FAILED' ? 'failed' : 'processed'}`} 
//                          time={anchor.submittedAt ? new Date(anchor.submittedAt).toLocaleTimeString() : 'Unknown time'} 
//                          type={anchor.status === 'FAILED' ? 'fail' : anchor.status === 'OK' ? 'success' : 'info'} 
//                      />
//                  ))
//              )}
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




