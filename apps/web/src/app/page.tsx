'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { evaluateEligibility, explainEligibility, filterOpportunities, rankOpportunities, sampleOpportunities, type Category } from '@lo-lyfe/core';
import { createClient } from '../lib/supabase/browser';
import { loadPublishedCatalog } from '../lib/catalog';
import { createDeviceVault, indexedDbVaultStore } from '../lib/device-vault';
import type { Opportunity } from '@lo-lyfe/core';

const categories: { id: Category | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All finds', icon: '✦' },
  { id: 'settlement', label: 'Settlements', icon: '◇' },
  { id: 'refund', label: 'Refunds', icon: '↩' },
  { id: 'grant', label: 'Grants', icon: '✳' },
  { id: 'freebie', label: 'Free stuff', icon: '□' },
  { id: 'coupon', label: 'Savings', icon: '%' },
];

export default function Home() {
  const [catalog, setCatalog] = useState<Opportunity[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [trust, setTrust] = useState<Record<string,{worked:number;no_payout:number;scam:number}>>({});
  const [catalogState, setCatalogState] = useState<'sample' | 'loading' | 'live' | 'error'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'loading' : 'sample'
  );
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [age, setAge] = useState('');
  const [onlyPossible, setOnlyPossible] = useState(false);
  useEffect(() => { void fetch('/api/trust').then(r => r.ok ? r.json() : Promise.reject()).then((x:{items:{opportunity_id:string;worked:number;no_payout:number;scam:number}[]}) => setTrust(Object.fromEntries(x.items.map(i => [i.opportunity_id,{worked:Number(i.worked),no_payout:Number(i.no_payout),scam:Number(i.scam)}])))).catch(() => {}); }, []);
  useEffect(() => {
    if (catalogState !== 'loading') return;
    let active = true;
    void loadPublishedCatalog(createClient()).then(items => {
      if (active) { setCatalog(items); setCatalogState('live'); }
    }).catch(() => { if (active) setCatalogState('error'); });
    return () => { active = false; };
  }, [catalogState]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return;
    let active = true;
    let generation = 0;
    let accountId: string | null | undefined;
    const client = createClient();
    async function loadAccount(id: string | null) {
      const current = ++generation;
      setSignedIn(Boolean(id));
      setSavedIds([]);
      setAge('');
      setState('');
      setSaveMessage('');
      if (!id) return;
      try {
        const [response, saved] = await Promise.all([
          fetch('/api/saves', { cache: 'no-store' }),
          createDeviceVault(indexedDbVaultStore).readProfile(id),
        ]);
        if (!active || current !== generation) return;
        if (response.ok) {
          const result = await response.json() as { items: { opportunity_id: string }[] };
          if (active && current === generation) setSavedIds(result.items.map(item => item.opportunity_id));
        }
        if (active && current === generation && typeof saved?.birth_year === 'number')
          setAge(String(new Date().getFullYear() - saved.birth_year));
      } catch {
        // Catalog browsing remains available when account data or device storage is unavailable.
      }
    }
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextId = session?.user.id ?? null;
      if (nextId === accountId) return;
      accountId = nextId;
      generation++;
      setSignedIn(false);
      setSavedIds([]);
      setAge('');
      setState('');
      // Defer account queries until Supabase's Auth callback completes.
      setTimeout(() => { if (active) void loadAccount(session?.user.id ?? null); }, 0);
    });
    return () => { active = false; generation++; subscription.unsubscribe(); };
  }, []);
  async function toggleSave(id: string) {
    const removing = savedIds.includes(id);
    const response = await fetch('/api/saves', {
      method: removing ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunityId: id }),
    });
    if (!response.ok) { setSaveMessage('Could not update saved items.'); return; }
    setSavedIds(current => removing ? current.filter(item => item !== id) : [...current, id]);
    setSaveMessage(removing ? 'Removed from saved items.' : 'Saved to your account.');
  }
  async function setReminder(id: string) {
    const response = await fetch('/api/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunityId: id }) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setSaveMessage(response.ok ? 'Deadline reminder saved.' : result.error ?? 'Could not set reminder.');
  }
  async function vote(id: string, verdict: 'worked' | 'no_payout' | 'scam') {
    const response = await fetch('/api/votes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ opportunityId: id, verdict }) });
    setSaveMessage(response.ok ? 'Thanks — your experience was recorded.' : 'Could not record your experience.');
  }
  async function startClaim(id: string) {
    const response = await fetch('/api/claims', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunityId: id }),
    });
    setSaveMessage(response.ok ? 'Claim started. Review the official terms and track it in your account.' : 'Could not start this claim.');
  }
  const items = useMemo(() => {
    const filtered = filterOpportunities(catalogState === 'sample' ? sampleOpportunities : catalog, { query, category, state });
    const profile = { state, age: age ? Number(age) : undefined }; const eligible = onlyPossible ? filtered.filter(item => evaluateEligibility(item, profile) === 'possible') : filtered; return rankOpportunities(eligible, query, profile).map(result => result.item);
  }, [catalog, catalogState, category, query, state, age, onlyPossible]);

  return <div className="site-shell">
    <header className="topbar wrap">
      <Link className="brand" href="/" aria-label="Lo-lyfe home"><span className="brand-mark">lo<span>✳</span></span><span className="brand-word">lo-lyfe<span className="brand-dot">.</span></span></Link>
      <nav aria-label="Main navigation"><a className="nav-active" href="#explore">Explore</a><a href="#how-it-works">How it works</a><Link href="/account">Account</Link><a href="https://github.com/jcltd303-hub/lo-lyfe/issues" target="_blank" rel="noopener noreferrer">Roadmap ↗</a></nav>
      <a className="top-cta" href="#explore">Explore finds <span>↗</span></a>
    </header>

    <main>
      <section className="hero wrap">
        <div className="hero-copy"><div className="eyebrow"><span className="pulse" /> THE GOOD STUFF IS OUT THERE</div>
          <h1>There’s more<br/>out there <span>for you<span className="period">.</span></span></h1>
          <p>Refunds, grants, settlements, and little wins. One place to explore opportunities that might fit your life.</p>
          <a className="primary-button" href="#explore">See what’s out there <span>↗</span></a>
          <div className="hero-note"><span className="note-star">✳</span> Less searching. More finding.</div>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-shape shape-one">✦</div><div className="art-shape shape-two">✳</div><div className="art-ticket"><div className="ticket-top">A LITTLE SOMETHING FOR YOU <span>↗</span></div><div className="ticket-symbol">$</div><div className="ticket-bottom"><span>GOOD THINGS<br/>HAPPEN</span><span className="ticket-smile">☺</span></div></div><div className="art-caption">FIND YOUR NEXT LITTLE WIN ↗</div></div>
      </section>

      <section className="ticker" aria-label="Opportunity types"><div className="ticker-inner">GOOD FINDS <span>✳</span> REAL POSSIBILITIES <span>✳</span> MORE FOR YOUR EVERYDAY <span>✳</span> GOOD FINDS <span>✳</span> REAL POSSIBILITIES <span>✳</span></div></section>

      <section className="explore wrap" id="explore"><div className="section-heading"><div><div className="overline">01 / THE EXPLORE PAGE</div><h2>Find your kind<br/>of <em>good.</em></h2></div><p>{catalogState === 'sample' ? 'A first look at how Lo-lyfe will work. These are example listings while we build and verify the real catalog.' : 'Browse reviewed listings and check the official terms before applying.'}</p></div>
        {catalogState === 'sample' && <div className="demo-alert"><span>✳</span><div><strong>Preview catalog</strong><p>Every listing below is illustrative. No live offers or application links are available yet. Never share personal details for a sample listing.</p></div></div>}
        {catalogState === 'error' && <div role="alert">The reviewed catalog is unavailable. Please try again later.</div>}
        <div className="filter-panel"><div className="search-row"><label className="search-box"><span aria-hidden="true">⌕</span><span className="sr-only">Search opportunities</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search the good stuff..." /></label><label className="state-box">Your state <select value={state} onChange={event => setState(event.target.value)}><option value="">Any state</option><option value="CO">Colorado</option><option value="CA">California</option><option value="NY">New York</option><option value="TX">Texas</option></select></label><label className="age-box">Age <input type="number" min="0" max="120" value={age} onChange={event => setAge(event.target.value)} placeholder="Optional" /></label></div>
          <div className="category-row" role="group" aria-label="Categories">{categories.map(c => <button key={c.id} type="button" className={`category ${category === c.id ? 'selected' : ''}`} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}><span>{c.icon}</span>{c.label}</button>)}</div>
          <label className="possible-toggle"><input type="checkbox" checked={onlyPossible} onChange={event => setOnlyPossible(event.target.checked)} /> Show only possible matches <small>Based on the details you enter here. Never a guarantee.</small></label>
        </div>
        <div className="results-heading"><h3>Fresh possibilities <span>({items.length})</span></h3><span>{catalogState === 'sample' ? 'EXAMPLE LISTINGS · NOT LIVE' : 'REVIEWED CATALOG'}</span></div>
        {saveMessage && <p role="status">{saveMessage}</p>}
        <div className="cards">{items.map((item, index) => { const profile = { state, age: age ? Number(age) : undefined }; const status = evaluateEligibility(item, profile); const why = explainEligibility(item, profile); return <article className="card" key={item.id}><div className="card-top"><span className="card-icon">{categories.find(c => c.id === item.category)?.icon}</span><span className="sample-tag">{catalogState === 'sample' ? `EXAMPLE ${String(index + 1).padStart(2, '0')}` : 'REVIEWED'}</span></div><div className="card-meta">{item.category.toUpperCase()} <span>·</span> {item.location.toUpperCase()}</div><h4>{item.title}</h4><p>{item.summary}</p><div className="card-requirements">{item.requirements.map(r => <span key={r}>{r}</span>)}</div><div className="card-footer"><div><small>POTENTIAL VALUE</small><strong>{item.amount}</strong></div><span className={`match ${status}`}>{status === 'possible' ? 'Potential match' : status === 'ineligible' ? 'Location / age mismatch' : 'More info needed'}</span>{why.length > 0 && <small>{why.join(' · ')}</small>}{trust[item.id] && <small>Community: {trust[item.id].worked} worked · {trust[item.id].no_payout} no payout · {trust[item.id].scam} scam reports</small>}</div>{catalogState === 'live' && <div><details><summary>Review what you'll need</summary><p>Check the official terms before applying. Details entered here stay in this browser.</p><ul>{item.rules.states?.length ? <li>Location: {state ? `selected ${state}` : 'select your state above to check this rule'}</li> : null}{item.rules.minAge !== undefined ? <li>Age: {age ? `checked against minimum ${item.rules.minAge}` : 'enter an age above to check this rule'}</li> : null}{item.requirements.map(requirement => <li key={requirement}>{requirement}</li>)}{!item.rules.states?.length && item.rules.minAge === undefined && item.requirements.length === 0 ? <li>Read the official claim page for its requirements.</li> : null}</ul><p>Any claim form or proof is entered only on the official site. This checklist does not guarantee eligibility.</p></details><a href={item.url} target="_blank" rel="noopener noreferrer">View official claim page ↗</a> {signedIn ? <><button type="button" onClick={() => void toggleSave(item.id)}>{savedIds.includes(item.id) ? 'Remove saved' : 'Save'}</button> <button type="button" onClick={() => void startClaim(item.id)}>Track a claim</button> {item.deadline && <button type="button" onClick={() => void setReminder(item.id)}>Remind me</button>} <span aria-label="Share your experience">Worked? <button type="button" onClick={() => void vote(item.id, 'worked')}>Yes</button> <button type="button" onClick={() => void vote(item.id, 'no_payout')}>No payout</button> <button type="button" onClick={() => void vote(item.id, 'scam')}>Report scam</button></span></> : <Link href="/auth">Sign in to save</Link>}</div>}</article>; })}</div>
        {items.length === 0 && <div className="empty"><span>✳</span><h4>No examples found</h4><p>Try another search or clear a filter.</p><button type="button" onClick={() => {setQuery('');setState('');setCategory('all');setOnlyPossible(false);setAge('');}}>Clear filters</button></div>}
      </section>

      <section className="how" id="how-it-works"><div className="wrap how-inner"><div><div className="overline">02 / THE IDEA</div><h2>A better way<br/>to <em>find more.</em></h2><p>Good opportunities shouldn’t be buried in a hundred tabs. We’re building a simpler way to find them and understand the requirements.</p></div><div className="steps"><div><span>01</span><strong>Explore</strong><p>See opportunities from sources we can verify.</p></div><div><span>02</span><strong>Check your fit</strong><p>Use clear rules to spot potential matches. You decide what to share.</p></div><div><span>03</span><strong>Apply yourself</strong><p>Review the official terms and attest before any submission.</p></div></div></div></section>
    </main><footer className="footer wrap"><div className="brand-word">lo-lyfe<span className="brand-dot">.</span></div><p>Find the good in what’s out there.</p><span>© 2026 LO-LYFE · PREVIEW</span></footer>
  </div>;
}
