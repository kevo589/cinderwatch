// ---- Paragons: one ascended citadel per tower kind ----
// Own a 3-x and an x-3 of a kind, select either, and pay to ascend it. Every other tower of that kind is absorbed into it,
// and what they bring (tiers, damage, income) plus any gold infused sets its Degree, 1 to 100.
const PARAGON = {
  archer: { name: 'Sunfire Watchtower', cost: 3200, ability: 'solarflare' },
  bombard: { name: 'Cataclysm Siegeworks', cost: 4200, ability: 'meteor' },
  spire: { name: 'Maelstrom Obelisk', cost: 4500, ability: 'eye' },
  guard: { name: 'Grand Bastion', cost: 3600, ability: 'crusade' },
  forge: { name: 'Obsidian Mineworks', cost: 3400, ability: 'obsidian' },
  alch: { name: "Philosopher's Crucible", cost: 4000, ability: 'transmute' },
};
G.vortex = []; G.goldRushT = 0;
// Paragon abilities hit bosses this much harder still, so one use takes a real bite out of a late Endless boss
const PG_BOSS_BURST = 2.5;

function paragonEligible(t) {
  if (!t || !t.alive || t.paragon || !PARAGON[t.kind] || t.tier < 3) return false;
  const same = G.towers.filter(o => o.alive && o.kind === t.kind);
  return same.some(o => o.paths[0] >= 3) && same.some(o => o.paths[1] >= 3) && !same.some(o => o.paragon);
}
// what ascending t would absorb, and the Degree it would reach with `infuse` extra gold
function paragonPreview(t, infuse = 0) {
  const same = G.towers.filter(o => o.alive && o.kind === t.kind), absorbed = same.filter(o => o !== t);
  const tiers = absorbed.reduce((a, o) => a + o.paths[0] + o.paths[1], 0);
  const dealt = same.reduce((a, o) => a + o.dealt, 0), income = same.reduce((a, o) => a + o.income, 0);
  const power = 250 * tiers + (dealt + 4 * income) / 20 + 1.5 * infuse;
  const degree = clamp(1 + Math.floor(99 * Math.pow(Math.min(1, power / 60000), .7)), 1, 100);
  return { absorbed, tiers, dealt, income, power, degree, cost: PARAGON[t.kind].cost, bossX: paragonBossX(degree) };
}
// boss damage steps up at Degrees 20, 40, 60, 80 and 100
function paragonBossX(deg) { return 1 + .25 * Math.floor(deg / 20); }

// a Paragon's stats: both tier-3 paths at once, then scaled by Degree
function paragonStats(kind, deg) {
  const s = towerStats(kind, [3, 3]), dm = 1 + .05 * deg, rs = 1 + .01 * deg;
  s.paragon = true; s.bossX = paragonBossX(deg);
  if (kind === 'archer') { s.n = 5; s.crit = .35; s.pierce = true; s.volley = true; s.beam = true; s.dmg *= dm * 1.6; s.rate /= rs * 1.15; s.range += 1; }
  else if (kind === 'bombard') { s.dmg *= dm * 1.5; s.splash *= 1.3; s.rate /= rs; s.range += 1; s.crater = true; }
  else if (kind === 'spire') { s.dmg *= dm; s.rate = .6 / rs; s.jumps = 12; s.jumpR = 4.5; s.overEvery = 2; s.range += .8; }
  else if (kind === 'guard') { s.n = 4; s.hp = Math.round(s.hp * 3 * (1 + .02 * deg)); s.dmg *= dm * 1.5; s.armor = .5; s.rate *= .7; s.banner = .2; s.inspire = .3; s.inspireR = 6; s.bounty = .6; s.income = 150; s.range += .6; }
  else if (kind === 'forge') { s.n = 40; s.dmg *= dm * 1.5; s.rate = .9 / rs; s.redhot = true; s.bomb = true; s.gilded = true; s.life = 3; s.shred = true; s.mega = true; s.range += .8; }
  else if (kind === 'alch') { s.splash = 2; s.acid = 20 * dm; s.dmg *= dm * 2; s.flasks = 3; s.permaSurge = true; s.brewEvery = 2; s.range += 1.5; }
  return s;
}

