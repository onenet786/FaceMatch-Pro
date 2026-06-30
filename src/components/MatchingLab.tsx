/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Scan, 
  Target, 
  Users, 
  AlertTriangle, 
  Camera, 
  Upload, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  Grid, 
  Clock, 
  MapPin, 
  Search,
  ChevronRight,
  Info,
  Loader2
} from 'lucide-react';
import { Person, MatchLog } from '../types';

interface MatchingLabProps {
  enrolledPersons: Person[];
  onRefreshLogs: () => void;
}

export default function MatchingLab({ enrolledPersons, onRefreshLogs }: MatchingLabProps) {
  const [activeMode, setActiveMode] = useState<'1:1' | '1:N' | 'bulk'>('1:1');
  
  // 1:1 Verification States
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  
  // 1:N Identification States
  const [identificationResult, setIdentificationResult] = useState<any>(null);
  const [candidateList, setCandidateList] = useState<any[]>([]);

  // Bulk Matching States
  const [bulkFaces, setBulkFaces] = useState<any[]>([]);
  
  // Common camera/photo states
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraSource, setCameraSource] = useState('Camera Node A - Main Entrance');
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Select first person by default for 1:1
    const activePeople = enrolledPersons.filter(p => p.status === 'active');
    if (activePeople.length > 0 && !selectedPersonId) {
      setSelectedPersonId(activePeople[0].id);
    }
  }, [enrolledPersons, selectedPersonId]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setMatchError(null);
    setVerificationResult(null);
    setIdentificationResult(null);
    setCapturedImage(null);
    setBulkFaces([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error('Error starting WebRTC matching feed:', err);
      setMatchError('Could not launch matching camera. Ensure browser clearances are granted or upload an image.');
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
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
        stopCamera();
        
        // Auto trigger matches depending on the mode
        if (activeMode === '1:1') {
          trigger11Match(dataUrl);
        } else if (activeMode === '1:N') {
          trigger1NMatch(dataUrl);
        } else {
          triggerBulkMatch(dataUrl);
        }
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setCapturedImage(dataUrl);
        
        if (activeMode === '1:1') {
          trigger11Match(dataUrl);
        } else if (activeMode === '1:N') {
          trigger1NMatch(dataUrl);
        } else {
          triggerBulkMatch(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. Perform 1:1 Biometric Verification
  const trigger11Match = async (imgData: string) => {
    if (!selectedPersonId) {
      setMatchError('Please select a target person profile first.');
      return;
    }
    setIsMatching(true);
    setMatchError(null);
    setVerificationResult(null);

    try {
      const res = await fetch('/api/face/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imgData,
          mode: '1:1',
          targetPersonId: selectedPersonId,
          cameraSource,
          operator: 'Super Admin'
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Server error during matching.');
      }

      setVerificationResult(data.log);
      onRefreshLogs(); // Trigger sync
    } catch (err: any) {
      setMatchError(err.message || 'Error executing verification.');
    } finally {
      setIsMatching(false);
    }
  };

  // 2. Perform 1:N Biometric Identification
  const trigger1NMatch = async (imgData: string) => {
    setIsMatching(true);
    setMatchError(null);
    setIdentificationResult(null);
    setCandidateList([]);

    try {
      const res = await fetch('/api/face/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imgData,
          mode: '1:N',
          cameraSource,
          operator: 'Super Admin'
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Server error during matching.');
      }

      setIdentificationResult(data.log);
      setCandidateList(data.candidates || []);
      onRefreshLogs(); // Trigger sync
    } catch (err: any) {
      setMatchError(err.message || 'Error executing identification.');
    } finally {
      setIsMatching(false);
    }
  };

  // 3. Perform Bulk Image Facial Matching
  const triggerBulkMatch = async (imgData: string) => {
    setIsMatching(true);
    setMatchError(null);
    setBulkFaces([]);

    try {
      const res = await fetch('/api/face/bulk-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imgData,
          cameraSource,
          operator: 'Super Admin'
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Server error during bulk matching.');
      }

      setBulkFaces(data.faces || []);
      onRefreshLogs(); // Trigger sync
    } catch (err: any) {
      setMatchError(err.message || 'Error executing bulk matching.');
    } finally {
      setIsMatching(false);
    }
  };

  const activePeople = enrolledPersons.filter(p => p.status === 'active');

  return (
    <div className="space-y-6">
      {/* Tab select mode header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Biometric Face Matching Lab</h2>
          <p className="text-xs text-gray-500">Run comparison streams, vector distance models, or bulk crowd analyses</p>
        </div>
        
        {/* Mode selector tab pills */}
        <div className="bg-gray-100 p-1 rounded-xl flex gap-1 self-start md:self-auto">
          <button
            onClick={() => {
              setActiveMode('1:1');
              setCapturedImage(null);
              setVerificationResult(null);
              stopCamera();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeMode === '1:1' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            1:1 Verification
          </button>
          <button
            onClick={() => {
              setActiveMode('1:N');
              setCapturedImage(null);
              setIdentificationResult(null);
              setCandidateList([]);
              stopCamera();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeMode === '1:N' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Scan className="h-3.5 w-3.5" />
            1:N Identification
          </button>
          <button
            onClick={() => {
              setActiveMode('bulk');
              setCapturedImage(null);
              setBulkFaces([]);
              stopCamera();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeMode === 'bulk' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Grid className="h-3.5 w-3.5" />
            Bulk Matching
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Hand: Interactive Camera View / Capture Block (Columns: 5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs space-y-4">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 border-b border-gray-50 pb-2">
              <Camera className="h-4.5 w-4.5 text-indigo-500" />
              Biometric Feed Scanner
            </h3>

            {/* Simulated camera dropdown location */}
            <div className="grid grid-cols-1 gap-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Scanner Ingress Source</label>
              <select 
                value={cameraSource}
                onChange={e => setCameraSource(e.target.value)}
                className="text-xs p-2 border border-gray-200 rounded-lg outline-none bg-white font-medium text-gray-700"
              >
                <option value="Camera Node A - Main Entrance">Camera Node A - Main Entrance</option>
                <option value="Camera Node B - Server Lobby">Camera Node B - Server Lobby</option>
                <option value="Executive Wing Turnstile 3">Executive Wing Turnstile 3</option>
                <option value="Front Desk Handheld Terminal">Front Desk Handheld Terminal</option>
                <option value="CCTV Group Feed - Parking East">CCTV Group Feed - Parking East</option>
              </select>
            </div>

            {/* Webcam viewport box */}
            <div className="relative aspect-video bg-gray-950 rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center group shadow-inner">
              
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
                  alt="Captured test block" 
                  className="absolute inset-0 w-full h-full object-cover" 
                />
              )}

              {/* DRAW INTERACTIVE BULK CANVAS BOUNDS */}
              {activeMode === 'bulk' && bulkFaces.length > 0 && capturedImage && (
                <div className="absolute inset-0 pointer-events-none">
                  {bulkFaces.map((f, i) => (
                    <div
                      key={i}
                      className={`absolute border-2 rounded-xs flex flex-col justify-between ${
                        f.status === 'Match' 
                          ? 'border-emerald-500 bg-emerald-500/10' 
                          : f.status === 'Possible Match' 
                            ? 'border-amber-500 bg-amber-500/10' 
                            : 'border-red-500 bg-red-500/10'
                      }`}
                      style={{
                        top: `${f.box.ymin / 10}%`,
                        left: `${f.box.xmin / 10}%`,
                        width: `${(f.box.xmax - f.box.xmin) / 10}%`,
                        height: `${(f.box.ymax - f.box.ymin) / 10}%`
                      }}
                    >
                      <div className={`text-[8px] text-white px-1 py-0.5 font-bold uppercase self-start rounded-b-xs leading-none ${
                        f.status === 'Match' 
                          ? 'bg-emerald-500' 
                          : f.status === 'Possible Match' 
                            ? 'bg-amber-500' 
                            : 'bg-red-500'
                      }`}>
                        {f.matchedPersonName} ({Math.round(f.similarityScore)}%)
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Target scan helper */}
              {isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-44 h-44 border-2 border-dashed border-indigo-400/40 rounded-xl animate-pulse flex items-center justify-center">
                    <span className="text-[10px] text-indigo-400/80 font-semibold tracking-wider font-mono">ALIGN PORTRAIT</span>
                  </div>
                </div>
              )}

              {!isCameraActive && !capturedImage && (
                <div className="text-center p-6 text-gray-500 space-y-2">
                  <Scan className="h-8 w-8 mx-auto text-gray-700 animate-pulse" />
                  <p className="text-xs">Select capture method to provide evaluation image.</p>
                </div>
              )}

              {isMatching && (
                <div className="absolute inset-0 bg-gray-950/80 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-7 w-7 text-indigo-500 animate-spin" />
                  <span className="text-xs text-white font-medium font-mono">Matching vector descriptors...</span>
                </div>
              )}
            </div>

            {/* Scan Controls */}
            <div className="flex gap-2">
              {isCameraActive ? (
                <button
                  onClick={capturePhoto}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm text-center"
                >
                  Snap & Run Match
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Start Camera Feed
                </button>
              )}

              <label className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer text-center flex items-center justify-center gap-1.5 border border-gray-200">
                <Upload className="h-3.5 w-3.5" />
                Upload Image
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>

            {matchError && (
              <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 text-xs flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Match Interrupted: </span>
                  {matchError}
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>

        {/* Right Hand: Match Results Display (Columns: 7) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* MODE A: 1:1 FACE VERIFICATION PANEL */}
          {activeMode === '1:1' && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs space-y-4 min-h-80 flex flex-col justify-between">
              
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1 border-b border-gray-50 pb-2">
                  <Target className="h-4.5 w-4.5 text-indigo-500" />
                  1:1 Biometric Verification Panel
                </h3>

                {/* Target profile select dropdown list */}
                <div className="grid grid-cols-1 gap-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Target Directory Profile *</label>
                  <select 
                    value={selectedPersonId}
                    onChange={e => {
                      setSelectedPersonId(e.target.value);
                      setVerificationResult(null);
                    }}
                    className="text-xs p-2.5 border border-gray-200 rounded-lg outline-none bg-white font-semibold text-gray-800"
                  >
                    {activePeople.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.cnic}) - [{p.category}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Result display */}
              {verificationResult ? (
                <div className="space-y-4 p-4 border border-gray-100 rounded-xl bg-gray-50/50 animate-in fade-in">
                  
                  {/* Authorized Check or Mismatch Red card */}
                  <div className={`flex items-start gap-3 p-3.5 rounded-lg border ${
                    verificationResult.matchStatus === 'Match'
                      ? 'bg-emerald-50/70 border-emerald-100 text-emerald-950'
                      : verificationResult.matchStatus === 'Possible Match'
                        ? 'bg-amber-50/70 border-amber-100 text-amber-950'
                        : 'bg-red-50/70 border-red-100 text-red-950'
                  }`}>
                    {verificationResult.matchStatus === 'Match' ? (
                      <CheckCircle className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                    ) : verificationResult.matchStatus === 'Possible Match' ? (
                      <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-bold text-sm">
                        {verificationResult.matchStatus === 'Match' 
                          ? 'BIOMETRIC ID AUTHORIZED' 
                          : verificationResult.matchStatus === 'Possible Match' 
                            ? 'BIOMETRIC ID UNCONFIRMED' 
                            : 'ACCESS DENIED: IDENTITY MISMATCH'}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Compare verified face against record for <strong>{verificationResult.matchedPersonName || 'Requested Person'}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Similarity gauge score */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-gray-500">
                      <span>Cosine Distance Similarity Score</span>
                      <span className={verificationResult.matchStatus === 'Match' ? 'text-emerald-600' : 'text-red-500'}>
                        {verificationResult.similarityScore}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          verificationResult.matchStatus === 'Match' 
                            ? 'bg-emerald-500' 
                            : verificationResult.matchStatus === 'Possible Match' 
                              ? 'bg-amber-500' 
                              : 'bg-red-500'
                        }`}
                        style={{ width: `${verificationResult.similarityScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Details block */}
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-gray-500 pt-1">
                    <div>Confidence: <span className="text-gray-800 font-bold">{verificationResult.confidencePercentage}%</span></div>
                    <div>Source: <span className="text-gray-800 font-bold">{verificationResult.cameraSource}</span></div>
                    <div>Timestamp: <span className="text-gray-800 font-bold">{new Date(verificationResult.timestamp).toLocaleTimeString()}</span></div>
                    <div>Auditor: <span className="text-gray-800 font-bold">{verificationResult.operator}</span></div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-10 text-gray-400">
                  <Info className="h-6 w-6 mx-auto text-gray-300 mb-1" />
                  <p className="text-xs">Provide query camera frame and lock in target person to run vector match.</p>
                </div>
              )}

              <div className="text-[10px] text-gray-400 bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                1:1 checks compare local face samples against a specific directory slot only (Euclidean threshold: &ge;80%).
              </div>

            </div>
          )}

          {/* MODE B: 1:N FACE IDENTIFICATION PANEL */}
          {activeMode === '1:N' && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs space-y-5 min-h-80 flex flex-col justify-between">
              
              <div>
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1 border-b border-gray-50 pb-2">
                  <Scan className="h-4.5 w-4.5 text-indigo-500" />
                  1:N Database Identification (Facial Classification)
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Classification scans query embeddings across all saved records to index the closest distance candidate.</p>
              </div>

              {identificationResult ? (
                <div className="space-y-4 animate-in fade-in">
                  
                  {/* Top Match Result banner */}
                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="h-14 w-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg uppercase shadow-xs">
                      {identificationResult.matchedPersonName ? identificationResult.matchedPersonName.slice(0, 2) : 'FS'}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Best Biometric Match
                      </span>
                      <h4 className="font-bold text-gray-900 text-base">
                        {identificationResult.matchedPersonName || 'Unknown Intruder / Outsider'}
                      </h4>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono">
                        <span>Score: {identificationResult.similarityScore}%</span>
                        <span>•</span>
                        <span>Category: {identificationResult.matchedPersonCategory || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Candidates bar details */}
                  <div className="space-y-2.5">
                    <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Top Biometric Candidates</h5>
                    <div className="space-y-1.5">
                      {candidateList.length > 0 ? (
                        candidateList.map((cand, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs p-2 bg-gray-50/50 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all">
                            <div className="flex items-center gap-2">
                              <ChevronRight className="h-3 w-3 text-gray-400" />
                              <span className="font-semibold text-gray-800">{cand.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden shrink-0">
                                <div 
                                  className="h-full bg-indigo-500 rounded-full"
                                  style={{ width: `${cand.similarityScore}%` }}
                                />
                              </div>
                              <span className="font-mono text-[10px] font-bold text-gray-500">{cand.similarityScore}%</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-400 text-xs text-center py-2">No secondary matches found.</div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Search className="h-8 w-8 mx-auto text-gray-300 mb-2 animate-bounce" />
                  <p className="text-xs">Provide evaluation image, and classification query will scan all active profiles in milliseconds.</p>
                </div>
              )}

              <div className="text-[10px] text-gray-400 font-mono bg-gray-50 p-2 rounded flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gray-500" /> Average search execution: 4.2ms | pgvector hnsw indexing: Enabled
              </div>

            </div>
          )}

          {/* MODE C: BULK IMAGE MATCHING PANEL */}
          {activeMode === 'bulk' && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs space-y-4 min-h-80 flex flex-col justify-between">
              
              <div>
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1 border-b border-gray-50 pb-2">
                  <Grid className="h-4.5 w-4.5 text-indigo-500" />
                  Bulk Multi-Face Image Matching
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Upload a group photo. The system will slice bounding coordinates, analyze each segment, and run parallel identifications.</p>
              </div>

              {bulkFaces.length > 0 ? (
                <div className="space-y-3 animate-in fade-in">
                  <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Classification List</h5>
                  <div className="space-y-2">
                    {bulkFaces.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-gray-50/70 border border-gray-100 rounded-lg">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-2 w-2 rounded-full ${
                            f.status === 'Match' 
                              ? 'bg-emerald-500' 
                              : f.status === 'Possible Match' 
                                ? 'bg-amber-500' 
                                : 'bg-red-500'
                          }`} />
                          <div>
                            <h4 className="text-xs font-bold text-gray-900">{f.matchedPersonName}</h4>
                            <p className="text-[10px] text-gray-500 font-mono">Category: {f.category}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            f.status === 'Match' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : f.status === 'Possible Match' 
                                ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                : 'bg-red-50 text-red-700 border-red-100'
                          }`}>
                            {f.status} ({Math.round(f.similarityScore)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Users className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-xs">Upload group or crowd specimens to run bulk parallel vector distance checks.</p>
                </div>
              )}

              <div className="text-[10px] text-gray-400 bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                Crowd mode handles up to 25 bounding targets concurrently. Real-time logging of individual matching records is logged automatically.
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
