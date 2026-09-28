'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/browser';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const client = createClient();
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` },
      });
      setMessage(error ? 'Could not send a sign-in link. Please try again.' : 'Check your email for a sign-in link.');
    } catch {
      setMessage('Sign-in is not available yet.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="wrap" style={{ paddingBlock: '4rem', maxWidth: 540 }}>
    <Link href="/">← Back to Lo-lyfe</Link>
    <h1>Sign in</h1>
    <p>Use an email link to access your saved opportunities and claims. Your profile answers stay on this device.</p>
    <form onSubmit={submit}>
      <label htmlFor="email">Email address</label>
      <input id="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />
      <button className="primary-button" type="submit" disabled={busy}>Send sign-in link</button>
    </form>
    {message && <p role="status">{message}</p>}
  </main>;
}
