/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Battery, 
  Smartphone, 
  Camera, 
  UserPlus, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Home, 
  History, 
  ArrowRight, 
  LogOut, 
  Bell, 
  Send,
  Loader2,
  Lock,
  User,
  Activity
} from 'lucide-react';
import { Person } from '../types';

interface MobileSimulatorProps {
  onRefreshLogs: () => void;
  watchlistAlerts: any[];
}

interface QueuedItem {
  id: string;
  type: 'enroll' | 'scan';
  timestamp: string;
  payload: any;
  image: string;
}

export default function MobileSimulator({ onRefreshLogs, watchlistAlerts }: MobileSimulatorProps) {
  // Mobile UI screens: 'login' | 'home' | 'scan' | 'enroll' | 'queue' | 'result'
  const [screen, setScreen] = useState<'login' | 'home' | 'scan' | 'enroll' | 'queue' | 'result'>('login');
  
  // Simulated mobile status
  const [isOnline, setIsOnline] = useState(true);
  const [operator, setOperator] = useState<any>(null);
  const [email, setEmail] = useState('mobile@facematch.pro');
  const [password, setPassword] = useState('password');
  const [loginError, setLoginError] = useState('');

  // Offline capture queues
  const [localQueue, setLocalQueue] = useState<QueuedItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Scan & Match State inside phone
  const [phoneCamImage, setPhoneCamImage] = useState<string | null>(null);
  const [phoneCamActive, setPhoneCamActive] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  // Field Enrollment State
  const [enrollName, setEnrollName] = useState('');
  const [enrollCnic, setEnrollCnic] = useState('');
  const [enrollCategory, setEnrollCategory] = useState('Visitor');

  // Push alerts receiver list
  const [receivedAlerts, setReceivedAlerts] = useState<string[]>([]);
  const [lastAlertCount, setLastAlertCount] = useState(0);

  const phoneVideoRef = useRef<HTMLVideoElement | null>(null);
  const phoneCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Check for watchlist alerts to pop notifications
  useEffect(() => {
    const activeUnresolved = watchlistAlerts.filter(a => a.status === 'Unresolved');
    if (activeUnresolved.length > lastAlertCount) {
      // New threat spotted in database! Trigger mobile push alert simulation
      const newAlert = activeUnresolved[0];
      setReceivedAlerts(prev => [
        `⚠️ DISPATCH ALERT: Suspect "${newAlert.matchedPersonName}" verified at ${newAlert.cameraSource}. Intercept.`,
        ...prev
      ]);
    }
    setLastAlertCount(activeUnresolved.length);
  }, [watchlistAlerts, lastAlertCount]);

  // Handle phone operator login
  const handlePhoneLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (email === 'mobile@facematch.pro') {
      setOperator({ name: 'Field Operator Qasim', role: 'Mobile App User' });
      setScreen('home');
    } else {
      setLoginError('Invalid field access credentials.');
    }
  };

  const startPhoneCamera = async () => {
    setPhoneCamImage(null);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480, facingMode: 'environment' },
        audio: false
      });
      if (phoneVideoRef.current) {
        phoneVideoRef.current.srcObject = stream;
        phoneVideoRef.current.play();
        setPhoneCamActive(true);
      }
    } catch (e) {
      console.error('Mobile camera start error:', e);
    }
  };

  const stopPhoneCamera = () => {
    if (phoneVideoRef.current && phoneVideoRef.current.srcObject) {
      const stream = phoneVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      phoneVideoRef.current.srcObject = null;
    }
    setPhoneCamActive(false);
  };

  const snapPhonePhoto = () => {
    if (phoneVideoRef.current && phoneCanvasRef.current) {
      const canvas = phoneCanvasRef.current;
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(phoneVideoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhoneCamImage(dataUrl);
        stopPhoneCamera();

        if (screen === 'scan') {
          processMobileFaceMatch(dataUrl);
        }
      }
    }
  };

  // Process matching
  const processMobileFaceMatch = async (image: string) => {
    if (!isOnline) {
      // OFFLINE: Queue match requests
      const item: QueuedItem = {
        id: 'q_' + Math.random().toString(36).substr(2, 9),
        type: 'scan',
        timestamp: new Date().toISOString(),
        payload: { cameraSource: 'Mobile Handheld Terminal', operator: operator?.name },
        image
      };
      setLocalQueue(prev => [...prev, item]);
      setScanResult({ offlineQueued: true });
      setScreen('result');
      return;
    }

    // ONLINE: Match immediately
    setScanning(true);
    try {
      const res = await fetch('/api/face/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          mode: '1:N',
          cameraSource: 'Mobile Handheld Terminal',
          operator: operator?.name || 'Mobile Operator'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setScanResult(data.log);
        onRefreshLogs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
      setScreen('result');
    }
  };

  // Submit Mobile Enrollment
  const handleMobileEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollName || !enrollCnic || !phoneCamImage) return;

    if (!isOnline) {
      // OFFLINE: Queue enrollment
      const item: QueuedItem = {
        id: 'q_' + Math.random().toString(36).substr(2, 9),
        type: 'enroll',
        timestamp: new Date().toISOString(),
        payload: { name: enrollName, cnic: enrollCnic, category: enrollCategory, consentSigned: true, operator: operator?.name },
        image: phoneCamImage
      };
      setLocalQueue(prev => [...prev, item]);
      alert('⚠️ Terminal is offline. Saved to capture queue.');
      setScreen('home');
      setEnrollName('');
      setEnrollCnic('');
      setPhoneCamImage(null);
      return;
    }

    // ONLINE: Enroll immediately
    setScanning(true);
    fetch('/api/persons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: enrollName,
        cnic: enrollCnic,
        category: enrollCategory,
        profileImage: phoneCamImage,
        consentSigned: true,
        operator: operator?.name || 'Mobile Operator'
      })
    })
      .then(res => {
        if (res.ok) {
          alert('✓ Person biometrics enrolled to main server.');
          setScreen('home');
          setEnrollName('');
          setEnrollCnic('');
          setPhoneCamImage(null);
          onRefreshLogs();
        } else {
          res.json().then(d => alert(d.error || 'Enrollment error.'));
        }
      })
      .catch(() => alert('Network error submitting face.'))
      .finally(() => setScanning(false));
  };

  // Sync Offline queue back to backend
  const triggerQueueSync = async () => {
    if (localQueue.length === 0) return;
    setSyncing(true);

    for (const item of localQueue) {
      try {
        if (item.type === 'enroll') {
          await fetch('/api/persons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: item.payload.name,
              cnic: item.payload.cnic,
              category: item.payload.category,
              profileImage: item.image,
              consentSigned: true,
              operator: item.payload.operator
            })
          });
        } else {
          await fetch('/api/face/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image: item.image,
              mode: '1:N',
              cameraSource: 'Mobile Synced Node',
              operator: item.payload.operator
            })
          });
        }
      } catch (err) {
        console.error('Error syncing queue block:', err);
      }
    }

    setLocalQueue([]);
    setSyncing(false);
    onRefreshLogs();
    alert('✓ All offline queue captures have been synced!');
  };

  return (
    <div className="bg-gray-100 p-6 rounded-2xl flex flex-col items-center justify-center border border-gray-200 shadow-inner max-w-lg mx-auto relative overflow-hidden">
      
      {/* Simulation Controls Header */}
      <div className="w-full flex items-center justify-between bg-white px-4 py-2.5 rounded-xl mb-6 shadow-xs border border-gray-200">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          ) : (
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
          )}
          <span className="text-xs font-semibold text-gray-700">Mobile Terminal Connectivity</span>
        </div>
        <button
          onClick={() => {
            setIsOnline(!isOnline);
            if (!isOnline && localQueue.length > 0) {
              alert('Cellular internet restored. Open Local Queue log to synchronize pending records.');
            }
          }}
          className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
            isOnline 
              ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          {isOnline ? 'Simulate Disconnection' : 'Restore Internet'}
        </button>
      </div>

      {/* SMARTPHONE FRAME DISPLAY */}
      <div className="relative w-72 h-[540px] bg-gray-950 rounded-[40px] border-[10px] border-gray-900 shadow-2xl overflow-hidden flex flex-col justify-between">
        
        {/* Notch details */}
        <div className="absolute top-0 inset-x-0 h-5 bg-gray-950 flex justify-center items-center z-30">
          <div className="w-24 h-3.5 bg-gray-900 rounded-b-xl flex items-center justify-around px-2">
            <span className="h-1.5 w-1.5 bg-gray-950 rounded-full" />
            <span className="h-1 w-8 bg-gray-950 rounded-full" />
          </div>
        </div>

        {/* TOP STATUS BAR IN PHONE */}
        <div className="bg-gray-950 pt-5 px-5 pb-1 flex items-center justify-between text-[9px] font-bold text-white z-20 font-mono">
          <span>12:15 PM</span>
          <div className="flex items-center gap-1.5">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3 text-red-500" />}
            <span>5G</span>
            <Battery className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* SCREEN CANVAS INNER CONTENT (SCROLLABLE AREA) */}
        <div className="flex-1 bg-gray-900 overflow-y-auto px-4 py-3 relative text-white flex flex-col justify-between">
          
          {/* PHONE SCREEN: LOGIN */}
          {screen === 'login' && (
            <div className="flex-1 flex flex-col justify-center space-y-6 animate-in fade-in">
              <div className="text-center space-y-2">
                <div className="h-10 w-10 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center font-bold text-sm tracking-wide">
                  FM
                </div>
                <h3 className="font-bold text-sm tracking-wide text-white">FaceMatch Terminal</h3>
                <p className="text-[10px] text-gray-400">Secure operator field biometrics portal</p>
              </div>

              <form onSubmit={handlePhoneLogin} className="space-y-3">
                <div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@organization.com"
                    className="w-full text-xs p-2.5 bg-gray-800 border border-gray-700 rounded-lg outline-none text-white focus:border-indigo-500"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full text-xs p-2.5 bg-gray-800 border border-gray-700 rounded-lg outline-none text-white focus:border-indigo-500"
                  />
                </div>

                {loginError && <p className="text-[10px] text-red-400">{loginError}</p>}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm text-center block"
                >
                  Operator Log-In
                </button>
              </form>

              <div className="text-center">
                <span className="text-[9px] text-indigo-400 cursor-pointer block underline" onClick={() => setEmail('mobile@facematch.pro')}>
                  Tap here to autofill mock creds
                </span>
              </div>
            </div>
          )}

          {/* PHONE SCREEN: HOME / MOBILE DASHBOARD */}
          {screen === 'home' && (
            <div className="flex-1 flex flex-col justify-between space-y-4 animate-in fade-in">
              <div className="space-y-3">
                
                {/* Greeting banner */}
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-6 w-6 rounded-full bg-indigo-700 flex items-center justify-center text-[10px] font-bold">
                      Q
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Field Op Qasim</h4>
                      <p className="text-[8px] text-gray-400">Biometric access user</p>
                    </div>
                  </div>
                  <button onClick={() => { setOperator(null); setScreen('login'); }} className="text-gray-400 hover:text-white">
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Offline state indicator warning */}
                {!isOnline && (
                  <div className="bg-red-950/40 border border-red-900/30 text-red-300 rounded-lg p-2 text-[10px] flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>Device Offline: Captures will be stored in offline local memory queue.</span>
                  </div>
                )}

                {/* Local Queued capture logs metric */}
                {localQueue.length > 0 && (
                  <div className="bg-amber-950/40 border border-amber-900/30 text-amber-300 rounded-lg p-2.5 text-[10px] flex items-center justify-between">
                    <span>{localQueue.length} Pending Local Sync Capture(s)</span>
                    <button onClick={() => setScreen('queue')} className="text-indigo-400 font-bold hover:underline">Manage</button>
                  </div>
                )}

                {/* Main Operations buttons inside phone */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => { setScreen('scan'); startPhoneCamera(); }}
                    className="w-full p-3.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-left flex items-center justify-between border border-gray-800 hover:border-gray-700 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Camera className="h-4.5 w-4.5 text-indigo-400" />
                      <div>
                        <span className="text-xs font-bold block text-white">Match Face</span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">Identify scanned faces in 1:N mode</span>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
                  </button>

                  <button
                    onClick={() => { setScreen('enroll'); }}
                    className="w-full p-3.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-left flex items-center justify-between border border-gray-800 hover:border-gray-700 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <UserPlus className="h-4.5 w-4.5 text-emerald-400" />
                      <div>
                        <span className="text-xs font-bold block text-white">Enroll Face</span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">Register new person telemetry</span>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
                  </button>

                  <button
                    onClick={() => setScreen('queue')}
                    className="w-full p-3.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-left flex items-center justify-between border border-gray-800 hover:border-gray-700 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <History className="h-4.5 w-4.5 text-amber-400" />
                      <div>
                        <span className="text-xs font-bold block text-white">Sync Queue</span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">{localQueue.length} entries awaiting push</span>
                      </div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>

              </div>

              {/* Push alerts receiver list */}
              {receivedAlerts.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] text-gray-500 font-bold uppercase block tracking-wider">Device Push Dispatch</span>
                  <div className="bg-red-950/80 border border-red-900/60 rounded-lg p-2 max-h-24 overflow-y-auto text-[9px] text-red-300 font-sans space-y-1">
                    {receivedAlerts.map((al, id) => (
                      <div key={id} className="border-b border-red-900/40 pb-1 last:border-0">{al}</div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* PHONE SCREEN: SCAN / MATCH CAMERA VIEW */}
          {screen === 'scan' && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in">
              <div className="text-center">
                <h4 className="text-xs font-bold">Biometric Matching Scan</h4>
                <p className="text-[9px] text-gray-400">Position face directly in viewport bounds</p>
              </div>

              <div className="relative aspect-square bg-black rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center">
                
                {phoneCamActive && (
                  <video 
                    ref={phoneVideoRef}
                    autoPlay 
                    playsInline 
                    muted 
                    className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                  />
                )}

                {phoneCamImage && (
                  <img src={phoneCamImage} className="absolute inset-0 w-full h-full object-cover" />
                )}

                {/* Target overlay guide */}
                <div className="absolute inset-0 border border-indigo-500/20 pointer-events-none flex items-center justify-center">
                  <div className="w-28 h-28 border-2 border-indigo-500/35 rounded-full" />
                </div>
              </div>

              <div className="flex gap-1.5">
                {phoneCamActive ? (
                  <button
                    onClick={snapPhonePhoto}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer text-center"
                  >
                    Snap Specimen
                  </button>
                ) : (
                  <button
                    onClick={() => { setPhoneCamImage(null); startPhoneCamera(); }}
                    className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold cursor-pointer text-center"
                  >
                    Retake Stream
                  </button>
                )}
                
                <button
                  onClick={() => { stopPhoneCamera(); setScreen('home'); }}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-semibold cursor-pointer text-center"
                >
                  Back
                </button>
              </div>

              <canvas ref={phoneCanvasRef} className="hidden" />
            </div>
          )}

          {/* PHONE SCREEN: BIOMETRIC ENROLLMENT FORM */}
          {screen === 'enroll' && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in">
              <div className="text-center">
                <h4 className="text-xs font-bold">Enroll Subject Biometrics</h4>
                <p className="text-[9px] text-gray-400">Registry input via mobile terminal</p>
              </div>

              <form onSubmit={handleMobileEnrollSubmit} className="space-y-2.5">
                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">Subject Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Amir Khan"
                    value={enrollName}
                    onChange={e => setEnrollName(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-800 border border-gray-700 rounded-lg outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-bold text-gray-400 uppercase">CNIC / ID Number</label>
                  <input
                    type="text"
                    required
                    placeholder="37405-1234567-1"
                    value={enrollCnic}
                    onChange={e => setEnrollCnic(e.target.value)}
                    className="w-full text-xs p-2 bg-gray-800 border border-gray-700 rounded-lg outline-none focus:border-indigo-500 text-white"
                  />
                </div>

                {/* Mini picture capture preview inside form */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setScreen('scan'); startPhoneCamera(); }}
                    className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] rounded font-semibold cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Camera className="h-3 w-3" />
                    {phoneCamImage ? 'Specimen Taken ✓' : 'Take Specimen Face'}
                  </button>
                  {phoneCamImage && (
                    <span className="text-[8px] text-emerald-400 font-mono truncate">Ready</span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!enrollName || !enrollCnic || !phoneCamImage}
                  className={`w-full py-2 rounded-lg text-xs font-semibold text-center block ${
                    enrollName && enrollCnic && phoneCamImage
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Enroll Biometrics
                </button>
              </form>

              <button onClick={() => setScreen('home')} className="w-full text-center text-gray-500 hover:text-white text-[10px]">
                Cancel / Return
              </button>
            </div>
          )}

          {/* PHONE SCREEN: SYNC QUEUE MANAGEMENT */}
          {screen === 'queue' && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in">
              <div className="text-center">
                <h4 className="text-xs font-bold">Local Terminal Sync queue</h4>
                <p className="text-[9px] text-gray-400">Buffered biometric entries offline</p>
              </div>

              <div className="flex-1 overflow-y-auto max-h-56 space-y-2 py-2">
                {localQueue.length > 0 ? (
                  localQueue.map((item, idx) => (
                    <div key={idx} className="bg-gray-800 p-2.5 rounded-lg border border-gray-700 flex items-center justify-between gap-2 text-[10px]">
                      <div>
                        <span className={`px-1 rounded text-[8px] font-bold ${item.type === 'enroll' ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/40' : 'bg-indigo-950/60 text-indigo-400 border border-indigo-900/40'}`}>
                          {item.type}
                        </span>
                        <h4 className="font-bold text-white mt-1">
                          {item.type === 'enroll' ? item.payload.name : '1:N Match Scan Specimen'}
                        </h4>
                        <p className="text-gray-400 font-mono text-[8px]">{new Date(item.timestamp).toLocaleTimeString()}</p>
                      </div>
                      
                      <button onClick={() => setLocalQueue(prev => prev.filter(q => q.id !== item.id))} className="text-red-400 hover:text-red-300">
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-500 space-y-1.5">
                    <CheckCircle className="h-8 w-8 mx-auto text-gray-700" />
                    <p className="text-xs">All terminals fully synced.</p>
                  </div>
                )}
              </div>

              {localQueue.length > 0 && (
                <button
                  onClick={triggerQueueSync}
                  disabled={syncing || !isOnline}
                  className={`w-full py-2 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5 ${
                    isOnline && !syncing
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Push Synced Queue Back
                </button>
              )}

              <button onClick={() => setScreen('home')} className="w-full text-center text-gray-500 hover:text-white text-[10px]">
                Return Home
              </button>
            </div>
          )}

          {/* PHONE SCREEN: EVALUATION SPECIMEN MATCH RESULT */}
          {screen === 'result' && (
            <div className="flex-1 flex flex-col justify-between space-y-3 animate-in fade-in">
              <div className="text-center">
                <h4 className="text-xs font-bold">Biometric Scan Assessment</h4>
                <p className="text-[9px] text-gray-400">Response from local vector registers</p>
              </div>

              {scanResult ? (
                scanResult.offlineQueued ? (
                  <div className="bg-amber-950/40 border border-amber-900/30 rounded-xl p-4 text-center space-y-2 py-8">
                    <WifiOff className="h-10 w-10 mx-auto text-amber-500 animate-pulse" />
                    <h5 className="font-bold text-amber-400 text-sm">Offline Capture Queued</h5>
                    <p className="text-[10px] text-gray-300">No connectivity detected. Biometric stream queued locally in sandbox memory.</p>
                  </div>
                ) : (
                  <div className="space-y-3 bg-gray-800 p-3.5 rounded-xl border border-gray-700">
                    <div className="text-center space-y-1">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full inline-block uppercase tracking-wider ${
                        scanResult.matchStatus === 'Match' 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' 
                          : 'bg-gray-950 text-gray-400 border border-gray-800'
                      }`}>
                        {scanResult.matchStatus}
                      </span>
                      <h5 className="font-bold text-sm text-white">
                        {scanResult.matchedPersonName || 'No Match - Unknown Face'}
                      </h5>
                      <p className="text-[9px] text-gray-400 font-mono">Similarity Distance: {scanResult.similarityScore}%</p>
                    </div>

                    <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${scanResult.matchStatus === 'Match' ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${scanResult.similarityScore}%` }}
                      />
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 mx-auto animate-spin" />
                </div>
              )}

              <button
                onClick={() => { setPhoneCamImage(null); setScanResult(null); setScreen('home'); }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold cursor-pointer text-center"
              >
                Return to Terminal Dashboard
              </button>
            </div>
          )}

        </div>

        {/* Home gesture indicator pill */}
        <div className="h-5 bg-gray-950 flex justify-center items-center">
          <div className="w-24 h-1 bg-gray-800 rounded-full" />
        </div>

      </div>
    </div>
  );
}
