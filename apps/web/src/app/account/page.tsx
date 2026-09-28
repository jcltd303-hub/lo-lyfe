'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/browser';
import { createDeviceVault, indexedDbVaultStore } from '../../lib/device-vault';

type Claim = { id: string; status: string; opportunities: { title: string; claim_url: string } | { title: string; claim_url: string }[] | null };
export default function AccountPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('Checking account…');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [attested, setAttested] = useState<string[]>([]);
  const [deleteText, setDeleteText] = useState('');
  const [payoutAmounts, setPayoutAmounts] = useState<Record<string,string>>({});

  useEffect(() => {
    let active = true;
    let generation = 0;
    const client = createClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const current = ++generation;
      // Remove the previous account's claims before any asynchronous work.
      setUserId(null);
      setClaims([]);
      setAttested([]);
      setDeleteText('');
      setMessage(session?.user ? 'Checking account…' : 'Sign in to access your account.');
      if (!session?.user) return;
      const id = session.user.id;
      setTimeout(() => {
        if (!active || current !== generation) return;
        void client.auth.getUser().then(async ({ data: { user }, error }) => {
          if (!active || current !== generation) return;
          if (error || user?.id !== id) { setMessage('Sign in to access your account.'); return; }
          const response = await fetch('/api/claims', { cache: 'no-store' });
          if (!response.ok) throw new Error('Claim history unavailable');
          const result = await response.json() as { items?: Claim[] };
          if (active && current === generation) {
            setClaims(result.items ?? []);
            setUserId(id);
            setMessage('');
          }
        }).catch(() => {
          if (active && current === generation) setMessage('Could not load claim history.');
        });
      }, 0);
    });
    return () => { active = false; generation++; subscription.unsubscribe(); };
  }, []);

  async function signOut() {
    try {
      const { error } = await createClient().auth.signOut();
      if (error) throw error;
      setUserId(null);
      setClaims([]);
      setMessage('Signed out. Your encrypted profile remains on this device until you delete it.');
    } catch {
      setMessage('Could not sign out. Please try again.');
    }
  }

  async function markSubmitted(claimId: string) {
    if (!attested.includes(claimId)) return;
    const response = await fetch('/api/claims', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimId, attested: true }),
    });
    if (!response.ok) { setMessage('Could not update this claim.'); return; }
    setClaims(current => current.map(item => item.id === claimId ? { ...item, status: 'submitted' } : item));
    setAttested(current => current.filter(id => id !== claimId));
    setMessage('Claim marked submitted.');
  }

  async function updateStatus(claimId: string, status: 'pending' | 'paid' | 'rejected') {
    const response = await fetch('/api/claims', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claimId, status }) });
    if (!response.ok) { setMessage('Could not update claim status.'); return; }
    setClaims(current => current.map(item => item.id === claimId ? { ...item, status } : item));
    setMessage(`Claim marked ${status}.`);
  }

  async function logPayout(claimId: string) {
    const dollars = Number(payoutAmounts[claimId]);
    if (!Number.isFinite(dollars) || dollars < 0) { setMessage('Enter a valid payout amount.'); return; }
    const amountCents = Math.round(dollars * 100);
    const response = await fetch('/api/payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claimId, amountCents }) });
    setMessage(response.ok ? 'Payout logged.' : 'Could not log payout.');
  }

  async function deleteAccount() {
    if (!userId || deleteText !== 'DELETE MY ACCOUNT') return;
    const id = userId;
    const response = await fetch('/api/account/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: deleteText }),
    });
    if (!response.ok) { setMessage('Account deletion is unavailable. Your account and local profile remain.'); return; }
    setUserId(null);
    setClaims([]);
    try {
      await createDeviceVault(indexedDbVaultStore).deleteProfile(id);
      setMessage('Account and this device profile deleted.');
    } catch {
      setMessage('Account deleted, but local storage could not be cleared. Clear this site’s browser data.');
    }
  }

  return <main className="wrap" style={{ paddingBlock: '4rem', maxWidth: 620 }}>
    <Link href="/">← Browse</Link>
    <h1>Your account</h1>
    {message && <p role="status">{message}</p>}
    {userId ? <div>
      <p>Signed in. Your profile answers stay on this device and are not synced to your account.</p>
      <p><Link href="/profile">Edit device profile →</Link></p>
      <h2>Your claims</h2>
      {claims.length === 0 && <p>No claims started yet.</p>}
      {claims.map(claim => {
        const opportunity = Array.isArray(claim.opportunities) ? claim.opportunities[0] : claim.opportunities;
        return <article key={claim.id}>
          <h3>{opportunity?.title ?? 'Opportunity'}</h3>
          <p>Status: {claim.status}</p>
          {opportunity?.claim_url && <a href={opportunity.claim_url} target="_blank" rel="noopener noreferrer">Review and apply at the official site ↗</a>}
          {claim.status === 'submitted' && <button type="button" onClick={() => void updateStatus(claim.id, 'pending')}>Mark pending</button>}
          {claim.status === 'pending' && <div><button type="button" onClick={() => void updateStatus(claim.id, 'paid')}>Mark paid</button><button type="button" onClick={() => void updateStatus(claim.id, 'rejected')}>Mark rejected</button></div>}
          {claim.status === 'paid' && <div><label>Payout received ($) <input inputMode="decimal" value={payoutAmounts[claim.id] ?? ''} onChange={event => setPayoutAmounts(current => ({ ...current, [claim.id]: event.target.value }))} /></label><button type="button" onClick={() => void logPayout(claim.id)}>Log payout</button></div>}
          {claim.status === 'started' && <div>
            <label><input type="checkbox" checked={attested.includes(claim.id)}
              onChange={event => setAttested(current => event.target.checked ? [...current, claim.id] : current.filter(id => id !== claim.id))} />
              I submitted this claim myself and attest my information is accurate.</label>
            <button type="button" disabled={!attested.includes(claim.id)} onClick={() => void markSubmitted(claim.id)}>Mark submitted</button>
          </div>}
        </article>;
      })}
      <button type="button" onClick={signOut}>Sign out</button>
      <p><a href="/api/account/export" download>Download account data</a> (device profile is stored separately)</p>
      <section aria-labelledby="delete-heading">
        <h2 id="delete-heading">Delete account</h2>
        <p>This removes saved items and claim history from the account, and deletes the profile on this device.</p>
        <label htmlFor="delete-confirm">Type DELETE MY ACCOUNT to confirm</label>
        <input id="delete-confirm" value={deleteText} onChange={event => setDeleteText(event.target.value)} />
        <button type="button" disabled={deleteText !== 'DELETE MY ACCOUNT'} onClick={() => void deleteAccount()}>Delete my account</button>
      </section>
    </div> : <Link href="/auth">Sign in →</Link>}
  </main>;
}
