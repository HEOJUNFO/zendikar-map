// PROTOTYPE - NOT FOR PRODUCTION
// Question: 세계 지도에서 갈 곳을 고르는 것이 곧 덱을 짓는 일이 될 때, 젠디카르를 여행하는 느낌과 덱빌더의 재미가 한 판 안에서 함께 살아나는가?
// Date: 2026-11-10
// The fight: a deck, a hand, energy, enemies that show their next move, and a queue that
// resolves every effect one at a time so the player can see why each number changed.
// Everything runs on the fixed step; the only chance is the seeded rng().
'use strict';

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function hasPower(id) { const b = state.battle; return !!b && b.powers.some(p => p.id === id); }
function landLimit(b) { return 1 + (hasPower('oracle-of-mul-daya') ? 1 : 0) + b.landExtra; }
function livingEnemies(b) { return b.enemies.filter(e => e.hp > 0); }
function targetable(e) { return e.hp > 0 && e.away <= 0 && !e.hidden; }

// ---- What a card may queue (cards.js calls these) ----
const Q = {
  push(a) { state.battle.queue.push(a); },
  hit(ti, n, o) { Q.push({ k: 'hit', ti, n, pierce: !!(o && o.pierce) }); },
  hitRandom(n) { Q.push({ k: 'hitr', n }); },
  block(n) { Q.push({ k: 'block', n }); },
  draw(n) { for (let i = 0; i < n; i++) Q.push({ k: 'draw' }); },
  energy(n) { Q.push({ k: 'energy', n }); },
  heal(n) { Q.push({ k: 'heal', n }); },
  gold(n) { Q.push({ k: 'gold', n }); },
  power(id) { Q.push({ k: 'power', id }); },
  fetchLand() { Q.push({ k: 'fetch' }); },
  scout() { Q.push({ k: 'scout' }); },
  extraLand(n) { Q.push({ k: 'extraLand', n }); },
  cleanse() { Q.push({ k: 'cleanse' }); },
  bonus(n) { Q.push({ k: 'bonus', n }); },
  burnEnemy(ti, n) { Q.push({ k: 'burnE', ti, n }); },
  strip(ti) { Q.push({ k: 'strip', ti }); },
  cancel(ti) { Q.push({ k: 'cancel', ti }); },
  banish(ti, n) { Q.push({ k: 'banish', ti, n }); },
};

function makeEnemy(kind, scale, slot, hpScale) {
  const def = ENEMIES[kind];
  const hp = Math.max(1, Math.round(tune[def.hp] * (hpScale === undefined ? scale : hpScale)));
  return { kind, hp, maxHp: hp, block: 0, str: 0, mi: 0, scale, charged: false, hidden: false, away: 0, cancelled: false, burn: 0, enraged: false, slot, flash: 0, lunge: 0 };
}

// Start a fight. o: {count, cont, stop, boss, elite, first}
function startBattle(kind, o) {
  const run = state.run;
  const scale = o.first || o.boss ? 1 : 1 + tune.day_scale * run.day; // the Roil Elemental is the same on any day
  const enemies = [];
  for (let i = 0; i < o.count; i++) {
    const e = makeEnemy(kind, scale, i, o.first ? tune.first_fight_scale : scale);
    if (!o.first && !o.boss) e.mi = (i + Math.floor(rng() * 3)) % ENEMIES[kind].moves.length; // not all in step
    enemies.push(e);
  }
  let draw = shuffle(run.deck.map(c => ({ id: c.id, uid: c.uid })));
  if (o.first) { // the first minute: a hand that teaches attack, block and landfall
    const want = FIRST_HAND.slice(), top = [];
    for (const id of want) { const i = draw.findIndex(c => c.id === id); if (i >= 0) top.push(draw.splice(i, 1)[0]); }
    draw = draw.concat(top.reverse()); // drawn from the end
  }
  state.battle = {
    kind, cont: o.cont, stop: o.stop, boss: !!o.boss, elite: !!o.elite, first: !!o.first,
    turn: 0, energy: 0, hand: [], draw, discard: [], powers: [],
    block: 0, burn: 0, web: 0, bonus: 0, landPlayed: 0, landExtra: 0, landLock: false, landLockNext: false,
    landfall: false, hurtLast: false, hookUsed: false, counts: {},
    enemies, queue: [], qt: 0, phase: 'player', floats: [], shake: 0, msg: '', msgT: 0, chain: 0, endT: 0, t: 0, target: 0,
    intro: o.boss ? 1.6 : 0.5, fly: null,
  };
  state.screen = 'battle';
  beginPlayerTurn();
}

