// ---- Tier-3 active abilities ----
// Every tower with a tier-3 path carries that path's ability. Cooldowns tick only while there is fighting to do.
const ABILITY = {
  storm: { name: 'Arrow Storm', kind: 'archer', path: 0, cd: 30 },
  deadeye: { name: 'Deadeye Volley', kind: 'archer', path: 1, cd: 28 },
  barrage: { name: 'Concussion Barrage', kind: 'bombard', path: 0, cd: 35 },
  scorch: { name: 'Scorched Earth', kind: 'bombard', path: 1, cd: 32 },
  overload: { name: 'Tempest Overload', kind: 'spire', path: 0, cd: 35 },
  permafrost: { name: 'Permafrost', kind: 'spire', path: 1, cd: 40 },
  rally: { name: 'Rally the Banner', kind: 'guard', path: 0, cd: 30 },
  chest: { name: 'War Chest', kind: 'guard', path: 1, cd: 45, perWave: 2 },
  carpet: { name: 'Iron Carpet', kind: 'forge', path: 0, cd: 40 },
  fortify: { name: 'Fortify Lane', kind: 'forge', path: 1, cd: 35 },
  overbrew: { name: 'Overbrew Surge', kind: 'alch', path: 0, cd: 45 },
  blight: { name: 'Blight Storm', kind: 'alch', path: 1, cd: 40 },
  bullion: { name: 'Bullion Shipment', kind: 'foundry', path: 0, cd: 30, perWave: 2 },
  loan: { name: 'Guild Loan', kind: 'foundry', path: 1, cd: 60, perWave: 1 },
};
// fixed slot order, which is also Shift+1 to Shift+8
const ABILITY_ORDER = ['storm', 'deadeye', 'barrage', 'scorch', 'overload', 'permafrost', 'rally', 'chest', 'carpet', 'fortify', 'overbrew', 'blight', 'bullion', 'loan'];
const ABILITY_OF = { archer: ['storm', 'deadeye'], bombard: ['barrage', 'scorch'], spire: ['overload', 'permafrost'], guard: ['rally', 'chest'], forge: ['carpet', 'fortify'], alch: ['overbrew', 'blight'], foundry: ['bullion', 'loan'] };

const liveMons = () => G.mons.filter(m => !m.dead && m.hp > 0 && m.vis && !m.dying);
function inCombat() { return G.phase === 'play' && (G.spawning || G.mons.some(m => !m.dead && m.hp > 0)); }
function abilityReady(t) { return t.alive && t.ability && t.state === 'active' && t.abCd <= 0 && !(ABILITY[t.ability].perWave && t.abUses >= ABILITY[t.ability].perWave); }
// every slot the player owns: how many copies, how many are ready, and the shortest wait
function abilitySlots() {
  const out = [];
  for (const key of ABILITY_ORDER) {
    const own = G.towers.filter(t => t.alive && t.ability === key); if (!own.length) continue;
    const ready = own.filter(abilityReady), capped = own.every(t => ABILITY[key].perWave && t.abUses >= ABILITY[key].perWave);
    const best = own.reduce((a, t) => (t.abCd / t.abMax < a.abCd / a.abMax ? t : a), own[0]);
    out.push({ key, own: own.length, ready: ready.length, frac: ready.length ? 0 : sat(best.abCd / best.abMax), capped, wait: best.abCd });
  }
  return out;
}

// fire one ready copy of an ability: the one nearest the front of the fight
function useAbility(key) {
  if (G.phase !== 'play') return false;
  const ready = G.towers.filter(t => t.ability === key && abilityReady(t)); if (!ready.length) return false;
  const mons = liveMons(); if (!mons.length && !ABILITY_ANYTIME[key]) return false;
  const front = mons.reduce((a, m) => (!a || m.s > a.s ? m : a), null);
  const t = front ? ready.reduce((a, b) => (dist2(b.x, b.z, front.x, front.z) < dist2(a.x, a.z, front.x, front.z) ? b : a)) : ready[0];
  const ok = ABILITY_FX[key](t, mons, front); if (ok === false) return false;
  t.abCd = t.abMax; t.abUses++; t.recent += 20;
  return true;
}

