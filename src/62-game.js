
Object.assign(G, {
  press: 1, bountyMul: 1, dmgMul: 1, waveKills: 0, waveLeaks: 0, leaks: 0, leakTypes: {}, slowmo: 0, bossDown: false,
  queue: [], waveT: 0, nextIn: 0, spawning: false, bossWave: false, bossAlive: false, k: 0, phaseT: 0, banner: null, started: false, timeScale: 1, trickle: 0, clearT: 0, paused: false, speed: 1, best: 0, seen: {},
  endless: false, choice: false,
});

function waveNumber() { return G.level * 5 + (G.phase === 'rise' ? 1 : Math.max(1, G.k)); }
const ROSTER = {
  skel: [4, 3, 6, .5, 1, 5], rat: [1.7, 5, 9, .2, 2, 3], bat: [4.2, 3, 5, .35, 2, 1.3], ghoul: [5.5, 2, 4, .4, 2, 2],
  slime: [9.5, 1, 3, .9, 3, 2], spider: [3, 3, 6, .25, 3, 2], scarab: [1.9, 5, 8, .18, 2, 0], knight: [12.5, 1, 3, .5, 4, 2], wolf: [5.5, 2, 4, .35, 4, 1.6], bomber: [6, 1, 2, .8, 4, 1.2],
  wraith: [9, 1, 3, .7, 5, 1.4], toad: [8, 1, 3, .7, 5, .7], wisp: [2.6, 4, 7, .22, 5, .8], drummer: [13, 1, 1, 1, 6, .9], gargoyle: [11, 1, 3, .6, 6, .9],
  necro: [18, 1, 1, 1.2, 7, .9], mummy: [15, 1, 2, .9, 7, .9], brute: [32, 1, 1, 2, 8, .7], golem: [40, 1, 1, 2, 8, .7], brood: [30, 1, 1, 2, 9, .6],
};
function waveMenu(k, level) {
  const w = level * 5 + k, bio = G.B.bio, menu = [];
  for (const ty in ROSTER) {
    const r = ROSTER[ty], mul = bio.mobs[ty] === undefined ? 1 : bio.mobs[ty], un = Math.min(r[4], bio.early[ty] || 99), wt = r[5] ? r[5] * mul : (bio.mobs[ty] || 0);
    if (w >= un && wt > 0) menu.push([ty, wt * (w === un && w > 1 ? 2.2 : 1)]);
  }
  return menu;
}
function bossType() { const b = G.B.bio.boss; return b[Math.floor(G.level / BIOMES.length) % b.length]; }

// ---- Endless (hold the pass) ----
const ENDLESS_BOSSES = ['giant', 'jotun', 'queen', 'colossus', 'king', 'ogre'];
// waves past 5 while holding a pass; 0 outside Endless
function endlessDepth(w) { return G.endless ? Math.max(0, w - 5) : 0; }
// the bosses of an Endless boss wave: rotate from this land's own boss, 2 from wave 20, 3 from wave 30
function endlessBosses(w) {
  const start = Math.max(0, ENDLESS_BOSSES.indexOf(G.B.bio.boss[0])), n = w >= 45 ? 4 : w >= 30 ? 3 : w >= 20 ? 2 : 1, out = [];
  for (let i = 0; i < n; i++) out.push(ENDLESS_BOSSES[(start + Math.floor(w / 5) - 1 + i) % ENDLESS_BOSSES.length]);
  return out;
}
function waveBosses(w) { return G.endless ? endlessBosses(w) : [bossType()]; }
// gold falls off past wave 15 in Endless so the economy can't run away
function endlessTaper(w) { return G.endless && w > 15 ? Math.max(.25, Math.pow(.93, w - 15)) : 1; }
function endlessBounty(w) { return w > 15 ? Math.max(.25, (1 + .18 * 2) * Math.pow(.93, w - 15)) : 1 + .18 * G.level; }

