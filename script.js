(() => {
  const SUPABASE_URL = 'https://mhmwkprcmvslyxoheqpf.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_7-oK2Mc8cC7CumpehamugA_Ucb6zXV_';

  const $ = s => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const H = SUPABASE_KEY.startsWith('sb_') ? { apikey: SUPABASE_KEY } : { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };
  const photoUrl = p => `${SUPABASE_URL}/storage/v1/object/public/snaps/${p}`;
  const rtf = new Intl.RelativeTimeFormat([], { numeric: 'auto' });
  const ago = t => {
    const s = (new Date(t) - Date.now()) / 1000, a = Math.abs(s);
    if (a < 60) return 'just now';
    if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
    if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
    return rtf.format(Math.round(s / 86400), 'day');
  };
  const HANDLE_RE = /^[A-Za-z][A-Za-z0-9._-]{2,14}$/;
  const addUrl = n => HANDLE_RE.test(n) ? 'https://www.snapchat.com/add/' + encodeURIComponent(n) : null;

  /* ---------- Composer ---------- */
  const composer = $('#composer'), form = $('#form'), handle = $('#handle'), place = $('#place');
  const preview = $('#preview'), share = $('#share'), err = $('#err');
  let blob = null;
  const clean = () => handle.value.trim().replace(/^@+/, '');
  const sync = () => { share.disabled = !(HANDLE_RE.test(clean()) && blob); };
  handle.addEventListener('input', () => {
    err.textContent = clean() && !HANDLE_RE.test(clean()) ? 'Snapchat usernames are 3 to 15 characters: letters, numbers, . _ - and they start with a letter.' : '';
    sync();
  });
  /* Live camera only: no file picker anywhere */
  const cam = $('#cam'), msg = $('#cam-msg'), snapBtn = $('#snap'), flip = $('#flip'), retake = $('#retake');
  let stream = null, facing = 'environment', mirrored = false;
  function stopCam() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; cam.srcObject = null; }
  function reset() { form.reset(); blob = null; preview.hidden = true; err.textContent = ''; share.textContent = 'Share snap'; sync(); }
  async function startCam() {
    stopCam(); blob = null; preview.hidden = true; cam.hidden = false; sync();
    retake.style.visibility = 'hidden'; snapBtn.disabled = true; msg.hidden = false; msg.textContent = 'Starting camera...';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.textContent = 'This browser cannot open the camera. Try Chrome or Safari.'; return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      cam.srcObject = stream; await cam.play().catch(() => {});
      mirrored = (stream.getVideoTracks()[0].getSettings().facingMode || 'user') !== 'environment';
      cam.classList.toggle('mirror', mirrored);
      msg.hidden = true; snapBtn.disabled = false;
    } catch (ex) {
      msg.hidden = false; msg.textContent = 'Allow camera access to take a snap, then tap the retry button.';
      retake.style.visibility = 'visible';
    }
  }
  $('#open').addEventListener('click', () => { composer.showModal(); startCam(); });
  $('#cancel').addEventListener('click', () => composer.close());
  composer.addEventListener('close', () => { stopCam(); reset(); });
  flip.addEventListener('click', () => { facing = facing === 'user' ? 'environment' : 'user'; startCam(); });
  retake.addEventListener('click', startCam);
  snapBtn.addEventListener('click', () => {
    if (!stream || !cam.videoWidth) return;
    const k = Math.min(1, 800 / Math.max(cam.videoWidth, cam.videoHeight)), c = document.createElement('canvas');
    c.width = Math.round(cam.videoWidth * k); c.height = Math.round(cam.videoHeight * k);
    const x = c.getContext('2d');
    if (mirrored) { x.translate(c.width, 0); x.scale(-1, 1); }
    x.drawImage(cam, 0, 0, c.width, c.height);
    c.toBlob(b => {
      blob = b; preview.src = URL.createObjectURL(b); preview.hidden = false; cam.hidden = true;
      retake.style.visibility = 'visible'; snapBtn.disabled = true; err.textContent = ''; sync();
    }, 'image/jpeg', .78);
    const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    share.disabled = true; share.textContent = 'Posting...';
    try {
      const path = crypto.randomUUID() + '.jpg';
      let r = await fetch(`${SUPABASE_URL}/storage/v1/object/snaps/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg' }, body: blob });
      if (!r.ok) throw new Error('photo upload ' + r.status + ': ' + (await r.text()).slice(0, 160));
      r = await fetch(`${SUPABASE_URL}/rest/v1/snaps`, {
        method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ handle: clean(), location: place.value.trim().slice(0, 60) || null, image_path: path })
      });
      if (!r.ok) throw new Error('save ' + r.status + ': ' + (await r.text()).slice(0, 160));
      composer.close();
      await refresh();
      window.scrollTo({ top: $('main').offsetTop - 10, behavior: reduce ? 'auto' : 'smooth' });
    } catch (ex) {
      console.error(ex);
      err.textContent = 'Could not post. ' + (ex.message || 'Check your connection and try again.');
      share.textContent = 'Share snap'; sync();
    }
  });

  /* ---------- Viewer ---------- */
  const view = $('#view');
  view.addEventListener('click', e => { if (!e.target.closest('a')) view.close(); });
  function openView(p) {
    $('#view-img').src = photoUrl(p.image_path);
    $('#view-img').alt = 'Snap by ' + p.handle;
    $('#view-cap').textContent = '@' + p.handle + (p.location ? ' · ' + p.location : '') + ' · ' + ago(p.created_at);
    const add = $('#view-add'), u = addUrl(p.handle);
    add.hidden = !u; if (u) add.href = u;
    view.showModal();
  }

  /* ---------- Hero: 3D coverflow ---------- */
  const deck = $('#deck');
  let active = 0, timer, downX = null;
  function layout() {
    const cs = [...deck.children], n = cs.length;
    cs.forEach((c, i) => {
      let d = i - active; if (d > n / 2) d -= n; if (d < -n / 2) d += n;
      const a = Math.abs(d), show = a <= 2;
      c.style.transform = `translateX(${d * 66}%) translateZ(${-a * 150}px) rotateY(${-d * 28}deg) scale(${1 - a * .06})`;
      c.style.opacity = show ? 1 - a * .22 : 0;
      c.style.zIndex = 10 - a;
      c.style.filter = a ? `brightness(${1 - a * .25})` : 'none';
      c.style.pointerEvents = show ? '' : 'none';
      c._d = d;
    });
  }
  function autoplay() {
    clearInterval(timer);
    if (reduce) return;
    timer = setInterval(() => { if (!document.hidden && deck.children.length) { active = (active + 1) % deck.children.length; layout(); } }, 3400);
  }
  deck.addEventListener('pointerdown', e => { downX = e.clientX; clearInterval(timer); });
  deck.addEventListener('pointerup', e => {
    if (downX == null) return;
    const dx = e.clientX - downX, n = deck.children.length; downX = null;
    if (Math.abs(dx) > 40) active = (active + (dx < 0 ? 1 : -1) + n) % n;
    else {
      const c = e.target.closest('.pc');
      if (c) { if (c._d === 0 && c._p) openView(c._p); else active = [...deck.children].indexOf(c); }
    }
    layout(); autoplay();
  });
  const GRADS = ['linear-gradient(150deg,#3a4bff,#ff3d9a)', 'linear-gradient(150deg,#ff8a3d,#ff3d9a)', 'linear-gradient(150deg,#17c3b2,#3a4bff)', 'linear-gradient(150deg,#ffd23d,#ff8a3d)', 'linear-gradient(150deg,#8a3dff,#3a4bff)'];
  function reel() {
    deck.textContent = '';
    const n = Math.max(5, Math.min(7, all.length));
    for (let i = 0; i < n; i++) {
      const p = all[i], c = document.createElement('div'), ph = document.createElement('div');
      c.className = 'pc'; c._p = p || null; ph.className = 'ph';
      if (p) {
        const im = new Image(); im.src = photoUrl(p.image_path); im.alt = ''; im.draggable = false; ph.append(im);
        const g = document.createElement('div'); g.className = 'glass';
        g.textContent = '@' + p.handle + (p.location ? '  📍 ' + p.location : '');
        c.append(ph, g);
      } else {
        ph.style.background = GRADS[i % 5]; ph.textContent = i === 0 ? 'Your snap here' : '+'; c.append(ph);
      }
      deck.append(c);
    }
    active = 0; layout(); autoplay();
  }

  /* ---------- Feed ---------- */
  const PAGE = 60, feed = $('#feed'), more = $('#more'), count = $('#count'), none = $('#none');
  const seen = new Set(), all = [];
  let offset = 0, total = null, chip = 'all';
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.remove('pre'); io.unobserve(en.target); } }), { threshold: .08 }) : null;

  function tile(p) {
    const a = document.createElement('article'); a.className = 'snap' + (io ? ' pre' : ''); a.tabIndex = 0;
    a.dataset.q = (p.handle + ' ' + (p.location || '')).toLowerCase();
    a.dataset.t = new Date(p.created_at).getTime(); a.dataset.loc = p.location ? '1' : '';
    const img = new Image(); img.src = photoUrl(p.image_path); img.alt = 'Snap by ' + p.handle; img.loading = 'lazy'; img.decoding = 'async';
    const cap = document.createElement('div'); cap.className = 'cap';
    const n = document.createElement('b'); n.textContent = '@' + p.handle; cap.append(n);
    if (p.location) { const l = document.createElement('span'); l.className = 'where'; l.textContent = '📍 ' + p.location; cap.append(l); }
    const row = document.createElement('div'); row.className = 'crow';
    const t = document.createElement('time'); t.dateTime = p.created_at; t.textContent = ago(p.created_at); row.append(t);
    const u = addUrl(p.handle);
    if (u) { const l = document.createElement('a'); l.className = 'add'; l.href = u; l.target = '_blank'; l.rel = 'noopener noreferrer'; l.textContent = 'Add'; l.setAttribute('aria-label', 'Add ' + p.handle + ' on Snapchat'); l.addEventListener('click', e => e.stopPropagation()); row.append(l); }
    cap.append(row); a.append(img, cap);
    a.addEventListener('click', () => openView(p));
    a.addEventListener('keydown', e => { if (e.key === 'Enter') openView(p); });
    if (!reduce) {
      a.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return;
        const r = a.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        a.style.setProperty('--mx', x * 100 + '%'); a.style.setProperty('--my', y * 100 + '%');
        a.style.setProperty('--ty', (x - .5) * 12 + 'deg'); a.style.setProperty('--tx', (y - .5) * -12 + 'deg');
      });
      a.addEventListener('pointerleave', () => { a.style.setProperty('--ty', '0deg'); a.style.setProperty('--tx', '0deg'); });
    }
    if (io) io.observe(a);
    return a;
  }

  function filter() {
    const q = $('#q').value.trim().toLowerCase(), day = new Date().setHours(0, 0, 0, 0);
    let shown = 0;
    feed.querySelectorAll('.snap').forEach(a => {
      const ok = (!q || a.dataset.q.includes(q)) && (chip === 'all' || (chip === 'today' && +a.dataset.t >= day) || (chip === 'loc' && a.dataset.loc));
      a.hidden = !ok; if (ok) shown++;
    });
    none.hidden = shown > 0 || !all.length;
  }
  $('#q').addEventListener('input', filter);
  document.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
    chip = b.dataset.f;
    document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b));
    filter();
  }));

  function skeleton() {
    for (const h of [220, 280, 250, 210, 290, 240]) { const s = document.createElement('div'); s.className = 'sk'; s.style.setProperty('--h', h + 'px'); feed.append(s); }
  }
  const clearSoft = () => feed.querySelectorAll('.empty,.sk').forEach(n => n.remove());
  function empty(msg) { feed.textContent = ''; const p = document.createElement('p'); p.className = 'empty'; p.textContent = msg; feed.append(p); }
  function status() { count.textContent = total ? `${total} snap${total === 1 ? '' : 's'} shared so far` : ''; }

  async function fetchPage(from) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/snaps?select=id,handle,location,image_path,created_at&order=created_at.desc&limit=${PAGE}&offset=${from}`, { headers: { ...H, Prefer: 'count=exact' } });
    if (!r.ok) throw new Error('feed ' + r.status);
    const m = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
    if (m) total = +m[1];
    return r.json();
  }
  async function loadMore() {
    more.disabled = true;
    if (!all.length && !feed.querySelector('.sk')) skeleton();
    try {
      const rows = (await fetchPage(offset)).filter(p => !seen.has(p.id));
      clearSoft();
      rows.forEach(p => { seen.add(p.id); all.push(p); feed.append(tile(p)); });
      offset += rows.length;
      more.hidden = rows.length < PAGE;
      if (!all.length) empty('Nothing here yet. Be the first to drop a snap.');
      reel(); status(); filter();
    } catch (ex) { console.error(ex); clearSoft(); if (!all.length) empty('Could not load the feed. Refresh to try again.'); }
    more.disabled = false;
  }
  async function refresh() {
    try {
      const rows = (await fetchPage(0)).filter(p => !seen.has(p.id));
      if (!rows.length) return;
      clearSoft();
      rows.reverse().forEach(p => { seen.add(p.id); all.unshift(p); feed.prepend(tile(p)); });
      offset += rows.length; reel(); status(); filter();
    } catch { /* keep current feed */ }
  }
  more.addEventListener('click', loadMore);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { if (es[0].isIntersecting && !more.hidden && !more.disabled) loadMore(); }, { rootMargin: '800px' }).observe(more);
  reel(); loadMore();
  setInterval(() => { if (!document.hidden) refresh(); }, 20000);
})();
