import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { getDailyPrompt } from '../prompts';

export default function JournalTab({ onEntrySaved }) {
  const [prompt, setPrompt] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, recording, processing, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [shredAnimation, setShredAnimation] = useState(false);

  const recognitionRef = useRef(null);

  useEffect(() => {
    setPrompt(getDailyPrompt());
  }, []);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (!SpeechRecognition) {
      setErrorMessage("Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      setStatus('error');
      return;
    }

    setErrorMessage('');
    setStatus('recording');

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => (prev + finalTranscript).replace(/\s+/g, ' '));
        }
      };

      rec.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        if (event.error !== 'no-speech') {
          setErrorMessage(`Microphone error: ${event.error}. Please check permissions.`);
          setStatus('error');
          setIsRecording(false);
        }
      };

      rec.onend = () => {
        setIsRecording(false);
        if (status === 'recording') {
          setStatus('idle');
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      setErrorMessage("Failed to access microphone. Please check permissions.");
      setStatus('error');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    setStatus('idle');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transcript.trim()) return;

    setStatus('processing');
    setShredAnimation(true);

    const rawInputToSend = transcript;

    // Instantly begin local shredding visual effect: clear the transcript from state
    // so it doesn't linger on screen or local state
    setTranscript('');

    try {
      const token = localStorage.getItem('diary_token');
      const apiBase = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${apiBase}/api/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rawTranscript: rawInputToSend,
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Server returned an error');
      }

      setStatus('success');
      setShredAnimation(false);
      if (onEntrySaved) onEntrySaved();

      // Reset success status after a delay
      setTimeout(() => {
        setStatus('idle');
      }, 3000);

    } catch (error) {
      console.error("Failed to submit entry:", error);
      // Restore transcript in case of error so user doesn't lose their writing
      setTranscript(rawInputToSend);
      setErrorMessage("Failed to submit entry. Please verify your connection and Gemini API Key.");
      setStatus('error');
      setShredAnimation(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      {/* Daily Prompt Card */}
      <div className="glass-panel rounded-2xl p-8 relative overflow-hidden shadow-glow-primary transition-all duration-300">
        <div className="absolute -right-16 -top-16 w-36 h-36 rounded-full bg-primary/20 blur-3xl"></div>
        <div className="absolute -left-16 -bottom-16 w-36 h-36 rounded-full bg-accent-teal/10 blur-3xl"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full border border-primary/20">
              Daily Flash Prompt
            </span>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-slate-100 leading-snug">
            "{prompt}"
          </h2>
        </div>
      </div>

      {/* Shredder Workspace Card */}
      <div className="glass-panel rounded-2xl p-8 relative shadow-glass border border-white/5 space-y-6">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <h3 className="font-semibold text-slate-200">The Vibe Shredder</h3>
            <p className="text-xs text-slate-400">Speak or write freely. Raw thoughts are shredded; only clean summaries are kept.</p>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-accent-teal bg-accent-teal/10 px-2.5 py-1 rounded-full border border-accent-teal/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero-Retention Policy</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <textarea
              className={`w-full h-40 p-4 bg-slate-900/60 border rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 resize-none ${
                shredAnimation ? 'opacity-30 blur-sm scale-95' : 'opacity-100'
              } ${
                isRecording ? 'border-accent-teal/40 ring-1 ring-accent-teal/25' : 'border-white/10'
              }`}
              placeholder="Start typing your raw thoughts here, or click the mic button below to stream your voice..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              disabled={status === 'processing'}
            />

            {shredAnimation && (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-background/20 backdrop-blur-[2px] rounded-xl">
                <span className="text-xs font-bold tracking-wider text-primary animate-pulse">SHREDDING RAW TRANSCRIPT...</span>
                <span className="text-[10px] text-slate-400">Condensing with Gemini & securing database...</span>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between">
            {/* Microphone Control */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={toggleRecording}
                disabled={status === 'processing'}
                className={`relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 focus:outline-none ${
                  isRecording
                    ? 'bg-accent-rose text-white shadow-glow-teal hover:scale-105'
                    : 'bg-primary text-white shadow-glow-primary hover:bg-primary-dark hover:scale-105'
                } disabled:opacity-50`}
              >
                {/* Custom Ripple Ring for Record Status */}
                {isRecording && (
                  <div className="absolute inset-0 rounded-full bg-accent-rose animate-ripple"></div>
                )}
                {isRecording ? <MicOff className="w-6 h-6 relative z-10 animate-pulse-slow" /> : <Mic className="w-6 h-6 relative z-10" />}
              </button>

              <div className="text-left">
                <span className="block text-xs font-medium text-slate-400">
                  {isRecording ? 'Listening...' : 'Voice Stream'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {isRecording ? 'Click to pause capture' : 'Record rambling thoughts'}
                </span>
              </div>
            </div>

            {/* Submission Button */}
            <button
              type="submit"
              disabled={!transcript.trim() || status === 'processing'}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary to-accent-violet hover:from-primary-dark hover:to-primary text-white font-medium rounded-xl transition-all duration-300 disabled:opacity-30 disabled:pointer-events-none hover:shadow-glow-primary active:scale-95"
            >
              <span>Shred & Save</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Status Alerts */}
        {status === 'success' && (
          <div className="flex items-start space-x-3 p-4 bg-accent-teal/10 border border-accent-teal/20 rounded-xl text-accent-teal text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Transcript Shredded Successfully</p>
              <p className="text-xs text-slate-400">The raw stream has been wiped from memory. The condensed, objective takeaway is securely stored.</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-start space-x-3 p-4 bg-accent-rose/10 border border-accent-rose/20 rounded-xl text-accent-rose text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Oops! Something went wrong</p>
              <p className="text-xs text-slate-300">{errorMessage}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
