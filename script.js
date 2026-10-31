(() => {
  const $ = s => document.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'snapbranch.v1';

  /* ---------- 3D cubes ---------- */
  function cube(size, color, cls, pos) {
    const c = document.createElement('div');
    c.className = 'cube ' + (cls || '');
    c.style.setProperty('--s', size + 'px');
    c.style.setProperty('--c', color);
    if (pos) { c.style.setProperty('--x', pos[0] + 'px'); c.style.setProperty('--y', pos[1] + 'px'); c.style.setProperty('--z', pos[2] + 'px'); }
    ['f', 'b', 'r', 'l', 't', 'd'].forEach(k => { const i = document.createElement('i'); i.className = 'face ' + k; c.appendChild(i); });
    return c;
  }
  const spin = $('#spin');
  spin.append(
    cube(120, '#ff2e93', 'hero-cube'),
    cube(38, '#22d3ee', '', [-120, -50, 40]),
    cube(30, '#ffaa00', '', [115, -20, -50]),
    cube(26, '#7c3aed', '', [60, 70, 100]),
    cube(22, '#22d3ee', '', [-70, 80, -90])
  );
  if (!reduce) {
    const tilt = $('#tilt');
    addEventListener('pointermove', e => {
      const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      tilt.style.setProperty('--ry', x * 40 + 'deg');
      tilt.style.setProperty('--rx', y * -25 + 'deg');
    }, { passive: true });
  }

  /* ---------- Minecraft avatar (pure SVG) ---------- */
  const map = ['HHHHHHHH', 'HHHHHHHH', 'HSSSSSSH', 'SWBSSBWS', 'SSSNNSSS', 'SSSNNSSS', 'SSMMMMSS', 'SSSSSSSS'];
  const pal = { H: '#4b2e1a', S: '#c58c5f', W: '#fff', B: '#3b5bdb', N: '#a0643d', M: '#7a3f2b' };
  let rects = '';
  map.forEach((row, y) => [...row].forEach((k, x) => { rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${pal[k]}"/>`; }));
  $('#avatar').innerHTML = rects;

  /* ---------- Phase 1: evasive CTA ---------- */
  const cta = $('#cta'), stage = $('#stage'), hint = $('#hint');
  const gate = $('#gate'), copy = $('#gate-copy');
  let dodged = false;

  function dodge() {
    const mx = (stage.clientWidth - cta.offsetWidth) / 2;
    const my = (stage.clientHeight - cta.offsetHeight) / 2;
    const cur = parseFloat(cta.style.getPropertyValue('--tx')) || 1;
    const x = -Math.sign(cur) * mx * (.55 + Math.random() * .45);
    const y = (Math.random() * 2 - 1) * my;
    cta.style.setProperty('--tx', Math.round(x) + 'px');
    cta.style.setProperty('--ty', Math.round(y) + 'px');
    dodged = true;
    hint.textContent = 'It moved. Catch it.';
  }
  cta.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !dodged) dodge(); });
  cta.addEventListener('click', () => { dodged ? openGate() : dodge(); });

  /* ---------- Phase 2: gatekeeper ---------- */
  let timer;
  function openGate() {
    gate.showModal();
    const text = copy.dataset.text;
    clearInterval(timer);
    if (reduce) { copy.textContent = text; return; }
    copy.textContent = '';
    let i = 0;
    timer = setInterval(() => {
      copy.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(timer);
    }, 28);
  }
  gate.addEventListener('close', () => clearInterval(timer));
  $('#proceed').addEventListener('click', () => { gate.close(); $('#composer').showModal(); });

  /* ---------- Phase 3: capture + feed ---------- */
  const composer = $('#composer'), form = $('#form');
  const handle = $('#handle'), photo = $('#photo'), preview = $('#preview');
  const dropText = $('#drop-text'), share = $('#share'), err = $('#err');
  let imgData = '';

  const sync = () => { share.disabled = !(handle.value.trim().length >= 2 && imgData); };
  handle.addEventListener('input', sync);

  photo.addEventListener('change', () => {
    const file = photo.files[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const max = 900, k = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        imgData = c.toDataURL('image/jpeg', .72);
        preview.src = imgData; preview.hidden = false; dropText.hidden = true;
        err.textContent = ''; sync();
      };
      im.onerror = () => { err.textContent = 'That file is not an image. Choose a photo.'; };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  });

  function reset() {
    form.reset(); imgData = ''; preview.hidden = true; dropText.hidden = false; err.textContent = ''; sync();
  }
  $('#cancel').addEventListener('click', () => { composer.close(); reset(); });

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = list => {
    for (let n = list.length; n > 0; n--) {
      try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, n))); return true; } catch { /* quota: drop oldest */ }
    }
    return false;
  };

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = handle.value.trim().replace(/^@+/, '');
    if (name.length < 2 || !imgData) return;
    const list = load();
    list.unshift({ name, img: imgData, t: Date.now(), r: +((Math.random() * 3 - 1.5).toFixed(1)) });
    if (!save(list.slice(0, 30))) { err.textContent = 'Storage is full. Clear some site data and try again.'; return; }
    composer.close(); reset(); render();
    hint.textContent = 'Posted.';
    $('#feed').firstElementChild?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  });

  function render() {
    const feed = $('#feed'), list = load();
    feed.textContent = '';
    if (!list.length) {
      feed.innerHTML = '<p class="empty">No snaps yet. Drop the first one.</p>';
      return;
    }
    list.forEach(p => {
      const a = document.createElement('article'); a.className = 'card';
      a.style.setProperty('--r', (p.r || 0) + 'deg');
      const img = new Image(); img.src = p.img; img.alt = 'Snap by ' + p.name; img.loading = 'lazy';
      const m = document.createElement('div'); m.className = 'meta';
      const b = document.createElement('span'); b.className = 'badge'; b.textContent = '@' + p.name;
      const t = document.createElement('time'); t.dateTime = new Date(p.t).toISOString();
      t.textContent = new Date(p.t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      m.append(b, t); a.append(img, m); feed.append(a);
    });
  }
  render();
})();
