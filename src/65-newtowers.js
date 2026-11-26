// ---- Caltrop forge, Alchemist and Gold foundry ----

G.piles = []; G.loanDebt = [];
const PILE_CAP = 70;

// ---------- Caltrop piles ----------
// A pile is a patch of road strewn with spikes. Ground monsters standing on it take a spike every 0.2 s until it runs out.
function addPile(x, z, n, dmg, tower, o = {}) {
  let near = null, nd = .9 * .9;
  for (const p of G.piles) { const d = dist2(p.x, p.z, x, z); if (d < nd && p.tower === tower) { nd = d; near = p; } }
  if (!near && G.piles.length >= PILE_CAP) near = G.piles.reduce((a, p) => (dist2(p.x, p.z, x, z) < dist2(a.x, a.z, x, z) ? p : a));
  if (near) { near.shred = near.shred || !!o.shred; near.mega = near.mega || !!o.mega; near.n = Math.min(near.n + n, Math.max(near.max, n) * 3); near.max = Math.max(near.max, near.n); near.life = Math.max(near.life, o.life || 0); near.redhot = near.redhot || !!o.redhot; near.bomb = near.bomb || !!o.bomb; near.gilded = near.gilded || !!o.gilded; return near; }
  const p = { x, z, y: G.B.heightAt(x, z) + .04, n, max: n, dmg, tower, redhot: !!o.redhot, bomb: !!o.bomb, gilded: !!o.gilded, shred: !!o.shred, mega: !!o.mega, life: o.life || 0, seed: rnd() * 100 };
  G.piles.push(p); return p;
}
const _pm = new THREE.Matrix4(), _pq = new THREE.Quaternion(), _pv = new THREE.Vector3(), _ps = new THREE.Vector3(1, 1, 1), _pe = new THREE.Euler();
function updatePiles(dt) {
  const P = G.piles; if (!P.length && !G.mons.length) return;
  for (const m of G.mons) if (m.spikeCd > 0) m.spikeCd -= dt;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    // draw up to eight caltrops, fewer as the pile is used up
    const show = Math.max(1, Math.min(8, Math.ceil(8 * p.n / p.max))), tint = p.gilded ? [1.9, 1.5, .7] : p.redhot ? [2.2, .9, .5] : null;
    for (let k = 0; k < show; k++) {
      const a = p.seed + k * 2.39, r = .12 + .33 * ((k * .618 + p.seed) % 1);
      _pe.set(p.seed + k, k * 1.7, p.seed * .3 + k); _pq.setFromEuler(_pe);
      _pm.compose(_pv.set(p.x + Math.cos(a) * r, p.y + .03, p.z + Math.sin(a) * r), _pq, _ps.setScalar(p.mega ? 1.7 : p.gilded ? 1.25 : 1)); KIT.caltrop.put(_pm, 0, tint);
    }
    if (p.redhot) FX.add.push(p.x, p.y + .05, p.z, 1.3, 1.3, 0, 0, 2.2, .7, .25, .25, 4, 0, .52, 1);
    if (G.phase !== 'play') continue;
    for (const m of G.mons) {
      if (p.n <= 0) break;
      if (m.dead || m.hp <= 0 || m.fly || m.dying || m.spikeCd > 0) continue;
      const rr2 = .62 + m.rad; if (dist2(m.x, m.z, p.x, p.z) > rr2 * rr2) continue;
      m.spikeCd = .2; p.n--; if (p.shred && m.def.armor) m.shredT = Math.max(m.shredT || 0, 3);
      const k = p.redhot && (m.def.armor || m.def.boss) ? 1.5 : 1;
      fxSparks(m.x, m.y + .1, m.z, 2, 1.6, p.redhot ? 3 : 2, p.redhot ? 1.4 : 1.8, p.redhot ? .5 : 1.4, { size: .04, grav: 6 });
      hitMonster(m, p.dmg * k, 'spike', 0, 0, p.tower, { pierce: p.redhot });
    }
    if (p.n <= 0) {
      if (p.bomb) { explodeAt(p.x, p.y, p.z, p.dmg * 6, 1.4, p.tower); }
      swapRemove(P, i);
    }
  }
}
// at the end of a wave piles age; only tempered and gilded ones see the next wave
function agePiles() { const P = G.piles; for (let i = P.length - 1; i >= 0; i--) { P[i].life--; if (P[i].life < 0) swapRemove(P, i); } }