function beginPlayerTurn() {
  const b = state.battle;
  b.turn++; b.phase = 'player'; b.block = 0; b.chain = 0;
  b.energy = Math.max(0, tune.energy - (b.web ? 1 : 0)); b.web = 0;
  b.landPlayed = 0; b.landExtra = 0; b.landfall = false; b.bonus = 0; b.hookUsed = false;
  b.landLock = b.landLockNext; b.landLockNext = false;
  if (b.burn > 0) Q.push({ k: 'pburn' });
  for (const p of b.powers) { const d = CARDS[p.id]; if (d.onTurn) d.onTurn(b); }
  Q.draw(tune.hand_size);
  pickTarget();
}
function pickTarget() { // keep the keyboard's target on something that can be hit
  const b = state.battle;
  if (b.enemies[b.target] && targetable(b.enemies[b.target])) return;
  const i = b.enemies.findIndex(targetable);
  if (i >= 0) b.target = i;
}

// A trap's condition: for a card that needs a target, with no target given, is it met for any?
function trapMet(b, d, ti) {
  if (!d.trap) return false;
  if (d.target === 'enemy' && (ti === undefined || ti === null || ti < 0)) return b.enemies.some((e, i) => targetable(e) && d.trap(b, i));
  return !!d.trap(b, ti);
}
function costOf(b, id, ti) { const d = CARDS[id]; return trapMet(b, d, ti) ? 0 : d.cost; }
// Why this card cannot be played now (a text key), or null when it can.
function playReason(b, id, ti) {
  const d = CARDS[id];
  if (d.type === 'land') {
    if (b.landLock) return 'no_landlock';
    if (b.landPlayed >= landLimit(b)) return 'no_land';
  }
  if (d.target === 'enemy') {
    const e = b.enemies[ti];
    if (!e || e.hp <= 0 || e.away > 0) return 'no_target';
    if (e.hidden) return 'no_hidden';
  }
  if (d.can) { const r = d.can(b, ti); if (r) return r; }
  if (costOf(b, id, ti) > b.energy) return 'no_energy';
  return null;
}
function canAct() { const b = state.battle; return !!b && b.phase === 'player' && b.queue.length === 0 && b.intro <= 0; }

function tryPlay(hi, ti) {
  const b = state.battle;
  if (!canAct()) return false;
  const c = b.hand[hi]; if (!c) return false;
  const d = CARDS[c.id];
  if (d.target === 'enemy' && (ti === undefined || ti === null || ti < 0)) { pickTarget(); ti = b.target; }
  const why = playReason(b, c.id, ti);
  if (why) { b.msg = T(why); b.msgT = 1.6; sfx('deny'); return false; }
  b.energy -= costOf(b, c.id, ti);
  b.hand.splice(hi, 1);
  b.chain = 0;
  const n = b.counts[c.id] || 0; b.counts[c.id] = n + 1;
  const cx = { lf: b.landfall, n };
  sfx('card');
  events.push({ t: state.t, play: c.id });
  Q.push({ k: 'fly', id: c.id, ti: d.target === 'enemy' ? ti : -1 });
  if (d.pay) d.pay(b);
  d.play(b, ti, cx);
  if (d.type === 'attack' && !b.hookUsed && hasPower('grappling-hook')) { b.hookUsed = true; d.play(b, ti, cx); }
  if (d.type === 'land') { b.landPlayed++; b.landfall = true; Q.push({ k: 'landfall' }); }
  if (d.type !== 'power') b.discard.push(c);
  return true;
}

function endTurn() {
  const b = state.battle;
  if (!canAct()) return false;
  while (b.hand.length) b.discard.push(b.hand.pop());
  b.phase = 'enemy'; b.hurtLast = false; b.chain = 0;
  for (let i = 0; i < b.enemies.length; i++) Q.push({ k: 'eact', ei: i });
  Q.push({ k: 'turn' });
  sfx('end');
  return true;
}

function addFloat(x, y, text, col) { state.battle.floats.push({ x, y, text: String(text), col, t: 0 }); }
function enemyXY(i) { const p = battleLayout().enemies[i]; return p ? { x: p.x, y: p.y - p.h - 8 } : { x: 480, y: 120 }; }
function playerXY() { const L = battleLayout(); return { x: L.player.x, y: L.player.y - 52 }; }

