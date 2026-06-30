/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  UserPlus, 
  Target, 
  Users, 
  History, 
  Smartphone, 
  Sliders, 
  FileCode, 
  Bell, 
  ShieldAlert, 
  X, 
  MapPin, 
  CheckCircle,
  Loader2
} from 'lucide-react';

// Components
import DashboardView from './components/DashboardView';
import EnrollmentView from './components/EnrollmentView';
import MatchingLab from './components/MatchingLab';
import DirectoryView from './components/DirectoryView';
import LogsView from './components/LogsView';
import MobileSimulator from './components/MobileSimulator';
import SettingsView from './components/SettingsView';
import DeliverablesExplorer from './components/DeliverablesExplorer';

// Types
import { Person, MatchLog, EnrollmentLog, AuditLog, SystemSettings } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [persons, setPersons] = useState<Person[]>([]);
  const [matchLogs, setMatchLogs] = useState<MatchLog[]>([]);
  const [enrollmentLogs, setEnrollmentLogs] = useState<EnrollmentLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [watchlistAlerts, setWatchlistAlerts] = useState<any[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  // App loading and notification states
  const [loading, setLoading] = useState(true);
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);
  const [isResolvingAlert, setIsResolvingAlert] = useState<string | null>(null);

  // Synchronize master application telemetry
  const fetchAllTelemetry = async () => {
    try {
      // Parallel fetches to prevent request blocking cascades
      const [personsRes, matchRes, enrollRes, auditRes, alertRes, settingsRes] = await Promise.all([
        fetch('/api/persons'),
        fetch('/api/logs/match'),
        fetch('/api/logs/enrollment'),
        fetch('/api/logs/audit'),
        fetch('/api/logs/alerts'),
        fetch('/api/settings')
      ]);

      const [personsData, matchData, enrollData, auditData, alertData, settingsData] = await Promise.all([
        personsRes.json(),
        matchRes.json(),
        enrollRes.json(),
        auditRes.json(),
        alertRes.json(),
        settingsRes.json()
      ]);

      setPersons(personsData || []);
      setMatchLogs(matchData || []);
      setEnrollmentLogs(enrollData || []);
      setAuditLogs(auditData || []);
      setWatchlistAlerts(alertData || []);
      setSettings(settingsData);
    } catch (err) {
      console.error('Error fetching master telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllTelemetry();
    // Intermittent poll to catch background CCTV stream matches / alerts
    const interval = setInterval(fetchAllTelemetry, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSettings = async (updatedSettings: SystemSettings) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedSettings, operator: 'Super Admin' })
      });
      if (res.ok) {
        fetchAllTelemetry();
      }
    } catch (err) {
      console.error('Error writing settings:', err);
    }
  };

  // Resolve threat alerts
  const handleResolveAlert = async (id: string, notes: string) => {
    setIsResolvingAlert(id);
    try {
      const res = await fetch(`/api/watchlist/resolve/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, operator: 'Super Admin' })
      });
      if (res.ok) {
        fetchAllTelemetry();
      }
    } catch (err) {
      console.error('Error resolving watchlist trigger:', err);
    } finally {
      setIsResolvingAlert(null);
    }
  };

  const unresolvedAlerts = watchlistAlerts.filter(a => a.status === 'Unresolved');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        <span className="text-xs font-mono font-bold text-gray-500 uppercase tracking-wider">Securing FaceMatch Pro Kernel...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans text-gray-800">
      
      {/* GLOBAL HEADER BAR */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-xl flex items-center justify-center shadow-md shadow-indigo-600/15">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-gray-900 leading-none">FaceMatch Pro</h1>
            <p className="text-[10px] text-gray-400 font-mono mt-1 flex items-center gap-1 uppercase tracking-wider font-bold">
              <MapPin className="h-3 w-3 text-indigo-500" />
              Portal: {settings?.activeBranch || 'Corporate HQ'}
            </p>
          </div>
        </div>

        {/* ALERTS DROP-DOWN DISPATCH */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowAlertDropdown(!showAlertDropdown)}
              className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl relative cursor-pointer transition-all flex items-center justify-center"
            >
              <Bell className="h-4.5 w-4.5 text-gray-600" />
              {unresolvedAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unresolvedAlerts.length}
                </span>
              )}
            </button>

            {showAlertDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-100 rounded-xl shadow-xl z-50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                  <h4 className="font-extrabold text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                    Threat Dispatch Alerts
                  </h4>
                  <button onClick={() => setShowAlertDropdown(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2.5">
                  {unresolvedAlerts.length > 0 ? (
                    unresolvedAlerts.map((alert) => (
                      <div key={alert.id} className="bg-red-50/50 border border-red-100 p-3 rounded-lg space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[8px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase">Watchlist Spot</span>
                            <h5 className="font-bold text-xs text-red-950 mt-1">{alert.matchedPersonName}</h5>
                            <p className="text-[9px] text-gray-500 mt-0.5">Location: {alert.cameraSource}</p>
                            <p className="text-[9px] text-gray-500 font-mono mt-0.5">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                          </div>
                          <span className="text-[10px] font-bold text-red-600 font-mono">{alert.similarityScore}%</span>
                        </div>

                        <button
                          onClick={() => handleResolveAlert(alert.id, 'Dispatched security team to intercept suspect immediately.')}
                          disabled={isResolvingAlert === alert.id}
                          className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer transition-colors text-center flex items-center justify-center"
                        >
                          {isResolvingAlert === alert.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Acknowledge & Clear'
                          )}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-400 text-xs flex flex-col items-center gap-1">
                      <CheckCircle className="h-6 w-6 text-emerald-500" />
                      No threats detected. System safe.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CORE FRAMEWORK WORKSPACE */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* SIDE BAR NAVIGATION */}
        <nav className="w-full md:w-64 bg-white border-r border-gray-100 p-4 shrink-0 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block px-3 mb-2">OPERATIONS COCKPIT</span>
            
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
              }`}
            >
              <Activity className="h-4 w-4" />
              Command Dashboard
            </button>

            <button
              onClick={() => setActiveTab('matching')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                activeTab === 'matching'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
              }`}
            >
              <Target className="h-4 w-4" />
              Biometric Matching Lab
            </button>

            <button
              onClick={() => setActiveTab('enrollment')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                activeTab === 'enrollment'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Register Biometrics
            </button>

            <button
              onClick={() => setActiveTab('directory')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
              }`}
            >
              <Users className="h-4 w-4" />
              Subject Directory
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
              }`}
            >
              <History className="h-4 w-4" />
              Audit Logs & History
            </button>

            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block px-3 pt-4 pb-2">SIMULATION & PRODUCTION</span>

            <button
              onClick={() => setActiveTab('mobile')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                activeTab === 'mobile'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              Mobile App Terminal
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
              }`}
            >
              <Sliders className="h-4 w-4" />
              System Parameters
            </button>

            <button
              onClick={() => setActiveTab('deliverables')}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                activeTab === 'deliverables'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
              }`}
            >
              <FileCode className="h-4 w-4" />
              Production Source Code
            </button>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[10px] text-gray-500 font-mono text-center">
            Server: V1.0.0 (Secure)<br />
            Mode: Sandbox Simulation
          </div>
        </nav>

        {/* WORKSPACE AREA */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardView 
              summary={{
                totalEnrolled: persons.length,
                totalFaces: persons.reduce((sum, p) => sum + p.faceSampleCount, 0),
                matchesToday: matchLogs.filter(l => l.matchStatus === 'Match' && new Date(l.timestamp).toDateString() === new Date().toDateString()).length,
                unknownToday: matchLogs.filter(l => l.matchStatus === 'Unknown' && new Date(l.timestamp).toDateString() === new Date().toDateString()).length,
                activeAlerts: watchlistAlerts.filter(a => a.status === 'Unresolved').length,
                settings: settings
              }}
              matchLogs={matchLogs} 
              watchlistAlerts={watchlistAlerts} 
              onRefresh={fetchAllTelemetry}
              onSelectTab={setActiveTab}
              onResolveAlert={handleResolveAlert}
            />
          )}

          {activeTab === 'matching' && (
            <MatchingLab 
              enrolledPersons={persons} 
              onRefreshLogs={fetchAllTelemetry}
            />
          )}

          {activeTab === 'enrollment' && (
            <EnrollmentView 
              onSuccess={fetchAllTelemetry}
              enrolledPersons={persons}
            />
          )}

          {activeTab === 'directory' && (
            <DirectoryView 
              persons={persons} 
              onRefresh={fetchAllTelemetry}
              onSelectTab={setActiveTab}
            />
          )}

          {activeTab === 'logs' && (
            <LogsView 
              matchLogs={matchLogs} 
              enrollmentLogs={enrollmentLogs} 
              auditLogs={auditLogs}
            />
          )}

          {activeTab === 'mobile' && (
            <MobileSimulator 
              onRefreshLogs={fetchAllTelemetry}
              watchlistAlerts={watchlistAlerts}
            />
          )}

          {activeTab === 'settings' && settings && (
            <SettingsView 
              settings={settings} 
              onSave={handleSaveSettings}
            />
          )}

          {activeTab === 'deliverables' && (
            <DeliverablesExplorer />
          )}
        </main>

      </div>

    </div>
  );
}
