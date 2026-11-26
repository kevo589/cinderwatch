
const UI = (() => {
  const U = {
    ctx: null, s: 3, insetTop: 0, goldShown: 0, hurt: 0, coins: [], msg: null, hover: null, menu: null, armed: null, idle: 99, mx: -1, my: -1, inside: false,
    btns: [], hotBtn: null, press: null, gp: { sel: -1, t: 0, prev: [] , active: false }, goldBump: 0, deny: 0, hintT: 0, titleT: 0, rangeMesh: null, padMesh: null, soundRect: null, cmdRect: null, manual: false, moved: 99, focus: 0, slainBump: 0, lastSlain: 0,
    touch: false, ptrs: new Map(), gest: null, lastTap: { t: -9, x: 0, y: 0 }, waveRect: null, followRect: null, menuRect: null, wake: null, panning: false,
    hud: [], tips: [], tip: null, keys: new Set(), sndArmed: false, vvT: 0, vvN: 0,
  };
  const COLR = { bg: 'rgba(9,10,15,0.86)', bg2: 'rgba(30,27,31,0.94)', bd: '#6a5233', bdHi: '#e8b04a', crim: '#c9403a', tx: '#efe4cd', dim: '#a79e8a', amber: '#e8b04a', ember: '#ff8a3c', cold: '#8fc7ff', red: '#e5553c', dark: '#0b0d14', ok: '#9fd08a' };
  const _pv = new THREE.Vector3(), _o = new THREE.Vector3(), _d = new THREE.Vector3();
  function proj(x, y, z) { _pv.set(x, y, z).project(R.cam); return { x: (_pv.x * .5 + .5) * R.dw, y: (1 - (_pv.y * .5 + .5)) * R.dh }; }
  U.proj = proj;
  U.playerActive = () => U.manual;
  U.setManual = on => { U.manual = !!on; if (!on) { U.menu = null; U.armed = null; U.ghost = null; } };
  U.banner = (text, dur, big) => { U.msg = { text, t: 0, dur, big }; };
  U.ping = (x, y, z, byPlayer) => { fxTimed(4, x, y + .12, z, 5, 5, byPlayer ? 1.0 : 1.5, byPlayer ? 1.4 : 1.1, byPlayer ? 1.8 : .5, .7, .55, { ground: true }); };
  U.closeMenu = () => { U.menu = null; U.armed = null; U.ghost = null; U.ascend = null; };
  U.coinFrom = (x, y, z, value) => {
    if (U.coins.length > 70) { U.goldShown += value; return; }
    const p = proj(x, y, z); U.coins.push({ sx: p.x, sy: p.y, t: 0, T: rr(.55, .8), value, cx: p.x + rr(-60, 60) * U.s, cy: p.y - rr(30, 70) * U.s });
  };

  // eased 0..1 per control id, so hover and selection fade in and out instead of snapping
  U.anim = {}; U.frameDt = 1 / 60;
  function ease(id, to) { const v = U.anim[id] === undefined ? to : U.anim[id], n = v + (to - v) * Math.min(1, U.frameDt * 14); U.anim[id] = Math.abs(n - to) < .01 ? to : n; return U.anim[id]; }
  const hex2 = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function mixHex(a, b, t) { if (t <= 0 || a[0] !== '#' || b[0] !== '#') return t >= 1 ? b : a; const p = hex2(a), q = hex2(b); return 'rgb(' + p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(',') + ')'; }
  // a dark-fantasy plate: a bronze rim with clipped corners, an obsidian body, a light top-left bevel and a dark bottom-right one;
  // o.id + o.lit make it glow amber smoothly when hovered, pressed or selected; o.crim marks danger
  function plate(x, y, w, h, o = {}) {
    const c = U.ctx, s = U.s; x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const k = o.id !== undefined ? ease(o.id, o.lit ? 1 : 0) : 0, hiCol = o.crim ? COLR.crim : COLR.bdHi;
    c.fillStyle = mixHex(o.crim && !o.id ? COLR.crim : (o.bd || COLR.bd), hiCol, k); c.fillRect(x + s, y, w - 2 * s, h); c.fillRect(x, y + s, w, h - 2 * s);
    c.fillStyle = o.bg || COLR.bg; c.fillRect(x + 2 * s, y + s, w - 4 * s, h - 2 * s); c.fillRect(x + s, y + 2 * s, w - 2 * s, h - 4 * s);
    if (h > 6 * s) { c.fillStyle = 'rgba(255,236,200,0.035)'; c.fillRect(x + 2 * s, y + 2 * s, w - 4 * s, Math.round((h - 4 * s) * .45)); }
    c.fillStyle = 'rgba(255,224,170,0.11)'; c.fillRect(x + 2 * s, y + s, w - 4 * s, s); c.fillRect(x + s, y + 2 * s, s, h - 4 * s);
    c.fillStyle = 'rgba(0,0,0,0.38)'; c.fillRect(x + 2 * s, y + h - 2 * s, w - 4 * s, s); c.fillRect(x + w - 2 * s, y + 2 * s, s, h - 4 * s);
    if (k > 0) { c.fillStyle = o.crim ? 'rgba(201,64,58,' + (.14 * k).toFixed(3) + ')' : 'rgba(232,176,74,' + (.11 * k).toFixed(3) + ')'; c.fillRect(x + 2 * s, y + 2 * s, w - 4 * s, h - 4 * s); c.fillStyle = 'rgba(255,214,140,' + (.35 * k).toFixed(3) + ')'; c.fillRect(x + 2 * s, y + s, w - 4 * s, s); }
    if (o.hi) { c.fillStyle = o.hi; c.fillRect(x + 2 * s, y + s, w - 4 * s, s); }
  }
  function text(str, x, y, col, o) { return PX.text(U.ctx, str, x, y, U.s, col || COLR.tx, o); }
  const tw = str => PX.measure(str) * U.s;

  function initUI() {
    const cv = document.getElementById('hud'); U.ctx = cv.getContext('2d'); U.ctx.imageSmoothingEnabled = false;
    const mk = (seg, col) => {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((seg + 1) * 6), 3)); const idx = [];
      for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); } g.setIndex(idx);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6, side: THREE.DoubleSide }));
      m.frustumCulled = false; m.visible = false; m.renderOrder = 6; m.seg = seg; R.scene.add(m); return m;
    };
    U.rangeMesh = mk(96, new THREE.Color(1.5, 1.15, .6)); U.padMesh = mk(40, new THREE.Color(2.2, 1.7, .9));
    U.touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
    const D = () => R.dpr || 1, pos = e => [e.clientX * D(), e.clientY * D()];
    window.addEventListener('pointerdown', e => {
      const [x, y] = pos(e); U.touch = e.pointerType !== 'mouse'; U.mx = x; U.my = y; U.inside = true; U.gp.active = false; U.moved = 0; U.shift = e.shiftKey;
      if (e.button === 2) { if (U.armed || U.menu) { disarm(); U.menu = null; sfx('uiHover', CAM.x, CAM.z, .5); } e.preventDefault(); return; }
      U.ptrs.set(e.pointerId, { x, y, x0: x, y0: y });
      audioGesture();
      CAM.za = null;
      if (U.ptrs.size === 1) { const b = btnAt(x, y); if (b && b.id === 'pgSlider') setInfuseX(x); U.gest = { mode: 'tap', hud: !!b || hudAt(x, y), btn: b }; U.press = b ? b.id : null; }
      else if (U.ptrs.size === 2) { const [a, b] = [...U.ptrs.values()]; U.gest = { mode: 'pinch', d: Math.hypot(a.x - b.x, a.y - b.y) || 1, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; U.press = null; }
      e.preventDefault();
    }, { passive: false });
    window.addEventListener('pointermove', e => {
      const [x, y] = pos(e), p = U.ptrs.get(e.pointerId);
      if (e.pointerType === 'mouse' || p) { U.mx = x; U.my = y; U.inside = true; U.moved = 0; U.gp.active = false; }
      if (!p) return;
      const g = U.gest;
      if (g && g.mode === 'pinch' && U.ptrs.size >= 2) {
        p.x = x; p.y = y; const [a, b] = [...U.ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y) || 1, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        camPan(cx - g.cx, cy - g.cy); camZoomAt(d / g.d, cx, cy); g.d = d; g.cx = cx; g.cy = cy; return;
      }
      if (U.press === 'pgSlider' && U.ascend) setInfuseX(x);
      if (g && g.mode === 'tap' && !g.hud && Math.hypot(x - p.x0, y - p.y0) > (U.touch ? 10 : 6) * D()) { g.mode = 'pan'; U.press = null; }
      if (g && g.mode === 'pan') camPan(x - p.x, y - p.y);
      p.x = x; p.y = y;
    });
    const up = e => {
      const p = U.ptrs.get(e.pointerId); if (!p) return; U.ptrs.delete(e.pointerId); audioGesture(); U.keepAwake();
      const g = U.gest;
      if (U.ptrs.size === 0) { if (g && g.mode === 'tap' && e.type === 'pointerup') onTap(p.x, p.y, g.btn); U.gest = null; U.press = null; if (U.touch) U.inside = false; }
      else if (g && g.mode === 'pinch') U.gest = { mode: 'pan' };
    };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    window.addEventListener('pointerleave', () => { if (!U.ptrs.size) U.inside = false; });
    document.addEventListener('mouseleave', () => { if (!U.ptrs.size) U.inside = false; });
    window.addEventListener('wheel', e => { const [x, y] = pos(e), d = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY; camZoomTo(camZoomNow() * Math.exp(-clamp(d, -160, 160) * (e.ctrlKey ? .012 : .0024)), x, y, 16); e.preventDefault(); }, { passive: false });
    const stop = e => { if (e.cancelable) e.preventDefault(); };
    for (const ev of ['touchmove', 'touchcancel', 'dblclick', 'gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, stop, { passive: false });
    document.addEventListener('touchstart', e => {
      stop(e); const n = e.touches.length;
      if (n < U.ptrs.size) { const keys = [...U.ptrs.keys()]; for (let i = 0; i < keys.length - n; i++) U.ptrs.delete(keys[i]); if (U.ptrs.size <= 1) { const p = [...U.ptrs.values()][0]; U.gest = p ? { mode: 'tap', hud: !!btnAt(p.x, p.y) || hudAt(p.x, p.y) } : null; } }
    }, { passive: false });
    document.addEventListener('touchend', e => { audioGesture(); stop(e); if (!e.touches.length && U.ptrs.size) setTimeout(() => { if (U.ptrs.size) U.dropTouches(); }, 80); }, { passive: false });
    if (window.visualViewport) for (const ev of ['resize', 'scroll']) window.visualViewport.addEventListener(ev, fixPageZoom);
    try { if (localStorage.getItem('cinderwatch.muted') === '1') AU.muted = true; G.best = +localStorage.getItem('cinderwatch.best') || 0; } catch (e) {}
    window.addEventListener('keyup', e => { U.keys.delete(e.code); });
    window.addEventListener('blur', () => U.keys.clear());
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      if (PAN[e.code] && !e.ctrlKey && !e.metaKey && !e.altKey) { U.keys.add(e.code); e.preventDefault(); }
      if (e.repeat) return; audioGesture(); U.keepAwake(); U.touch = false;
      if (G.phase === 'menu') {
        const k0 = e.key, n = BIOMES.length;
        if (k0 === 'Enter' || k0 === ' ') { startPlayerRun(G.menuBiome); e.preventDefault(); }
        else if (k0 === 'ArrowRight' || k0 === 'ArrowDown') { menuSelect((G.menuBiome + 1) % n); e.preventDefault(); }
        else if (k0 === 'ArrowLeft' || k0 === 'ArrowUp') { menuSelect((G.menuBiome + n - 1) % n); e.preventDefault(); }
        else if (k0 >= '1' && k0 <= '5') menuSelect(+k0 - 1);
        else if (k0 === 'm' || k0 === 'M') setMute(!AU.muted);
        else if (k0 === 'v' || k0 === 'V') cycleVisuals();
        return;
      }
      if (G.phase === 'defeat' && G.runMode === 'player') { if (e.key === 'Enter' && canSecondChance()) secondChance(); return; }
      const k = e.key;
      // Shift+1..8 fire the ability slots; the physical key is used so plain 1-4 (build) and X (sell) stay as they are
      if (e.shiftKey && /^Digit[1-9]$/.test(e.code)) { const key = (U.abKeys || [])[+e.code[5] - 1]; if (key) fireAbility(key); e.preventDefault(); return; }
      const selT = U.menu && U.menu.tower && U.menu.tower.alive ? U.menu.tower : null;
      if (k >= '1' && k <= '7') { pickKind(TOWER_KINDS[+k - 1]); e.preventDefault(); }
      else if (k === 'q' || k === 'Q') { const t = selT || (U.hover && U.hover.tower); if (t) doUpgradePath(t, 0); }
      else if ((k === 'e' || k === 'E') && (selT || (U.hover && U.hover.tower && !G.choice))) doUpgradePath(selT || U.hover.tower, 1);
      else if (k === ' ' || k === 'Enter') { callWave(); e.preventDefault(); }
      else if (k === 'Escape') { if (G.paused && G.runMode === 'player') togglePause(); else U.closeMenu(); }
      else if (k === 'u' || k === 'U') { const t = (U.menu && U.menu.tower) || (U.hover && U.hover.tower); if (t) { touchInput(); doUpgrade(t); } }
      else if (k === 'e' || k === 'E') { if (holdPass()) sfx('uiClick', CAM.x, CAM.z, .8); }
      else if (k === 'n' || k === 'N') { if (G.choice ? marchOn() : leaveEndless()) sfx('uiClick', CAM.x, CAM.z, .8); }
      else if (k === 't' || k === 'T') { const t = (U.menu && U.menu.tower) || (U.hover && U.hover.tower); if (t && !TOWER[t.kind].noAim) { touchInput(); cycleTarget(t); } }
      else if (k === 'x' || k === 'X' || k === 'Delete' || k === 'Backspace') { const t = U.menu && U.menu.tower; if (t) { touchInput(); if (U.menu.sellArm) doSell(t); else { U.menu.sellArm = true; sfx('uiHover', t.x, t.z, .8); } } }
      else if (k === 'p' || k === 'P') { togglePause(); }
      else if (k === 'Tab') { cycleSpeed(); e.preventDefault(); }
      else if (k === '0') { camReset(); }
      else if (k === 'm' || k === 'M') { setMute(!AU.muted); }
      else if (k === 'v' || k === 'V') { cycleVisuals(); }
      else if (k === '+' || k === '=') { camZoomBy(1.4); }
      else if (k === '-' || k === '_') { camZoomBy(1 / 1.4); }
      else if (k === 'c' || k === 'C') { toggleCommand(); }
      else if (k === 'f' || k === 'F' || k === 'Home') { camReset(); }
    });
  }
  const PAN = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1], KeyA: [1, 0], KeyD: [-1, 0], KeyW: [0, 1], KeyS: [0, -1] };
  function togglePause() { G.paused = !G.paused; sfx('uiClick', CAM.x, CAM.z, .6); }
  function cycleSpeed() { G.speed = G.speed % 3 + 1; if (G.paused) G.paused = false; sfx('uiClick', CAM.x, CAM.z, .6); }
  function soundTap() { if (AU.ready && U.sndArmed) setMute(!AU.muted); }
  U.sawMonster = type => { if (G.seen[type]) return; G.seen[type] = 1; if (MON[type].tip && U.tips.length < 4) U.tips.push(type); };
  U.keepAwake = () => { try { if (navigator.wakeLock && !document.hidden && (!U.wake || U.wake.released)) navigator.wakeLock.request('screen').then(w => { U.wake = w; }, () => {}); } catch (e) {} };
  U.dropTouches = () => { U.ptrs.clear(); U.gest = null; U.press = null; if (U.touch) U.inside = false; };
  function fixPageZoom() {
    const vv = window.visualViewport, m = document.getElementById('vp'); if (!vv || !m || Math.abs(vv.scale - 1) < .02) { U.vvN = 0; return; }
    const now = performance.now(); if (now - U.vvT < 250 || U.vvN > 12) return; U.vvT = now; U.vvN++;
    const c = 'width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover';
    m.setAttribute('content', c + ',shrink-to-fit=no'); setTimeout(() => { m.setAttribute('content', c); try { window.scrollTo(0, 0); } catch (e) {} resizeRenderer(); }, 40);
  }
  function setMute(b) { AU.setMuted(b); try { localStorage.setItem('cinderwatch.muted', b ? '1' : '0'); } catch (e) {} }
  function fullscreenOK() { const d = document; return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled) && !(window.navigator.standalone); }
  function isFull() { const d = document; return !!(d.fullscreenElement || d.webkitFullscreenElement); }
  function toggleFull() {
    const d = document, el = d.documentElement;
    try { if (isFull()) (d.exitFullscreen || d.webkitExitFullscreen).call(d); else { const r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); } } catch (e) {}
  }
  function buzz(p) { if (U.touch && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }
  function inRect(r, x, y, min = 0) {
    if (!r) return false; const m = min * (R.dpr || 1), mw = Math.max(0, m - r.w) / 2, mh = Math.max(0, m - r.h) / 2;
    return x >= r.x - mw && x <= r.x + r.w + mw && y >= r.y - mh && y <= r.y + r.h + mh;
  }
  function btnAt(x, y) { const m = U.touch ? 44 : 0; for (const b of U.btns) if (inRect(b, x, y, m)) return b; for (const b of U.hud) if (inRect(b, x, y, m)) return b; return null; }
  function hudAt(x, y) { return inRect(U.menuRect, x, y, 0); }
  function startPrep() { touchInput(); audioGesture(); if (startPrepWave()) { sfx('uiClick', CAM.x, CAM.z, .9); buzz(12); } }
  function callWave() { if (G.prep) { startPrep(); return; } touchInput(); if (callWaveEarly()) { sfx('uiClick', CAM.x, CAM.z, .8); buzz(10); } else sfx('uiDeny', CAM.x, CAM.z, .5); }
  function audioGesture() { if (!AU.ready) AU.unlock(); }
  function touchInput() { U.idle = 0; U.manual = true; }
  function toggleCommand() { U.setManual(!U.manual); U.idle = 0; U.cmdArm = 0; sfx('uiClick', CAM.x, CAM.z, .8); }
  // on touch, handing command to the AI takes a second tap within a few seconds, so a stray tap can't do it
  function commandTap() { if (U.touch && U.manual && !(U.cmdArm > 0)) { U.cmdArm = 3; sfx('uiHover', CAM.x, CAM.z, .8); buzz(8); return; } toggleCommand(); }
  // leaving an Endless run for the next land also asks twice on touch
  function leaveTap() { if (U.touch && !(U.leaveArm > 0)) { U.leaveArm = 3; sfx('uiHover', CAM.x, CAM.z, .8); buzz(8); return; } U.leaveArm = 0; if (leaveEndless()) sfx('uiClick', CAM.x, CAM.z, .8); }
  function deny() { U.deny = 1; sfx('uiDeny', CAM.x, CAM.z, .6); buzz([18, 40, 18]); }
  function doBuild(pad, kind) { touchInput(); if (buildTowerAt(pad.x, pad.z, kind, true)) { sfx('uiClick', pad.x, pad.z, .8); buzz(12); U.menu = null; U.armed = null; U.ghost = null; return true; } deny(); return false; }
  // place the armed tower at the ghost; keep it armed when asked (Shift on desktop)
  function placeArmed(keep) {
    const g = U.ghost, kind = U.armed; if (!g || !kind) return false; touchInput();
    if (g.chk.ok && G.gold >= TOWER[kind].cost[0] && buildTowerAt(g.x, g.z, kind, true)) {
      sfx('uiClick', g.x, g.z, .8); buzz(12); if (!keep || G.gold < TOWER[kind].cost[0]) U.armed = null; U.ghost = null; return true;
    }
    deny(); return false;
  }
  function disarm() { U.armed = null; U.ghost = null; }
  // the Ascend window's gold slider: position along the track sets how much gold to infuse, in steps of 10
  function setInfuseX(x) { const sl = U.pgSl; if (!sl || !U.ascend) return; U.ascend.infuse = Math.round(clamp((x - sl.x) / sl.w, 0, 1) * sl.max / 10) * 10; }
  function doAscend() {
    const a = U.ascend; if (!a) return; touchInput();
    if (ascendTower(a.t, a.infuse)) { buzz([20, 40, 30]); U.ascend = null; if (U.menu) U.menu.sellArm = false; } else deny();
  }
  // fire one ready copy of an ability (from its slot or Shift+1..8)
  function fireAbility(key) {
    touchInput(); audioGesture();
    if (useAbility(key)) { U.abToast = { text: ABILITY[key].name, t: 0 }; buzz(14); sfx('uiClick', CAM.x, CAM.z, .7); return true; }
    deny(); return false;
  }
  // a brief full-screen colour wash (Permafrost)
  U.flash = (col, dur) => { U.flashFx = { col, t: 0, dur }; };
  U.offerResume = sv => { U.resumeOffer = sv; };
  const VIS_NAMES = { cinematic: ['HD', 'Crisp cinematic'], performance: ['FAST', 'Performance'], miniature: ['MINI', 'Classic miniature'] };
  function cycleVisuals() { const order = ['cinematic', 'performance', 'miniature'], next = order[(order.indexOf(R.mode) + 1) % order.length]; setVisualMode(next); U.banner('Visuals: ' + VIS_NAMES[next][1], 1.8, false); sfx('uiClick', CAM.x, CAM.z, .7); }
  function doSave() { touchInput(); const r = saveRunManual(); if (r) { U.banner(r.mid ? 'Saved: start of wave ' + r.wave : 'Run saved · wave ' + r.wave, 2, false); sfx('uiClick', CAM.x, CAM.z, .8); buzz(10); } else deny(); }
  // big numbers in the sheet: 12.4k, 3.1m
  const fmtN = n => n < 1000 ? '' + Math.round(n) : n < 1e6 ? (n / 1000).toFixed(n < 1e4 ? 1 : 0) + 'k' : (n / 1e6).toFixed(1) + 'm';
  // buy the next tier on path i; the sheet stays open so a second tier is one more tap
  function doUpgradePath(t, i) { touchInput(); if (t && upgradeTower(t, i, true)) { sfx('uiClick', t.x, t.z, .8); buzz(12); if (U.menu) U.menu.sellArm = false; return true; } deny(); return false; }
  // U, and the gamepad's X: the tower's leading path, or the other one if that is finished
  function doUpgrade(t) { if (!t) return false; const lead = t.paths[1] > t.paths[0] ? 1 : 0; return doUpgradePath(t, canUpgradePath(t, lead) ? lead : 1 - lead); }
  function doSell(t) { if (sellTower(t)) { U.menu = null; return true; } return false; }
  function cycleTarget(t) { if (!t || !t.alive || TOWER[t.kind].noAim) return; const i = TARGET_MODES.indexOf(t.targetMode); t.targetMode = TARGET_MODES[(i + 1) % TARGET_MODES.length]; sfx('uiHover', t.x, t.z, .8); buzz(6); }
  function pickKind(kind) {
    touchInput();
    if (U.menu && U.menu.pad && !U.menu.tower) { doBuild(U.menu.pad, kind); return; }
    U.armed = U.armed === kind ? null : kind; U.ghost = null; U.menu = null; sfx('uiHover', CAM.x, CAM.z, .7);
  }
  function pointerRay(mx, my) { const cam = R.cam; _o.set(mx / R.dw * 2 - 1, 1 - my / R.dh * 2, -1).unproject(cam); cam.getWorldDirection(_d); }
  // the ground point under the pointer: march down the view ray until it passes below the terrain, then refine
  function pickGround(mx, my) {
    if (!G.B || G.phase !== 'play' || !R.cam) return null;
    pointerRay(mx, my); const H = G.B.heightAt; if (_d.y > -.05) return null;
    let t = (10 - _o.y) / _d.y, prev = t; const tEnd = (-4 - _o.y) / _d.y, step = .12 / -_d.y;
    for (; t < tEnd; t += step) {
      const x = _o.x + _d.x * t, z = _o.z + _d.z * t;
      if (Math.abs(x) > BH || Math.abs(z) > BH) { prev = t; continue; }
      if (_o.y + _d.y * t <= H(x, z)) {
        let a = prev, b = t; for (let k = 0; k < 8; k++) { const m = (a + b) / 2, mx2 = _o.x + _d.x * m, mz2 = _o.z + _d.z * m; if (_o.y + _d.y * m <= H(mx2, mz2)) b = m; else a = m; }
        const xx = _o.x + _d.x * b, zz = _o.z + _d.z * b; return { x: xx, z: zz, y: H(xx, zz) };
      }
      prev = t;
    }
    return null;
  }
  // the tower under the pointer, tested as an upright column so its body and footing both count
  function pickTower(mx, my) {
    if (!G.B || G.phase !== 'play') return null;
    pointerRay(mx, my);
    let best = null, bd = 1e9; const slop = U.touch ? clamp(24 * (R.viewW || 40) / (R.cssW || 800), 1.4, 2.1) : 1.35;
    for (const tw of G.towers) {
      if (!tw.alive) continue; const top = Math.min(3.4, tw.mounts ? tw.mounts.top : 2);
      for (let h = 0; h <= top; h += .6) {
        const t = (tw.y + h - _o.y) / _d.y, x = _o.x + _d.x * t, z = _o.z + _d.z * t, d = Math.hypot(x - tw.x, z - tw.z), r = h === 0 ? slop : slop - .45;
        if (d < r && d + h * .01 < bd) { bd = d; best = tw; }
      }
    }
    return best ? { pad: best.pad, tower: best } : null;
  }
  function setGhost(x, z) { U.ghost = { x, z, y: G.B.heightAt(x, z), chk: canPlaceTower(x, z, U.armed) }; }
  U.placePreview = () => U.armed && U.ghost ? { x: U.ghost.x, y: U.ghost.chk.ok ? U.ghost.chk.y - .3 : U.ghost.y, z: U.ghost.z, ok: U.ghost.chk.ok && G.gold >= TOWER[U.armed].cost[0] } : null;
  function onTap(x, y, held) {
    const now = performance.now();
    const b = held && inRect(held, x, y, U.touch ? 44 : 8) ? held : btnAt(x, y); if (b) { if (!b.hud) touchInput(); b.fn(); return; }
    if (inRect(U.menuRect, x, y, 0) || U.ascend || G.phase === 'menu' || (G.phase === 'defeat' && G.runMode === 'player') || (G.paused && G.runMode === 'player')) return;
    if (U.armed) {
      U.lastTap.t = -9; const g = pickGround(x, y); if (!g) { disarm(); return; }
      if (!U.touch) { setGhost(g.x, g.z); placeArmed(U.shift); return; }
      // touch: the first tap shows the spot; a second tap on it (or the Build button) builds
      if (U.ghost && Math.hypot(g.x - U.ghost.x, g.z - U.ghost.z) < 1.4) { placeArmed(false); return; }
      setGhost(g.x, g.z); sfx('uiHover', g.x, g.z, .6); buzz(5); return;
    }
    const h = pickTower(x, y);
    if (h) {
      touchInput(); U.lastTap.t = -9;
      if (U.menu && U.menu.tower === h.tower) { U.menu = null; return; }
      U.menu = { pad: h.pad, tower: h.tower, t: 0, focus: 0, sel: null, sellArm: false }; sfx('uiHover', h.pad.x, h.pad.z, .9); buzz(6); return;
    }
    if (U.menu) { U.menu = null; U.lastTap.t = -9; return; }
    if (now - U.lastTap.t < 330 && Math.hypot(x - U.lastTap.x, y - U.lastTap.y) < 40 * (R.dpr || 1)) { U.lastTap.t = -9; if (CAM.man && CAM.mzoom > 1.3) camReset(); else camZoomTo(Math.max(1.9, (CAM.man ? CAM.mzoom : CAM.zoom) * 1.6), x, y); }
    else { U.lastTap.t = now; U.lastTap.x = x; U.lastTap.y = y; }
  }
  function setRing(mesh, cx, cz, radius, width) {
    const P = mesh.geometry.attributes.position, a = P.array, H = G.B.heightAt, n = mesh.seg;
    for (let i = 0; i <= n; i++) { const t = i / n * TAU, c = Math.cos(t), s = Math.sin(t); for (let k = 0; k < 2; k++) { const r = radius + (k ? width : 0), x = cx + c * r, z = cz + s * r, o = (i * 2 + k) * 3; a[o] = x; a[o + 1] = H(x, z) + .1; a[o + 2] = z; } }
    P.needsUpdate = true; mesh.visible = true;
  }
  // gamepad stops: every tower, plus a handful of good open spots the AI's grid suggests
  function gpTargets() {
    const B = G.B; if (!B.spots) buildSpots(B);
    const out = G.towers.filter(t => t.alive).map(t => ({ pad: t.pad, tower: t })), picked = [];
    for (const sp of B.spots.top.archer) {
      if (picked.length >= 14) break; if (towerAt(sp.x, sp.z)) continue;
      if (picked.some(q => Math.hypot(q.x - sp.x, q.z - sp.z) < 3.2) || out.some(o => Math.hypot(o.pad.x - sp.x, o.pad.z - sp.z) < 2.6)) continue;
      picked.push(sp);
    }
    for (const sp of picked) out.push({ pad: { x: sp.x, y: sp.y, z: sp.z, s: sp.s, face: sp.face, tower: null }, tower: null });
    return out;
  }
  function pollGamepad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : []; let gp = null; for (const p of pads) if (p && p.connected) { gp = p; break; }
    if (!gp || !G.B || G.phase !== 'play') return;
    const st = U.gp, b = i => !!(gp.buttons[i] && gp.buttons[i].pressed), was = i => !!st.prev[i], hit = i => b(i) && !was(i);
    let ax = (Math.abs(gp.axes[0]) > .5 ? Math.sign(gp.axes[0]) : 0) + (b(15) ? 1 : 0) - (b(14) ? 1 : 0), ay = (Math.abs(gp.axes[1]) > .5 ? Math.sign(gp.axes[1]) : 0) + (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
    st.t -= dt;
    if ((ax || ay) && st.t <= 0) {
      st.t = .22; st.active = true; touchInput(); audioGesture();
      if (U.menu) { const n = U.btns.length || 1; U.menu.focus = ((U.menu.focus + (ax || ay)) % n + n) % n; sfx('uiHover', CAM.x, CAM.z, .6); }
      else {
        const P = gpTargets(); if (!st.cur || !P.length) st.cur = P[0] || null;
        else {
          const cur = proj(st.cur.pad.x, st.cur.pad.y, st.cur.pad.z); let best = null, bs = 1e9;
          for (const p of P) { const q = proj(p.pad.x, p.pad.y, p.pad.z), dx = q.x - cur.x, dy = q.y - cur.y, along = dx * ax + dy * ay; if (along <= 4) continue; const off = Math.abs(-dx * ay + dy * ax), sc = along + off * 2.2; if (sc < bs) { bs = sc; best = p; } }
          if (best) st.cur = best;
        }
        sfx('uiHover', CAM.x, CAM.z, .6);
      }
    }
    if (!ax && !ay) st.t = 0;
    if (st.cur && st.cur.tower && !st.cur.tower.alive) st.cur = null;
    if (hit(0)) { touchInput(); audioGesture(); st.active = true; if (!st.cur) st.cur = gpTargets()[0] || null; if (U.menu) { const bt = U.btns[U.menu.focus]; if (bt) bt.fn(); } else if (st.cur) { const c = st.cur; U.menu = { pad: c.pad, tower: c.tower, t: 0, focus: 0, sel: null, sellArm: false }; sfx('uiHover', c.pad.x, c.pad.z, .9); } }
    if (hit(1)) { U.closeMenu(); U.ghost = null; touchInput(); }
    if (hit(2)) { if (st.cur && st.cur.tower) { touchInput(); doUpgrade(st.cur.tower); } }
    if (hit(3) || hit(9)) callWave();
    for (let i = 0; i < 16; i++) st.prev[i] = b(i);
  }

  function update(dt) {
    U.frameDt = clamp(dt, 0, .1); U.idle += dt; U.moved += dt; if (U.abToast) { U.abToast.t += dt; if (U.abToast.t > 1.8) U.abToast = null; } if (U.flashFx) { U.flashFx.t += dt; if (U.flashFx.t > U.flashFx.dur) U.flashFx = null; } U.cmdArm = Math.max(0, (U.cmdArm || 0) - dt); U.leaveArm = Math.max(0, (U.leaveArm || 0) - dt); U.hurt = Math.max(0, U.hurt - dt * 1.6); U.goldBump = Math.max(0, U.goldBump - dt * 5); U.deny = Math.max(0, U.deny - dt * 3); U.titleT += dt; U.slainBump = Math.max(0, U.slainBump - dt * 4);
    if (G.slain !== U.lastSlain) { U.lastSlain = G.slain; U.slainBump = 1; }
    { const dpr = R.dpr || 1, iw = n => PX.iconSize(n)[0], m3 = PX.measure('000'); let sc = Math.max(2, Math.round(clamp(Math.min(R.cssH / 430, R.cssW / 225), 1.6, 4) * dpr));
      let st = 4; for (const [ic, v] of [['flame', G.lives], ['coin', Math.floor(U.goldShown)], ['skull', G.slain]]) st += iw(ic) + 8 + Math.max(PX.measure('' + v), m3);
      const cm = Math.max(iw('helm') + 3 + PX.measure('AI commander'), PX.measure(U.touch ? 'Pick a tower to play' : 'Pick a tower to take over')) + 12, minS = Math.max(2, Math.ceil(1.3 * dpr));
      while (sc > minS && (st + cm + 13) * sc + R.safe[0] + R.safe[2] > R.dw) sc--;
      U.s = sc; }
    U.panning = !!(U.gest && U.gest.mode === 'pan');
    if (AU.ready && !U.ptrs.size) U.sndArmed = true;
    if (U.keys.size) { let kx = 0, ky = 0; for (const k of U.keys) { kx += PAN[k][0]; ky += PAN[k][1]; } if (kx || ky) { CAM.za = null; camPan(kx * R.dh * .9 * dt, ky * R.dh * .9 * dt); } }
    if (U.tip) { U.tip.t += dt; if (U.tip.t > 5.2) U.tip = null; } else if (U.tips.length && U.titleT > 7.5) U.tip = { type: U.tips.shift(), t: 0 };
    if (window.visualViewport && Math.abs(window.visualViewport.scale - 1) > .02) fixPageZoom();
    pollGamepad(dt);
    if (U.menu) { U.menu.t += dt; if ((U.menu.tower && !U.menu.tower.alive) || G.phase !== 'play') U.menu = null; else if (U.menu.pad.tower !== U.menu.tower) U.menu.tower = U.menu.pad.tower; }
    if (G.phase !== 'play') { U.armed = null; U.ghost = null; U.hover = null; }
    else {
      const mouse = U.inside && !U.touch && !U.hotBtn && !U.hudHot && !U.panning && !inRect(U.menuRect, U.mx, U.my, 0);
      U.hover = mouse && !U.armed ? pickTower(U.mx, U.my) : null;
      if (U.armed) {
        if (mouse) { const g = pickGround(U.mx, U.my); if (g) setGhost(g.x, g.z); else U.ghost = null; }
        else if (U.ghost) U.ghost.chk = canPlaceTower(U.ghost.x, U.ghost.z, U.armed);
      }
    }
    if (U.goldShown > G.gold) U.goldShown = G.gold;
    if (!U.coins.length && U.goldShown < G.gold) U.goldShown = Math.min(G.gold, U.goldShown + Math.max(1, (G.gold - U.goldShown) * 6 * dt));
    const gpT = U.gp.active && U.gp.cur && G.phase === 'play' ? U.gp.cur : null;
    const tgt = U.armed && U.ghost ? { pad: U.ghost, tower: null, place: true } : U.menu ? U.menu : gpT || U.hover;
    const amber = [1.5, 1.15, .6], green = [.55, 1.7, .75], red = [1.9, .42, .3];
    if (tgt && G.B && G.phase === 'play') {
      const pad = tgt.pad, pulse = .5 + .5 * Math.sin(G.t * 5);
      const good = !tgt.place || (U.ghost.chk.ok && G.gold >= TOWER[U.armed].cost[0]), col = tgt.place ? (good ? green : red) : amber;
      U.rangeMesh.material.color.setRGB(col[0], col[1], col[2]); U.padMesh.material.color.setRGB(col[0] * 1.4, col[1] * 1.4, col[2] * 1.4);
      setRing(U.padMesh, pad.x, pad.z, tgt.place ? FOOT_R : 1.4, .1); U.padMesh.material.opacity = .45 + .25 * pulse;
      let range = 0; if (tgt.tower) range = tgt.tower.range; else { const kind = U.armed || (U.menu && (U.menu.sel || (U.hotBtn && U.hotBtn.kind))) || (U.menu && U.btns[U.menu.focus] && U.gp.active && U.btns[U.menu.focus].kind) || 'archer'; range = TOWER[kind].range[0]; }
      setRing(U.rangeMesh, pad.x, pad.z, range, .07); U.rangeMesh.material.opacity = .34;
    } else { U.padMesh.visible = false; U.rangeMesh.visible = false; }
    R.canvas.style.cursor = U.panning ? 'grabbing' : U.armed && !U.hotBtn ? 'crosshair' : (U.hotBtn || U.hover || U.hudHot) ? 'pointer' : 'default';
  }

  function draw() {
    const c = U.ctx, s = U.s, W = R.dw, H = R.dh, pad = 5 * s, LH = PX.LINE * s;
    c.clearRect(0, 0, W, H); U.btns.length = 0; let hot = null;
    if (U.flashFx) { const f = U.flashFx, a = .32 * (1 - f.t / f.dur); c.fillStyle = `rgba(${Math.round(f.col[0] * 160)},${Math.round(f.col[1] * 160)},${Math.round(f.col[2] * 160)},${a.toFixed(3)})`; c.fillRect(0, 0, W, H); }
    const pix = Math.max(1, Math.round(R.dh / R.ih), Math.round(U.s / 1.5));
    for (const b of G.hbars) {
      const p = proj(b.x, b.y, b.z), w = (b.boss ? 34 : b.man ? 8 : 9) * pix, h = (b.boss ? 2 : 1) * pix, x = Math.round(p.x - w / 2), y = Math.round(p.y);
      if (x < -w || x > W || y < 0 || y > H) continue;
      c.globalAlpha = b.f >= .999 ? .4 : .95;
      c.fillStyle = COLR.dark; c.fillRect(x - pix, y - pix, w + 2 * pix, h + 2 * pix);
      c.fillStyle = b.man ? '#7fb6ea' : (b.f > .5 ? '#d9a13c' : b.f > .25 ? '#e0762c' : '#e04a32'); c.fillRect(x, y, Math.max(pix, Math.round(w * b.f)), h);
      c.globalAlpha = 1;
      if (b.boss) text(b.name, p.x, y - LH - 2 * pix, COLR.tx, { align: 'c', outline: COLR.dark });
    }
    const [iL, iT, iR, iB] = R.safe, Wr = W - iR, Hb = H - iB, tch = U.touch, mouse = U.inside && !tch && !U.panning;
    const over = (x, y, w, h) => mouse && U.mx >= x && U.mx <= x + w && U.my >= y && U.my <= y + h;
    // a large modal button for the menu, pause and defeat screens
    const mbtn = (x, y, w, h, id, fn, lbl, col, big, glow) => {
      const ov = over(x, y, w, h), down = U.press === id, dy = down ? s : 0; U.btns.push({ id, fn, x, y, w, h }); if (ov) hot = U.btns[U.btns.length - 1];
      plate(x, y + dy, w, h, { id, lit: ov || down || !!glow, bg: ov || down ? COLR.bg2 : COLR.bg, bd: big ? '#8a6a3a' : COLR.bd, hi: glow ? 'rgba(255,200,110,' + (.25 + .25 * Math.sin(G.t * 4)).toFixed(2) + ')' : null });
      const k2 = big ? s + 1 : s, f = str => { let t = str; while (t.length > 3 && PX.measure(t) * k2 > w - 8 * s) t = t.slice(0, -2) + '.'; return t; };
      PX.text(c, f(lbl), x + w / 2, y + dy + Math.round((h - PX.LINE * k2) / 2) + Math.round(k2 / 2), k2, col, { align: 'c' });
    };
    if (G.phase === 'menu') {
      // ---- the Start Menu, over a live, slowly orbiting view of the chosen land ----
      U.hud.length = 0; U.menuRect = null;
      { const nowMs = performance.now(); if (!U.menuSaveAt || nowMs - U.menuSaveAt > 500) { U.menuSave = loadRun(); U.menuSaveAt = nowMs; } }
      const tall = H > W * 1.05, mg = 8 * s + iL, cw0 = Wr - iL - 16 * s;
      const grad = c.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, 'rgba(3,4,8,0.55)'); grad.addColorStop(.35, 'rgba(3,4,8,0.05)'); grad.addColorStop(.62, 'rgba(3,4,8,0.15)'); grad.addColorStop(1, 'rgba(3,4,8,0.78)');
      c.fillStyle = grad; c.fillRect(0, 0, W, H);
      const kT = Math.max(2 * s, Math.min(4 * s, Math.floor(cw0 / (PX.measure('CINDERWATCH') + 4)))), yT = iT + Math.round(H * (tall ? .06 : .07));
      PX.text(c, 'CINDERWATCH', W / 2 + kT, yT + kT, kT, 'rgba(0,0,0,0.6)', { align: 'c' }); PX.text(c, 'CINDERWATCH', W / 2, yT, kT, COLR.amber, { align: 'c' });
      text('Hold the beacon. Choose your pass.', W / 2, yT + PX.LINE * kT + 4 * s, COLR.tx, { align: 'c', outline: COLR.dark });
      // buttons, from the bottom up
      const bh = (tch ? 30 : 22) * s, bw = Math.min(cw0, 190 * s), bx = Math.round(W / 2 - bw / 2), sv = U.menuSave;
      // credit to the original game, at the very bottom; tapping it opens the original repository
      { const cr = 'Original Cinderwatch by Kevin Ngo', cw2 = tw(cr) + 12 * s, cx = Math.round(W / 2 - cw2 / 2), cy = Hb - 4 * s - LH - 2 * s, ov = over(cx, cy, cw2, LH + 4 * s);
        U.btns.push({ id: 'credit', fn: () => { try { window.open('https://github.com/kevintngo/cinderwatch', '_blank', 'noopener'); } catch (e) {} }, x: cx, y: cy, w: cw2, h: LH + 4 * s });
        text(cr, W / 2, cy + 2 * s, ov ? COLR.amber : COLR.dim, { align: 'c', outline: COLR.dark }); }
      let y = Hb - 8 * s - LH - 4 * s - LH - 6 * s;
      mbtn(Math.round(W / 2 - 60 * s), y, 120 * s, LH + 4 * s, 'demo', () => { startDemo(); sfx('uiClick', CAM.x, CAM.z, .7); }, 'Watch AI Demo', COLR.dim, false);
      y -= bh + 6 * s;
      if (sv) { mbtn(bx, y, bw, bh, 'mresume', () => { audioGesture(); U.menuSave = null; restoreRun(sv); sfx('uiClick', CAM.x, CAM.z, .9); }, 'Resume Run (Wave ' + resumeWave(sv) + ' · ' + saveLand(sv).name + ')', COLR.amber, false, false); y -= bh + 4 * s; }
      mbtn(bx, y, bw, bh + 4 * s, 'defend', () => { audioGesture(); startPlayerRun(G.menuBiome); sfx('uiClick', CAM.x, CAM.z, .9); }, 'Defend Pass', COLR.amber, true, true);
      const yBtnTop = y;
      // the five lands
      const lands = BIOMES.map((b, i) => ({ i, b, boss: [...new Set(b.boss)].map(k => MON[k].name).join(' / '), best: landBest(b.key) }));
      if (tall) {
        const rh = LH * 2 + 10 * s, gap = 3 * s, tot = lands.length * rh + (lands.length - 1) * gap; let ly = yBtnTop - 8 * s - tot;
        for (const L of lands) {
          const sel = L.i === G.menuBiome, id = 'land' + L.i, ov = over(mg, ly, cw0, rh);
          U.btns.push({ id, fn: () => { menuSelect(L.i); sfx('uiHover', CAM.x, CAM.z, .8); }, x: mg, y: ly, w: cw0, h: rh });
          plate(mg, ly, cw0, rh, { id, lit: sel || ov, bg: sel ? COLR.bg2 : COLR.bg }); c.fillStyle = LAND_ACCENT[L.b.key]; c.fillRect(mg + 2 * s, ly + 2 * s, 2 * s, rh - 4 * s);
          text(L.b.name, mg + 8 * s, ly + 4 * s, sel ? COLR.amber : COLR.tx); text(L.boss, mg + 8 * s, ly + 4 * s + LH + 2 * s, COLR.dim);
          const bt = L.best ? 'Best: wave ' + L.best : 'Not yet held'; text(bt, mg + cw0 - 6 * s - tw(bt), ly + 4 * s, L.best ? COLR.ok : COLR.dim);
          ly += rh + gap;
        }
      } else {
        const gap = 4 * s, cw = Math.min(Math.floor((cw0 - gap * 4) / 5), 120 * s), ch = LH * 3 + 18 * s, tot = cw * 5 + gap * 4; let lx = Math.round(W / 2 - tot / 2); const ly = yBtnTop - 10 * s - ch;
        const fit = (str, w) => { let t = str; while (t.length > 3 && tw(t) > w) t = t.slice(0, -2) + '.'; return t; };
        for (const L of lands) {
          const sel = L.i === G.menuBiome, id = 'land' + L.i, ov = over(lx, ly, cw, ch), lift = Math.round(ease('lift' + L.i, sel ? 1 : 0) * 4 * s), yy = ly - lift;
          U.btns.push({ id, fn: () => { menuSelect(L.i); sfx('uiHover', CAM.x, CAM.z, .8); }, x: lx, y: yy, w: cw, h: ch });
          plate(lx, yy, cw, ch, { id, lit: sel || ov, bg: sel ? COLR.bg2 : COLR.bg }); c.fillStyle = LAND_ACCENT[L.b.key]; c.fillRect(lx + 2 * s, yy + 2 * s, cw - 4 * s, 2 * s);
          text(fit(L.b.name, cw - 10 * s), lx + 5 * s, yy + 7 * s, sel ? COLR.amber : COLR.tx); text(fit(L.boss, cw - 10 * s), lx + 5 * s, yy + 7 * s + LH + 2 * s, COLR.dim);
          const bt = L.best ? 'Best ' + L.best : 'Not yet held'; text(fit(bt, cw - 10 * s), lx + 5 * s, yy + 7 * s + LH * 2 + 4 * s, L.best ? COLR.ok : COLR.dim);
          lx += cw + gap;
        }
      }
      if (R.fade < .7) text('Raising ' + BIOMES[G.menuBiome].name + '...', W / 2, Math.round(H * .4), COLR.amber, { align: 'c', outline: COLR.dark });
      // sound and look, in the corner
      const sz = Math.max(18 * s, LH + 8 * s), sy = iT + 6 * s, on = AU.ready && !AU.muted;
      mbtn(Wr - 6 * s - sz * 2 - 3 * s, sy, sz, sz, 'msound', () => { if (AU.ready) setMute(!AU.muted); }, on ? 'On' : 'Off', on ? COLR.tx : COLR.dim, false);
      mbtn(Wr - 6 * s - sz, sy, sz, sz, 'mvis', cycleVisuals, VIS_NAMES[R.mode][0], COLR.tx, false);
      if (hot !== U.hotBtn && hot) sfx('uiHover', CAM.x, CAM.z, .5);
      U.hotBtn = hot; return;
    }
    const stats = [['flame', '' + G.lives, U.hurt > 0 ? COLR.red : COLR.tx], ['coin', '' + Math.floor(U.goldShown), U.deny > 0 ? COLR.red : (U.goldBump > 0 ? '#ffe2a0' : COLR.tx)], ['skull', '' + G.slain, U.slainBump > .5 ? '#ffffff' : COLR.tx]];
    let wS = pad; for (const st of stats) wS += PX.iconSize(st[0])[0] * s + 2 * s + Math.max(tw(st[1]), tw('000')) + 6 * s; wS += pad - 6 * s;
    const hS = 10 * s + pad * 2 - 2 * s, x0 = 5 * s + iL, y0 = 5 * s + iT + U.insetTop;
    plate(x0, y0, wS, hS, U.hurt > 0 ? { bd: COLR.red } : {});
    let x = x0 + pad; const goldPos = { x: 0, y: 0 };
    for (const st of stats) {
      const [iw, ih] = PX.iconSize(st[0]); const iy = y0 + Math.round((hS - ih * s) / 2);
      PX.icon(c, st[0], x, iy, s, st[0] === 'flame' ? .55 + .45 * (G.lives / G.maxLives) : 1); if (st[0] === 'coin') { goldPos.x = x + iw * s / 2; goldPos.y = iy + ih * s / 2; }
      x += iw * s + 2 * s; text(st[1], x, y0 + Math.round((hS - LH) / 2) + s, st[2]); x += Math.max(tw(st[1]), tw('000')) + 6 * s;
    }
    const wn = 'Wave ' + Math.max(1, waveNumber()) + (G.endless && G.phase === 'play' ? ' · Endless' : ''), callable = G.phase === 'play' && !G.spawning && !G.bossWave && G.nextIn > .4;
    let sub, frac = -1;
    if (G.phase === 'play' && G.prep) sub = 'Prepare your defense';
    else if (G.phase === 'play' && G.choice) sub = 'Boss defeated · choose';
    else if (G.phase === 'play') { if (!G.spawning && !G.bossWave && G.nextIn > 0) { sub = callable && (tch || over(U.waveRect ? U.waveRect.x : -1, U.waveRect ? U.waveRect.y : -1, U.waveRect ? U.waveRect.w : 0, U.waveRect ? U.waveRect.h : 0)) ? (tch ? 'Tap to call · +' : 'Call now · +') + Math.round(G.nextIn * 3) : 'Next wave in ' + Math.ceil(G.nextIn); frac = 1 - G.nextIn / 6.5; } else { const n = G.mons.length + G.queue.length; sub = n + ' on the road'; } }
    else sub = G.phase === 'defeat' ? 'The fire has died' : G.phase === 'clear' ? 'Boss defeated' : 'A new pass awaits';
    const bw = PX.iconSize('banner')[0] * s, wW = Math.max(bw + 3 * s + tw(wn), tw(sub), tw('Next wave in 0'), tw('Tap to call · +00')) + pad * 2 + 4 * s, hW = LH * 2 + pad * 2 + s;
    const you = U.playerActive(), ct = you ? 'You command' : 'AI commander', cs = tch ? (you ? (U.cmdArm > 0 ? 'Tap again for the AI' : 'Tap for the AI') : 'Pick a tower to play') : (you ? 'Click here for the AI' : 'Pick a tower to take over');
    const ic = you ? 'hand' : 'helm', icw = PX.iconSize(ic)[0] * s, cW = Math.max(icw + 3 * s + tw(ct), tw(cs)) + pad * 2 + 2 * s, xc = Wr - cW - 5 * s, g3 = 3 * s;
    const xw = Math.round(W / 2 - wW / 2);
    let yc = y0, yw = y0;
    if (xc < x0 + wS + g3) yc = y0 + hS + g3;
    if (xw < x0 + wS + g3 || (yc === y0 && xw + wW > xc - g3) || yc !== y0) yw = Math.max(y0 + hS, yc + (yc === y0 || xw + wW > xc - g3 ? hW : 0)) + g3;
    const topH = Math.max(y0 + hS, yc + hW, yw + hW) - y0; R.hudTop = y0 + topH;
    U.hud.length = 0; U.hudHot = false; U.prepBot = 0;
    const hotW = callable && over(xw, yw, wW, hW); U.waveRect = callable ? { id: 'wave', x: xw, y: yw, w: wW, h: hW, hot: hotW, fn: callWave, hud: true } : null; if (callable) U.hud.push(U.waveRect); if (hotW) U.hudHot = true;
    plate(xw, yw, wW, hW, hotW ? { bd: COLR.bdHi, bg: COLR.bg2 } : callable && tch ? { bd: '#8a6a3a' } : {});
    const tx0 = Math.round(W / 2 - (bw + 3 * s + tw(wn)) / 2);
    PX.icon(c, 'banner', tx0, yw + pad - s, s); text(wn, tx0 + bw + 3 * s, yw + pad, COLR.amber);
    text(sub, W / 2, yw + pad + LH + s, callable && (tch || hotW) ? COLR.tx : COLR.dim, { align: 'c' });
    if (frac >= 0) { c.fillStyle = '#2a2620'; c.fillRect(xw + 3 * s, yw + hW - 3 * s, wW - 6 * s, s); c.fillStyle = COLR.amber; c.fillRect(xw + 3 * s, yw + hW - 3 * s, Math.round((wW - 6 * s) * sat(frac)), s); }
    // Endless: the choice after a boss, or the way out to the next land
    {
      const hb = (tch ? 24 : 15) * s, by0 = Math.round((hb - LH) / 2), yE = yw + hW + g3;
      const hudBtn = (id, x, y, w, fn, lbl, col, hint) => {
        const hot = over(x, y, w, hb), down = U.press === id, dy = down ? s : 0; U.hud.push({ id, x, y, w, h: hb, fn, hud: true }); if (hot) U.hudHot = true;
        plate(x, y + dy, w, hb, { id, lit: hot || down, bd: '#8a6a3a', bg: hot || down ? COLR.bg2 : COLR.bg });
        text(lbl, x + pad, y + by0 + dy, col); if (hint && !tch) text(hint, x + w - pad - tw(hint), y + by0 + dy, COLR.dim);
      };
      if (G.phase === 'play' && G.prep) {
        const lbl = 'Start Wave ' + prepWave(), k2 = s + 1, bH = (tch ? 30 : 22) * s, bW = Math.min(Wr - iL - 16 * s, Math.max(PX.measure(lbl) * k2 + pad * 4, 120 * s));
        const bx = Math.round(W / 2 - bW / 2), hot = over(bx, yE, bW, bH), down = U.press === 'prepgo', dy = down ? s : 0, pulse = .5 + .5 * Math.sin(G.t * 3.2);
        U.hud.push({ id: 'prepgo', x: bx, y: yE, w: bW, h: bH, fn: startPrep, hud: true }); if (hot) U.hudHot = true;
        // a soft amber glow behind the button, so it reads as the thing to press
        c.fillStyle = 'rgba(232,176,74,' + (.08 + .1 * pulse).toFixed(3) + ')'; c.fillRect(bx - 3 * s, yE - 3 * s + dy, bW + 6 * s, bH + 6 * s);
        plate(bx, yE + dy, bW, bH, { id: 'prepgo', lit: true, bd: COLR.bdHi, bg: hot || down ? COLR.bg2 : COLR.bg, hi: 'rgba(255,214,140,' + (.25 + .3 * pulse).toFixed(2) + ')' });
        PX.text(c, lbl, W / 2, yE + dy + Math.round((bH - PX.LINE * k2) / 2) + Math.round(k2 / 2), k2, hot || down ? '#ffe2a0' : COLR.amber, { align: 'c' });
        const h1 = 'Place your opening defense', h2 = tch ? 'then tap Start Wave ' + prepWave() : 'press Space or click Start Wave ' + prepWave(), one = h1 + ' · ' + h2;
        const nL = prepFullRefund() ? (tw(one) <= Wr - iL - 16 * s ? 2 : 3) : 1; U.prepBot = yE + bH + 6 * s + LH * nL;
        if (prepFullRefund()) { const h3 = 'Selling refunds 100% until the wave starts'; if (tw(one) <= Wr - iL - 16 * s) { text(one, W / 2, yE + bH + 5 * s, COLR.tx, { align: 'c', outline: COLR.dark }); text(h3, W / 2, yE + bH + 6 * s + LH, COLR.dim, { align: 'c', outline: COLR.dark }); }
          else { text(h1, W / 2, yE + bH + 5 * s, COLR.tx, { align: 'c', outline: COLR.dark }); text(h2, W / 2, yE + bH + 6 * s + LH, COLR.tx, { align: 'c', outline: COLR.dark }); text(h3, W / 2, yE + bH + 7 * s + LH * 2, COLR.dim, { align: 'c', outline: COLR.dark }); } }
        else text(tch ? 'Tap when you are ready' : 'Press Space when you are ready', W / 2, yE + bH + 5 * s, COLR.dim, { align: 'c', outline: COLR.dark });
      } else if (G.phase === 'play' && G.choice) {
        const l1 = 'Hold this pass · Endless', l2 = 'March to next land', bW = Math.max(tw(l1), tw(l2)) + pad * 2 + (tch ? 0 : tw('E') + 6 * s);
        const side = 2 * bW + g3 + pad * 2 <= Wr - iL - 10 * s, pW = side ? 2 * bW + g3 + pad * 2 : bW + pad * 2, pH = pad * 2 + LH + 3 * s + (side ? hb : hb * 2 + g3);
        const xp = Math.round(W / 2 - pW / 2); plate(xp, yE, pW, pH, { bd: COLR.bdHi });
        text('The pass holds. What now?', W / 2, yE + pad - s, COLR.amber, { align: 'c' });
        const yb = yE + pad + LH + 3 * s;
        hudBtn('hold', xp + pad, yb, bW, () => { if (holdPass()) sfx('uiClick', CAM.x, CAM.z, .8); }, l1, COLR.tx, 'E');
        hudBtn('march', side ? xp + pad + bW + g3 : xp + pad, side ? yb : yb + hb + g3, bW, () => { if (marchOn()) sfx('uiClick', CAM.x, CAM.z, .8); }, l2, COLR.tx, 'N');
      } else if (U.resumeOffer && G.phase === 'play') {
        // a saved run: resume it, or carry on with a new one (the save stays until a new run's autosave replaces it)
        const sv = U.resumeOffer, l1 = 'Resume wave ' + resumeWave(sv), l2 = 'New run', head = (sv.endless ? 'Endless run' : 'Saved run') + ' · ' + saveLand(sv).name;
        const bW = Math.max(tw(l1), tw(l2)) + pad * 2, side = 2 * bW + g3 + pad * 2 <= Wr - iL - 10 * s, pW = Math.max(side ? 2 * bW + g3 + pad * 2 : bW + pad * 2, tw(head) + pad * 2), pH = pad * 2 + LH + 3 * s + (side ? hb : hb * 2 + g3);
        const xp = Math.round(W / 2 - pW / 2); plate(xp, yE, pW, pH, { bd: COLR.bdHi });
        text(head, W / 2, yE + pad - s, COLR.amber, { align: 'c' });
        const yb = yE + pad + LH + 3 * s, bx0 = Math.round(W / 2 - (side ? 2 * bW + g3 : bW) / 2);
        hudBtn('resume', bx0, yb, bW, () => { const s2 = U.resumeOffer; U.resumeOffer = null; audioGesture(); restoreRun(s2); sfx('uiClick', CAM.x, CAM.z, .9); }, l1, COLR.amber, null);
        hudBtn('newrun', side ? bx0 + bW + g3 : bx0, side ? yb : yb + hb + g3, bW, () => { U.resumeOffer = null; sfx('uiHover', CAM.x, CAM.z, .6); }, l2, COLR.tx, null);
      } else if (canLeaveEndless()) {
        const l = U.leaveArm > 0 ? 'Tap again to leave' : 'Next land', bW = tw(l) + pad * 2 + (tch ? 0 : tw('N') + 6 * s);
        hudBtn('leave', Math.round(W / 2 - bW / 2), yE, bW, leaveTap, l, U.leaveArm > 0 ? COLR.ember : COLR.tx, 'N');
      }
    }
    const hotC = over(xc, yc, cW, hW); U.cmdRect = { id: 'cmd', x: xc, y: yc, w: cW, h: hW, hot: hotC, fn: commandTap, hud: true }; U.hud.push(U.cmdRect); if (hotC) U.hudHot = true;
    plate(xc, yc, cW, hW, hotC ? { bd: COLR.bdHi, bg: COLR.bg2 } : you ? { bd: COLR.bdHi } : {});
    PX.icon(c, ic, xc + pad, yc + pad - s, s); text(ct, xc + pad + icw + 3 * s, yc + pad, you ? COLR.amber : COLR.tx); text(cs, xc + pad, yc + pad + LH + s, COLR.dim);
    // the bottom row fits itself: on a narrow phone it first drops the full-screen button, then narrows the buttons
    const dpr = R.dpr || 1, hB = LH + pad * 2 - s, nLeft = 4 + (U.manual && G.phase === 'play' ? 1 : 0);
    let nR0 = fullscreenOK() && tch ? 3 : 2, zb = tch ? Math.max(22 * s, Math.round(40 * dpr)) : hB;
    const rowW = n => (nLeft + n) * zb + (nLeft + n - 1) * g3 + 18 * s + iL + iR;
    if (tch && rowW(nR0) > W && nR0 === 3) nR0 = 2;
    if (tch && rowW(nR0) > W) zb = Math.floor((W - 18 * s - iL - iR - (nLeft + nR0 - 1) * g3) / (nLeft + nR0));
    const yB = Hb - zb - 5 * s; let tipB = null;
    const sq = (id, x, w, fn, tip, icon, on) => {
      const r = { id, x, y: yB, w, h: zb, fn, hud: true }, hot = over(x, yB, w, zb), down = U.press === id, dy = down ? s : 0; U.hud.push(r); if (hot) { U.hudHot = true; tipB = { x: x + w / 2, tip }; }
      plate(x, yB + dy, w, zb, { id, lit: hot || down, bd: on ? '#8a6a3a' : COLR.bd, bg: hot || down ? COLR.bg2 : COLR.bg }); icon(x, yB + dy, hot || down); return r;
    };
    const glyph = (g, col) => (x, y) => { const k = Math.max(s, Math.floor(zb / 10)); PX.text(c, g, x + zb / 2, y + Math.round(zb / 2 - 3.5 * k), k, col, { align: 'c' }); };
    const label = (t, col) => (x, y) => { const k = Math.max(s, Math.floor(zb / 15)); PX.text(c, t, x + zb / 2, y + Math.round((zb - PX.LINE * k) / 2) + k, k, col, { align: 'c' }); };
    const bars = (x, y) => { const u = zb / 18; c.fillStyle = COLR.tx; if (G.paused) { for (let i = 0; i < 4; i++) c.fillRect(Math.round(x + (6.5 + i * 1.5) * u), Math.round(y + (5 + i) * u), Math.ceil(1.5 * u), Math.round((8 - 2 * i) * u)); } else { c.fillRect(Math.round(x + 6 * u), Math.round(y + 5 * u), Math.round(2.2 * u), Math.round(8 * u)); c.fillRect(Math.round(x + 9.8 * u), Math.round(y + 5 * u), Math.round(2.2 * u), Math.round(8 * u)); } };
    const corners = (x, y) => { const u = Math.round(zb / 9), q = Math.round(zb / 5), f = isFull(); c.fillStyle = COLR.tx; for (const [ax, ay] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const cx = x + (ax ? zb - q - u : q), cy = y + (ay ? zb - q - u : q), ix = f ? (ax ? -1 : 1) : (ax ? 1 : -1), iy = f ? (ay ? -1 : 1) : (ay ? 1 : -1); c.fillRect(cx, cy, u, u); c.fillRect(cx - ix * u, cy, u, u); c.fillRect(cx, cy - iy * u, u, u); } };
    const play = G.phase === 'play' || G.phase === 'defeat', nR = nR0, rightW = nR * zb + (nR - 1) * g3;
    let xl = 5 * s + iL;
    sq('pause', xl, zb, togglePause, G.paused ? 'Resume (P)' : 'Pause (P)', bars, G.paused); xl += zb + g3;
    sq('speed', xl, zb, cycleSpeed, 'Speed (Tab)', label(G.speed + 'x', G.speed > 1 ? COLR.amber : COLR.tx), G.speed > 1); xl += zb + g3;
    { const vl = VIS_NAMES[R.mode][0], k2 = Math.max(s, Math.floor(zb / 15)), vw = Math.max(zb, PX.measure(vl) * k2 + pad * 2);
      sq('vis', xl, vw, cycleVisuals, 'Visuals: ' + VIS_NAMES[R.mode][1] + ' (V)', (x, y, hot) => PX.text(c, vl, x + vw / 2, y + Math.round((zb - PX.LINE * k2) / 2) + k2, k2, hot ? COLR.amber : COLR.tx, { align: 'c' }), R.mode !== 'cinematic'); xl += vw + g3; }
    { const on = AU.ready && !AU.muted, icn = on ? 'sound' : 'mute', k = Math.max(s, Math.floor(zb / 14)), [iw2, ih2] = PX.iconSize(icn), lbl = tch ? 'Tap for sound' : 'Click for sound', wl = iw2 * s + 3 * s + tw(lbl) + pad * 2;
      const wide = !AU.ready && xl + wl + g3 + rightW + 5 * s + iR <= W;
      U.soundRect = sq('sound', xl, wide ? wl : zb, soundTap, AU.ready ? (AU.muted ? 'Sound is off (M)' : 'Sound is on (M)') : 'Sound', (x, y) => { if (wide) { PX.icon(c, icn, x + pad, y + Math.round((zb - ih2 * s) / 2), s, .85); text(lbl, x + pad + iw2 * s + 3 * s, y + Math.round((zb - LH) / 2) + s, COLR.tx); } else PX.icon(c, icn, x + Math.round((zb - iw2 * k) / 2), y + Math.round((zb - ih2 * k) / 2), k, AU.ready ? 1 : .8); }, !AU.ready);
      xl += (wide ? wl : zb) + g3; }
    if (U.manual && G.phase === 'play') {
      // a floppy-disk glyph
      const disk = (x, y, hot) => { const u = zb / 18; c.fillStyle = hot ? COLR.amber : COLR.tx; c.fillRect(Math.round(x + 5 * u), Math.round(y + 5 * u), Math.round(8 * u), Math.round(8 * u)); c.fillStyle = COLR.bg; c.fillRect(Math.round(x + 7 * u), Math.round(y + 5 * u), Math.round(4 * u), Math.round(3 * u)); c.fillRect(Math.round(x + 6.5 * u), Math.round(y + 9.5 * u), Math.round(5 * u), Math.round(2.5 * u)); };
      sq('save', xl, zb, doSave, 'Save run', disk, false); xl += zb + g3;
    }
    let xr = Wr - 5 * s - zb; const cur = camZoomNow();
    if (nR === 3) { sq('full', xr, zb, toggleFull, 'Full screen', corners, false); xr -= zb + g3; }
    sq('zin', xr, zb, () => camZoomBy(1.5), 'Zoom in (+)', glyph('+', cur < 2.99 ? COLR.tx : '#5a5448'), false); xr -= zb + g3;
    sq('zout', xr, zb, () => camZoomBy(1 / 1.5), 'Zoom out (-)', glyph('-', cur > camZoomMin() + .01 ? COLR.tx : '#5a5448'), false);
    let yUp = yB - g3;
    if (CAM.man && play) {
      const lbl = 'Follow the fight', w = tw(lbl) + pad * 2, fits = xr - g3 - w >= xl, xf2 = fits ? xr - g3 - w : Wr - w - 5 * s, yf = fits ? yB + Math.round((zb - hB) / 2) : yB - g3 - hB, hotF = over(xf2, yf, w, hB);
      plate(xf2, yf, w, hB, hotF ? { bd: COLR.bdHi, bg: COLR.bg2 } : { bd: '#8a6a3a' }); text(lbl, xf2 + pad, yf + pad - s, COLR.tx);
      U.followRect = { id: 'follow', x: xf2, y: yf, w, h: hB, hot: hotF, fn: () => { camReset(); sfx('uiClick', CAM.x, CAM.z, .6); }, hud: true }; U.hud.push(U.followRect); if (hotF) U.hudHot = true; if (!fits) yUp = yf - g3;
    } else U.followRect = null;
    // the build bar: pick a tower, then place it on open ground
    let barAbove = false, barTop = yB;
    if (G.phase === 'play') {
      const kinds = TOWER_KINDS, wide = kinds.map(k => { const d = TOWER[k], [iw, ih] = PX.iconSize(d.icon); return { k, d, iw: iw * s, ih: ih * s, w: iw * s + 3 * s + tw('' + d.cost[0]) + pad * 2 }; });
      const wideH = Math.max(zb, Math.max(...wide.map(c => c.ih)) + 6 * s), wideW = wide.reduce((a, c) => a + c.w, 0) + g3 * (wide.length - 1);
      const right = U.followRect && U.followRect.y >= yB ? U.followRect.x : xr;
      let cells, cellH, rowsOf;
      if (!tch && xl + g3 + wideW + g3 <= right) { cells = wide; cellH = wideH; rowsOf = [cells]; }
      else {
        // compact: the icon over its cost, sized for a thumb on touch
        const cw = Math.max(...wide.map(c => Math.max(c.iw, tw('' + c.d.cost[0])))) + pad * 2, ch = Math.max(tch ? Math.round(44 * dpr) : 0, Math.max(...wide.map(c => c.ih)) + LH + 7 * s);
        cells = wide.map(c => Object.assign({}, c, { w: Math.max(cw, tch ? Math.round(44 * dpr) : 0), compact: true })); cellH = ch;
        const avail = Wr - iL - 10 * s, perRow = Math.max(1, Math.floor((avail + g3) / (cells[0].w + g3)));
        rowsOf = []; for (let i = 0; i < cells.length; i += perRow) rowsOf.push(cells.slice(i, i + perRow));
        if (rowsOf.length > 1) { const half = Math.ceil(cells.length / 2); rowsOf = [cells.slice(0, half), cells.slice(half)]; }
      }
      const inRow = rowsOf.length === 1 && !cells[0].compact;
      let by = inRow ? yB + zb - cellH : yUp - rowsOf.length * cellH - (rowsOf.length - 1) * g3;
      if (!inRow) { barAbove = true; yUp = by - g3; }
      barTop = by; let i = 0;
      for (const row of rowsOf) {
        const rw = row.reduce((a, c) => a + c.w, 0) + g3 * (row.length - 1);
        let bx = inRow ? clamp(Math.round(W / 2 - rw / 2), xl + g3, right - g3 - rw) : Math.round(iL + (Wr - iL) / 2 - rw / 2);
        for (const cl of row) {
          const n = ++i, can = G.gold >= cl.d.cost[0], on = U.armed === cl.k, id = 'bar' + cl.k, hotb = over(bx, by, cl.w, cellH), down = U.press === id, dy = down ? s : 0;
          U.hud.push({ id, x: bx, y: by, w: cl.w, h: cellH, fn: () => { audioGesture(); pickKind(cl.k); }, hud: true }); if (hotb) { U.hudHot = true; tipB = { x: bx + cl.w / 2, tip: cl.d.name + (tch ? '' : ' (' + n + ')') }; }
          plate(bx, by + dy, cl.w, cellH, { id, lit: on || hotb || down, bg: on || hotb || down ? COLR.bg2 : COLR.bg, hi: on ? 'rgba(232,176,74,0.3)' : null });
          const ccol = can ? (on ? COLR.amber : COLR.tx) : COLR.red;
          if (cl.compact) { PX.icon(c, cl.d.icon, bx + Math.round((cl.w - cl.iw) / 2), by + dy + 3 * s, s, can ? 1 : .45); text('' + cl.d.cost[0], bx + cl.w / 2, by + dy + cellH - LH - 2 * s, ccol, { align: 'c' }); }
          else { PX.icon(c, cl.d.icon, bx + pad, by + dy + Math.round((cellH - cl.ih) / 2), s, can ? 1 : .45); text('' + cl.d.cost[0], bx + pad + cl.iw + 3 * s, by + dy + Math.round((cellH - LH) / 2) + s, ccol); }
          bx += cl.w + g3;
        }
        by += cellH + g3;
      }
    }
    // the ability bar: one slot per tier-3 ability you own, at the left above the build bar (or the bottom row)
    let dockTop = barTop;
    const abSlots = G.phase === 'play' ? abilitySlots() : [];
    if (abSlots.length) {
      const sz = tch ? Math.max(zb, Math.round(40 * dpr)) : Math.max(zb, 24 * s), base = barAbove ? barTop : yB, perRow = Math.max(1, Math.floor((Wr - iL - 10 * s + g3) / (sz + g3))), rows = Math.ceil(abSlots.length / perRow);
      const ay0 = base - g3 - rows * sz - (rows - 1) * g3; U.abKeys = abSlots.map(sl => sl.key);
      abSlots.forEach((sl, si) => {
        const ax = 5 * s + iL + (si % perRow) * (sz + g3), ay = ay0 + Math.floor(si / perRow) * (sz + g3);
        const A = ABILITY[sl.key], d = TOWER[A.kind], id = 'ab' + sl.key, hotA = over(ax, ay, sz, sz), down = U.press === id, dy = down ? s : 0, col = A.path === 2 ? COLR.amber : A.path ? COLR.cold : COLR.ember, ready = sl.ready > 0;
        U.hud.push({ id, x: ax, y: ay, w: sz, h: sz, fn: () => fireAbility(sl.key), hud: true });
        if (hotA) { U.hudHot = true; tipB = { x: ax + sz / 2, tip: A.name + (tch || si > 8 ? '' : ' (Shift+' + (si + 1) + ')') }; }
        const pulse = ready ? .5 + .5 * Math.sin(G.t * 5) : 0;
        plate(ax, ay + dy, sz, sz, { id, lit: hotA || down, bd: ready ? col : '#3a342c', bg: hotA || down ? COLR.bg2 : COLR.bg, hi: ready ? 'rgba(232,176,74,' + (.12 + .18 * pulse).toFixed(2) + ')' : null });
        const [iw, ih] = PX.iconSize(d.icon), k = Math.max(s, Math.floor(sz * .5 / Math.max(iw, ih)));
        PX.icon(c, d.icon, ax + Math.round((sz - iw * k) / 2), ay + dy + Math.round((sz - ih * k) / 2) - s, k, ready ? 1 : .4);
        c.fillStyle = col; c.fillRect(ax + 3 * s, ay + dy + sz - 4 * s, sz - 6 * s, s);
        if (!ready) {
          // cooldown sweep: the dark wedge shrinks as the shortest cooldown runs down
          const cx = ax + sz / 2, cy = ay + dy + sz / 2, r = sz / 2 - 2 * s;
          c.fillStyle = 'rgba(4,5,9,0.62)'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * (sl.capped ? 1 : sl.frac), false); c.closePath(); c.fill();
          text(sl.capped ? 'max' : '' + Math.ceil(sl.wait), cx, cy - Math.round(LH / 2) + s, sl.capped ? COLR.red : COLR.tx, { align: 'c', outline: COLR.dark });
        }
        if (sl.ready > 1) { const bt = 'x' + sl.ready, bw = tw(bt) + 3 * s; c.fillStyle = COLR.dark; c.fillRect(ax + sz - bw - s, ay + dy + s, bw, LH + s); text(bt, ax + sz - bw + s, ay + dy + 2 * s, COLR.amber); }
      });
      const ay = ay0; dockTop = ay; yUp = Math.min(yUp, ay - g3);
      if (U.abToast) { const a2 = sat(Math.min(U.abToast.t * 6, (1.8 - U.abToast.t) * 3)), l = U.abToast.text, w = tw(l) + pad * 2; c.globalAlpha = a2; plate(5 * s + iL, ay - g3 - hB, w, hB, { bd: COLR.bdHi }); text(l, 5 * s + iL + pad, ay - g3 - hB + pad - s, COLR.amber); c.globalAlpha = 1; }
    }
    if (tipB && !tch) { const ty = barAbove ? barTop - g3 - hB : yB - g3 - hB, w = tw(tipB.tip) + pad * 2, x = clamp(Math.round(tipB.x - w / 2), 4 * s + iL, Wr - w - 4 * s); plate(x, ty, w, hB, { bd: COLR.bdHi }); text(tipB.tip, x + pad, ty + pad - s, COLR.tx); yUp = Math.min(yUp, ty - g3); }
    const wrap = (str, maxW) => { const out = []; let cur2 = ''; for (const wd of str.split(' ')) { const t = cur2 ? cur2 + ' ' + wd : wd; if (cur2 && tw(t) > maxW) { out.push(cur2); cur2 = wd; } else cur2 = t; } if (cur2) out.push(cur2); return out; };
    const boxW = Wr - iL - 10 * s;
    if (G.paused && !(G.runMode === 'player' && G.phase === 'play')) { const k = s + 1, t1 = 'Paused', w = PX.measure(t1) * k + pad * 4, h = PX.LINE * k + pad * 2; plate(Math.round(W / 2 - w / 2), yUp - h, w, h, { bd: COLR.bdHi }); PX.text(c, t1, W / 2, yUp - h + pad, k, COLR.amber, { align: 'c' }); yUp -= h + g3; }
    if (U.tip && !U.menu) {
      const d = MON[U.tip.type], a = sat(Math.min(U.tip.t * 4, (5.2 - U.tip.t) * 2)), head = (d.boss ? 'Boss: ' : 'New: ') + d.name, lines = wrap(d.tip, Math.min(boxW - pad * 2, 46 * 6 * s));
      let w = tw(head); for (const l of lines) w = Math.max(w, tw(l)); w += pad * 2; const h = LH * (lines.length + 1) + pad * 2 - s, x = Math.round((iL + Wr - w) / 2), y = yUp - h;
      c.globalAlpha = a; plate(x, y, w, h, { bd: d.boss ? COLR.ember : '#8a6a3a' }); text(head, x + w / 2, y + pad - s, COLR.amber, { align: 'c' }); lines.forEach((l, k) => text(l, x + w / 2, y + pad - s + (k + 1) * LH, COLR.tx, { align: 'c' })); c.globalAlpha = 1; yUp = y - g3;
    } else {
      const first = U.titleT < 16, a = tch ? sat(Math.min(U.titleT - 7.2, first ? 1 : 3 - U.moved, U.manual && !first ? 0 : 1, 62 - U.titleT)) : sat(Math.min(U.titleT - 7.2, 3 - Math.min(U.moved, U.idle > 20 ? U.moved : 0) + (U.titleT < 18 ? 8 : 0)));
      if (a > .02 && !U.menu && !G.paused) {
        const parts = tch ? ['Pick a tower, tap to place', 'Drag to look around', 'Pinch or double-tap to zoom'] : ['Pick a tower, click to place', '1-4 pick a tower', 'Space calls the next wave', 'Wheel zooms, drag moves the view'];
        let lines = [parts.join(' · ')]; if (tw(lines[0]) + pad * 2 > boxW) { lines = parts.length > 3 ? [parts.slice(0, 2).join(' · '), parts.slice(2).join(' · ')] : parts; if (lines.some(l => tw(l) + pad * 2 > boxW)) lines = parts; }
        let w = 0; for (const l of lines) w = Math.max(w, tw(l)); w += pad * 2; const h = LH * lines.length + pad * 2 - s, hx = Math.round((iL + Wr - w) / 2), hy = yUp - h;
        if (w <= boxW) { c.globalAlpha = a; plate(hx, hy, w, h); lines.forEach((l, k) => text(l, hx + w / 2, hy + pad - s + k * LH, COLR.dim, { align: 'c' })); c.globalAlpha = 1; }
      }
    }
    for (let i = U.coins.length - 1; i >= 0; i--) {
      const q = U.coins[i]; q.t += R.frameDt; const u = sat(q.t / q.T), e = u * u * (3 - 2 * u), a = 1 - e;
      const px = a * a * q.sx + 2 * a * e * q.cx + e * e * goldPos.x, py = a * a * q.sy + 2 * a * e * q.cy + e * e * goldPos.y;
      PX.icon(c, 'coin', Math.round(px - 4 * s * .75), Math.round(py - 4 * s * .75), Math.max(2, s - 1), 1);
      if (u >= 1) { U.goldShown = Math.min(G.gold, U.goldShown + q.value); U.goldBump = 1; sfx('coin', CAM.x, CAM.z, .35, rnd()); U.coins.splice(i, 1); }
    }
    if (U.msg) {
      const m = U.msg; m.t += R.frameDt; const a = sat(Math.min(m.t * 3, (m.dur - m.t) * 2));
      if (m.t >= m.dur) U.msg = null; else { let sc = s + (m.big ? 2 : 1); while (sc > 2 && PX.measure(m.text) * sc + pad * 4 > Wr - iL - 6 * s) sc--; const w = PX.measure(m.text) * sc + pad * 4, h = PX.LINE * sc + pad * 2; c.globalAlpha = a; const yb = Math.max(Math.round(H * .2), y0 + topH + 4 * s, (U.prepBot || 0) + 4 * s); plate(Math.round(W / 2 - w / 2), yb, w, h, { bd: m.big ? COLR.ember : COLR.bdHi }); PX.text(c, m.text, W / 2, yb + pad, sc, m.big ? '#ffd9a8' : COLR.tx, { align: 'c' }); c.globalAlpha = 1; }
    }
    U.menuRect = null;
    if (U.menu && G.phase === 'play' && !U.ascend) {
      const m = U.menu, p = proj(m.pad.x, m.pad.y + (m.tower ? Math.min(3.6, m.tower.mounts.top) : 1.2), m.pad.z), a = sat(m.t * 8), mp = 6 * s;
      const button = (bx, by, bw2, bh2, id, enabled, fn, kind, on) => {
        const ov = over(bx, by, bw2, bh2) && !U.gp.active, focused = U.gp.active && U.btns.length === m.focus;
        const b = { id, fn, kind, x: bx, y: by, w: bw2, h: bh2 }; U.btns.push(b); if (ov) hot = b; const down = U.press === id, lit = ov || focused || on || down;
        plate(bx, by + (down ? s : 0), bw2, bh2, { id, lit, crim: id === 'sell' && on, bg: lit ? COLR.bg2 : 'rgba(14,14,20,0.96)', bd: enabled ? COLR.bd : '#3a342c' });
        return { lit, dy: down ? s : 0 };
      };
      const place = (wP, hP) => { const below = p.y - hP - 7 * s < y0 + topH + 2 * s && p.y + 26 * s + hP < Hb - 4 * s; return [clamp(Math.round(p.x - wP / 2), 4 * s + iL, Wr - wP - 4 * s), below ? Math.round(p.y + 26 * s) : clamp(Math.round(p.y - hP - 7 * s), Math.min(y0 + topH + 4 * s, Hb - hP - 4 * s), Hb - hP - 4 * s)]; };
      c.globalAlpha = a;
      if (!m.tower) {
        const bwid = 31 * s, bh = 35 * s, gapb = 3 * s, rowW = 4 * bwid + 3 * gapb;
        let lit = null; const fk = U.gp.active ? TOWER_KINDS[m.focus % 4] : null;
        const lines = k => k ? [TOWER[k].name].concat(TOWER[k].desc) : tch ? ['Choose a tower', 'Tap one to see what it does,', 'then tap it again to build.'] : ['Choose a tower', 'Hover or press 1 to 4', 'to see what each does.'];
        let textW = tw('Tap again to build'); for (const k of [null].concat(TOWER_KINDS)) for (const l of lines(k)) textW = Math.max(textW, tw(l));
        const wP = Math.max(rowW, textW) + mp * 2, hP = mp * 2 + LH + 3 * s + bh + 4 * s + LH * 3 + 2 * s + (tch ? LH + s : 0), [px, py] = place(wP, hP);
        U.menuRect = { x: px, y: py, w: wP, h: hP };
        plate(px, py, wP, hP); text('Build here', px + mp, py + mp - s, COLR.amber);
        const bx0 = px + Math.round((wP - rowW) / 2), by = py + mp + LH + 3 * s;
        TOWER_KINDS.forEach((kind, i) => {
          const d = TOWER[kind], can = G.gold >= d.cost[0], bx = bx0 + i * (bwid + gapb);
          const r = button(bx, by, bwid, bh, 'b' + kind, can, () => { if (U.touch && m.sel !== kind) { m.sel = kind; sfx('uiHover', m.pad.x, m.pad.z, .8); } else doBuild(m.pad, kind); }, kind, m.sel === kind);
          const [iw, ih] = PX.iconSize(d.icon); PX.icon(c, d.icon, bx + Math.round((bwid - iw * s) / 2), by + 6 * s + r.dy, s, can ? 1 : .45);
          if (!tch) text('' + (i + 1), bx + 3 * s, by + 2 * s + r.dy, COLR.dim);
          const cw2 = 8 * s + 2 * s + tw('' + d.cost[0]), cx0 = bx + Math.round((bwid - cw2) / 2);
          PX.icon(c, 'coin', cx0, by + bh - LH - 3 * s + r.dy, s, can ? 1 : .5); text('' + d.cost[0], cx0 + 10 * s, by + bh - LH - 3 * s + r.dy, can ? COLR.amber : COLR.red);
          if (r.lit) lit = kind;
        });
        const ls = lines(lit || fk), ty = by + bh + 4 * s;
        text(ls[0], px + mp, ty, lit || fk ? COLR.tx : COLR.dim); text(ls[1], px + mp, ty + LH + s, COLR.dim); if (ls[2]) text(ls[2], px + mp, ty + LH * 2 + s, COLR.dim);
        if (tch && m.sel) { const can = G.gold >= TOWER[m.sel].cost[0]; text(can ? 'Tap again to build' : 'Not enough gold yet', px + mp, ty + LH * 3 + 2 * s, can ? COLR.amber : COLR.red); }
      } else {
        // the tower sheet: docked at the bottom, above the build bar, sized for thumbs
        const t = m.tower, d = t.def, st = t.st, P = PATHS[t.kind], refund = sellRefund(t), busy = t.state !== 'active';
        const bh = (tch ? 26 : 16) * s, by0 = Math.round((bh - LH) / 2), rowH = Math.max(bh + 6 * s, LH * 2 + 10 * s), gp = 3 * s;
        const info = t.kind === 'archer' ? 'Range ' + st.range.toFixed(1) + ' · Damage ' + Math.round(st.dmg) + ' · ' + st.n + (st.n > 1 ? ' bows' : ' bow')
          : t.kind === 'bombard' ? 'Range ' + st.range.toFixed(1) + ' · Damage ' + Math.round(st.dmg) + ' · Blast ' + st.splash.toFixed(1)
          : t.kind === 'spire' ? 'Range ' + st.range.toFixed(1) + ' · Damage ' + Math.round(st.dmg) + ' · ' + st.jumps + ' jumps'
          : t.kind === 'forge' ? 'Range ' + st.range.toFixed(1) + ' · ' + st.n + ' spikes x' + Math.round(st.dmg) + ' · every ' + st.rate.toFixed(1) + 's'
          : t.kind === 'alch' ? 'Range ' + st.range.toFixed(1) + ' · Acid ' + st.acid + '/s · ' + G.towers.filter(o => (o.brew && o.brew.src === t) || (o.acidCoat && o.acidCoat.src === t)).length + ' buffed'
          : t.kind === 'foundry' ? st.bursts + ' mints x' + st.burst + (st.dividend ? ' · +' + st.dividend + ' dividend' : '') + (st.bank ? ' · Vault ' + Math.round(t.bankStored || 0) + '/' + st.cap : '')
          : st.n + ' footmen · ' + st.hp + ' health' + (st.income ? ' · +' + st.income + '/wave' : '');
        const tally = 'Dealt ' + fmtN(t.dealt) + ' · Kills ' + fmtN(t.kills) + (t.income > 0 ? ' · Gold ' + fmtN(t.income) : ''), hd = LH * 3 + 6 * s;
        const aims = !TOWER[t.kind].noAim, vault = t.kind === 'foundry' && st.bank, tl = 'Target: ' + TARGET_LABEL[t.targetMode], sl = m.sellArm ? 'Tap again: +' + refund : 'Sell +' + refund;
        const wMax = Wr - iL - 8 * s, wP = tch ? wMax : Math.min(wMax, Math.max(210 * s, tw(info) + mp * 2)), pgOK = paragonEligible(t), hP = mp * 2 + hd + (t.paragon ? rowH + gp : (rowH + gp) * 2) + (pgOK ? bh + gp : 0) + bh;
        const px = Math.round(iL + (Wr - iL) / 2 - wP / 2), py = Math.max(y0 + topH + 4 * s, dockTop - 3 * s - hP);
        U.menuRect = { x: px, y: py, w: wP, h: hP };
        plate(px, py, wP, hP, { bd: COLR.bdHi });
        text(t.paragon ? PARAGON[t.kind].name : d.name, px + mp, py + mp - s, COLR.amber);
        const crossTxt = t.paragon ? 'Paragon' : t.paths[0] + '-' + t.paths[1]; text(crossTxt, px + wP - mp - tw(crossTxt), py + mp - s, COLR.tx);
        text(info, px + mp, py + mp + LH, COLR.dim); text(tally, px + mp, py + mp + LH * 2 + 2 * s, COLR.ok);
        // one row per path: name and pips, the next tier and what it does, and its Buy button
        const pathCol = [COLR.ember, COLR.cold];
        if (t.paragon) {
          // the Degree badge
          const ry = py + mp + hd, k = s + 1, dg = 'Degree ' + t.degree;
          c.fillStyle = 'rgba(232,176,74,0.08)'; c.fillRect(px + mp, ry, wP - mp * 2, rowH); c.fillStyle = COLR.amber; c.fillRect(px + mp, ry, 2 * s, rowH);
          PX.text(c, dg, px + mp + 6 * s, ry + Math.round((rowH - PX.LINE * k) / 2), k, COLR.amber);
          const r1 = 'Boss damage x' + t.bossX.toFixed(2), r2 = ABILITY[t.ability].name;
          text(r1, px + wP - mp - 4 * s - tw(r1), ry + 4 * s, COLR.tx); text(r2, px + wP - mp - 4 * s - tw(r2), ry + 4 * s + LH + 2 * s, COLR.dim);
        }
        for (let i = 0; i < (t.paragon ? 0 : 2); i++) {
          const ry = py + mp + hd + i * (rowH + gp), tier = t.paths[i], cap = pathCap(t, i), nx = P[i].tiers[tier], ok = canUpgradePath(t, i);
          const cost = ok ? pathCost(t, i) : 0, afford = ok && G.gold >= cost && !busy;
          c.fillStyle = 'rgba(255,255,255,0.03)'; c.fillRect(px + mp, ry, wP - mp * 2, rowH);
          c.fillStyle = pathCol[i]; c.fillRect(px + mp, ry, 2 * s, rowH);
          const lx = px + mp + 5 * s; text(P[i].name, lx, ry + 4 * s, pathCol[i]);
          // pips beside the path name: filled for bought tiers, hollow for open ones, a dark cross where the other path caps this one
          const pw = 5 * s, pyy = ry + 4 * s + Math.round((LH - pw) / 2) - s, pipX = lx + tw(P[i].name) + 4 * s;
          for (let k = 0; k < 3; k++) {
            const x = pipX + k * (pw + 2 * s);
            if (k < tier) { c.fillStyle = pathCol[i]; c.fillRect(x, pyy, pw, pw); }
            else if (k >= cap) { c.fillStyle = '#3a2a24'; c.fillRect(x, pyy, pw, pw); c.fillStyle = COLR.red; c.fillRect(x + s, pyy + 2 * s, pw - 2 * s, s); }
            else { c.fillStyle = COLR.dim; c.fillRect(x, pyy, pw, s); c.fillRect(x, pyy + pw - s, pw, s); c.fillRect(x, pyy, s, pw); c.fillRect(x + pw - s, pyy, s, pw); }
          }
          const bw = Math.max(tw('000') + 14 * s, 34 * s) + mp, bx = px + wP - mp - bw, by = ry + Math.round((rowH - bh) / 2);
          const nameX = pipX + 3 * (pw + 2 * s) + 4 * s, lineW = bx - lx - 4 * s;
          const fit = (str, w) => { if (tw(str) <= w) return str; while (str.length > 1 && tw(str + '.') > w) str = str.slice(0, -1); return str + '.'; };
          // the next tier's name beside the pips, and what it does on the line below
          if (nx && ok) { text(fit(nx.name, bx - nameX - 4 * s), nameX, ry + 4 * s, COLR.tx); text(fit(nx.desc, lineW), lx, ry + 4 * s + LH + 2 * s, COLR.dim); }
          else text(fit(tier >= 3 ? 'Path complete' : 'Capped: other path is tier 3', lineW), lx, ry + 4 * s + LH + 2 * s, tier >= 3 ? COLR.ok : COLR.dim);
          if (ok) {
            const r = button(bx, by, bw, bh, i ? 'upB' : 'upA', afford, () => doUpgradePath(t, i), null, false);
            const lbl = busy ? '...' : '' + cost, cw = 8 * s + 2 * s + tw(lbl), cx0 = bx + Math.round((bw - cw) / 2);
            PX.icon(c, 'coin', cx0, by + by0 + r.dy, s, afford ? 1 : .45); text(lbl, cx0 + 10 * s, by + by0 + r.dy, afford ? COLR.amber : busy ? COLR.dim : COLR.red);
            if (!tch) text(i ? 'E' : 'Q', bx - 3 * s - tw('Q'), by + by0, COLR.dim);
          }
        }
        if (pgOK) {
          // Ascend to Paragon
          const ay = py + mp + hd + (rowH + gp) * 2, aw = wP - mp * 2, cost = PARAGON[t.kind].cost, can = G.gold >= cost && !busy, al = 'Ascend to Paragon · ' + cost;
          const r0 = button(px + mp, ay, aw, bh, 'ascend', can, () => { if (G.gold >= cost) { U.ascend = { t, infuse: 0 }; sfx('uiClick', t.x, t.z, .8); } else deny(); }, null, can);
          text(al, px + mp + Math.round((aw - tw(al)) / 2), ay + by0 + r0.dy, can ? COLR.amber : COLR.red);
        }
        // bottom row: targeting (not for guard posts) and sell
        const fy = py + hP - mp - bh, half = Math.floor((wP - mp * 2 - gp) / 2);
        let r;
        if (vault) { const v = Math.round(t.bankStored || 0), vl = v ? 'Collect ' + v : 'Vault empty'; r = button(px + mp, fy, half, bh, 'vault', v > 0, () => { if (collectVault(t)) buzz(14); else deny(); }, null, false); text(vl, px + mp + Math.round((half - tw(vl)) / 2), fy + by0 + r.dy, v ? COLR.amber : COLR.dim); }
        if (aims) { r = button(px + mp, fy, half, bh, 'aim', true, () => cycleTarget(t), null, false); text(tl, px + mp + Math.round((half - tw(tl)) / 2), fy + by0 + r.dy, COLR.tx); }
        const two = aims || vault, sx = two ? px + mp + half + gp : px + mp, sw = two ? half : wP - mp * 2;
        r = button(sx, fy, sw, bh, 'sell', true, () => { if (!m.sellArm) { m.sellArm = true; sfx('uiHover', t.x, t.z, .8); } else { buzz(16); doSell(t); } }, null, m.sellArm);
        const sw2 = 9 * s + 3 * s + tw(sl), sx0 = sx + Math.round((sw - sw2) / 2);
        PX.icon(c, 'sell', sx0, fy + by0 + r.dy, s); text(sl, sx0 + 12 * s, fy + by0 + r.dy, m.sellArm ? COLR.crim : COLR.tx);
      }
      c.globalAlpha = 1;
    }
    if (U.ascend && (!U.ascend.t.alive || G.phase !== 'play' || !paragonEligible(U.ascend.t))) U.ascend = null;
    if (U.ascend) {
      const a = U.ascend, t = a.t, cost = PARAGON[t.kind].cost, max = Math.max(0, Math.floor((G.gold - cost) / 10) * 10); a.infuse = Math.min(a.infuse, max);
      const pv = paragonPreview(t, a.infuse), bh = (tch ? 26 : 16) * s, by0 = Math.round((bh - LH) / 2), mpp = 7 * s, gp = 4 * s, k2 = s + 1;
      const wM = Math.min(Wr - iL - 8 * s, 250 * s), hM = mpp * 2 + LH * 3 + gp * 3 + bh * 2 + PX.LINE * k2 + LH + gp * 3 + bh, xM = Math.round(iL + (Wr - iL) / 2 - wM / 2), yM = Math.round(clamp(H / 2 - hM / 2, y0 + topH + 4 * s, Hb - hM - 4 * s));
      const button = (bx, by, bw2, bh2, id, enabled, fn, on) => { const ov = over(bx, by, bw2, bh2), down = U.press === id, lit = ov || on || down; U.btns.push({ id, fn, x: bx, y: by, w: bw2, h: bh2 }); if (ov) hot = U.btns[U.btns.length - 1]; plate(bx, by + (down ? s : 0), bw2, bh2, { id, lit, bg: lit ? COLR.bg2 : 'rgba(14,14,20,0.96)', bd: enabled ? COLR.bd : '#3a342c' }); return { dy: down ? s : 0 }; };
      c.fillStyle = 'rgba(3,4,8,0.55)'; c.fillRect(0, 0, W, H);
      U.menuRect = { x: xM, y: yM, w: wM, h: hM }; plate(xM, yM, wM, hM, { bd: COLR.bdHi });
      let y = yM + mpp - s; const x = xM + mpp, iw = wM - mpp * 2;
      text('Ascend: ' + PARAGON[t.kind].name, x, y, COLR.amber); y += LH + gp;
      text('Absorbs ' + pv.absorbed.length + (pv.absorbed.length === 1 ? ' tower' : ' towers') + ' · ' + pv.tiers + ' tiers · ' + fmtN(pv.dealt) + ' dealt', x, y, COLR.dim); y += LH + gp;
      text('Infuse gold: ' + a.infuse + (max ? ' of ' + max : ''), x, y, COLR.tx); y += LH + gp;
      // slider track and handle
      const tr = { x: x + 4 * s, w: iw - 8 * s, max }; U.pgSl = tr; U.btns.push({ id: 'pgSlider', fn: () => setInfuseX(U.mx), x, y, w: iw, h: bh });
      const ty = y + Math.round(bh / 2) - s, f = max ? a.infuse / max : 0;
      c.fillStyle = '#2a2620'; c.fillRect(tr.x, ty, tr.w, 2 * s); c.fillStyle = COLR.amber; c.fillRect(tr.x, ty, Math.round(tr.w * f), 2 * s);
      const hx = Math.round(tr.x + tr.w * f); plate(hx - 4 * s, y + s, 8 * s, bh - 2 * s, { bd: COLR.bdHi, bg: COLR.bg2 });
      y += bh + gp;
      // quick amounts
      const chips = [['0', 0], ['25%', .25], ['50%', .5], ['Max', 1]], cw = Math.floor((iw - gp * 3) / 4);
      chips.forEach(([l, v], i) => { const r = button(x + i * (cw + gp), y, cw, bh, 'chip' + i, !!max || !v, () => { a.infuse = Math.round(max * v / 10) * 10; sfx('uiHover', CAM.x, CAM.z, .6); }, false); text(l, x + i * (cw + gp) + Math.round((cw - tw(l)) / 2), y + by0 + r.dy, COLR.tx); });
      y += bh + gp;
      // the Degree it will reach
      const dg = 'Degree ' + pv.degree; PX.text(c, dg, x, y, k2, COLR.amber); const bx2 = 'Boss x' + pv.bossX.toFixed(2); text(bx2, x + iw - tw(bx2), y + Math.round((PX.LINE * k2 - LH) / 2), COLR.tx);
      y += PX.LINE * k2 + gp;
      const total = cost + a.infuse, cl = 'Cost ' + cost + (a.infuse ? ' + ' + a.infuse + ' = ' + total : ''); text(cl, x, y, G.gold >= total ? COLR.tx : COLR.red); y += LH + gp * 2;
      const hw = Math.floor((iw - gp) / 2);
      let r = button(x, y, hw, bh, 'pgCancel', true, () => { U.ascend = null; sfx('uiHover', CAM.x, CAM.z, .6); }, false); text('Cancel', x + Math.round((hw - tw('Cancel')) / 2), y + by0 + r.dy, COLR.tx);
      r = button(x + hw + gp, y, hw, bh, 'pgGo', G.gold >= total, doAscend, true); text('Ascend', x + hw + gp + Math.round((hw - tw('Ascend')) / 2), y + by0 + r.dy, COLR.amber);
    }
    if (G.paused && G.runMode === 'player' && G.phase === 'play') {
      // ---- pause menu ----
      const bh = (tch ? 28 : 20) * s, wM = Math.min(Wr - iL - 16 * s, 170 * s), hM = 8 * s * 2 + LH + 6 * s + (bh + 4 * s) * 4, xM = Math.round(W / 2 - wM / 2), yM = Math.round(H / 2 - hM / 2);
      c.fillStyle = 'rgba(3,4,8,0.45)'; c.fillRect(0, 0, W, H); plate(xM, yM, wM, hM, { bd: COLR.bdHi }); U.menuRect = { x: xM, y: yM, w: wM, h: hM };
      text('Paused · ' + G.B.bio.name + ' · Wave ' + waveNumber(), W / 2, yM + 8 * s - s, COLR.amber, { align: 'c' });
      let y = yM + 8 * s + LH + 6 * s; const x = xM + 8 * s, w = wM - 16 * s;
      mbtn(x, y, w, bh, 'presume', togglePause, 'Resume', COLR.amber, true); y += bh + 4 * s;
      mbtn(x, y, w, bh, 'psave', doSave, 'Save Run', COLR.tx, false); y += bh + 4 * s;
      mbtn(x, y, w, bh, 'pvis', cycleVisuals, 'Visuals: ' + VIS_NAMES[R.mode][1], COLR.tx, false); y += bh + 4 * s;
      mbtn(x, y, w, bh, 'pmenu', () => { G.paused = false; returnToMenu(); sfx('uiClick', CAM.x, CAM.z, .8); }, 'Return to Menu', COLR.tx, false);
    }
    if (G.phase === 'defeat' && G.runMode === 'player' && G.defeat && G.phaseT > 1.6) {
      // ---- the Defeat screen ----
      const d = G.defeat, a = sat((G.phaseT - 1.6) * 2), k2 = s + 1, bh = (tch ? 30 : 22) * s, rev = canSecondChance();
      const mvp = d.mvp ? (d.mvp.paragon ? PARAGON[d.mvp.kind].name : d.mvp.def.name + ' ' + d.mvp.paths.join('-')) + ' · ' + fmtN(d.mvp.dealt) + ' damage' : 'None';
      const lines = [[d.land + ' · Wave ' + d.wave, COLR.tx], ['Monsters slain: ' + d.slain, COLR.dim], ['MVP: ' + mvp, COLR.dim]];
      const wM = Math.min(Wr - iL - 16 * s, Math.max(220 * s, Math.max(...lines.map(l => tw(l[0]))) + 24 * s)), hM = 8 * s * 2 + PX.LINE * k2 + 6 * s + (LH + 3 * s) * lines.length + (d.newBest ? LH + 8 * s : 0) + 6 * s + (bh + 5 * s) * (rev ? 2 : 1);
      const xM = Math.round(W / 2 - wM / 2), yM = Math.round(clamp(H / 2 - hM / 2, iT + 8 * s, Hb - hM - 8 * s));
      c.globalAlpha = a; c.fillStyle = 'rgba(8,2,3,0.5)'; c.fillRect(0, 0, W, H);
      plate(xM, yM, wM, hM, { bd: COLR.crim }); U.menuRect = { x: xM, y: yM, w: wM, h: hM };
      let y = yM + 8 * s; PX.text(c, 'The beacon is out', W / 2, y, k2, COLR.crim, { align: 'c' }); y += PX.LINE * k2 + 6 * s;
      for (const [l, col] of lines) { text(l, W / 2, y, col, { align: 'c' }); y += LH + 3 * s; }
      if (d.newBest) { const bt = 'New best on ' + d.land + '!', bw2 = tw(bt) + 12 * s; plate(Math.round(W / 2 - bw2 / 2), y, bw2, LH + 4 * s, { bd: COLR.bdHi, bg: 'rgba(60,40,10,0.9)' }); text(bt, W / 2, y + 2 * s, COLR.amber, { align: 'c' }); y += LH + 8 * s; }
      y += 6 * s; const x = xM + 8 * s, w = wM - 16 * s;
      if (rev) { mbtn(x, y, w, bh, 'revive', () => { secondChance(); buzz([20, 40, 30]); }, 'Second Chance - Reignite the Beacon', COLR.amber, true, true); y += bh + 5 * s; }
      mbtn(x, y, w, bh, 'tomenu', () => { abandonRun(); sfx('uiClick', CAM.x, CAM.z, .8); }, 'Return to Start Menu', COLR.tx, false);
      c.globalAlpha = 1;
    }
    if (hot !== U.hotBtn && hot) sfx('uiHover', CAM.x, CAM.z, .5);
    U.hotBtn = hot;
    if (U.armed && G.phase === 'play') {
      const d = TOWER[U.armed], g = U.ghost, poor = G.gold < d.cost[0], ok = g && g.chk.ok && !poor;
      const why = !g ? '' : poor ? 'Not enough gold' : !g.chk.ok ? g.chk.reason : '';
      if (mouse && !U.hudHot) {
        // desktop: a note by the cursor
        const l1 = d.name + ' · ' + d.cost[0], l2 = why || 'Click to build · Shift keeps it · Right-click cancels', w = Math.max(tw(l1), tw(l2)) + pad * 2, h = LH * 2 + pad * 2;
        const xx = clamp(U.mx + 12 * s, 2 * s, W - w - 2 * s), yy = clamp(U.my + 12 * s, 2 * s, H - h - 2 * s);
        plate(xx, yy, w, h, { bd: ok ? COLR.bdHi : why ? COLR.red : COLR.bd }); text(l1, xx + pad, yy + pad - s, COLR.amber); text(l2, xx + pad, yy + pad + LH, why ? COLR.red : COLR.dim);
      } else if (tch) {
        if (!g) { const l = 'Tap the ground to place the ' + d.short.toLowerCase(), w = tw(l) + pad * 2, yy = dockTop - g3 - hB - 2 * s; plate(Math.round(W / 2 - w / 2), yy, w, hB, { bd: COLR.bdHi }); text(l, W / 2, yy + pad - s, COLR.tx, { align: 'c' }); }
        else {
          // touch: Build and Cancel beside the chosen spot, with the reason when it will not do
          const p = proj(g.x, g.y, g.z), bh = 24 * s, l1 = 'Build ' + d.cost[0], l2 = 'Cancel', w1 = tw(l1) + pad * 2 + 4 * s, w2 = tw(l2) + pad * 2 + 4 * s, tot = w1 + g3 + w2;
          let bx = clamp(Math.round(p.x - tot / 2), 4 * s + iL, Wr - tot - 4 * s), by = clamp(Math.round(p.y + 18 * s), y0 + 30 * s, dockTop - bh - g3 - (why ? LH + 6 * s : 0));
          const tb = (id, x, w, label, en, fn, col) => { const down = U.press === id, dy = down ? s : 0; U.btns.push({ id, fn, x, y: by, w, h: bh }); plate(x, by + dy, w, bh, en ? { bd: COLR.bdHi, bg: COLR.bg2 } : { bd: '#3a342c' }); text(label, x + Math.round((w - tw(label)) / 2), by + dy + Math.round((bh - LH) / 2) + s, col); };
          tb('place', bx, w1, l1, ok, () => placeArmed(false), ok ? COLR.amber : COLR.dim);
          tb('cancel', bx + w1 + g3, w2, l2, true, () => { disarm(); sfx('uiHover', CAM.x, CAM.z, .5); }, COLR.tx);
          if (why) { const w = tw(why) + pad * 2, xx = clamp(Math.round(p.x - w / 2), 4 * s + iL, Wr - w - 4 * s); plate(xx, by + bh + 3 * s, w, LH + pad * 2 - s, { bd: COLR.red }); text(why, xx + pad, by + bh + 3 * s + pad - s, COLR.red); }
        }
      }
    }
    if (U.titleT < 7 && !U.menu) {
      const a = sat(Math.min((U.titleT - .4) * 1.5, (6.6 - U.titleT) * 1.2));
      if (a > 0) {
        const sc = s * 2, t1 = 'Cinderwatch', full = G.B.bio.name + ' · The commander plays until you take over.', t2 = tw(full) + pad * 4 > Wr - iL - 6 * s ? [G.B.bio.name, 'The commander plays', 'until you take over.'] : [full]; if (G.best > 5) t2.push('Best run: wave ' + G.best);
        let w = PX.measure(t1) * sc; for (const l of t2) w = Math.max(w, tw(l)); w += pad * 4; const h = PX.LINE * sc + LH * t2.length + pad * 2 + 2 * s, yy = Hb - h - 12 * s - zb;
        c.globalAlpha = a; plate(Math.round(W / 2 - w / 2), yy, w, h); PX.text(c, t1, W / 2, yy + pad, sc, '#ffd9a8', { align: 'c' }); t2.forEach((l, k) => text(l, W / 2, yy + pad + PX.LINE * sc + s + k * LH, k === 0 && t2.length > 1 ? COLR.tx : COLR.dim, { align: 'c' })); c.globalAlpha = 1;
      }
    }
    if (HASH.fps) { text(R.fpsText || '', 6 * s + iL, Hb - 30 * s, COLR.ok, { outline: COLR.dark }); }
  }
  U.init = initUI; U.update = update; U.draw = draw;
  return U;
})();
