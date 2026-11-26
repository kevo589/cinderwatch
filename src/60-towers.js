
const G = {
  B: null, t: 0, gold: 0, lives: 20, maxLives: 20, wave: 0, slain: 0, level: 0, run: 1,
  towers: [], mons: [], men: [], arrows: [], shells: [], stuck: [], hbars: [], firePatches: [], phase: 'play',
};
const TOWER = {
  archer: { name: 'Archer tower', short: 'Archers', icon: 'archer', cost: [70, 90, 140], range: [6.2, 6.8, 7.4], dmg: [9, 11, 14], rate: [.85, .78, .7], n: [1, 2, 3], air: true, ground: true, light: [80, 105, 140], desc: ['Fast flaming arrows.', 'Can hit flyers.'] },
  bombard: { name: 'Bombard', short: 'Bombard', icon: 'bombard', cost: [120, 130, 190], range: [7.4, 8.0, 8.6], minRange: 2.3, dmg: [36, 60, 98], splash: [1.55, 1.8, 2.1], rate: [2.9, 2.7, 2.5], air: false, ground: true, light: [50, 62, 80], desc: ['Slow shells that burst.', 'Ground targets only.'] },
  spire: { name: 'Storm spire', short: 'Spire', icon: 'spire', cost: [110, 120, 180], range: [5.5, 6.0, 6.5], dmg: [17, 25, 35], jumps: [3, 4, 6], rate: [2.3, 2.1, 1.9], slow: [.36, .42, .48], slowT: [1.3, 1.5, 1.7], air: true, ground: true, light: [16, 20, 26], desc: ['Chain lightning that slows.', 'Can hit flyers.'] },
  guard: { name: 'Guard post', short: 'Guards', icon: 'guard', cost: [80, 90, 150], range: [3.4, 3.7, 4.0], n: [2, 3, 3], hp: [62, 90, 135], dmg: [7, 10, 15], rate: [7, 6, 5], air: false, ground: true, light: [55, 70, 90], desc: ['Footmen who block', 'and duel on the road.'] },
};
  // road: must stand within reach of the road (its range plus the road's half width)
TOWER.forge = { name: 'Caltrop forge', short: 'Forge', icon: 'forge', cost: [100], range: [4.2, 4.2, 4.2], air: false, ground: true, road: true, noAim: true, light: [45, 60, 80], desc: ['Scatters caltrops', 'onto the road.'] };
TOWER.alch = { name: 'Alchemist', short: 'Alchemist', icon: 'alch', cost: [140], range: [5, 5, 5], air: true, ground: true, light: [40, 55, 75], desc: ['Acid flasks, and brews', 'that boost towers.'] };
TOWER.foundry = { name: 'Gold foundry', short: 'Foundry', icon: 'foundry', cost: [160], range: [5.5, 5.5, 5.5], air: false, ground: false, light: [45, 60, 80], noAim: true, desc: ['Mints gold', 'every wave.'] };
TOWER.guard.road = true; TOWER.guard.noAim = true;
const TOWER_KINDS = ['archer', 'bombard', 'spire', 'guard', 'forge', 'alch', 'foundry'];

// ---- Branching upgrades ----
// Two paths of three tiers. One path may reach tier 3 while the other stops at tier 2 (3-2 or 2-3 at most).
const PATHS = {
  archer: [
    { name: 'Volley', tiers: [{ name: 'Second bow', desc: '+1 archer, faster', cost: 90 }, { name: 'Quickdraw', desc: '3 archers, much faster', cost: 150 }, { name: 'Fire volley', desc: 'Bursts of flaming arrows', cost: 320 }] },
    { name: 'Sharpshooter', tiers: [{ name: 'Longbows', desc: 'More range and damage', cost: 100 }, { name: 'Bodkins', desc: 'Arrows ignore armor', cost: 160 }, { name: 'Deadeye', desc: 'Crits that hit wraiths', cost: 340 }] },
  ],
  bombard: [
    { name: 'Siege mortar', tiers: [{ name: 'Heavy shot', desc: 'Bigger, harder blasts', cost: 130 }, { name: 'Wallbreaker', desc: 'Shreds armor', cost: 200 }, { name: 'Siege mortar', desc: 'Huge blast that stuns', cost: 420 }] },
    { name: 'Incendiary', tiers: [{ name: 'Quick loader', desc: 'Reloads faster', cost: 120 }, { name: 'Firepots', desc: 'Leaves burning ground', cost: 180 }, { name: 'Cluster shells', desc: 'Bursts into bomblets', cost: 380 }] },
  ],
  spire: [
    { name: 'Arc conduit', tiers: [{ name: 'Branching arcs', desc: 'More, longer jumps', cost: 120 }, { name: 'Overcharge', desc: 'Stronger lightning', cost: 180 }, { name: 'Overload', desc: 'Sky bolts the strongest', cost: 400 }] },
    { name: 'Cryo tempest', tiers: [{ name: 'Hoarfrost', desc: 'Stronger, longer slow', cost: 110 }, { name: 'Frost aura', desc: 'Slows all nearby', cost: 170 }, { name: 'Brittle cold', desc: 'Slowed foes take +25%', cost: 330 }] },
  ],
  guard: [
    { name: 'Citadel', tiers: [{ name: 'Mail', desc: '3 tougher footmen', cost: 100 }, { name: 'Plate & drill', desc: 'Armored, quick respawn', cost: 160 }, { name: 'Knights', desc: 'Cleaving heavy blows', cost: 350 }] },
    { name: 'Quartermaster', tiers: [{ name: 'War banners', desc: 'Nearby towers +15% speed', cost: 120 }, { name: 'Supply wagons', desc: '+40 gold each wave', cost: 200 }, { name: 'Bounty keep', desc: '+50% bounty, +100/wave', cost: 380 }] },
  ],
};
PATHS.forge = [
  { name: 'Barbed iron', tiers: [{ name: 'Heavy drops', desc: 'Bigger caltrop piles', cost: 110 }, { name: 'Red-hot', desc: 'Melts armor, burns bosses', cost: 190 }, { name: 'Minefield', desc: 'Piles explode when spent', cost: 400 }] },
  { name: 'Enduring vault', tiers: [{ name: 'Quick bellows', desc: 'Faster, wider drops', cost: 120 }, { name: 'Tempered steel', desc: 'Piles last a wave more', cost: 180 }, { name: 'Perma-caltrop', desc: 'Gilded piles, 3 waves', cost: 420 }] },
];
PATHS.alch = [
  { name: 'Brewmaster', tiers: [{ name: 'Acidic dip', desc: 'Towers pierce armor', cost: 120 }, { name: 'Berserker draught', desc: '+20% speed, damage, range', cost: 220 }, { name: 'Eternal elixir', desc: 'Buffs never fade', cost: 450 }] },
  { name: 'Plague cauldron', tiers: [{ name: 'Strong acid', desc: 'Wider, fiercer burns', cost: 130 }, { name: 'Corrosive melt', desc: 'Acid: +20% damage taken', cost: 200 }, { name: 'Volatile', desc: 'Acid kills burst for gold', cost: 420 }] },
];
PATHS.foundry = [
  { name: 'Mint works', tiers: [{ name: 'Second press', desc: 'Two mint bursts a wave', cost: 150 }, { name: 'Double ingots', desc: 'Richer bursts, dividend', cost: 260 }, { name: 'Royal treasury', desc: 'Three rich bursts', cost: 600 }] },
  { name: 'Guild bank', tiers: [{ name: 'Vault', desc: 'Stores gold, 15% interest', cost: 180 }, { name: 'Trade charter', desc: '10% off nearby upgrades', cost: 300 }, { name: 'Grand exchange', desc: 'Pays interest, 15% off', cost: 650 }] },
];
// may path i of tower t be bought one tier further?
function pathCap(t, i) { return t.paths[1 - i] >= 3 ? 2 : 3; }
function canUpgradePath(t, i) { if (t.paragon) return false; const nx = t.paths[i] + 1; return nx <= 3 && nx <= pathCap(t, i) && !(nx === 3 && t.paths[1 - i] >= 3); }
function upgradeDiscount(t) { let d = 0; for (const f of G.towers) if (f !== t && f.alive && f.kind === 'foundry' && f.st.discount && Math.hypot(f.x - t.x, f.z - t.z) < f.st.range) d = Math.max(d, f.st.discount); return d; }
function pathCost(t, i) { const tier = PATHS[t.kind][i].tiers[t.paths[i]]; return tier ? Math.round(tier.cost * (1 - upgradeDiscount(t))) : 0; }
// every number a tower fights with, from its two paths
function towerStats(kind, p) {
  const [a, b] = p;
  if (kind === 'archer') {
    const s = { range: 6.2, dmg: 9, rate: .85, n: 1, volley: a >= 3, pierce: b >= 2, crit: b >= 3 ? .25 : 0 };
    if (a >= 1) { s.n = 2; s.rate *= .9; } if (a >= 2) { s.n = 3; s.rate *= .8; }
    if (b >= 1) { s.range += 1.4; s.dmg += 3; } if (b >= 2) s.dmg += 2; if (b >= 3) s.range += .6;
    return s;
  }
  if (kind === 'bombard') {
    const s = { range: 7.4, minRange: 2.3, dmg: 36, splash: 1.55, rate: 2.9, shred: a >= 2, armorX: a >= 2 ? 1.5 : 1, stun: a >= 3 ? .6 : 0, kb: a >= 3 ? 2.2 : 1, fire: b >= 2, cluster: b >= 3 };
    if (a >= 1) { s.dmg *= 1.5; s.splash += .25; } if (a >= 2) s.range += .6; if (a >= 3) { s.dmg *= 1.6; s.splash *= 1.6; }
    if (b >= 1) s.rate *= .75;
    return s;
  }
  if (kind === 'spire') {
    const s = { range: 5.5, dmg: 17, jumps: 3, jumpR: 3, falloff: .86, rate: 2.3, slow: .36, slowT: 1.3, overload: a >= 3, aura: b >= 2, brittle: b >= 3 };
    if (a >= 1) { s.jumps += 2; s.jumpR = 3.8; } if (a >= 2) { s.dmg *= 1.4; s.jumps += 1; s.falloff = .9; }
    if (b >= 1) { s.slow += .12; s.slowT += .8; }
    return s;
  }
  if (kind === 'forge') {
    const s = { range: 4.2, n: 6, dmg: 6, rate: 2.6, spread: 1.0, redhot: a >= 2, bomb: a >= 3, life: 0, gilded: b >= 3 };
    if (a >= 1) s.n = 10; if (b >= 1) { s.rate *= .7; s.spread = 1.6; } if (b >= 2) s.life = 1; if (b >= 3) { s.n *= 3; s.dmg *= 1.5; s.life = 3; }
    return s;
  }
  if (kind === 'alch') {
    const s = { range: 5, dmg: 8, rate: 2.2, splash: 1.1, acid: 6, acidT: 3, dip: a >= 1, brew: a >= 2, eternal: a >= 3, corrode: b >= 2, volatile: b >= 3 };
    if (b >= 1) { s.splash = 1.6; s.acid = 12; s.acidT = 4; }
    return s;
  }
  if (kind === 'foundry') {
    const s = { range: 5.5, bursts: 1, burst: 25, dividend: 0, bank: b >= 1, interest: 0, cap: 0, discount: 0, overflow: b >= 3 };
    if (a >= 1) { s.bursts = 2; s.burst = 30; } if (a >= 2) { s.burst = 55; s.dividend = 40; } if (a >= 3) { s.bursts = 3; s.burst = 90; s.dividend = 120; }
    if (b >= 1) { s.interest = .15; s.cap = 700; } if (b >= 2) { s.interest = .2; s.cap = 1200; s.discount = .1; } if (b >= 3) { s.interest = .25; s.cap = 2000; s.discount = .15; }
    return s;
  }
  const s = { range: 3.4, n: 2, hp: 62, dmg: 7, rate: 7, armor: 1, cleave: a >= 3, banner: 0, income: 0, bounty: 0 };
  if (a >= 1) { s.n = 3; s.hp *= 1.5; } if (a >= 2) { s.hp *= 1.5; s.rate *= .6; s.armor = .7; } if (a >= 3) s.dmg *= 1.8;
  if (b >= 1) s.banner = .15; if (b >= 2) { s.banner = .2; s.income = 40; } if (b >= 3) { s.bounty = .5; s.income = 100; }
  s.hp = Math.round(s.hp); s.dmg = Math.round(s.dmg * 10) / 10;
  return s;
}

