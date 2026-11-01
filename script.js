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
  const hue = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) * 37 % 360;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* ---------- Camera sheet ---------- */
  const composer = $('#composer'), form = $('#form'), handle = $('#handle'), place = $('#place');
  const preview = $('#preview'), share = $('#share'), err = $('#err');
  const cam = $('#cam'), msg = $('#cam-msg'), msgText = $('#cam-text'), retry = $('#retry');
  const snapBtn = $('#snap'), flip = $('#flip'), retake = $('#retake'), shoot = $('#shoot'), post = $('#post');
  let blob = null, stream = null, facing = 'environment', mirrored = false;
  const clean = () => handle.value.trim().replace(/^@+/, '');
  const sync = () => { share.disabled = !(HANDLE_RE.test(clean()) && blob); };
  handle.addEventListener('input', () => {
    err.textContent = clean() && !HANDLE_RE.test(clean()) ? 'Usernames are 3 to 15 characters: letters, numbers, . _ -' : '';
    sync();
  });
  function stopCam() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; cam.srcObject = null; }
  function reset() { form.reset(); blob = null; preview.hidden = true; err.textContent = ''; share.textContent = 'Send'; sync(); }
  function say(text, retryable) { msg.hidden = !text; msgText.textContent = text || ''; retry.hidden = !retryable; }
  async function startCam() {
    stopCam(); blob = null; preview.hidden = true; cam.hidden = false; post.hidden = true; shoot.hidden = false; flip.hidden = false;
    snapBtn.disabled = true; sync(); say('Starting camera...');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('This browser cannot open the camera. Try Chrome or Safari.'); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      cam.srcObject = stream; await cam.play().catch(() => {});
      mirrored = (stream.getVideoTracks()[0].getSettings().facingMode || 'user') !== 'environment';
      cam.classList.toggle('mirror', mirrored);
      say(''); snapBtn.disabled = false;
    } catch { say('Allow camera access to take a snap.', true); }
  }
  $('#open').addEventListener('click', () => { composer.showModal(); handle.value = localStorage.getItem('snapbranch.handle') || ''; startCam(); });
  $('#cancel').addEventListener('click', () => composer.close());
  composer.addEventListener('close', () => { stopCam(); reset(); });
  flip.addEventListener('click', () => { facing = facing === 'user' ? 'environment' : 'user'; startCam(); });
  retry.addEventListener('click', startCam);
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
      shoot.hidden = true; flip.hidden = true; post.hidden = false; err.textContent = ''; sync();
    }, 'image/jpeg', .78);
    const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    share.disabled = true; share.textContent = 'Sending...';
    try {
      const path = crypto.randomUUID() + '.jpg';
      let r = await fetch(`${SUPABASE_URL}/storage/v1/object/snaps/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg' }, body: blob });
      if (!r.ok) throw new Error('photo upload ' + r.status + ': ' + (await r.text()).slice(0, 160));
      r = await fetch(`${SUPABASE_URL}/rest/v1/snaps`, {
        method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ handle: clean(), location: place.value.trim().slice(0, 60) || null, image_path: path })
      });
      if (!r.ok) throw new Error('save ' + r.status + ': ' + (await r.text()).slice(0, 160));
      localStorage.setItem('snapbranch.handle', clean());
      composer.close();
      await refresh();
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    } catch (ex) {
      console.error(ex);
      err.textContent = 'Could not send. ' + (ex.message || 'Check your connection and try again.');
      share.textContent = 'Send'; sync();
    }
  });

  /* ---------- Story viewer ---------- */
  const view = $('#view'), fill = $('#fill');
  let si = 0;
  function show() {
    const p = all[si]; if (!p) { view.close(); return; }
    $('#view-img').src = photoUrl(p.image_path); $('#view-img').alt = 'Snap by ' + p.handle;
    $('#s-name').textContent = '@' + p.handle;
    $('#s-meta').textContent = (p.location ? '📍 ' + p.location + ' · ' : '') + ago(p.created_at);
    const add = $('#view-add'), u = addUrl(p.handle); add.hidden = !u; if (u) add.href = u;
    fill.style.animation = 'none'; void fill.offsetWidth;
    if (reduce) fill.style.width = '100%'; else fill.style.animation = 'prog 5s linear forwards';
    if (all[si + 1]) new Image().src = photoUrl(all[si + 1].image_path);
  }
  const next = () => { if (si < all.length - 1) { si++; show(); } else view.close(); };
  const prev = () => { si = Math.max(0, si - 1); show(); };
  function openStory(i) { si = Math.max(0, i); show(); if (!view.open) view.showModal(); }
  fill.addEventListener('animationend', next);
  $('#s-next').addEventListener('click', next);
  $('#s-prev').addEventListener('click', prev);
  $('#s-close').addEventListener('click', () => view.close());
  view.addEventListener('close', () => { fill.style.animation = 'none'; });

  /* ---------- Stories row + feed ---------- */
  const PAGE = 60, feed = $('#feed'), more = $('#more'), count = $('#count'), stories = $('#stories');
  const seen = new Set(), all = [];
  let offset = 0, total = null;

  function storiesRow() {
    stories.textContent = '';
    const you = el('button', 'story you'); you.type = 'button';
    const yr = el('span', 'ring'); yr.append(el('div', '', '+')); you.append(yr, el('span', 'lbl', 'Your snap'));
    you.addEventListener('click', () => $('#open').click());
    stories.append(you);
    all.slice(0, 14).forEach((p, i) => {
      const b = el('button', 'story'); b.type = 'button';
      const r = el('span', 'ring'), im = new Image(); im.src = photoUrl(p.image_path); im.alt = ''; r.append(im);
      b.append(r, el('span', 'lbl', p.handle)); b.addEventListener('click', () => openStory(i));
      stories.append(b);
    });
  }

  function postEl(p) {
    const a = el('article', 'post'), head = el('div', 'phead');
    const av = el('div', 'av', p.handle[0]); av.style.background = `hsl(${hue(p.handle)} 85% 62%)`;
    const who = el('div', 'who'); who.append(el('b', '', '@' + p.handle)); if (p.location) who.append(el('span', '', '📍 ' + p.location));
    const t = el('time', '', ago(p.created_at)); t.dateTime = p.created_at;
    head.append(av, who, t);
    const img = new Image(); img.src = photoUrl(p.image_path); img.alt = 'Snap by ' + p.handle; img.loading = 'lazy'; img.decoding = 'async';
    img.addEventListener('click', () => openStory(all.indexOf(p)));
    a.append(head, img);
    const u = addUrl(p.handle);
    if (u) { const l = el('a', 'snapadd', 'Add @' + p.handle + ' on Snapchat'); l.href = u; l.target = '_blank'; l.rel = 'noopener noreferrer'; a.append(l); }
    return a;
  }

  const clearSoft = () => feed.querySelectorAll('.empty,.sk').forEach(n => n.remove());
  const skeleton = () => { for (let i = 0; i < 2; i++) feed.append(el('div', 'sk')); };
  const empty = m => { feed.textContent = ''; feed.append(el('p', 'empty', m)); };
  const status = () => { count.textContent = total ? `${total} snap${total === 1 ? '' : 's'} shared so far.` : ''; };

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
      rows.forEach(p => { seen.add(p.id); all.push(p); feed.append(postEl(p)); });
      offset += rows.length; more.hidden = rows.length < PAGE;
      if (!all.length) empty('Nothing here yet. Tap the camera and post the first snap.');
      storiesRow(); status();
    } catch (ex) { console.error(ex); clearSoft(); if (!all.length) empty('Could not load the feed. Refresh to try again.'); }
    more.disabled = false;
  }
  async function refresh() {
    try {
      const rows = (await fetchPage(0)).filter(p => !seen.has(p.id));
      if (!rows.length) return;
      clearSoft();
      rows.reverse().forEach(p => { seen.add(p.id); all.unshift(p); feed.prepend(postEl(p)); });
      offset += rows.length; storiesRow(); status();
    } catch { /* keep current feed */ }
  }
  more.addEventListener('click', loadMore);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { if (es[0].isIntersecting && !more.hidden && !more.disabled) loadMore(); }, { rootMargin: '800px' }).observe(more);
  storiesRow(); loadMore();
  setInterval(() => { if (!document.hidden) refresh(); }, 20000);
})();
