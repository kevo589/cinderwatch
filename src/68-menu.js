// ---- Start Menu, player runs on one land, Defeat and Second Chance ----
// G.runMode: 'menu' (the Start Menu over a live preview), 'player' (a run you started: one land, Endless from wave 1),
// or 'demo' (the self-playing AI that marches through every land; also what URL replay flags start).
G.runMode = 'demo'; G.menuBiome = 0; G.menuPending = -1; G.secondChanceUsed = false; G.runBestStart = 0;
const LAND_ACCENT = { ashen: '#c8783c', frost: '#8fc7ff', fen: '#7fd06a', ember: '#ff6a2a', dunes: '#e0b060' };

function landBest(key) { try { return +localStorage.getItem('cinderwatch.best.' + key) || 0; } catch (e) { return 0; } }
function noteLandBest(key, w) { try { if (w > landBest(key)) localStorage.setItem('cinderwatch.best.' + key, '' + w); } catch (e) {} }
function landIndexOf(B) { return Math.max(0, BIOMES.indexOf(B.bio)); }

// tear down everything on the field: monsters, footmen, shots, towers, lights and the board itself
function clearBattlefield() {
  for (const m of G.mons) removeMonster(m); G.mons.length = 0;
  for (const f of G.men) if (f.flame) removeFlame(f.flame); G.men.length = 0;
  G.arrows.length = 0; G.shells.length = 0; G.stuck.length = 0; G.firePatches.length = 0; G.piles.length = 0; G.vortex.length = 0;
  for (const t of G.towers) { t.alive = false; t.clearModel(false); R.scene.remove(t.group); } G.towers.length = 0;
  if (G.B) { for (const f of G.B.flames) removeFlame(f); clearDebris(); disposeBoard(G.B); }
  clearEmitters(); clearFX();
}
// build land i fresh (unmirrored), lit, with a new road
function raiseLand(i) {
  clearBattlefield();
  BIOME.start = i; const seed = 1 + Math.floor(rnd() * 9000);
  const B = G.B = buildBoard(seed, 0); G.boardSeed = seed + 1; G.boardIndex = 1;
  R.scene.add(B.group); activateBoard(B, true); setBoardCasting(B, false);
  return B;
}

// the Start Menu: a quiet, slowly orbiting view of the chosen land
function enterMenu(i) {
  G.menuBiome = clamp(i | 0, 0, BIOMES.length - 1); try { localStorage.setItem('cinderwatch.menuLand', '' + G.menuBiome); } catch (e) {}
  raiseLand(G.menuBiome);
  Object.assign(G, { runMode: 'menu', phase: 'menu', phaseT: 0, paused: false, prep: false, spawning: false, bossWave: false, choice: false, queue: [], endless: false, level: 0, k: 0 });
  UI.setManual(false); UI.closeMenu(); camReset(); CAM.zoom = 1; R.fade = 0;
}
function menuSelect(i) { if (G.phase !== 'menu' || i === G.menuBiome) return; G.menuBiome = i; G.menuPending = i; R.fade = 0; try { localStorage.setItem('cinderwatch.menuLand', '' + i); } catch (e) {} }
function updateMenu(dt) {
  if (G.phase !== 'menu') return;
  CAM.yaw += dt * .05;   // a slow orbit
  if (G.menuPending >= 0) { const i = G.menuPending; G.menuPending = -1; raiseLand(i); R.fade = 0; }
}

// Defend Pass: wave 1 on the chosen land, you in command, Endless from the start so the land never changes
function startPlayerRun(i) {
  raiseLand(i);
  G.level = 0; G.slain = 0; G.run = (G.run || 1) + 1; G.press = 1; G.runMode = 'player';
  beginBattle(true);   // a player run: no scouts, and the wave waits for Start Wave 1
  Object.assign(G, { runMode: 'player', endless: true, secondChanceUsed: false, runBestStart: landBest(G.B.bio.key) });
  CAM.yaw = PI / 4; camReset(); UI.setManual(true); R.fade = 0;
  UI.banner(G.B.bio.name + ' · Wave 1', 2.6, false);
}
// Watch AI Demo: the original self-playing tour of every land
function startDemo() {
  raiseLand(Math.floor(rnd() * BIOMES.length));
  G.level = 0; G.press = 1; G.runMode = 'demo'; beginBattle(true);
  G.runMode = 'demo'; CAM.yaw = PI / 4; camReset(); UI.setManual(false); R.fade = 0;
}
// Return to Menu (from the pause menu): save the run first
function returnToMenu() {
  if (G.runMode === 'player' && G.phase === 'play') saveRunManual();
  enterMenu(landIndexOf(G.B));
}
// Return to Start Menu from the Defeat screen: the dead run's save goes; bests stay
function abandonRun() { clearRunSave(); enterMenu(landIndexOf(G.B)); }

// called when a player run ends in defeat
function playerDefeat() {
  const w = waveNumber();
  G.defeat = { land: G.B.bio.name, wave: w, slain: G.slain, newBest: w > G.runBestStart, mvp: G.towers.filter(t => t.alive).sort((a, b) => b.dealt - a.dealt)[0] || null, canRevive: w >= 10 && !G.secondChanceUsed };
  // a refresh must not buy a free revive: with a Second Chance left, the save keeps the start of this wave but spends the Second Chance;
  // without one, the dead run's save is gone
  if (G.defeat.canRevive) { try { const raw = localStorage.getItem(SAVE_KEY); if (raw) { const s = JSON.parse(raw); s.secondChanceUsed = true; localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } } catch (e) {} }
  else clearRunSave();
}
function canSecondChance() { return G.phase === 'defeat' && G.runMode === 'player' && G.defeat && G.defeat.canRevive && !G.secondChanceUsed; }
// Second Chance: reignite the beacon, half lives, a clear road, emergency gold, and the failed wave again after six seconds
function secondChance() {
  if (!canSecondChance()) return false;
  const B = G.B, b = B.beacon, w = G.defeat.wave;
  G.secondChanceUsed = true;
  for (const m of G.mons) if (!m.dead) { fxDust(m.x, m.y + .3, m.z, 3, .6); removeMonster(m); } G.mons.length = 0;
  G.arrows.length = 0; G.shells.length = 0; G.stuck.length = 0; G.firePatches.length = 0;
  G.lives = Math.round(G.maxLives * .5); G.gold += 150 + w * 15; UI.goldShown = G.gold;
  G.k = Math.max(0, G.k - 1);   // startWave steps k forward again, so the same wave comes back
  Object.assign(G, { phase: 'play', phaseT: 0, spawning: false, bossWave: false, bossAlive: false, queue: [], nextIn: 6, prep: false, choice: false, clearT: 0, slowmo: 0, defeat: null });
  LT.beaconOn = .4;
  fxEmbers(b.x, b.y, b.z, 80, 1); lightFlash(b.x, b.y + 1, b.z, 0xffa050, 3200, .9, 70); FX.shake = .7;
  sfx('ignite', b.x, b.z, 1.4, 1); sfx('horn', b.x, b.z, 1, .3);
  UI.banner('Second Chance · the beacon burns again', 3, true);
  writeSave(runSnapshot());
  return true;
}