function buildWave(k, level) {
  const q = [], boss = k === 5, lv = 1 + .25 * level, w = level * 5 + k, e = endlessDepth(w);
  // past wave 25 Endless monsters toughen another 5% a wave, so Paragons have something to do
  const eHp = (1 + .04 * e + .0015 * e * e) * (G.endless ? Math.pow(1.05, Math.max(0, w - 25)) : 1), spdMul = 1 + Math.min(.35, .012 * e);
  let budget = (34 + 25 * (k - 1)) * lv * G.press * (boss ? .7 : 1) * (1 + .03 * e), heavy = 0, air = budget * .42;
  const hpMul = (1 + .13 * (k - 1)) * (1 + .27 * level) * (.85 + .15 * G.press) * eHp;
  const menu = waveMenu(k, level), tot = menu.reduce((a, b) => a + b[1], 0);
  let t = .6;
  if (boss) waveBosses(w).forEach((type, i) => q.push({ t: 2.2 + i * 7, type, hpMul: (1 + .4 * level) * Math.pow(G.press, .4) * eHp * (G.endless ? 1 + .04 * Math.max(0, w - 20) : 1), spdMul }));
  while (budget > 0) {
    let r = rnd() * tot, type = 'skel'; for (const [ty, w] of menu) { r -= w; if (r <= 0) { type = ty; break; } }
    let R = ROSTER[type];
    if (R[0] > budget + 5 || (R[0] >= 30 && heavy >= 1 + (level >> 1)) || (MON[type].fly && air <= 0)) { type = 'skel'; R = ROSTER.skel; }
    if (R[0] >= 30) heavy++;
    const n = Math.floor(rr(R[1], R[2] + .999)), gap = R[3];
    for (let i = 0; i < n && budget > 0; i++) { q.push({ t, type, hpMul, spdMul }); t += gap * rr(.8, 1.25); budget -= R[0]; if (MON[type].fly) air -= R[0]; }
    t += rr(1.1, 2.3) * (boss ? 1.5 : 1);
  }
  q.sort((a, b) => a.t - b.t);
  return q;
}
function startWave() {
  saveRun();
  if (G.runMode === 'player') noteLandBest(G.B.bio.key, G.level * 5 + G.k % 5 + 1);  // the state just before this wave spawns (written to storage while the player commands)
  G.k = G.k % 5 + 1; if (G.endless) G.bountyMul = endlessBounty(G.level * 5 + G.k); G.queue = buildWave(G.k, G.level); if (waveNumber() > G.best) { G.best = waveNumber(); try { localStorage.setItem('cinderwatch.best', '' + G.best); } catch (e) {} } G.waveT = 0; G.spawning = true; G.bossWave = G.k === 5; G.waveKills = 0; G.waveLeaks = 0; G.bossDown = false; G.trickle = 6; G.trickleN = 0;
  sfx(G.bossWave ? 'hornBoss' : 'horn', G.B.cave.x, G.B.cave.z, 1.1);
  UI.banner(G.bossWave ? 'Wave ' + waveNumber() + ' · ' + waveBosses(waveNumber()).map(b => MON[b].name).join(' & ') : 'Wave ' + waveNumber(), G.bossWave ? 3.6 : 2.2, G.bossWave);
}
function endWave() {
  const l = G.waveLeaks;
  if (l === 0) G.press *= 1.17; else if (l >= 6) G.press *= .8; else if (l >= 3) G.press *= .9;
  if (G.lives <= 6) G.press *= .9;
  G.press = clamp(G.press, .6, 2.2);
  G.gold += loanCut(Math.round((24 + 9 * G.k + 10 * G.level) * endlessTaper(G.level * 5 + G.k)));
  newTowersWaveEnd();
  G.firePatches = G.firePatches.filter(f => !f.wave);  // Cataclysm craters last one wave
  for (const t of G.towers) t.abUses = 0;  // War Chest uses are counted per wave
  // Quartermaster supply wagons pay out at the end of every wave (tapered in long Endless runs like all gold)
  for (const t of G.towers) if (t.alive && t.st.income) { const v = Math.round(t.st.income * endlessTaper(G.level * 5 + G.k)); G.gold += v; t.income += v; UI.coinFrom(t.x, t.y + 2.2, t.z, 0); fxSparks(t.x, t.y + 2, t.z, 10, 2.6, 3.2, 2.4, .8, { size: .06, grav: 4 }); }
}
// War banners: towers near a Quartermaster post's footmen work faster
function updateBanners() {
  for (const t of G.towers) t.haste = 1;
  // Grand Bastion: inspires every tower in range; Crusade speeds every tower on the field
  for (const g of G.towers) if (g.alive && g.paragon && g.st.inspire) { const all = g.crusadeT > 0; for (const t of G.towers) if (t !== g && t.alive && (all || Math.hypot(t.x - g.x, t.z - g.z) < g.st.inspireR)) t.haste = Math.max(t.haste, all ? 1.5 : 1 + g.st.inspire); }
  for (const g of G.towers) {
    if (!g.alive || !g.st.banner) continue;
    for (const f of g.men) { if (f.dead || f.leave) continue; for (const t of G.towers) if (t !== g && t.alive && t.kind !== 'guard' && Math.hypot(t.x - f.x, t.z - f.z) < 4.5) t.haste = Math.max(t.haste, 1 + g.st.banner); }
  }
}
// a boss wave is over and the road is clear: the AI marches on; a player chooses, or keeps holding in Endless
function bossCleared() {
  // an Endless run is the player's choice: the AI keeps holding it too, and only the player can leave
  if (G.endless) { nextEndlessCycle(); UI.banner('The pass holds', 2.4, false); return; }
  if (!UI.playerActive()) { marchOn(); return; }
  G.choice = true; UI.banner('The pass holds', 2.4, false);
}
function nextEndlessCycle() {
  G.level++; G.k = 0; G.bossWave = false; G.dmgMul = 1.55 + .2 * G.level; G.nextIn = 6.5; G.clearT = 0;
}
function holdPass() {
  if (!G.choice || G.phase !== 'play') return false;
  G.choice = false; G.endless = true; nextEndlessCycle(); UI.banner('Holding the pass · Endless', 2.6, false); return true;
}
function marchOn() { G.choice = false; setPhase('clear'); return true; }
function canLeaveEndless() { return G.phase === 'play' && G.runMode !== 'player' && G.endless && !G.choice && !G.spawning && !G.bossWave && !G.mons.some(m => !m.dead); }
function leaveEndless() { return canLeaveEndless() ? marchOn() : false; }
function updateWaves(dt) {
  if (G.phase !== 'play') return;
  const B = G.B;
  if (G.spawning) {
    G.waveT += dt;
    while (G.queue.length && G.queue[0].t <= G.waveT) {
      if (G.mons.length > 84) break;
      const e = G.queue.shift(); spawnMonster(e.type, { hpMul: e.hpMul, spdMul: e.spdMul });
    }
    if (!G.queue.length) {
      G.bossAlive = G.mons.some(m => m.def.boss && !m.dead);
      if (G.bossWave && G.bossAlive) {
        G.trickle -= dt;
        if (G.trickle <= 0 && G.trickleN < 9) { G.trickleN++; G.trickle = rr(3.2, 4.6); const tm = waveMenu(5, G.level).filter(e => ROSTER[e[0]][0] < 13), ty = tm[Math.floor(rnd() * tm.length)][0], n = Math.max(1, Math.min(5, Math.round(8 / ROSTER[ty][0]))), hpMul = (1 + .5) * (1 + .22 * G.level); for (let i = 0; i < n; i++) G.queue.push({ t: G.waveT + i * .4, type: ty, hpMul }); }
      } else { G.spawning = false; endWave(); G.nextIn = G.bossWave ? -1 : 6.5; G.clearT = 0; }
    }
  } else if (G.bossWave) {
    if (G.choice) { if (!UI.playerActive()) marchOn(); }
    else { G.clearT += dt; if (!G.mons.some(m => !m.dead) || G.clearT > 40) bossCleared(); }
  } else if (G.prep) {
    prepAI(dt);
  } else {
    G.nextIn -= dt;
    if (G.nextIn <= 0) startWave();
  }
  if (G.lives <= 0 && G.phase === 'play') setPhase('defeat');
}
// ---- preparation: before wave 1 of a player run (and on a resumed run) nothing comes until the player says so ----
G.prep = false; G.prepAiT = 0;
// the next wave's number, for the Start Wave button
function prepWave() { return G.level * 5 + G.k + 1; }
// before wave 1 has ever started, a sale refunds everything, so opening layouts can be tried freely
function prepFullRefund() { return G.prep && G.level === 0 && G.k === 0; }
function sellRefund(t) { return Math.round(t.spent * (prepFullRefund() ? 1 : .6)); }
function startPrepWave() {
  if (!G.prep || G.phase !== 'play') return false;
  G.prep = false; G.nextIn = 0; G.prepAiT = 0; startWave(); return true;
}
// the AI, if handed command while the player prepares, builds its opener and then starts the wave itself
function prepAI(dt) {
  if (UI.playerActive()) { G.prepAiT = 0; return; }
  G.prepAiT += dt;
  const cheapest = Math.min(...TOWER_KINDS.map(k => TOWER[k].cost[0])), building = G.towers.some(t => t.alive && t.state !== 'active');
  if (G.prepAiT > 1.2 && !building && (G.gold < cheapest || AI.wait >= 1.5 || G.prepAiT > 15)) startPrepWave();
}
function callWaveEarly() { if (G.phase === 'play' && !G.prep && !G.spawning && !G.bossWave && G.nextIn > .4) { G.gold += Math.round(G.nextIn * 3); G.nextIn = .05; return true; } return false; }

