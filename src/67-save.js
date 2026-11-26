// ---- Save & resume ----
// A run is saved as the state just before a wave spawns. The board is rebuilt from its seed, land index and starting land,
// which reproduce the same road, terrain and scenery exactly.
const SAVE_KEY = 'cinderwatch.save.v1', SAVE_VERSION = 1;

function runSnapshot() {
  if (!G.B || G.phase !== 'play') return null;
  const B = G.B, live = G.towers.filter(t => t.alive);
  return {
    v: SAVE_VERSION, at: Date.now(),
    seed: G.boardSeed - 1, index: G.boardIndex - 1, biomeStart: BIOME.start,
    runMode: G.runMode === 'demo' ? 'demo' : 'player', secondChanceUsed: !!G.secondChanceUsed, runBestStart: G.runBestStart || 0,
    level: G.level, k: G.k, endless: !!G.endless, gold: Math.round(G.gold), lives: G.lives, maxLives: G.maxLives,
    press: G.press, slain: G.slain, bountyMul: G.bountyMul, dmgMul: G.dmgMul, loanDebt: G.loanDebt.slice(),
    towers: live.map(t => ({ kind: t.kind, x: +t.x.toFixed(3), z: +t.z.toFixed(3), paths: t.paths.slice(), targetMode: t.targetMode, spent: t.spent, dealt: Math.round(t.dealt), kills: t.kills,
      income: t.income, paragon: !!t.paragon, degree: t.degree || 0, bankStored: Math.round(t.bankStored || 0), abCd: +(t.abCd || 0).toFixed(1) })),
    // caltrop piles that outlive the wave, by road position so they land in the same place on the rebuilt board
    piles: G.piles.filter(p => p.life >= 1 || p.gilded).map(p => { const q = pathNear(B, p.x, p.z, roadNearest(B, p.x, p.z)[1] * PATH_STEP, 30);
      return { s: +q.s.toFixed(3), lat: +q.lat.toFixed(3), n: p.n, max: p.max, dmg: p.dmg, life: p.life, redhot: p.redhot, bomb: p.bomb, gilded: p.gilded, shred: !!p.shred, mega: !!p.mega, owner: live.indexOf(p.tower) }; }),
  };
}
function writeSave(snap) { if (!snap) return false; try { localStorage.setItem(SAVE_KEY, JSON.stringify(snap)); return true; } catch (e) { return false; } }
// autosave: called at the start of every wave, before it spawns, while the player commands
function saveRun() { const s = runSnapshot(); G.waveSnap = s; if (s && UI.playerActive()) writeSave(s); return s; }
// the Save button: between waves the current state; mid-wave the snapshot from this wave's start (so kills can't be duplicated)
function saveRunManual() {
  const mid = G.spawning || G.mons.some(m => !m.dead) || G.bossWave;
  const snap = mid ? G.waveSnap : runSnapshot();
  return writeSave(snap) ? { mid, wave: snap.level * 5 + snap.k + 1 } : null;
}
function clearRunSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

// read and check a save; anything broken or from another version is cleared, never thrown
function loadRun() {
  let raw = null; try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { return null; }
  if (!raw) return null;
  let s = null; try { s = JSON.parse(raw); } catch (e) { clearRunSave(); return null; }
  const num = v => typeof v === 'number' && isFinite(v);
  const ok = s && s.v === SAVE_VERSION && [s.seed, s.index, s.biomeStart, s.level, s.k, s.gold, s.lives, s.maxLives].every(num) && Array.isArray(s.towers) && s.lives > 0 && s.k >= 0 && s.k <= 5;
  if (!ok) { clearRunSave(); return null; }
  s.towers = s.towers.filter(t => t && TOWER[t.kind] && num(t.x) && num(t.z) && Array.isArray(t.paths) && t.paths.length === 2);
  s.piles = Array.isArray(s.piles) ? s.piles.filter(p => p && num(p.s) && num(p.lat) && num(p.n)) : [];
  return s;
}
function resumeWave(s) { return s.level * 5 + s.k + 1; }
// the land a save is on, from its own starting land (not whatever the menu shows)
function saveLand(s) { const n = BIOMES.length; return BIOMES[(((s.biomeStart | 0) + s.index) % n + n) % n]; }