// Hurt one enemy by a card's hit; block soaks it unless the hit pierces.
function hurtEnemy(b, ti, n, pierce) {
  let e = b.enemies[ti];
  if (!e || e.hp <= 0 || e.away > 0) { // the target is gone: the hit finds another
    const opts = b.enemies.map((x, i) => i).filter(i => b.enemies[i].hp > 0 && b.enemies[i].away <= 0);
    if (!opts.length) return;
    ti = opts[Math.floor(rng() * opts.length)]; e = b.enemies[ti];
  }
  let dmg = Math.max(0, n + b.bonus);
  const at = enemyXY(ti);
  if (!pierce && e.block > 0) {
    const soak = Math.min(e.block, dmg); e.block -= soak; dmg -= soak;
    if (soak > 0 && dmg === 0) { addFloat(at.x, at.y, T('block'), COL.teal); sfx('block'); return; }
  }
  e.hp = Math.max(0, e.hp - dmg); e.flash = 0.18;
  addFloat(at.x, at.y, '-' + dmg, COL.white);
  sfx('hit', b.chain++);
  const def = ENEMIES[e.kind];
  if (def.trait === 'roil' && !e.enraged && e.hp > 0 && e.hp <= e.maxHp / 2) {
    e.enraged = true; e.str += tune.roil_rage; addFloat(at.x, at.y - 14, '+' + tune.roil_rage + ' ' + T('st_str'), COL.red); sfx('roar');
  }
  if (e.hp <= 0) { sfx('kill'); b.shake = Math.max(b.shake, 0.2); events.push({ t: state.t, kill: e.kind }); }
}

function drawFromPile(b) {
  if (!b.draw.length) {
    if (!b.discard.length) return false;
    b.draw = shuffle(b.discard); b.discard = [];
  }
  const c = b.draw.pop();
  if (b.hand.length >= 10) b.discard.push(c); else b.hand.push(c);
  return true;
}