function buildTower(pad, kind, byPlayer) {
  const def = TOWER[kind]; if (pad.tower || G.gold < def.cost[0] || G.phase !== 'play') return null;
  G.gold -= def.cost[0]; UI.goldShown = Math.min(UI.goldShown, G.gold);
  G.towerSeq = (G.towerSeq || 0) + 1;
  const t = new Tower(pad, kind, G.towerSeq); G.towers.push(t); UI.ping(pad.x, pad.y, pad.z, byPlayer); return t;
}
// build on open ground: the spot's ground check becomes the tower's virtual pad
function buildTowerAt(x, z, kind, byPlayer) {
  const g = canPlaceTower(x, z, kind); if (!g.ok || G.gold < TOWER[kind].cost[0]) return null;
  return buildTower({ x: g.x, y: g.y, z: g.z, s: g.s, face: g.face, depth: g.depth, tower: null }, kind, byPlayer);
}
// buy the next tier on path i (0 = A, 1 = B)
function upgradeTower(t, i, byPlayer) {
  if (!t || t.state !== 'active' || G.phase !== 'play' || !canUpgradePath(t, i)) return false; const c = pathCost(t, i); if (G.gold < c) return false;
  G.gold -= c; UI.goldShown = Math.min(UI.goldShown, G.gold); t.upgrade(i); UI.ping(t.x, t.y, t.z, byPlayer); return true;
}
function sellTower(t) {
  if (!t || !t.alive || G.phase !== 'play') return false; const refund = sellRefund(t);
  if (t.kind === 'foundry' && t.bankStored > 0) collectVault(t);  // selling a bank pays out its vault first
  G.gold += refund; t.sell(); const i = G.towers.indexOf(t); if (i >= 0) G.towers.splice(i, 1); return true;
}