// rebuild a saved run in place of whatever is on screen, and hand the player command
function restoreRun(s) {
  // clear the current battlefield
  clearBattlefield();
  // the same board, from its seed, land index and starting land
  BIOME.start = s.biomeStart;
  const B = G.B = buildBoard(s.seed, s.index); G.boardSeed = s.seed + 1; G.boardIndex = s.index + 1;
  R.scene.add(B.group); activateBoard(B, true); setBoardCasting(B, false);
  Object.assign(G, { level: s.level, k: s.k, endless: !!s.endless, gold: s.gold, lives: s.lives, maxLives: s.maxLives, press: num0(s.press, 1), slain: num0(s.slain, 0),
    bountyMul: num0(s.bountyMul, 1), dmgMul: num0(s.dmgMul, 1.55), loanDebt: Array.isArray(s.loanDebt) ? s.loanDebt.slice(0, 4) : [],
    choice: false, spawning: false, bossWave: false, queue: [], nextIn: 0, prep: true, prepAiT: 0, leaks: 0, leakTypes: {}, phase: 'play', phaseT: 0, paused: false, clearT: 0, goldRushT: 0 });
  UI.goldShown = G.gold;
  // towers: exactly as saved, finished at once (no scaffolding)
  const made = [];
  for (const d of s.towers) {
    const g = groundCheck(B, d.x, d.z, null), pad = g.ok ? { x: g.x, y: g.y, z: g.z, s: g.s, face: g.face, depth: g.depth, tower: null } : (() => { const r = roadNearest(B, d.x, d.z); return { x: d.x, y: B.heightAt(d.x, d.z) + .3, z: d.z, s: r[1] * PATH_STEP, face: Math.atan2(B.px[r[1]] - d.x, B.pz[r[1]] - d.z), depth: .3, tower: null }; })();
    G.towerSeq = (G.towerSeq || 0) + 1;
    const t = new Tower(pad, d.kind, G.towerSeq);
    t.paths = [clamp(d.paths[0] | 0, 0, 3), clamp(d.paths[1] | 0, 0, 3)];
    t.targetMode = TARGET_MODES.includes(d.targetMode) ? d.targetMode : 'first';
    t.spent = num0(d.spent, t.spent); t.dealt = num0(d.dealt, 0); t.kills = num0(d.kills, 0); t.income = num0(d.income, 0); t.bankStored = num0(d.bankStored, 0);
    if (d.paragon && PARAGON[d.kind]) { t.paragon = true; t.degree = clamp(d.degree | 0, 1, 100); t.st = paragonStats(d.kind, t.degree); t.bossX = t.st.bossX; t.ability = PARAGON[d.kind].ability; t.abMax = ABILITY[t.ability].cd / (1 + .008 * t.degree); }
    else { t.st = towerStats(d.kind, t.paths); const i = t.paths[0] >= 3 ? 0 : t.paths[1] >= 3 ? 1 : -1; if (i >= 0) { t.ability = ABILITY_OF[d.kind][i]; t.abMax = ABILITY[t.ability].cd; } }
    t.abCd = clamp(num0(d.abCd, 0), 0, t.abMax || 0);
    t.begin(); t.finish(); t.appear = 1; t.em.on = 1;
    G.towers.push(t); made.push(t);
  }
  // persistent caltrop piles, on the same stretch of road
  for (const p of s.piles) {
    const q = pathAt(B, clamp(p.s, 0, B.L), { x: 0, y: 0, z: 0, tx: 0, tz: 0 }), x = q.x - q.tz * p.lat, z = q.z + q.tx * p.lat;
    const pl = addPile(x, z, p.n, num0(p.dmg, 6), made[p.owner] || null, { redhot: p.redhot, bomb: p.bomb, gilded: p.gilded, shred: p.shred, mega: p.mega, life: p.life | 0 });
    pl.max = Math.max(pl.n, num0(p.max, pl.n));
  }
  G.runMode = s.runMode === 'demo' ? 'demo' : 'player'; G.secondChanceUsed = !!s.secondChanceUsed; G.runBestStart = num0(s.runBestStart, 0); G.defeat = null;
  CAM.yaw = PI / 4; UI.setManual(true); camReset(); UI.closeMenu(); R.fade = 0;
  UI.banner('Resumed · ready for wave ' + resumeWave(s), 2.6, false);
  return true;
}
function num0(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