// ---------- Acid ----------
function applyAcid(m, dps, T, tower) {
  m.acidT = Math.max(m.acidT || 0, T); m.acidDps = Math.max(m.acidDps || 0, dps); m.acidSrc = tower;
  m.corrode = !!(tower && tower.st.corrode) || m.corrode; m.volatile = !!(tower && tower.st.volatile) || m.volatile;
}
function updateAcid(dt) {
  for (const m of G.mons) {
    if (!(m.acidT > 0) || m.dead) continue;
    m.acidT -= dt; m.acidAcc = (m.acidAcc || 0) + dt;
    if (m.acidAcc >= .25) { m.acidAcc -= .25; hitMonster(m, m.acidDps * .25, 'acid', 0, 0, m.acidSrc); }
    if (rnd() < dt * 5) fxPart(m.x + rr(-.2, .2), m.y + m.hitH * rr(.3, 1), m.z + rr(-.2, .2), 0, rr(-.4, -.1), 0, .5, .05, .9, 2.4, .5, { drag: 1 });
    if (m.acidT <= 0) { m.acidDps = 0; m.corrode = false; m.volatile = false; }
  }
}
// a volatile monster dying in acid bursts, hurting its neighbours and dropping a little gold for the alchemist
let _volDepth = 0;
function volatileBurst(m) {
  if (_volDepth > 4) return; _volDepth++;
  const t = m.acidSrc;
  fxTimed(5, m.x, m.y + .4, m.z, 2.6, 2.6, .8, 2.2, .5, .9, .3); fxSparks(m.x, m.y + .4, m.z, 12, 4, .9, 2.4, .5, { grav: 5, size: .06 });
  FX.decals.add(G.B.heightAt, m.x, m.z, 1.2, .012, .03, .01, .7, 30); sfx('flask', m.x, m.z, .8, .2);
  for (const o of G.mons) { if (o === m || o.dead || o.hp <= 0) continue; const d = Math.hypot(o.x - m.x, o.z - m.z); if (d < 1.6 + o.rad) hitMonster(o, 40, 'blast', (o.x - m.x) / (d || 1), (o.z - m.z) / (d || 1), t); }
  if (t) { dropCoins(m.x, m.y + .6, m.z, 3, 2); t.income += 3; }
  _volDepth--;
}
function acidSplash(s) {
  const t = s.tower, x = s.tx, y = s.ty, z = s.tz, st = t.st;
  fxTimed(5, x, y + .1, z, st.splash * 1.8, st.splash * 1.8, .7, 2.1, .5, .8, .25); fxTimed(4, x, y + .06, z, st.splash * 2.2, st.splash * 2.2, .5, 1.6, .4, .5, .6, { ground: true });
  fxSparks(x, y + .2, z, 8, 3, 1.2, 2.4, .7, { grav: 6, size: .05 }); FX.decals.add(G.B.heightAt, x, z, st.splash * .9, .01, .028, .008, .65, 25); sfx('flask', x, z, .7, rnd());
  for (const m of G.mons) {
    if (m.dead || m.hp <= 0 || !m.vis) continue;
    if (Math.hypot(m.x - x, m.z - z) > st.splash + m.rad) continue;
    applyAcid(m, st.acid, st.acidT, t); hitMonster(m, st.dmg, 'acid', 0, 0, t);
  }
}