function blueprint(kind, lvl, paths = [0, 0], pg = false) {
  const pieces = [], mounts = {}, [pa, pb] = paths;
  // path accents: A in reds and iron, B in blues, golds and frost, one more per tier
  const ice = C(0x9fe6ff), gold = mulC(COL.gold, .9), cloth = c => mulC(c, 1.3);
  const piece = (id, order, fn) => {
    const S = new Soup(); fn(S); if (!S.verts) return; let minY = 1e9; for (let i = 1; i < S.P.length; i += 3) minY = Math.min(minY, S.P[i]);
    for (let i = 1; i < S.P.length; i += 3) S.P[i] -= minY; pieces.push({ id, order, y: minY, soup: S });
  };
  const w = COL.wood, wd = COL.woodD, wl = COL.woodL, st = COL.stone, sdk = COL.stoneD, sl = COL.stoneL, iron = COL.iron, rng = soupRng;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const brazier = (S, x, y, z, bs) => {
    for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + .5; S.seg([x + Math.cos(a) * bs * .42, y, z + Math.sin(a) * bs * .42], [x + Math.cos(a) * bs * .2, y + bs * .5, z + Math.sin(a) * bs * .2], .028, .028, iron, { l: L_METAL, n: 4 }); }
    S.cyl(bs * .3, bs * .22, x, y + bs * .56, z, iron, { n: 8, l: L_METAL, rt: 1.5, rough: .6 });
    S.cyl(bs * .4, .04, x, y + bs * .68, z, COL.ember, { n: 8, emis: .55, jit: 0 });
  };
  // ---- Paragon citadels: a shared gold-trimmed octagonal keep, crowned per kind ----
  if (pg) {
    const cu = C(0x8a5a3a), KH = 1.15, crownY = .2 + KH + .1, gl = mulC(COL.gold, 1.05);
    piece('keep', 0, S => {
      S.cyl(1.32, .26, 0, .13, 0, sdk, { n: 8, l: L_MASON, r: [0, PI / 8, 0] });
      S.cyl(1.16, KH, 0, .2 + KH / 2, 0, st, { n: 8, l: L_MASON, r: [0, PI / 8, 0], rt: .93, jit: .03 });
      for (let k = 0; k < 3; k++) S.cyl(1.16 - k * .025 + .02, .1, 0, .45 + k * .35, 0, mixC(sdk, sl, rng()), { n: 8, l: L_MASON, r: [0, PI / 8, 0] });
      S.cyl(1.2, .08, 0, .2 + KH, 0, gl, { n: 8, l: L_METAL, r: [0, PI / 8, 0], emis: .12, rough: .35 });
      for (let k = 0; k < 8; k++) { const a = (k + .5) / 8 * TAU; S.box(.3, .26, .18, Math.cos(a) * 1.1, crownY + .06, Math.sin(a) * 1.1, sl, { l: L_MASON, r: [0, -a + HPI, 0] }); }
      S.box(.5, .7, .1, 0, .55, 1.12, COL.black, { jit: 0 }); S.box(.58, .08, .12, 0, .92, 1.13, gl, { l: L_METAL, jit: 0 });
    });
    if (kind === 'archer') {
      // Sunfire Watchtower: a tall shaft to a broad deck for five archers, crowned with a golden sun disc
      const H = 3.9;
      piece('shaft', 1, S => { S.cyl(.72, H - crownY, 0, crownY + (H - crownY) / 2, 0, st, { n: 4, l: L_MASON, rt: .85, r: [0, PI / 4, 0] }); for (const y of [crownY + .9, crownY + 1.8]) S.cyl(.7, .08, 0, y, 0, gl, { n: 4, l: L_METAL, r: [0, PI / 4, 0], emis: .1 }); });
      piece('deck', 2, S => { S.cyl(1.15, .14, 0, H, 0, w, { n: 8, l: L_WOOD, r: [0, PI / 8, 0] }); for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; S.box(.42, .42, .06, Math.cos(a) * 1.12, H + .28, Math.sin(a) * 1.12, k & 1 ? w : wl, { l: L_WOOD, r: [0, -a + HPI, 0] }); } });
      piece('sun', 3, S => { S.seg([0, H + .1, -.6], [0, H + 2.1, -.6], .05, .04, COL.iron, { l: L_METAL, n: 4 }); S.add(gTorus(16, .12, 5), { s: .5, p: [0, H + 2.2, -.6], r: [HPI, 0, 0], c: gl, l: L_METAL, emis: .35 }); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; S.box(.06, .22, .03, Math.cos(a) * .45, H + 2.2 + Math.sin(a) * .45, -.6, gl, { emis: .5, jit: 0, r: [0, 0, a] }); } S.sph(.18, 0, H + 2.2, -.6, C(0xffd070), { emis: .9, w: 8, h: 6 }); });
      piece('braziers', 4, S => { brazier(S, .8, H + .1, .55, .6); brazier(S, -.8, H + .1, .55, .6); });
      mounts.flame = [.8, H + .52, .55]; mounts.flameSize = .6; mounts.flame2 = [-.8, H + .52, .55]; mounts.flame2Col = [1.4, .9, .4]; mounts.top = H + 2.6;
      mounts.archers = [[0, H + .07, .7], [-.65, H + .07, .2], [.65, H + .07, .2], [-.45, H + .07, -.45], [.45, H + .07, -.45]];
    } else if (kind === 'bombard') {
      // Cataclysm Siegeworks: a wide mortar bastion with magma vents and a huge iron siege mortar
      const H = crownY + 1.1;
      piece('drum', 1, S => { S.cyl(1.05, H - crownY, 0, crownY + (H - crownY) / 2, 0, sdk, { n: 10, l: L_MASON, rt: .95 }); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; S.box(.16, .5, .06, Math.cos(a) * 1.02, crownY + .45, Math.sin(a) * 1.02, COL.ember, { emis: .9, jit: 0, r: [0, -a + HPI, 0] }); } S.cyl(1.08, .1, 0, H - .05, 0, gl, { n: 10, l: L_METAL, emis: .1 }); });
      piece('vents', 2, S => { for (const sg of [-1, 1]) { S.cyl(.18, .9, sg * .85, H + .35, -.55, COL.iron, { n: 6, l: L_METAL, rt: .8 }); S.cyl(.14, .05, sg * .85, H + .82, -.55, COL.ember, { n: 6, emis: .9 }); } });
      piece('deck', 3, S => { S.cyl(.95, .14, 0, H + .05, 0, sl, { n: 10, l: L_MASON }); });
      mounts.flame = [.85, H + .9, -.55]; mounts.flameSize = .4; mounts.flame2 = [-.85, H + .9, -.55]; mounts.flame2Col = [1.5, .7, .35]; mounts.top = H + 2;
      mounts.gun = [0, H + .15, .1]; mounts.gunLen = 1.6; mounts.gunR = .32;
    } else if (kind === 'spire') {
      // Maelstrom Obelisk: a basalt obelisk banded in gold, a great crystal and storm rings
      const H = 4.6, bas = COL.basalt, basL = COL.basaltL;
      piece('obelisk', 1, S => { S.cyl(.62, H - crownY, 0, crownY + (H - crownY) / 2, 0, bas, { n: 4, l: L_ROCK, rt: .45, r: [0, PI / 4, 0], jit: .03 }); for (const u of [.25, .5, .75]) S.cyl(lerp(.62, .28, u) + .03, .09, 0, crownY + u * (H - crownY), 0, gl, { n: 4, l: L_METAL, r: [0, PI / 4, 0], emis: .12 }); });
      piece('claws', 2, S => { for (let k = 0; k < 4; k++) { const a = k * HPI + PI / 4, cs = Math.cos(a), sn = Math.sin(a); S.seg([cs * .25, H - .1, sn * .25], [cs * .6, H + .5, sn * .6], .07, .05, basL, { l: L_ROCK, n: 4 }); S.cone(.06, .3, cs * .62, H + .6, sn * .62, gl, { n: 4, l: L_METAL, emis: .2 }); } });
      piece('pylons', 3, S => { for (let k = 0; k < 4; k++) { const a = k * HPI, x = Math.cos(a) * .95, z = Math.sin(a) * .95; S.cone(.14, .7, x, crownY + .35, z, C(0x9fe6ff), { n: 4, emis: .5 }); } });
      mounts.crystal = [0, H + .7, 0]; mounts.crystalS = .42; mounts.shards = 6; mounts.rings = true; mounts.top = H + 1.8; mounts.flame = null; mounts.lightAt = [0, H + .7, 0]; mounts.lightCol = [.6, .85, 1.3];
    } else if (kind === 'guard') {
      // Grand Bastion: a walled fortress with two gold-capped turrets and banners
      const W = 2.1, D = 1.7, wh = 1.3;
      piece('walls', 1, S => { S.box(W, wh, D, 0, crownY + wh / 2 - .5, 0, st, { l: L_MASON, jit: .03 }); for (let k = 0; k < 7; k++) { S.box(.22, .22, .2, -W / 2 + .15 + k * (W - .3) / 6, crownY + wh - .4, D / 2, sl, { l: L_MASON }); S.box(.22, .22, .2, -W / 2 + .15 + k * (W - .3) / 6, crownY + wh - .4, -D / 2, sl, { l: L_MASON }); } });
      piece('turrets', 2, S => { for (const sg of [-1, 1]) { const x = sg * (W / 2 - .1), z = -D / 2 + .1; S.cyl(.38, 2.4, x, crownY + .7, z, st, { n: 8, l: L_MASON }); S.cone(.5, .8, x, crownY + 2.3, z, gl, { n: 8, l: L_METAL, emis: .1 }); S.seg([x, crownY + 2.6, z], [x, crownY + 3.6, z], .03, .025, COL.woodD, { l: L_WOOD, n: 4 }); S.box(.5, .34, .03, x + .27, crownY + 3.4, z, cloth(sg > 0 ? COL.clothR : COL.clothB), { l: L_WOOD, jit: 0 }); } });
      piece('gatehouse', 3, S => { S.box(.8, 1.2, .3, 0, .75, D / 2 + .35, sl, { l: L_MASON }); S.box(.5, .8, .1, 0, .55, D / 2 + .52, COL.black, { jit: 0 }); S.box(.9, .1, .32, 0, 1.38, D / 2 + .35, gl, { l: L_METAL, emis: .1 }); brazier(S, .7, 0, D / 2 + .75, .55); });
      mounts.flame = [.7, .55 * .72 + .1, D / 2 + .75]; mounts.flameSize = .55; mounts.door = [0, 0, D / 2 + .7]; mounts.top = crownY + 3.8;
    } else if (kind === 'forge') {
      // Obsidian Mineworks: a black obsidian foundry with lava channels, a tall stack and racks of great spikes
      const ob = C(0x1c1a22), H = crownY + 1.2;
      piece('works', 1, S => { S.box(1.7, H - crownY, 1.4, 0, crownY + (H - crownY) / 2, 0, ob, { l: L_ROCK, jit: .02 }); for (const z of [-.5, 0, .5]) S.box(1.72, .06, .12, 0, crownY + .3, z, COL.ember, { emis: .95, jit: 0 }); S.box(.7, .5, .08, 0, crownY + .3, .72, COL.ember, { emis: .9, jit: 0 }); });
      piece('stack', 2, S => { S.cyl(.32, 2.2, -.55, H + 1.1, -.35, ob, { n: 6, l: L_ROCK, rt: .8 }); S.cyl(.36, .12, -.55, H + 2.2, -.35, gl, { n: 6, l: L_METAL, emis: .12 }); });
      piece('racks', 3, S => { for (let k = 0; k < 6; k++) S.cone(.09, .55, .25 + (k % 3) * .25, H + .28, -.3 + Math.floor(k / 3) * .35, k % 2 ? gl : COL.ironL, { n: 4, l: L_METAL, emis: k % 2 ? .15 : 0 }); S.seg([.6, H + .1, .45], [.6, H + 1.1, .45], .05, .04, COL.woodD, { l: L_WOOD, n: 4 }); S.cyl(.2, .12, .6, H + 1.1, .45, COL.iron, { n: 8, l: L_METAL, rt: 1.3 }); });
      mounts.flame = [0, crownY + .35, .78]; mounts.flameSize = .55; mounts.top = H + 2.5; mounts.sling = [.6, H + 1.2, .45]; mounts.emCol = [1, .42, .18];
    } else if (kind === 'alch') {
      // Philosopher's Crucible: a great copper-gold crucible under a gold dome on four pillars, green-gold fire
      const brew = C(0x9fe070), H = crownY + .15;
      piece('crucible', 1, S => { S.cyl(.85, .7, 0, H + .4, 0, mixC(cu, COL.gold, .4), { n: 12, l: L_METAL, rt: 1.12, rough: .4 }); S.cyl(.95, .08, 0, H + .78, 0, gl, { n: 12, l: L_METAL, emis: .12 }); S.cyl(.85, .05, 0, H + .74, 0, brew, { n: 12, emis: .8, jit: 0 }); });
      piece('pillars', 2, S => { for (let k = 0; k < 4; k++) { const a = k * HPI + PI / 4; S.cyl(.1, 2.1, Math.cos(a) * 1.0, H + 1.05, Math.sin(a) * 1.0, sl, { n: 6, l: L_MASON }); } });
      piece('dome', 3, S => { S.add(gDome(10, 4), { s: [1.15, .7, 1.15], p: [0, H + 2.1, 0], c: mulC(COL.gold, .62), l: L_METAL, rough: .5 }); S.cone(.12, .5, 0, H + 3.0, 0, gl, { n: 6, l: L_METAL, emis: .2 }); });
      piece('vials', 4, S => { for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; S.sph(.09, Math.cos(a) * 1.18, crownY + .12, Math.sin(a) * 1.18, k & 1 ? C(0xe0a040) : brew, { emis: .6, w: 6, h: 4 }); } });
      mounts.flame = [0, H + .82, 0]; mounts.flameSize = .4; mounts.flameCol = [.7, 1.15, .4]; mounts.emCol = [.8, 1, .4]; mounts.flask = [0, H + 1.1, 0]; mounts.top = H + 3.2;
      mounts.flame2 = [0, H + 3.3, 0]; mounts.flame2Col = [1.2, .9, .4]; mounts.flame2Size = .2;
    }
    pieces.sort((a, b) => a.order - b.order);
    return { pieces, mounts };
  }
  if (kind === 'archer') {
    const bH = [.25, 1.0, 1.9][lvl], H = [2.0, 2.7, 3.35][lvl], W = [.75, .85, .93][lvl], bs = [.5, .62, .8][lvl];
    piece('base', 0, S => {
      if (lvl === 0) { S.box(1.6, .25, 1.6, 0, .125, 0, sdk, { l: L_MASON }); for (const [a, b] of corners) S.box(.3, .32, .3, a * .66, .16, b * .66, sl, { l: L_MASON }); }
      else {
        S.box(1.8, .3, 1.8, 0, .15, 0, sdk, { l: L_MASON });
        S.cyl(1.02, bH - .3, 0, .3 + (bH - .3) / 2, 0, st, { n: 4, l: L_MASON, rt: .9, r: [0, PI / 4, 0] });
        S.box(1.42, .14, 1.42, 0, bH - .04, 0, sl, { l: L_MASON });
        S.box(.3, .5, .06, 0, .56, .71, COL.black, { jit: 0 });
        if (lvl === 2) { for (const [a, b] of corners) for (let q = 0; q < 3; q++) S.box(.22, .2, .22, a * (.7 - q * .025), .5 + q * .5, b * (.7 - q * .025), sl, { l: L_MASON }); for (const sg of [-1, 1]) S.box(.06, .5, .12, sg * .7, 1.1, 0, COL.black, { jit: 0 }); }
      }
    });
    piece('posts', 1, S => {
      for (const [a, b] of corners) S.seg([a * .62, bH, b * .62], [a * (W - .1), H, b * (W - .1)], .085, .075, wd, { l: L_WOOD });
      const ym = (bH + H) / 2, r = lerp(.62, W - .1, .5);
      for (let k = 0; k < 4; k++) { const [a, b] = corners[k], [c, d] = corners[(k + 1) % 4]; S.seg([a * r, ym, b * r], [c * r, ym, d * r], .05, .05, w, { l: L_WOOD, n: 4 }); }
    });
    piece('brace', 2, S => {
      for (let k = 0; k < 4; k++) { const [a, b] = corners[k], [c, d] = corners[(k + 1) % 4]; S.seg([a * .62, bH + .1, b * .62], [c * (W - .12), H - .15, d * (W - .12)], .035, .035, w, { l: L_WOOD, n: 4 }); S.seg([c * .62, bH + .1, d * .62], [a * (W - .12), H - .15, b * (W - .12)], .035, .035, wl, { l: L_WOOD, n: 4 }); }
    });
    piece('deck', 3, S => {
      S.box(W * 2 + .16, .1, W * 2 + .16, 0, H + .05, 0, w, { l: L_WOOD }); for (const sg of [-1, 1]) S.box(W * 2 + .3, .09, .1, 0, H - .04, sg * (W - .1), wd, { l: L_WOOD });
      for (const sg of [-1, 1]) S.box(.1, .09, W * 2 + .3, sg * (W - .1), H - .04, 0, wd, { l: L_WOOD });
      if (lvl >= 1) for (const [a, b] of corners) S.seg([a * (W - .1), H - .55, b * (W - .1)], [a * (W + .06), H - .02, b * (W + .06)], .04, .04, wd, { l: L_WOOD, n: 4 });
    });
    piece('rail', 4, S => {
      const y0 = H + .1;
      for (let k = 0; k < 4; k++) {
        const ang = k * HPI, cs = Math.cos(ang), sn = Math.sin(ang);
        for (let j = 0; j < 5; j++) {
          if (k === 2 && (j === 1 || j === 2)) continue;
          const u = (j - 2) * W * .42, hh = (j & 1) ? .34 : .5, x = u * cs + (W + .02) * sn, z = -u * sn + (W + .02) * cs;
          S.box(W * .4, hh, .06, x, y0 + hh / 2, z, (j & 1) ? w : wl, { l: L_WOOD, r: [0, ang, 0] });
        }
      }
      for (const [a, b] of corners) S.box(.1, .66, .1, a * (W + .02), y0 + .33, b * (W + .02), wd, { l: L_WOOD });
      if (lvl >= 1) for (const u of lvl === 2 ? [-.5, 0, .5] : [-.35, .35]) { S.cyl(.2, .04, u, y0 + .22, W + .08, lvl === 2 ? COL.ironL : COL.clothB, { n: 8, r: [HPI, 0, 0], l: lvl === 2 ? L_METAL : L_WOOD }); S.sph(.05, u, y0 + .22, W + .11, COL.ironL, { l: L_METAL, w: 5, h: 3, smooth: false }); }
      if (lvl === 2) for (const sg of [-1, 1]) S.cyl(.2, .04, sg * (W + .08), y0 + .22, .1, COL.clothR, { n: 8, r: [0, 0, HPI], l: L_WOOD });
    });
    piece('ladder', 5, S => {
      for (const sg of [-1, 1]) S.seg([sg * .17, 0, -W - .5], [sg * .17, H + .15, -W - .06], .035, .035, wd, { l: L_WOOD, n: 4 });
      for (let y = .3; y < H; y += .34) { const u = y / (H + .15); S.box(.36, .04, .05, 0, y, lerp(-W - .5, -W - .06, u), wl, { l: L_WOOD }); }
    });
    const bx = -W + .34, bz = -W + .36, by = H + .1 + (lvl === 2 ? .35 : 0);
    piece('brazier', 6, S => { if (lvl === 2) S.cyl(.2, .38, bx, H + .29, bz, sdk, { n: 6, l: L_MASON }); brazier(S, bx, by, bz, bs); });
    if (lvl >= 1) piece('flag', 7, S => { S.seg([W - .08, H + .1, -W + .08], [W - .08, H + 1.75, -W + .08], .035, .025, wd, { l: L_WOOD, n: 4 }); const T = new Soup(); clothPanel(T, { x0: 0, x1: .62, yTop: 0, len: .36, z: 0, col: COL.clothR, rng, nx: 3, ny: 2, rag: 0, sway: 1.2 }); S.merge(T, { p: [W - .06, H + 1.7, -W + .08], ao: null }); });
    mounts.flame = [bx, by + bs * .7, bz]; mounts.flameSize = bs; mounts.top = H + 1.7;
    mounts.archers = [[[.12, H + .1, .28]], [[-.3, H + .1, .42], [.42, H + .1, .1]], [[-.35, H + .1, .5], [.5, H + .1, .3], [.25, H + .1, -.4]]][lvl];
    if (pa || pb) piece('accent', 8, S => {
      const y0 = H + .1;
      for (let k = 0; k < pa; k++) { const [a, b] = corners[k]; S.box(.05, .42, .2, a * (W + .1), y0 - .08, b * (W + .1) * .6, cloth(COL.clothR), { l: L_WOOD, jit: 0 }); S.box(.12, .08, .12, a * (W + .02), y0 + .7, b * (W + .02), COL.ember, { emis: .5, jit: 0 }); }
      for (let k = 0; k < pb; k++) { const [a, b] = corners[(k + 2) % 4]; S.cone(.07, .32, a * (W + .02), y0 + .82, b * (W + .02), COL.ironL, { n: 4, l: L_METAL }); S.box(.05, .42, .2, a * (W + .1), y0 - .08, b * (W + .1) * .6, cloth(COL.clothB), { l: L_WOOD, jit: 0 }); }
      if (pb >= 3) { const x = -W + .1, z = W - .1; S.seg([x, H + .1, z], [x, H + 2.6, z], .045, .03, COL.iron, { l: L_METAL, n: 4 }); S.box(.7, .44, .03, x + .37, H + 2.25, z, cloth(COL.clothB), { l: L_WOOD, jit: 0 }); S.box(.72, .05, .04, x + .37, H + 2.48, z, gold, { l: L_METAL, jit: 0 }); }
      if (pa >= 3) brazier(S, W - .34, H + .1, -W + .36, bs * .85);
    });
    if (pa >= 3) { mounts.flame2 = [W - .34, H + .1 + bs * .85 * .7, -W + .36]; mounts.flame2Col = [1.35, .62, .4]; mounts.flame2Size = bs * .85; }
    if (pb >= 3) mounts.top = H + 2.7;
  } else if (kind === 'bombard') {
    const Rr = [1.0, 1.08, 1.15][lvl], H = [1.1, 1.5, 1.9][lvl];
    piece('plinth', 0, S => { S.cyl(Rr + .22, .26, 0, .13, 0, sdk, { n: 10, l: L_MASON }); if (lvl === 2) S.cyl(Rr + .12, .2, 0, .36, 0, st, { n: 10, l: L_MASON }); });
    piece('drum', 1, S => {
      S.cyl(Rr, H, 0, H / 2, 0, st, { n: 10, l: L_MASON, rt: .93, jit: .03 });
      for (let c = 0; c < 2 + lvl; c++) S.cyl(Rr * (1 - .05 * (.5 + c) / (2 + lvl)) + .012, .16, 0, .35 + c * (H - .5) / (1.5 + lvl), 0, mixC(sdk, sl, rng()), { n: 10, l: L_MASON });
      S.box(.34, .55, .1, 0, .3, Rr * .97, COL.black, { jit: 0 });
    });
    if (lvl >= 1) piece('butt', 2, S => { for (let k = 0; k < 4; k++) { const a = k * HPI + PI / 4; S.box(.36, H * .8, .5, Math.cos(a) * (Rr + .06), H * .36, Math.sin(a) * (Rr + .06), sdk, { l: L_MASON, r: [0, -a + HPI, 0] }); S.box(.4, .12, .56, Math.cos(a) * (Rr + .06), H * .78, Math.sin(a) * (Rr + .06), sl, { l: L_MASON, r: [0, -a + HPI, 0] }); } });
    if (lvl >= 1) piece('bands', 3, S => { for (const y of lvl === 2 ? [H * .45, H * .8] : [H * .65]) S.cyl(Rr * .965 + .02, .07, 0, y, 0, iron, { n: 10, l: L_METAL, rough: .55 }); });
    piece('deck', 4, S => { S.cyl(Rr * .93 + .14, .16, 0, H + .02, 0, sl, { n: 10, l: L_MASON }); S.cyl(Rr * .8, .06, 0, H + .12, 0, w, { n: 10, l: L_WOOD }); });
    piece('rim', 5, S => { for (let k = 0; k < 10; k++) { if (k % 5 === 0) continue; const a = (k + .5) / 10 * TAU + HPI; S.box(.46, .34, .22, Math.cos(a) * Rr * .96, H + .27, Math.sin(a) * Rr * .96, lvl === 2 && (k & 1) ? iron : mixC(sdk, sl, rng()), { l: lvl === 2 && (k & 1) ? L_METAL : L_MASON, r: [0, -a + HPI, 0] }); } });
    piece('ammo', 6, S => { for (const [x, z] of [[-.42, -.5], [-.24, -.52], [-.33, -.36]]) S.sph(.09, x, H + .22, z, mulC(iron, .8), { l: L_METAL, w: 6, h: 4, smooth: false }); S.sph(.09, -.33, H + .36, -.46, mulC(iron, .8), { l: L_METAL, w: 6, h: 4, smooth: false }); PROP.barrel(S, .45, H + .13, -.5, .75, rng); });
    const lx = -Rr * .78, lz = .2, lh = H + 1.25 + lvl * .12;
    piece('lantern', 7, S => {
      for (const sg of lvl === 2 ? [-1, 1] : [1]) {
        const x = lx * sg;
        S.seg([x, H + .1, lz], [x, lh, lz], .04, .035, iron, { l: L_METAL, n: 4 }); S.seg([x, lh, lz], [x - sg * -.0, lh, lz + .32], .03, .03, iron, { l: L_METAL, n: 4 });
        S.box(.2, .05, .2, x, lh - .08, lz + .32, iron, { l: L_METAL }); S.box(.16, .2, .16, x, lh - .22, lz + .32, COL.ember, { emis: .8, jit: 0 }); S.box(.2, .04, .2, x, lh - .34, lz + .32, iron, { l: L_METAL });
        for (const [a, b] of corners) S.box(.025, .22, .025, x + a * .09, lh - .22, lz + .32 + b * .09, iron, { l: L_METAL });
      }
    });
    mounts.flame = [lx, lh - .3, lz + .32]; mounts.flameSize = .26 + lvl * .05; mounts.flame2 = lvl === 2 ? [-lx, lh - .3, lz + .32] : null; mounts.top = H + 1.6;
    mounts.gun = [0, H + .15, .05]; mounts.gunLen = [.95, 1.12, 1.25][lvl]; mounts.gunR = [.15, .18, .215][lvl];
    if (pa || pb) piece('accent', 8, S => {
      for (let k = 0; k < pa; k++) S.cyl(Rr + .05, .1, 0, .3 + k * .32, 0, COL.iron, { n: 10, l: L_METAL, rough: .5 });
      if (pa >= 3) for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; S.cone(.08, .26, Math.cos(a) * (Rr + .08), H + .5, Math.sin(a) * (Rr + .08), COL.ironL, { n: 4, l: L_METAL }); }
      for (let k = 0; k < pb; k++) { const a = PI * .8 + k * .55, x = Math.cos(a) * Rr * .55, z = Math.sin(a) * Rr * .55; S.box(.26, .2, .26, x, H + .22, z, COL.wood, { l: L_WOOD }); S.box(.2, .04, .2, x, H + .34, z, COL.ember, { emis: .7, jit: 0 }); }
      if (pb >= 3) for (let k = 0; k < 3; k++) S.sph(.1, .38 + k * .2, H + .26, -.48, mulC(COL.ember, .8), { l: L_METAL, w: 6, h: 4, smooth: false, emis: .35 });
    });
    if (pa >= 3) { mounts.gunR *= 1.25; mounts.gunLen *= 1.12; }
  } else if (kind === 'spire') {
    const H = [2.7, 3.4, 4.1][lvl], bas = COL.basalt, basL = COL.basaltL, cu = C(0x8a5a3a);
    piece('plinth', 0, S => { S.box(1.55, .22, 1.55, 0, .11, 0, basL, { l: L_ROCK }); S.box(1.18, .2, 1.18, 0, .32, 0, bas, { l: L_ROCK }); if (lvl >= 1) for (const [a, b] of corners) S.cone(.16, .5, a * .62, .5, b * .62, basL, { n: 4, l: L_ROCK }); });
    piece('shaft', 1, S => {
      S.cyl(.62, H - .42, 0, .42 + (H - .42) / 2, 0, bas, { n: 4, l: L_ROCK, rt: .52, r: [0, PI / 4, 0], jit: .03 });
      for (let k = 0; k < 4; k++) { const a = k * HPI, n = 3 + lvl; for (let j = 0; j < n; j++) { const u = (j + .7) / (n + .6), y = .42 + u * (H - .42), rr2 = lerp(.62, .32, u) * .7072 + .012; S.box(.07, .2, .02, Math.sin(a) * rr2, y, Math.cos(a) * rr2, COL.crystal, { emis: .5, jit: 0, r: [-.12, a, 0], ro: 'YXZ' }); } }
    });
    if (lvl >= 1) piece('bands', 2, S => { for (const u of lvl === 2 ? [.3, .58, .82] : [.4, .75]) S.cyl(lerp(.62, .32, u) + .03, .09, 0, .42 + u * (H - .42), 0, cu, { n: 4, l: L_METAL, r: [0, PI / 4, 0], rough: .45 }); });
    piece('claws', 3, S => { for (let k = 0; k < 4; k++) { const a = k * HPI + PI / 4, cs = Math.cos(a), sn = Math.sin(a); S.seg([cs * .22, H - .12, sn * .22], [cs * .46, H + .26, sn * .46], .06, .045, basL, { l: L_ROCK, n: 4 }); S.seg([cs * .46, H + .26, sn * .46], [cs * .26, H + .74, sn * .26], .045, .012, lvl ? cu : basL, { l: lvl ? L_METAL : L_ROCK, n: 4 }); } S.cyl(.34, .12, 0, H - .02, 0, basL, { n: 4, l: L_ROCK, r: [0, PI / 4, 0] }); });
    mounts.crystal = [0, H + .42, 0]; mounts.crystalS = [.2, .24, .29][lvl]; mounts.shards = [0, 2, 4][lvl]; mounts.rings = lvl === 2; mounts.top = H + 1.2; mounts.flame = null; mounts.lightAt = [0, H + .45, 0];
    if (pa || pb) piece('accent', 8, S => {
      for (let k = 0; k < pa; k++) S.cyl(.36 + k * .05, .06, 0, H - .25 - k * .32, 0, cu, { n: 8, l: L_METAL, rough: .4 });
      if (pa >= 3) for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; S.seg([Math.cos(a) * .3, H + .1, Math.sin(a) * .3], [Math.cos(a) * .55, H + .75, Math.sin(a) * .55], .03, .015, cu, { l: L_METAL, n: 4 }); }
      for (let k = 0; k < pb; k++) { const [a, b] = corners[k % 4]; S.cone(.12, .55 + k * .12, a * .5, .42, b * .5, ice, { n: 4, emis: .45 }); }
      if (pb >= 3) for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; S.box(.16, .05, .05, Math.cos(a) * .72, H * .55, Math.sin(a) * .72, ice, { emis: .6, jit: 0, r: [0, -a, 0] }); }
    });
    if (pb > pa) mounts.lightCol = [.5, .95, 1.2]; else if (pa > pb) mounts.lightCol = [1, .9, .62];
  } else if (kind === 'forge') {
    // Caltrop forge: a squat stone forge with a chimney, a glowing furnace mouth, bellows, an anvil, and a sling arm on the roof
    const W = [1.5, 1.62, 1.75][lvl], D = W * .85, H = [1.05, 1.25, 1.45][lvl], cu = C(0x8a5a3a);
    piece('plinth', 0, S => { S.box(W + .35, .2, D + .5, 0, .1, .1, sdk, { l: L_MASON }); });
    piece('body', 1, S => {
      S.box(W, H, D, 0, .2 + H / 2, 0, st, { l: L_MASON, jit: .03 });
      for (let k = 0; k < 2 + lvl; k++) S.box(W + .03, .12, D + .03, 0, .45 + k * (H - .4) / (1.5 + lvl), 0, mixC(sdk, sl, rng()), { l: L_MASON });
      S.box(.62, .5, .1, 0, .5, D / 2, COL.black, { jit: 0 }); S.box(.48, .3, .06, 0, .42, D / 2 + .02, COL.ember, { emis: .9, jit: 0 });
      S.box(.78, .1, .16, 0, .8, D / 2 + .02, sdk, { l: L_MASON });
    });
    piece('chimney', 2, S => { const x = -W * .3, z = -D * .22, ch = H + 1.0 + lvl * .3; S.cyl(.26, ch, x, .2 + ch / 2, z, sdk, { n: 6, l: L_MASON, rt: .8 }); S.cyl(.3, .14, x, .2 + ch, z, sl, { n: 6, l: L_MASON }); });
    piece('roof', 3, S => { S.box(W + .22, .12, D + .22, 0, .2 + H + .06, 0, lvl === 2 ? COL.slate : wd, { l: lvl === 2 ? L_SLATE : L_WOOD }); });
    piece('sling', 4, S => {
      const y0 = .2 + H + .12, x = W * .18;
      for (const sg of [-1, 1]) S.seg([x + sg * .3, y0, -.2], [x, y0 + .85, -.05], .05, .04, wd, { l: L_WOOD, n: 4 });
      S.seg([x - .55, y0 + .5, .45], [x + .25, y0 + .95, -.5], .045, .035, w, { l: L_WOOD, n: 4 });
      S.cyl(.17, .1, x - .55, y0 + .48, .45, iron, { n: 8, l: L_METAL, rt: 1.3 });
      for (let k = 0; k < 4; k++) S.cone(.05, .1, x - .55 + rr(-.08, .08), y0 + .57, .45 + rr(-.08, .08), COL.ironL, { n: 3, l: L_METAL });
    });
    piece('works', 5, S => {
      S.box(.42, .26, .22, W / 2 + .3, .34, D / 2 - .05, iron, { l: L_METAL }); S.box(.22, .2, .16, W / 2 + .3, .55, D / 2 - .05, iron, { l: L_METAL }); S.box(.3, .3, .3, W / 2 + .3, .1, D / 2 - .05, wd, { l: L_WOOD });
      S.box(.5, .22, .34, -W / 2 - .26, .45, .15, COL.leather, { l: L_WOOD }); S.seg([-W / 2 - .26, .58, .3], [-W / 2 - .05, .55, .3], .03, .03, wd, { l: L_WOOD, n: 3 });
    });
    if (pa || pb) piece('accent', 8, S => {
      const y0 = .2 + H + .12;
      for (let k = 0; k < pa; k++) { const x = (k - 1) * W * .34; S.cone(.07, .3, x, y0 + .12, D / 2 + .05, COL.ironL, { n: 4, l: L_METAL }); S.cone(.07, .3, x, y0 + .12, -D / 2 - .05, COL.ironL, { n: 4, l: L_METAL }); }
      if (pa >= 2) for (const sg of [-1, 1]) S.box(.3, .1, .05, sg * W * .3, .2 + H * .6, D / 2 + .02, COL.ember, { emis: .8, jit: 0 });
      if (pa >= 3) for (let k = 0; k < 3; k++) { const x = -W / 2 + .2 + k * .32; S.cyl(.14, .34, x, .37, D / 2 + .38, COL.woodD, { n: 8, l: L_WOOD }); S.cyl(.145, .05, x, .44, D / 2 + .38, COL.clothR, { n: 8 }); S.cyl(.03, .06, x, .57, D / 2 + .38, COL.black, { n: 4 }); }
      for (let k = 0; k < pb; k++) S.box(W + .06, .06, D + .06, 0, .3 + k * .3, 0, COL.steel, { l: L_METAL, rough: .45 });
      if (pb >= 2) S.box(.5, .7, .06, -W / 2 - .02, .6, -.1, mulC(COL.steel, .8), { l: L_METAL, r: [0, HPI, 0] });
      if (pb >= 3) { for (const sg of [-1, 1]) S.box(W + .26, .05, .06, 0, y0, sg * (D / 2 + .1), gold, { l: L_METAL, emis: .1, jit: 0 }); for (let k = 0; k < 5; k++) S.cone(.06, .34, -W / 2 + .2 + k * .25, y0 + .17, -D / 2 + .1, gold, { n: 4, l: L_METAL, emis: .1 }); }
    });
    mounts.flame = [0, .45, D / 2 + .08]; mounts.flameSize = .34 + lvl * .08; mounts.top = H + 1.9 + lvl * .3; mounts.sling = [W * .18 - .55, .2 + H + .7, .45];
    if (pa >= 2) mounts.emCol = [1, .45, .2];
  } else if (kind === 'alch') {
    // Alchemist brazier: a copper cauldron over a green-lit brazier on a stone plinth, with a rack of flasks and, later, alembics
    const H = [.3, .42, .55][lvl], cu = C(0x8a5a3a), brew = C(0x7fe05a), amber = C(0xe0a040);
    piece('plinth', 0, S => { S.cyl(1.0, .26, 0, .13, 0, sdk, { n: 8, l: L_MASON, r: [0, PI / 8, 0] }); if (lvl >= 1) S.cyl(.84, H - .26, 0, .26 + (H - .26) / 2, 0, st, { n: 8, l: L_MASON, r: [0, PI / 8, 0] }); });
    piece('cauldron', 1, S => {
      for (let k = 0; k < 3; k++) { const a = k * TAU / 3 + .4; S.seg([Math.cos(a) * .46, H, Math.sin(a) * .46], [Math.cos(a) * .34, H + .4, Math.sin(a) * .34], .035, .03, iron, { l: L_METAL, n: 4 }); }
      S.cyl(.52, .46, 0, H + .55, 0, cu, { n: 10, l: L_METAL, rt: 1.12, rough: .5 }); S.cyl(.6, .06, 0, H + .8, 0, mulC(cu, .8), { n: 10, l: L_METAL });
      S.cyl(.52, .04, 0, H + .76, 0, brew, { n: 10, emis: .7, jit: 0 });
      S.cyl(.3, .08, 0, H + .1, 0, iron, { n: 8, l: L_METAL, rt: 1.3 });
    });
    piece('rack', 2, S => {
      const x = -.85, z = -.1; S.box(.08, .9, .08, x, H + .45, z - .35, wd, { l: L_WOOD }); S.box(.08, .9, .08, x, H + .45, z + .35, wd, { l: L_WOOD });
      for (const y of [.35, .7]) { S.box(.22, .04, .8, x, H + y, z, w, { l: L_WOOD }); for (let k = 0; k < 3; k++) S.sph(.07, x, H + y + .09, z - .25 + k * .25, k & 1 ? amber : brew, { emis: .5, w: 6, h: 4 }); }
    });
    if (lvl >= 1) piece('alembic', 3, S => { S.cyl(.12, .9, .7, H + .45, -.35, st, { n: 6, l: L_MASON }); S.sph(.2, .7, H + 1.05, -.35, cu, { l: L_METAL, w: 7, h: 5 }); S.seg([.7, H + 1.15, -.35], [.3, H + .95, -.1], .03, .025, cu, { l: L_METAL, n: 4 }); });
    if (lvl >= 2) piece('arch', 4, S => { for (const sg of [-1, 1]) S.seg([sg * .78, H, .55], [sg * .5, H + 1.9, .2], .06, .05, wd, { l: L_WOOD, n: 4 }); S.seg([-.5, H + 1.9, .2], [.5, H + 1.9, .2], .05, .05, wd, { l: L_WOOD, n: 4 }); S.seg([0, H + 1.9, .2], [0, H + 1.5, .2], .015, .015, iron, { l: L_METAL, n: 3 }); S.box(.16, .2, .16, 0, H + 1.4, .2, brew, { emis: .7, jit: 0 }); });
    if (pa || pb) piece('accent', 8, S => {
      for (let k = 0; k < pa; k++) { const a = 2.2 + k * .5; S.sph(.09, Math.cos(a) * .82, H + .1, Math.sin(a) * .82, amber, { emis: .6, w: 6, h: 4 }); S.cyl(.03, .1, Math.cos(a) * .82, H + .22, Math.sin(a) * .82, COL.woodL, { n: 4 }); }
      if (pa >= 3) { S.cyl(.2, 2.2, .72, 1.1, .62, st, { n: 6, l: L_MASON, rt: .85 }); S.cone(.28, .4, .72, 2.4, .62, gold, { n: 8, l: L_METAL, emis: .1 }); }
      for (let k = 0; k < pb; k++) { const a = -.6 - k * .55, x = Math.cos(a) * .85, z = Math.sin(a) * .85; S.cyl(.17, .34, x, H + .17, z, COL.woodD, { n: 8, l: L_WOOD }); S.cyl(.15, .03, x, H + .35, z, brew, { n: 8, emis: .6, jit: 0 }); if (pb >= 3) S.sph(.07, x, H + .44, z, COL.bone, { l: L_BONE, w: 6, h: 4 }); }
      if (pb >= 3) S.cyl(.68, .08, 0, H + .86, 0, mulC(brew, .6), { n: 10, emis: .4 });
    });
    mounts.flame = [0, H + .12, 0]; mounts.flameSize = .42 + lvl * .06; mounts.flameCol = [.55, 1.35, .45]; mounts.emCol = [.55, 1, .4]; mounts.top = H + (lvl >= 2 ? 2.2 : 1.5) + (pa >= 3 ? .9 : 0);
    if (pa >= 3) { mounts.flame2 = [.72, 2.62, .62]; mounts.flame2Col = [1.4, 1.0, .35]; mounts.flame2Size = .3; }
    mounts.flask = [0, H + 1.0, 0];
  } else if (kind === 'foundry') {
    // Gold foundry: a tapering stone smelter with a crucible spout pouring gold, a tall chimney and stacked ingots
    const Rr = [.85, .92, 1.0][lvl], H = [1.35, 1.65, 1.95][lvl], molten = C(0xffb030);
    piece('plinth', 0, S => { S.box(2.1, .2, 2.0, 0, .1, 0, sdk, { l: L_MASON }); });
    piece('smelter', 1, S => {
      S.cyl(Rr, H, 0, .2 + H / 2, 0, st, { n: 8, l: L_MASON, rt: .72, jit: .03 });
      for (let k = 0; k < 2 + lvl; k++) S.cyl(Rr * (1 - .25 * (k + .5) / (2 + lvl)) + .02, .1, 0, .45 + k * (H - .45) / (2 + lvl), 0, mixC(sdk, sl, rng()), { n: 8, l: L_MASON });
      S.box(.42, .36, .1, 0, .55, Rr * .92, COL.black, { jit: 0 }); S.box(.32, .2, .06, 0, .5, Rr * .95, COL.ember, { emis: .9, jit: 0 });
    });
    piece('spout', 2, S => { S.box(.2, .1, .55, 0, .74, Rr + .2, iron, { l: L_METAL, r: [-.3, 0, 0] }); S.cyl(.24, .22, 0, .32, Rr + .55, iron, { n: 8, l: L_METAL, rt: 1.2 }); S.cyl(.2, .04, 0, .44, Rr + .55, molten, { n: 8, emis: .9, jit: 0 }); S.box(.05, .3, .05, 0, .6, Rr + .5, molten, { emis: .9, jit: 0 }); });
    piece('chimney', 3, S => { const ch = .9 + lvl * .25; S.cyl(.22, ch, 0, .2 + H + ch / 2, 0, sdk, { n: 6, l: L_MASON }); S.cyl(.27, .12, 0, .2 + H + ch, 0, sl, { n: 6, l: L_MASON }); });
    piece('ingots', 4, S => { for (let k = 0; k < 2 + lvl; k++) S.box(.28, .1, .14, -1.0 + (k % 2) * .3, .26 + Math.floor(k / 2) * .1, .55, gold, { l: L_METAL, emis: .12, rough: .35 }); S.box(.7, .1, .5, -1.0, .15, .55, wd, { l: L_WOOD }); });
    if (lvl >= 1) piece('shed', 5, S => { S.box(.12, 1.1, .12, .95, .75, -.55, wd, { l: L_WOOD }); S.box(.12, 1.1, .12, .95, .75, .45, wd, { l: L_WOOD }); S.box(.7, .08, 1.3, .8, 1.32, -.05, lvl === 2 ? COL.slate : COL.thatch, { l: lvl === 2 ? L_SLATE : L_THATCH, r: [0, 0, -.35] }); });
    if (pa || pb) piece('accent', 8, S => {
      for (let k = 0; k < pa; k++) for (let j = 0; j < 3; j++) S.box(.26, .09, .13, .55 + j * .02, .26 + k * .1, .95 - j * .15, gold, { l: L_METAL, emis: .15, rough: .35 });
      if (pa >= 3) { S.sph(.34, 0, .2 + H + .05, 0, gold, { l: L_METAL, w: 8, h: 5, emis: .12 }); S.seg([-.4, .2 + H, -.5], [-.4, .2 + H + 1.6, -.5], .035, .025, COL.woodD, { l: L_WOOD, n: 4 }); S.box(.5, .36, .03, -.14, .2 + H + 1.38, -.5, gold, { l: L_METAL, emis: .1, jit: 0 }); }
      for (let k = 0; k < pb; k++) S.box(.06, .5 + k * .1, .44, -Rr - .02, .5 + k * .08, -.1, k ? COL.iron : COL.steel, { l: L_METAL, rough: .45 });
      if (pb >= 2) for (const sg of [-1, 1]) S.box(.05, .05, .5, -Rr - .05, .5 + sg * .22, -.1, gold, { l: L_METAL, jit: 0 });
      if (pb >= 3) { S.seg([.9, 1.4, .9], [.9, 3.0, .9], .035, .025, COL.woodD, { l: L_WOOD, n: 4 }); S.box(.5, .4, .03, 1.16, 2.76, .9, cloth(COL.clothB), { l: L_WOOD, jit: 0 }); S.box(.5, .05, .04, 1.16, 2.97, .9, gold, { l: L_METAL, jit: 0 }); S.seg([-.5, 1.0, 1.0], [-.5, 1.6, 1.0], .02, .02, COL.brass, { l: L_METAL, n: 3 }); S.seg([-.8, 1.55, 1.0], [-.2, 1.55, 1.0], .02, .02, COL.brass, { l: L_METAL, n: 3 }); for (const x of [-.8, -.2]) S.cyl(.1, .03, x, 1.4, 1.0, COL.brass, { n: 8, l: L_METAL }); }
    });
    mounts.flame = [0, .55, Rr * .98]; mounts.flameSize = .26 + lvl * .04; mounts.flameCol = [1.3, .95, .45]; mounts.top = H + 1.4 + lvl * .25; mounts.chimney = [0, .2 + H + .9 + lvl * .25 + .1, 0];
  } else {
    const W = [1.5, 1.7, 1.9][lvl], D = [1.3, 1.4, 1.5][lvl], wh = [1.05, 1.25, 1.5][lvl], stoneWalls = lvl === 2;
    piece('floor', 0, S => { S.box(W + .5, .16, D + .7, 0, .08, .1, sdk, { l: L_MASON }); S.box(.7, .1, .4, 0, .05, D / 2 + .55, st, { l: L_MASON }); });
    piece('walls', 1, S => {
      const wc = stoneWalls ? st : C(0x8f8468), wlay = stoneWalls ? L_MASON : L_PLAIN;
      if (lvl === 1) S.box(W + .04, .5, D + .04, 0, .41, 0, st, { l: L_MASON });
      S.box(W, wh, D, 0, .16 + wh / 2, 0, wc, { l: wlay, jit: .03 });
      if (!stoneWalls) { for (const [a, b] of corners) S.box(.12, wh + .04, .12, a * W / 2, .16 + wh / 2, b * D / 2, wd, { l: L_WOOD }); for (const sg of [-1, 1]) { S.box(W, .1, .08, 0, .16 + wh * .55, sg * D / 2, wd, { l: L_WOOD }); S.seg([sg * W * .5, .2, D / 2 + .01], [sg * W * .22, .16 + wh, D / 2 + .01], .04, .04, wd, { l: L_WOOD, n: 4 }); } S.box(.08, .1, D, W / 2, .16 + wh * .55, 0, wd, { l: L_WOOD }); S.box(.08, .1, D, -W / 2, .16 + wh * .55, 0, wd, { l: L_WOOD }); }
      S.box(.5, .82, .12, 0, .57, D / 2, COL.black, { jit: 0 }); S.box(.66, .1, .16, 0, 1.02, D / 2 + .02, wd, { l: L_WOOD }); for (const sg of [-1, 1]) S.box(.09, .86, .16, sg * .29, .59, D / 2 + .02, wd, { l: L_WOOD });
      S.box(.24, .24, .08, W * .32, .16 + wh * .62, D / 2 + .01, COL.black, { jit: 0 }); S.box(.08, .3, .3, W / 2 + .01, .16 + wh * .6, 0, COL.black, { jit: 0 });
    });
    piece('roof', 2, S => {
      const rl = lvl === 0 ? L_THATCH : L_SLATE, rc = lvl === 0 ? COL.thatch : COL.slate, y0 = .16 + wh, rh = [.75, .85, .9][lvl], sl2 = Math.atan2(rh, D / 2 + .2), len = Math.hypot(rh, D / 2 + .2) + .12;
      for (const sg of [-1, 1]) S.box(W + .36, .09, len, 0, y0 + rh / 2 - .02, sg * (D / 4 + .1), rc, { l: rl, r: [sg * sl2, 0, 0] });
      for (const sg of [-1, 1]) { const T = [[sg * W / 2, y0, -D / 2], [sg * W / 2, y0, D / 2], [sg * W / 2, y0 + rh, 0]]; const gc = stoneWalls ? st : C(0x8f8468); if (sg > 0) S.tri(T[0], T[2], T[1], gc, stoneWalls ? L_MASON : L_PLAIN, .95); else S.tri(T[0], T[1], T[2], gc, stoneWalls ? L_MASON : L_PLAIN, .95); }
      S.box(W + .44, .1, .14, 0, y0 + rh + .02, 0, wd, { l: L_WOOD });
      S.box(.26, .5, .26, -W * .3, y0 + rh * .7 + .1, -D * .2, sdk, { l: L_MASON });
    });
    piece('rack', 3, S => { const x = -W / 2 - .28; S.box(.06, .7, .06, x, .5, -.3, wd, { l: L_WOOD }); S.box(.06, .7, .06, x, .5, .3, wd, { l: L_WOOD }); S.box(.05, .05, .7, x, .78, 0, w, { l: L_WOOD }); for (const z of [-.2, 0, .2]) { S.seg([x + .06, .12, z], [x - .04, 1.5, z], .018, .018, wl, { l: L_WOOD, n: 4 }); S.cone(.035, .14, x - .045, 1.56, z, COL.steel, { n: 4, l: L_METAL }); } if (lvl >= 1) { S.cyl(.2, .04, W / 2 + .03, .75, -.25, COL.clothB, { n: 8, r: [0, 0, HPI], l: L_WOOD }); } });
    if (lvl === 2) piece('turret', 4, S => { const x = W / 2 - .2, z = -D / 2 + .2, th = 2.7; S.box(.8, th, .8, x, th / 2 + .16, z, st, { l: L_MASON }); S.box(.94, .16, .94, x, th + .2, z, sl, { l: L_MASON }); for (const [a, b] of corners) S.box(.24, .26, .24, x + a * .35, th + .4, z + b * .35, mixC(sdk, sl, rng()), { l: L_MASON }); S.box(.1, .4, .06, x, th * .7, z + .41, COL.black, { jit: 0 }); });
    const fx = W / 2 + .12, fz = D / 2 + .5, bs = [.34, .46, .6][lvl];
    piece('fire', 5, S => { if (lvl === 0) { S.seg([fx, 0, fz], [fx, 1.05, fz], .04, .035, wd, { l: L_WOOD, n: 4 }); S.cyl(.07, .12, fx, 1.1, fz, iron, { n: 6, l: L_METAL, rt: 1.4 }); } else brazier(S, fx, .08, fz, bs + .1); });
    piece('flag', 6, S => { const x = lvl === 2 ? W / 2 - .2 : -W / 2 + .1, z = lvl === 2 ? -D / 2 + .2 : -D / 2 + .1, y0 = lvl === 2 ? 3.1 : .2, y1 = lvl === 2 ? 4.5 : 2.9; S.seg([x, y0, z], [x, y1, z], .04, .028, wd, { l: L_WOOD, n: 4 }); const T = new Soup(); clothPanel(T, { x0: 0, x1: .7, yTop: 0, len: .46, z: 0, col: COL.clothB, col2: mulC(COL.gold, .6), rng, nx: 4, ny: 3, rag: .2, sway: 1.1 }); S.merge(T, { p: [x + .03, y1 - .06, z], ao: null }); });
    mounts.flame = lvl === 0 ? [fx, 1.2, fz] : [fx, .08 + (bs + .1) * .72, fz]; mounts.flameSize = bs; mounts.door = [0, 0, D / 2 + .45]; mounts.top = lvl === 2 ? 3.4 : 2.2;
    if (pa || pb) piece('accent', 8, S => {
      for (let k = 0; k < pa; k++) { const x = (k - 1) * W * .3; S.cyl(.17, .04, x, .16 + wh * .72, D / 2 + .05, COL.ironL, { n: 8, r: [HPI, 0, 0], l: L_METAL }); S.sph(.04, x, .16 + wh * .72, D / 2 + .08, COL.iron, { l: L_METAL }); }
      if (pa >= 3) { const x = -W / 2 + .15, z = D / 2 - .15, y0 = .16 + wh; S.seg([x, y0, z], [x, y0 + 2.2, z], .04, .03, COL.iron, { l: L_METAL, n: 4 }); S.box(.5, .6, .03, x + .27, y0 + 1.8, z, mulC(COL.ironL, 1.2), { l: L_METAL, jit: 0 }); S.box(.5, .1, .035, x + .27, y0 + 1.65, z, cloth(COL.clothB), { l: L_WOOD, jit: 0 }); }
      for (let k = 0; k < pb; k++) { const sg = k & 1 ? -1 : 1, z = (k >> 1) * .4 - .2; S.box(.03, .5, .3, sg * (W / 2 + .03), .16 + wh * .55, z, cloth(COL.clothR), { l: L_WOOD, jit: 0 }); S.box(.035, .06, .32, sg * (W / 2 + .035), .16 + wh * .8, z, gold, { l: L_METAL, jit: 0 }); }
      if (pb >= 2) { S.box(.42, .28, .3, W * .32, .3, D / 2 + .45, COL.wood, { l: L_WOOD }); S.box(.44, .06, .32, W * .32, .46, D / 2 + .45, gold, { l: L_METAL, emis: .15, jit: 0 }); }
      if (pb >= 3) { const x = W / 2 - .2, y0 = .16 + wh + .9; S.seg([x, y0 - .9, -D / 2 + .2], [x, y0 + 2.4, -D / 2 + .2], .045, .03, COL.woodD, { l: L_WOOD, n: 4 }); S.box(.8, .52, .03, x - .42, y0 + 2.05, -D / 2 + .2, gold, { l: L_METAL, emis: .1, jit: 0 }); }
    });
    if (pa >= 3 || pb >= 3) mounts.top = Math.max(mounts.top, 3.6);
  }
  pieces.sort((a, b) => a.order - b.order);
  return { pieces, mounts };
}