// economy abilities work even with an empty road
const ABILITY_ANYTIME = { chest: 1, bullion: 1, loan: 1, overbrew: 1, fortify: 1 };
const ABILITY_FX = {
  // Iron Carpet: red-hot caltrops strewn along the whole road
  carpet(t) {
    const B = G.B, st = t.st;
    for (let s = 3; s < B.L - 2; s += 2.5) { const p = pathAt(B, s, _ap2); addPile(p.x - p.tz * rr(-.5, .5), p.z + p.tx * rr(-.5, .5), 6, st.dmg * 1.5, t, { redhot: true, bomb: st.bomb, life: 0 }); if (s % 7.5 < 2.5) fxSparks(p.x, p.y + .2, p.z, 3, 2, 3, 1.4, .5, { size: .05 }); }
    sfx('clink', t.x, t.z, 1, .2); sfx('ignite', t.x, t.z, .7, .5); lightFlash(t.x, t.y + 3, t.z, 0xff7a30, 900, .3, 26);
  },
  // Fortify Lane: a dense wall of tempered, gilded spikes across the sharpest bend near the forge
  fortify(t) {
    const B = G.B; let best = -1, bc = -1;
    for (let i = 6; i < B.n - 6; i += 2) { if (dist2(t.x, t.z, B.px[i], B.pz[i]) > (t.st.range + 6) * (t.st.range + 6)) continue; const c = Math.abs(angDiff(Math.atan2(B.tz[i - 6], B.tx[i - 6]), Math.atan2(B.tz[i + 6], B.tx[i + 6]))); if (c > bc) { bc = c; best = i; } }
    if (best < 0) best = roadNearest(B, t.x, t.z)[1];
    for (let a = -1; a <= 1; a++) for (const lat of [-.85, 0, .85]) { const p = pathAt(B, best * PATH_STEP + a * .9, _ap2); addPile(p.x - p.tz * lat, p.z + p.tx * lat, 14, t.st.dmg * 1.3, t, { gilded: true, life: 2 }); }
    const p = pathAt(B, best * PATH_STEP, _ap2); fxDust(p.x, p.y + .1, p.z, 10, 1.4, { speed: 2 }); fxSparks(p.x, p.y + .3, p.z, 16, 3, 3, 2.4, .8, { size: .05 });
    sfx('clink', p.x, p.z, 1.2, .5); sfx('hammer', p.x, p.z, 1, .2);
  },
  // Overbrew Surge: this alchemist's brews are twice as strong for eight seconds
  overbrew(t) {
    t.surgeT = 8; let n = 0;
    for (const o of G.towers) if (o.brew && o.brew.src === t) { n++; fxTimed(4, o.x, o.y + .1, o.z, 3, 3, 2.6, 1.7, .5, .6, .6, { ground: true }); fxSparks(o.x, o.y + 2, o.z, 10, 2.6, 3, 2, .6, { size: .05, grav: 2 }); }
    fxSparks(t.x, t.y + 1.5, t.z, 16, 3, 3, 2, .6, { size: .06, grav: 2 }); sfx('flask', t.x, t.z, 1, .9); sfx('charge', t.x, t.z, .6, .6);
  },
  // Blight Storm: corrosive acid on every monster on the field
  blight(t, mons) {
    mons.forEach((m, i) => { applyAcid(m, t.st.acid * 2, 6, t); if (i < 40) { fxTimed(4, m.x, m.y + .08, m.z, 1.6, 1.6, .6, 2, .4, .55, .6, { ground: true }); fxPart(m.x, m.y + 2.5, m.z, 0, -3, 0, .6, .08, .8, 2.4, .5, { grav: 6 }); } });
    UI.flash && UI.flash([.55, 1.3, .45], .6); sfx('flask', t.x, t.z, 1.2, .3); sfx('splash', t.x, t.z, .8);
  },
  // Bullion Shipment: an instant payout, twice a wave at most
  bullion(t) { foundryPay(t, Math.round(300 * endlessTaper(G.level * 5 + Math.max(1, G.k))), true); },
  // Guild Loan: 400 now; the next two end-of-wave payouts each lose 120
  loan(t) {
    if (G.loanDebt.length) return false;
    const v = Math.round(400 * endlessTaper(G.level * 5 + Math.max(1, G.k))), top = t.w(t.mounts.chimney || [0, 2, 0], {});
    dropCoins(top.x, top.y, top.z, v, 14); t.income += v; G.loanDebt.push(120, 120);
    fxSparks(top.x, top.y, top.z, 18, 3.4, 3.4, 2.6, .9, { size: .07, grav: 5 }); sfx('mint', t.x, t.z, 1, .2); sfx('sell', t.x, t.z, .7);
  },
  // Arrow Storm: for 3.5 s, flaming arrows fall from the sky on monsters all along the road
  storm(t) { t.stormT = 3.5; t.stormAcc = 0; sfx('ignite', t.x, t.z, 1, .2); sfx('horn', t.x, t.z, .5, .8); lightFlash(t.x, t.y + 4, t.z, 0xff8a40, 900, .4, 30); },
  // Deadeye Volley: three guaranteed crits, armor-piercing and wraith-hitting, at the toughest monsters anywhere
  deadeye(t, mons) {
    const top = mons.slice().sort((a, b) => b.hp - a.hp).slice(0, 3), from = t.w([0, t.mounts.top - 1.2, 0], {});
    for (let i = 0; i < 3; i++) { const m = top[i] || top[0]; shootArrow(from.x, from.y, from.z, m, t.st.dmg * 12, t, { crit: true, pierce: true }); if (top[i]) fxTimed(4, m.x, m.y + .1, m.z, 2.2, 2.2, 2.6, 2.2, 1.1, .7, .5, { ground: true }); }
    fxSparks(from.x, from.y, from.z, 14, 3, 3, 2.6, 1.4, { size: .06 }); sfx('bow', t.x, t.z, 1, .1); sfx('clash', t.x, t.z, .7, .9);
  },
  // Concussion Barrage: five heavy shells on the densest, toughest clusters; stuns all but bosses
  barrage(t, mons) {
    const score = m => { let v = 0; for (const o of mons) if (!o.fly && dist2(o.x, o.z, m.x, m.z) < 2.2 * 2.2) v += o.hp; return v; };
    const cand = mons.filter(m => !m.fly).map(m => [m, score(m)]).sort((a, b) => b[1] - a[1]), picks = [];
    for (const [m] of cand) { if (picks.length >= 5) break; if (picks.every(p => dist2(p.x, p.z, m.x, m.z) > 2.4 * 2.4)) picks.push(m); }
    for (let i = 0; picks.length && picks.length < 5; i++) picks.push(picks[i % picks.length]);
    if (!picks.length) return false;
    picks.forEach((m, i) => {
      const q = aimPoint(m, .9 + i * .18, _ap2), gy = G.B.heightAt(q.x, q.z);
      G.shells.push({ x0: q.x + rr(-1.5, 1.5), y0: gy + 16, z0: q.z + rr(-1.5, 1.5), tx: q.x, ty: gy + .05, tz: q.z, t: 0, T: .9, delay: i * .18, dmg: t.st.dmg * 1.3, splash: 2.4, tower: t, x: q.x, y: gy + 16, z: q.z, sm: 0, arc: .4,
        shred: true, armorX: 1.5, stun: 1.2, bossStun: 0, kb: 2.5 });
    });
    sfx('cannon', t.x, t.z, 1.2, 1); FX.shake = Math.min(1.2, FX.shake + .3); lightFlash(t.x, t.y + 3, t.z, 0xffc880, 900, .3, 24);
  },
  // Scorched Earth: the road around the frontmost monsters burns hard for five seconds
  scorch(t, mons, front) {
    const gnd = mons.filter(m => !m.fly), f = gnd.length ? gnd.reduce((a, m) => (m.s > a.s ? m : a)) : front; if (!f) return false;
    for (let s = Math.max(0, f.s - 6); s <= Math.min(G.B.L, f.s + 2); s += 1.3) { const p = pathAt(G.B, s, _ap2); G.firePatches.push({ x: p.x, z: p.z, r: 1.5, t: 5, dps: 45 + t.st.dmg * .1, tower: t, tick: rnd() * .25 }); }
    fxExplosion(f.x, f.y + .2, f.z, .8); sfx('ignite', f.x, f.z, 1.2, .1); sfx('explode', f.x, f.z, .8, .3); FX.shake = Math.min(1.2, FX.shake + .25);
  },
  // Tempest Overload: sky bolts on up to fourteen monsters across the map, toughest first
  overload(t, mons) {
    const top = mons.slice().sort((a, b) => b.hp - a.hp).slice(0, 14);
    top.forEach((m, i) => t.boltQ.push({ t: i * .045, m }));
    sfx('charge', t.x, t.z, 1, 1); lightFlash(t.x, t.y + 5, t.z, 0xbfe0ff, 1200, .4, 40);
  },
  // Permafrost: frost across the whole field; every monster heavily slowed and brittle for five seconds
  permafrost(t, mons) {
    mons.forEach((m, i) => {
      slowMonster(m, .6, 5); m.brittleT = Math.max(m.brittleT || 0, 5);
      if (i < 50) { fxTimed(4, m.x, m.y + .08, m.z, 1.8, 1.8, .5, 1.1, 1.6, .55, .7, { ground: true }); fxSparks(m.x, m.y + m.hitH, m.z, 3, 1.6, 1.4, 2.2, 2.8, { size: .05, grav: 1 }); }
    });
    UI.flash && UI.flash([.55, .85, 1.25], .7); sfx('zap', t.x, t.z, 1, 0); sfx('charge', t.x, t.z, .7, 0); lightFlash(t.x, t.y + 6, t.z, 0xa0e0ff, 1600, .6, 60);
  },
  // Rally the Banner: knights return at full strength; six seconds of double cleave and half damage taken
  rally(t) {
    for (const f of t.men) if (!f.dead) { f.hp = f.maxHp; fxTimed(4, f.x, f.y + .08, f.z, 1.6, 1.6, 2.4, 2.1, 1.2, .7, .5, { ground: true }); }
    let n = t.men.filter(f => !f.dead && !f.gone).length;
    while (n < t.st.n) { const f = spawnFootman(t); f.hp = f.maxHp; n++; }
    t.rallyT = 6; t.respawn = t.st.rate;
    fxSparks(t.x, t.y + 2.5, t.z, 18, 3.2, 3.2, 2.6, 1.2, { size: .06, grav: 3 }); fxTimed(4, t.x, t.y + .1, t.z, 6, 6, 2.2, 1.9, 1, .5, .6, { ground: true });
    sfx('clash', t.x, t.z, 1, .3); sfx('buildDone', t.x, t.z, .8);
  },
  // War Chest: a burst of gold at the keep, twice a wave at most (tapered in long Endless runs like all gold)
  chest(t) {
    const v = Math.round(150 * endlessTaper(G.level * 5 + Math.max(1, G.k)));
    dropCoins(t.x, t.y + 2.4, t.z, v, 14); t.income += v;
    fxSparks(t.x, t.y + 2, t.z, 20, 3.6, 3.2, 2.5, .8, { size: .07, grav: 6 }); sfx('sell', t.x, t.z, 1); sfx('buildDone', t.x, t.z, .6);
  },
};

