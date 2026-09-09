import { useState, type FormEvent } from 'react';
import { Check, MessageCircle, Send, X } from 'lucide-react';
import './support-chat.css';

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email: form.get('email'), message: form.get('message') }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'We could not send your request.');
      setSent(true); event.currentTarget.reset();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'We could not send your request.'); }
    finally { setBusy(false); }
  }
  return <div className="support-chat"><button className="support-chat-trigger" aria-label={open ? 'Close PawPass support chat' : 'Open PawPass support chat'} onClick={() => { setOpen(!open); setSent(false); setError(''); }}><MessageCircle size={20} /><span>Need a hand?</span></button>{open && <section className="support-chat-panel" aria-label="PawPass customer support"><header><div><strong>PawPass support</strong><small><i /> Available 24/7 · We reply by email</small></div><button aria-label="Close support chat" onClick={() => setOpen(false)}><X size={18} /></button></header>{sent ? <div className="support-chat-success"><Check size={30} /><h3>We have your message.</h3><p>Thanks for reaching out. A PawPass team member will review your request and reply to your email.</p><button onClick={() => setSent(false)}>Send another message</button></div> : <form onSubmit={submit}><p>Ask about pet care, an order, or what your companion might need.</p><label>Your name<input name="name" required maxLength={100} placeholder="Your name" /></label><label>Email address<input name="email" type="email" required maxLength={254} placeholder="you@example.com" /></label><label>How can we help?<textarea name="message" required minLength={2} maxLength={2000} placeholder="I need pet care while I am away…" /></label>{error && <div className="support-chat-error" role="alert">{error}</div>}<button className="support-chat-submit" disabled={busy}>{busy ? 'Sending…' : 'Send to PawPass'} <Send size={15} /></button></form>}</section>}</div>;
}
