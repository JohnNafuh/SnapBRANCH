(() => {
  /* ====== CONFIG: paste your Supabase values (see setup.sql) ====== */
  const SUPABASE_URL = 'https://mhmwkprcmvslyxoheqpf.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_7-oK2Mc8cC7CumpehamugA_Ucb6zXV_';
  /* ================================================================ */

  const $ = s => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ready = !SUPABASE_URL.includes('YOUR-PROJECT');
  const H = SUPABASE_KEY.startsWith('sb_') ? { apikey: SUPABASE_KEY } : { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };
  const pick = a => a[Math.floor(Math.random() * a.length)];

  /* ---------- 3D cubes ---------- */
  function cube(size, color, cls, pos) {
    const c = document.createElement('div');
    c.className = 'cube ' + (cls || '');
    c.style.setProperty('--s', size + 'px');
    c.style.setProperty('--c', color);
    if (pos) ['x', 'y', 'z'].forEach((k, i) => c.style.setProperty('--' + k, pos[i] + 'px'));
    ['f', 'b', 'r', 'l', 't', 'd'].forEach(k => { const i = document.createElement('i'); i.className = 'face ' + k; c.appendChild(i); });
    return c;
  }
  $('#spin').append(cube(120, '#ff2e93', 'hero-cube'), cube(38, '#22d3ee', '', [-120, -50, 40]),
    cube(30, '#ffaa00', '', [115, -20, -50]), cube(26, '#7c3aed', '', [60, 70, 100]), cube(22, '#22d3ee', '', [-70, 80, -90]));
  if (!reduce) {
    const tilt = $('#tilt');
    addEventListener('pointermove', e => {
      tilt.style.setProperty('--ry', (e.clientX / innerWidth - .5) * 40 + 'deg');
      tilt.style.setProperty('--rx', (e.clientY / innerHeight - .5) * -25 + 'deg');
    }, { passive: true });
  }


  /* ---------- Depth: floating cube field, scroll + gyro ---------- */
  const field = $('#field'), tiltEl = $('#tilt');
  if (!reduce) {
    const cols = ['#ff2e93', '#7c3aed', '#22d3ee', '#ffaa00'];
    for (let i = 0; i < 12; i++) {
      const w = document.createElement('div'), sz = 14 + Math.random() * 30;
      w.className = 'fc';
      w.style.cssText = `left:${Math.random() * 95}%;top:${Math.random() * 90}%;--d:${14 + Math.random() * 16}s;--dl:${-Math.random() * 20}s;translate:0 0 ${Math.round(Math.random() * 300 - 200)}px`;
      w.append(cube(sz, cols[i % 4]));
      field.append(w);
    }
    addEventListener('scroll', () => {
      const y = scrollY;
      tiltEl.style.setProperty('--sc', Math.min(y * .06, 40) + 'deg');
      field.style.transform = `translateY(${-y * .18}px)`;
    }, { passive: true });
    const gyro = e => {
      if (e.gamma == null) return;
      tiltEl.style.setProperty('--ry', Math.max(-45, Math.min(45, e.gamma)) + 'deg');
      tiltEl.style.setProperty('--rx', Math.max(-30, Math.min(30, (e.beta - 45) * -.6)) + 'deg');
    };
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
      addEventListener('click', () => DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', gyro); }).catch(() => {}), { once: true });
    } else addEventListener('deviceorientation', gyro);
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.remove('pre'); io.unobserve(en.target); } }), { threshold: .12 }) : null;
  const view = $('#view'), viewImg = $('#view-img');
  view.addEventListener('click', () => view.close());

  /* ---------- Avatar ---------- */
  const map = ['HHHHHHHH', 'HHHHHHHH', 'HSSSSSSH', 'SWBSSBWS', 'SSSNNSSS', 'SSSNNSSS', 'SSMMMMSS', 'SSSSSSSS'];
  const pal = { H: '#4b2e1a', S: '#c58c5f', W: '#fff', B: '#3b5bdb', N: '#a0643d', M: '#7a3f2b' };
  $('#avatar').innerHTML = map.map((r, y) => [...r].map((k, x) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[k]}"/>`).join('')).join('');

  /* ---------- Humor engine (new line on every click, no repeats) ---------- */
  const TITLES = ['=== NOTICE ===', '=== WARNING ===', '=== PSA ===', '=== BREAKING ===', '=== HEADS UP ==='];
  const JOKES = [
    "Congratulations. You are visitor number 1,000,000. Your prize is this sentence.",
    "Warning: this snap may contain traces of authenticity.",
    "The bouncer is one pixel tall. He is extremely serious about it.",
    "No filters were harmed in the making of this website.",
    "You caught the button. Legends say only 3 people ever have. You are the other 3.",
    "Your snap will be reviewed by one very tired creeper.",
    "Today's lucky number is 7. Today's unlucky number is also 7.",
    "Entry fee: one unedited photo and a little dignity.",
    "Creeper? Aww man. Anyway, welcome.",
    "A blurry photo of your lunch is still a photo of lunch. We accept it.",
    "You have no idea how lucky you are to see this screen. Most people just scroll past.",
    "Access granted. Please do not tell the other pixels.",
    "Fun fact: the button used to be slower. It has been doing cardio.",
    "Rule one: be original. Rule two: see rule one.",
    "Loading luck... done. You got a little. Spend it wisely.",
    "The last visitor tried to upload a selfie with 14 filters. We sent them home.",
    "Your potato-quality camera is welcome here. Potatoes are valid.",
    "Please keep your hands, feet and sunglasses inside the website at all times."
  ];
  const HINTS = ['It moved. Catch it.', 'Too slow.', 'Nope. Over here.', 'Almost. Try again.', 'Are you even trying?', 'It is faster than it looks.'];
  const bag = []; // shuffle-bag so lines never repeat until all are used
  const nextJoke = () => { if (!bag.length) bag.push(...JOKES.sort(() => Math.random() - .5)); return bag.pop(); };

  /* ---------- Phase 1: evasive CTA ---------- */
  const cta = $('#cta'), stage = $('#stage'), hint = $('#hint');
  const gate = $('#gate'), copy = $('#gate-copy');
  let dodged = false;
  function dodge() {
    const mx = (stage.clientWidth - cta.offsetWidth) / 2, my = (stage.clientHeight - cta.offsetHeight) / 2;
    const cur = parseFloat(cta.style.getPropertyValue('--tx')) || 1;
    cta.style.setProperty('--tx', Math.round(-Math.sign(cur) * mx * (.55 + Math.random() * .45)) + 'px');
    cta.style.setProperty('--ty', Math.round((Math.random() * 2 - 1) * my) + 'px');
    dodged = true;
    hint.textContent = pick(HINTS);
  }
  cta.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !dodged) dodge(); });
  cta.addEventListener('click', () => { dodged ? openGate() : dodge(); });

  /* ---------- Phase 2: gatekeeper ---------- */
  let timer;
  function say() {
    const text = nextJoke();
    $('#gate-t').textContent = pick(TITLES);
    clearInterval(timer);
    if (reduce) { copy.textContent = text; return; }
    copy.textContent = '';
    let i = 0;
    timer = setInterval(() => { copy.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(timer); }, 26);
  }
  function openGate() { gate.showModal(); say(); }
  $('#reroll').addEventListener('click', say);
  gate.addEventListener('close', () => clearInterval(timer));
  $('#proceed').addEventListener('click', () => { gate.close(); $('#composer').showModal(); });

  /* ---------- Phase 3: capture ---------- */
  const composer = $('#composer'), form = $('#form'), handle = $('#handle'), place = $('#place');
  const photo = $('#photo'), preview = $('#preview'), dropText = $('#drop-text'), share = $('#share'), err = $('#err');
  let blob = null;
  const sync = () => { share.disabled = !(handle.value.trim().length >= 2 && blob); };
  handle.addEventListener('input', sync);

  photo.addEventListener('change', () => {
    const file = photo.files[0]; if (!file) return;
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 800 / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(b => { blob = b; preview.src = URL.createObjectURL(b); preview.hidden = false; dropText.hidden = true; err.textContent = ''; sync(); }, 'image/jpeg', .72);
    };
    im.onerror = () => { err.textContent = 'That file is not an image. Choose a photo.'; };
    im.src = url;
  });

  function reset() { form.reset(); blob = null; preview.hidden = true; dropText.hidden = false; err.textContent = ''; share.textContent = 'Share Snap'; sync(); }
  $('#cancel').addEventListener('click', () => { composer.close(); reset(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!ready) { err.textContent = 'Feed is not connected yet. Add your Supabase keys in script.js.'; return; }
    const last = +localStorage.getItem('snapbranch.last') || 0;
    if (Date.now() - last < 60000) { err.textContent = 'Easy. One snap per minute.'; return; }
    share.disabled = true; share.textContent = 'Posting...';
    try {
      const path = crypto.randomUUID() + '.jpg';
      let r = await fetch(`${SUPABASE_URL}/storage/v1/object/snaps/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg' }, body: blob });
      if (!r.ok) throw new Error('upload');
      r = await fetch(`${SUPABASE_URL}/rest/v1/snaps`, {
        method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ handle: handle.value.trim().replace(/^@+/, '').slice(0, 20), location: place.value.trim().slice(0, 60) || null, image_path: path })
      });
      if (!r.ok) throw new Error('insert');
      localStorage.setItem('snapbranch.last', Date.now());
      composer.close(); reset(); hint.textContent = 'Posted. You are in the feed.';
      await refresh();
      $('#feed').firstElementChild?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    } catch {
      err.textContent = 'Could not post. Check your connection and try again.';
      share.textContent = 'Share Snap'; sync();
    }
  });

  /* ---------- Shared feed ---------- */
  const PAGE = 12, seen = new Set(), feed = $('#feed'), more = $('#more');
  let offset = 0;
  const rtf = new Intl.RelativeTimeFormat([], { numeric: 'auto' });
  function ago(t) {
    const s = (new Date(t) - Date.now()) / 1000, a = Math.abs(s);
    if (a < 60) return 'just now';
    if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
    if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
    return rtf.format(Math.round(s / 86400), 'day');
  }
  function card(p) {
    const a = document.createElement('article'); a.className = 'card' + (io ? ' pre' : ''); if (io) io.observe(a);
    a.style.setProperty('--r', ((p.id.charCodeAt(0) % 5) - 2) * .6 + 'deg');
    const img = new Image(); img.src = `${SUPABASE_URL}/storage/v1/object/public/snaps/${p.image_path}`;
    img.alt = 'Snap by ' + p.handle; img.loading = 'lazy'; img.addEventListener('click', () => { viewImg.src = img.src; viewImg.alt = img.alt; view.showModal(); });
    const m = document.createElement('div'); m.className = 'meta';
    const b = document.createElement('span'); b.className = 'badge'; b.textContent = '@' + p.handle;
    const t = document.createElement('time'); t.dateTime = p.created_at; t.textContent = ago(p.created_at);
    m.append(b, t); a.append(img, m);
    if (p.location) { const l = document.createElement('p'); l.className = 'loc'; l.textContent = '📍 ' + p.location; a.append(l); }
    if (!reduce) {
      a.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return;
        const r = a.getBoundingClientRect();
        a.style.setProperty('--ry', ((e.clientX - r.left) / r.width - .5) * 10 + 'deg');
        a.style.setProperty('--rx', ((e.clientY - r.top) / r.height - .5) * -10 + 'deg');
      });
      a.addEventListener('pointerleave', () => { a.style.setProperty('--ry', '0deg'); a.style.setProperty('--rx', '0deg'); });
    }
    return a;
  }
  async function fetchPage(from) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/snaps?select=id,handle,location,image_path,created_at&order=created_at.desc&limit=${PAGE}&offset=${from}`, { headers: H });
    if (!r.ok) throw new Error('feed');
    return r.json();
  }
  function empty(msg) { feed.innerHTML = ''; const p = document.createElement('p'); p.className = 'empty'; p.textContent = msg; feed.append(p); }
  async function refresh() { // prepend anything new
    if (!ready) return;
    try {
      const rows = (await fetchPage(0)).filter(p => !seen.has(p.id));
      if (feed.querySelector('.empty')) feed.innerHTML = '';
      rows.reverse().forEach(p => { seen.add(p.id); feed.prepend(card(p)); });
      offset += rows.length;
    } catch { /* keep current feed on a failed poll */ }
  }
  async function loadMore() {
    more.disabled = true;
    try {
      const rows = (await fetchPage(offset)).filter(p => !seen.has(p.id));
      if (feed.querySelector('.empty')) feed.innerHTML = '';
      rows.forEach(p => { seen.add(p.id); feed.append(card(p)); });
      offset += rows.length;
      more.hidden = rows.length < PAGE;
      if (!seen.size) empty('No snaps yet. Drop the first one.');
    } catch { empty('Could not load the feed. Pull to refresh.'); }
    more.disabled = false;
  }
  more.addEventListener('click', loadMore);
  if (ready) { loadMore(); setInterval(() => { if (!document.hidden) refresh(); }, 20000); }
  else empty('Feed not connected yet. Add your Supabase keys at the top of script.js.');
})();