const AI = { think: .15, wait: 0, last: '' };
// the AI fires its tier-3 abilities when a boss is out or the road gets heavy; War Chest whenever it is ready
function aiAbilities() {
  const mons = G.mons.filter(m => !m.dead && m.hp > 0 && m.vis), boss = mons.some(m => m.def.boss);
  const late = mons.some(m => m.s > G.B.L * .78), heavy = mons.length >= 20 || late;
  const want = { deadeye: boss, overload: boss || heavy, barrage: boss || heavy, permafrost: boss || late, storm: heavy, scorch: heavy, rally: heavy || boss, chest: true,
    carpet: boss || heavy, fortify: heavy || late, overbrew: boss || heavy, blight: boss || heavy, bullion: true, loan: !G.loanDebt.length && G.gold < 300,
    solarflare: boss || heavy, meteor: boss || heavy, eye: boss || heavy, crusade: boss || late, obsidian: heavy || late, transmute: boss || heavy };
  for (const key of ABILITY_ORDER) if (want[key] && useAbility(key)) return;
}
function aiThink(dt) {
  if (G.phase !== 'play' || UI.playerActive()) return;
  AI.think -= dt; if (AI.think > 0) return; AI.think = .5;
  aiAbilities();
  const B = G.B, towers = G.towers.filter(t => t.alive), N = towers.length;
  if (!B.spots) buildSpots(B);
  const watch = roadWatch(B, towers), crowd = 1 / (1 + Math.max(0, N - 10) * .15);
  const cnt = {}; for (const k of TOWER_KINDS) cnt[k] = 0; for (const t of towers) cnt[t.kind]++;
  // the foundry is chosen separately below; alchemists wait for a few towers worth brewing for
  const ideal = { archer: .3, bombard: .19, spire: .17, guard: .14, forge: .1, alch: N >= 4 ? .1 : 0, foundry: 0 };
  const lt = G.leakTypes; let air = 0, armor = 0, swarm = 0; for (const ty in lt) { const c = MON[ty].cat; if (c === 'air') air += lt[ty]; else if (c === 'armor') armor += lt[ty]; else if (c === 'swarm') swarm += lt[ty]; }
  const gatePress = sat(G.leaks / 8);
  const opts = [];
  for (const kind of TOWER_KINDS) {
    const def = TOWER[kind]; if (!ideal[kind]) continue;
    let need = ideal[kind] * (N + 1.6) - cnt[kind] + .35;
    if (kind === 'archer') need += air * .2 + (N === 0 ? 1 : 0); if (kind === 'spire') need += air * .12 + armor * .1; if (kind === 'bombard') need += armor * .08 + swarm * .06 + (N >= 2 && cnt.bombard === 0 ? .5 : 0); if (kind === 'guard') need += swarm * .04 + (N >= 1 && cnt.guard === 0 ? .9 : 0);
    if (kind === 'forge') need += swarm * .05 + gatePress * .4 - (N < 2 ? 1 : 0);
    if (need <= 0) continue;
    for (const pad of B.spots.top[kind]) {
      if (towerAt(pad.x, pad.z)) continue;
      const cov = spotValue(B, pad, kind, watch);
      let sc = need * (.55 + cov * .5) * crowd;
      const rel = pad.s / B.L;
      if (N < 2) sc *= 1 - Math.abs(rel - .42) * .9;
      sc *= 1 + gatePress * (rel - .5) * .8;
      let syn = 0;
      for (const t of towers) { const d = Math.hypot(t.x - pad.x, t.z - pad.z); if (kind === 'guard' && t.kind !== 'guard' && d < t.range + 1.5) syn += .16; if (kind !== 'guard' && t.kind === 'guard' && d < def.range[0] + 1) syn += .2; if (t.kind === kind && d < 6) syn -= .12; }
      // forges near the gate end of the road; alchemists beside the strongest towers
      if (kind === 'forge') sc *= .5 + rel;
      if (kind === 'alch') { let str = 0; for (const t of towers) if (t.kind !== 'alch' && t.kind !== 'foundry' && Math.hypot(t.x - pad.x, t.z - pad.z) < TOWER.alch.range[0]) str += 1 + t.tier; sc *= .3 + str * .18; for (const t of towers) if (t.kind === 'alch' && Math.hypot(t.x - pad.x, t.z - pad.z) < 6) syn -= .4; }
      if (kind === 'guard') { sc *= .8 + .5 * rel; for (const t of towers) if (t.kind === 'guard' && Math.abs(t.pad.s - pad.s) < 9) syn -= .5; }
      sc *= 1 + syn;
      opts.push({ sc, cost: def.cost[0], act: 'build', kind, pad });
    }
  }
  // one or two foundries, early in a calm land, on open ground away from the road
  if (N >= 3 && cnt.foundry < 2 && G.leaks === 0 && G.k <= 3) {
    const sp = B.spots.all.find(p => p.road > 3.5 && !towerAt(p.x, p.z) && groundCheck(B, p.x, p.z, 'foundry').ok);
    if (sp) opts.push({ sc: cnt.foundry ? .55 : .9, cost: TOWER.foundry.cost[0], act: 'build', kind: 'foundry', pad: sp });
  }
  // upgrades: each open path is its own option, weighted by what has been getting through
  const bossSoon = G.k >= 3 || G.bossWave, ghosts = (lt.wraith || 0), calm = G.leaks === 0 && N >= 4;
  const pathPref = (kind, i, t) => {
    if (kind === 'forge') return i === 0 ? 1 + armor * .1 + (bossSoon ? .3 : 0) : 1 + swarm * .08;
    if (kind === 'alch') { let n = 0; for (const o of towers) if (o !== t && o.kind !== 'alch' && o.kind !== 'foundry' && Math.hypot(o.x - t.x, o.z - t.z) < t.st.range) n++; return i === 0 ? .7 + n * .15 : 1 + swarm * .05 + armor * .05; }
    if (kind === 'foundry') return i === 0 ? 1.2 : .9;
    if (kind === 'archer') return i === 0 ? 1 + swarm * .08 : 1 + armor * .1 + air * .06 + ghosts * .15;
    if (kind === 'bombard') return i === 0 ? 1 + armor * .1 + (bossSoon ? .4 : 0) : 1 + swarm * .08 + .1;
    if (kind === 'spire') return i === 0 ? 1 + armor * .05 + (bossSoon ? .4 : 0) : 1 + air * .06 + swarm * .04 + .1;
    return i === 0 ? 1 + swarm * .06 + gatePress * .5 : 1 + (calm ? .5 : 0) + (G.k <= 2 ? .2 : 0) - gatePress * .5;
  };
  for (const t of towers) {
    if (t.state !== 'active') continue;
    const use = sat(t.recent / 60), lead = t.paths[0] === t.paths[1] ? -1 : t.paths[0] > t.paths[1] ? 0 : 1;
    for (const i of [0, 1]) {
      if (!canUpgradePath(t, i)) continue;
      const c = pathCost(t, i), nx = t.paths[i] + 1;
      let sc = (.5 + use * .9 + (t.tier === 0 ? .12 : 0)) * (N >= 4 ? 1.25 : .7) * (N >= 11 ? 1.6 : 1) * (110 / c) * (nx === 3 ? 1.6 : 1);
      sc *= Math.max(.3, pathPref(t.kind, i, t)) * (lead === i ? 1.3 : lead === 1 - i ? .85 : 1);
      opts.push({ sc, cost: c, act: 'up', t, path: i });
    }
  }
  if (!opts.length) return;
  opts.sort((a, b) => b.sc - a.sc);
  let pick = opts[0];
  if (pick.cost > G.gold) {
    AI.wait += .5;
    const aff = opts.find(o => o.cost <= G.gold && o.sc > pick.sc * (AI.wait > 9 ? .45 : .8));
    if (!aff) return; pick = aff;
  }
  AI.wait = 0;
  if (pick.act === 'build') {
    const t = buildTowerAt(pick.pad.x, pick.pad.z, pick.kind, false);
    // bombards built for armored leaks or a boss (current wave or the next) focus the toughest monster
    if (t && t.kind === 'bombard' && (armor > 0 || G.bossWave || G.k >= 4)) t.targetMode = 'strong';
  } else upgradeTower(pick.t, pick.path, false);
  AI.think = N < 3 ? .12 : .8;
}

