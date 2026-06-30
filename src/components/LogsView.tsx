/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  History, 
  Fingerprint, 
  Lock, 
  Download, 
  Search, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle,
  FileSpreadsheet,
  MapPin
} from 'lucide-react';
import { MatchLog, EnrollmentLog, AuditLog } from '../types';

interface LogsViewProps {
  matchLogs: MatchLog[];
  enrollmentLogs: EnrollmentLog[];
  auditLogs: AuditLog[];
}

export default function LogsView({ matchLogs, enrollmentLogs, auditLogs }: LogsViewProps) {
  const [activeTab, setActiveTab] = useState<'match' | 'enroll' | 'audit'>('match');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-06-30');

  // Export logs to a real downloadable CSV spreadsheet
  const triggerCsvDownload = (type: 'match' | 'enroll' | 'audit') => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (type === 'match') {
      csvContent += "ID,Timestamp,Matched Name,Category,Similarity %,Status,Camera Source,Operator\r\n";
      matchLogs.forEach(l => {
        const name = l.matchedPersonName || "Unknown Visitor";
        const cat = l.matchedPersonCategory || "N/A";
        const row = `"${l.id}","${l.timestamp}","${name}","${cat}","${l.similarityScore}","${l.matchStatus}","${l.cameraSource}","${l.operator}"`;
        csvContent += row + "\r\n";
      });
    } else if (type === 'enroll') {
      csvContent += "ID,Timestamp,Operator,Action,Subject Name,Subject ID,Details\r\n";
      enrollmentLogs.forEach(l => {
        const row = `"${l.id}","${l.timestamp}","${l.operator}","${l.action}","${l.personName}","${l.personId}","${l.details}"`;
        csvContent += row + "\r\n";
      });
    } else {
      csvContent += "ID,Timestamp,User,Role,Action,IP Address,Details\r\n";
      auditLogs.forEach(l => {
        const row = `"${l.id}","${l.timestamp}","${l.user}","${l.role}","${l.action}","${l.ipAddress}","${l.details}"`;
        csvContent += row + "\r\n";
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FaceMatch_Pro_${type}_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filters depending on active subtab
  const getFilteredLogs = () => {
    const q = searchQuery.toLowerCase();
    
    if (activeTab === 'match') {
      return matchLogs.filter(l => {
        const name = l.matchedPersonName?.toLowerCase() || 'unknown visitor';
        const src = l.cameraSource.toLowerCase();
        const stat = l.matchStatus.toLowerCase();
        return name.includes(q) || src.includes(q) || stat.includes(q);
      });
    } else if (activeTab === 'enroll') {
      return enrollmentLogs.filter(l => {
        const op = l.operator.toLowerCase();
        const act = l.action.toLowerCase();
        const sub = l.personName.toLowerCase();
        return op.includes(q) || act.includes(q) || sub.includes(q);
      });
    } else {
      return auditLogs.filter(l => {
        const usr = l.user.toLowerCase();
        const act = l.action.toLowerCase();
        const dtl = l.details.toLowerCase();
        return usr.includes(q) || act.includes(q) || dtl.includes(q);
      });
    }
  };

  const filteredData = getFilteredLogs();

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Selection row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-4 gap-4">
        <div className="bg-gray-100 p-1 rounded-xl flex gap-1 self-start md:self-auto">
          <button
            onClick={() => { setActiveTab('match'); setSearchQuery(''); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'match' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Matching logs
          </button>
          <button
            onClick={() => { setActiveTab('enroll'); setSearchQuery(''); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'enroll' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Fingerprint className="h-3.5 w-3.5" />
            Biometric Enrollments
          </button>
          <button
            onClick={() => { setActiveTab('audit'); setSearchQuery(''); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'audit' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            Security Audit trails
          </button>
        </div>

        {/* Date query picker */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1 text-xs text-gray-700">
            <Calendar className="h-3.5 w-3.5 text-gray-400 mx-1" />
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="bg-transparent outline-none p-0.5" 
            />
            <span className="px-1 text-gray-400 font-mono">to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)}
              className="bg-transparent outline-none p-0.5" 
            />
          </div>
          
          <button
            onClick={() => triggerCsvDownload(activeTab)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Main filter container */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-xs overflow-hidden">
        
        {/* Search filter banner */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={`Filter active ${activeTab} records...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white font-medium"
            />
          </div>
          <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
            Displaying {filteredData.length} records
          </span>
        </div>

        {/* RENDERING TABLE BY SUBTAB TYPE */}
        <div className="overflow-x-auto">
          {activeTab === 'match' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/10">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Specimen Match</th>
                  <th className="py-3 px-4">Subject category</th>
                  <th className="py-3 px-4 text-center">Distance score</th>
                  <th className="py-3 px-4 text-center">Biometric Status</th>
                  <th className="py-3 px-4">Ingress Camera Node</th>
                  <th className="py-3 px-4">Audited by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredData.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {log.matchedPersonName || 'Unknown / Non-enrolled Visitor'}
                    </td>
                    <td className="py-3.5 px-4">
                      {log.matchedPersonCategory ? (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          log.matchedPersonCategory === 'Watchlist' 
                            ? 'bg-red-50 text-red-700 border-red-100' 
                            : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>
                          {log.matchedPersonCategory}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-mono text-[10px]">Unlisted</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-gray-600">
                      {log.similarityScore}%
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        log.matchStatus === 'Match' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : log.matchStatus === 'Possible Match' 
                            ? 'bg-amber-50 text-amber-700 border-amber-100' 
                            : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {log.matchStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-600 flex items-center gap-1 pt-4">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      {log.cameraSource}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 font-medium">
                      {log.operator}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'enroll' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/10">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action Taken</th>
                  <th className="py-3 px-4">Subject slot</th>
                  <th className="py-3 px-4">Enrollment Details</th>
                  <th className="py-3 px-4">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredData.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        log.action === 'Register' 
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                          : log.action === 'Re-enroll' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : log.action === 'Delete' 
                              ? 'bg-red-50 text-red-700 border-red-100' 
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {log.personName}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-500">
                      {log.details}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-600">
                      {log.operator}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'audit' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/10">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4">Operator user</th>
                  <th className="py-3 px-4">System Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredData.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-gray-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-500">
                      {log.ipAddress}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {log.user} <span className="text-[10px] text-gray-400 font-mono font-normal">({log.role})</span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-500">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <HelpCircle className="h-6 w-6 mx-auto mb-1 text-gray-300" />
            <p className="text-xs">No records correspond to active filters.</p>
          </div>
        )}

      </div>
    </div>
  );
}