// Resolve one queued effect; returns how long it holds the screen, in seconds.
function resolve(a) {
  const b = state.battle, run = state.run, P = playerXY(), R = tune.resolve_time;
  switch (a.k) {
    case 'fly': b.fly = { id: a.id, ti: a.ti, t: 0 }; return 0.14;
    case 'hit': hurtEnemy(b, a.ti, a.n, a.pierce); return R;
    case 'hitr': {
      const opts = b.enemies.map((x, i) => i).filter(i => b.enemies[i].hp > 0 && b.enemies[i].away <= 0);
      if (!opts.length) return 0;
      hurtEnemy(b, opts[Math.floor(rng() * opts.length)], a.n, false); return R;
    }
    case 'block': b.block += a.n; addFloat(P.x, P.y, '+' + a.n + ' ' + T('block'), COL.teal); sfx('block'); return R;
    case 'draw': if (drawFromPile(b)) { sfx('draw'); return 0.06; } return 0;
    case 'energy': b.energy += a.n; addFloat(60, 236, '+' + a.n, COL.gold); sfx('energy'); return R * 0.6;
    case 'heal': {
      const h = Math.min(a.n, run.maxHp - run.hp); run.hp += h;
      if (h > 0) { addFloat(P.x, P.y - 12, '+' + h, COL.green); sfx('heal'); return R; }
      return 0;
    }
    case 'gold': run.gold = Math.max(0, run.gold + a.n); addFloat(P.x, P.y - 24, (a.n > 0 ? '+' : '') + a.n + ' ' + T('gold'), COL.gold); return R * 0.5;
    case 'power': b.powers.push({ id: a.id }); sfx('power'); return R;
    case 'fetch': {
      let i = -1;
      for (let k = b.draw.length - 1; k >= 0; k--) if (isLand(b.draw[k].id)) { i = k; break; }
      let c = null;
      if (i >= 0) c = b.draw.splice(i, 1)[0];
      else { const j = b.discard.findIndex(x => isLand(x.id)); if (j >= 0) c = b.discard.splice(j, 1)[0]; }
      if (!c) return 0;
      if (b.hand.length >= 10) b.discard.push(c); else b.hand.push(c);
      sfx('draw'); return R * 0.6;
    }
    case 'scout': {
      const c = b.draw[b.draw.length - 1];
      if (c && isLand(c.id) && b.hand.length < 10) { b.hand.push(b.draw.pop()); addFloat(60, 300, '+' + T('n_land'), COL.green); sfx('draw'); return R * 0.6; }
      return 0;
    }
    case 'extraLand': b.landExtra += a.n; return 0;
    case 'cleanse': b.burn = 0; b.web = 0; return 0;
    case 'bonus': b.bonus += a.n; addFloat(P.x, P.y, '+' + a.n, COL.amberL); sfx('power'); return R;
    case 'burnE': { const e = b.enemies[a.ti]; if (e && e.hp > 0) { e.burn += a.n; const at = enemyXY(a.ti); addFloat(at.x, at.y - 12, T('st_burn') + ' ' + a.n, '#f08a2c'); } return R * 0.5; }
    case 'strip': { const e = b.enemies[a.ti]; if (e && e.hp > 0) { e.block = 0; e.str = 0; e.charged = false; const at = enemyXY(a.ti); addFloat(at.x, at.y, '0', COL.blue); sfx('wave'); } return R; }
    case 'cancel': { const e = b.enemies[a.ti]; if (e && e.hp > 0) { e.cancelled = true; const at = enemyXY(a.ti); addFloat(at.x, at.y, T('in_none'), COL.blue); sfx('wave'); } return R; }
    case 'banish': { const e = b.enemies[a.ti]; if (e && e.hp > 0) { e.away = a.n; e.hidden = false; sfx('wave'); pickTarget(); } return R; }
    case 'landfall': {
      b.shake = 0.35; sfx('rumble'); addFloat(P.x, P.y - 30, T('kw_landfall') + '!', COL.green);
      for (const p of b.powers) { const d = CARDS[p.id]; if (d.onLand) d.onLand(b); }
      b.enemies.forEach((e, i) => {
        if (e.hp > 0 && e.away <= 0 && ENEMIES[e.kind].trait === 'territory') { e.str += tune.baloth_land_str; const at = enemyXY(i); addFloat(at.x, at.y - 12, '+' + tune.baloth_land_str + ' ' + T('st_str'), COL.red); }
      });
      return R;
    }
    case 'pburn': {
      const n = b.burn; b.burn = Math.max(0, b.burn - 1);
      run.hp = Math.max(0, run.hp - n); addFloat(P.x, P.y, '-' + n + ' ' + T('st_burn'), '#f08a2c'); sfx('hurt');
      return R;
    }
    case 'eact': return enemyAct(b, a.ei);
    case 'ehit': {
      const e = b.enemies[a.ei]; if (!e || e.hp <= 0) return 0;
      e.lunge = 0.2;
      let n = a.n;
      const soak = Math.min(b.block, n); b.block -= soak; n -= soak;
      if (n > 0) {
        run.hp = Math.max(0, run.hp - n); b.hurtLast = true; b.shake = Math.max(b.shake, 0.18);
        addFloat(P.x, P.y, '-' + n, COL.red); sfx('hurt');
        if (a.steal) e.hp = Math.min(e.maxHp, e.hp + n);
        if (a.burn) { b.burn += a.burn; addFloat(P.x, P.y - 14, T('st_burn') + ' ' + a.burn, '#f08a2c'); }
      } else { addFloat(P.x, P.y, T('block'), COL.teal); sfx('block'); }
      return tune.resolve_time * 1.4;
    }
    case 'eend': { const e = b.enemies[a.ei]; if (e) { e.charged = false; e.mi++; } return 0; }
    case 'turn': if (livingEnemies(b).length) beginPlayerTurn(); return 0;
  }
  return 0;
}