// ---------- Tower buffs (Alchemist) ----------
// A buff knows the alchemist that gave it; Eternal elixir keeps it while that alchemist stands and the tower is in its range.
const BUFFABLE = t => t.alive && !t.paragon && t.kind !== 'alch' && t.kind !== 'foundry';
function buffKept(b, t) { return b.src.alive && b.src.st.eternal && Math.hypot(b.src.x - t.x, b.src.z - t.z) < b.src.st.range; }
function updateBuffs(dt) {
  for (const t of G.towers) {
    t.dmgMul = 1; t.rangeMul = 1; t.pierceBuff = false;
    if (!t.alive) continue;
    if (t.acidCoat) { const b = t.acidCoat; if (!buffKept(b, t)) b.t -= dt; if (b.t <= 0) t.acidCoat = null; else t.pierceBuff = true; }
    if (t.brew) {
      const b = t.brew; if (!buffKept(b, t)) b.t -= dt;
      if (b.t <= 0) t.brew = null;
      else { const k = b.src.alive && (b.src.surgeT > 0 || b.src.st.permaSurge) ? 2 : 1; t.haste *= 1 + .2 * k; t.dmgMul *= 1 + .2 * k; t.rangeMul *= 1 + .12 * k; }
    }
    if ((t.brew || t.acidCoat) && rnd() < dt * 4) { const c = t.brew ? [3, 2, .7] : [.9, 2.4, .6]; fxPart(t.x + rr(-.7, .7), t.y + rr(.4, 2.6), t.z + rr(-.7, .7), 0, rr(.3, .7), 0, .8, .05, c[0], c[1], c[2], { drag: .8 }); }
  }
}
function brewTarget(t, has) {
  let best = null, bd = 1e9;
  for (const o of G.towers) { if (o === t || !BUFFABLE(o) || o.state !== 'active' || o[has]) continue; const d = Math.hypot(o.x - t.x, o.z - t.z); if (d < t.st.range && d < bd) { bd = d; best = o; } }
  return best;
}
function lobBrew(t, o, kind) {
  const from = t.w(t.mounts.flask, {}), col = kind === 'brew' ? [3, 1.8, .5] : [.8, 2.6, .6];
  fxBolt([from.x, from.y, from.z], [o.x, o.y + 1.6, o.z], .3, col, .05);
  fxTimed(4, o.x, o.y + .1, o.z, 2.6, 2.6, col[0] * .6, col[1] * .6, col[2] * .6, .55, .5, { ground: true }); fxSparks(o.x, o.y + 1.6, o.z, 10, 2.4, col[0], col[1], col[2], { size: .05, grav: 3 });
  sfx('flask', o.x, o.z, .6, .9);
  if (kind === 'brew') o.brew = { t: 10, src: t }; else o.acidCoat = { t: 10, src: t };
}

