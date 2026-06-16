import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  HelpCircle, 
  Check, 
  RefreshCw, 
  Mail, 
  Phone, 
  User, 
  Award, 
  ArrowRight, 
  Smartphone, 
  Compass, 
  Layers, 
  CheckCircle2, 
  Coins,
  Smile,
  Globe,
  Settings,
  ChevronRight,
  TrendingUp,
  FileCode,
  ShieldCheck
} from "lucide-react";
import { SEGMENTS } from "./data";
import { PriceSegment, SpinRecord } from "./types";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Device ID / Storage key configuration
  const STORAGE_KEY_SPINS = "agency_pricing_game_spins";
  const STORAGE_KEY_RECORDS = "agency_pricing_game_records";
  const STORAGE_KEY_CHOSEN = "agency_pricing_game_chosen";

  // State Management
  const [spinRecords, setSpinRecords] = useState<SpinRecord[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [chosenPlan, setChosenPlan] = useState<PriceSegment | null>(null);
  
  // Lead Generation form
  const [formName, setFormName] = useState<string>("");
  const [formPhone, setFormPhone] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formNotes, setFormNotes] = useState<string>("");
  
  // Submission result state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);
  const [systemAlertMessage, setSystemAlertMessage] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ sent: boolean; message?: string } | null>(null);

  // Load user spins state from localStorage on mount
  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (savedRecords) {
        const parsed = JSON.parse(savedRecords) as SpinRecord[];
        setSpinRecords(parsed);
        // Set active segment to the latest spin's segment
        if (parsed.length > 0) {
          const latest = parsed[parsed.length - 1];
          setActiveSegmentIndex(latest.segmentId);
        }
      }
      const savedChosen = localStorage.getItem(STORAGE_KEY_CHOSEN);
      if (savedChosen) {
        setChosenPlan(JSON.parse(savedChosen));
      }
    } catch (e) {
      console.error("Failed to restore localStorage cache:", e);
    }
  }, []);

  // Sync state to local storage
  const saveStateToStorage = (records: SpinRecord[]) => {
    setSpinRecords(records);
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error("Failed to save state to localStorage:", e);
    }
  };

  const currentSegment = SEGMENTS[activeSegmentIndex];
  const spinsUsed = spinRecords.length;
  const spinsLeft = Math.max(0, 3 - spinsUsed);

  // Wheel Spin trigger
  const handleSpinWheel = () => {
    if (isSpinning || spinsLeft <= 0) return;

    setIsSpinning(true);
    setSystemAlertMessage(null);

    // Calculate rotation: Spin between 4 to 6 full circles + random delta
    const extraDegrees = Math.floor(Math.random() * 360);
    const addedRotation = 1440 + extraDegrees; // Minimum 4 full spins
    const newRotation = rotation + addedRotation;
    setRotation(newRotation);

    // Find final stopped angle
    setTimeout(() => {
      setIsSpinning(false);
      
      const finalNormalizedDegree = newRotation % 360;
      // Pointer is located at 12 o'clock (270 degrees relative to 0 degree pointing right)
      // Segment lands at top satisfies: (start_deg + rotation_deg) % 360 = 270
      const pointerAngle = 270;
      const winningAngle = (pointerAngle - finalNormalizedDegree + 720) % 360;
      
      // 8 segments, each spans exactly 45 degrees
      const wonSegmentIndex = Math.floor(winningAngle / 45);
      setActiveSegmentIndex(wonSegmentIndex);

      const wonSegment = SEGMENTS[wonSegmentIndex];

      // Append spin record
      const newRecord: SpinRecord = {
        spinIndex: spinRecords.length + 1,
        segmentId: wonSegmentIndex,
        price: wonSegment.price,
        planName: wonSegment.name,
        timestamp: new Date().toLocaleTimeString(),
      };

      const updatedRecords = [...spinRecords, newRecord];
      saveStateToStorage(updatedRecords);

      // Auto-focus to active segment brief
    }, 4500); // 4.5s spin transition duration
  };

  // Select particular plan
  const handleSelectPlan = (segment: PriceSegment) => {
    setChosenPlan(segment);
    setSystemAlertMessage(null);
    try {
      localStorage.setItem(STORAGE_KEY_CHOSEN, JSON.stringify(segment));
    } catch (e) {
      console.error("Storage error:", e);
    }
    
    // Smooth scroll down to Lead capture form
    setTimeout(() => {
      document.getElementById("lead-capture-pane")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Submit Lead Capture details
  const handleFormSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosenPlan) {
      setSystemAlertMessage("Please spin the luck wheel and select a pricing plan tier first!");
      return;
    }
    if (!formName.trim() || !formPhone.trim() || !formEmail.trim()) {
      setSystemAlertMessage("Please provide your Name, Phone Number, and Email Address to secure this offer.");
      return;
    }

    setIsSubmitting(true);
    setSystemAlertMessage(null);

    try {
      const response = await fetch("/api/submit-lead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          email: formEmail,
          plan: {
            id: chosenPlan.id,
            price: chosenPlan.price,
            name: chosenPlan.name,
            description: chosenPlan.description,
          },
        }),
      });

      const data = await response.json();
      setIsSubmitting(false);

      if (response.ok && data.success) {
        setSubmissionSuccess(true);
        setEmailStatus({
          sent: data.emailSent,
          message: data.message,
        });
      } else {
        setSystemAlertMessage(data.error || "A custom server delivery failure occurred while logging details.");
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setSystemAlertMessage("Network error: Host could not compile or send data to Express server.");
      console.error("API submission error:", err);
    }
  };

  // Reset luck game to try again or clear storage
  const handleClearSession = () => {
    if (window.confirm("Do you wish to reset all spins and start again?")) {
      setSpinRecords([]);
      setActiveSegmentIndex(0);
      setChosenPlan(null);
      setFormName("");
      setFormPhone("");
      setFormEmail("");
      setFormNotes("");
      setSubmissionSuccess(false);
      setEmailStatus(null);
      setSystemAlertMessage(null);
      
      try {
        localStorage.removeItem(STORAGE_KEY_RECORDS);
        localStorage.removeItem(STORAGE_KEY_CHOSEN);
      } catch (e) {
        console.error("Fail clean storage:", e);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-[#f8fafc] flex flex-col font-sans transition-all duration-300">
      
      {/* Premium Sleek Navigation Bar */}
      <nav className="h-20 px-4 sm:px-10 flex items-center justify-between border-b border-white/10 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xl text-white">
            D
          </div>
          <span className="text-xl sm:text-2xl font-bold tracking-tight uppercase text-white">
            Dravion<span className="text-indigo-500">Digital</span>
          </span>
        </div>
        
        <div className="flex gap-4 sm:gap-6 items-center text-xs sm:text-sm font-medium text-slate-400">
          <div className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/50 rounded-full text-indigo-400 font-mono text-center">
            {spinsLeft} SPINS LEFT
          </div>

          {spinsUsed > 0 && (
            <button 
              id="reset-btn"
              onClick={handleClearSession}
              className="text-gray-400 hover:text-white transition flex items-center gap-1.5 bg-gray-800/40 hover:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700/50 text-xs cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0">
        
        {/* LEFT COLUMN: SPIN GAME CONTROLLER */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-900/40 border-b lg:border-b-0 lg:border-r border-white/5 p-6 sm:p-12 text-center">
          
          <h1 className="text-4xl font-extrabold mb-4 leading-tight text-white">
            Spin for your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              Dream Website
            </span>
          </h1>
          
          <p className="text-slate-400 mb-8 max-w-sm text-sm">
            Win premium digital solutions at exclusive local prices. From single-page portfolios to enterprise SEO bundles. Built-in CMS content tools.
          </p>

          {/* SPINNING WHEEL SYSTEM INTEGRATION */}
          <div className="relative my-4 select-none flex flex-col items-center">
            
            {/* The physical-feel pointer arrow from the mockup theme */}
            <div className="absolute -top-[23px] left-50% -translate-x-1/2 z-30 filter drop-shadow-[0_4px_10px_rgba(244,63,94,0.4)]">
              <div className="w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[28px] border-t-rose-500" />
            </div>

            {/* Segment boundaries highlight */}
            <div className={`p-4 rounded-full border-8 border-slate-800 bg-slate-950 shadow-2xl relative transition-all duration-300 ${
              isSpinning ? "ring-4 ring-indigo-500/20" : "ring-1 ring-white/10"
            }`}>

              {/* Glowing ledger lights around the circle */}
              {[...Array(8)].map((_, index) => {
                const angle = (index * 360) / 8;
                return (
                  <div
                    key={index}
                    className={`absolute w-1.5 h-1.5 rounded-full transition-all duration-300 z-20 ${
                      isSpinning 
                        ? index % 2 === 0 ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]" : "bg-indigo-400 shadow-[0_0_8px_#818cf8]"
                        : "bg-slate-700"
                    }`}
                    style={{
                      top: `calc(50% - 3px + ${Math.sin((angle * Math.PI) / 180) * 154}px)`,
                      left: `calc(50% - 3px + ${Math.cos((angle * Math.PI) / 180) * 154}px)`,
                    }}
                  />
                );
              })}

              {/* Smooth rotating circle element */}
              <div
                id="spinning-inner-wheel"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? "transform 4.5s cubic-bezier(0.15, 0.95, 0.35, 1.0)" : "none"
                }}
                className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-full overflow-hidden relative cursor-pointer"
              >
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full"
                >
                  {/* Sectors loop with modern gradient patterns */}
                  {SEGMENTS.map((seg, i) => {
                    const startAngle = i * 45;
                    const endAngle = (i + 1) * 45;
                    
                    const radStart = (startAngle * Math.PI) / 180;
                    const radEnd = (endAngle * Math.PI) / 180;
                    
                    const x1 = (100 + 100 * Math.cos(radStart)).toFixed(2);
                    const y1 = (100 + 100 * Math.sin(radStart)).toFixed(2);
                    const x2 = (100 + 100 * Math.cos(radEnd)).toFixed(2);
                    const y2 = (100 + 100 * Math.sin(radEnd)).toFixed(2);

                    const isEvenObj = i % 2 === 0;
                    const pathFillColor = isEvenObj ? "#1e293b" : "#0f172a";
                    const isWinningActive = activeSegmentIndex === i;
                    const textFillColor = isWinningActive ? "#818cf8" : (seg.price === 999 ? "#38bdf8" : "#f8fafc");

                    return (
                      <g key={seg.id} className="group transition-all duration-300">
                        {/* Wedge path */}
                        <path
                          d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                          fill={pathFillColor}
                          stroke="#ffffff10"
                          strokeWidth="1"
                          className="hover:opacity-90 transition-all duration-250"
                        />
                        
                        {/* Angular text labels */}
                        <g transform={`rotate(${startAngle + 22.5}, 100, 100)`}>
                          <text
                            x="154"
                            y="103"
                            fontSize="8"
                            fontWeight="800"
                            fill={textFillColor}
                            textAnchor="middle"
                            fontFamily="monospace"
                            transform={`rotate(90, 154, 100)`}
                          >
                            ₹{seg.price}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Absolute Center Anchor Node */}
                  <circle cx="100" cy="100" r="24" fill="#020617" stroke="#ffffff10" strokeWidth="2" />
                  <circle cx="100" cy="100" r="16" fill="#4f46e5" />
                </svg>
              </div>

              {/* Inner spin center indicator button element */}
              <div 
                onClick={handleSpinWheel}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-[#020617] rounded-full border-4 border-indigo-500 flex items-center justify-center z-20 shadow-2xl shadow-indigo-500/50 cursor-pointer active:scale-95 transition-transform"
              >
                <span className="text-[10px] font-extrabold text-white tracking-widest font-mono">SPIN</span>
              </div>

            </div>
          </div>

          {/* CLICK TO SPIN INTERACTIVE ACTION BUTTON */}
          <div className="w-full mt-6 max-w-sm px-4">
            {spinsLeft > 0 ? (
              <button
                id="spin-trigger-btn"
                disabled={isSpinning}
                onClick={handleSpinWheel}
                className={`w-full px-10 py-4 rounded-full font-bold text-base shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer ${
                  isSpinning 
                    ? "bg-slate-800 text-gray-500 cursor-not-allowed border border-white/5" 
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30 active:scale-95 hover:shadow-xl"
                }`}
              >
                {isSpinning ? "SPINNING FORTUNE..." : "CLICK TO SPIN"}
              </button>
            ) : (
              <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 text-xs text-slate-400">
                <span className="font-bold text-rose-400 block mb-1 uppercase tracking-wider font-mono">Spins Limit Exhausted</span>
                You have used all 3 secure device opportunities. Select a plan below to continue.
              </div>
            )}
            
            {/* Show simple device warning details */}
            <p className="text-[10px] text-slate-500 tracking-tight mt-3 font-mono">
              ★ DEMO LIMIT: 3 MAXIMUM DEVICE SPINS ALLOWED
            </p>
          </div>

          {/* SPOOL OF LOG HISTORIES IN BOTTOM CORNER */}
          {spinRecords.length > 0 && (
            <div className="w-full max-w-sm mt-8 text-left border-t border-white/5 pt-4">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500 block mb-2.5 font-mono">
                Historical Wins ({spinRecords.length}):
              </span>
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                {spinRecords.map((rec) => (
                  <div 
                    key={rec.spinIndex}
                    onClick={() => !isSpinning && setActiveSegmentIndex(rec.segmentId)}
                    className={`p-2 rounded-xl text-xs flex items-center justify-between border cursor-pointer transition ${
                      activeSegmentIndex === rec.segmentId
                        ? "bg-indigo-950/40 border-indigo-500/50"
                        : "bg-slate-900/40 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">#{rec.spinIndex}</span>
                      <span className="font-semibold text-white truncate max-w-[130px]">{rec.planName}</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">₹{rec.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: ACTIVE SELECTION PREVIEW AND SECURE LEAD Capture FORM */}
        <div className="lg:col-span-7 p-6 sm:p-12 md:p-16 flex flex-col justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-y-auto">
          
          {/* Active selection display block */}
          <div className="glass p-6 sm:p-8 rounded-3xl mb-8 relative border border-white/10 shadow-2xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-6 pb-6 border-b border-white/10">
              <div>
                <span className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-indigo-400 text-xs font-bold uppercase tracking-widest block w-fit mb-3">
                  Active Selection
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{currentSegment.name}</h3>
                <p className="text-slate-400 text-xs mt-1 max-w-sm italic">"{currentSegment.description}"</p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">₹{currentSegment.price}</span>
                <div className="text-[10px] text-slate-500 line-through tracking-wider mt-1 font-mono uppercase">
                  Valued at: ₹{currentSegment.price === 10000 ? "35,000" : (currentSegment.price * 3).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Included Portfolio list checkmarks */}
            <div>
              <span className="text-[11px] font-bold text-indigo-300 block mb-3 font-mono uppercase tracking-widest">
                ✓ INCLUDED FEATURING DELIVERABLES:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                {currentSegment.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Selective layout click handler */}
            {!chosenPlan && (
              <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                <button
                  disabled={spinsUsed === 0 || isSpinning}
                  onClick={() => handleSelectPlan(currentSegment)}
                  className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
                    spinsUsed === 0 || isSpinning
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg hover:shadow-emerald-500/20"
                  }`}
                >
                  Confirm Choice & Set Details
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            )}

          </div>

          {/* CAPTURED STATE OR FINAL SECURED PROPOSAL DETAILS */}
          <div id="lead-capture-pane" className="scroll-mt-24">
            {chosenPlan ? (
              <div className="glass p-6 sm:p-8 rounded-3xl border border-white/10 bg-slate-900/60 relative overflow-hidden transition-all duration-300">
                
                {!submissionSuccess ? (
                  <form onSubmit={handleFormSubmission} className="space-y-4">
                    
                    <div className="mb-4">
                      <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1 rounded-full text-xs font-mono font-bold inline-flex items-center gap-1 mb-2">
                        OFFER SECURED: ₹{chosenPlan.price} COST
                      </div>
                      <h4 className="text-xl font-bold text-white">Secure Your Deal</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Locked plan: <strong className="text-indigo-400">{chosenPlan.name}</strong>. Submit details to dispatch contract proposal to dravion456@gmail.com instantly.
                      </p>
                    </div>

                    {systemAlertMessage && (
                      <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-lg text-xs">
                        ⚠️ Status: {systemAlertMessage}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name input */}
                      <div className="space-y-1">
                        <input
                          type="text"
                          required
                          placeholder="Full Name"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 text-white text-xs sm:text-sm"
                        />
                      </div>

                      {/* Email Address */}
                      <div className="space-y-1">
                        <input
                          type="email"
                          required
                          placeholder="Email Address"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          className="w-full bg-slate-950 border border-white/10 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 text-white text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    {/* Phone field */}
                    <div className="space-y-1">
                      <input
                        type="tel"
                        required
                        placeholder="Phone Number"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 text-white text-xs sm:text-sm"
                      />
                    </div>

                    {/* Short optional specifications */}
                    <div className="space-y-1">
                      <textarea
                        placeholder="Project requirements, core pages, or preferred branding colors... (Optional)"
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        rows={2}
                        className="w-full bg-slate-950 border border-white/10 p-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600 text-white text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4.5 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 rounded-xl font-bold text-white shadow-xl hover:opacity-95 active:scale-95 transition-all text-sm cursor-pointer"
                    >
                      {isSubmitting ? "THROTTLING SECURE DELIVERY..." : "LOCK IN THIS PRICE"}
                    </button>
                    
                    <p className="text-[10px] text-center text-slate-500 uppercase tracking-tighter col-span-2 font-mono">
                      Confirmations are sent directly to dravion456@gmail.com for review
                    </p>

                  </form>
                ) : (
                  
                  /* REAL-TIME NOTIFICATION DELIVERY SUCCESS */
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-emerald-400" strokeWidth={2.5} />
                    </div>
                    
                    <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase bg-emerald-950/60 border border-emerald-900/60 px-3 py-1 rounded-full">
                      Proposal Submitted Successfully
                    </span>
                    <h3 className="text-2xl font-extrabold text-white mt-4">Thank You, {formName}!</h3>
                    <p className="text-xs text-slate-300 mt-2 max-w-sm mx-auto">
                      All won parameters have been registered and captured. We look forward to launching your new business portfolio!
                    </p>

                    {/* Metadata summary recap box */}
                    <div className="bg-slate-950 border border-white/5 p-4 rounded-xl max-w-xs mx-auto my-5 text-left text-xs space-y-2">
                      <div className="flex justify-between font-mono text-[10.5px]">
                        <span className="text-slate-500">Tier:</span>
                        <span className="text-white font-bold">{chosenPlan.name}</span>
                      </div>
                      <div className="flex justify-between font-mono text-[10.5px]">
                        <span className="text-slate-500">Price Locked:</span>
                        <span className="text-emerald-400 font-bold">₹{chosenPlan.price}</span>
                      </div>
                      <div className="flex justify-between font-mono text-[10.5px]">
                        <span className="text-slate-500">Contact Email:</span>
                        <span className="text-white truncate max-w-[140px]">{formEmail}</span>
                      </div>
                      <div className="flex justify-between font-mono text-[10.5px] border-t border-white/5 pt-1.5">
                        <span className="text-slate-500">Nodemailer:</span>
                        <span className="text-indigo-400 font-bold">{emailStatus?.sent ? "DELIVERED" : "LOGGED"}</span>
                      </div>
                    </div>

                    {!emailStatus?.sent && (
                      <div className="text-[9px] text-[#fbbf24] bg-amber-950/20 border border-amber-900/50 rounded-lg p-2.5 max-w-xs mx-auto mb-4 font-mono leading-relaxed text-left">
                        <strong>Demo Sandbox Reminder:</strong> The lead has been logged locally in-memory. For actual Gmail delivery, bind <code>SMTP_USER</code> & <code>SMTP_PASS</code> inside the backend variables.
                      </div>
                    )}

                    <button
                      onClick={handleClearSession}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-mono font-bold tracking-widest uppercase flex items-center justify-center gap-1.5 mx-auto py-2.5 border-b border-indigo-500/20 hover:border-indigo-400/50 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> SPIN FOR NEW DEAL
                    </button>

                  </div>
                )}

              </div>
            ) : (
              <div className="p-10 border border-dashed border-white/10 rounded-3xl text-center text-slate-500 flex flex-col items-center justify-center min-h-[160px]">
                <HelpCircle className="w-10 h-10 text-slate-600 mb-2" />
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">Form Locked</span>
                <p className="text-xs text-slate-500 max-w-xs mt-1 italic">
                  Spin the lucky pricing wheel on the left and select your favorite tier to display the secure proposal lead form details area.
                </p>
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Modern Sleek Footer */}
      <footer className="h-16 md:h-12 border-t border-white/5 bg-slate-950 px-4 sm:px-10 flex flex-col md:flex-row items-center justify-between text-[10px] text-slate-550 uppercase tracking-widest font-semibold gap-2 py-4 md:py-0">
        <div>&copy; 2026 DRAVION DIGITAL SOLUTIONS</div>
        <div>ENHANCING SMALL BUSINESSES WORLDWIDE</div>
        <div>GMAIL: DRAVION456@GMAIL.COM</div>
      </footer>

    </div>
  );
}
