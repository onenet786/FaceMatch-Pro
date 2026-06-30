/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  Check, 
  RefreshCw, 
  Lock, 
  Fingerprint, 
  UserPlus, 
  X,
  FileText
} from 'lucide-react';
import { Person, QualityMetrics, BoundingBox } from '../types';

interface EnrollmentViewProps {
  onSuccess: () => void;
  enrolledPersons: Person[];
}

export default function EnrollmentView({ onSuccess, enrolledPersons }: EnrollmentViewProps) {
  // Form fields
  const [name, setName] = useState('');
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('Employee');
  const [notes, setNotes] = useState('');
  const [consentSigned, setConsentSigned] = useState(false);

  // Picture handling
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);

  // Biometric Results
  const [detectedBox, setDetectedBox] = useState<BoundingBox | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null);

  // Submitting Form
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [enrollComplete, setEnrollComplete] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Format Pakistani style CNIC (XXXXX-XXXXXXX-X)
  const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, ''); // Keep only digits
    if (val.length > 13) val = val.slice(0, 13);
    
    // Insert hyphens
    let formatted = val;
    if (val.length > 5 && val.length <= 12) {
      formatted = `${val.slice(0, 5)}-${val.slice(5)}`;
    } else if (val.length > 12) {
      formatted = `${val.slice(0, 5)}-${val.slice(5, 12)}-${val.slice(12)}`;
    }
    setCnic(formatted);
  };

  const startCamera = async () => {
    setAnalysisError(null);
    setAnalysisSuccess(false);
    setCapturedImage(null);
    setDetectedBox(null);
    setQualityMetrics(null);

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
      console.error('Error starting WebRTC feed:', err);
      setAnalysisError('Could not gain camera permissions. Ensure browser constraints are met or upload a photo instead.');
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
        
        // Trigger automatic quality and duplicate assessment
        analyzeBiometricQuality(dataUrl);
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
        analyzeBiometricQuality(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Run AI gate for blurry faces, masks, head alignment, and duplicate biometric similarity
  const analyzeBiometricQuality = async (imgData: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisSuccess(false);
    setDetectedBox(null);
    setQualityMetrics(null);

    try {
      // 1. Biometric face detect API call
      const detectRes = await fetch('/api/face/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imgData })
      });
      const detectData = await detectRes.json();

      if (!detectRes.ok || !detectData.faceDetected) {
        setAnalysisError(detectData.rejectReason || detectData.error || 'No human face detected. Position yourself under clear lighting.');
        setIsAnalyzing(false);
        return;
      }

      if (!detectData.isValid) {
        setAnalysisError(`Biometric Quality Rejected: ${detectData.rejectReason}`);
        setDetectedBox(detectData.box);
        setQualityMetrics(detectData.quality);
        setIsAnalyzing(false);
        return;
      }

      // 2. Prevent duplicate enrollment check (biometric search against DB)
      // Check if this image similarity triggers match on existing person
      const matchRes = await fetch('/api/face/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imgData, mode: '1:N' })
      });
      const matchData = await matchRes.json();

      if (matchRes.ok && matchData.log && matchData.log.matchStatus === 'Match') {
        const matchedPersonName = matchData.log.matchedPersonName;
        setAnalysisError(`Biometric Duplicate Prevented! Face matches enrolled record "${matchedPersonName}" with ${matchData.log.similarityScore}% similarity.`);
        setIsAnalyzing(false);
        return;
      }

      // Approved!
      setDetectedBox(detectData.box);
      setQualityMetrics(detectData.quality);
      setAnalysisSuccess(true);
    } catch (err) {
      console.error('Error analyzing facial quality:', err);
      setAnalysisError('AI microservice timed out or offline. Safe fallback bypassed.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!name.trim()) return setGeneralError('Please input Full Name.');
    if (cnic.length < 15) return setGeneralError('Valid CNIC/ID card number required (XXXXX-XXXXXXX-X format).');
    if (!consentSigned) return setGeneralError('Biometric privacy consent forms must be digitally accepted first.');
    if (!capturedImage || !analysisSuccess) return setGeneralError('A valid, high-quality face scan must be locked in.');

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          cnic,
          phone,
          email,
          address,
          category,
          notes,
          profileImage: capturedImage,
          consentSigned,
          operator: 'Super Admin'
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Error recording enrollment.');
      }

      setEnrollComplete(true);
      setTimeout(() => {
        onSuccess(); // Sync and redirect
      }, 2500);

    } catch (err: any) {
      setGeneralError(err.message || 'Server error. Could not store biometric templates.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm max-w-4xl mx-auto">
      {enrollComplete ? (
        <div className="text-center py-12 space-y-4 animate-in fade-in">
          <div className="mx-auto h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
            <Check className="h-8 w-8 animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Enrolled Successfully</h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            Biometric descriptors and cryptographic vector templates have been computed and appended securely to <strong>FaceMatch Pro PostgreSQL</strong>.
          </p>
          <div className="text-xs text-gray-400 font-mono">
            ID: cnic_match_ok &bull; Audit Level: High
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-gray-900">Biometric Facial Enrollment</h2>
              <p className="text-gray-500 text-xs">Verify facial alignment and consent bounds prior to vector indexing</p>
            </div>
          </div>

          <form onSubmit={handleEnrollSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Biometric Capture Gate */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Fingerprint className="h-4 w-4 text-indigo-500" />
                Facial Biometric Input
              </h3>

              {/* Camera viewport frame */}
              <div className="relative aspect-video bg-gray-950 rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center shadow-inner group">
                
                {isCameraActive && (
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted 
                    className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                  />
                )}

                {/* Display frozen frame or uploaded file */}
                {capturedImage && (
                  <img 
                    src={capturedImage} 
                    alt="Captured specimen" 
                    className="absolute inset-0 w-full h-full object-cover" 
                  />
                )}

                {/* Draw face bounding box overlay on success */}
                {analysisSuccess && detectedBox && (
                  <div 
                    className="absolute border-2 border-emerald-500 rounded-sm pointer-events-none animate-pulse flex flex-col justify-between"
                    style={{
                      top: `${detectedBox.ymin / 10}%`,
                      left: `${detectedBox.xmin / 10}%`,
                      width: `${(detectedBox.xmax - detectedBox.xmin) / 10}%`,
                      height: `${(detectedBox.ymax - detectedBox.ymin) / 10}%`
                    }}
                  >
                    <div className="bg-emerald-500 text-[8px] text-white px-1 py-0.5 font-bold uppercase self-start rounded-b-xs">
                      FACE ID VALID
                    </div>
                  </div>
                )}

                {/* Live Face Scan Target Grid Overlay when Camera is Active */}
                {isCameraActive && (
                  <div className="absolute inset-0 border border-indigo-500/10 pointer-events-none flex items-center justify-center">
                    {/* Retro target grid */}
                    <div className="w-48 h-48 border-2 border-dashed border-indigo-400/40 rounded-full animate-pulse flex items-center justify-center">
                      <div className="w-32 h-44 border border-indigo-400/20 rounded-t-full rounded-b-full"></div>
                    </div>
                  </div>
                )}

                {/* No stream active background state */}
                {!isCameraActive && !capturedImage && (
                  <div className="text-center p-6 space-y-3 z-10 text-gray-400">
                    <Camera className="h-10 w-10 mx-auto text-gray-600" />
                    <p className="text-xs">Provide baseline portrait to run AI quality checks.</p>
                  </div>
                )}

                {/* Analyzing Overlay loader */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-gray-950/80 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                    <span className="text-xs text-white font-medium">Extracting facial landmarks...</span>
                  </div>
                )}
              </div>

              {/* Input Action Controls */}
              <div className="flex gap-2">
                {isCameraActive ? (
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm text-center"
                  >
                    Capture Specimen
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Start Camera
                  </button>
                )}

                <label className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer text-center flex items-center justify-center gap-1.5 border border-gray-200">
                  <Upload className="h-3.5 w-3.5" />
                  Upload Photo
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>
              </div>

              {/* Status & Validation Logs */}
              {analysisError && (
                <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-3 text-xs flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Biometric Reject: </span>
                    {analysisError}
                  </div>
                </div>
              )}

              {analysisSuccess && qualityMetrics && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg p-3.5 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Biometrics Standard Verified
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                    <div>Pose: <span className="text-emerald-700 font-bold">Front-Facing (OK)</span></div>
                    <div>Occlusions: <span className="text-emerald-700 font-bold">None Detected</span></div>
                    <div>Clarity score: <span className="text-emerald-700 font-bold">Excellent ({qualityMetrics.blurScore}/100)</span></div>
                    <div>Resolution: <span className="text-emerald-700 font-bold">{qualityMetrics.resolution}</span></div>
                  </div>
                </div>
              )}

              {/* Invisible support canvases */}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Right Column: Personal Telemetry Form */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-1.5">
                <FileText className="h-4 w-4 text-indigo-500" />
                Registry Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Full Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Muhammad bin Qasim" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">CNIC / ID Card *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="42101-1234567-1" 
                    value={cnic}
                    onChange={handleCnicChange}
                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    placeholder="+92-300-1234567" 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="name@organization.com" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Access Level Category *</label>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="Employee">Employee (HQ Staff)</option>
                  <option value="Visitor">Visitor (Temporary Pass)</option>
                  <option value="VIP">VIP (Escort Required)</option>
                  <option value="Contractor">Contractor (Restricted Times)</option>
                  <option value="Watchlist">Security Watchlist / Blacklist</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Residential Address</label>
                <input 
                  type="text" 
                  placeholder="Street, Sector, City" 
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Enrolling Operator Notes</label>
                <textarea 
                  rows={2}
                  placeholder="Special instructions, escort terms, or credential overrides." 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {/* Digital Consent Checklist */}
              <div className="bg-gray-50 rounded-lg p-3.5 border border-gray-100">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={consentSigned}
                    onChange={e => setConsentSigned(e.target.checked)}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5 text-indigo-600" />
                      Biometric Privacy Consent Agreement
                    </span>
                    <span className="text-[10px] text-gray-500 block mt-0.5 leading-relaxed">
                      Subject explicitly consents to let FaceMatch Pro extract, translate, store, and process face biometric templates under global data protection frameworks and local corporate parameters.
                    </span>
                  </div>
                </label>
              </div>

              {/* Submission error feedback */}
              {generalError && (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {generalError}
                </div>
              )}

              {/* Save Button */}
              <button
                type="submit"
                disabled={isSubmitting || !analysisSuccess || !consentSigned}
                className={`w-full py-3 rounded-lg text-sm font-semibold transition-all shadow-sm text-center flex items-center justify-center gap-2 cursor-pointer ${
                  analysisSuccess && consentSigned && !isSubmitting
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Vector Descriptors...
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4" />
                    Commit Biometric Specimen to Database
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
