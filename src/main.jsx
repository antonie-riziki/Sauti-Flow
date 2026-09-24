import React, {useCallback, useEffect, useRef, useState} from 'react';
import { createRoot } from 'react-dom/client';
import {Mic, Phone, MessageSquare, Check, X, Volume2, Sparkles, LoaderCircle, ChevronRight} from 'lucide-react';
import './styles.css';

const examples = ['Check my Airtel data balance', 'Call Mum', 'Text John I’m on my way'];
const statusCopy = {idle:'Tap to speak', listening:'Listening… tap again when you’re done', processing:'Understanding your request…', executing:'Working on it…', success:'Done', error:'I couldn’t complete that.', confirmation:'Your confirmation is needed'};

function classify(text) {
  const t = text.toLowerCase();
  const operator = t.includes('airtel') ? 'Airtel' : t.includes('safaricom') ? 'Safaricom' : t.includes('telkom') ? 'Telkom Kenya' : null;
  if (/open (my )?(phone|dialer)/.test(t)) return {kind:'phone', label:'Open phone', message:'I’ll open your phone dialer.', safe:true};
  if (/open (my )?messages?/.test(t)) return {kind:'messages', label:'Open messages', message:'Opening your messages.', safe:true};
  if (/open whatsapp/.test(t)) return {kind:'whatsapp', label:'Open WhatsApp', message:'Opening WhatsApp.', safe:true};
  if (/call|dial/.test(t)) { const who = text.match(/(?:call|dial)\s+(.+)/i)?.[1] || 'that number'; return {kind:'call', label:`Call ${who}`, message:`I’ll open the dialer for ${who}.`, safe:true}; }
  if (/whatsapp|message.*whatsapp/.test(t)) return {kind:'whatsappMessage', label:'Prepare WhatsApp message', message:'I’ll prepare that WhatsApp message. You’ll review it before sending.', safe:true};
  if (/sms|text /.test(t)) return {kind:'sms', label:'Prepare SMS', message:'I’ll prepare that text message. You’ll review it before sending.', safe:true};
  if (/buy|send airtime|mobile money/.test(t)) return {kind:'purchase', label: operator ? `Buy ${operator} service` : 'Purchase telecom service', message: operator ? `I found an ${operator} service. Please confirm before I open the secure operator flow.` : 'This action could affect your balance. Please confirm before I continue.', safe:false};
  if (/balance|ussd|data/.test(t)) return {kind:'ussd', label: operator ? `Check ${operator} service` : 'Find telecom service', message: operator ? `I’ll look for the current verified ${operator} service and open the dialer if it is available.` : 'Which network are you using: Airtel, Safaricom, or Telkom Kenya?', safe:!!operator};
  return {kind:'unknown', label:'Need a little more detail', message:'I didn’t understand that. Try “Call John,” “Open WhatsApp,” or “Check my Airtel balance.”', safe:true};
}

function App(){
  const [state,setState]=useState('idle'); const [transcript,setTranscript]=useState(''); const [response,setResponse]=useState('Ready when you are.'); const [command,setCommand]=useState(null); const recognition=useRef(null); const timers=useRef([]);
  const clearTimers=()=>{timers.current.forEach(clearTimeout);timers.current=[]};
  const speak=useCallback((text)=>{ if('speechSynthesis' in window){window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.rate=.95; window.speechSynthesis.speak(u)}},[]);
  const stream=(text,done)=>{ setResponse(''); [...text].forEach((_,i)=>timers.current.push(setTimeout(()=>setResponse(text.slice(0,i+1)),i*13))); timers.current.push(setTimeout(done, text.length*13+280)); };
  const execute=useCallback((input)=>{ clearTimers(); setTranscript(input); setState('processing'); const action=classify(input); setCommand(action); timers.current.push(setTimeout(()=>{ if(!action.safe){setState('confirmation'); stream(action.message,()=>speak(action.message)); return;} setState('executing'); stream(action.message,()=>{setState(action.kind==='unknown'?'error':'success'); speak(action.message)});},650));},[speak]);
  const toggleListening=()=>{ if(state==='listening'){ recognition.current?.stop(); return; } if(['processing','executing','confirmation'].includes(state)) return; clearTimers(); setTranscript(''); setResponse('Listening for your request…'); setState('listening'); const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR){timers.current.push(setTimeout(()=>execute('Check my Airtel data balance'),1100));return;} const r=new SR(); recognition.current=r; r.lang='en-KE'; r.interimResults=true; r.continuous=false; r.onresult=e=>{const text=Array.from(e.results).map(x=>x[0].transcript).join('');setTranscript(text);if(e.results[e.results.length-1].isFinal)execute(text)}; r.onerror=()=>execute('Check my Airtel data balance'); r.onend=()=>setState(s=>s==='listening'?'idle':s); r.start(); };
  const confirm=()=>{setState('executing'); const msg='Confirmed. I’ll open the secure operator flow for you to complete this safely.';stream(msg,()=>{setState('success');speak(msg)})};
  useEffect(()=>()=>clearTimers(),[]);
  return <main className="app"><div className="grain"/><header><div className="brand"><span className="brand-mark">S</span><span>SAUTIFLOW</span></div><button className="sound" onClick={()=>speak(response)} aria-label="Repeat spoken response"><Volume2 size={18}/></button></header>
    <section className="hero" aria-live="polite"><p className="eyebrow">VOICE THAT GETS THINGS DONE</p><h1>Your phone,<br/><em>in your voice.</em></h1><p className="intro">Make a call. Send a message. Manage your network. Just ask.</p>
      <div className={`orb-wrap ${state}`}><div className="ripple r1"/><div className="ripple r2"/><button className="orb" onClick={toggleListening} aria-label={statusCopy[state]}><span className="orb-glow"/>{state==='processing'||state==='executing'?<LoaderCircle className="spin" size={38}/>:state==='success'?<Check size={42}/>:state==='error'?<X size={42}/>:<Mic size={42}/>}</button></div>
      <div className="status"><span className={`dot ${state}`}/>{statusCopy[state]}</div>
    </section>
    <section className="stream" aria-label="Live conversation"><div className="stream-line"/>{transcript&&<p className="heard"><span>You said</span>{transcript}</p>}<p className="response">{response}<span className={state==='listening'||state==='processing'||state==='executing'?'caret':''}/></p>
      {state==='confirmation'&&<div className="confirm"><p>{command?.label}</p><div><button className="cancel" onClick={()=>{setState('idle');setResponse('No problem. What else can I help with?')}}>Cancel</button><button className="confirm-btn" onClick={confirm}>Confirm <Check size={17}/></button></div></div>}
    </section>
    <footer><p>Try saying</p><div className="suggestions">{examples.map(x=><button key={x} onClick={()=>execute(x)}>{x}<ChevronRight size={14}/></button>)}</div><p className="privacy"><Sparkles size={13}/> Sensitive actions always need your confirmation.</p></footer>
  </main>
}
createRoot(document.getElementById('root')).render(<App/>);
