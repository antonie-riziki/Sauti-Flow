import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Check, ChevronRight, LoaderCircle, Mic, Sparkles, Volume2, X} from 'lucide-react';
import {executeNativeTool, getBridgeStatus} from './native/sautiFlowBridge.js';
import './styles.css';

const examples = ['Check my Airtel data balance', 'Call Mum', 'Text John I’m on my way'];
const statusCopy = {
  idle: 'Tap to speak', listening: 'Listening… tap again when you’re done', processing: 'Understanding your request…',
  clarifying: 'I need one more detail', confirming: 'Your confirmation is needed', executing: 'Preparing the Android hand-off…',
  speaking: 'Speaking', success: 'Plan ready', error: 'I couldn’t complete that.'
};

function streamText(text, setResponse, timers, done) {
  timers.current.forEach(clearTimeout);
  timers.current = [];
  setResponse('');
  [...text].forEach((_, index) => timers.current.push(setTimeout(() => setResponse(text.slice(0, index + 1)), index * 13)));
  timers.current.push(setTimeout(done, text.length * 13 + 280));
}

function App() {
  const [state, setState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('Ready when you are.');
  const [command, setCommand] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [nativeStatus, setNativeStatus] = useState({connected: false, platform: 'web'});
  const recognition = useRef(null);
  const audio = useRef(null);
  const timers = useRef([]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audio.current) { audio.current.pause(); audio.current.src = ''; audio.current = null; }
  }, []);

  const speak = useCallback(async (text) => {
    stopSpeaking();
    if (online) {
      try {
        const result = await fetch('/api/voice', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({text})});
        if (result.ok) {
          const source = URL.createObjectURL(await result.blob());
          const player = new Audio(source);
          audio.current = player;
          setState('speaking');
          player.onended = () => { URL.revokeObjectURL(source); audio.current = null; setState('success'); };
          await player.play();
          return;
        }
      } catch { /* Browser speech remains the safe fallback. */ }
    }
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onstart = () => setState('speaking');
      utterance.onend = () => setState('success');
      window.speechSynthesis.speak(utterance);
    }
  }, [online, stopSpeaking]);

  const finishPlan = useCallback(async (plan) => {
    setState('executing');
    let nativeResult;
    let message;
    if (plan.tool === 'ussd.lookup') {
      const lookup = await fetch('/api/ussd/lookup', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(plan.entities)});
      const result = await lookup.json();
      if (!result.found) { setState('error'); setResponse(result.error || 'I could not find a verified telecom service.'); return; }
      nativeResult = await executeNativeTool({tool: 'ussd.open_dialer', entities: {code: result.ussd}});
      if (nativeResult.success) message = `${result.operator} ${result.service} is verified at ${result.ussd}. ${nativeResult.message}`;
    } else if (plan.tool) {
      nativeResult = await executeNativeTool(plan);
      if (nativeResult.success) message = nativeResult.message || plan.assistant_message;
    }
    if (!nativeResult?.success) {
      setState('error');
      setResponse(nativeResult?.message || 'The Android action could not be completed.');
      return;
    }
    streamText(message, setResponse, timers, () => speak(message));
  }, [speak]);

  const execute = useCallback(async (input) => {
    timers.current.forEach(clearTimeout);
    setTranscript(input);
    setState('processing');
    setResponse(online ? 'Passing your request to the action planner…' : 'You are offline. Cloud planning is unavailable.');
    try {
      const result = await fetch('/api/agent', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({text: input})});
      const payload = await result.json();
      if (!result.ok || !payload.plan) throw new Error(payload.error || 'The action planner is unavailable.');
      const plan = payload.plan;
      setCommand(plan);
      if (plan.missing_parameters?.length) {
        setState('clarifying');
        const message = plan.assistant_message || `I need: ${plan.missing_parameters.join(', ')}.`;
        streamText(message, setResponse, timers, () => speak(message));
      } else if (plan.requires_confirmation) {
        const message = plan.assistant_message || 'Please confirm before I continue.';
        setState('confirming');
        streamText(message, setResponse, timers, () => speak(message));
      } else await finishPlan(plan);
    } catch (error) {
      setState('error');
      setResponse(error.message || 'The action planner is unavailable. Try again when you have a connection.');
    }
  }, [finishPlan, online, speak]);

  const toggleListening = () => {
    if (state === 'listening') { recognition.current?.stop(); return; }
    if (['processing', 'clarifying', 'confirming', 'executing', 'speaking'].includes(state)) return;
    stopSpeaking(); setTranscript(''); setResponse('Listening for your request…'); setState('listening');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setState('error'); setResponse('Speech recognition is unavailable in this browser. Try Android Chrome or use an example command below.'); return; }
    const current = new SpeechRecognition();
    recognition.current = current; current.lang = 'en-KE'; current.interimResults = true; current.continuous = false;
    current.onresult = (event) => { const text = Array.from(event.results).map((item) => item[0].transcript).join(''); setTranscript(text); if (event.results[event.results.length - 1].isFinal) execute(text); };
    current.onerror = () => { setState('error'); setResponse('I could not hear that. Please try again.'); };
    current.onend = () => setState((value) => value === 'listening' ? 'idle' : value);
    current.start();
  };

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    getBridgeStatus().then(setNativeStatus).catch(() => setNativeStatus({connected: false, platform: 'web'}));
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); timers.current.forEach(clearTimeout); stopSpeaking(); };
  }, [stopSpeaking]);

  const confirm = () => { if (command) finishPlan(command); };
  return <main className="app"><div className="grain"/><header><div className="brand"><span className="brand-mark">S</span><span>SAUTIFLOW</span></div><button className="sound" onClick={() => speak(response)} aria-label="Repeat spoken response"><Volume2 size={18}/></button></header>
    <section className="hero" aria-live="polite"><p className="eyebrow">VOICE THAT GETS THINGS DONE</p><h1>Your phone,<br/><em>in your voice.</em></h1><p className="intro">Make a call. Send a message. Manage your network. Just ask.</p>
      <div className={`orb-wrap ${state}`}><div className="ripple r1"/><div className="ripple r2"/><button className="orb" onClick={toggleListening} aria-label={statusCopy[state]}><span className="orb-glow"/>{state === 'processing' || state === 'executing' ? <LoaderCircle className="spin" size={38}/> : state === 'success' || state === 'speaking' ? <Check size={42}/> : state === 'error' ? <X size={42}/> : <Mic size={42}/>}</button></div>
      <div className="status"><span className={`dot ${state}`}/>{statusCopy[state]} <span className="native-status">· {nativeStatus.connected ? 'Android connected' : 'browser mode'}</span> {!online && <span className="offline">· offline</span>}</div>
    </section>
    <section className="stream" aria-label="Live conversation"><div className="stream-line"/>{transcript && <p className="heard"><span>You said</span>{transcript}</p>}<p className="response">{response}<span className={state === 'listening' || state === 'processing' || state === 'executing' ? 'caret' : ''}/></p>
      {state === 'confirming' && <div className="confirm"><p>{command?.assistant_message || 'Continue with this action?'}</p><div><button className="cancel" onClick={() => { setState('idle'); setResponse('No problem. What else can I help with?'); }}>Cancel</button><button className="confirm-btn" onClick={confirm}>Confirm <Check size={17}/></button></div></div>}
    </section>
    <footer><p>Try saying</p><div className="suggestions">{examples.map((example) => <button key={example} onClick={() => execute(example)}>{example}<ChevronRight size={14}/></button>)}</div><p className="privacy"><Sparkles size={13}/> Sensitive actions need confirmation. Native execution is reported only when Android confirms it.</p></footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<App/>);
