/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Fingerprint, 
  Activity, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Camera, 
  Sparkles,
  RefreshCw,
  Bell,
  MapPin
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from 'recharts';
import { MatchLog, WatchlistAlert } from '../types';

interface DashboardViewProps {
  summary: {
    totalEnrolled: number;
    totalFaces: number;
    matchesToday: number;
    unknownToday: number;
    activeAlerts: number;
    settings: any;
  };
  matchLogs: MatchLog[];
  watchlistAlerts: WatchlistAlert[];
  onRefresh: () => void;
  onSelectTab: (tab: string) => void;
  onResolveAlert: (id: string, notes: string) => void;
}

export default function DashboardView({
  summary,
  matchLogs,
  watchlistAlerts,
  onRefresh,
  onSelectTab,
  onResolveAlert
}: DashboardViewProps) {
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [cameraSimulationActive, setCameraSimulationActive] = useState(false);
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>([]);

  // Simulate background camera scanning
  useEffect(() => {
    if (!cameraSimulationActive) return;

    const interval = setInterval(() => {
      const cameraFeeds = [
        'Turnstile 1 (South Gate)',
        'Server Room Corridor A',
        'Executive Elevator Lobby',
        'Visitor Reception Gate',
        'Loading Dock Side Cam'
      ];
      const feed = cameraFeeds[Math.floor(Math.random() * cameraFeeds.length)];
      
      // Random action
      const actions = [
        { type: 'match', text: 'Scanning stream... Biometric match detected: Muhammad Ali (Operations) - 94.2% similarity' },
        { type: 'unknown', text: 'Scanning stream... Unknown Face detected - Quality Passed (91%) - Enrolled under Unknown Logs' },
        { type: 'scan', text: 'Optimizing lens exposure... Video stream quality check: OK. Active 25 FPS' },
        { type: 'possible', text: 'Scanning stream... Possible Match: Sarah Khan (Executive Management) - 78.5% similarity' }
      ];

      // Occasional watchlist alert trigger
      const triggerWatchlist = Math.random() > 0.8;
      let logText = '';
      
      if (triggerWatchlist) {
        logText = `⚠️ ALERT! Watchlist Threat matched on camera "${feed}": Zameer Uddin (89.4% similarity). Sending push notifications to mobile terminals.`;
        onRefresh(); // Pull new alert automatically
      } else {
        const item = actions[Math.floor(Math.random() * actions.length)];
        logText = `[${new Date().toLocaleTimeString()}] [${feed}] ${item.text}`;
      }

      setSimulatedLogs(prev => [logText, ...prev.slice(0, 15)]);
    }, 4500);

    return () => clearInterval(interval);
  }, [cameraSimulationActive, onRefresh]);

  // Handle resolving alert
  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resolvingAlertId) {
      onResolveAlert(resolvingAlertId, resolutionNotes);
      setResolvingAlertId(null);
      setResolutionNotes('');
    }
  };

  // Prepare chart data for Recharts
  const chartData = [
    { hour: '08:00', Matches: 12, Possible: 2, Unknown: 4 },
    { hour: '09:00', Matches: 24, Possible: 4, Unknown: 8 },
    { hour: '10:00', Matches: 32, Possible: 5, Unknown: 12 },
    { hour: '11:00', Matches: 18, Possible: 3, Unknown: 7 },
    { hour: '12:00', Matches: 21, Possible: 6, Unknown: 9 },
    { hour: '13:00', Matches: summary.matchesToday, Possible: 4, Unknown: summary.unknownToday },
  ];

  const departmentData = [
    { name: 'Operations', value: 12, color: '#6366f1' },
    { name: 'Executives', value: 4, color: '#10b981' },
    { name: 'Contractors', value: 8, color: '#f59e0b' },
    { name: 'VIP Visitors', value: 3, color: '#ec4899' },
    { name: 'Watchlist', value: 1, color: '#ef4444' },
  ];

  const activeUnresolvedAlerts = watchlistAlerts.filter(a => a.status === 'Unresolved');

  return (
    <div className="space-y-6">
      {/* Top Welcome Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Security Operations Center</h1>
          <p className="text-gray-500 text-sm">Real-time facial detection and matching logs for <span className="font-semibold text-indigo-600">{summary.settings.activeBranch}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setCameraSimulationActive(!cameraSimulationActive);
              if (!cameraSimulationActive) {
                setSimulatedLogs([`[${new Date().toLocaleTimeString()}] Live video analyzer feed activated on port 3000.`]);
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              cameraSimulationActive 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
            }`}
          >
            <Camera className={`h-4 w-4 ${cameraSimulationActive ? 'animate-pulse' : ''}`} />
            {cameraSimulationActive ? 'Simulating CCTV Feed (Active)' : 'Simulate Live CCTV'}
          </button>
          <button 
            onClick={onRefresh}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Sync Dashboard
          </button>
        </div>
      </div>

      {/* Watchlist Threat Alert Banner */}
      {activeUnresolvedAlerts.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-600 rounded-r-xl p-4 shadow-sm animate-pulse flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-red-100 p-2 rounded-lg text-red-700 mt-1 md:mt-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-red-900 font-bold text-lg flex items-center gap-2">
                ACTIVE WATCHLIST THREAT DETECTED
                <span className="bg-red-200 text-red-800 text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider animate-bounce">Critical</span>
              </h2>
              <p className="text-red-700 text-sm">
                A face matching watchlist entry <strong>{activeUnresolvedAlerts[0].matchedPersonName}</strong> was identified at <strong>{activeUnresolvedAlerts[0].cameraSource}</strong> with <strong>{activeUnresolvedAlerts[0].similarityScore}% confidence</strong>. Intercept team alerted.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={() => {
                setResolvingAlertId(activeUnresolvedAlerts[0].id);
                setResolutionNotes('');
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm cursor-pointer"
            >
              Resolve / Force Clear
            </button>
            <button 
              onClick={() => onSelectTab('logs')}
              className="bg-white hover:bg-gray-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
            >
              View Alerts Log
            </button>
          </div>
        </div>
      )}

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Enrolled</span>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.totalEnrolled}</h3>
            <span className="text-indigo-600 text-[10px] font-medium flex items-center gap-1 mt-1 cursor-pointer" onClick={() => onSelectTab('directory')}>
              Manage Directory <ArrowRight className="h-3 w-3" />
            </span>
          </div>
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Face Samples</span>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.totalFaces}</h3>
            <span className="text-gray-400 text-[10px] mt-1 block">Vector models optimized</span>
          </div>
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <Fingerprint className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Matches Today</span>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.matchesToday}</h3>
            <span className="text-emerald-600 text-[10px] font-medium mt-1 block">✓ Biometrics matched</span>
          </div>
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600">
            <Activity className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unrecognized Faces</span>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.unknownToday}</h3>
            <span className="text-amber-600 text-[10px] font-medium mt-1 block">⚠ Non-enrolled persons</span>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Alerts</span>
            <h3 className="text-2xl font-bold text-red-600 mt-1">{summary.activeAlerts}</h3>
            <span className="text-red-500 text-[10px] font-medium mt-1 block">Requires response</span>
          </div>
          <div className="bg-red-50 p-3 rounded-xl text-red-600">
            <Bell className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Charts & Live Feed Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Area Chart for match trends */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Match Trend Volume</h3>
              <p className="text-gray-500 text-xs">Breakdown of matches, possible matches, and unknown faces today</p>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">Hourly Stream</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUnknown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="hour" stroke="#9ca3af" fontSize={10} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Matches" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMatches)" />
                <Area type="monotone" dataKey="Unknown" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUnknown)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Camera Simulator Feed / Ticker */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <h3 className="font-bold text-white text-sm tracking-wide">Live Stream Terminal</h3>
              </div>
              <span className="font-mono text-[9px] text-gray-500 uppercase">Port 3000 Ingress</span>
            </div>
            
            <div className="font-mono text-[11px] space-y-2 h-48 overflow-y-auto pr-1 text-gray-300">
              {simulatedLogs.length > 0 ? (
                simulatedLogs.map((log, idx) => (
                  <div key={idx} className={`p-1.5 rounded ${
                    log.includes('ALERT') 
                      ? 'bg-red-950/50 text-red-400 border border-red-900/30' 
                      : log.includes('Unknown') 
                        ? 'bg-amber-950/20 text-amber-400' 
                        : 'bg-gray-950/30'
                  }`}>
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-center py-10">
                  <Camera className="h-8 w-8 mx-auto mb-2 text-gray-700" />
                  <p>Simulation inactive.</p>
                  <p className="text-[9px] mt-1">Click &ldquo;Simulate Live CCTV&rdquo; above to stream background biometric match attempts.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-800 text-center">
            <button 
              onClick={() => onSelectTab('matching')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition-all cursor-pointer"
            >
              Open Face Matching Lab <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Second Row Charts and Recent Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Bar Chart for departments */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Enrolled Categories</h3>
            <p className="text-gray-500 text-xs mb-4">Biometric distribution across system roles</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} margin={{ left: -30 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" fontSize={9} stroke="#9ca3af" />
                <YAxis fontSize={9} stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {departmentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent match history short list */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Recent Biometric Matches</h3>
              <p className="text-gray-500 text-xs">Real-time history logs for direct review</p>
            </div>
            <button 
              onClick={() => onSelectTab('logs')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
            >
              Full Log History
            </button>
          </div>

          <div className="space-y-3 max-h-56 overflow-y-auto">
            {matchLogs.slice(0, 4).map((log, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-lg border border-gray-50 transition-all">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs uppercase tracking-wider ${
                    log.matchStatus === 'Match' 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : log.matchStatus === 'Possible Match' 
                        ? 'bg-amber-50 text-amber-700' 
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    {log.matchedPersonName ? log.matchedPersonName.slice(0, 2) : 'FS'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {log.matchedPersonName || 'Unknown Visitor / Outsider'}
                    </h4>
                    <p className="text-gray-400 text-xs flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(log.timestamp).toLocaleTimeString()} &bull; {log.cameraSource}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs px-2.5 py-0.5 rounded-full font-bold inline-block border ${
                    log.matchStatus === 'Match' 
                      ? 'bg-emerald-50/50 text-emerald-700 border-emerald-100' 
                      : log.matchStatus === 'Possible Match' 
                        ? 'bg-amber-50/50 text-amber-700 border-amber-100' 
                        : 'bg-gray-50 text-gray-700 border-gray-100'
                  }`}>
                    {log.matchStatus}
                  </div>
                  <p className="text-xs font-mono font-medium text-gray-500 mt-1">
                    Similarity: {log.similarityScore}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert Resolution Dialog Modal */}
      {resolvingAlertId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h3 className="font-bold text-lg text-gray-900">Resolve Watchlist Security Incident</h3>
            </div>
            <p className="text-gray-500 text-xs">
              Confirm that intercept operations are resolved, physical threat has been escorted from facility margins, and log notes. This action is permanently audited.
            </p>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Security Incident Notes *</label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  placeholder="e.g., Suspect escorted. ID checked: 11111-1111111-1, false positive or positive mismatch corrected."
                  className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlertId(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium cursor-pointer shadow-sm"
                >
                  Resolve Threat & Reset Feed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
