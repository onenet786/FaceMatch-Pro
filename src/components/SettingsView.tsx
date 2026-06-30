/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sliders, 
  ShieldCheck, 
  Trash2, 
  MapPin, 
  Camera, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Database
} from 'lucide-react';
import { SystemSettings } from '../types';

interface SettingsViewProps {
  settings: SystemSettings;
  onSave: (settings: SystemSettings) => void;
}

export default function SettingsView({ settings, onSave }: SettingsViewProps) {
  const [similarityThreshold, setSimilarityThreshold] = useState(settings.similarityThreshold);
  const [faceDetectionConfidence, setFaceDetectionConfidence] = useState(settings.faceDetectionConfidence);
  const [rejectBlurry, setRejectBlurry] = useState(settings.rejectBlurry);
  const [rejectMasked, setRejectMasked] = useState(settings.rejectMasked);
  const [dataRetentionDays, setDataRetentionDays] = useState(settings.dataRetentionDays);
  const [multiLocationSupport, setMultiLocationSupport] = useState(settings.multiLocationSupport);
  const [attendanceMode, setAttendanceMode] = useState(settings.attendanceMode);
  const [activeBranch, setActiveBranch] = useState(settings.activeBranch);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    const updated: SystemSettings = {
      similarityThreshold,
      faceDetectionConfidence,
      minResolutionWidth: settings.minResolutionWidth,
      minResolutionHeight: settings.minResolutionHeight,
      rejectBlurry,
      rejectMasked,
      dataRetentionDays,
      multiLocationSupport,
      attendanceMode,
      activeBranch
    };

    setTimeout(() => {
      onSave(updated);
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm max-w-3xl mx-auto space-y-6">
      
      <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
        <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
          <Sliders className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-gray-900">System Parameters</h2>
          <p className="text-gray-500 text-xs font-mono">Calibrate vector distances and privacy retention policies</p>
        </div>
      </div>

      <form onSubmit={handleSaveSubmit} className="space-y-6">
        
        {/* Section 1: Biometric Engine Thresholds */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-1.5 flex items-center gap-1">
            <Camera className="h-4 w-4 text-indigo-500" />
            Biometric Threshold Configurations
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Matching Threshold slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase">Face Match Similarity Target *</label>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{similarityThreshold}%</span>
              </div>
              <input 
                type="range" 
                min={50} 
                max={98} 
                value={similarityThreshold}
                onChange={e => setSimilarityThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-[10px] text-gray-400 block leading-relaxed">
                Biometric safety gates (defaults: &ge;80% as Match, 65-79% as Potential Match. Adjust higher to minimize false-positives).
              </span>
            </div>

            {/* Quality gate slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 uppercase">Detection Quality gate *</label>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{faceDetectionConfidence}%</span>
              </div>
              <input 
                type="range" 
                min={50} 
                max={95} 
                value={faceDetectionConfidence}
                onChange={e => setFaceDetectionConfidence(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-[10px] text-gray-400 block leading-relaxed">
                Minimum alignment metric required during detection sweeps before processing coordinates.
              </span>
            </div>

          </div>
        </div>

        {/* Section 2: Biometric Validation Controls */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-1.5 flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            Quality Gate Validators
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <label className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={rejectBlurry}
                onChange={e => setRejectBlurry(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-gray-900 block">Reject Blurry Frames</span>
                <span className="text-[10px] text-gray-500 block mt-0.5 leading-relaxed">
                  Automatically reject frames failing resolution blur index checks.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={rejectMasked}
                onChange={e => setRejectMasked(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-gray-900 block">Reject Occlusions / Masks</span>
                <span className="text-[10px] text-gray-500 block mt-0.5 leading-relaxed">
                  Reject templates showing surgical masks or excessive face covers.
                </span>
              </div>
            </label>

          </div>
        </div>

        {/* Section 3: Branch & Attendance Modes */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-1.5 flex items-center gap-1">
            <MapPin className="h-4 w-4 text-indigo-500" />
            Deployment Locations & attendance Parameters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase">Active Facility Portal</label>
              <select
                value={activeBranch}
                onChange={e => setActiveBranch(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Islamabad HQ">Islamabad Corporate HQ</option>
                <option value="Lahore Branch">Lahore R&D Hub</option>
                <option value="Karachi Gatehouse">Karachi Port Terminal</option>
                <option value="Dubai Executive Wing">Dubai Executive Wing</option>
              </select>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-bold text-gray-700 uppercase mb-1">Attendance Integration</span>
              <label className="flex items-start gap-3 bg-gray-50 p-2.5 rounded-lg border border-gray-100 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={attendanceMode}
                  onChange={e => setAttendanceMode(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-gray-900 block">Biometric Attendance Mode</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5 leading-relaxed">
                    Automatically push first matching swipe in/out logs to HR systems.
                  </span>
                </div>
              </label>
            </div>

          </div>
        </div>

        {/* Section 4: Data Retention & Privacy */}
        <div className="space-y-4 pt-2">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-1.5 flex items-center gap-1">
            <Database className="h-4 w-4 text-indigo-500" />
            Privacy Schedule & Retention Controls
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase">Wipe Inactive logs after</label>
              <select
                value={dataRetentionDays}
                onChange={e => setDataRetentionDays(Number(e.target.value))}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={90}>90 Days (Corporate compliance)</option>
                <option value={180}>180 Days (Standard cycle)</option>
                <option value={365}>365 Days (Annual audits)</option>
                <option value={0}>Infinite / Keep logs permanently</option>
              </select>
            </div>

            <div className="p-3 bg-indigo-50/50 border border-indigo-100/50 rounded-lg text-[10px] text-indigo-950 flex items-start gap-2 leading-relaxed">
              <AlertCircle className="h-4.5 w-4.5 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-bold block">Compliance Advisory</span>
                Facial recognition biometric signatures must meet local cybersecurity statutes. Ensure all enrolled persons execute and sign privacy consent schedules during registry.
              </div>
            </div>

          </div>
        </div>

        {/* Save feedback and buttons */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <div>
            {success && (
              <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Parameters written to db_store.json!
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save Parameters
          </button>
        </div>

      </form>

    </div>
  );
}