function scaffoldGeo(w, h) {
  const S = new Soup(), c = mulC(COL.woodL, .9), c2 = COL.wood;
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) S.seg([a * w, 0, b * w], [a * w, h, b * w], .04, .035, c, { l: L_WOOD, n: 4 });
  for (let y = .9; y < h; y += 1.05) for (let k = 0; k < 4; k++) { const q = [[-1, -1], [1, -1], [1, 1], [-1, 1]], [a, b] = q[k], [cc, d] = q[(k + 1) % 4]; S.seg([a * w, y, b * w], [cc * w, y, d * w], .03, .03, c2, { l: L_WOOD, n: 4 }); if (k & 1) S.seg([a * w, y - .9, b * w], [cc * w, y, d * w], .022, .022, c, { l: L_WOOD, n: 3 }); }
  S.box(w * 1.2, .05, .34, 0, Math.min(h - .2, 1.95), w + .12, c2, { l: L_WOOD }); S.box(.34, .05, w * 1.2, -w - .12, Math.min(h - .25, .95), 0, c, { l: L_WOOD });
  return S.build();
}

let TOWER_STUN = false;
const TARGET_MODES = ['first', 'last', 'close', 'strong'];
const TARGET_LABEL = { first: 'First', last: 'Last', close: 'Close', strong: 'Strong' };
// true when monster a (at squared distance da) should be preferred over b (at db) under mode
function targetBetter(mode, a, da, b, db) {
  if (mode === 'last') return a.prog < b.prog;
  if (mode === 'close') return da < db;
  if (mode === 'strong') {
    if (a.hp !== b.hp) return a.hp > b.hp;
    if (a.prog !== b.prog) return a.prog > b.prog;
    return !!a.def.boss && !b.def.boss;
  }
  return a.prog > b.prog;
}
function findTarget(x, z, range, air, ground, minRange = 0, mode = 'first') {
  if (G.phase !== 'play' || TOWER_STUN) return null;
  let best = null, bd = 0; const r2 = range * range, m2 = minRange * minRange;
  for (const m of G.mons) {
    if (m.dead || m.hp <= 0 || !m.vis) continue; if (m.fly ? !air : !ground) continue;
    const d = dist2(x, z, m.x, m.z); if (d > r2 || d < m2) continue;
    if (!best || targetBetter(mode, m, d, best, bd)) { best = m; bd = d; }
  }
  return best;
}
// the best n targets in range, best first, by the same rules as findTarget
function findTargets(x, z, range, air, ground, minRange, mode, n) {
  if (G.phase !== 'play' || TOWER_STUN) return [];
  const r2 = range * range, m2 = minRange * minRange, out = [];
  for (const m of G.mons) { if (m.dead || m.hp <= 0 || !m.vis) continue; if (m.fly ? !air : !ground) continue; const d = dist2(x, z, m.x, m.z); if (d > r2 || d < m2) continue; out.push([m, d]); }
  out.sort((p, q) => targetBetter(mode, p[0], p[1], q[0], q[1]) ? -1 : targetBetter(mode, q[0], q[1], p[0], p[1]) ? 1 : 0);
  return out.slice(0, n).map(p => p[0]);
}
function aimPoint(m, dt, out) {
  if (m.fly) { out.x = m.x + m.vx * dt; out.y = m.y; out.z = m.z + m.vz * dt; return out; }
  const B = G.B, adv = m.blocked ? 0 : m.spdNow * dt, s2 = Math.min(B.L - .1, m.s + adv);
  pathAt(B, s2, out); out.x += -out.tz * m.lat; out.z += out.tx * m.lat; out.y += m.hitH; return out;
}

