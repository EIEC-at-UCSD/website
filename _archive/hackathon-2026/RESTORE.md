# Hackathon 2026 archive

The EIEC × SoPE hackathon page (May 30, 2026) is kept here so it can be revived
for a future hackathon. Nothing in `_archive/` is built or routed (it is outside
`app/` and excluded in `tsconfig.json`); `/hackathon` currently redirects home.

Contents: `page.tsx` (the page, unchanged), `hackathon.css` (styles scoped to
`.hackathon-site`), `public-hackathon/` (EIEC + SoPE logos that lived at
`/public/hackathon/`).

## To bring it back

1. `git mv _archive/hackathon-2026/page.tsx app/hackathon/page.tsx`
2. `git mv _archive/hackathon-2026/hackathon.css app/hackathon.css` and add
   `import "./hackathon.css";` back to `app/layout.tsx`.
3. `git mv _archive/hackathon-2026/public-hackathon public/hackathon`
4. Remove the two `/hackathon` redirects in `next.config.ts`.
5. Update dates, the interest-form link and copy in the page.
6. Put the promo back (optional), using the snippets below. The CSS for
   `.nav-announce` and `.hackathon-promo*` is in `promo.css` here; append it to
   `app/globals.css`. Fonts now load through `next/font/google` in
   `app/layout.tsx`, so add DM Mono there (and Gloock + Inclusive Sans for the
   page itself).

## Snippets removed from the live site

### Nav announcement, in `components/navigation.tsx` after the logo link

```tsx
    <Link href={hackathon ? "/hackathon" : "/"} className="nav-logo" onClick={() => setOpen(false)}>
      <img src="/EIEC%20Logo.png" alt="EIEC logo" className={hackathon ? "eiec-logo" : undefined} width={44} height={44} />
      {hackathon ? <><span className="x">×</span><img src="/hackathon/SOPE.png" alt="SoPE logo" className="mark" /></> : <>EIEC <span>✦</span></>}
    {!hackathon && <Link href="/hackathon" className="nav-announce"><span className="nav-announce-text">2026 · SoPE Hackathon</span><span className="nav-announce-arrow">→</span></Link>}
    <div id={hackathon ? "hackathon-navigation" : "site-navigation"} className={`nav-links${open ? " open" : ""}`}>
        <Link href="/" className="nav-link-home" onClick={() => setOpen(false)}>EIEC Home</Link>
      </> : links.map(([href, label]) => <Link key={href} href={href} className={pathname === href ? "active" : undefined} aria-current={pathname === href ? "page" : undefined} onClick={() => setOpen(false)}>{label}</Link>)}
    {hackathon && <a href="https://docs.google.com/forms/d/1QGaiU10ki5ufS47aFEy7snF__JctijDUYjaYoNR4EHI/viewform" target="_blank" rel="noopener noreferrer" className="nav-cta">Interested? →</a>}
    <button type="button" className="nav-mobile-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls={hackathon ? "hackathon-navigation" : "site-navigation"} onClick={() => setOpen(!open)} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}><span /><span /><span /></button>
  return <footer><span className="footer-text">EIEC · Engineering Innovators &amp; Entrepreneurs · <span>UCSD</span></span><div className="footer-links">{links.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</div></footer>;
```

### Hero promo, in `app/(club)/page.tsx` after the hero description

```tsx
<div className="hackathon-promo-wrap">
<canvas className="hackathon-promo-particles" aria-hidden="true"></canvas>
<Link href="/hackathon" target="_blank" rel="noopener noreferrer" className="hackathon-promo">{"2026 SoPE Hackathon"}</Link>
</div>
```

### Promo particles, in `lib/artwork.js`

Add this function back and include it in the home initializers:
`[...(mode === "home" ? [initGear, initHackathonPromoParticles] : [])]`.

```js
function initHackathonPromoParticles() {
  const canvas = document.querySelector('.hackathon-promo-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const COUNT = 22;
  const COLOR = '16, 186, 224';
  let w = 0, h = 0;
  let particles = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function spawn() {
    particles = [];
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: 0.8 + Math.random() * 1.4,
        baseOp: 0.10 + Math.random() * 0.18,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function draw(now) {
    if (w === 0 || h === 0) {
      if (!resize()) {
        scope.frame(draw);
        return;
      }
      spawn();
    }

    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      if (p.x > w) { p.x = w; p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      if (p.y > h) { p.y = h; p.vy *= -1; }

      const flicker = Math.sin(now / 1400 + p.phase) * 0.5 + 0.5;
      const op = p.baseOp + flicker * 0.14;
      ctx.fillStyle = `rgba(${COLOR}, ${op.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    scope.frame(draw);
  }

  resize();
  spawn();
  scope.listen(window, 'resize', () => { if (resize()) spawn(); });
  scope.frame(draw);
}
```

### `app/migration.css`

```css
.hackathon-site .reveal, .hackathon-site .reveal-stagger,
.hackathon-site .reveal-stagger > * { opacity: 1; transform: none; }
.hackathon-site { min-height: 100vh; }
.hackathon-site [id] { scroll-margin-top: 100px; }
```

The full pre-archive state is commit `396ad42` (the Next.js migration) in this repository.
