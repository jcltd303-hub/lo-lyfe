'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/browser';
import { createDeviceVault, indexedDbVaultStore, VaultCorruptError } from '../../lib/device-vault';

const vault = createDeviceVault(indexedDbVaultStore);
type Form = { zip: string; birthYear: string; household: string; employment: string };
const blank: Form = { zip: '', birthYear: '', household: '', employment: '' };

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [state, setState] = useState<'loading' | 'ready' | 'corrupt' | 'unavailable'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    let generation = 0;
    let accountId: string | null = null;
    const client = createClient();
    async function load(id: string | null) {
      const current = ++generation;
      setUserId(null);
      setForm(blank);
      setMessage('');
      setState(id ? 'loading' : 'unavailable');
      if (!id) return;
      try {
        const saved = await vault.readProfile(id);
        if (!active || current !== generation) return;
        setUserId(id);
        if (saved) setForm({
          zip: String(saved.zip ?? ''),
          birthYear: String(saved.birth_year ?? ''),
          household: String(saved.household_size ?? ''),
          employment: String(saved.employment ?? ''),
        });
        setState('ready');
      } catch (error) {
        if (active && current === generation) { setUserId(id); setState(error instanceof VaultCorruptError ? 'corrupt' : 'unavailable'); }
      }
    }
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextId = session?.user.id ?? null;
      if (nextId === accountId) return;
      accountId = nextId;
      // Clear decrypted answers before any asynchronous Auth or IndexedDB work.
      generation++;
      setUserId(null);
      setForm(blank);
      setState(session?.user ? 'loading' : 'unavailable');
      setTimeout(() => { if (active) void load(session?.user.id ?? null); }, 0);
    });
    return () => { active = false; generation++; subscription.unsubscribe(); };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;
    setMessage('');
    if (form.zip && !/^\d{5}$/.test(form.zip)) { setMessage('Enter a five-digit ZIP code or leave it blank.'); return; }
    const year = form.birthYear ? Number(form.birthYear) : null;
    if (year !== null && (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear())) {
      setMessage('Enter a valid birth year or leave it blank.'); return;
    }
    const household = form.household ? Number(form.household) : null;
    if (household !== null && (!Number.isInteger(household) || household < 1)) {
      setMessage('Enter a valid household size or leave it blank.'); return;
    }
    try {
      await vault.writeProfile(userId, {
        zip: form.zip || null,
        birth_year: year,
        household_size: household,
        employment: form.employment || null,
      });
      setMessage('Saved on this device.');
    } catch {
      setMessage('Could not save on this device. Your entries are still visible; try again before leaving.');
    }
  }

  async function remove() {
    if (!userId) return;
    try {
      await vault.deleteProfile(userId);
      setForm(blank);
      setState('ready');
      setMessage('Local profile deleted from this device.');
    } catch {
      setMessage('Could not delete local data. Please try again.');
    }
  }

  return <main className="wrap" style={{ paddingBlock: '4rem', maxWidth: 620 }}>
    <Link href="/account">← Account</Link>
    <h1>Your device profile</h1>
    <p>Your answers stay in this browser on this device. They are used here for possible matches and are never synced. Clearing browser data loses this profile.</p>
    {state === 'loading' && <p role="status">Loading local profile…</p>}
    {state === 'unavailable' && <p role="status">Sign in to use a device profile, or enable local browser storage. <Link href="/auth">Sign in</Link></p>}
    {state === 'corrupt' && <div role="alert"><p>This device profile cannot be decrypted. The stored data has not been changed.</p><button type="button" onClick={remove}>Reset this device profile</button></div>}
    {state === 'ready' && <form onSubmit={save}>
      <p>Every field is optional. Leave anything you do not want to save blank.</p>
      <label htmlFor="zip">ZIP code</label><input id="zip" inputMode="numeric" maxLength={5} value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} />
      <label htmlFor="birth-year">Birth year</label><input id="birth-year" inputMode="numeric" value={form.birthYear} onChange={e => setForm({ ...form, birthYear: e.target.value })} />
      <label htmlFor="household">Household size</label><input id="household" inputMode="numeric" value={form.household} onChange={e => setForm({ ...form, household: e.target.value })} />
      <label htmlFor="employment">Employment</label><input id="employment" value={form.employment} onChange={e => setForm({ ...form, employment: e.target.value })} />
      <div><button className="primary-button" type="submit">Save on this device</button> <button type="button" onClick={remove}>Delete local profile</button></div>
    </form>}
    {message && <p role="status">{message}</p>}
  </main>;
}
