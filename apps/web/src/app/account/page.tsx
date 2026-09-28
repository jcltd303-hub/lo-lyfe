'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/browser';

export default function AccountPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('Checking account…');

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => createClient().auth.getUser()).then(({ data: { user }, error }) => {
        if (!active) return;
        setUserId(error ? null : user?.id ?? null);
        setMessage(error || !user ? 'Sign in to access your account.' : '');
      }).catch(() => { if (active) setMessage('Account is unavailable.'); });
    return () => { active = false; };
  }, []);

  async function signOut() {
    try {
      await createClient().auth.signOut();
      setUserId(null);
      setMessage('Signed out. Your encrypted profile remains on this device until you delete it.');
    } catch {
      setMessage('Could not sign out. Please try again.');
    }
  }

  return <main className="wrap" style={{ paddingBlock: '4rem', maxWidth: 620 }}>
    <Link href="/">← Browse</Link>
    <h1>Your account</h1>
    {message && <p role="status">{message}</p>}
    {userId ? <div>
      <p>Signed in. Your profile answers stay on this device and are not synced to your account.</p>
      <p><Link href="/profile">Edit device profile →</Link></p>
      <button type="button" onClick={signOut}>Sign out</button>
    </div> : <Link href="/auth">Sign in →</Link>}
  </main>;
}