Object.assign(Tower.prototype, {
  // Caltrop forge: while there is fighting, arcs a cluster of caltrops onto road within range
  updForge(dt, st) {
    if (this.cool > 0 || !inCombat()) { if (this.cool < 0) this.cool = 0; return; }
    this.cool = st.rate * rr(.92, 1.08);
    const B = G.B, idx = [];
    for (let i = 0; i < B.n; i += 3) if (dist2(this.x, this.z, B.px[i], B.pz[i]) < st.range * st.range) idx.push(i);
    if (!idx.length) return;
    const i = idx[Math.floor(rnd() * idx.length)], tx = B.px[i] - B.tz[i] * rr(-.6, .6), tz = B.pz[i] + B.tx[i] * rr(-.6, .6);
    const from = this.w(this.mounts.sling, {}), clusters = st.spread > 1 ? 2 : 1;
    for (let c = 0; c < clusters; c++) {
      const cx = tx + rr(-st.spread, st.spread) * .5, cz = tz + rr(-st.spread, st.spread) * .5, gy = B.heightAt(cx, cz);
      G.shells.push({ x0: from.x, y0: from.y, z0: from.z, tx: cx, ty: gy + .05, tz: cz, t: 0, T: .7, dmg: 0, splash: 0, tower: this, x: from.x, y: from.y, z: from.z, sm: 0, arc: 1.6,
        pile: { n: Math.round(st.n / clusters), dmg: st.dmg, redhot: st.redhot, bomb: st.bomb, gilded: st.gilded, life: st.life, shred: st.shred, mega: st.mega } });
    }
    sfx('clink', this.x, this.z, .6, rnd()); fxSmoke(from.x, from.y, from.z, 0, .5, 0, .8, .2, .4, .35, .32, .3, .25, { drag: 1 });
  },
  // Alchemist: lobs acid flasks at monsters, and (Brewmaster) brews for nearby towers
  updAlch(dt, st) {
    if (this.surgeT > 0) this.surgeT -= dt;
    if (st.dip) { this.dipT = (this.dipT || 2) - dt; if (this.dipT <= 0) { const o = brewTarget(this, 'acidCoat'); this.dipT = o ? (st.brewEvery || 6) : 1; if (o) lobBrew(this, o, 'acid'); } }
    if (st.brew) { this.brewT = (this.brewT || 3) - dt; if (this.brewT <= 0) { const o = brewTarget(this, 'brew'); this.brewT = o ? (st.brewEvery || 5) : 1; if (o) lobBrew(this, o, 'brew'); } }
    const tgt = findTarget(this.x, this.z, st.range, true, true, 0, this.targetMode);
    if (!tgt || this.cool > 0) return;
    this.cool = st.rate * rr(.95, 1.08);
    const foes = st.flasks ? findTargets(this.x, this.z, st.range, true, true, 0, this.targetMode, st.flasks) : [tgt];
    for (const tg of foes) {
    const from = this.w(this.mounts.flask, {}), dist = Math.hypot(tg.x - this.x, tg.z - this.z), T = clamp(dist / 6, .55, 1.0), q = aimPoint(tg, T, _ap2), tgt = tg;
    G.shells.push({ x0: from.x, y0: from.y, z0: from.z, tx: q.x, ty: tgt.fly ? q.y : G.B.heightAt(q.x, q.z) + .05, tz: q.z, t: 0, T, dmg: st.dmg, splash: st.splash, tower: this, x: from.x, y: from.y, z: from.z, sm: 0, arc: 1.8 + dist * .15, acid: true, tint: [.7, 2.2, .5] });
    }
    sfx('bow', this.x, this.z, .35, .1);
  },
  // Gold foundry: mint bursts during waves; Guild bank keeps them in a vault instead
  updFoundry(dt, st) {
    if (this.mintsLeft === undefined) this.mintsLeft = st.bursts;
    if (!inCombat() || this.mintsLeft <= 0) return;
    this.mintT = (this.mintT || 0) + dt;
    if (this.mintT < 9) return;
    this.mintT = 0; this.mintsLeft--;
    const v = Math.round(st.burst * endlessTaper(G.level * 5 + Math.max(1, G.k)));
    foundryPay(this, v, true);
  },
});
// gold from a foundry: into its vault when it has one (overflow past the cap is paid out), otherwise straight to the purse
function foundryPay(t, v, burst) {
  const st = t.st, top = t.w(t.mounts.chimney || [0, 2, 0], {});
  let pay = v;
  if (st.bank) { const room = Math.max(0, st.cap - (t.bankStored || 0)), keep = Math.min(room, v); t.bankStored = (t.bankStored || 0) + keep; pay = v - keep; if (keep) fxSparks(t.x, t.y + 1, t.z, 8, 1.6, 3.2, 2.4, .8, { size: .05, grav: 4 }); }
  if (pay > 0) { dropCoins(top.x, top.y, top.z, pay, Math.min(10, 2 + Math.round(pay / 15))); t.income += pay; }
  if (burst) { fxSparks(top.x, top.y, top.z, 14, 3, 3.4, 2.6, .9, { size: .06, grav: 5 }); lightFlash(top.x, top.y, top.z, 0xffd070, 380, .25, 12); sfx('mint', t.x, t.z, .8, rnd()); }
}
function collectVault(t) {
  const v = Math.round(t.bankStored || 0); if (!v) return 0;
  t.bankStored = 0; const top = t.w(t.mounts.chimney || [0, 2, 0], {});
  dropCoins(top.x, top.y, top.z, v, Math.min(14, 3 + Math.round(v / 40))); t.income += v; sfx('mint', t.x, t.z, 1, .5); return v;
}
// end of a wave: foundry dividends and vault interest, the loan's cut, and pile ageing
function newTowersWaveEnd() {
  const taper = endlessTaper(G.level * 5 + Math.max(1, G.k));
  for (const t of G.towers) {
    if (!t.alive || t.kind !== 'foundry') continue;
    const st = t.st; t.mintsLeft = st.bursts; t.mintT = 0;
    if (st.dividend) foundryPay(t, Math.round(st.dividend * taper), false);
    if (st.bank && t.bankStored > 0) {
      const gain = Math.round(t.bankStored * st.interest), room = st.cap - t.bankStored;
      t.bankStored += Math.min(gain, Math.max(0, room));
      const over = gain - Math.max(0, room);
      if (over > 0 && st.overflow) { G.gold += over; t.income += over; fxSparks(t.x, t.y + 2, t.z, 10, 2.4, 3.2, 2.5, .8, { size: .06, grav: 4 }); }
    }
  }
  agePiles();
}
// the loan takes its cut out of the regular end-of-wave payout
function loanCut(payout) { if (!G.loanDebt.length) return payout; const cut = Math.min(payout, G.loanDebt.shift()); G.loanPaid = (G.loanPaid || 0) + cut; return payout - cut; }
