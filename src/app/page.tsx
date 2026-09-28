'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { evaluateEligibility, filterOpportunities } from '../lib/eligibility';
import { sampleOpportunities, type Category } from '../lib/opportunities';

const categories: { id: Category | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All finds', icon: '✦' },
  { id: 'settlement', label: 'Settlements', icon: '◇' },
  { id: 'refund', label: 'Refunds', icon: '↩' },
  { id: 'grant', label: 'Grants', icon: '✳' },
  { id: 'freebie', label: 'Free stuff', icon: '□' },
  { id: 'coupon', label: 'Savings', icon: '%' },
];

export default function Home() {
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [age, setAge] = useState('');
  const [onlyPossible, setOnlyPossible] = useState(false);
  const items = useMemo(() => {
    const filtered = filterOpportunities(sampleOpportunities, { query, category, state });
    return onlyPossible ? filtered.filter(item => evaluateEligibility(item, { state, age: age ? Number(age) : undefined }) === 'possible') : filtered;
  }, [category, query, state, age, onlyPossible]);

  return <div className="site-shell">
    <header className="topbar wrap">
      <Link className="brand" href="/" aria-label="Lo-lyfe home"><span className="brand-mark">lo<span>✳</span></span><span className="brand-word">lo-lyfe<span className="brand-dot">.</span></span></Link>
      <nav aria-label="Main navigation"><a className="nav-active" href="#explore">Explore</a><a href="#how-it-works">How it works</a><a href="https://github.com/jcltd303-hub/lo-lyfe/issues" target="_blank" rel="noopener noreferrer">Roadmap ↗</a></nav>
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

      <section className="explore wrap" id="explore"><div className="section-heading"><div><div className="overline">01 / THE EXPLORE PAGE</div><h2>Find your kind<br/>of <em>good.</em></h2></div><p>A first look at how Lo-lyfe will work. These are example listings while we build and verify the real catalog.</p></div>
        <div className="demo-alert"><span>✳</span><div><strong>Preview catalog</strong><p>Every listing below is illustrative. No live offers or application links are available yet. Never share personal details for a sample listing.</p></div></div>
        <div className="filter-panel"><div className="search-row"><label className="search-box"><span aria-hidden="true">⌕</span><span className="sr-only">Search opportunities</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search the good stuff..." /></label><label className="state-box">Your state <select value={state} onChange={event => setState(event.target.value)}><option value="">Any state</option><option value="CO">Colorado</option><option value="CA">California</option><option value="NY">New York</option><option value="TX">Texas</option></select></label><label className="age-box">Age <input type="number" min="0" max="120" value={age} onChange={event => setAge(event.target.value)} placeholder="Optional" /></label></div>
          <div className="category-row" role="group" aria-label="Categories">{categories.map(c => <button key={c.id} type="button" className={`category ${category === c.id ? 'selected' : ''}`} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}><span>{c.icon}</span>{c.label}</button>)}</div>
          <label className="possible-toggle"><input type="checkbox" checked={onlyPossible} onChange={event => setOnlyPossible(event.target.checked)} /> Show only possible matches <small>Based on the details you enter here. Never a guarantee.</small></label>
        </div>
        <div className="results-heading"><h3>Fresh possibilities <span>({items.length})</span></h3><span>EXAMPLE LISTINGS · NOT LIVE</span></div>
        <div className="cards">{items.map((item, index) => { const status = evaluateEligibility(item, { state, age: age ? Number(age) : undefined }); return <article className="card" key={item.id}><div className="card-top"><span className="card-icon">{categories.find(c => c.id === item.category)?.icon}</span><span className="sample-tag">EXAMPLE {String(index + 1).padStart(2, '0')}</span></div><div className="card-meta">{item.category.toUpperCase()} <span>·</span> {item.location.toUpperCase()}</div><h4>{item.title}</h4><p>{item.summary}</p><div className="card-requirements">{item.requirements.map(r => <span key={r}>{r}</span>)}</div><div className="card-footer"><div><small>POTENTIAL VALUE</small><strong>{item.amount}</strong></div><span className={`match ${status}`}>{status === 'possible' ? 'Potential match' : status === 'ineligible' ? 'Location / age mismatch' : 'More info needed'}</span></div></article>; })}</div>
        {items.length === 0 && <div className="empty"><span>✳</span><h4>No examples found</h4><p>Try another search or clear a filter.</p><button type="button" onClick={() => {setQuery('');setState('');setCategory('all');setOnlyPossible(false);setAge('');}}>Clear filters</button></div>}
      </section>

      <section className="how" id="how-it-works"><div className="wrap how-inner"><div><div className="overline">02 / THE IDEA</div><h2>A better way<br/>to <em>find more.</em></h2><p>Good opportunities shouldn’t be buried in a hundred tabs. We’re building a simpler way to find them and understand the requirements.</p></div><div className="steps"><div><span>01</span><strong>Explore</strong><p>See opportunities from sources we can verify.</p></div><div><span>02</span><strong>Check your fit</strong><p>Use clear rules to spot potential matches. You decide what to share.</p></div><div><span>03</span><strong>Apply yourself</strong><p>Review the official terms and attest before any submission.</p></div></div></div></section>
    </main><footer className="footer wrap"><div className="brand-word">lo-lyfe<span className="brand-dot">.</span></div><p>Find the good in what’s out there.</p><span>© 2026 LO-LYFE · PREVIEW</span></footer>
  </div>;
}
