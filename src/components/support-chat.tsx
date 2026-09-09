import { useState, type FormEvent } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import './support-chat.css';

type ChatMessage = { role: 'user' | 'model'; text: string };
export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: 'Hi, I am the PawPass Care Guide. I can explain our pet essentials and care services, or help you request care while you are away.' }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const value = text.trim(); if (!value || busy) return; setText(''); setError(''); setBusy(true);
    const next = [...messages, { role: 'user' as const, text: value }]; setMessages(next);
    try { const response = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'The Care Guide is unavailable.'); setMessages(current => [...current, { role: 'model', text: data.reply }]); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'The Care Guide is unavailable.'); }
    finally { setBusy(false); }
  }
  return <div className="support-chat"><button className="support-chat-trigger" aria-label={open ? 'Close PawPass AI chat' : 'Open PawPass AI chat'} onClick={() => { setOpen(!open); setError(''); }}><MessageCircle size={20} /><span>Ask PawPass AI</span></button>{open && <section className="support-chat-panel" aria-label="PawPass AI customer support"><header><div><strong><Bot size={18}/> PawPass Care Guide</strong><small><i /> Available 24/7 · AI assistant</small></div><button aria-label="Close support chat" onClick={() => setOpen(false)}><X size={18} /></button></header><div className="support-chat-messages" aria-live="polite">{messages.map((message, index) => <p className={`support-chat-message ${message.role}`} key={`${message.role}-${index}`}>{message.text}</p>)}{busy && <p className="support-chat-message model">Thinking…</p>}</div><form onSubmit={submit}><label className="sr-only" htmlFor="support-chat-input">Ask PawPass</label><div className="support-chat-compose"><input id="support-chat-input" value={text} onChange={event => setText(event.target.value)} maxLength={4000} placeholder="Ask about care while you are away…" disabled={busy} /><button className="support-chat-submit" aria-label="Send message" disabled={busy || !text.trim()}><Send size={16} /></button></div>{error && <div className="support-chat-error" role="alert">{error}</div>}</form></section>}</div>;
}