const _tv = new THREE.Vector3(), _tq = new THREE.Quaternion(), _tm = new THREE.Matrix4(), _tz = new THREE.Vector3(0, 0, 1), _ts = new THREE.Vector3(1, 1, 1), _ap = { x: 0, y: 0, z: 0, tx: 0, tz: 0 };

class Tower {
  constructor(pad, kind, idx) {
    this.pad = pad; this.kind = kind; this.idx = idx; this.paths = [0, 0]; this.def = TOWER[kind]; this.st = towerStats(kind, this.paths);
    this.haste = 1; this.volleyT = 2; this.volleyQ = []; this.discharges = 0; this.auraT = 0;
    // counters for the sheet, and the tier-3 active ability (see 64-abilities.js)
    this.income = 0; this.ability = null; this.abCd = 0; this.abMax = 0; this.abUses = 0; this.stormT = 0; this.stormAcc = 0; this.rallyT = 0; this.boltQ = [];
    this.x = pad.x; this.y = pad.y; this.z = pad.z; this.yaw = pad.face; this.cs = Math.cos(this.yaw); this.sn = Math.sin(this.yaw);
    this.spent = this.def.cost[0]; this.state = 'build'; this.bt = 0; this.cool = rr(.2, .8); this.kills = 0; this.dealt = 0; this.alive = true; this.recent = 0; this.targetMode = 'first';
    this.group = new THREE.Group(); this.group.position.set(this.x, this.y, this.z); this.group.rotation.y = this.yaw; R.scene.add(this.group);
    this.pieces = []; this.staticMesh = null; this.scaf = null; this.flame = null; this.flame2 = null; this.archers = []; this.men = []; this.respawn = 0;
    this.em = { x: this.x, y: this.y + 3, z: this.z, r: 1, g: .56, b: .26, I: 0, range: 13, on: 0, alive: true, seed: rnd() * 50, spot: kind !== 'spire', dx: this.sn, dz: this.cs, fl: 1, _spot: 0, heat: 0 };
    addEmitter(this.em); pad.tower = this;
    this.footing = new THREE.Mesh(towerFooting(G.B.bio, pad.depth || .3, makeRng(idx * 7919 + 3)).build(), MAT.world); this.footing.castShadow = this.footing.receiveShadow = true; this.group.add(this.footing);
    this.gunYaw = 0; this.recoil = 0; this.charge = 0; this.spin = rnd() * 6; this.hover = 0; this.appear = 0;
    this.begin();
  }
  get range() { return this.st.range * (this.rangeMul || 1); }
  // the look follows the higher path: 0, 1, 2, with tier 3 adding a capstone
  get lvl() { return Math.min(2, Math.max(this.paths[0], this.paths[1])); }
  get tier() { return Math.max(this.paths[0], this.paths[1]); }
  w(l, out) { out.x = this.x + l[0] * this.cs + l[2] * this.sn; out.y = this.y + l[1]; out.z = this.z - l[0] * this.sn + l[2] * this.cs; return out; }
  begin() {
    const bp = blueprint(this.kind, this.lvl, this.paths, this.paragon); this.bp = bp; this.mounts = bp.mounts; this.bt = 0; this.state = this.tier ? 'upgrade' : 'build';
    this.clearModel(true);
    const n = bp.pieces.length, gap = Math.min(.2, 1.45 / n);
    bp.pieces.forEach((p, i) => {
      const mesh = new THREE.Mesh(p.soup.build(), MAT.world); mesh.castShadow = mesh.receiveShadow = true; mesh.visible = false; mesh.position.y = p.y + 2.4;
      this.group.add(mesh); this.pieces.push({ mesh, y: p.y, t0: .32 + i * gap, landed: false, soup: p.soup });
    });
    this.tEnd = .32 + n * gap + .3;
    this.scaf = new THREE.Mesh(scaffoldGeo(1.25, Math.min(4.4, bp.mounts.top + .3)), MAT.world); this.scaf.castShadow = true; this.scaf.scale.set(1, .01, 1); this.group.add(this.scaf);
    fxDust(this.x, this.y + .1, this.z, 7, 1.0, { speed: 1.6 });
    sfx('hammer', this.x, this.z, .8, .3);
  }
  clearModel(keepLights) {
    for (const p of this.pieces) { this.group.remove(p.mesh); p.mesh.geometry.dispose(); } this.pieces.length = 0;
    for (const k of ['staticMesh', 'scaf', 'carriage', 'crystal']) if (this[k]) { this.group.remove(this[k]); this[k].traverse(o => { if (o.geometry) o.geometry.dispose(); }); this[k] = null; }
    this.barrel = null; this.shards = null; this.ringG = null;
    removeFlame(this.flame); removeFlame(this.flame2); this.flame = this.flame2 = null; this.em.on = keepLights ? this.em.on * .4 : 0;
    this.archers.length = 0;
    if (!keepLights && this.footing) { this.group.remove(this.footing); this.footing.geometry.dispose(); this.footing = null; }
  }
  finish() {
    const M = new Soup(); for (const p of this.pieces) M.merge(p.soup, { p: [0, p.y, 0], ao: [0, 1.0, .72] });
    for (const p of this.pieces) { this.group.remove(p.mesh); p.mesh.geometry.dispose(); } this.pieces.length = 0;
    this.staticMesh = new THREE.Mesh(M.build(), MAT.world); this.staticMesh.castShadow = this.staticMesh.receiveShadow = true; this.group.add(this.staticMesh);
    if (this.scaf) { this.group.remove(this.scaf); this.scaf.geometry.dispose(); this.scaf = null; }
    const mt = this.mounts, lvl = this.lvl, d = this.def;
    if (mt.flame) { const p = this.w(mt.flame, {}), fc = mt.flameCol || [1, 1, 1], ec = mt.emCol || [1, .56, .26]; this.flame = addFlame({ x: p.x, y: p.y, z: p.z, size: mt.flameSize, on: 0, layers: mt.flameSize > .7 ? 2 : 1, glow: 1, r: fc[0], g: fc[1], b: fc[2] }); this.em.x = p.x; this.em.y = p.y + .25; this.em.z = p.z; this.em.r = ec[0]; this.em.g = ec[1]; this.em.b = ec[2]; }
    if (mt.flame2) { const p = this.w(mt.flame2, {}), fc = mt.flame2Col || [1, 1, 1]; this.flame2 = addFlame({ x: p.x, y: p.y, z: p.z, size: mt.flame2Size || mt.flameSize, on: 0, r: fc[0], g: fc[1], b: fc[2] }); }
    if (mt.lightAt) { const p = this.w(mt.lightAt, {}), lc = mt.lightCol || [.45, .72, 1]; this.em.x = p.x; this.em.y = p.y; this.em.z = p.z; this.em.r = lc[0]; this.em.g = lc[1]; this.em.b = lc[2]; }
    this.em.I = d.light[lvl] * (this.paragon ? 1.6 : this.tier >= 3 ? 1.25 : 1); if (this.paragon && !mt.lightAt && !mt.emCol) { this.em.r = 1; this.em.g = .72; this.em.b = .34; } this.em.range = this.kind === 'archer' ? 12 : 10.5;
    if (this.kind === 'archer') mt.archers.slice(0, this.st.n).forEach((a, i) => this.archers.push({ l: a, yaw: this.yaw, draw: 0, cool: .4 + i * .3, e: { scale: .82, ph: 0, mv: 0, atk: -1, bow: true, draw: 0, pitch: 0, tint: [1, .9, .7], x: 0, y: 0, z: 0, yaw: 0, flash: 0 } }));
    if (this.kind === 'bombard') this.makeGun();
    if (this.kind === 'spire') this.makeCrystal();
    if (this.kind === 'guard') { this.respawn = .2; }
    this.state = 'active'; this.appear = 0;
    fxDust(this.x, this.y + .2, this.z, 10, 1.3, { speed: 2.2 });
    sfx('buildDone', this.x, this.z, 1);
    if (this.flame) fxEmbers(this.flame.x, this.flame.y, this.flame.z, 10, .2);
  }
  makeGun() {
    const mt = this.mounts, L = mt.gunLen, r = mt.gunR, S = new Soup(), br = this.lvl === 2 ? COL.iron : COL.bronze;
    S.cyl(.42, .12, 0, .06, 0, COL.woodD, { n: 8, l: L_WOOD }); for (const sg of [-1, 1]) { S.box(.09, .34, .62, sg * (r + .07), .26, 0, COL.wood, { l: L_WOOD }); S.cyl(.17, .07, sg * (r + .16), .17, -.12, COL.woodD, { n: 8, r: [0, 0, HPI], l: L_WOOD }); }
    this.carriage = new THREE.Mesh(S.build(), MAT.world); this.carriage.castShadow = this.carriage.receiveShadow = true; this.carriage.position.set(mt.gun[0], mt.gun[1], mt.gun[2]); this.group.add(this.carriage);
    const Bq = new Soup(), o = () => ({ n: 8, l: L_METAL, r: [HPI, 0, 0], rough: .42 });
    Bq.cyl(r, L, 0, 0, L / 2 - .28, br, Object.assign(o(), { rt: .8 })); Bq.cyl(r * 1.16, .12, 0, 0, L - .3, br, o()); Bq.cyl(r * .62, .03, 0, 0, L - .235, COL.black, Object.assign(o(), { jit: 0 }));
    for (const z of [-.2, L * .25, L * .55]) Bq.cyl(r * 1.1 - z * .03, .07, 0, 0, z, mulC(br, .8), o());
    Bq.sph(r * .9, 0, 0, -.3, br, { l: L_METAL, w: 6, h: 4, smooth: false, rough: .42 }); Bq.sph(r * .32, 0, 0, -.3 - r * .9, mulC(br, .8), { l: L_METAL, w: 5, h: 3, smooth: false });
    this.barrel = new THREE.Mesh(Bq.build(), MAT.world); this.barrel.castShadow = this.barrel.receiveShadow = true; this.barrel.position.set(0, .4, 0); this.barrel.rotation.x = -.42; this.carriage.add(this.barrel);
    this.gunYaw = this.yaw;
  }
  makeCrystal() {
    const mt = this.mounts, mk = (sx, sy) => { const S = new Soup(); S.add(gOct(), { s: [sx, sy, sx], c: [1, 1, 1], jit: 0, cf: v => .55 + .45 * smooth(-sy, sy, v.y) + (v.x > 0 ? .12 : 0) }); return S.build(); };
    this.cmat = new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(.3, .6, 1) });
    this.crystal = new THREE.Group(); this.crystal.position.set(mt.crystal[0], mt.crystal[1], mt.crystal[2]);
    const c = new THREE.Mesh(mk(mt.crystalS, mt.crystalS * 1.9), this.cmat); c.castShadow = true; this.crystal.add(c); this.core = c;
    this.shards = [];
    for (let i = 0; i < mt.shards; i++) { const s = new THREE.Mesh(mk(.07, .16), this.cmat); this.crystal.add(s); this.shards.push(s); }
    if (mt.rings) { const S = new Soup(); for (let k = 0; k < 7; k++) { if (k === 3) continue; const a = k / 7 * TAU; S.box(.5, .16, .2, Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0, COL.basaltL, { l: L_ROCK, r: [0, -a + HPI, 0] }); } this.ringG = new THREE.Mesh(S.build(), MAT.world); this.ringG.castShadow = true; this.ringG.position.y = -1.25; this.crystal.add(this.ringG); }
    this.group.add(this.crystal);
  }
  upgrade(i) {
    if (this.state !== 'active' || !canUpgradePath(this, i)) return false;
    this.spent += pathCost(this, i); this.paths[i]++; this.st = towerStats(this.kind, this.paths);
    if (this.paths[i] === 3) { this.ability = ABILITY_OF[this.kind][i]; this.abMax = ABILITY[this.ability].cd; this.abCd = 0; }
    for (const m of this.men) m.lvlUp = true; this.begin(); return true;
  }
  sell() {
    this.alive = false; this.em.alive = false; this.em.on = 0; removeEmitter(this.em); this.pad.tower = null;
    for (let i = 0; i < 14; i++) { _tm.compose(_tv.set(this.x + rr(-.7, .7), this.y + rr(.3, 2.4), this.z + rr(-.7, .7)), _tq.set(rr(-1, 1), rr(-1, 1), rr(-1, 1), 1).normalize(), _ts.set(1, 1, 1)); addDebris(this.kind === 'archer' || this.kind === 'guard' ? KIT.plank : KIT.rubble, _tm, null, rr(-2, 2), rr(1, 4), rr(-2, 2), rr(3, 9), rr(2, 3.5)); }
    fxDust(this.x, this.y + .4, this.z, 16, 1.6, { speed: 2.6 }); sfx('sell', this.x, this.z, 1);
    for (const m of this.men) m.leave = true;
    this.clearModel(false); R.scene.remove(this.group);
  }
  update(dt) {
    const d = this.def, lvl = this.lvl; this.recent = Math.max(0, this.recent - dt * .25); this.em.heat = Math.min(1, this.recent / 30);
    if (this.state !== 'active') {
      this.bt += dt * (G.prep ? 3 : 1); const bt = this.bt;
      if (this.scaf) this.scaf.scale.y = bt < this.tEnd - .25 ? easeOutBack(bt / .3) : Math.max(.01, 1 - (bt - (this.tEnd - .25)) / .25);
      for (const p of this.pieces) {
        const u = (bt - p.t0) / .24;
        if (u < 0) continue; p.mesh.visible = true;
        if (u < 1) p.mesh.position.y = p.y + (1 - u * u) * 2.2;
        else { p.mesh.position.y = p.y; const sq = clamp((u - 1) / .5, 0, 1); p.mesh.scale.y = 1 - .1 * Math.sin(sq * PI) * (1 - sq);
          if (!p.landed) { p.landed = true; fxDust(this.x + rr(-.5, .5), this.y + p.y + .1, this.z + rr(-.5, .5), 3, .55, { speed: 1.2, a: .4 }); sfx('hammer', this.x, this.z, .7, rnd()); } }
      }
      this.em.on = damp(this.em.on, 0, 4, dt);
      if (bt >= this.tEnd) this.finish();
      return;
    }
    this.appear = Math.min(1, this.appear + dt * 2.2);
    TOWER_STUN = this.stun > 0;
    if (TOWER_STUN) { this.stun -= dt; const k = Math.min(1, this.stun * 2); FX.add.push(this.x, this.y + 1.7, this.z, 4.2, 5.6, 0, 0, .2, .5, 1.2, .3 * k, 2, 0, 0, 0); if (rnd() < dt * 5) { const a = rnd() * TAU, h = rr(.6, 3); fxBolt([this.x + Math.cos(a) * .8, this.y + h, this.z + Math.sin(a) * .8], [this.x + Math.cos(a + 1.2) * .8, this.y + h + rr(-.5, .5), this.z + Math.sin(a + 1.2) * .8], .12, [.5, .85, 1.5], .03); } if (rnd() < dt * 18) fxPart(this.x + rr(-.7, .7), this.y + rr(.4, 3.2), this.z + rr(-.7, .7), 0, rr(-.5, .1), 0, rr(.4, .9), rr(.05, .08), .6, 1.1, 2.0, { drag: .5 }); }
    this.em.on = damp(this.em.on, TOWER_STUN ? .12 : 1, TOWER_STUN ? 8 : 3, dt);
    if (this.flame) this.flame.on = this.em.on; if (this.flame2) this.flame2.on = this.em.on;
    this.cool -= dt * this.haste;
    if (this.haste > 1 && rnd() < dt * 3) fxSparks(this.x + rr(-.6, .6), this.y + rr(.6, 2.2), this.z + rr(-.6, .6), 1, 1.2, 3.2, 2.4, .8, { size: .04, grav: -1 });
    // Berserker draught stretches range; damage is multiplied in hitMonster
    const st = this.rangeMul > 1 ? Object.assign({}, this.st, { range: this.st.range * this.rangeMul }) : this.st;
    if (this.kind === 'archer') this.updArcher(dt, st, lvl);
    else if (this.kind === 'bombard') this.updBombard(dt, st, lvl);
    else if (this.kind === 'spire') this.updSpire(dt, st, lvl);
    else if (this.kind === 'forge') this.updForge(dt, st, lvl);
    else if (this.kind === 'alch') this.updAlch(dt, st, lvl);
    else if (this.kind === 'foundry') this.updFoundry(dt, st, lvl);
    else this.updGuard(dt, st, lvl);
    TOWER_STUN = false;
  }
  updArcher(dt, st, lvl) {
    const tgt = findTarget(this.x, this.z, st.range, true, true, 0, this.targetMode), h = this.haste;
    // Fire volley: every few seconds each archer looses three flaming arrows at up to three foes
    if (st.volley) {
      this.volleyT -= dt * h;
      if (this.volleyT <= 0 && tgt) {
        this.volleyT = 5; const foes = findTargets(this.x, this.z, st.range, true, true, 0, this.targetMode, 3);
        this.archers.forEach((a, ai) => { for (let k = 0; k < 3; k++) this.volleyQ.push({ t: k * .13 + ai * .05, a, m: foes[(k + ai) % foes.length] }); });
        sfx('ignite', this.x, this.z, .6, .8);
      }
      for (let i = this.volleyQ.length - 1; i >= 0; i--) {
        const v = this.volleyQ[i]; v.t -= dt; if (v.t > 0) continue; this.volleyQ.splice(i, 1);
        if (!v.m || v.m.dead || v.m.hp <= 0) continue;
        const p = this.w(v.a.l, _ap); shootArrow(p.x + Math.sin(v.a.yaw) * .3, p.y + 1.0, p.z + Math.cos(v.a.yaw) * .3, v.m, st.dmg * .8, this, { fire: true, pierce: st.pierce });
        sfx('bow', p.x, p.z, .45, rnd());
      }
    }
    if (st.beam) { this.beamT = (this.beamT === undefined ? 1 : this.beamT) - dt * h; if (this.beamT <= 0 && tgt) { this.beamT = 2.5; const top = this.w([0, this.mounts.top - 1.4, 0], {}); paragonBeam(this, top.x, top.y, top.z, tgt.x - top.x, tgt.z - top.z, st.range + 4, st.dmg * 4); } }
    for (const a of this.archers) {
      const p = this.w(a.l, _ap), e = a.e; e.x = p.x; e.y = p.y - (1 - easeOut(this.appear)) * .5; e.z = p.z; e.scale = .82 * (.3 + .7 * this.appear);
      a.cool -= dt * h;
      if (tgt) {
        const T = clamp(Math.hypot(tgt.x - p.x, tgt.z - p.z) / 14, .22, .62), q = aimPoint(tgt, T, _ap2);
        a.yaw = angDamp(a.yaw, Math.atan2(q.x - p.x, q.z - p.z), 12, dt);
        e.pitch = clamp(Math.atan2(q.y - (p.y + 1), Math.hypot(q.x - p.x, q.z - p.z)) * .7 + .2, -.5, .6);
        a.draw = a.cool < .34 ? Math.min(1, a.draw + dt * 3.6) : Math.max(0, a.draw - dt * 6);
        if (a.cool <= 0 && a.draw > .95) {
          a.cool = st.rate * rr(.9, 1.12); a.draw = 0;
          const crit = st.crit > 0 && rnd() < st.crit;
          shootArrow(p.x + Math.sin(a.yaw) * .3, p.y + 1.0, p.z + Math.cos(a.yaw) * .3, tgt, st.dmg * (crit ? 3 : 1), this, { crit, pierce: st.pierce });
          sfx('bow', p.x, p.z, .6, rnd());
        }
      } else { a.draw = Math.max(0, a.draw - dt * 3); a.yaw = angDamp(a.yaw, this.yaw + Math.sin(G.t * .5 + a.l[0] * 3) * .5, 2, dt); e.pitch = damp(e.pitch, 0, 4, dt); if (a.cool < .3) a.cool = .3; }
      e.yaw = a.yaw; e.draw = a.draw;
      rigHuman(KIT.foot, SPEC.foot, e);
    }
  }
  updBombard(dt, st, lvl) {
    const tgt = findTarget(this.x, this.z, st.range, false, true, st.minRange, this.targetMode);
    this.recoil = Math.max(0, this.recoil - dt * 1.6);
    let aligned = false;
    if (tgt) {
      const dist = Math.hypot(tgt.x - this.x, tgt.z - this.z), T = clamp(dist / 7.2, .75, 1.45), q = aimPoint(tgt, T, _ap2);
      const want = Math.atan2(q.x - this.x, q.z - this.z); this.gunYaw = angDamp(this.gunYaw, want, 5, dt); aligned = Math.abs(angDiff(this.gunYaw, want)) < .12;
      if (aligned && this.cool <= 0) {
        this.cool = st.rate * rr(.95, 1.08); this.recoil = 1;
        this.carriage.updateMatrixWorld(true); const mz = _tv.set(0, 0, this.mounts.gunLen - .2).applyMatrix4(this.barrel.matrixWorld);
        const gy = G.B.heightAt(q.x, q.z);
        G.shells.push({ x0: mz.x, y0: mz.y, z0: mz.z, tx: q.x, ty: Math.max(gy, q.y - tgt.hitH) + .05, tz: q.z, t: 0, T, dmg: st.dmg, splash: st.splash, tower: this, x: mz.x, y: mz.y, z: mz.z, sm: 0, arc: 1.5 + dist * .2,
          shred: st.shred, armorX: st.armorX, stun: st.stun, kb: st.kb, fire: st.fire, cluster: st.cluster, crater: st.crater });
        const dx = Math.sin(this.gunYaw), dz = Math.cos(this.gunYaw);
        lightFlash(mz.x, mz.y + .2, mz.z, 0xffc880, 420, .16, 15);
        fxTimed(5, mz.x + dx * .2, mz.y + .1, mz.z + dz * .2, 1.9, 1.9, 4, 3, 1.6, 1, .1); fxTimed(3, mz.x + dx * .3, mz.y + .12, mz.z + dz * .3, .9, .9, 4, 3.2, 2.2, 1, .2, { grow: .8 });
        for (let i = 0; i < 6; i++) fxSmoke(mz.x + dx * .3, mz.y + .1, mz.z + dz * .3, dx * rr(1, 3.4) + rr(-.5, .5), rr(.3, 1.2), dz * rr(1, 3.4) + rr(-.5, .5), rr(1.2, 2.4), rr(.35, .6), .9, .3, .29, .28, .5, { drag: 2.2, rise: .2 });
        fxSparks(mz.x + dx * .2, mz.y, mz.z + dz * .2, 8, 5, 3, 1.8, .6, { lo: 0, hi: .6 });
        sfx('cannon', this.x, this.z, 1, lvl / 2); FX.shake = Math.min(1, FX.shake + .12);
      }
    } else this.gunYaw = angDamp(this.gunYaw, this.yaw + Math.sin(G.t * .3 + this.idx) * .7, 1.2, dt);
    this.carriage.rotation.y = this.gunYaw - this.yaw;
    const k = this.recoil; this.barrel.position.z = -.3 * k * k; this.barrel.rotation.x = -.42 - .1 * k * k;
    if (this.cool > 0 && this.cool < 1.2 && rnd() < dt * 5) { this.carriage.updateMatrixWorld(true); const mz = _tv.set(0, 0, this.mounts.gunLen - .2).applyMatrix4(this.barrel.matrixWorld); fxSmoke(mz.x, mz.y, mz.z, rr(-.1, .1), rr(.3, .6), rr(-.1, .1), 1.2, .18, .35, .3, .3, .3, .22, { drag: 1 }); }
  }
  updSpire(dt, st, lvl) {
    const tgt = findTarget(this.x, this.z, st.range, true, true, 0, this.targetMode);
    const was = this.charge, B2 = this.paths[1] > this.paths[0], A2 = this.paths[0] > this.paths[1];
    this.charge = tgt ? Math.min(1, this.charge + dt * this.haste / st.rate) : Math.max(0, this.charge - dt * .25);
    if (was < .68 && this.charge >= .68 && tgt) sfx('charge', this.x, this.z, .5);
    const c = this.charge, pulse = .85 + .15 * Math.sin(G.t * (6 + c * 20));
    this.spin += dt * (.8 + c * 5); this.core.rotation.y = this.spin; this.core.position.y = Math.sin(G.t * 1.6 + this.idx) * .05;
    this.shards.forEach((s, i) => { const a = this.spin * .7 + i * TAU / this.shards.length; s.position.set(Math.cos(a) * .58, Math.sin(a * 1.3) * .14 - .05, Math.sin(a) * .58); s.rotation.y = -a * 2; });
    if (this.ringG) this.ringG.rotation.y = -this.spin * .25;
    // crystal colour tells the path: blue storm, warm-white conduit, icy cyan tempest
    const tint = A2 ? [.9, .8, .55] : B2 ? [.45, .95, 1.2] : [.28, .62, 1.15];
    const k = (.9 + 4.5 * c * c) * pulse * this.appear; this.cmat.color.setRGB(tint[0] * k, tint[1] * k, tint[2] * k);
    this.em.I = (this.def.light[lvl] + 70 * c * c) * pulse;
    const cp = this.w(this.mounts.crystal, _ap), bc = B2 ? [.5, 1.2, 1.5] : [.5, .78, 1.6];
    FX.add.push(cp.x, cp.y, cp.z, 1.5 + c, 1.5 + c, 0, 0, .25, .55, 1.0, (.1 + .22 * c) * pulse, 2, 0, 0, 0);
    if (c > .5 && rnd() < dt * 14 * c) { const a = rnd() * TAU; fxBolt([cp.x, cp.y, cp.z], [cp.x + Math.cos(a) * .7, cp.y + rr(-.5, .5), cp.z + Math.sin(a) * .7], .1, [.45, .7, 1.4], .035); }
    // Frost aura: a cold pulse every second slows everything in range
    if (st.aura) {
      this.auraT -= dt;
      if (this.auraT <= 0) {
        this.auraT = 1; let any = false; const r2 = st.range * st.range;
        for (const m of G.mons) { if (m.dead || m.hp <= 0 || !m.vis || dist2(this.x, this.z, m.x, m.z) > r2) continue; slowMonster(m, .25, 1.2); if (st.brittle) m.brittleT = Math.max(m.brittleT || 0, 1.4); any = true; }
        if (any) fxTimed(4, this.x, this.y + .12, this.z, st.range * 2, st.range * 2, .35, .8, 1.3, .32, .6, { ground: true });
      }
    }
    if (c >= 1 && tgt) {
      this.charge = 0; this.discharges++; let from = [cp.x, cp.y, cp.z], cur = tgt, dmg = st.dmg; const hit = [];
      for (let j = 0; j < st.jumps && cur; j++) {
        hit.push(cur); const to = [cur.x, cur.y + cur.hitH, cur.z];
        fxBolt(from, to, .26 - j * .015, bc, .1 - j * .008);
        fxSparks(to[0], to[1], to[2], 5, 3.5, 1.2, 2, 4, { grav: 3, size: .06 }); fxTimed(2, to[0], to[1], to[2], 1.6, 1.6, .5, .9, 2, .7, .16);
        const cx = cur.x, cz = cur.z; slowMonster(cur, st.slow, st.slowT); if (st.brittle) cur.brittleT = Math.max(cur.brittleT || 0, st.slowT + .5); hitMonster(cur, dmg, 'bolt', 0, 0, this);
        dmg *= st.falloff; from = to; let nb = null, nd = st.jumpR * st.jumpR;
        for (const m of G.mons) { if (m.dead || m.hp <= 0 || !m.vis || hit.includes(m)) continue; const dd = dist2(cx, cz, m.x, m.z); if (dd < nd) { nd = dd; nb = m; } }
        cur = nb;
      }
      lightFlash(tgt.x, tgt.y + 1.2, tgt.z, 0x9fd0ff, 520, .22, 16); lightFlash(cp.x, cp.y, cp.z, 0x9fd0ff, 300, .18, 12);
      sfx('zap', this.x, this.z, 1, lvl / 2); FX.shake = Math.min(1, FX.shake + .08);
      // Overload: every third discharge a bolt from the sky strikes the strongest foe in range
      if (st.overload && this.discharges % (st.overEvery || 3) === 0) {
        const big = findTarget(this.x, this.z, st.range, true, true, 0, 'strong');
        if (big) {
          const to = [big.x, big.y + big.hitH, big.z];
          fxBolt([big.x + rr(-1, 1), big.y + 11, big.z + rr(-1, 1)], to, .5, [1.6, 1.5, 1.1], .2); fxBolt([big.x, big.y + 9, big.z], to, .3, [1.2, 1.3, 1.6], .14);
          fxTimed(4, big.x, big.y + .1, big.z, 3.4, 3.4, 1.4, 1.3, .9, .6, .45, { ground: true }); fxSparks(to[0], to[1], to[2], 16, 6, 2.6, 2.4, 1.6, { grav: 4, size: .07 });
          lightFlash(big.x, big.y + 3, big.z, 0xfff0c0, 1400, .3, 30); FX.shake = Math.min(1.2, FX.shake + .4); sfx('zap', big.x, big.z, 1.4, 1);
          this.overloads = (this.overloads || 0) + 1; hitMonster(big, st.dmg * 4, 'bolt', 0, 0, this);
        }
      }
    }
  }
  updGuard(dt, st, lvl) {
    for (let i = this.men.length - 1; i >= 0; i--) if (this.men[i].gone) this.men.splice(i, 1);
    if (this.men.length < st.n) { this.respawn -= dt; if (this.respawn <= 0) { this.respawn = this.men.length === 0 && G.t < 4 ? .5 : st.rate; spawnFootman(this); } }
  }
  dispose() { this.alive = false; this.em.alive = false; removeEmitter(this.em); this.clearModel(false); R.scene.remove(this.group); this.pad.tower = null; }
}
const _ap2 = { x: 0, y: 0, z: 0, tx: 0, tz: 0 };

