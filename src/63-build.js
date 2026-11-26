// ---- Freeform tower placement ----
// Towers stand anywhere the ground allows. canPlaceTower() is the one rule book for the player, the preview and the AI.
const FOOT_R = 1.15;

// nearest road point and distance; road points are PATH_STEP apart so the point distance is close enough
function roadNearest(B, x, z) {
  let best = 1e9, bi = 0;
  for (let i = 0; i < B.n; i++) { const d = dist2(x, z, B.px[i], B.pz[i]); if (d < best) { best = d; bi = i; } }
  return [Math.sqrt(best), bi];
}
function streamDist(B, x, z) {
  let best = 1e9; const S = B.SP;
  for (let i = 0; i < S.length; i++) { const d = dist2(x, z, S[i][0], S[i][1]); if (d < best) best = d; }
  return Math.sqrt(best);
}

// everything about a spot that does not depend on other towers; the result doubles as the tower's virtual pad
function groundCheck(B, x, z, kind) {
  const lx = B.mirrored ? z : x, lz = B.mirrored ? x : z, water = B.bio.key === 'ember' ? 'lava' : 'water';
  const no = reason => ({ ok: false, reason });
  if (Math.abs(x) > BH - 1.8 || Math.abs(z) > BH - 1.8) return no('Too close to the edge');
  if (lx < -BH + 3.2 || lz < -BH + 3.0) return no('Too close to the cliffs');
  if (lx < -12.2 && Math.abs(lz - B.zc) < 3.8) return no('Too close to the cave');
  if (Math.abs(lx - B.kx) < 6.4 && lz < -9.4) return no('Too close to the keep');
  const [dr, ri] = roadNearest(B, x, z);
  if (dr < ROAD_HALF + FOOT_R) return no('Too close to the road');
  if (kind && TOWER[kind].road && dr > TOWER[kind].range[0] + ROAD_HALF) return no(kind === 'guard' ? 'Guards must be near the road' : 'Must be near the road');
  if (streamDist(B, x, z) < 2.2) return no('Too close to the ' + water);
  for (const q of B.ponds) if (Math.hypot(x - q.x, z - q.z) < q.r * 1.1 + FOOT_R * .8) return no('Too close to the ' + water);
  // scenery footprints are rough circles (long walls especially), so only their cores block
  for (const q of B.blockers) if (q[2] >= .5 && Math.hypot(x - q[0], z - q[1]) < q[2] * .6 + FOOT_R * .75) return no('Something is in the way');
  for (const f of B.fires) if (Math.hypot(x - f.x, z - f.z) < 1.7) return no('Something is in the way');
  const H = B.heightAt; let lo = H(x, z), hi = lo;
  for (let k = 0; k < 6; k++) { const a = k / 6 * TAU, h = H(x + Math.cos(a) * 1.05, z + Math.sin(a) * 1.05); lo = Math.min(lo, h); hi = Math.max(hi, h); }
  if (hi - lo > .55) return no('Too steep');
  return { ok: true, reason: '', x, z, y: hi + .3, depth: hi - lo + .2, s: ri * PATH_STEP, face: Math.atan2(B.px[ri] - x, B.pz[ri] - z), road: dr };
}
function towerAt(x, z, r = FOOT_R * 2) {
  for (const t of G.towers) if (t.alive && Math.hypot(x - t.x, z - t.z) < r) return t;
  return null;
}
function canPlaceTower(x, z, kind) {
  const B = G.B; if (!B || G.phase !== 'play') return { ok: false, reason: '' };
  if (towerAt(x, z)) return { ok: false, reason: 'Too close to another tower' };
  return groundCheck(B, x, z, kind);
}

// ---- build spots for the AI ----
// A grid of every legal spot, each with the road samples it covers for each tower kind.
const SPOT_STEP = .6;
function roadSamples(B) { const out = []; for (let i = 0; i < B.n; i += 2) out.push(i); return out; }
function buildSpots(B) {
  const samp = roadSamples(B), spots = [];
  for (let z = -BH + 1.8; z <= BH - 1.8; z += SPOT_STEP) for (let x = -BH + 1.8; x <= BH - 1.8; x += SPOT_STEP) {
    const g = groundCheck(B, x, z, null); if (!g.ok) continue;
    const cov = {};
    for (const kind of TOWER_KINDS) {
      const d = TOWER[kind], r2 = d.range[0] * d.range[0], m2 = (d.minRange || 0) * (d.minRange || 0), list = [];
      for (let j = 0; j < samp.length; j++) { const i = samp[j], q = dist2(x, z, B.px[i], B.pz[i]); if (q < r2 && q >= m2) list.push(j); }
      cov[kind] = list;
    }
    g.cov = cov; g.guardOK = g.road <= TOWER.guard.range[0] + ROAD_HALF; g.roadOK = k => g.road <= TOWER[k].range[0] + ROAD_HALF; spots.push(g);
  }
  // keep the best few hundred per kind, judged by how much road they see
  const top = {};
  for (const kind of TOWER_KINDS) top[kind] = spots.filter(s => s.cov[kind].length && (!TOWER[kind].road || s.roadOK(kind))).sort((a, b) => b.cov[kind].length - a.cov[kind].length).slice(0, 320);
  B.spots = { all: spots, top, samp };
}
// how well a spot would serve: road it sees, discounted where other towers already watch (guards prefer the kill zones instead)
function spotValue(B, sp, kind, watch) {
  const list = sp.cov[kind]; let v = 0;
  if (kind === 'guard') { for (const j of list) v += 1 + .5 * Math.min(4, watch[j]); }
  else { for (const j of list) v += 1 / (1 + .7 * watch[j]); }
  return v * PATH_STEP * 2 / (TOWER[kind].range[0] * 2);
}
function roadWatch(B, towers) {
  const samp = B.spots.samp, w = new Float32Array(samp.length);
  for (const t of towers) {
    if (t.kind === 'guard' || t.kind === 'foundry') continue;
    const r2 = t.range * t.range;
    for (let j = 0; j < samp.length; j++) { const i = samp[j]; if (dist2(t.x, t.z, B.px[i], B.pz[i]) < r2) w[j]++; }
  }
  return w;
}