function setPhase(p) {
  G.phase = p; G.phaseT = 0;
  if (p === 'clear') { G.advance = true; UI.banner('The pass holds', 3.2, false); UI.closeMenu(); }
  if (p === 'defeat') { if (G.runMode === 'player') playerDefeat(); else clearRunSave(); UI.banner('The beacon is out', 4.2, true); UI.closeMenu(); sfx('beaconOut', G.B.beacon.x, G.B.beacon.z, 1.2); fxEmbers(G.B.beacon.x, G.B.beacon.y, G.B.beacon.z, 60, .8); for (let i = 0; i < 14; i++) fxSmoke(G.B.beacon.x + rr(-.4, .4), G.B.beacon.y + rr(0, 1), G.B.beacon.z + rr(-.4, .4), rr(-.3, .3), rr(.8, 2), rr(-.3, .3), rr(2, 4), 1, 2, .2, .2, .22, .6, { drag: .5, rise: .2 }); }
  if (p === 'crumble') startCrumble();
  if (p === 'rise') startRise();
}
function startCrumble() {
  const B = G.B;
  for (const m of G.mons) if (!m.dead) { shatter(e => rigMonster(e), m, [0, 1, 0], { spread: 1.2, life: 1 }); removeMonster(m); }
  for (const f of G.men) if (!f.dead) { f.weapon = KIT.item.blade; shatter(e => rigHuman(KIT.foot, SPEC.foot, e), f, [0, 1, 0], { spread: 1, life: 1 }); f.dead = f.gone = true; f.alive = false; if (f.flame) removeFlame(f.flame); }
  G.mons.length = 0; G.men.length = 0; G.arrows.length = 0; G.shells.length = 0; G.stuck.length = 0; G.firePatches.length = 0; G.piles.length = 0; G.vortex.length = 0; G.goldRushT = 0;
  for (const t of G.towers) {
    removeEmitter(t.em); removeFlame(t.flame); removeFlame(t.flame2); t.flame = t.flame2 = null; t.archers.length = 0; t.alive = false; t.state = 'gone';
    let best = null, bd = 1e9; for (const p of B.pieces) if (p.kind === 'chunk') { const d = dist2(p.cx, p.cz, t.x, t.z); if (d < bd) { bd = d; best = p; } }
    if (best) best.mesh.attach(t.group);
  }
  for (const f of B.flames) removeFlame(f); B.flames.length = 0;
  for (const p of B.pieces) { p.t = 0; p.delay = .25 + rnd() * .9 + sat((36 - (p.cx + p.cz)) / 72) * 1.3 + (p.kind !== 'chunk' ? .2 : 0); p.vy = 0; }
  FX.groundAt = () => -500; clearFX(); setBoardCasting(B, true);
  sfx('crumble', 0, 0, 1.3); FX.shake = 1.2;
}
function startRise() {
  if (G.B) { for (const t of G.towers) { t.clearModel(false); } G.towers.length = 0; clearDebris(); disposeBoard(G.B); }
  clearEmitters();
  const B = G.B = buildBoard(G.boardSeed++, G.boardIndex++);
  R.scene.add(B.group); activateBoard(B, false);
  setBoardCasting(B, true);
  for (const p of B.pieces) { p.t = 0; p.delay = sat((p.cx + p.cz + 36) / 72) * 1.7 + rnd() * .25 + (p.kind === 'chunk' ? 0 : 2.0 + rnd() * .3); p.mesh.visible = false; }
  sfx('rise', 0, 0, 1.2); UI.banner(B.bio.name, 3.6, false);
}
function activateBoard(B, lit) {
  B.flames = [];
  const b = B.beacon;
  B.beaconFlame = addFlame({ x: b.x, y: b.y - .12, z: b.z, size: 2.3, layers: 3, embers: 2.6, glow: 1.1, smoke: 5, on: lit ? 1 : 0 }); B.flames.push(B.beaconFlame);
  for (const f of B.fires) B.flames.push(addFlame(Object.assign({ x: f.x, y: f.y, z: f.z, size: f.size, embers: .5, glow: .8, on: lit ? 1 : 0 }, f.fx)));
  LT.beaconPos = b; LT.beaconOn = lit ? 1 : 0; LT.beaconLevel = 1; LT.envSrc = B.env.slice(0, LT.env.length); LT.envK = lit ? 1 : 0; setBiomeLook(B, lit);
  FX.groundAt = B.heightAt;
  G.padCov = null;
}
function beginBattle(first) {
  const B = G.B;
  G.lives = G.maxLives; G.gold = 300 + 80 * G.level; G.bountyMul = 1 + .18 * G.level; G.dmgMul = 1.55 + .2 * G.level; G.press = lerp(G.press, 1, .5); UI.goldShown = G.gold; G.k = 0; G.leaks = 0; G.leakTypes = {}; G.spawning = false; G.bossWave = false; G.nextIn = first ? .9 : 1.6; G.queue = []; AI.think = .15; AI.wait = 0; G.endless = false; G.choice = false;
  G.prep = G.runMode === 'player'; G.prepAiT = 0;
  const n = G.prep ? 0 : 4 + Math.min(3, G.level);
  for (let i = 0; i < n; i++) spawnMonster(i === n - 1 && G.level > 0 ? 'knight' : 'skel', { s: B.cave.s + 2.2 + i * 1.15, lat: rr(-.7, .7), hpMul: 1 + .22 * G.level });
  G.phase = 'play'; G.phaseT = 0;
}
function updatePhase(dt) {
  G.phaseT += dt; const B = G.B, t = G.phaseT;
  updateBiomeLook(dt); LT.envK = damp(LT.envK, G.phase === 'crumble' ? 0 : (G.phase === 'rise' && t < 2.4 ? 0 : 1), 2, dt); LT.beaconMul = damp(LT.beaconMul, B.bio.beacon || 1, 2, dt);
  const want = G.phase === 'defeat' ? 0 : (G.phase === 'rise' ? (t > B.igniteAt ? 1 : 0) : 1);
  LT.beaconOn = damp(LT.beaconOn, want, want ? 3 : 1.6, dt);
  LT.beaconLevel = damp(LT.beaconLevel, G.lives / G.maxLives, 3, dt);
  if (B.beaconFlame) { const f = B.beaconFlame, lv = LT.beaconLevel; f.on = LT.beaconOn; f.size = 2.35 * (.42 + .58 * lv) * (1 - .32 * LT.beaconGutter); f.embers = 1 + 2 * lv + 6 * LT.beaconGutter; }
  for (let i = 1; i < B.flames.length; i++) B.flames[i].on = LT.beaconOn;
  if (G.phase === 'clear') { if (t > 2.6) setPhase('crumble'); }
  else if (G.phase === 'defeat') {
    for (const tw of G.towers) { tw.em.on = damp(tw.em.on, 0, 1.5 + tw.idx * .15, dt); if (tw.flame) tw.flame.on = tw.em.on; if (tw.flame2) tw.flame2.on = tw.em.on; }
    if (t > 4.4 && G.runMode !== 'player') { G.level = 0; G.press = Math.max(.8, G.press * .85); G.run++; setPhase('crumble'); }
  } else if (G.phase === 'crumble') {
    let done = true;
    for (const p of B.pieces) {
      const u = t - p.delay;
      if (u < 0) { p.mesh.position.set(p.cx + rr(-.03, .03) * sat(t * 2), p.cy, p.cz + rr(-.03, .03) * sat(t * 2)); done = false; continue; }
      const y = p.cy - 9 * u * u - u * 1.2; p.mesh.position.set(p.cx, y, p.cz); p.mesh.rotation.set(p.spin.x * u * .5, p.spin.y * u * .25, p.spin.z * u * .5);
      if (!p.dusted) { p.dusted = true; fxDust(p.cx, 0, p.cz, 5, 2.2, { speed: 2.5, life: 1.4 }); FX.shake = Math.min(1, FX.shake + .12); }
      if (y > -60) done = false; else p.mesh.visible = false;
    }
    if (done || t > 5.2) { if (G.advance) { G.level++; G.advance = false; } setPhase('rise'); }
  } else if (G.phase === 'rise') {
    let done = true;
    for (const p of B.pieces) {
      const u = (t - p.delay) / (p.kind === 'chunk' ? 1.15 : .8);
      if (u < 0) { done = false; continue; }
      p.mesh.visible = true;
      if (u >= 1) { p.mesh.position.set(p.cx, p.cy, p.cz); p.mesh.rotation.set(0, 0, 0); if (!p.set) { p.set = true; if (p.kind !== 'chunk') { fxDust(p.cx, p.cy + .2, p.cz, 12, 2.2, { speed: 3 }); FX.shake = Math.min(1, FX.shake + .3); sfx('hammer', p.cx, p.cz, 1, .1); } } continue; }
      done = false; const e = easeOut(u), k = 1 - e;
      if (p.kind === 'chunk') { p.mesh.position.set(p.cx, p.cy - 30 * k, p.cz); p.mesh.rotation.set(p.spin.x * k * .7, p.spin.y * k * .5, p.spin.z * k * .7); }
      else { const d = 1 - u * u; p.mesh.position.set(p.cx, p.cy + 16 * d, p.cz); p.mesh.rotation.set(0, 0, 0); }
    }
    if (done && !B.igniteAt) { B.igniteAt = t + .25; }
    if (B.igniteAt && t > B.igniteAt && !B.lit) { B.lit = true; sfx('ignite', B.beacon.x, B.beacon.z, 1.3, 1); lightFlash(B.beacon.x, B.beacon.y + 1, B.beacon.z, 0xffa050, 2600, .7, 60); fxEmbers(B.beacon.x, B.beacon.y, B.beacon.z, 50, .6); FX.shake = .5; }
    if (B.lit && t > B.igniteAt + .7) { setBoardCasting(B, false); beginBattle(false); }
  }
}
