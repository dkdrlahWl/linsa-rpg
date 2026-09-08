(() => {
  'use strict';

  // Install after the remodel's hooks, before load(). No network or cloud access.
  window.installRinguCoreFixes = function installRinguCoreFixes(g) {
    if (g.coreFixes) return g.coreFixes;
    const f = g.fn, owners = new WeakMap();
    const currencyKeys = ['gold', 'essence', 'transcendStone', 'downgradeProtect',
      'dungeonTickets', 'petStone', 'petTicket'];
    const active = () => !!g.state && window.RinguSession?.active !== false;
    const guardedStates = new WeakSet();
    const integer = (v, fallback = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.floor(n))) : fallback;
    };
    const stageNumber = (v, max) => {
      if (typeof v !== 'number' && typeof v !== 'string') return null;
      if (typeof v === 'string' && !/^\d+$/.test(v)) return null;
      const n = Number(v);
      return Number.isSafeInteger(n) && n >= 1 && n <= max ? n : null;
    };
    const wrap = (name, replacement) => {
      const original = f[name];
      if (typeof original === 'function') f[name] = replacement(original);
    };

    function sanitize() {
      const s = g.state;
      if (!s) return;
      const floor = Number(window.RinguCloud?.currencyFloor) || 0;
      if (floor > 0 && !guardedStates.has(s)) {
        for (const key of currencyKeys) {
          let value = integer(s[key]);
          Object.defineProperty(s, key, {enumerable:true, configurable:true,
            get:()=>Math.max(Number(window.RinguCloud?.currencyFloor)||0,value),
            set:v=>{value=integer(v);}});
        }
        guardedStates.add(s);
      }
      if (floor > 0) s.rankingHidden = true;
      for (const key of currencyKeys) s[key] = integer(s[key]);
      s.inventory = Array.isArray(s.inventory) ? s.inventory : [];
      const candidates = new Map();
      for (const it of s.inventory) {
        if (!it || !g.slots.includes(it.slot)) continue;
        const key = String(it.id);
        // Ambiguous IDs must not select several items through one equipped ID.
        candidates.set(key, candidates.has(key) ? null : it);
      }
      const equipped = {}, used = new Set();
      for (const slot of g.slots) {
        const id = s.equipped?.[slot], it = candidates.get(String(id));
        if (id == null || !it || it.slot !== slot || used.has(String(it.id))) continue;
        equipped[slot] = it.id; // canonical ID type matches inventory for legacy strict checks
        used.add(String(it.id));
      }
      s.equipped = equipped;
      if (s.dungeons && typeof s.dungeons === 'object') {
        for (const key of ['goldEntries', 'partyFree', 'petEntries'])
          if (s.dungeons[key] != null) s.dungeons[key] = integer(s.dungeons[key]);
      }
    }

    wrap('normalizeCharacter', old => function (...args) {
      sanitize();
      const result = old.apply(this, args);
      sanitize();
      return result;
    });
    // Core load/render may calculate power before the final normalizer is called.
    wrap('getPlayerStats', old => function (...args) { sanitize(); return old.apply(this, args); });
    wrap('save', old => function (...args) { sanitize(); return old.apply(this, args); });

    f.spendGold = function (value) {
      if (!active() || (typeof value !== 'number' && typeof value !== 'string')) return false;
      const cost = Number(value);
      if (!Number.isSafeInteger(cost) || cost <= 0) return false;
      sanitize();
      if (g.state.gold < cost) return false;
      g.state.gold -= cost;
      return true;
    };
    for (const name of ['toggleEquipItem', 'equipBest', 'sellItem', 'bulkSell',
      'toggleLock', 'tryEnhance', 'tryTranscend', 'buyAura', 'buyConsumable',
      'equipPet', 'unequipPet', 'sellPet', 'levelUpPet', 'lockPet', 'unlockPet',
      'claimDailyReward', 'claimMail', 'claimCollectionReward', 'claimPetCollectionReward']) {
      wrap(name, old => function (...args) {
        if (!active()) return false;
        sanitize();
        return old.apply(this, args);
      });
    }
    wrap('drawItems', old => function (count) {
      if (!active() || ![1, 5, 10].includes(Number(count))) return false;
      sanitize();
      return old.call(this, Number(count));
    });
    wrap('summonPet', old => function (count) {
      // The supported UI actions are 1 and 10. Negative/fractional costs created currency.
      if (!active() || ![1, 10].includes(Number(count))) return false;
      sanitize();
      return old.call(this, Number(count));
    });

    const sameOwner = record => record && record.state === g.state &&
      record.uid === g.state?.playerUid &&
      record.account === window.RinguSession?.account?.id &&
      record.session === window.RinguSession;
    function cancel(kind) {
      const key = kind === 'tower' ? 'activeTower' : 'activeDungeon', battle = g[key];
      if (!battle) return;
      const record = owners.get(battle);
      if (record) record.canceled = true;
      if (battle.finishTimer != null) clearTimeout(battle.finishTimer);
      g[key] = null;
      if (kind === 'dungeon') window.__goldDungeonStarting = false;
    }
    function discardStale() {
      for (const [kind, key] of [['tower', 'activeTower'], ['dungeon', 'activeDungeon']]) {
        const battle = g[key];
        if (battle && (!active() || !sameOwner(owners.get(battle)))) cancel(kind);
      }
    }
    function available() {
      discardStale();
      return active() && !g.activeTower && !g.activeDungeon;
    }
    function remember(battle) {
      if (!battle) return;
      owners.set(battle, {state: g.state, uid: g.state.playerUid,
        account: window.RinguSession?.account?.id, session: window.RinguSession,
        canceled: false, finished: false});
    }

    wrap('startTower', old => function (floor) {
      if (!available()) return false;
      const n = stageNumber(floor, g.towerFloors.length);
      if (!n) return false;
      f.normalizeCharacter();
      if (n !== g.state.towerCleared + 1) return false;
      const result = old.call(this, n);
      remember(g.activeTower);
      return result;
    });
    wrap('startGoldDungeon', old => function (stage) {
      if (!available()) return false;
      const n = stageNumber(stage, g.goldDungeonStages?.length || 20);
      if (!n) return false;
      f.normalizeCharacter();
      if (n > g.state.dungeons.goldUnlocked || g.state.dungeons.goldEntries <= 0) return false;
      try { return old.call(this, n); }
      finally { if (!g.activeDungeon) window.__goldDungeonStarting = false; }
    });
    wrap('startPetDungeon', old => function (...args) {
      if (!available()) return false;
      return old.apply(this, args);
    });
    wrap('startDungeonBattle', old => function (type, data, partnerPower = 0, partnerName = '', roomInfo = null) {
      if (!available() || !['gold', 'stone', 'pet'].includes(type) || !data) return false;
      const limit = type === 'gold' ? (g.goldDungeonStages?.length || 20) :
        type === 'stone' ? (g.stoneDungeonStages?.length || 6) : 1;
      const n = stageNumber(data.stage, limit);
      if (!n || !Number.isFinite(data.hp) || data.hp <= 0 ||
          !Number.isSafeInteger(data.reward) || data.reward < 0) return false;
      // This remodel has individual dungeon runs; do not resume legacy remote rooms.
      if (roomInfo || partnerPower) return false;
      f.normalizeCharacter();
      if (type === 'gold' && (n > g.state.dungeons.goldUnlocked || g.state.dungeons.goldEntries <= 0)) return false;
      if (type === 'pet' && (g.state.dungeons.petEntries <= 0 ||
          f.getPower() < (Number(data.required) || 15000))) return false;
      const result = old.call(this, type, {...data, stage: n}, 0, partnerName, null);
      if (g.activeDungeon) {
        // Direct startDungeonBattle must consume the same gold entry as the UI route.
        if (type === 'gold') g.activeDungeon.goldEntryPending = true;
        remember(g.activeDungeon);
      }
      return result;
    });

    for (const [name, kind] of [['closeTower', 'tower'], ['closeDungeon', 'dungeon']]) {
      wrap(name, old => function (...args) {
        cancel(kind);
        return old.apply(this, args);
      });
    }
    // Reopening an existing dungeon must not erase its runtime via the legacy opener.
    wrap('openDungeon', old => function (...args) {
      discardStale();
      if (!active() || g.activeTower) return false;
      if (g.activeDungeon) {
        const modal = document.getElementById('dungeonModal');
        if (modal) { modal.style.display = ''; modal.classList.add('show'); }
        f.renderDungeonBattle();
        return false;
      }
      return old.apply(this, args);
    });
    for (const [name, key] of [['towerAttackTick', 'activeTower'], ['dungeonAttackTick', 'activeDungeon']]) {
      wrap(name, old => function (...args) {
        discardStale();
        if (!g[key]) return false;
        return old.apply(this, args);
      });
    }
    wrap('attack', old => function (...args) {
      discardStale();
      if (!active()) return false;
      return old.apply(this, args);
    });
    for (const [name, key] of [['finishTowerClearV15', 'activeTower'], ['finishDungeonClearV15', 'activeDungeon']]) {
      wrap(name, old => function (battle) {
        const record = battle && owners.get(battle);
        if (!active() || !sameOwner(record)) { discardStale(); return false; }
        if (g[key] !== battle || record.canceled || record.finished ||
            battle.hp !== 0 || !battle.resolving) return false;
        record.finished = true;
        if (battle.finishTimer != null) clearTimeout(battle.finishTimer);
        // Entries belong to the KST day of clear, and quota is checked again there.
        f.normalizeCharacter();
        const result = old.call(this, battle);
        sanitize();
        // Persist progression, currency and entry debit as one completed state.
        f.save(false);
        return result;
      });
    }

    const api = {sanitize, cancelBattles() { cancel('tower'); cancel('dungeon'); }};
    Object.defineProperty(g, 'coreFixes', {value: api});
    return api;
  };
})();