// One enemy takes its move. Its block from last turn is gone as it starts.
function enemyAct(b, ei) {
  const e = b.enemies[ei];
  if (!e || e.hp <= 0) return 0;
  const at = enemyXY(ei);
  if (e.away > 0) { e.away--; if (e.away === 0) { addFloat(at.x, at.y, '!', COL.purple); sfx('wave'); } return tune.enemy_time * 0.5; }
  e.block = 0; e.hidden = false;
  if (e.burn > 0) {
    const n = e.burn; e.burn--; e.hp = Math.max(0, e.hp - n); e.flash = 0.18;
    addFloat(at.x, at.y, '-' + n, '#f08a2c'); sfx('hit', 0);
    if (e.hp <= 0) { sfx('kill'); return tune.enemy_time; }
  }
  if (e.cancelled) { e.cancelled = false; e.charged = false; e.mi++; addFloat(at.x, at.y, T('in_none'), COL.blue); return tune.enemy_time; }
  const m = curMove(e), sc = v => Math.max(1, Math.round(tune[v] * e.scale));
  const front = [];
  if (m.k === 'atk') {
    const hits = m.hits || 1, dmg = intentDamage(e);
    for (let i = 0; i < hits; i++) front.push({ k: 'ehit', ei, n: dmg, steal: !!m.steal, burn: m.burn ? tune[m.burn] : 0 });
    front.push({ k: 'eend', ei });
  } else if (m.k === 'swallow') {
    if (b.powers.length) {
      const i = Math.floor(rng() * b.powers.length), gone = b.powers.splice(i, 1)[0];
      addFloat(at.x, at.y, '-' + cardName(gone.id).text, COL.purple); sfx('roar'); b.shake = 0.3;
    } else front.push({ k: 'ehit', ei, n: intentDamage(e), steal: false, burn: 0 });
    front.push({ k: 'eend', ei });
  } else {
    if (m.k === 'web') { e.block += sc(m.b); b.web = 1; addFloat(playerXY().x, playerXY().y, T('st_web'), COL.paper); }
    if (m.k === 'buff') { if (m.blk) e.block += sc(m.blk); if (m.str) { e.str += tune[m.str]; addFloat(at.x, at.y, '+' + tune[m.str] + ' ' + T('st_str'), COL.red); } }
    if (m.k === 'charge') { e.charged = true; addFloat(at.x, at.y, T('st_charged'), COL.red); }
    if (m.k === 'hide') { e.hidden = true; e.str += 1; addFloat(at.x, at.y, T('st_hidden'), COL.dim); }
    if (m.k === 'lock') { e.block += sc(m.blk); b.landLockNext = true; b.shake = 0.35; addFloat(playerXY().x, playerXY().y, LX(m.name), COL.purple); sfx('rumble'); }
    if (m.k !== 'charge') e.charged = false;
    e.mi++;
    sfx(m.k === 'buff' || m.k === 'charge' ? 'roar' : 'wave');
  }
  for (let i = front.length - 1; i >= 0; i--) b.queue.unshift(front[i]);
  return tune.enemy_time;
}

function updateBattle(dt) {
  const b = state.battle, run = state.run;
  b.t += dt;
  if (b.intro > 0) b.intro -= dt;
  if (b.shake > 0) b.shake = Math.max(0, b.shake - dt);
  if (b.msgT > 0) b.msgT -= dt;
  for (const e of b.enemies) { if (e.flash > 0) e.flash -= dt; if (e.lunge > 0) e.lunge -= dt; }
  if (b.fly) { b.fly.t += dt; if (b.fly.t > 0.16) b.fly = null; }
  for (const f of b.floats) f.t += dt;
  b.floats = b.floats.filter(f => f.t < tune.float_time);
  if (b.phase === 'won' || b.phase === 'lost') {
    b.endT -= dt;
    if (b.endT <= 0) { if (b.phase === 'won') battleWon(); else finishRun(false); }
    return;
  }
  if (b.intro > 0) return;
  const fast = down.has('Space') || down.has('KeyE') ? 3 : 1; // hold to hurry a long chain or the enemy turn
  b.qt -= dt * fast;
  let guard = 0;
  while (b.qt <= 0 && b.queue.length && guard++ < 40) {
    const a = b.queue.shift();
    b.qt += resolve(a);
    if (run.hp <= 0) { b.phase = 'lost'; b.endT = 1.0; b.queue = []; sfx('lose'); return; }
    if (!livingEnemies(b).length) { b.phase = 'won'; b.endT = 0.9; b.queue = []; sfx('win'); return; }
  }
  if (!b.queue.length && b.qt < 0) b.qt = 0;
  if (b.phase === 'player') pickTarget();
}

// Weighted draw of n different cards from a continent's pool.
function pickCards(pool, n, weights) {
  const left = pool.slice(), out = [];
  while (left.length && out.length < n) {
    let total = 0; for (const id of left) total += weights[cardRarity(id)] || 1;
    let r = rng() * total, pick = 0;
    for (let i = 0; i < left.length; i++) { r -= weights[cardRarity(left[i])] || 1; if (r <= 0) { pick = i; break; } }
    out.push(left.splice(pick, 1)[0]);
  }
  return out;
}

function battleWon() {
  const b = state.battle, run = state.run;
  run.fights++;
  if (b.boss) { run.won = true; state.battle = null; finishRun(true); return; }
  const gold = b.elite ? tune.gold_elite : tune.gold_fight + Math.floor(rng() * (tune.gold_var + 1));
  run.gold += gold;
  let heal = 0;
  if (b.elite) { heal = Math.min(tune.elite_heal, run.maxHp - run.hp); run.hp += heal; }
  const cards = pickCards(POOLS[b.cont] || [], 3, b.elite ? RARITY_WEIGHT_ELITE : RARITY_WEIGHT);
  state.reward = { gold, heal, cards, cont: b.cont, t: 0 };
  state.battle = null;
  state.screen = 'reward';
}