// ascend t: pay, absorb every other tower of its kind, and rebuild it as its citadel
function ascendTower(t, infuse = 0) {
  if (!paragonEligible(t) || G.phase !== 'play') return false;
  const pv = paragonPreview(t, infuse), total = pv.cost + infuse; if (G.gold < total) return false;
  G.gold -= total; UI.goldShown = Math.min(UI.goldShown, G.gold);
  for (const o of pv.absorbed) {
    t.spent += o.spent; t.dealt += o.dealt; t.kills += o.kills; t.income += o.income;
    G.vortex.push({ x: o.x, y: o.y + 1.5, z: o.z, to: t, t: 0, dur: 1.5 });
    absorbTower(o);
  }
  t.spent += total; t.paragon = true; t.degree = pv.degree; t.st = paragonStats(t.kind, pv.degree); t.bossX = t.st.bossX;
  t.ability = PARAGON[t.kind].ability; t.abMax = ABILITY[t.ability].cd / (1 + .008 * pv.degree); t.abCd = 0; t.abUses = 0;
  t.brew = null; t.acidCoat = null; t.mintsLeft = undefined;
  for (const m of t.men) m.lvlUp = true;
  t.begin();
  fxTimed(4, t.x, t.y + .1, t.z, 7, 7, 3, 2.2, .8, .7, 1.2, { ground: true }); lightFlash(t.x, t.y + 4, t.z, 0xffc870, 2400, .8, 40);
  sfx('hornBoss', t.x, t.z, .7); sfx('ignite', t.x, t.z, 1, .2); FX.shake = Math.min(1.2, FX.shake + .5);
  UI.banner(PARAGON[t.kind].name + ' · Degree ' + pv.degree, 3.2, true);
  return true;
}
// remove a tower that is being absorbed: no rubble, no refund; its light, footmen and footprint are freed
function absorbTower(o) {
  o.alive = false; removeEmitter(o.em); o.pad.tower = null;
  for (const m of o.men) m.leave = true;
  o.clearModel(false); R.scene.remove(o.group);
  const i = G.towers.indexOf(o); if (i >= 0) G.towers.splice(i, 1);
  fxDust(o.x, o.y + .3, o.z, 10, 1.2, { speed: 1.6 }); fxEmbers(o.x, o.y + 1, o.z, 24, .5);
}

// ---------- the six Paragon abilities ----------
Object.assign(ABILITY, {
  solarflare: { name: 'Solar Flare', kind: 'archer', path: 2, cd: 60 },
  meteor: { name: 'Meteor Fall', kind: 'bombard', path: 2, cd: 60 },
  eye: { name: 'Eye of the Storm', kind: 'spire', path: 2, cd: 60 },
  crusade: { name: 'Crusade', kind: 'guard', path: 2, cd: 60 },
  obsidian: { name: 'Obsidian Rain', kind: 'forge', path: 2, cd: 60 },
  transmute: { name: 'Grand Transmutation', kind: 'alch', path: 2, cd: 60 },
});
ABILITY_ORDER.push('solarflare', 'meteor', 'eye', 'crusade', 'obsidian', 'transmute');
Object.assign(ABILITY_ANYTIME, { crusade: 1, obsidian: 1 });
Object.assign(ABILITY_FX, {
  // Solar Flare: a sunbeam sweeps the whole road, burning everything on it
  solarflare(t, mons) {
    const B = G.B; for (let s = 0; s < B.L - 2.5; s += 2.5) { const a = pathAt(B, s, { x: 0, y: 0, z: 0, tx: 0, tz: 0 }), b = pathAt(B, s + 2.5, { x: 0, y: 0, z: 0, tx: 0, tz: 0 }); fxBolt([a.x, a.y + .6, a.z], [b.x, b.y + .6, b.z], .35, [3, 2.4, 1.1], .16); }
    for (const m of mons) { hitMonster(m, t.st.dmg * 40 * (m.def.boss ? PG_BOSS_BURST : 1), 'beam', 0, 0, t, { pierce: true, crit: true }); fxSparks(m.x, m.y + m.hitH, m.z, 4, 2.4, 3.2, 2.6, 1.2, { size: .05 }); }
    UI.flash && UI.flash([1.4, 1.1, .5], .5); sfx('zap', t.x, t.z, 1.2, .8); sfx('ignite', t.x, t.z, 1, .3); lightFlash(t.x, t.y + 6, t.z, 0xffe0a0, 2400, .6, 60);
  },
  // Meteor Fall: eight giant burning shells on the densest crowds, each leaving a crater
  meteor(t, mons) {
    const cand = mons.filter(m => !m.fly).sort((a, b) => b.hp - a.hp), picks = [];
    for (const m of cand) { if (picks.length >= 8) break; if (picks.every(p => dist2(p.x, p.z, m.x, m.z) > 6)) picks.push(m); }
    for (let i = 0; picks.length && picks.length < 8; i++) picks.push(picks[i % picks.length]);
    if (!picks.length) return false;
    picks.forEach((m, i) => { const gy = G.B.heightAt(m.x, m.z); G.shells.push({ x0: m.x + rr(-3, 3), y0: gy + 22, z0: m.z + rr(-3, 3), tx: m.x, ty: gy + .05, tz: m.z, t: 0, T: 1.1, delay: i * .2, dmg: t.st.dmg * 8, craterDmg: t.st.dmg, bossBurst: PG_BOSS_BURST, splash: 3, tower: t, x: m.x, y: gy + 22, z: m.z, sm: 0, arc: .3, shred: true, armorX: 1.5, stun: 1.5, bossStun: .3, kb: 3, crater: true, tint: [2.6, 1.2, .5] }); });
    sfx('hornBoss', t.x, t.z, .5); FX.shake = Math.min(1.2, FX.shake + .4);
  },
  // Eye of the Storm: a bolt from the sky on every monster on the map
  eye(t, mons) { mons.slice(0, 60).forEach((m, i) => t.boltQ.push({ t: i * .03, m, k: 30 * (m.def.boss ? PG_BOSS_BURST : 1), brittle: true })); sfx('charge', t.x, t.z, 1.2, 1); lightFlash(t.x, t.y + 8, t.z, 0xc0e0ff, 2400, .6, 60); },
  // Crusade: the paladins cannot be hurt and every tower fires half again as fast, for eight seconds
  crusade(t) { t.crusadeT = 8; for (const f of t.men) if (!f.dead) f.hp = f.maxHp; fxTimed(4, t.x, t.y + .1, t.z, 14, 14, 2.6, 2.1, 1, .5, 1, { ground: true }); sfx('horn', t.x, t.z, 1, .4); sfx('clash', t.x, t.z, 1, .2); },
  // Obsidian Rain: mega mines along the whole road
  obsidian(t) {
    const B = G.B, st = t.st;
    for (let s = 3; s < B.L - 2; s += 2.2) { const p = pathAt(B, s, { x: 0, y: 0, z: 0, tx: 0, tz: 0 }); addPile(p.x - p.tz * rr(-.4, .4), p.z + p.tx * rr(-.4, .4), 25, st.dmg, t, { redhot: true, bomb: true, shred: true, mega: true, gilded: true, life: 1 }); }
    sfx('clink', t.x, t.z, 1.3, .1); sfx('explode', t.x, t.z, .6, .2); FX.shake = Math.min(1.2, FX.shake + .3);
  },
  // Grand Transmutation: every monster in volatile, corrosive acid; kill bounty doubled for ten seconds
  transmute(t, mons) {
    for (const m of mons) { applyAcid(m, t.st.acid * 2, 10, t); m.volatile = true; m.corrode = true; }
    G.goldRushT = 10; UI.flash && UI.flash([1.2, 1.3, .4], .6); sfx('flask', t.x, t.z, 1.3, .2); sfx('mint', t.x, t.z, 1, .5);
  },
});

