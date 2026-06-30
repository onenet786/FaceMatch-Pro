/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Trash2, 
  ShieldCheck, 
  ShieldAlert, 
  Camera, 
  FileSpreadsheet, 
  Check, 
  AlertCircle, 
  Search, 
  UserPlus, 
  Loader2, 
  X,
  ToggleLeft,
  ToggleRight,
  Upload
} from 'lucide-react';
import { Person } from '../types';

interface DirectoryViewProps {
  persons: Person[];
  onRefresh: () => void;
  onSelectTab: (tab: string) => void;
}

export default function DirectoryView({ persons, onRefresh, onSelectTab }: DirectoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Re-enrollment states
  const [enrollingPerson, setEnrollingPerson] = useState<Person | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSubmittingSample, setIsSubmittingSample] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);

  // Bulk CSV States
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Filter persons list
  const filteredPersons = persons.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.cnic.includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  });

  // Toggle user status active/disabled
  const handleToggleStatus = async (person: Person) => {
    try {
      const newStatus = person.status === 'active' ? 'disabled' : 'active';
      const res = await fetch(`/api/persons/${person.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, operator: 'Super Admin' })
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error('Error toggling status:', e);
    }
  };

  // Delete person record
  const handleDeletePerson = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete "${name}"? This wipes all facial templates.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/persons/${id}?operator=Super Admin`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error('Error deleting person:', e);
    }
  };

  // Start Camera for secondary specimen
  const startCamera = async () => {
    setSampleError(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (e) {
      setSampleError('Could not connect to camera node.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }
    }
  };

  // Submit re-enrollment specimen image
  const submitReenrollment = async () => {
    if (!enrollingPerson || !capturedImage) return;
    setIsSubmittingSample(true);
    setSampleError(null);

    try {
      const res = await fetch(`/api/persons/${enrollingPerson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileImage: capturedImage,
          operator: 'Super Admin'
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to register additional specimen.');
      }

      setEnrollingPerson(null);
      setCapturedImage(null);
      onRefresh();
    } catch (err: any) {
      setSampleError(err.message);
    } finally {
      setIsSubmittingSample(false);
    }
  };

  // Process paste CSV data
  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setCsvError(null);
    setCsvSuccess(null);

    const lines = csvContent.split('\n');
    const records: any[] = [];

    // Simple parser
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length < 2) {
        setCsvError(`Parsing error on line ${i + 1}: Expected "Name, CNIC, Category".`);
        return;
      }

      records.push({
        name: parts[0]?.trim(),
        cnic: parts[1]?.trim(),
        category: parts[2]?.trim() || 'Employee'
      });
    }

    if (records.length === 0) {
      setCsvError('No records found. Copy paste raw entries above.');
      return;
    }

    setIsImporting(true);

    try {
      const res = await fetch('/api/persons/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, operator: 'Super Admin' })
      });
      const data = await res.json();
      
      if (res.ok) {
        setCsvSuccess(`Successfully compiled and imported ${data.count} new directory profiles!`);
        setCsvContent('');
        onRefresh();
        setTimeout(() => {
          setShowBulkImport(false);
          setCsvSuccess(null);
        }, 3000);
      } else {
        setCsvError(data.error || 'Failed to import CSV.');
      }
    } catch (e) {
      setCsvError('Server timed out during parsing.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Enrolled Person Directory</h2>
          <p className="text-xs text-gray-500">Enable/disable biometric files, re-enroll templates, or import CSV profiles</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer transition-all"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Bulk CSV Import
          </button>
          <button
            onClick={() => onSelectTab('enrollment')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all shadow-xs"
          >
            <UserPlus className="h-4 w-4" />
            Register Biometrics
          </button>
        </div>
      </div>

      {/* Directory Table Area */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-xs overflow-hidden">
        
        {/* Search header inside table box */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name, CNIC, category..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
            />
          </div>
          <span className="text-xs font-mono text-gray-500">
            Total active entries: {persons.filter(p => p.status === 'active').length}
          </span>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/20">
                <th className="py-3.5 px-4">Subject Name</th>
                <th className="py-3.5 px-4">ID Card / CNIC</th>
                <th className="py-3.5 px-4">Access category</th>
                <th className="py-3.5 px-4">Face Samples</th>
                <th className="py-3.5 px-4 text-center">Privacy Consent</th>
                <th className="py-3.5 px-4 text-center">Match Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {filteredPersons.length > 0 ? (
                filteredPersons.map((person) => (
                  <tr key={person.id} className={`hover:bg-gray-50/50 transition-colors ${person.status === 'disabled' ? 'opacity-60 bg-gray-50/30' : ''}`}>
                    
                    {/* Portrait initial + Details */}
                    <td className="py-3.5 px-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 uppercase tracking-wide">
                        {person.name.slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{person.name}</h4>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{person.phone} &bull; {person.email}</p>
                      </div>
                    </td>

                    {/* CNIC Card */}
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-gray-600">
                      {person.cnic}
                    </td>

                    {/* Category Label */}
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        person.category === 'Watchlist'
                          ? 'bg-red-50 text-red-700 border border-red-100'
                          : person.category === 'VIP'
                            ? 'bg-pink-50 text-pink-700 border border-pink-100'
                            : person.category === 'Contractor'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        {person.category}
                      </span>
                    </td>

                    {/* Sample counts */}
                    <td className="py-3.5 px-4 font-mono text-gray-500 font-medium text-center sm:text-left">
                      {person.faceSampleCount} specimens
                    </td>

                    {/* Privacy consent indicator */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center justify-center">
                        {person.consentSigned ? (
                          <div className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 border border-emerald-100" title="Consent Form Signed & Saved">
                            <ShieldCheck className="h-3 w-3 shrink-0" />
                            CONSENTED
                          </div>
                        ) : (
                          <div className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 border border-amber-100" title="Biometric consent not loaded">
                            <ShieldAlert className="h-3 w-3 shrink-0" />
                            EXEMPT / PENDING
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Enabled / Disabled Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(person)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg cursor-pointer transition-all border bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        {person.status === 'active' ? (
                          <>
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            Active
                          </>
                        ) : (
                          <>
                            <div className="h-2 w-2 rounded-full bg-gray-400" />
                            Disabled
                          </>
                        )}
                      </button>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setEnrollingPerson(person)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md cursor-pointer border border-transparent hover:border-indigo-100 transition-all"
                          title="Add Biometric Sample / Re-enroll"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePerson(person.id, person.name)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-md cursor-pointer border border-transparent hover:border-red-100 transition-all"
                          title="Delete Profile and Biometrics"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <Search className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                    <p>No matching enrolled individuals found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL 1: ADD SECONDARY BIOMETRIC SAMPLE / RE-ENROLL */}
      {enrollingPerson && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900">Add Biometric Specimen</h3>
                <p className="text-xs text-gray-500">Capture additional facial angles for {enrollingPerson.name}</p>
              </div>
              <button onClick={() => { setEnrollingPerson(null); stopCamera(); }} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Simulated webcam scan zone */}
            <div className="relative aspect-video bg-gray-950 rounded-lg overflow-hidden border border-gray-800 flex items-center justify-center shadow-inner">
              {isCameraActive && (
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted 
                  className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                />
              )}

              {capturedImage && (
                <img 
                  src={capturedImage} 
                  alt="New specimen sample" 
                  className="absolute inset-0 w-full h-full object-cover" 
                />
              )}

              {!isCameraActive && !capturedImage && (
                <div className="text-center p-4 text-gray-500 space-y-2">
                  <Camera className="h-8 w-8 mx-auto text-gray-700" />
                  <p className="text-xs">Provide supplementary portrait angles to calibrate algorithms.</p>
                </div>
              )}
            </div>

            {/* Scan Controls */}
            <div className="flex gap-2">
              {isCameraActive ? (
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm text-center"
                >
                  Freeze Specimen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex-1 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Launch Scanner
                </button>
              )}

              <button
                type="button"
                disabled={!capturedImage || isSubmittingSample}
                onClick={submitReenrollment}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  capturedImage && !isSubmittingSample
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                }`}
              >
                {isSubmittingSample ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Commit Face sample
              </button>
            </div>

            {sampleError && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {sampleError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: BULK SPREADSHEET IMPORT SIMULATOR */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-base text-gray-900">Bulk Directory Spreadsheet Importer</h3>
                  <p className="text-xs text-gray-500 font-mono">Accepts comma separated text strings</p>
                </div>
              </div>
              <button onClick={() => setShowBulkImport(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              To import multiple persons quickly, paste comma-delimited lines conforming to the structure: <code>Name, CNIC/ID, Category</code>. Leave category blank to default to &ldquo;Employee&rdquo;.
            </p>

            <form onSubmit={handleBulkImport} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">CSV Raw Data entries</label>
                <textarea
                  required
                  rows={5}
                  value={csvContent}
                  onChange={e => setCsvContent(e.target.value)}
                  placeholder={`Zafar Iqbal, 37405-1122334-1, Employee&#10;Hina Parveen, 35201-9988776-2, Contractor&#10;Kamran Akmal, 42201-5556667-3, VIP`}
                  className="w-full text-xs font-mono p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {csvError && (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {csvError}
                </div>
              )}

              {csvSuccess && (
                <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                  <Check className="h-4 w-4 shrink-0" />
                  {csvSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBulkImport(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm flex items-center gap-1"
                >
                  {isImporting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Compile & Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