function shootArrow(x, y, z, m, dmg, tower, o = {}) {
  const dist = Math.hypot(m.x - x, m.z - z), T = clamp(dist / 14, .22, .62), q = aimPoint(m, T, _ap2);
  G.arrows.push({ x0: x, y0: y, z0: z, tx: q.x, ty: q.y, tz: q.z, t: 0, T, m, dmg, tower, x, y, z, dx: 0, dy: 0, dz: 1, arc: .25 + dist * .07, alive: true, lI: o.fire ? 30 : 22, lCol: o.crit ? 0xfff0b0 : o.fire ? 0xff6a20 : 0xff9040, lx: x, ly: y, lz: z, lseed: rnd() * 9, ember: 0,
    crit: !!o.crit, pierce: !!o.pierce, fire: !!o.fire });
}
function arrowMatrix(x, y, z, dx, dy, dz) { _tq.setFromUnitVectors(_tz, _tv.set(dx, dy, dz).normalize()); return _tm.compose(_tv.set(x, y, z), _tq, _ts.set(1, 1, 1)); }
function updateProjectiles(dt) {
  const A = G.arrows, B = G.B;
  for (let i = A.length - 1; i >= 0; i--) {
    const a = A[i]; a.t += dt; const u = Math.min(1, a.t / a.T), m = a.m;
    if (m && !m.dead && m.hp > 0) { const q = aimPoint(m, Math.max(0, a.T - a.t), _ap2), k = Math.min(1, dt * 9); a.tx = lerp(a.tx, q.x, k); a.ty = lerp(a.ty, q.y, k); a.tz = lerp(a.tz, q.z, k); }
    const px = a.x, py = a.y, pz = a.z;
    a.x = lerp(a.x0, a.tx, u); a.z = lerp(a.z0, a.tz, u); a.y = lerp(a.y0, a.ty, u) + a.arc * 4 * u * (1 - u);
    const dx = a.x - px, dy = a.y - py, dz = a.z - pz, l = Math.hypot(dx, dy, dz) || 1; a.dx = dx / l; a.dy = dy / l; a.dz = dz / l;
    a.lx = a.x; a.ly = a.y; a.lz = a.z;
    KIT.arrow.put(arrowMatrix(a.x, a.y, a.z, a.dx, a.dy, a.dz), 0, null);
    const hx = a.x + a.dx * .25, hy = a.y + a.dy * .25, hz = a.z + a.dz * .25;
    FX.segs.push(hx, hy, hz, .055, hx - a.dx * .95, hy - a.dy * .95, hz - a.dz * .95, .0, 2.6, 1.05, .25, .85);
    FX.add.push(hx, hy, hz, .3, .3, 0, 0, 3.6, 1.9, .5, 1, 0, 0, 0, 0); FX.add.push(hx, hy, hz, 1.0, 1.0, 0, 0, 1, .45, .12, .22, 2, 0, 0, 0);
    a.ember += dt * 26; while (a.ember > 1) { a.ember -= 1; fxPart(hx, hy, hz, rr(-.4, .4), rr(-.1, .6), rr(-.4, .4), rr(.25, .6), .05, 2.6, 1.1, .2, { drag: 1.5, rise: .6 }); }
    if (u >= 1) {
      a.alive = false; swapRemove(A, i);
      if (m && !m.dead && m.hp > 0 && dist2(a.tx, a.tz, m.x, m.z) < 1.0) {
        fxSparks(a.x, a.y, a.z, 5, 3, 3, 1.5, .4, { size: .055, grav: 6 }); fxTimed(2, a.x, a.y, a.z, .9, .9, 1.6, .8, .25, .8, .12);
        sfx('arrowHit', a.x, a.z, .55, rnd()); hitMonster(m, a.dmg, 'arrow', a.dx, a.dz, a.tower, a);
        if (a.crit) { fxSparks(a.x, a.y, a.z, 12, 4.5, 3.4, 3, 1.6, { size: .06, grav: 5 }); fxTimed(2, a.x, a.y, a.z, 1.6, 1.6, 2.6, 2.3, 1.2, .9, .18); }
        if (a.fire) { fxTimed(2, a.x, a.y, a.z, 1.8, 1.8, 3, 1.3, .3, .8, .2); for (const o of G.mons) { if (o === m || o.dead || o.hp <= 0 || o.fly) continue; if (dist2(o.x, o.z, a.x, a.z) < .9 * .9) hitMonster(o, a.dmg * .4, 'burn', 0, 0, a.tower); } }
      } else if (!m || !m.fly) {
        const gy = B.heightAt(a.x, a.z);
        G.stuck.push({ x: a.x, y: gy + .12, z: a.z, dx: a.dx, dy: Math.min(-.5, a.dy), dz: a.dz, life: 3.2 });
        fxSparks(a.x, gy + .1, a.z, 3, 2, 3, 1.5, .4, { size: .05 });
      }
    }
  }
  const St = G.stuck;
  for (let i = St.length - 1; i >= 0; i--) {
    const s = St[i]; s.life -= dt; if (s.life <= 0) { swapRemove(St, i); continue; }
    KIT.arrow.put(arrowMatrix(s.x, s.y - Math.max(0, .5 - s.life) * .5, s.z, s.dx, s.dy, s.dz), 0, null);
    if (s.life > 1.4) { FX.add.push(s.x - s.dx * .25, s.y - s.dy * .25 + .04, s.z - s.dz * .25, .2, .2, 0, 0, 3, 1.4, .3, Math.min(1, (s.life - 1.4)), 0, 0, 0, 0); if (rnd() < dt * 5) fxPart(s.x, s.y + .1, s.z, rr(-.1, .1), rr(.4, .9), rr(-.1, .1), .6, .045, 2.4, 1, .2, { drag: .5, wob: 1 }); }
  }
  const Sh = G.shells;
  for (let i = Sh.length - 1; i >= 0; i--) {
    const s = Sh[i]; if (s.delay > 0) { s.delay -= dt; continue; } s.t += dt; const u = Math.min(1, s.t / s.T);
    s.x = lerp(s.x0, s.tx, u); s.z = lerp(s.z0, s.tz, u); s.y = lerp(s.y0, s.ty, u) + s.arc * 4 * u * (1 - u);
    _tm.compose(_tv.set(s.x, s.y, s.z), _tq.setFromAxisAngle(_tz, s.t * 9), _ts.set(1, 1, 1));
    // forge throws fly as caltrops, alchemist flasks as green-glowing shells
    if (s.pile) { KIT.caltrop.put(_tm, 0, s.pile.redhot ? [2.2, .9, .5] : s.pile.gilded ? [1.9, 1.5, .7] : null); if (u >= 1) { swapRemove(Sh, i); addPile(s.tx, s.tz, s.pile.n, s.pile.dmg, s.tower, s.pile); sfx('clink', s.tx, s.tz, .4, rnd()); fxDust(s.tx, s.ty, s.tz, 2, .4, { a: .3 }); } continue; }
    KIT.shell.put(_tm, 0, s.tint || null);
    if (s.acid) { FX.add.push(s.x, s.y + .1, s.z, .45, .45, 0, 0, .8, 2.4, .5, 1, 0, 0, 0, 0); if (u >= 1) { swapRemove(Sh, i); acidSplash(s); } continue; }
    FX.add.push(s.x, s.y + .1, s.z, .3, .3, 0, 0, 3.2, 1.5, .3, 1, 0, 0, 0, 0);
    s.sm += dt * 30; while (s.sm > 1) { s.sm -= 1; fxSmoke(s.x, s.y, s.z, rr(-.1, .1), rr(0, .2), rr(-.1, .1), rr(.5, .9), .16, .3, .26, .25, .25, .32, { drag: 1 }); if (rnd() < .5) fxPart(s.x, s.y, s.z, rr(-.5, .5), rr(-.2, .5), rr(-.5, .5), .4, .05, 2.5, 1.1, .2, { grav: 2 }); }
    if (u >= 1) { swapRemove(Sh, i); explodeAt(s.tx, s.ty, s.tz, s.dmg, s.splash, s.tower, s); }
  }
  // Firepots: burning ground that hurts whatever walks through it
  const Fp = G.firePatches;
  for (let i = Fp.length - 1; i >= 0; i--) {
    const f = Fp[i]; f.t -= dt; if (f.t <= 0) { swapRemove(Fp, i); continue; }
    const k = Math.min(1, f.t), y = B.heightAt(f.x, f.z) + .06;
    FX.add.push(f.x, y, f.z, f.r * 2.2, f.r * 2.2, 0, 0, 2.4, .9, .25, .35 * k, 4, 0, .52, 1);
    if (rnd() < dt * 18) { const a = rnd() * TAU, d = Math.sqrt(rnd()) * f.r; fxPart(f.x + Math.cos(a) * d, y, f.z + Math.sin(a) * d, rr(-.1, .1), rr(.6, 1.4), rr(-.1, .1), rr(.3, .6), rr(.06, .11), 3, 1.3, .3, { drag: 1, rise: .8 }); }
    f.tick -= dt;
    if (f.tick <= 0) { f.tick = .25; for (const m of G.mons) { if (m.dead || m.hp <= 0 || m.fly || !m.vis) continue; if (dist2(m.x, m.z, f.x, f.z) < (f.r + m.rad) * (f.r + m.rad)) hitMonster(m, f.dps * .25, 'burn', 0, 0, f.tower); } }
  }
}
function explodeAt(x, y, z, dmg, splash, tower, o = {}) {
  const sc = splash / 1.7;
  fxExplosion(x, y, z, sc);
  FX.decals.add(G.B.heightAt, x, z, splash * 1.2, .016, .013, .011, .85, 45);
  sfx('explode', x, z, 1, clamp(sc - .6, 0, 1));
  for (const m of G.mons) {
    if (m.dead || m.hp <= 0 || m.fly || !m.vis) continue;
    const d = Math.hypot(m.x - x, m.z - z); if (d > splash + m.rad) continue;
    const k = lerp(1, .45, sat(d / splash)), l = d || 1, kb = o.kb || 1;
    // Wallbreaker hits armor harder and strips it for a while; the siege mortar stuns what it lands on
    if (o.shred && m.def.armor) m.shredT = 4;
    if (o.stun) m.stunT = Math.max(m.stunT || 0, m.def.boss ? o.stun * (o.bossStun === undefined ? .4 : o.bossStun) : o.stun);
    hitMonster(m, dmg * k * (m.def.armor ? o.armorX || 1 : 1) * (m.def.boss && o.bossBurst ? o.bossBurst : 1), 'blast', (m.x - x) / l * kb, (m.z - z) / l * kb, tower);
  }
  if (o.stun) { fxTimed(4, x, y + .08, z, splash * 2.2, splash * 2.2, 1.8, 1.5, .9, .55, .35, { ground: true }); FX.shake = Math.min(1.2, FX.shake + .2); }
  if (o.fire) G.firePatches.push({ x, z, r: 1.15, t: 3, dps: 10 + dmg * .08, tower, tick: 0 });
  // Cataclysm craters burn until the wave ends (30 at most)
  if (o.crater && G.firePatches.filter(f => f.wave).length < 30) G.firePatches.push({ x, z, r: 1.7, t: 1e9, wave: true, dps: 30 + (o.craterDmg || dmg) * .05, tower, tick: 0 });
  if (o.cluster && !o.child) {
    // cluster shells burst into four bomblets
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * TAU + rr(-.4, .4), d = rr(1.2, 2.2), tx = x + Math.cos(a) * d, tz = z + Math.sin(a) * d;
      G.shells.push({ x0: x, y0: y + .2, z0: z, tx, ty: G.B.heightAt(tx, tz) + .05, tz, t: 0, T: rr(.38, .5), dmg: dmg * .3, splash: .85, tower, x, y, z, sm: 0, arc: 1.1, child: true, shred: o.shred, armorX: o.armorX, kb: 1 });
    }
  }
  for (let i = 0; i < 5; i++) { _tm.compose(_tv.set(x + rr(-.3, .3), y + .2, z + rr(-.3, .3)), _tq.set(rr(-1, 1), rr(-1, 1), rr(-1, 1), 1).normalize(), _ts.set(.6, .6, .6)); addDebris(KIT.rubble, _tm, [.5, .45, .4], rr(-3, 3), rr(3, 6), rr(-3, 3), rr(4, 10), rr(1.6, 2.6)); }
}