// per frame: cooldowns, and the abilities that play out over time
function updateAbilities(dt) {
  const fight = inCombat();
  for (const t of G.towers) {
    if (!t.alive) continue;
    if (t.ability && fight && t.abCd > 0) t.abCd = Math.max(0, t.abCd - dt);
    if (t.rallyT > 0) { t.rallyT -= dt; if (rnd() < dt * 6) for (const f of t.men) if (!f.dead && rnd() < .4) fxPart(f.x, f.y + 1.2, f.z, rr(-.2, .2), rr(.5, 1), rr(-.2, .2), .5, .05, 3, 2.6, 1.2, { drag: 1 }); }
    if (t.stormT > 0) {
      t.stormT -= dt; t.stormAcc += dt * 14;
      const mons = t.stormAcc >= 1 ? liveMons() : null;
      while (t.stormAcc >= 1) {
        t.stormAcc -= 1; if (!mons.length) break;
        const m = mons[Math.floor(rnd() * mons.length)];
        shootArrow(m.x + rr(-2.5, 2.5), m.y + 9 + rr(0, 2), m.z + rr(-2.5, 2.5), m, t.st.dmg * 1.5, t, { fire: true, pierce: t.st.pierce });
        if (rnd() < .3) sfx('bow', m.x, m.z, .35, rnd());
      }
    }
    for (let i = t.boltQ.length - 1; i >= 0; i--) {
      const b = t.boltQ[i]; b.t -= dt; if (b.t > 0) continue; t.boltQ.splice(i, 1);
      const m = b.m; if (m.dead || m.hp <= 0) continue;
      const to = [m.x, m.y + m.hitH, m.z];
      fxBolt([m.x + rr(-1, 1), m.y + 10, m.z + rr(-1, 1)], to, .32, [1.3, 1.4, 1.9], .14); fxSparks(to[0], to[1], to[2], 8, 4, 2, 2.4, 3.2, { grav: 4, size: .06 });
      if (i % 4 === 0) { lightFlash(m.x, m.y + 2, m.z, 0xc0e0ff, 700, .2, 20); sfx('zap', m.x, m.z, .8, rnd()); }
      slowMonster(m, t.st.slow, 1); if (b.brittle) m.brittleT = Math.max(m.brittleT || 0, 4); hitMonster(m, t.st.dmg * (b.k || 3), 'bolt', 0, 0, t);
    }
  }
}