// a sunbeam: hits everything along a line, wraiths and armor included
function paragonBeam(t, x0, y0, z0, dx, dz, len, dmg) {
  const l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l, x1 = x0 + ux * len, z1 = z0 + uz * len;
  fxBolt([x0, y0, z0], [x1, y0 - 1, z1], .3, [3.2, 2.5, 1.1], .14); fxBolt([x0, y0, z0], [x1, y0 - 1, z1], .2, [2, 1.4, .5], .3);
  for (const m of G.mons) {
    if (m.dead || m.hp <= 0 || !m.vis) continue;
    const px = m.x - x0, pz = m.z - z0, along = px * ux + pz * uz; if (along < 0 || along > len) continue;
    if (Math.abs(px * uz - pz * ux) < .6 + m.rad) { hitMonster(m, dmg, 'beam', ux, uz, t, { pierce: true, crit: true }); fxSparks(m.x, m.y + m.hitH, m.z, 3, 2, 3.2, 2.5, 1.1, { size: .05 }); }
  }
  lightFlash(x0 + ux * len * .5, y0, z0 + uz * len * .5, 0xffe0a0, 600, .2, 20); sfx('zap', t.x, t.z, .7, .9);
}

// per frame: absorb vortices, Paragon auras, and timed effects
function updateParagon(dt) {
  if (G.goldRushT > 0) G.goldRushT -= dt;
  for (let i = G.vortex.length - 1; i >= 0; i--) {
    const v = G.vortex[i]; v.t += dt; if (v.t > v.dur || !v.to.alive) { G.vortex.splice(i, 1); continue; }
    // embers spiral from the absorbed tower into the ascending one
    for (let k = 0; k < 3; k++) {
      const life = rr(.5, .8), a = v.t * 9 + k * 2.1, r = .6 * (1 - v.t / v.dur), tx = v.to.x, ty = v.to.y + 2.5, tz = v.to.z, sx = v.x + Math.cos(a) * r, sz = v.z + Math.sin(a) * r;
      fxPart(sx, v.y, sz, (tx - sx) / life, (ty - v.y) / life + 2 * life, (tz - sz) / life, life, rr(.06, .1), 3.2, 1.7, .5, { grav: 4 });
    }
  }
  for (const t of G.towers) {
    if (!t.alive || !t.paragon || t.state !== 'active') continue;
    if (t.crusadeT > 0) t.crusadeT -= dt;
    const pulse = .5 + .5 * Math.sin(G.t * 2 + t.idx);
    FX.add.push(t.x, t.y + .08, t.z, 3.4 + .3 * pulse, 3.4 + .3 * pulse, 0, 0, 2.6, 1.9, .7, .22 + .1 * pulse, 4, 0, .52, 1);
    if (rnd() < dt * 6) fxPart(t.x + rr(-1, 1), t.y + rr(.3, 1.5), t.z + rr(-1, 1), 0, rr(.8, 1.6), 0, rr(.8, 1.4), rr(.05, .08), 3, 1.9, .6, { drag: .6, rise: .5 });
  }
}
