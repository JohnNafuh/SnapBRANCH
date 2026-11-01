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

  /* ---------- Composer ---------- */
  const composer = $('#composer'), form = $('#form'), handle = $('#handle'), place = $('#place');
  const photo = $('#photo'), preview = $('#preview'), dropText = $('#drop-text'), share = $('#share'), err = $('#err');
  let blob = null;
  const sync = () => { share.disabled = !(handle.value.trim().length >= 2 && blob); };
  handle.addEventListener('input', sync);
  $('#open').addEventListener('click', () => composer.showModal());
  $('#cancel').addEventListener('click', () => { composer.close(); reset(); });

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
  function reset() { form.reset(); blob = null; preview.hidden = true; dropText.hidden = false; err.textContent = ''; share.textContent = 'Share snap'; sync(); }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const last = +localStorage.getItem('snapbranch.last') || 0;
    if (Date.now() - last < 60000) { err.textContent = 'Easy. One snap per minute.'; return; }
    share.disabled = true; share.textContent = 'Posting...';
    try {
      const path = crypto.randomUUID() + '.jpg';
      let r = await fetch(`${SUPABASE_URL}/storage/v1/object/snaps/${path}`, { method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg' }, body: blob });
      if (!r.ok) throw new Error('photo upload ' + r.status + ': ' + (await r.text()).slice(0, 160));
      r = await fetch(`${SUPABASE_URL}/rest/v1/snaps`, {
        method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ handle: handle.value.trim().replace(/^@+/, '').slice(0, 20), location: place.value.trim().slice(0, 60) || null, image_path: path })
      });
      if (!r.ok) throw new Error('save ' + r.status + ': ' + (await r.text()).slice(0, 160));
      localStorage.setItem('snapbranch.last', Date.now());
      composer.close(); reset();
      const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
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
  view.addEventListener('click', () => view.close());
  function openView(p) {
    $('#view-img').src = photoUrl(p.image_path);
    $('#view-img').alt = 'Snap by ' + p.handle;
    $('#view-cap').textContent = '@' + p.handle + (p.location ? ' · ' + p.location : '') + ' · ' + ago(p.created_at);
    view.showModal();
  }

  /* ---------- Feed ---------- */
  const PAGE = 12, feed = $('#feed'), more = $('#more'), deck = $('#deck'), count = $('#count');
  const seen = new Set(), all = [];
  let offset = 0, total = null;

  function tile(p) {
    const a = document.createElement('article'); a.className = 'snap'; a.tabIndex = 0;
    const img = new Image(); img.src = photoUrl(p.image_path); img.alt = 'Snap by ' + p.handle; img.loading = 'lazy'; img.decoding = 'async';
    const n = document.createElement('b'); n.textContent = '@' + p.handle;
    a.append(img, n);
    if (p.location) { const l = document.createElement('span'); l.className = 'where'; l.textContent = '📍 ' + p.location; a.append(l); }
    const t = document.createElement('time'); t.dateTime = p.created_at; t.textContent = ago(p.created_at); a.append(t);
    a.addEventListener('click', () => openView(p));
    if (!reduce) {
      a.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; const r = a.getBoundingClientRect(); a.style.setProperty('--ty', ((e.clientX - r.left) / r.width - .5) * 12 + 'deg'); a.style.setProperty('--tx', ((e.clientY - r.top) / r.height - .5) * -12 + 'deg'); });
      a.addEventListener('pointerleave', () => { a.style.setProperty('--ty', '0deg'); a.style.setProperty('--tx', '0deg'); });
    }
    a.addEventListener('keydown', e => { if (e.key === 'Enter') openView(p); });
    return a;
  }
  function reel() {
    const grads = ['linear-gradient(140deg,#3a4bff,#ff3d9a)', 'linear-gradient(140deg,#ff8a3d,#ff3d9a)', 'linear-gradient(140deg,#17c3b2,#3a4bff)', 'linear-gradient(140deg,#ffd23d,#ff8a3d)', 'linear-gradient(140deg,#8a3dff,#3a4bff)'];
    const order = [3, 1, 0, 2, 4];
    deck.textContent = '';
    for (let i = 0; i < 5; i++) {
      const p = all[order[i]], d = i - 2, c = document.createElement('div'), ph = document.createElement('div'), cap = document.createElement('span');
      c.className = 'pc';
      c.style.cssText = `--x:${d * 56}px;--y:${Math.abs(d) * 12}px;--z:${-Math.abs(d) * 45}px;--r:${d * 8}deg`;
      ph.className = 'ph';
      if (p) { const im = new Image(); im.src = photoUrl(p.image_path); im.alt = ''; ph.append(im); }
      else { ph.style.background = grads[i]; ph.textContent = i === 2 ? 'Your snap here' : '+'; }
      cap.textContent = p ? '@' + p.handle : 'be first';
      c.append(ph, cap); deck.append(c);
    }
  }
  function status() { count.textContent = total ? `${total} snap${total === 1 ? '' : 's'} shared so far` : ''; }
  async function fetchPage(from) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/snaps?select=id,handle,location,image_path,created_at&order=created_at.desc&limit=${PAGE}&offset=${from}`, { headers: { ...H, Prefer: 'count=exact' } });
    if (!r.ok) throw new Error('feed ' + r.status);
    const m = /\/(\d+)$/.exec(r.headers.get('content-range') || '');
    if (m) total = +m[1];
    return r.json();
  }
  function empty(msg) { feed.textContent = ''; const p = document.createElement('p'); p.className = 'empty'; p.textContent = msg; feed.append(p); }
  async function loadMore() {
    more.disabled = true;
    try {
      const rows = (await fetchPage(offset)).filter(p => !seen.has(p.id));
      if (feed.querySelector('.empty')) feed.textContent = '';
      rows.forEach(p => { seen.add(p.id); all.push(p); feed.append(tile(p)); });
      offset += rows.length;
      more.hidden = rows.length < PAGE;
      if (!all.length) empty('Nothing here yet. Be the first to drop a snap.');
      reel(); status();
    } catch (ex) { console.error(ex); if (!all.length) empty('Could not load the feed. Refresh to try again.'); }
    more.disabled = false;
  }
  async function refresh() {
    try {
      const rows = (await fetchPage(0)).filter(p => !seen.has(p.id));
      if (!rows.length) return;
      if (feed.querySelector('.empty')) feed.textContent = '';
      rows.reverse().forEach(p => { seen.add(p.id); all.unshift(p); feed.prepend(tile(p)); });
      offset += rows.length; reel(); status();
    } catch { /* keep current feed */ }
  }

  /* ---------- Depth: pointer, scroll, gyro ---------- */
  if (!reduce) {
    addEventListener('pointermove', e => {
      deck.style.setProperty('--dy', (e.clientX / innerWidth - .5) * 30 + 'deg');
      deck.style.setProperty('--dx', (e.clientY / innerHeight - .5) * -18 + 'deg');
    }, { passive: true });
    addEventListener('scroll', () => deck.style.setProperty('--ds', Math.min(scrollY * .05, 25) + 'deg'), { passive: true });
    const gyro = e => {
      if (e.gamma == null) return;
      deck.style.setProperty('--dy', Math.max(-30, Math.min(30, e.gamma)) * .9 + 'deg');
      deck.style.setProperty('--dx', Math.max(-20, Math.min(20, (e.beta - 45) * -.5)) + 'deg');
    };
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
      addEventListener('click', () => DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', gyro); }).catch(() => {}), { once: true });
    } else addEventListener('deviceorientation', gyro);
  }
  more.addEventListener('click', loadMore);
  loadMore();
  setInterval(() => { if (!document.hidden) refresh(); }, 20000);
})();
