/* 墨战 · 键影 —— 主程序 */
(function () {
  'use strict';

  var D = window.GAME_DATA;
  var SKINS = window.SKINS;
  var SOUND = window.SOUND;

  var W = 1280;
  var H = 800;
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  var ATK = D.ATK;
  var ULT_MAX = 30;
  var PLAYER = { x: 640, y: 560 };
  var playerH = 320;
  var TERRITORY_Y = 642;
  var SAVE_KEY = 'mozhan.save.v1';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  /* 中文标点 → 键盘对应键（半角）。玩家按对应键位输入标点，全角标点也视为同一键。 */
  var PUNCT_KEYS = {
    '，': ',', '、': ',', '。': '.', '；': ';', '：': ':', '？': '?', '！': '!',
    '“': '"', '”': '"', '‘': "'", '’': "'", '《': '<', '》': '>', '（': '(', '）': ')',
    '—': '-', '…': '.', '·': '.'
  };
  var PUNCT_HINT = { ',': '逗号', '.': '句号', ';': '分号', ':': '冒号', '?': '问号', '!': '叹号' };
  function normPunct(ch) {
    if (!ch) return ch;
    return PUNCT_KEYS[ch] || ch;
  }
  function fmtTime(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  /* ---------------- 存档 ---------------- */
  function loadSave() {
    var s = {};
    var bad = false;
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        s = JSON.parse(raw);
        if (!s || typeof s !== 'object' || Array.isArray(s)) { s = {}; bad = true; }
      }
    } catch (e) { s = {}; bad = true; }
    if (!s || typeof s !== 'object' || Array.isArray(s)) s = {};
    if (bad) window.MOZHAN_SAVE_CORRUPT = true;
    if (!s.skin || typeof s.skin !== 'object') s.skin = { char: 'scholar', gender: 'male', weapon: 'bow' };
    if (!s.skin.char || typeof s.skin.char !== 'string') s.skin.char = 'scholar';
    if (!s.records || typeof s.records !== 'object' || Array.isArray(s.records)) s.records = {};
    if (!s.skin.gender) s.skin.gender = 'male';
    if (!s.skin.weapon) s.skin.weapon = 'bow';
    if (typeof s.speedMode !== 'boolean') s.speedMode = false;
    if (!s.prof || typeof s.prof !== 'object' || Array.isArray(s.prof)) s.prof = {};
    if (!s.missKeys || typeof s.missKeys !== 'object' || Array.isArray(s.missKeys)) s.missKeys = {};
    if (!s.fingerErr || typeof s.fingerErr !== 'object' || Array.isArray(s.fingerErr)) s.fingerErr = {};
    if (typeof s.jade !== 'number' || !isFinite(s.jade)) s.jade = 0;
    if (!s.prescription || typeof s.prescription !== 'object') s.prescription = null;
    if (!Array.isArray(s.history)) s.history = [];
    /* 大破外军 / 自定义词库 / 无限模式（旧存档自动补齐） */
    if (!s.army || typeof s.army !== 'object') s.army = {};
    if (!s.army.teach) s.army.teach = {};
    if (!s.army.practice) s.army.practice = {};
    if (!Array.isArray(s.customWords)) s.customWords = [];
    if (!Array.isArray(s.customLevels)) s.customLevels = [];
    if (typeof s.customNextId !== 'number' || s.customNextId < 1) s.customNextId = 1;
    if (!s.endless || typeof s.endless !== 'object') s.endless = { en: true, long: false, essay: false };
    if (typeof s.endless.en !== 'boolean') s.endless.en = true;
    if (typeof s.endless.long !== 'boolean') s.endless.long = false;
    if (typeof s.endless.essay !== 'boolean') s.endless.essay = false;
    return s;
  }
  var save = loadSave();
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  var persistTimer = 0;
  function schedulePersist() {
    if (persistTimer) return;
    persistTimer = setTimeout(function () {
      persistTimer = 0;
      persist();
    }, 1200);
  }

  /* ---------------- 战斗状态 ---------------- */
  var state = {
    running: false,
    phase: 'idle',
    paused: false,
    levelIndex: 0,
    level: null,
    hp: 100,
    kills: 0,
    goal: 10,
    score: 0,
    combo: 0,
    maxCombo: 0,
    tier: 0,
    correct: 0,
    total: 0,
    errors: 0,
    peakAcc: 0,
    enemies: [],
    slips: [],
    projectiles: [],
    meanings: [],
    particles: [],
    numbers: [],
    rings: [],
    slashes: [],
    bolts: [],
    stains: [],
    focus: null,
    nextId: 1,
    time: 0,
    spawnTimer: 0,
    spawnCount: 0,
    shake: 0,
    flash: 0,
    hurtFlash: 0,
    weapon: 'bow',
    charId: 'scholar',
    gender: 'male',
    recoil: 0,
    charge: 0,
    started: false,
    ended: false,
    lastTs: 0,
    raf: 0,
    toastTimer: 0,
    imeActive: false,
    imeLen: 0,
    fireBlockUntil: 0,
    lastHeavyAt: 0,
    readyPulse: 0,
    killsSinceHit: 0,
    speedMode: !!save.speedMode,
    pendingStrike: null,
    composeSlip: null,
    missKeys: {},
    missFingers: {},
    groupStats: {},
    trainGoal: null,
    prescription: null,
    rewardJade: false,
    boss: null,
    bossCount: 0,
    bossShots: [],
    ultCharge: 0,
    ultFx: null,
    brushStrokes: [],
    mode: 'campaign',
    drill: null,
    endless: null,
    lastOpts: null,
    armyTab: 'normal'
  };

  var ui = {};
  var playerImage = null;
  var playerSpriteKey = '';
  var canvas = null, ctx = null;
  var stainCanvas = null, stainCtx = null;
  var bgCanvas = null;
  var wallCanvas = null;

  function accuracyP() {
    if (!state.total) return 100;
    return (state.correct / state.total) * 100;
  }
  /* 记录本局出现过的最高精准度（无输入时不计） */
  function noteAccuracy() {
    if (!state.total) return;
    var a = accuracyP();
    if (a > state.peakAcc) state.peakAcc = a;
  }
  function damageMul() { return 1 + accuracyP() / 100; }
  function playerTorso() { return PLAYER.y - playerH * 0.235; }

  /* 长组合伤害倍率：按字母 / 拼音字母总数取档 */
  function lengthMul(word) {
    if (!word) return 1;
    var n = (word.letters || '').length;
    var table = D.LENGTH_BONUS || [];
    for (var i = 0; i < table.length; i++) {
      if (n >= table[i].min) return table[i].mul;
    }
    return 1;
  }

  /* 速字模式下，中文词不再逐字母发射 */
  function isSpeedZh(slip) {
    return !!(state.speedMode && slip && !slip.removed && slip.word && !slip.word.en && slip.word.commitNeeded && !slip.word.boss);
  }
  function isBossSlip(slip) {
    return !!(slip && !slip.removed && slip.word && slip.word.boss);
  }
  /* 速字与 Boss 整句都走“整段拼音或整句上屏后自动结算”的路径 */
  function isAutoZh(slip) { return isSpeedZh(slip) || isBossSlip(slip); }

  function currentLevel() { return state.level || D.LEVELS[0]; }

  /* ---------------- 键位分组熟练度 ---------------- */
  var GROUP_DEFS = [
    { id: 'lh', name: '左手基准', short: '左基', keys: 'asdfg' },
    { id: 'rh', name: '右手基准', short: '右基', keys: "hjkl;'" },
    { id: 'top', name: '上排', short: '上排', keys: 'qwertyuiop[]\\' },
    { id: 'bottom', name: '下排', short: '下排', keys: 'zxcvbnm,./' },
    { id: 'num', name: '数字符号', short: '数符', keys: '1234567890-=`~!@#$%^&*()_+{}|:"<>?' }
  ];
  var GROUP_INDEX = {};
  GROUP_DEFS.forEach(function (g) { GROUP_INDEX[g.id] = g; });

  var SHIFT_MAP = {
    '!': '1', '@': '2', '#': '3', '$': '4', '%': '5', '^': '6', '&': '7', '*': '8',
    '(': '9', ')': '0', '_': '-', '+': '=', '{': '[', '}': ']', '|': '\\', ':': ';',
    '"': "'", '<': ',', '>': '.', '?': '/', '~': '`'
  };
  var FINGER_BY_KEY = null;
  function fingerOf(ch) {
    if (ch === undefined || ch === null || ch === '') return null;
    if (!FINGER_BY_KEY) {
      FINGER_BY_KEY = {};
      D.FINGERS.forEach(function (f) {
        f.keys.forEach(function (k) {
          if (k !== 'space') FINGER_BY_KEY[k] = f.id;
        });
      });
    }
    var c = String(ch);
    if (c.length !== 1) return null;
    if (SHIFT_MAP[c]) c = SHIFT_MAP[c];
    if (c === ' ') return 'thumb';
    c = c.toLowerCase();
    return FINGER_BY_KEY[c] || null;
  }
  function fingerName(id) {
    for (var i = 0; i < D.FINGERS.length; i++) {
      if (D.FINGERS[i].id === id) return D.FINGERS[i].hand + '手' + D.FINGERS[i].name;
    }
    return '右手小指';
  }
  function keyGroupOf(ch) {
    if (ch === undefined || ch === null || ch === '') return null;
    var c = String(ch);
    if (c.length !== 1) return null;
    if (/[A-Z]/.test(c)) c = c.toLowerCase();
    for (var i = 0; i < GROUP_DEFS.length; i++) {
      if (GROUP_DEFS[i].keys.indexOf(c) !== -1) return GROUP_DEFS[i].id;
    }
    return null;
  }
  function groupName(id) { return GROUP_INDEX[id] ? GROUP_INDEX[id].name : '键位'; }

  /* 词的主键组：字母出现次数最多者，并列取靠后一组 */
  function wordGroup(word) {
    if (!word || !word.letters) return null;
    var counts = {};
    var letters = word.letters;
    for (var i = 0; i < letters.length; i++) {
      var g = keyGroupOf(letters.charAt(i));
      if (g) counts[g] = (counts[g] || 0) + 1;
    }
    var best = null, bestN = 0;
    GROUP_DEFS.forEach(function (d) {
      var n = counts[d.id] || 0;
      if (n > 0 && n >= bestN) { bestN = n; best = d.id; }
    });
    return best;
  }

  /* 熟练度 → 攻击倍率：差组明显偏弱（0.58），好组最高 1.22 */
  function profMul(id) {
    var p = save.prof[id];
    if (!p || !p.n || p.n < 8) return 1;
    var acc = p.ok / p.n;
    var accT = clamp((acc - 0.60) / 0.38, 0, 1);
    var spdT = clamp((p.spd || 0) / 6.5, 0, 1);
    return clamp(0.58 + accT * 0.42 + spdT * 0.20, 0.58, 1.22);
  }
  function profSize(mul) { return clamp(0.34 + mul * 0.68, 0.68, 1.18); }
  function chargeDelay(mul) { return clamp(0.40 - (mul - 0.58) * 0.36, 0.18, 0.40); }

  function noteKeyStat(expected, actual, ok) {
    var key = expected || actual;
    var gid = keyGroupOf(key) || keyGroupOf(actual);
    if (!gid) return;
    var now = performance.now();
    var g = save.prof[gid];
    if (!g) g = save.prof[gid] = { n: 0, ok: 0, spd: 0, last: 0 };
    if (g.last > 0) {
      var dt = now - g.last;
      if (dt > 40 && dt < 4000) {
        var inst = clamp(1000 / dt, 0.3, 12);
        g.spd = g.spd ? g.spd * 0.78 + inst * 0.22 : inst;
      }
    }
    g.last = now;
    g.n++;
    if (ok) g.ok++;
    else {
      var mk = String(key).toLowerCase();
      state.missKeys[mk] = (state.missKeys[mk] || 0) + 1;
      save.missKeys[mk] = (save.missKeys[mk] || 0) + 1;
      var fid = fingerOf(key) || fingerOf(actual);
      if (fid) {
        state.missFingers[fid] = (state.missFingers[fid] || 0) + 1;
        save.fingerErr[fid] = (save.fingerErr[fid] || 0) + 1;
      }
    }
    var sg = state.groupStats[gid];
    if (!sg) sg = state.groupStats[gid] = { n: 0, ok: 0 };
    sg.n++;
    if (ok) sg.ok++;
    schedulePersist();
  }

  function worstFinger() {
    var best = null, bestN = 0;
    D.FINGERS.forEach(function (f) {
      var n = save.fingerErr[f.id] || 0;
      if (n > bestN) { bestN = n; best = f.id; }
    });
    return best || 'r-pinky';
  }
  function weakestGroup() {
    var best = null, bestAcc = 2;
    GROUP_DEFS.forEach(function (d) {
      var p = save.prof[d.id];
      if (!p || p.n < 20) return;
      var a = p.ok / p.n;
      if (a < bestAcc) { bestAcc = a; best = d.id; }
    });
    return best;
  }

  function makeTrainGoal() {
    var lv = state.level || D.LEVELS[0];
    var rec = save.records[lv.id];
    var types = [];
    var hasFingerErr = D.FINGERS.some(function (f) { return (save.fingerErr[f.id] || 0) > 0; });
    if (hasFingerErr) {
      var wf = worstFinger();
      var wfN = save.fingerErr[wf] || 0;
      var cap = Math.max(1, Math.min(5, Math.round(state.goal / 7)));
      var fGoal = {
        type: 'finger', finger: wf, cap: cap,
        text: '压住「' + fingerName(wf) + '」的误击，本局不超过 ' + cap + ' 次'
      };
      var reps = wfN >= 8 ? 3 : 1;
      for (var fi = 0; fi < reps; fi++) types.push(fGoal);
    }
    var baseAcc = rec && rec.acc ? rec.acc + 1 : (lv.id <= 6 ? 93 : lv.id <= 10 ? 91 : 89);
    var accTarget = clamp(Math.round(baseAcc), 84, 99);
    types.push({ type: 'acc', target: accTarget, text: '把本境精准提到 ' + accTarget + '% 以上' });
    var wg = weakestGroup();
    if (wg) {
      var p = save.prof[wg];
      var gTarget = clamp(Math.round((p.ok / p.n) * 100) + 4, 82, 98);
      types.push({
        type: 'group', group: wg, target: gTarget,
        text: '把「' + groupName(wg) + '」的准确率提到 ' + gTarget + '% 以上'
      });
    }
    return pick(types);
  }

  function trainResult() {
    var t = state.trainGoal;
    if (!t) return { met: false, detail: '' };
    if (t.type === 'finger') {
      var e = state.missFingers[t.finger] || 0;
      return { met: e <= t.cap, detail: fingerName(t.finger) + ' 误击 ' + e + ' 次（目标 ≤ ' + t.cap + '）' };
    }
    if (t.type === 'acc') {
      if (!state.total) return { met: false, detail: '本局无有效输入' };
      var a = Math.round(accuracyP());
      return { met: a >= t.target, detail: '本局精准 ' + a + '%（目标 ≥ ' + t.target + '%）' };
    }
    var sg = state.groupStats[t.group];
    var ga = sg && sg.n ? Math.round((sg.ok / sg.n) * 100) : 0;
    return {
      met: !!(sg && sg.n >= 6 && ga >= t.target),
      detail: groupName(t.group) + ' 准确率 ' + ga + '%（目标 ≥ ' + t.target + '%，样本 ' + (sg ? sg.n : 0) + '）'
    };
  }

  function buildPrescription() {
    var letters = [];
    Object.keys(state.missKeys).forEach(function (k) {
      if (/^[a-z]$/.test(k)) letters.push({ k: k, n: state.missKeys[k] });
    });
    letters.sort(function (a, b) { return b.n - a.n; });
    var keys = letters.slice(0, 3).map(function (x) { return x.k; });
    var groups = [];
    GROUP_DEFS.forEach(function (d) {
      var sg = state.groupStats[d.id];
      if (sg && sg.n >= 8 && sg.ok / sg.n < 0.9) groups.push({ id: d.id, acc: sg.ok / sg.n });
    });
    groups.sort(function (a, b) { return a.acc - b.acc; });
    var weak = groups.slice(0, 2).map(function (g) { return g.id; });
    if (!keys.length && weak.length) {
      var d = GROUP_INDEX[weak[0]];
      keys = d.keys.split('').filter(function (c) { return /^[a-z]$/.test(c); }).slice(0, 4);
    }
    state.prescription = { keys: keys, groups: weak, at: Date.now() };
    save.prescription = state.prescription;
    return state.prescription;
  }

  function keyLabel(k) {
    if (k === ' ') return '空格';
    return k.length === 1 ? k.toUpperCase() : k;
  }

  /* ---------------- 页面切换 ---------------- */
  function showView(name) {
    if (name !== 'battle' && state.running) stopBattle();
    $$('.view').forEach(function (v) {
      var on = v.getAttribute('data-view') === name;
      v.classList.toggle('is-active', on);
      if (on) v.scrollTop = 0;
    });
    document.body.setAttribute('data-view', name);
    if (name === 'levels') renderLevels();
    if (name === 'skins') renderSkins();
    if (name === 'tutorial') renderTutorial();
    if (name === 'army') renderArmy();
    if (name === 'endless') syncEndlessForm();
    if (name === 'home') refreshHomeLoadout();
  }

  function refreshHomeLoadout() {
    var c = SKINS.getCharacter(save.skin.char);
    var g = save.skin.gender === 'female' ? 'female' : 'male';
    var w = SKINS.getWeapon(save.skin.weapon);
    var label = c.name + ' · ' + c.titles[g] + ' ／ ' + w.name;
    var el = $('#home-loadout');
    if (el) el.textContent = '当前装扮：' + label;
    var s = $('#skin-summary');
    if (s) s.textContent = label;
  }

  /* ---------------- 关卡列表 ---------------- */
  function renderLevels() {
    var grid = $('#level-grid');
    if (!grid) return;
    var html = '';
    D.LEVELS.forEach(function (lv, i) {
      var rec = save.records[lv.id];
      var num = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾'][i] || (i + 1);
      html += '<button class="level-card' + (rec ? ' is-clear' : '') + '" data-level="' + i + '" type="button">' +
        '<span class="lv-top"><span class="lv-num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="lv-seal">' + (rec ? '已破' : num) + '</span></span>' +
        '<span class="lv-name">' + esc(lv.name) + '</span>' +
        '<span class="lv-en">' + esc(lv.en) + '</span>' +
        '<span class="lv-focus">' + esc(lv.focus) + '</span>' +
        '<span class="lv-req">斩 ' + lv.goal + ' · ' + fmtTime(lv.limit) + ' · 同屏 ' + lv.maxAlive + '</span>' +
        '<span class="lv-best"><span>' + (rec ? (rec.perfect ? '无瑕 · 最高精准' : '最高精准') : '尚未通关') + '</span>' +
        (rec ? '<b>' + rec.acc.toFixed(1) + '%</b>' : '<b>—</b>') + '</span>' +
        '</button>';
    });
    grid.innerHTML = html;
    $$('.level-card', grid).forEach(function (card) {
      card.addEventListener('click', function () {
        SOUND.unlock();
        SOUND.ui();
        startBattle(parseInt(card.getAttribute('data-level'), 10));
      });
    });
    var clearCount = D.LEVELS.filter(function (l) { return !!save.records[l.id]; }).length;
    var summary = $('#progress-summary');
    if (summary) summary.textContent = '已通关 ' + clearCount + ' / ' + D.LEVELS.length;
  }

  /* ================= 大破外军 · 词库与关卡 ================= */
  var VOCAB = window.VOCAB || { EN3500: [], LEVEL_SIZE: 15 };

  function armySize() { return VOCAB.LEVEL_SIZE || 15; }
  function armyLevelCount() { return Math.max(1, Math.ceil(VOCAB.EN3500.length / armySize())); }
  function armyWords(n) {
    var size = armySize();
    return VOCAB.EN3500.slice(n * size, (n + 1) * size).map(armyWordObj);
  }
  function armyWordObj(entry) {
    return {
      text: entry.w, en: true, letters: entry.w, syllables: null, chars: null,
      commitNeeded: false, mean: entry.m, rank: entry.r
    };
  }
  function armyTeachKey(n) { return 'a' + n; }
  function armyTeachDone(n) { return !!save.army.teach[armyTeachKey(n)]; }
  function armyPracticeDone(n) { return !!save.army.practice[armyTeachKey(n)]; }
  function armyCleared(n) { return armyTeachDone(n) && armyPracticeDone(n); }

  function customWordById(id) {
    for (var i = 0; i < save.customWords.length; i++) {
      if (save.customWords[i].id === id) return save.customWords[i];
    }
    return null;
  }
  function customEntryObj(entry) {
    return {
      text: entry.w, en: true, letters: entry.w, syllables: null, chars: null,
      commitNeeded: false, mean: entry.m, custom: true
    };
  }

  function renderArmy() {
    var grid = $('#army-grid');
    if (!grid) return;
    var tab = state.armyTab === 'custom' ? 'custom' : 'normal';
    $$('.army-tab').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-army-tab') === tab);
    });
    var panel = $('#custom-panel');
    if (panel) panel.hidden = tab !== 'custom';

    var html = '';
    if (tab === 'normal' && !VOCAB.EN3500.length) {
      grid.innerHTML = '<p class="empty-note">词库为空：assets/vocab.js 未能提供 3500 词，请确认文件完整后刷新。</p>';
      return;
    }
    if (tab === 'normal') {
      var total = armyLevelCount();
      for (var n = 0; n < total; n++) {
        var ws = armyWords(n);
        if (!ws.length) continue;
        var first = ws[0].rank || (n * armySize() + 1);
        var last = ws[ws.length - 1].rank || (n * armySize() + ws.length);
        var pre = ws.slice(0, 4).map(function (w) { return w.text; }).join(' · ');
        html += '<div class="army-card' + (armyCleared(n) ? ' is-clear' : '') + '" data-army-level="' + n + '">' +
          '<span class="ac-top"><span class="ac-num">第 ' + (n + 1) + ' 阵</span>' +
          '<span class="ac-seal">' + (armyCleared(n) ? '已破' : armyTeachDone(n) ? '待练' : '未启') + '</span></span>' +
          '<span class="ac-range">RANK ' + first + '–' + last + '</span>' +
          '<span class="ac-words">' + esc(pre) + '…</span>' +
          '<span class="ac-acts">' +
          '<button class="ac-btn' + (armyTeachDone(n) ? '' : ' primary') + '" data-army-act="teach" type="button">' +
          (armyTeachDone(n) ? '复习教学' : '教学关') + '</button>' +
          '<button class="ac-btn" data-army-act="practice" type="button"' + (armyTeachDone(n) ? '' : ' disabled') + '>练习关</button>' +
          '</span></div>';
      }
    } else if (!save.customLevels.length) {
      html = '<div class="cw-empty">还没有自定义关卡。先在下方录入词条，再用编号编排出 15 词一关。</div>';
    } else {
      save.customLevels.forEach(function (ids, ci) {
        var key = 'c' + ci;
        var teach = !!save.army.teach[key];
        var pract = !!save.army.practice[key];
        var names = ids.map(function (id) {
          var e = customWordById(id);
          return e ? e.w : '#' + id;
        }).slice(0, 4).join(' · ');
        html += '<div class="army-card' + (teach && pract ? ' is-clear' : '') + '" data-custom-level="' + ci + '">' +
          '<span class="ac-top"><span class="ac-num">第 ' + (ci + 1) + ' 阵</span>' +
          '<span class="ac-seal">' + (teach && pract ? '已破' : teach ? '待练' : '未启') + '</span></span>' +
          '<span class="ac-range">' + ids.length + ' 词 · 编号 ' + ids.join(',') + '</span>' +
          '<span class="ac-words">' + esc(names) + '…</span>' +
          '<span class="ac-acts">' +
          '<button class="ac-btn' + (teach ? '' : ' primary') + '" data-custom-act="teach" type="button">' +
          (teach ? '复习教学' : '教学关') + '</button>' +
          '<button class="ac-btn" data-custom-act="practice" type="button"' + (teach ? '' : ' disabled') + '>练习关</button>' +
          '</span></div>';
      });
    }
    grid.innerHTML = html;

    $$('[data-army-level]', grid).forEach(function (card) {
      var n = parseInt(card.getAttribute('data-army-level'), 10);
      $$('[data-army-act]', card).forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (btn.disabled) return;
          SOUND.unlock(); SOUND.ui();
          startArmyLevel(n, btn.getAttribute('data-army-act'));
        });
      });
    });
    $$('[data-custom-level]', grid).forEach(function (card) {
      var ci = parseInt(card.getAttribute('data-custom-level'), 10);
      $$('[data-custom-act]', card).forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (btn.disabled) return;
          SOUND.unlock(); SOUND.ui();
          startCustomLevel(ci, btn.getAttribute('data-custom-act'));
        });
      });
    });

    var sum = $('#army-summary');
    if (sum) {
      if (tab === 'normal') {
        var done = 0;
        for (var i = 0; i < armyLevelCount(); i++) if (armyCleared(i)) done++;
        sum.textContent = '已破 ' + done + ' / ' + armyLevelCount() + ' 阵';
      } else {
        sum.textContent = '词条 ' + save.customWords.length + ' · 关卡 ' + save.customLevels.length;
      }
    }
    renderCustomPanel();
  }

  function renderCustomPanel() {
    var list = $('#cw-list');
    if (list) {
      if (!save.customWords.length) {
        list.innerHTML = '<div class="cw-empty">词库为空。录入英文单词与汉语释义后，会自动获得一个编号。</div>';
      } else {
        list.innerHTML = save.customWords.map(function (e) {
          return '<div class="cw-row"><b>#' + e.id + '</b><span class="cw-w">' + esc(e.w) + '</span>' +
            '<span class="cw-m">' + esc(e.m) + '</span>' +
            '<button data-cw-del="' + e.id + '" type="button">删除</button></div>';
        }).join('');
        $$('[data-cw-del]', list).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = parseInt(btn.getAttribute('data-cw-del'), 10);
            save.customWords = save.customWords.filter(function (e) { return e.id !== id; });
            persist();
            renderArmy();
          });
        });
      }
    }
    var lvList = $('#cw-levels');
    if (lvList) {
      if (!save.customLevels.length) {
        lvList.innerHTML = '<div class="cw-empty">暂无自定义关卡。</div>';
      } else {
        lvList.innerHTML = save.customLevels.map(function (ids, i) {
          return '<div class="cw-row"><b>第' + (i + 1) + '阵</b><span class="cw-m">' + ids.join(' · ') + '</span>' +
            '<button data-cw-lvdel="' + i + '" type="button">删除</button></div>';
        }).join('');
        $$('[data-cw-lvdel]', lvList).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var i = parseInt(btn.getAttribute('data-cw-lvdel'), 10);
            save.customLevels.splice(i, 1);
            persist();
            renderArmy();
          });
        });
      }
    }
  }

  function addCustomWord() {
    var enEl = $('#cw-en');
    var meanEl = $('#cw-mean');
    var tip = $('#cw-tip');
    if (!enEl || !meanEl) return;
    var w = String(enEl.value || '').trim().toLowerCase();
    var m = String(meanEl.value || '').trim();
    if (!/^[a-z][a-z'\-]*$/.test(w) || !m) {
      if (tip) tip.textContent = '录入失败：英文只允许字母、连字符或撇号；汉语释义不能为空。';
      return;
    }
    var dup = null;
    for (var i = 0; i < save.customWords.length; i++) {
      if (save.customWords[i].w === w) { dup = save.customWords[i]; break; }
    }
    if (dup) {
      if (tip) tip.textContent = '该单词已存在，编号 #' + dup.id + '。';
      return;
    }
    var id = save.customNextId || 1;
    save.customNextId = id + 1;
    save.customWords.push({ id: id, w: w, m: m });
    enEl.value = '';
    meanEl.value = '';
    if (tip) tip.textContent = '已录入 #' + id + ' · ' + w + '。';
    persist();
    renderArmy();
  }

  function saveCustomLevel() {
    var idsEl = $('#cw-ids');
    if (!idsEl) return;
    var ids = String(idsEl.value || '').split(/[^0-9]+/).filter(function (s) { return s; })
      .map(function (s) { return parseInt(s, 10); });
    var uniq = [];
    ids.forEach(function (id) { if (uniq.indexOf(id) === -1) uniq.push(id); });
    var tip = $('#cw-tip');
    if (ids.length !== 15 || uniq.length !== 15) {
      if (tip) tip.textContent = '保存失败：需要正好 15 个不重复编号，当前 ' + uniq.length + ' 个。';
      return;
    }
    for (var i = 0; i < uniq.length; i++) {
      if (!customWordById(uniq[i])) {
        if (tip) tip.textContent = '保存失败：编号 #' + uniq[i] + ' 不存在。';
        return;
      }
    }
    save.customLevels.push(uniq);
    idsEl.value = '';
    persist();
    if (tip) tip.textContent = '已保存自定义第 ' + save.customLevels.length + ' 阵。';
    renderArmy();
  }

  function startArmyLevel(n, stage) {
    var words = armyWords(n);
    if (!words.length) return;
    startBattle(-1, {
      mode: 'army', index: n, stage: stage === 'practice' ? 'practice' : 'teach',
      words: words, title: '第 ' + (n + 1) + ' 阵',
      sub: 'RANK ' + (words[0].rank || 1) + '–' + (words[words.length - 1].rank || words.length)
    });
  }

  function startCustomLevel(ci, stage) {
    var ids = save.customLevels[ci];
    if (!ids) return;
    var words = [];
    ids.forEach(function (id) {
      var e = customWordById(id);
      if (e) words.push(customEntryObj(e));
    });
    if (words.length !== 15) {
      var tip = $('#cw-tip');
      if (tip) tip.textContent = '该关卡词条不足 15 个，请检查编号是否被删除。';
      return;
    }
    startBattle(-1, {
      mode: 'custom', index: ci, stage: stage === 'practice' ? 'practice' : 'teach',
      words: words, title: '第 ' + (ci + 1) + ' 阵', sub: '15 词'    });
  }

  function syncEndlessForm() {
    var en = $('#es-en'), lo = $('#es-long'), es = $('#es-essay');
    if (en) en.checked = !!save.endless.en;
    if (lo) lo.checked = !!save.endless.long;
    if (es) es.checked = !!save.endless.essay;
  }

  function startEndless() {
    var en = $('#es-en'), lo = $('#es-long'), es = $('#es-essay');
    var sources = {
      en: !!(en && en.checked), long: !!(lo && lo.checked), essay: !!(es && es.checked)
    };
    if (!sources.en && !sources.long && !sources.essay) {
      var note = $('.endless-note');
      if (note) note.textContent = '请至少选择一种输入形式（英语 / 长句 / 文章）。';
      return;
    }
    var lacksEn = sources.en && !(window.VOCAB && window.VOCAB.EN3500 && window.VOCAB.EN3500.length);
    var lacksLong = sources.long && !(window.LONG_TEXTS && window.LONG_TEXTS.length);
    var lacksEssay = sources.essay && !(window.ESSAYS && window.ESSAYS.length);
    if (lacksEn || lacksLong || lacksEssay) {
      var note2 = $('.endless-note');
      if (note2) note2.textContent = '所选输入形式暂无可用语料，请取消对应勾选，或确认 assets 数据文件完整。';
      return;
    }
    save.endless = sources;
    persist();
    startBattle(-1, { mode: 'endless', sources: sources, title: '无限墨战', sub: 'ENDLESS' });
  }


  /* ---------------- 皮肤页 ---------------- */
  function renderSkins() {
    var charGrid = $('#char-grid');
    var weaponGrid = $('#weapon-grid');
    if (!charGrid || !weaponGrid) return;
    var selectedChar = save.skin.char;
    var selectedGender = save.skin.gender;
    var selectedWeapon = save.skin.weapon;

    charGrid.innerHTML = SKINS.characters.map(function (c) {
      return ['male', 'female'].map(function (g) {
        var active = c.id === selectedChar && g === selectedGender;
        return '<button class="char-card' + (active ? ' is-active' : '') + '" data-char="' + c.id + '" data-gender="' + g + '" type="button">' +
          '<span class="char-art">' + SKINS.loadoutCanvasHTML(c.id, g) + '</span>' +
          '<span class="char-label">' + c.name + ' · ' + c.titles[g] +
          '<small>' + (g === 'male' ? '男' : '女') + '</small></span>' +
          '</button>';
      }).join('');
    }).join('');

    weaponGrid.innerHTML = SKINS.weapons.map(function (w) {
      var active = w.id === selectedWeapon;
      return '<button class="weapon-card' + (active ? ' is-active' : '') + '" data-weapon="' + w.id + '" type="button">' +
        '<span class="weapon-icon">' + SKINS.weaponIconSVG(w.id) + '</span>' +
        '<span class="weapon-meta"><h4>' + w.name + '<span>' + w.en + '</span></h4>' +
        '<p>' + esc(w.desc) + '</p></span>' +
        '</button>';
    }).join('');

    $$('.char-card', charGrid).forEach(function (card) {
      card.addEventListener('click', function () {
        save.skin.char = card.getAttribute('data-char');
        save.skin.gender = card.getAttribute('data-gender');
        persist();
        SOUND.unlock();
        SOUND.flip();
        renderSkins();
      });
    });
    $$('.weapon-card', weaponGrid).forEach(function (card) {
      card.addEventListener('click', function () {
        save.skin.weapon = card.getAttribute('data-weapon');
        persist();
        SOUND.unlock();
        SOUND.flip();
        renderSkins();
      });
    });

    var c = SKINS.getCharacter(save.skin.char);
    var g = save.skin.gender;
    var w = SKINS.getWeapon(save.skin.weapon);
    $('#preview-family').textContent = c.family;
    $('#preview-name').textContent = c.name + ' · ' + c.titles[g];
    $('#preview-desc').textContent = c.desc[g];
    $('#preview-tags').innerHTML = c.tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') +
      '<span>' + esc(w.name) + ' · ' + esc(w.tag) + '</span>';
    $('#skin-preview-art').innerHTML = SKINS.loadoutCanvasHTML(c.id, g, 'portrait-canvas portrait-preview');
    $$('.portrait-canvas').forEach(function (cv) {
      SKINS.paintLoadout(cv, cv.getAttribute('data-char'), cv.getAttribute('data-gender'), save.skin.weapon);
    });
    refreshHomeLoadout();
  }

  /* ---------------- 十指教学 ---------------- */
  function buildKeyboardSVG() {
    var pitch = 54, keyW = 48, keyH = 48, x0 = 14, y0 = 12;
    var map = {};
    D.FINGERS.forEach(function (f) {
      f.keys.forEach(function (k) { if (k !== 'space') map[k] = f; });
    });
    var spaceFinger = D.FINGERS[D.FINGERS.length - 1];
    var totalH = y0 + D.KEYBOARD_ROWS.length * pitch + 6;
    var out = [];
    out.push('<svg viewBox="0 0 744 ' + totalH + '" xmlns="http://www.w3.org/2000/svg" class="kb-svg">');
    out.push('<rect x="2" y="2" width="740" height="' + (totalH - 4) + '" rx="10" fill="#f6eedd" fill-opacity="0.5" stroke="rgba(23,19,15,0.18)"/>');
    D.KEYBOARD_ROWS.forEach(function (row, ri) {
      var y = y0 + ri * pitch;
      row.keys.forEach(function (k, ki) {
        var isSpace = k === 'space';
        var f = isSpace ? spaceFinger : map[k];
        var color = f ? f.color : '#6b6053';
        var w = isSpace ? 318 : keyW;
        var x = isSpace ? (744 - w) / 2 : x0 + (row.offset + ki) * pitch;
        var h = isSpace ? 42 : keyH;
        var label = isSpace ? 'SPACE' : k.toUpperCase();
        var fontSize = isSpace ? 10 : 16;
        out.push('<g class="kb-key" data-key="' + esc(k) + '">');
        out.push('<title>' + (f ? (f.hand === '双' ? '' : f.hand + '手') + f.name : '') + ' · ' + (isSpace ? '空格' : k) + '</title>');
        out.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="7" fill="' + color + '" fill-opacity="0.24" stroke="' + color + '" stroke-opacity="0.6" stroke-width="1.2"/>');
        out.push('<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + (isSpace ? 3 : 6)) + '" text-anchor="middle" font-family="Songti SC,STSong,serif" font-size="' + fontSize + '" fill="#17130f" fill-opacity="0.82">' + esc(label) + '</text>');
        if (k === 'f' || k === 'j') {
          out.push('<circle cx="' + (x + w / 2) + '" cy="' + (y + h - 10) + '" r="2.4" fill="#17130f" fill-opacity="0.55"/>');
        }
        if (f && f.extra && (k === 'f' || k === 'j' || k === 'space')) {
          out.push('<circle cx="' + (x + w / 2) + '" cy="' + (y + 9) + '" r="1.6" fill="' + color + '" fill-opacity="0.9"/>');
        }
        out.push('</g>');
      });
    });
    out.push('</svg>');
    return out.join('');
  }

  function buildHandsSVG() {
    var colors = {
      pinky: '#9c3a2e',
      ring: '#a8842c',
      middle: '#4f6b52',
      index: '#2f4257',
      thumb: '#6b5545'
    };
    function hand(side) {
      var mirror = side === 'right';
      var wrap = mirror
        ? '<g transform="translate(370 0) scale(-1 1)">'
        : '<g transform="translate(0 0)">';
      var s = '';
      s += '<path d="M52 96 Q50 132 66 158 L130 158 Q142 130 138 96 Z" fill="#ecd2b4" stroke="#17130f" stroke-opacity="0.55" stroke-width="1.4"/>';
      s += '<rect x="70" y="150" width="62" height="26" rx="9" fill="#e2c39f" stroke="#17130f" stroke-opacity="0.4" stroke-width="1.2"/>';
      s += '<rect x="46" y="54" width="17" height="54" rx="8.5" fill="' + colors.pinky + '" fill-opacity="0.55" stroke="' + colors.pinky + '" stroke-width="1.4"/>';
      s += '<rect x="67" y="40" width="18" height="68" rx="9" fill="' + colors.ring + '" fill-opacity="0.55" stroke="' + colors.ring + '" stroke-width="1.4"/>';
      s += '<rect x="89" y="30" width="18" height="78" rx="9" fill="' + colors.middle + '" fill-opacity="0.55" stroke="' + colors.middle + '" stroke-width="1.4"/>';
      s += '<rect x="111" y="42" width="18" height="66" rx="9" fill="' + colors.index + '" fill-opacity="0.55" stroke="' + colors.index + '" stroke-width="1.4"/>';
      s += '<path d="M132 120 Q152 114 160 100 Q166 92 158 88 Q150 86 144 96 L128 112 Z" fill="' + colors.thumb + '" fill-opacity="0.55" stroke="' + colors.thumb + '" stroke-width="1.4"/>';
      s += '<circle cx="120" cy="86" r="2.4" fill="#17130f" fill-opacity="0.6"/>';
      s += '<text x="92" y="196" text-anchor="middle" font-family="Songti SC,STSong,serif" font-size="13" fill="#17130f" fill-opacity="0.6">' + (mirror ? '右手' : '左手') + '</text>';
      return wrap + s + '</g>';
    }
    return '<svg viewBox="0 0 370 210" xmlns="http://www.w3.org/2000/svg">' +
      hand('left') + hand('right') +
      '<path d="M30 214 L160 214 M210 214 L340 214" stroke="#17130f" stroke-opacity="0.12"/>' +
      '</svg>';
  }

  function renderTutorial() {
    var kb = $('#finger-keyboard');
    if (kb && !kb.dataset.done) {
      kb.innerHTML = buildKeyboardSVG();
      kb.dataset.done = '1';
    }
    var legend = $('#finger-legend');
    if (legend && !legend.dataset.done) {
      legend.innerHTML = D.FINGERS.map(function (f) {
        var keys = f.keys.map(function (k) { return k === 'space' ? '空格' : k.toUpperCase(); }).join(' ');
        return '<div class="legend-item" data-finger="' + f.id + '">' +
          '<span class="legend-dot" style="background:' + f.color + '"></span>' +
          '<span class="legend-text"><b>' + (f.hand === '双' ? '' : f.hand + '手') + f.name + '</b>' +
          '<span>' + esc(keys) + '</span>' +
          (f.extra ? '<em>' + esc(f.extra) + '</em>' : '') +
          '</span></div>';
      }).join('');
      legend.dataset.done = '1';
    }
    var hands = $('#hand-diagram');
    if (hands && !hands.dataset.done) {
      hands.innerHTML = buildHandsSVG();
      hands.dataset.done = '1';
    }
    renderPractice();
  }

  /* ---------------- 互动带练 ---------------- */
  var PRACTICE_GROUPS = [
    { name: '基准键位', keys: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'] },
    { name: '上排扩张', keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'] },
    { name: '下排落定', keys: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'] },
    { name: '数字列阵', keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] },
    { name: '拇指空格', keys: ['space'] }
  ];
  var practice = { steps: [], index: 0, active: false, done: false, errors: 0 };

  function practiceKeyLabel(k) {
    return k === 'space' ? '空格' : k.toUpperCase();
  }

  function fingerForKey(k) {
    if (k === 'space') return D.FINGERS[D.FINGERS.length - 1];
    for (var i = 0; i < D.FINGERS.length; i++) {
      if (D.FINGERS[i].keys.indexOf(k) !== -1) return D.FINGERS[i];
    }
    return null;
  }

  function practiceFingerName(f) {
    if (!f) return '未知指位';
    return (f.hand === '双' ? '' : f.hand + '手') + f.name;
  }

  function buildPracticeSteps() {
    var steps = [];
    PRACTICE_GROUPS.forEach(function (g) {
      g.keys.forEach(function (k) { steps.push({ key: k, group: g.name }); });
    });
    return steps;
  }

  function highlightPracticeKey(key) {
    var finger = key ? fingerForKey(key) : null;
    $$('.kb-key').forEach(function (el) {
      el.classList.toggle('is-target', !!key && el.getAttribute('data-key') === key);
    });
    $$('.legend-item').forEach(function (el) {
      el.classList.toggle('is-active', !!finger && el.getAttribute('data-finger') === finger.id);
    });
  }

  function renderPractice(tone, message) {
    var keyEl = $('#practice-key');
    if (!keyEl) return;
    var total = practice.steps.length || buildPracticeSteps().length;
    var step = practice.active ? practice.steps[practice.index] : null;
    var finger = step ? fingerForKey(step.key) : null;
    var fingerEl = $('#practice-finger');
    var groupEl = $('#practice-group');
    var feedback = $('#practice-feedback');
    var bar = $('#practice-bar');
    var count = $('#practice-count');
    var startBtn = $('#practice-start');

    if (practice.active && step) {
      keyEl.textContent = practiceKeyLabel(step.key);
      keyEl.className = 'practice-key is-live';
      keyEl.style.borderColor = finger ? finger.color : '';
      keyEl.style.color = finger ? finger.color : '';
      if (fingerEl) {
        fingerEl.innerHTML = '<span class="finger-dot" style="background:' + (finger ? finger.color : '#6b6053') + '"></span>' +
          '第 ' + (practice.index + 1) + ' 键 · 用' + practiceFingerName(finger) + '敲击';
        fingerEl.style.color = finger ? finger.color : '';
      }
      if (groupEl) groupEl.textContent = step.group;
      highlightPracticeKey(step.key);
      if (bar) bar.style.width = Math.round((practice.index / total) * 100) + '%';
      if (count) count.textContent = practice.index + ' / ' + total;
    } else if (practice.done) {
      keyEl.textContent = '畢';
      keyEl.className = 'practice-key is-done';
      keyEl.style.borderColor = '';
      keyEl.style.color = '';
      if (fingerEl) {
        fingerEl.textContent = '一轮 ' + total + ' 键已完成' + (practice.errors ? ' · 误按 ' + practice.errors + ' 次' : ' · 全对');
        fingerEl.style.color = '';
      }
      if (groupEl) groupEl.textContent = '带练结束';
      highlightPracticeKey('');
      if (bar) bar.style.width = '100%';
      if (count) count.textContent = total + ' / ' + total;
    } else {
      keyEl.textContent = '归位';
      keyEl.className = 'practice-key';
      keyEl.style.borderColor = '';
      keyEl.style.color = '';
      if (fingerEl) {
        fingerEl.textContent = '食指落 F / J · 双拇指轻搭空格';
        fingerEl.style.color = '';
      }
      if (groupEl) groupEl.textContent = '未开始';
      highlightPracticeKey('');
      if (bar) bar.style.width = '0%';
      if (count) count.textContent = '0 / ' + total;
    }

    if (feedback) {
      var defaultMsg = practice.active
        ? '跟随高亮落指，按对才前进；按错会提示正确指法。'
        : practice.done ? '可再练一轮，或返回直接开战。' : '按「开始带练」，从基准键位逐键走到全键盘。';
      feedback.textContent = message || defaultMsg;
      feedback.className = 'practice-feedback' + (tone ? ' ' + tone : '');
    }
    if (startBtn) {
      startBtn.textContent = practice.active ? '重新开始' : practice.done ? '再练一轮' : '开始带练';
    }
  }

  function startPractice() {
    practice.steps = buildPracticeSteps();
    practice.index = 0;
    practice.active = true;
    practice.done = false;
    practice.errors = 0;
    renderPractice('ok', '从「A」开始，跟着高亮逐键走完一轮。');
  }

  function practiceKeyFromEvent(e) {
    if (e.key === ' ' || e.key === 'Spacebar') return 'space';
    if (e.key.length === 1) return e.key.toLowerCase();
    return '';
  }

  function onPracticeKeyDown(e) {
    if (document.body.getAttribute('data-view') !== 'tutorial' || !practice.active) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    var step = practice.steps[practice.index];
    if (!step) return;
    var pressed = practiceKeyFromEvent(e);
    if (!pressed) {
      if (e.key === 'Shift') {
        e.preventDefault();
        renderPractice('warn', 'Shift 由小指负责 · 本步请敲「' + practiceKeyLabel(step.key) + '」，用' +
          practiceFingerName(fingerForKey(step.key)) + '。');
      }
      return;
    }
    e.preventDefault();
    if (pressed === step.key) {
      practice.index++;
      if (practice.index >= practice.steps.length) {
        practice.active = false;
        practice.done = true;
        SOUND.ready();
        renderPractice('ok', '一轮已毕 · 十指归位。可再练一轮，或直接开战。');
      } else {
        SOUND.light('bow', 0);
        renderPractice('ok', '正确 · 「' + practiceKeyLabel(pressed) + '」归' + practiceFingerName(fingerForKey(pressed)) + '。');
      }
    } else {
      practice.errors++;
      SOUND.error();
      renderPractice('wrong', '按错了：「' + practiceKeyLabel(pressed) + '」由' + practiceFingerName(fingerForKey(pressed)) +
        '负责；本步应敲「' + practiceKeyLabel(step.key) + '」，用' + practiceFingerName(fingerForKey(step.key)) + '。');
    }
  }

  /* ---------------- 说明弹层 ---------------- */
  function openHelp(open) {
    var m = $('#help-modal');
    if (!m) return;
    if (open) m.removeAttribute('hidden');
    else m.setAttribute('hidden', '');
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    refreshHomeLoadout();

    $$('[data-go]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        SOUND.unlock();
        SOUND.ui();
        showView(btn.getAttribute('data-go'));
      });
    });
    $$('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        SOUND.ui();
        showView(btn.getAttribute('data-back'));
      });
    });
    var lo = $('#home-loadout');
    if (lo) lo.addEventListener('click', function () {
      SOUND.ui();
      showView('skins');
    });
    var longBtn = $('#btn-long-mode');
    if (longBtn) longBtn.addEventListener('click', function () {
      SOUND.unlock();
      SOUND.ui();
      showView('levels');
      var target = $('.level-card[data-level="16"]');
      if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    var essayBtn = $('#btn-essay-mode');
    if (essayBtn) essayBtn.addEventListener('click', function () {
      SOUND.unlock();
      SOUND.ui();
      showView('levels');
      var target = $('.level-card[data-level="19"]');
      if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });

    var armyTabs = $('#army-tabs');
    if (armyTabs) armyTabs.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-army-tab]') : null;
      if (!btn) return;
      SOUND.ui();
      state.armyTab = btn.getAttribute('data-army-tab') === 'custom' ? 'custom' : 'normal';
      renderArmy();
    });
    var cwAdd = $('#cw-add');
    if (cwAdd) cwAdd.addEventListener('click', function () { SOUND.ui(); addCustomWord(); });
    ['#cw-en', '#cw-mean'].forEach(function (sel) {
      var el = $(sel);
      if (el) el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); addCustomWord(); }
      });
    });
    var cwLevel = $('#cw-level');
    if (cwLevel) cwLevel.addEventListener('click', function () { SOUND.ui(); saveCustomLevel(); });
    var cwIds = $('#cw-ids');
    if (cwIds) cwIds.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); saveCustomLevel(); }
    });
    var endlessStart = $('#endless-start');
    if (endlessStart) endlessStart.addEventListener('click', function () {
      SOUND.unlock(); SOUND.ui(); startEndless();
    });

    var helpBtn = $('#btn-help');
    if (helpBtn) helpBtn.addEventListener('click', function () { SOUND.unlock(); SOUND.ui(); openHelp(true); });
    var helpClose = $('#help-close');
    if (helpClose) helpClose.addEventListener('click', function () { SOUND.ui(); openHelp(false); });
    var helpModal = $('#help-modal');
    if (helpModal) helpModal.addEventListener('click', function (e) {
      if (e.target === helpModal) openHelp(false);
    });

    var speedToggle = $('#speed-toggle');
    function syncSpeedToggle() {
      var st = $('#speed-state');
      if (speedToggle) {
        speedToggle.classList.toggle('is-on', !!save.speedMode);
        speedToggle.setAttribute('aria-pressed', save.speedMode ? 'true' : 'false');
      }
      if (st) st.textContent = save.speedMode ? '开' : '关';
    }
    syncSpeedToggle();
    if (speedToggle) speedToggle.addEventListener('click', function () {
      SOUND.unlock();
      SOUND.ui();
      save.speedMode = !save.speedMode;
      state.speedMode = !!save.speedMode;
      persist();
      syncSpeedToggle();
      updateSpeedBox();
    });

    var soundBtn = $('#btn-sound-home');
    var muteBtn = $('#btn-mute');
    function syncSoundBtns() {
      var label = SOUND.muted ? '音效：关' : '音效：开';
      if (soundBtn) soundBtn.textContent = label;
      if (muteBtn) {
        muteBtn.textContent = SOUND.muted ? '静' : '音';
        muteBtn.title = SOUND.muted ? '开启音效' : '关闭音效';
      }
    }
    syncSoundBtns();
    if (soundBtn) soundBtn.addEventListener('click', function () {
      SOUND.unlock();
      SOUND.toggleMuted();
      syncSoundBtns();
      if (!SOUND.muted) SOUND.ui();
    });
    if (muteBtn) muteBtn.addEventListener('click', function () {
      SOUND.toggleMuted();
      syncSoundBtns();
      if (!SOUND.muted) SOUND.ui();
      focusCapture();
    });

    var pauseBtn = $('#btn-pause');
    if (pauseBtn) pauseBtn.addEventListener('click', function () {
      togglePause();
      focusCapture();
    });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && state.running && state.phase === 'playing') togglePause(true);
    });

    var capture = $('#key-capture');
    if (capture) {
      capture.addEventListener('compositionstart', onCompositionStart);
      capture.addEventListener('compositionupdate', onCompositionUpdate);
      capture.addEventListener('compositionend', onCompositionEnd);
      capture.addEventListener('input', onInputFallback);
      capture.addEventListener('blur', function () {
        if (state.running && state.phase === 'playing') {
          setTimeout(function () {
            if (state.running && state.phase === 'playing' && document.activeElement !== capture) focusCapture();
          }, 40);
        }
      });
    }
    var screenEl = $('.monitor-screen');
    if (screenEl) screenEl.addEventListener('pointerdown', function (ev) {
      SOUND.unlock();
      if (state.running && state.phase === 'playing') focusSlip(pickSlipAt(ev));
      focusCapture();
    });

    var modalEnter = function (e) {
      if (e.key === 'Escape') openHelp(false);
    };
    document.addEventListener('keydown', modalEnter);

    var practiceStart = $('#practice-start');
    if (practiceStart) practiceStart.addEventListener('click', function () {
      SOUND.unlock();
      SOUND.ui();
      startPractice();
    });
    document.addEventListener('keydown', onPracticeKeyDown);

    renderTutorial();
    window.addEventListener('beforeunload', function () { if (state.running) stopBattle(); });
    window.__mozhan = { state: state, save: save, startBattle: startBattle, winBattle: winBattle, loseBattle: loseBattle, profMul: profMul, wordGroup: wordGroup };
  }

  /* ================= 战斗：初始化 ================= */
  var LEVEL_CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '二十一', '二十二'];

  function cacheUI() {
    ui.hpFill = $('#hp-fill');
    ui.hpNum = $('#hp-num');
    ui.acc = $('#stat-acc');
    ui.accBox = $('#acc-box');
    ui.accReq = $('#stat-acc-req');
    ui.timer = $('#hud-timer');
    ui.combo = $('#stat-combo');
    ui.comboBox = $('#combo-box');
    ui.tier = $('#tier-seal');
    ui.pips = $('#goal-pips');
    ui.goal = $('#goal-label');
    ui.hint = $('#input-hint');
    ui.levelIdx = $('#hud-level-index');
    ui.levelName = $('#hud-level-name');
    ui.loadout = $('#battle-loadout');
    ui.hintbar = $('#hintbar-loadout');
    ui.overlay = $('#battle-overlay');
    ui.toast = $('#battle-toast');
    ui.levelTag = $('.level-tag');
    ui.profStrip = $('#prof-strip');
    ui.trainTag = $('#train-tag');
    ui.speedBox = $('#speed-box');
    ui.speedTarget = $('#speed-target');
    ui.speedInput = $('#speed-input');
    ui.speedMul = $('#speed-mul');
    ui.longStrip = $('#long-strip');
    ui.lsTitle = $('#long-strip-title');
    ui.lsBatch = $('#long-strip-batch');
    ui.lsWord = $('#long-strip-word');
    ui.lsPy = $('#long-strip-py');
    ui.ultGauge = $('#ult-gauge');
    ui.ultFill = $('#ult-fill');
    ui.ultNum = $('#ult-num');
    ui.drillBox = $('#drill-box');
    ui.drillStage = $('#drill-stage');
    ui.drillCount = $('#drill-count');
    ui.drillStreak = $('#drill-streak');
    ui.drillCn = $('#drill-cn');
    ui.drillEn = $('#drill-en');
    ui.drillTyped = $('#drill-typed');
  }

  function initBattleCanvas() {
    if (canvas) return;
    cacheUI();
    canvas = $('#battle-canvas');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;

    stainCanvas = document.createElement('canvas');
    stainCtx = stainCanvas.getContext('2d');

    bgCanvas = document.createElement('canvas');
    wallCanvas = document.createElement('canvas');

    layoutStage();
  }

  function layoutStage() {
    if (!canvas) return;
    var scr = $('.monitor-screen');
    var rw = scr ? scr.clientWidth : 0;
    var rh = scr ? scr.clientHeight : 0;
    if (!rw || !rh) { rw = window.innerWidth; rh = window.innerHeight; }
    W = Math.max(720, Math.round(rw));
    H = Math.max(520, Math.round(rh));
    DPR = Math.min(2, window.devicePixelRatio || 1);

    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    stainCanvas.width = W * DPR;
    stainCanvas.height = H * DPR;
    stainCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

    bgCanvas.width = W * DPR;
    bgCanvas.height = H * DPR;

    wallCanvas.width = W * DPR;
    wallCanvas.height = H * DPR;

    // 守城视角：墙顶（压顶）落在 TERRITORY_Y，人物站在墙体内侧的步道上
    TERRITORY_Y = H * 0.80;
    var wm = wallMetrics();
    playerH = clamp(Math.min(H * 0.375, W * 0.30), 286, 420);
    PLAYER.x = W / 2;
    PLAYER.y = wm.crest + wm.capH + wm.faceH + Math.max(22, H * 0.03) - 20;

    SLOTS[0].x = W * 0.235;
    SLOTS[0].y = H * 0.245;
    SLOTS[1].x = W * 0.765;
    SLOTS[1].y = H * 0.240;
    SLOTS[2].x = W * 0.5;
    SLOTS[2].y = H * 0.285;

    state.slips.forEach(function (s) {
      if (s.removed) return;
      if (s.boss) {
        s.x = W / 2;
        s.y = H * 0.385;
        s.w = Math.min(W * 0.68, 880);
        s.h = clamp(H * 0.20, 144, 168);
        return;
      }
      if (SLOTS[s.slot]) { s.x = SLOTS[s.slot].x; s.y = SLOTS[s.slot].y; }
    });
    if (state.boss && !state.boss.dead) {
      state.boss.baseX = W / 2;
      state.boss.baseY = H * 0.165;
      state.boss.wallY = TERRITORY_Y - 46;
      state.boss.coreX = W / 2 + Math.min(W * 0.68, 880) / 2 + Math.max(20, W * 0.02);
      state.boss.r = clamp(H * 0.076, 46, 66);
      if (!state.boss.rounds) state.boss.y = state.boss.baseY;
    }

    renderBackground();
    renderCityWall();
    if (state.long && state.long.article) repaginateArticle();
  }

  function normalizeWord(item) {
    if (typeof item === 'string') {
      return { text: item, en: true, letters: item, syllables: null, chars: null, commitNeeded: false };
    }
    return {
      text: item.t,
      en: false,
      letters: item.py.replace(/[^a-zA-Z]/g, '').toLowerCase(),
      syllables: item.py.split(/\s+/),
      chars: item.t.split(''),
      commitNeeded: true
    };
  }

  function getWordPool(level) {
    if (level.pool === 'zh') {
      return D.ZH.filter(function (w) { return w.t.length === 2; }).map(normalizeWord);
    }
    if (level.pool === 'idioms') {
      return D.ZH.filter(function (w) { return w.t.length === 4; }).map(normalizeWord);
    }
    if (level.pool === 'mixed') {
      var arr = [];
      ['home', 'top', 'bottom', 'all', 'numbers', 'symbols', 'caps', 'punct', 'long', 'phrases'].forEach(function (k) {
        arr = arr.concat(D.POOLS[k].map(normalizeWord));
      });
      return arr.concat(D.ZH.map(normalizeWord));
    }
    if (level.pool === 'final') {
      var late = [];
      ['long', 'phrases', 'symbols', 'caps', 'punct'].forEach(function (k) {
        late = late.concat(D.POOLS[k].map(normalizeWord));
      });
      return late.concat(D.ZH.filter(function (w) { return w.t.length === 4; }).map(normalizeWord));
    }
    var pool = D.POOLS[level.pool] || D.POOLS.home;
    return pool.map(normalizeWord);
  }

  var wordPool = [];

  /* ================= 大破外军 / 无限：模式关卡与教学练习 ================= */
  function buildModeLevel(index, opts) {
    if (opts.mode === 'army' || opts.mode === 'custom') {
      var words = opts.words || [];
      if (!words.length) return null;
      var teach = opts.stage !== 'practice';
      var drill = {
        stage: teach ? 'teach' : 'practice',
        words: words, index: 0, streak: 0, need: 3, done: 0,
        key: (opts.mode === 'army' ? armyTeachKey(opts.index || 0) : 'c' + (opts.index || 0))
      };
      return {
        id: (opts.mode === 'army' ? 'army-' : 'custom-') + ((opts.index || 0) + 1),
        name: opts.title || '大破外军',
        en: opts.mode === 'army' ? 'WORD ARMY' : 'CUSTOM ARMY',
        focus: teach ? '教学 · 连对三次进一词' : '练习 · 只看汉语',
        desc: teach
          ? '汉语释义与英文同时给出，连续输对 3 次才换下一个词。木桩靶不会进攻，不限时。'
          : '只给汉语释义，逐字母输入英文；每个正确字母攻击一次。',
        tip: '',
        goal: words.length,
        hp: teach ? 999 : 80,
        speed: 40,
        spawn: teach ? 999 : 1.25,
        breach: 22,
        maxAlive: 6,
        slips: 1,
        limit: 0,
        mix: { crow: 0.35, wolf: 0.5, brute: 0.15 },
        words: words,
        _drill: drill
      };
    }
    if (opts.mode === 'endless') {
      var sources = opts.sources || { en: true, long: false, essay: false };
      return {
        id: 'endless',
        name: opts.title || '无限墨战',
        en: 'ENDLESS',
        focus: '英语 · 长句 · 文章',
        desc: '按所选范围持续生成词题，不设终点。每个正确字母攻击一次，退出即结算。',
        tip: '',
        goal: 0,
        hp: D.PLAYER_HP,
        speed: 48,
        spawn: 1.05,
        breach: 20,
        maxAlive: 8,
        slips: 1,
        limit: 0,
        mix: { crow: 0.35, wolf: 0.5, brute: 0.15 },
        _drill: { stage: 'endless', sources: sources, index: 0, streak: 0, need: 1, done: 0, key: 'endless' },
        _endless: { sources: sources }
      };
    }
    return D.LEVELS[index] || null;
  }

  /* 逐字拼音映射：汉字按顺序消费拼音音节，标点不占音节 */
  function charPyMap(text, py) {
    var toks = String(py || '').split(/\s+/).filter(function (s) { return s; });
    var k = 0;
    var map = [];
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (/[\u4e00-\u9fa5]/.test(ch)) map.push(toks[k++] || '');
      else map.push('');
    }
    return map;
  }

  function textDrillWord(text, py, label) {
    var letters = String(py || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
    return {
      text: text,
      en: false,
      letters: letters,
      syllables: String(py || '').split(/\s+/).filter(function (s) { return s; }),
      chars: String(text).split(''),
      commitNeeded: false,
      mean: '',
      drillText: true,
      srcLabel: label || ''
    };
  }

  /* 从长文 / 整篇中截取 8–12 个汉字的小段，附对应拼音 */
  function pickTextChunk(list, minSpan, maxSpan) {
    if (!list || !list.length) return null;
    var entry = pick(list);
    var text = String(entry.t || '');
    if (!text) return null;
    var map = charPyMap(text, entry.py);
    var hans = [];
    for (var i = 0; i < text.length; i++) if (/[\u4e00-\u9fa5]/.test(text.charAt(i))) hans.push(i);
    if (hans.length <= (maxSpan || 12)) return textDrillWord(text, entry.py, entry.s);
    var span = Math.min(hans.length - 1, randInt(minSpan || 7, maxSpan || 11));
    var startHan = randInt(0, hans.length - span - 1);
    var a = hans[startHan];
    var b = hans[startHan + span];
    var seg = text.slice(a, b + 1);
    var py = [];
    for (var j = a; j <= b; j++) if (map[j]) py.push(map[j]);
    if (!py.length) return null;
    return textDrillWord(seg, py.join(' '), entry.s);
  }

  function nextEndlessWord() {
    var e = state.endless || { en: true, long: false, essay: false };
    var srcs = [];
    if (e.en) srcs.push('en');
    if (e.long) srcs.push('long');
    if (e.essay) srcs.push('essay');
    if (!srcs.length) srcs.push('en');
    var src = pick(srcs);
    if (src === 'en') {
      if (VOCAB.EN3500.length) return armyWordObj(pick(VOCAB.EN3500));
    } else {
      var chunk = src === 'long'
        ? pickTextChunk(window.LONG_TEXTS || [], 7, 11)
        : pickTextChunk(window.ESSAYS || [], 16, 24);
      if (chunk) return chunk;
      chunk = src === 'long'
        ? pickTextChunk(window.ESSAYS || [], 16, 24)
        : pickTextChunk(window.LONG_TEXTS || [], 7, 11);
      if (chunk) return chunk;
    }
    if (VOCAB.EN3500.length) return armyWordObj(pick(VOCAB.EN3500));
    return { text: 'moyu', en: true, letters: 'moyu', syllables: null, chars: null, commitNeeded: false, mean: '墨玉' };
  }

  function currentDrillWord() {
    var d = state.drill;
    if (d.stage === 'endless') return nextEndlessWord();
    var w = d.words[Math.min(d.index, d.words.length - 1)];
    return w || d.words[0];
  }

  function spawnDrillSlip() {
    var slip = {
      id: state.nextId++, word: null, slot: 2,
      x: 640, y: 500, w: 0, h: 0, rot: 0,
      born: state.time, pop: 1, bob: 0, removed: false
    };
    applyWord(slip, currentDrillWord());
    slip.w = Math.min(640, slip.w);
    slip.rot = 0;
    state.slips = [slip];
    state.focus = slip;
  }

  function typedHTML(slip, typedOnly) {
    if (!slip || !slip.word) return '';
    var letters = slip.word.letters || '';
    var n = slip.progress || 0;
    var max = 64;
    var end = typedOnly ? Math.min(n, letters.length) : letters.length;
    var html = '';
    for (var i = 0; i < end && i < max; i++) {
      html += '<i class="' + (!typedOnly || i < n ? 'on' : '') + '">' + esc(letters.charAt(i)) + '</i>';
    }
    if (!typedOnly && letters.length > max) html += '<i>…</i>';
    return html;
  }

  function updateDrillBox() {
    if (!ui.drillBox) return;
    var d = state.drill;
    if (!d) { ui.drillBox.hidden = true; return; }
    ui.drillBox.hidden = false;
    ui.drillBox.classList.toggle('is-teach', d.stage === 'teach');
    var w = state.focus && state.focus.word;
    if (d.stage === 'teach') {
      ui.drillStage.textContent = '教学';
      ui.drillCount.textContent = '第 ' + Math.min(d.index + 1, d.words.length) + ' / ' + d.words.length + ' 词';
      ui.drillStreak.textContent = '连对 ' + d.streak + ' / ' + d.need;
      ui.drillCn.textContent = w && w.mean ? w.mean : '—';
      ui.drillEn.classList.remove('hidden-answer', 'is-py');
      ui.drillEn.textContent = w ? w.text : '';
    } else if (d.stage === 'practice') {
      ui.drillStage.textContent = '练习';
      ui.drillCount.textContent = '第 ' + Math.min(d.done + 1, d.words.length) + ' / ' + d.words.length + ' 词';
      ui.drillStreak.textContent = '';
      ui.drillCn.textContent = w && w.mean ? w.mean : '—';
      ui.drillEn.classList.add('hidden-answer');
      ui.drillEn.classList.remove('is-py');
      ui.drillEn.textContent = '';
    } else {
      ui.drillStage.textContent = '无限';
      ui.drillCount.textContent = '已成 ' + d.done + ' 题';
      ui.drillStreak.textContent = (w && w.srcLabel) ? w.srcLabel : '';
      ui.drillCn.textContent = w ? w.text : '—';
      if (w && !w.en && w.syllables && w.syllables.length) {
        ui.drillEn.classList.remove('hidden-answer');
        ui.drillEn.classList.add('is-py');
        ui.drillEn.textContent = w.syllables.join(' ');
      } else {
        ui.drillEn.classList.add('hidden-answer');
        ui.drillEn.classList.remove('is-py');
        ui.drillEn.textContent = '';
      }
    }
    ui.drillTyped.innerHTML = typedHTML(state.focus, true);
  }

  function drillCorrectLetter(slip) {
    var d = state.drill;
    if (!d) return;
    SOUND.light(state.weapon, state.tier, state.combo);
    state.recoil = 0.16;
    if (d.stage !== 'teach') fireLight(slip);
    updateSlipReady(slip, false);
    updateDrillBox();
    if (slip.progress >= (slip.word.letters || '').length) drillWordDone(slip);
  }

  function drillWordDone(slip) {
    var d = state.drill;
    if (!d) return;
    if (d.stage === 'teach') {
      fireHeavy(slip, { target: nearestEnemy() });
      d.streak++;
      if (d.streak >= d.need) {
        d.streak = 0;
        d.done++;
        d.index++;
        if (d.index >= d.words.length) {
          updateDrillBox();
          finishGoal();
          return;
        }
        applyWord(slip, currentDrillWord());
        SOUND.ready();
      } else {
        slip.progress = 0;
        slip.ready = false;
        slip.lettersDoneAt = 0;
        showToast('连对 ' + d.streak + ' / ' + d.need + ' · 再来一遍');
      }
    } else {
      d.done++;
      d.index++;
      if (d.stage === 'practice' && d.done >= d.words.length) {
        updateDrillBox();
        finishGoal();
        return;
      }
      applyWord(slip, currentDrillWord());
      SOUND.ready();
    }
    updateDrillBox();
    updateHud(true);
    updateHint();
  }

  function spawnDummyEnemy() {
    var r = 46 * clamp(H / 800, 0.9, 1.4);
    var hp = Number.MAX_SAFE_INTEGER;
    state.enemies.push({
      id: state.nextId++, type: 'dummy',
      x: W / 2, baseX: W / 2, y: H * 0.46, r: r,
      hp: hp, maxHp: hp, speed: 0, swayA: 0, swayF: 0, phase: 0,
      angle: 0, flash: 0, breach: 0, dead: false, seed: 3.7
    });
  }

  function startBattle(index, opts) {
    initBattleCanvas();
    opts = opts || { mode: 'campaign' };
    var lv = buildModeLevel(index, opts);
    if (!lv) return;

    state.levelIndex = typeof opts.index === 'number' ? opts.index : index;
    state.mode = opts.mode || 'campaign';
    state.lastOpts = opts;
    state.drill = lv._drill || null;
    state.endless = lv._endless ? lv._endless.sources : null;
    state.level = lv;
    state.running = true;
    state.phase = 'playing';
    state.paused = false;
    state.hp = lv.hp && lv.hp > 0 ? lv.hp : D.PLAYER_HP;
    state.kills = 0;
    state.goal = state.drill ? (lv.words ? lv.words.length : lv.goal) : lv.goal;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.tier = 0;
    state.correct = 0;
    state.total = 0;
    state.errors = 0;
    state.peakAcc = 0;
    state.enemies = [];
    state.slips = [];
    state.projectiles = [];
    state.meanings = [];
    state.particles = [];
    state.numbers = [];
    state.rings = [];
    state.slashes = [];
    state.bolts = [];
    state.focus = null;
    state.nextId = 1;
    state.time = 0;
    state.spawnTimer = 2.2;
    state.spawnCount = 0;
    state.shake = 0;
    state.flash = 0;
    state.hurtFlash = 0;
    state.recoil = 0;
    state.charge = 0;
    state.ended = false;
    state.started = true;
    state.failReason = null;
    state.imeActive = false;
    state.imeLen = 0;
    state.fireBlockUntil = 0;
    state.readyPulse = 0;
    state.killsSinceHit = 0;
    state.speedMode = !!save.speedMode;
    state.pendingStrike = null;
    state.composeSlip = null;
    state.weapon = save.skin.weapon || 'bow';
    state.charId = save.skin.char || 'scholar';
    state.gender = save.skin.gender || 'male';
    state.missKeys = {};
    state.missFingers = {};
    state.groupStats = {};
    state.rewardJade = false;
    state.boss = null;
    state.bossCount = 0;
    state.bossShots = [];
    state.ultCharge = 0;
    state.ultFx = null;
    state.brushStrokes = [];
    state.shotsFired = 0;
    state.shotsBlocked = 0;
    state.shotsHit = 0;
    state.long = null;
    state.prescription = (save.prescription && save.prescription.keys && save.prescription.keys.length)
      ? save.prescription : null;
    state.trainGoal = state.drill ? null : makeTrainGoal();
    wordPool = state.drill ? [] : lv.long ? [] : getWordPool(lv);
    if (ui.longStrip) ui.longStrip.hidden = true;
    if (ui.drillBox) ui.drillBox.hidden = !state.drill;

    if (stainCtx) {
      stainCtx.setTransform(1, 0, 0, 1, 0, 0);
      stainCtx.clearRect(0, 0, stainCanvas.width, stainCanvas.height);
      stainCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    showView('battle');
    layoutStage();
    buildGoalPips();
    updateHud(true);
    updateHint();
    updateTier(true);
    loadPlayerSprite();
    var w = SKINS.getWeapon(state.weapon);
    var c = SKINS.getCharacter(state.charId);
    var g = state.gender === 'female' ? 'female' : 'male';
    var label = c.name + ' · ' + c.titles[g] + ' ／ ' + w.name;
    if (ui.loadout) ui.loadout.textContent = label;
    if (ui.hintbar) ui.hintbar.textContent = label;
    if (ui.levelIdx) {
      ui.levelIdx.textContent = state.mode === 'endless' ? '无限'
        : state.mode === 'army' ? '外军'
        : state.mode === 'custom' ? '自定义'
        : '第' + (LEVEL_CN[index] || (index + 1)) + '境';
    }
    if (ui.levelName) ui.levelName.textContent = lv.name;

    if (state.drill) {
      if (state.drill.stage === 'teach') spawnDummyEnemy();
      spawnDrillSlip();
      updateDrillBox();
    } else if (lv.boss) {
      spawnBoss();
      newBossSlip();
    } else if (lv.long) {
      initLongMode(lv);
      updateLongStrip();
    } else {
      for (var si = 0; si < (lv.slips || 3); si++) spawnWord(true);
      focusNext(true);
    }
    updateSpeedBox();
    showIntro();
    updateHud(true);

    SOUND.setMode(0);
    SOUND.unlock();
    SOUND.ambient(true);
    setTimeout(focusCapture, 60);

    state.lastTs = performance.now();
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = requestAnimationFrame(loop);
  }

  function stopBattle() {
    state.running = false;
    state.phase = 'idle';
    state.paused = false;
    state.focus = null;
    if (state.raf) {
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }
    if (ui.overlay) {
      ui.overlay.setAttribute('hidden', '');
      ui.overlay.className = 'overlay';
      ui.overlay.innerHTML = '';
    }
    SOUND.ambient(false);
    SOUND.setMode(0);
    state.long = null;
    state.drill = null;
    state.endless = null;
    if (ui.longStrip) ui.longStrip.hidden = true;
    if (ui.drillBox) ui.drillBox.hidden = true;
    var capture = $('#key-capture');
    if (capture) capture.blur();
    updateSpeedBox();
  }

  function loadPlayerSprite() {
    var key = state.charId + '-' + state.gender;
    if (playerSpriteKey === key && playerImage && playerImage.complete) return;
    playerSpriteKey = key;
    var img = new Image();
    var captureKey = key;
    img.onload = function () {
      if (playerSpriteKey === captureKey) playerImage = img;
    };
    img.src = SKINS.portraitPath(state.charId, state.gender);
  }

  function focusCapture() {
    if (document.body.getAttribute('data-view') !== 'battle') return;
    var input = $('#key-capture');
    if (!input) return;
    try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
  }

  function clearCapture() {
    var input = $('#key-capture');
    if (input && !state.imeActive) input.value = '';
  }

  /* ================= 输入 ================= */
  function onKeyDown(e) {
    if (document.body.getAttribute('data-view') !== 'battle') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      togglePause();
      return;
    }
    if (state.phase !== 'playing') return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.repeat) return;
    if (state.imeActive || e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      tryUltimate();
      return;
    }
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      if (state.drill) {
        showToast('教学 / 练习 / 无限模式无需重击，直接逐字母输入');
        return;
      }
      tryHeavy();
      return;
    }
    if (e.key === 'Tab') { e.preventDefault(); return; }
    if (e.key.length === 1) {
      e.preventDefault();
      handleKeystroke(e.key);
      clearCapture();
    }
  }

  function onKeyUp() {}
  function onResize() {
    if (!canvas || !state.running) return;
    layoutStage();
    loadPlayerSprite();
  }

  function onInputFallback() {
    if (state.phase !== 'playing' || state.imeActive) return;
    var input = $('#key-capture');
    if (!input) return;
    var value = input.value;
    if (!value) return;
    // 单字符且刚由 keydown 处理过时，视为同一次按键的回声，避免重复判定
    if (value.length === 1 && performance.now() - (state.lastKeyAt || 0) < 50) {
      input.value = '';
      return;
    }
    for (var i = 0; i < value.length; i++) {
      if (value.charCodeAt(i) >= 32) handleKeystroke(value[i]);
    }
    input.value = '';
  }

  function onCompositionStart() {
    state.imeActive = true;
    state.imeLen = 0;
    state.composeSlip = state.focus;
    if (state.focus) {
      state.focus.imeBase = state.focus.progress;
      state.focus.imeResults = [];
    }
  }

  function onCompositionUpdate(e) {
    if (state.phase !== 'playing') return;
    var raw = e.data || '';
    if (state.long) { handleLongComposition(raw); return; }
    if (/[^\x00-\x7F]/.test(raw) && !/[a-zA-Z]/.test(raw)) return;
    var slip = state.composeSlip || state.focus;
    if (!slip || slip.removed || slip.strikeQueued) return;
    var letters = raw.replace(/[^a-zA-Z]/g, '').toLowerCase();
    slip.imeRaw = raw;
    slip.usedIme = true;
    if (!slip.imeResults) {
      slip.imeBase = slip.progress;
      slip.imeResults = [];
    }
    var results = slip.imeResults;
    // 删除：只回退本段拼音中已计入的字母
    while (results.length > letters.length) {
      var popped = results.pop();
      state.total = Math.max(0, state.total - 1);
      if (popped) {
        state.correct = Math.max(0, state.correct - 1);
        slip.progress = Math.max(slip.imeBase, slip.progress - 1);
      }
    }
    while (results.length < letters.length) {
      var btok = slip.word.boss && slip.word.keys ? slip.word.keys[slip.progress] : null;
      // 标点必须实际按键，输入法拼音不越过标点
      if (slip.word.boss && (!btok || btok.k === 'p')) break;
      var ch = letters[results.length];
      var exp = slip.word.letters;
      var expect = btok ? btok.ch : exp.charAt(slip.progress);
      var ok = slip.progress < exp.length && ch === expect;
      results.push(ok);
      state.total++;
      noteKeyStat(expect, ch, ok);
      if (ok) {
        state.correct++;
        state.combo++;
        if (state.combo > state.maxCombo) state.maxCombo = state.combo;
        slip.progress++;
        addUltCharge();
        onCorrectLetter(slip);
      } else {
        state.errors++;
        state.combo = 0;
        onWrongLetter(slip);
      }
    }
    updateTier();
    noteAccuracy();
    updateHud(true);
  }

  function onCompositionEnd(e) {
    state.imeActive = false;
    state.imeLen = 0;
    state.fireBlockUntil = performance.now() + 220;
    if (state.long) {
      state.long.imeRaw = '';
      state.long.imeApplied = 0;
      var li = $('#key-capture');
      if (li) li.value = '';
      updateLongStrip();
      updateHud(true);
      return;
    }
    var slip = state.composeSlip || state.focus;
    state.composeSlip = null;
    if (slip && slip.removed) slip = null;
    if (slip) {
      slip.imeResults = null;
      slip.imeRaw = '';
      var committed = (e && e.data) || '';
      if (!committed) {
        var input = $('#key-capture');
        committed = input ? input.value : '';
      }
      var hasHanzi = /[\u4e00-\u9fa5]/.test(committed);
      var hasBossPunct = !!(slip.word.boss && /[，。、；：？！]/.test(committed));
      if (committed && (hasHanzi || hasBossPunct) && slip.word.commitNeeded) {
        if (isSpeedZh(slip) || isBossSlip(slip)) {
          handleSpeedCommit(slip, committed);
        } else if (hasHanzi) {
          slip.committed = (slip.committed + committed).slice(-24);
          var clean = slip.committed.replace(/[^\u4e00-\u9fa5]/g, '');
          if (clean.indexOf(slip.word.text) !== -1) slip.commitOk = true;
          updateSlipReady(slip, true);
        }
      }
    }
    var input = $('#key-capture');
    if (input) input.value = '';
    updateHud(true);
  }

  function handleKeystroke(ch) {
    if (state.phase !== 'playing') return;
    if (state.long) { handleLongKey(ch); return; }
    if (!state.focus) return;
    state.lastKeyAt = performance.now();
    var slip = state.focus;
    var exp = slip.word.letters;
    if (slip.progress >= exp.length) {
      state.total++;
      state.errors++;
      state.combo = 0;
      noteKeyStat(ch, ch, false);
      onWrongLetter(slip);
      updateTier();
      updateHud(true);
      return;
    }
    var expect = exp.charAt(slip.progress);
    var ok = /[a-z]/.test(expect) ? ch.toLowerCase() === expect : ch === expect;
    if (slip.word.boss && slip.word.keys) {
      var tok = slip.word.keys[slip.progress];
      ok = !!tok && (tok.k === 'l' ? ch.toLowerCase() === tok.ch : normPunct(ch) === tok.ch);
    }
    state.total++;
    noteKeyStat(expect, ch, ok);
    if (ok) {
      state.correct++;
      state.combo++;
      if (state.combo > state.maxCombo) state.maxCombo = state.combo;
      slip.progress++;
      addUltCharge();
      onCorrectLetter(slip);
    } else {
      state.errors++;
      state.combo = 0;
      onWrongLetter(slip);
    }
    updateTier();
    noteAccuracy();
    updateHud(true);
  }

  function onCorrectLetter(slip) {
    if (state.drill) { drillCorrectLetter(slip); return; }
    var autoZh = isAutoZh(slip);
    SOUND.light(state.weapon, state.tier, state.combo);
    if (autoZh) {
      // 速字 / Boss 整句：逐字母只计精准与连击，不发射
      state.recoil = 0.08;
      for (var i = 0; i < 3; i++) {
        state.particles.push({
          x: slip.x + rand(-slip.w * 0.3, slip.w * 0.3), y: slip.y + rand(-8, 12),
          vx: rand(-16, 16), vy: rand(-34, -8), r: rand(1, 2.4),
          life: rand(0.2, 0.5), maxLife: 0.5, gravity: 70, color: '#a8362b'
        });
      }
      // Boss：每完成一个汉字，落一次普通攻击（一字一击）
      if (isBossSlip(slip)) bossSyncCharHits(slip);
    } else {
      state.recoil = 0.2;
      fireLight(slip);
    }
    updateSlipReady(slip, false);
    if (slip.progress >= slip.word.letters.length) {
      if (!slip.lettersDoneAt) slip.lettersDoneAt = state.time;
      // 输入法路径必须逐字上屏校验；无输入法时才按完整拼音直接发射
      if (autoZh && !slip.usedIme) queueSpeedStrike(slip);
    }
  }

  function onWrongLetter(slip) {
    slip.errFlash = 1;
    state.shake = Math.max(state.shake, 2.2);
    SOUND.error();
    inkSmudge(slip);
    if (state.drill && state.drill.stage === 'teach') {
      state.drill.streak = 0;
      slip.progress = 0;
      slip.ready = false;
      slip.lettersDoneAt = 0;
    }
    if (state.drill) updateDrillBox();
    updateHint();
  }

  function updateSlipReady(slip, fromCommit) {
    if (!slip || slip.removed) return;
    var exp = slip.word.letters;
    if (slip.progress < exp.length) {
      if (slip.ready) slip.ready = false;
      return;
    }
    if (!slip.lettersDoneAt) slip.lettersDoneAt = state.time;
    var ok = false;
    if (!slip.word.commitNeeded) ok = true;
    else if (slip.commitOk) ok = true;
    else if (!slip.usedIme && state.time - slip.lettersDoneAt > 0.5) ok = true;
    if (ok && !slip.ready) {
      slip.ready = true;
      slip.readyAt = state.time;
      state.readyPulse = 1;
      SOUND.ready();
      ring(PLAYER.x, PLAYER.y - 110, 26, D.TIERS[state.tier].color, 70, 0.4);
    }
    if (slip.ready) updateHint();
    if (fromCommit) updateHud(true);
  }

  /* 速字 / Boss 整句：逐字或整词上屏后，按目标顺序校验汉字；Boss 标点同样校验 */
  function handleSpeedCommit(slip, committed) {
    if (!isAutoZh(slip) || slip.strikeQueued) return;
    var clean = String(committed || '').replace(/[^\u4e00-\u9fa5，。、；：？！“”‘’《》（）—…·]/g, '');
    var chars = slip.word.chars || [];
    var bossWord = slip.word.boss && slip.word.keys ? slip.word : null;
    var typed = slip.speedText || '';
    var wrong = false;
    var pos = slip.progress;
    for (var i = 0; i < clean.length; i++) {
      var ch = clean.charAt(i);
      if (/[\u4e00-\u9fa5]/.test(ch)) {
        if (typed.length >= chars.length) break;
        if (ch !== chars[typed.length]) {
          wrong = true;
          break;
        }
        typed += ch;
        if (bossWord && bossWord.charRanges[typed.length - 1]) {
          pos = Math.max(pos, bossWord.charRanges[typed.length - 1].end);
        }
      } else if (bossWord && PUNCT_KEYS[ch]) {
        var tk = bossWord.keys[pos];
        if (tk && tk.k === 'p' && tk.ch === PUNCT_KEYS[ch]) pos++;
      }
    }
    slip.speedText = typed;
    slip.committed = (slip.committed + clean).slice(-24);
    i = 0;
    if (bossWord) {
      // 上屏后以已确认汉字重新对齐；停在当前字中间则回到该字起点重输
      var nextRange = bossWord.charRanges[typed.length];
      if (nextRange && pos > nextRange.start && pos < nextRange.end) pos = nextRange.start;
      slip.progress = pos;
      if (pos < bossWord.keys.length) {
        slip.lettersDoneAt = 0;
        slip.ready = false;
        slip.commitOk = false;
      }
    } else {
      // 上屏后以已确认汉字重新对齐拼音，兼容未回传 compositionupdate 的输入法
      var offset = 0;
      for (i = 0; i < typed.length; i++) {
        offset += (slip.word.syllables[i] || '').replace(/[^a-zA-Z]/g, '').length;
      }
      slip.progress = offset;
      if (offset < slip.word.letters.length) {
        slip.lettersDoneAt = 0;
        slip.ready = false;
        slip.commitOk = false;
      }
    }

    // 输入法未回传逐字母事件时，也按已上屏汉字补发普通攻击
    bossSyncCharHits(slip);

    if (wrong) {
      // 选错候选字不推进；回到该字的拼音起点，可直接重新输入
      state.errors++;
      state.combo = 0;
      if (bossWord && bossWord.charRanges[typed.length]) {
        slip.progress = bossWord.charRanges[typed.length].start;
      }
      onWrongLetter(slip);
      showToast('候选字不对 · 请重输「' + chars[typed.length] + '」');
    } else if (bossWord ? (slip.progress >= bossWord.keys.length) : typed.length === chars.length) {
      slip.commitOk = true;
      queueSpeedStrike(slip);
    }
    // 上屏后的 input 回声不再重复判定
    state.lastKeyAt = performance.now();
    updateTier();
    updateSpeedBox();
    updateHud(true);
  }

  /* 速字模式：整词命中的延迟一帧结算，避免与输入法事件重入 */
  function queueSpeedStrike(slip) {
    if (!slip || slip.removed || slip.strikeQueued) return;
    slip.strikeQueued = true;
    state.pendingStrike = slip;
  }

  function speedStrike(slip) {
    if (!slip || slip.removed) return;
    if (isBossSlip(slip)) { bossStrike(slip); return; }
    state.recoil = 0.45;
    ring(slip.x, slip.y, 20, '#a8362b', 150, 0.45);
    SOUND.ready();
    fireHeavy(slip, { speed: true });
    removeSlip(slip);
    spawnWord();
    focusNext();
    updateSpeedBox();
    updateHint();
    updateHud(true);
  }

  /* ---------------- Boss 整句 ---------------- */
  /* 整句按字拆键：汉字拼音逐字母，中文标点按键盘对应键（，→ , 。→ . ；→ ; ：→ : ！→ ! ？→ ?） */
  function makeBossWord(item) {
    var text = String(item.t || '');
    var pyList = String(item.py || '').trim().split(/\s+/).filter(Boolean);
    var chars = [];
    var syllables = [];
    var tokens = [];
    var charRanges = [];
    var puncts = [];
    var pi = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (/[\u4e00-\u9fa5]/.test(ch)) {
        var py = String(pyList[pi++] || '').toLowerCase().replace(/[^a-z]/g, '');
        if (!py) py = 'a';
        var start = tokens.length;
        for (var k = 0; k < py.length; k++) tokens.push({ k: 'l', ch: py.charAt(k) });
        charRanges.push({ start: start, end: tokens.length });
        chars.push(ch);
        syllables.push(py);
        continue;
      }
      if (PUNCT_KEYS[ch]) {
        puncts.push({ token: tokens.length, key: PUNCT_KEYS[ch], glyph: ch });
        tokens.push({ k: 'p', ch: PUNCT_KEYS[ch] });
      }
    }
    var keyStr = '', letterOnly = '';
    for (var t = 0; t < tokens.length; t++) {
      keyStr += tokens[t].ch;
      if (tokens[t].k === 'l') letterOnly += tokens[t].ch;
    }
    return {
      text: item.t,
      display: item.t,
      chars: chars,
      syllables: syllables,
      charRanges: charRanges,
      puncts: puncts,
      keys: tokens,
      letters: keyStr,
      letterOnly: letterOnly,
      en: false,
      boss: true,
      commitNeeded: true,
      src: item.src || '',
      lv: item.lv || 1
    };
  }

  function bossSentenceList() {
    var lv = state.level;
    return (D.BOSS_SENTENCES && lv && lv.boss && D.BOSS_SENTENCES[lv.boss]) || [];
  }

  function spawnBoss() {
    var lv = state.level;
    if (!lv || !lv.boss) return null;
    var r = clamp(H * 0.076, 46, 66);
    var e = {
      id: state.nextId++, type: 'boss', x: W / 2, baseX: W / 2,
      y: H * 0.165, baseY: H * 0.165, wallY: TERRITORY_Y - 46,
      coreX: W / 2 + Math.min(W * 0.68, 880) / 2 + Math.max(20, W * 0.02),
      r: r, hp: lv.hp, maxHp: lv.hp, speed: 0,
      swayA: W * 0.03, swayF: 0.28, phase: rand(0, 6.28), angle: 0,
      flash: 0, dead: false, breach: 100, boss: true,
      rounds: 0, atkTimer: 2.4, coreStep: 0, coreMax: 6, coreY: H * 0.33,
      shotDmg: lv.id >= 16 ? 5 : 4, shotSpeed: lv.id >= 16 ? 150 : 132,
      shotGap: lv.id >= 16 ? 2.0 : 2.6, gapMin: lv.id >= 16 ? 1.5 : 1.8,
      twoAt: lv.id >= 16 ? 12 : 18, threeAt: lv.id >= 16 ? 20 : 99
    };
    state.enemies.push(e);
    state.boss = e;
    return e;
  }

  function newBossSlip() {
    var list = bossSentenceList();
    if (!list.length) return null;
    var slip = {
      id: state.nextId++, word: makeBossWord(list[0]), slot: 0,
      x: W / 2, y: H * 0.385, w: Math.min(W * 0.68, 880), h: clamp(H * 0.20, 144, 168),
      rot: 0, born: state.time, pop: 1, bob: 0, removed: false,
      boss: true, sentIndex: 0, progress: 0, committed: '', speedText: '',
      commitOk: false, ready: false, wasReady: false, lettersDoneAt: 0, hitsDone: 0,
      imeBase: 0, imeResults: null, imeRaw: '', usedIme: false,
      errFlash: 0, rotateAt: 0, strikeQueued: false
    };
    state.slips.push(slip);
    state.focus = slip;
    return slip;
  }

  function loadNextBossSentence(slip) {
    var list = bossSentenceList();
    if (!list.length) return;
    slip.sentIndex = (slip.sentIndex + 1) % list.length;
    slip.word = makeBossWord(list[slip.sentIndex]);
    slip.progress = 0;
    slip.committed = '';
    slip.speedText = '';
    slip.commitOk = false;
    slip.ready = false;
    slip.wasReady = false;
    slip.hitsDone = 0;
    slip.lettersDoneAt = 0;
    slip.imeBase = 0;
    slip.imeResults = null;
    slip.imeRaw = '';
    slip.usedIme = false;
    slip.errFlash = 0;
    slip.strikeQueued = false;
    slip.born = state.time;
    slip.pop = 1;
    slip.x = W / 2;
    slip.y = H * 0.385;
    slip.w = Math.min(W * 0.68, 880);
    slip.h = clamp(H * 0.20, 144, 168);
  }

  function bossStrike(slip) {
    var boss = state.boss;
    slip.strikeQueued = false;
    if (!boss || boss.dead) { loadNextBossSentence(slip); return; }
    var gm = profMul(wordGroup({ letters: slip.word.letterOnly || slip.word.letters }));
    // 逐字普通攻击已承担主要输出，终结技下调为补足一段，保持总输出与旧版接近
    var share = clamp(0.12 + (slip.word.letterOnly || '').length / 1500, 0.14, 0.22);
    var dmg = Math.max(1, Math.round(boss.maxHp * share * (0.9 + accuracyP() / 1000) * (0.82 + gm * 0.18)));
    state.bossCount++;
    // 终结技同时击退本源一阶
    boss.coreStep = Math.max(0, boss.coreStep - 1);
    // 墨爆扫清当前来袭墨弹
    for (var q = 0; q < state.bossShots.length; q++) {
      var qs = state.bossShots[q];
      if (!qs.dead) {
        qs.dead = true;
        inkBurst(qs.x, qs.y, 6, 0.7);
      }
    }
    state.bossShots = [];
    // 整句终结技回气：至多 8 点，不超过满血
    if (state.hp < 100) {
      var heal = Math.min(8, 100 - state.hp);
      state.hp += heal;
      addNumber(PLAYER.x, PLAYER.y - 190, '+' + heal, false, false, true);
      updateHud(true);
    }
    // 终结技：只打守将，大范围墨爆
    fireHeavy(slip, { ultimate: true, dmg: dmg, target: boss });
    var p = state.projectiles[state.projectiles.length - 1];
    if (p) p.ultimate = true;
    var b = state.bolts[state.bolts.length - 1];
    if (b) b.ultimate = true;
    state.flash = Math.max(state.flash, 0.72);
    state.charge = 1;
    showToast('整句已成 · 终结技 ×' + state.bossCount + ' · 本源后退');
    ring(slip.x, slip.y, 40, '#a8362b', 280, 0.6);
    loadNextBossSentence(slip);
    updateSpeedBox();
    updateHint();
    updateHud(true);
  }

  /* 一字一击：每打完一个汉字的拼音，落一次普通攻击，并拦截一发来袭墨弹 */
  function bossNormalStrike(slip) {
    var boss = state.boss;
    var target = boss && !boss.dead ? boss : nearestEnemy();
    var gm = profMul(wordGroup(slip.word));
    var base = boss && !boss.dead ? boss.maxHp : 600;
    var dmg = Math.max(1, Math.round(base * 0.011 * (0.9 + accuracyP() / 1000) * (0.82 + gm * 0.18)));
    var ang = target ? Math.atan2(target.y - playerTorso(), target.x - PLAYER.x) : -Math.PI / 2;
    state.projectiles.push({
      kind: 'light', weapon: state.weapon, x: PLAYER.x + 30, y: playerTorso(),
      tx: target ? target.x : PLAYER.x, ty: target ? target.y : 200,
      target: target, dmg: dmg,
      speed: 1180, t: 0, life: 1.4, trail: [], dead: false, angle: ang,
      pw: profSize(gm) * 0.82, bossChar: true
    });
    muzzleFlash(ang);
    state.recoil = 0.14;
    spawnMeaning(slip);
    interceptBossShot();
  }

  /* 按已完成字数补发普通攻击，避免输入法回传差异造成漏击或重复击 */
  function bossSyncCharHits(slip) {
    if (!isBossSlip(slip) || !slip.word.charRanges) return;
    var ranges = slip.word.charRanges;
    var done = slip.hitsDone || 0;
    while (done < ranges.length && slip.progress >= ranges[done].end && ranges[done].end > ranges[done].start) {
      bossNormalStrike(slip);
      done++;
    }
    slip.hitsDone = done;
  }

  /* 玩家每字攻击抵消最近的一发来袭墨弹；一发一字，连发弹幕需连续出字才能全部拦下 */
  function interceptBossShot() {
    var best = null, bestD = Infinity;
    for (var i = 0; i < state.bossShots.length; i++) {
      var s = state.bossShots[i];
      if (s.dead || s.blocked) continue;
      var d = (s.x - PLAYER.x) * (s.x - PLAYER.x) + (s.y - PLAYER.y) * (s.y - PLAYER.y);
      if (d < bestD) { bestD = d; best = s; }
    }
    if (!best) return;
    best.blocked = true;
    best.dead = true;
    state.shotsBlocked = (state.shotsBlocked || 0) + 1;
    inkBurst(best.x, best.y, 6, 0.7);
    ring(best.x, best.y, 7, '#a8362b', 70, 0.3);
    addNumber(best.x, best.y - 10, '挡', false, false, true);
  }

  /* Boss 弹幕推进 + 本源逼近 */
  function updateBoss(dt) {
    var boss = state.boss;
    if (!boss || boss.dead) {
      if (state.bossShots.length) {
        for (var z = 0; z < state.bossShots.length; z++) state.bossShots[z].dead = true;
        state.bossShots = [];
      }
      return;
    }
    if (state.phase !== 'playing') return;
    boss.atkTimer -= dt;
    var gap = Math.max(boss.gapMin || 1.35, boss.shotGap - boss.rounds * 0.02);
    if (boss.atkTimer <= 0) {
      boss.atkTimer = gap;
      boss.rounds++;
      fireBossShot(boss);
      // 每 4 轮攻击，本源向城墙推进一阶
      if (boss.rounds % 4 === 0 && boss.coreStep < boss.coreMax) {
        boss.coreStep++;
        showToast('本源逼近 · 第 ' + boss.coreStep + ' / ' + boss.coreMax + ' 阶');
        state.shake = Math.max(state.shake, 5);
        updateHint();
        if (boss.coreStep >= boss.coreMax) {
          loseBattle('core');
          return;
        }
      }
    }
    // 守将本体缓慢下压，形成持续推进的压迫感（受版面限制只前进一小段）
    var t = clamp(boss.rounds / 16, 0, 1);
    var ty = boss.baseY + (boss.wallY - boss.baseY) * 0.10 * t;
    boss.y += (ty - boss.y) * Math.min(1, dt * 1.2);
    // 间歇前扑：让守将始终有冲向角色的动作
    var lph = (state.time % 3.2) / 3.2;
    boss.lunge = lph < 0.18 ? Math.sin((lph / 0.18) * Math.PI) * 18 : 0;

    // 本源位置
    var c0 = boss.baseY + boss.r * 1.6;
    boss.coreY = c0 + (boss.wallY - c0) * (boss.coreStep / boss.coreMax);

    // 墨弹飞行
    for (var i = 0; i < state.bossShots.length; i++) {
      var s = state.bossShots[i];
      if (s.dead) continue;
      s.y += s.vy * dt;
      s.x += s.vx * dt;
      s.t += dt;
      if (s.y >= TERRITORY_Y - 40) {
        s.dead = true;
        hitPlayerByShot(s);
      }
    }
    state.bossShots = state.bossShots.filter(function (s) { return !s.dead; });
  }

  function fireBossShot(boss) {
    var n = 1;
    if (boss.rounds > boss.twoAt) n = 2;
    if (boss.rounds > boss.threeAt) n = 3;
    for (var i = 0; i < n; i++) {
      var spread = (i - (n - 1) / 2) * 46;
      var sx = boss.x + spread * 0.7;
      var sy = boss.y + boss.r * 0.7;
      var tx = PLAYER.x + rand(-50, 50);
      var ty = PLAYER.y - 40;
      var dx = tx - sx, dy = ty - sy;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var sp = boss.shotSpeed;
      state.bossShots.push({
        x: sx, y: sy, vx: (dx / len) * sp * 0.55, vy: (dy / len) * sp,
        t: 0, dead: false, blocked: false, dmg: boss.shotDmg, seed: rand(0, 6.28)
      });
    }
    state.shotsFired = (state.shotsFired || 0) + n;
    SOUND.light(state.weapon, 1, 0);
  }

  function hitPlayerByShot(s) {
    state.shotsHit = (state.shotsHit || 0) + 1;
    state.hp = Math.max(0, state.hp - s.dmg);
    state.shake = Math.max(state.shake, 9);
    state.hurtFlash = 1;
    state.combo = 0;
    SOUND.hurt();
    inkBurst(PLAYER.x + rand(-30, 30), PLAYER.y - 60, 14, 1.1);
    addNumber(PLAYER.x, PLAYER.y - 170, s.dmg, true, true);
    updateTier();
    updateHud(true);
    if (state.hp <= 0) loseBattle();
  }

  /* 英文重击后短暂展示最常用释义，随后墨迹消散 */
  function spawnMeaning(slip) {
    if (!slip || !slip.word || !slip.word.en) return;
    var table = D.EN_MEANINGS || {};
    var raw = slip.word.text;
    var bare = raw.replace(/[^a-zA-Z]/g, '');
    var mean = table[raw] || table[raw.toLowerCase()] || (bare ? table[bare.toLowerCase()] : '');
    if (!mean) return;
    state.meanings.push({
      text: mean,
      en: slip.word.text,
      x: slip.x,
      y: slip.y + 12,
      t: 0,
      life: 1.9,
      dissolved: false
    });
  }

  function updateSpeedBox() {
    var box = ui.speedBox || $('#speed-box');
    if (!box) return;
    var slip = state.focus;
    var show = state.speedMode && state.running && state.phase === 'playing' &&
      slip && !slip.removed && !slip.word.en && slip.word.commitNeeded && !slip.word.boss;
    box.hidden = !show;
    if (!show) return;
    var target = ui.speedTarget || $('#speed-target');
    var input = ui.speedInput || $('#speed-input');
    var mulEl = ui.speedMul || $('#speed-mul');
    var word = slip.word;
    var chars = word.chars;
    var syl = word.syllables || [];
    var cum = [0];
    var i;
    for (i = 0; i < chars.length; i++) {
      cum.push(cum[i] + (syl[i] || '').replace(/[^a-zA-Z]/g, '').length);
    }
    if (target) {
      var html = '';
      var committedCount = (slip.speedText || '').length;
      for (i = 0; i < chars.length; i++) {
        var typed = slip.usedIme
          ? i < committedCount || (i === committedCount && slip.progress >= cum[i + 1])
          : slip.progress >= cum[i + 1] && cum[i + 1] > cum[i];
        html += '<span class="' + (typed ? 'on' : '') + '">' + esc(chars[i]) + '</span>';
      }
      target.innerHTML = html;
    }
    if (input) {
      var py = '';
      var letters = word.letters;
      for (i = 0; i < letters.length; i++) {
        py += '<i class="' + (i < slip.progress ? 'on' : '') + '">' + letters.charAt(i) + '</i>';
      }
      input.innerHTML = '<span class="si-label">拼音</span>' + py +
        (slip.imeRaw ? '<span class="si-raw">· ' + esc(slip.imeRaw) + '</span>' : '');
    }
    if (mulEl) {
      var m = lengthMul(word);
      mulEl.textContent = m > 1 ? '长词 ×' + m : '';
    }
  }

  function tryHeavy() {
    if (state.phase !== 'playing') return;
    if (state.long) {
      showToast(state.ultCharge >= ULT_MAX ? '长文自动重击 · Enter 释放终极' : '长文自动重击 · 空格无需再按');
      return;
    }
    if (!state.focus) return;
    if (performance.now() < state.fireBlockUntil) return;
    var slip = state.focus;
    if (isBossSlip(slip)) {
      showToast('整句完成 · 自动释放终结技');
      return;
    }
    if (isSpeedZh(slip)) {
      showToast('速字模式 · 打完整词自动发出');
      return;
    }
    if (!slip.ready) {
      if (slip.progress >= slip.word.letters.length && slip.word.commitNeeded && !slip.commitOk) {
        showToast('请先选字上屏，再释放重击');
      } else {
        showToast('墨未饱：先敲完整词');
      }
      return;
    }
    fireHeavy(slip);
    removeSlip(slip);
    spawnWord();
    focusNext();
    updateHint();
    updateHud(true);
  }

  /* ================= 终极一击 =================
     每次正确字符输入 +1，满 30 解锁；Enter 释放并清零重蓄。
     空格仍是重击，长文模式同样可用 Enter 释放。 */
  function addUltCharge() {
    if (!state.running || state.phase !== 'playing') return;
    if (state.ultCharge >= ULT_MAX) return;
    state.ultCharge++;
    if (state.ultCharge === ULT_MAX) {
      SOUND.ready();
      showToast('终极已成 · 按 Enter 释放');
      ring(PLAYER.x, playerTorso(), 30, '#b9933f', 230, 0.7);
      addNumber(PLAYER.x, PLAYER.y - 246, '终', true, false, true);
    }
    if (ui.ultFill) updateUltGauge();
  }

  function tryUltimate() {
    if (state.phase !== 'playing' || state.paused) return;
    if (state.ultCharge < ULT_MAX) {
      SOUND.error();
      showToast('终极未成 · ' + state.ultCharge + ' / ' + ULT_MAX + ' · 正确输入蓄势');
      return;
    }
    state.ultCharge = 0;
    startUltimate();
    updateHud(true);
  }

  function startUltimate() {
    var w = state.weapon;
    var mul = damageMul();
    state.flash = 0.95;
    state.shake = Math.max(state.shake, 20);
    state.recoil = 0.55;
    state.charge = 0.9;
    SOUND.ultimate(w);
    ring(PLAYER.x, playerTorso(), 36, '#b9933f', 460, 0.9);
    ring(PLAYER.x, playerTorso(), 18, '#a8362b', 300, 0.7);
    inkBurst(PLAYER.x + 20, playerTorso(), 42, 2.6);
    addNumber(PLAYER.x, PLAYER.y - 258, '终极', true, false, true);
    stainAt(PLAYER.x + rand(-40, 40), PLAYER.y - rand(30, 120), rand(40, 64), '#17130f', 0.4);

    if (w === 'bow') { ultimateBow(mul); return; }
    if (w === 'sword') {
      state.ultFx = {
        type: 'sword', t: 0, dur: 1.45, y: PLAYER.y - 70,
        dmg: Math.max(1, Math.round(ATK * 5 * mul)), hits: {}
      };
      return;
    }
    if (w === 'staff') {
      state.ultFx = {
        type: 'staff', t: 0, dur: 1.25, radius: 40,
        maxR: Math.sqrt(W * W + H * H) + 80,
        dmg: Math.max(1, Math.round(ATK * 4.5 * mul)), hits: {}
      };
      return;
    }
    state.ultFx = {
      type: 'brush', t: 0, dur: 2.7, pass: 0, hits: {},
      dmg: Math.max(1, Math.round(ATK * 3.2 * mul)),
      trail: [], head: { x: -260, y: H * 0.46 }
    };
  }

  /* 弓 · 万箭齐发：先按敌人分配追踪箭，再补足整屏箭雨 */
  function ultimateBow(mul) {
    var dmg = Math.max(1, Math.round(ATK * 0.75 * mul));
    var list = state.enemies.filter(function (e) { return !e.dead; });
    var shots = 0;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      for (var k = 0; k < 6 && shots < 40; k++) {
        state.projectiles.push({
          kind: 'ultimate', weapon: 'bow',
          x: PLAYER.x + rand(-280, 280), y: PLAYER.y - rand(20, 130),
          tx: e.x + rand(-40, 40), ty: e.y + rand(-30, 30), target: e, dmg: dmg,
          speed: 1500, t: 0, life: 2.8, trail: [], dead: false,
          angle: Math.PI / 2, pw: 1.02
        });
        shots++;
      }
    }
    // 演出箭雨：无论敌人数目，补足 64 支向上散射，形成全屏万箭
    for (var j = shots; j < 64; j++) {
      state.projectiles.push({
        kind: 'ultimate', weapon: 'bow',
        x: PLAYER.x + rand(-320, 320), y: PLAYER.y - rand(0, 150),
        tx: rand(W * 0.04, W * 0.96), ty: rand(-90, H * 0.30), target: null, dmg: 0,
        speed: rand(1150, 1750), t: 0, life: rand(0.9, 1.6), trail: [], dead: false,
        angle: -Math.PI / 2, pw: rand(0.92, 1.08)
      });
    }
  }

  function updateUltimate(dt) {
    var fx = state.ultFx;
    if (!fx) return;
    fx.t += dt;
    var k = clamp(fx.t / fx.dur, 0, 1);

    if (fx.type === 'sword') {
      var se = k * k * (3 - 2 * k);
      fx.y = (PLAYER.y - 70) + (-300 - (PLAYER.y - 70)) * se;
      for (var i = 0; i < state.enemies.length; i++) {
        var e = state.enemies[i];
        if (e.dead || fx.hits[e.id]) continue;
        if (e.y <= fx.y + 92 && e.y >= fx.y - 92) {
          fx.hits[e.id] = 1;
          hitEnemy(e, fx.dmg, true);
          ring(e.x, e.y, 10, '#b9933f', 130, 0.4);
          stainAt(e.x, e.y, rand(20, 34), '#17130f', 0.4);
          for (var q = 0; q < 6; q++) {
            state.particles.push({
              x: e.x, y: e.y, vx: rand(-220, 220), vy: rand(-170, 60),
              r: rand(1.4, 3.4), life: rand(0.25, 0.5), maxLife: 0.5, gravity: 260,
              color: q % 3 === 0 ? '#d8b45c' : '#17130f', streak: true
            });
          }
        }
      }
    } else if (fx.type === 'staff') {
      var re = 1 - Math.pow(1 - k, 3);
      fx.radius = 40 + (fx.maxR - 40) * re;
      var cx = PLAYER.x, cy = playerTorso();
      // 灵环边缘的墨屑
      fx.puff = (fx.puff || 0) + dt;
      while (fx.puff > 0.04) {
        fx.puff -= 0.04;
        for (var pz = 0; pz < 2; pz++) {
          var pa = rand(0, Math.PI * 2);
          state.particles.push({
            x: cx + Math.cos(pa) * fx.radius, y: cy + Math.sin(pa) * fx.radius * 0.9,
            vx: Math.cos(pa) * rand(30, 90), vy: Math.sin(pa) * rand(20, 60) - 20,
            r: rand(1.2, 3), life: rand(0.25, 0.5), maxLife: 0.5, gravity: 30,
            color: pz === 0 ? '#2f4257' : '#17130f', streak: true
          });
        }
      }
      for (var s = 0; s < state.enemies.length; s++) {
        var es = state.enemies[s];
        if (es.dead || fx.hits[es.id]) continue;
        var ddx = es.x - cx, ddy = es.y - cy;
        if (Math.sqrt(ddx * ddx + ddy * ddy) <= fx.radius + es.r) {
          fx.hits[es.id] = 1;
          hitEnemy(es, fx.dmg, true);
          ring(es.x, es.y, 8, '#2f4257', 110, 0.35);
          stainAt(es.x, es.y, rand(18, 30), '#17130f', 0.35);
        }
      }
    } else if (fx.type === 'brush') {
      var u = clamp(fx.t / fx.dur, 0, 1);
      var pass = u < 0.5 ? 0 : 1;
      fx.pass = pass;
      var seg = pass === 0 ? u / 0.5 : (u - 0.5) / 0.5;
      var hx = pass === 0
        ? -280 + (W + 560) * seg
        : (W + 280) - (W + 560) * seg;
      var hy = H * 0.46 + Math.sin(seg * Math.PI * 3 + pass * 1.7) * H * 0.16;
      fx.head.x = hx;
      fx.head.y = hy;
      fx.trail.push({ x: hx, y: hy });
      if (fx.trail.length > 64) fx.trail.shift();
      // 龙首金屑
      fx.spark = (fx.spark || 0) + dt;
      while (fx.spark > 0.06) {
        fx.spark -= 0.06;
        state.particles.push({
          x: hx + rand(-30, 30), y: hy + rand(-22, 22),
          vx: rand(-60, 60), vy: rand(-70, 10), r: rand(1.2, 2.8),
          life: rand(0.3, 0.6), maxLife: 0.6, gravity: 80,
          color: Math.random() < 0.5 ? '#d8b45c' : '#17130f'
        });
      }
      for (var d = 0; d < state.enemies.length; d++) {
        var ed = state.enemies[d];
        if (ed.dead) continue;
        var key = ed.id + ':' + pass;
        if (fx.hits[key]) continue;
        var touched = Math.abs(ed.x - hx) < 86 + ed.r && Math.abs(ed.y - hy) < 86 + ed.r;
        if (!touched) {
          for (var tp = 0; tp < fx.trail.length; tp += 3) {
            var pt = fx.trail[tp];
            if (Math.abs(ed.x - pt.x) < 56 + ed.r && Math.abs(ed.y - pt.y) < 56 + ed.r) {
              touched = true;
              break;
            }
          }
        }
        if (touched) {
          fx.hits[key] = 1;
          hitEnemy(ed, fx.dmg, true);
          ring(ed.x, ed.y, 10, '#d8b45c', 140, 0.45);
          stainAt(ed.x, ed.y, rand(22, 36), '#17130f', 0.45);
        }
      }
    }

    if (fx.t >= fx.dur) {
      if (fx.type === 'sword') {
        ring(PLAYER.x, -40, 30, '#b9933f', 420, 0.7);
        state.flash = Math.max(state.flash, 0.5);
      } else if (fx.type === 'staff') {
        ring(PLAYER.x, playerTorso(), 60, '#2f4257', W * 0.8, 0.8);
        state.flash = Math.max(state.flash, 0.4);
      } else {
        inkBurst(fx.head.x, fx.head.y, 34, 2.2);
        for (var g = 0; g < 10; g++) {
          state.particles.push({
            x: fx.head.x + rand(-40, 40), y: fx.head.y + rand(-30, 30),
            vx: rand(-120, 120), vy: rand(-160, -20), r: rand(1.4, 3.6),
            life: rand(0.5, 1.0), maxLife: 1.0, gravity: 120,
            color: g % 3 === 0 ? '#d8b45c' : '#17130f'
          });
        }
      }
      state.ultFx = null;
    }
  }


  function fireLight(slip) {
    var target = nearestEnemy();
    var gm = slip ? profMul(wordGroup(slip.word)) : 1;
    var dmg = Math.max(1, Math.round(ATK * damageMul() * gm));
    if (target && target.type === 'boss') dmg = Math.max(1, Math.round(dmg * 0.04));
    var pw = profSize(gm);
    if (!target) {
      state.projectiles.push({
        kind: 'light', weapon: state.weapon, x: PLAYER.x + 30, y: playerTorso(),
        tx: PLAYER.x + rand(-90, 90), ty: 120, target: null, dmg: 0,
        speed: 980, t: 0, life: 0.6, trail: [], dead: false, angle: -Math.PI / 2, pw: pw
      });
      return;
    }
    var ang = Math.atan2(target.y - (playerTorso()), target.x - PLAYER.x);
    state.projectiles.push({
      kind: 'light', weapon: state.weapon, x: PLAYER.x + 30, y: playerTorso(),
      tx: target.x, ty: target.y, target: target, dmg: dmg,
      speed: state.weapon === 'staff' ? 720 : state.weapon === 'sword' ? 1100 : state.weapon === 'brush' ? 920 : 1000,
      t: 0, life: 1.6, trail: [], dead: false, angle: ang, pw: pw
    });
    muzzleFlash(ang);
  }

  function fireHeavy(slip, opts) {
    var target = (opts && opts.target) || nearestEnemy();
    var lenMul = lengthMul(slip && slip.word);
    var gm = slip ? profMul(wordGroup(slip.word)) : 1;
    var dmg = Math.max(1, Math.round(ATK * 3 * damageMul() * lenMul * gm));
    if (opts && opts.dmg) dmg = Math.max(1, Math.round(opts.dmg));
    var pw = profSize(gm);
    if (opts && opts.ultimate) pw *= 1.45;
    if (opts && opts.speed && slip && slip.word) {
      // 速字模式取消逐字母攻击，把整词的逐字母伤害凝聚进这一击
      dmg += Math.max(1, Math.round(ATK * damageMul() * slip.word.letters.length * gm));
    }
    state.flash = opts && opts.ultimate ? 0.62 : 0.38;
    state.shake = Math.max(state.shake, opts && opts.ultimate ? 16 : 9);
    if (opts && opts.long && !opts.ultimate) {
      state.flash = 0.16;
      state.shake = Math.max(state.shake, 4);
    }
    state.recoil = 0.5;
    state.charge = 0.6;
    SOUND.heavy(state.weapon);
    ring(PLAYER.x, playerTorso(), opts && opts.ultimate ? 60 : 30, '#17130f', opts && opts.ultimate ? 260 : 160, 0.45);
    inkBurst(PLAYER.x + 30, playerTorso(), opts && opts.ultimate ? 34 : 18, opts && opts.ultimate ? 2.1 : 1.3);
    if (lenMul > 1) {
      addNumber(PLAYER.x - rand(50, 90), PLAYER.y - 210, '×' + lenMul, true, false, true);
    }
    if (opts && opts.ultimate) {
      addNumber(PLAYER.x + 66, PLAYER.y - 246, '终', true, false, true);
    } else if (opts && opts.speed) {
      addNumber(PLAYER.x + 80, PLAYER.y - 236, '速', true, false, true);
    }
    if (slip) spawnMeaning(slip);
    if (state.weapon === 'staff') {
      state.bolts.push({
        t: 0, delay: opts && opts.ultimate ? 0.44 : chargeDelay(gm), struck: false, target: target,
        x: target ? target.x : PLAYER.x, y: target ? target.y : 300, dmg: dmg,
        seed: rand(0, 6.28), pow: opts && opts.ultimate ? 1.25 : gm
      });
    } else {
      state.projectiles.push({
        kind: 'heavy', weapon: state.weapon,
        x: PLAYER.x + 30, y: playerTorso(),
        tx: target ? target.x : PLAYER.x, ty: target ? target.y : 180,
        target: target, dmg: dmg,
        speed: state.weapon === 'bow' ? 780 : state.weapon === 'brush' ? 900 : 980,
        t: 0, life: 2.2, trail: [], dead: false,
        angle: target ? Math.atan2(target.y - (playerTorso()), target.x - PLAYER.x) : -Math.PI / 2,
        pw: pw
      });
    }
  }

  function nearestEnemy() {
    var best = null, bestD = Infinity;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.dead) continue;
      var dx = e.x - PLAYER.x;
      var dy = e.y - PLAYER.y;
      var d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  /* ================= 长文模式 ================= */
  var LONG_BATCH_CHARS = [0, 36, 46, 56, 66, 78];
  var LONG_HAN = /[\u4e00-\u9fa5]/;

  function longTextsByBand(band, src) {
    var list = src || window.LONG_TEXTS || [];
    var lo = band[0] || 1, hi = band[1] || lo;
    var res = [];
    for (var i = 0; i < list.length; i++) {
      var lv = list[i].lv || 1;
      if (lv >= lo && lv <= hi) res.push(i);
    }
    if (!res.length) {
      for (var j = 0; j < list.length; j++) res.push(j);
    }
    return shuffle(res);
  }

  function initLongMode(lv) {
    var article = !!lv.article;
    var band = lv.longBand || [1, 2];
    var src = article ? (window.ESSAYS || []) : (window.LONG_TEXTS || []);
    state.long = {
      article: article,
      band: band,
      queue: longTextsByBand(band, src),
      cur: null,
      entryPos: 0,
      batchNo: 0,
      batchSentences: 0,
      progress: 0,
      letters: '',
      tokens: [],
      words: [],
      wordIdx: 0,
      leftTokens: [],
      rightTokens: [],
      pages: [],
      pageIdx: 0,
      advanceAt: 0,
      errFlash: 0,
      imeRaw: ''
    };
    if (article) loadArticleEntry();
    else loadLongBatch();
    updateLongStrip();
  }

  function splitLongSentences(text) {
    var out = [], buf = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      buf += ch;
      if ('。！？!?'.indexOf(ch) !== -1) {
        while (i + 1 < text.length && '”’」』》）)'.indexOf(text.charAt(i + 1)) !== -1) {
          buf += text.charAt(++i);
        }
        out.push(buf);
        buf = '';
      }
    }
    if (buf.trim()) out.push(buf);
    return out;
  }

  function prepareLongEntry(entry) {
    var sents = splitLongSentences(entry.t || '');
    var py = entry.en ? [] : String(entry.py || '').trim().split(/\s+/);
    var hi = 0, offset = 0;
    var prepared = sents.map(function (t) {
      var count = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
      var letters = entry.en ? '' : py.slice(offset, offset + count).join('');
      var sn = { text: t, h0: offset, count: count, letters: letters };
      offset += count;
      hi += count;
      return sn;
    });
    if (!prepared.length) {
      prepared = [{ text: entry.t || '山', h0: 0, count: 1, letters: 'shan' }];
    }
    return { entry: entry, sentences: prepared, py: py, en: !!entry.en, chars: hi };
  }

  function nextLongEntry() {
    var L = state.long;
    var list = L.article ? (window.ESSAYS || []) : (window.LONG_TEXTS || []);
    if (!L.queue.length) L.queue = longTextsByBand(L.band, list);
    var idx = L.queue.pop();
    var entry = list[idx] || { t: '山重水复疑无路，柳暗花明又一村。', s: '《游山西村》', lv: 2, py: 'shan zhong shui fu yi wu lu liu an hua ming you yi cun' };
    L.entry = entry;
    L.cur = prepareLongEntry(entry);
    L.entryPos = 0;
  }

  function loadLongBatch() {
    var L = state.long;
    if (!L) return;
    if (!L.cur || L.entryPos >= L.cur.sentences.length) nextLongEntry();
    var cur = L.cur;
    var diff = clamp(cur.entry.lv || 1, 1, 5);
    var limit = LONG_BATCH_CHARS[diff];
    var maxS = 1 + Math.ceil(diff / 2);
    var batch = [], chars = 0;
    while (L.entryPos < cur.sentences.length && batch.length < maxS) {
      var sn = cur.sentences[L.entryPos];
      var c = cur.en ? sn.text.replace(/[^A-Za-z]/g, '').length : sn.count;
      if (batch.length && chars + c > limit) break;
      batch.push(sn);
      chars += c;
      L.entryPos++;
      if (chars >= limit) break;
    }
    L.batchSentenceStart = batch.length ? cur.sentences.indexOf(batch[0]) + 1 : 1;
    L.batchSentences = batch.length;
    L.batchNo++;
    buildLongTokens(batch);
    L.progress = 0;
    L.wordIdx = 0;
    L.advanceAt = 0;
    updateLongStrip();
  }

  function buildLongTokens(batch) {
    var L = state.long;
    var cur = L.cur;
    var letters = '';
    var tokens = [];
    var words = [];
    var curWord = null;

    function flushWord(sent) {
      if (curWord && curWord.letters) {
        curWord.end = letters.length;
        curWord.sent = !!sent;
        words.push(curWord);
        var lt = tokens[tokens.length - 1];
        if (lt) {
          lt.wEnd = true;
          if (sent) lt.sEnd = true;
        }
      } else if (sent && words.length) {
        words[words.length - 1].sent = true;
        var l2 = tokens[tokens.length - 1];
        if (l2) l2.sEnd = true;
      }
      curWord = null;
    }
    function openWord() {
      if (!curWord) curWord = { start: letters.length, letters: '', chars: [], en: cur.en };
    }
    function pushToken(tok) { tokens.push(tok); return tok; }

    for (var b = 0; b < batch.length; b++) {
      var sn = batch[b];
      var text = sn.text;
      var hi = sn.h0;
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        if (cur.en) {
          if (/[A-Za-z]/.test(ch)) {
            openWord();
            if (!curWord.chars.length) { /* 首字母 */ }
            var ls = letters.length;
            var low = ch.toLowerCase();
            letters += low;
            var tok = pushToken({ ch: ch, ls: ls, le: letters.length, letter: true, py: '' });
            if (curWord.chars.length === 0) tok.wStart = true;
            curWord.letters += low;
            curWord.chars.push(ch);
          } else if (ch === "'" || ch === '’') {
            pushToken({ ch: ch, ls: letters.length, le: letters.length });
          } else {
            flushWord(false);
            var p = pushToken({ ch: ch, ls: letters.length, le: letters.length });
            if ('。！？!?'.indexOf(ch) !== -1) {
              if (words.length) words[words.length - 1].sent = true;
              var prev = tokens[tokens.length - 2];
              if (prev) prev.sEnd = true;
              p.sEnd = true;
            }
          }
        } else if (LONG_HAN.test(ch)) {
          openWord();
          var py = (cur.py[hi] || 'yi').replace(/[^a-zA-Z]/g, '').toLowerCase() || 'yi';
          hi++;
          var st = letters.length;
          letters += py;
          pushToken({ ch: ch, py: py, ls: st, le: letters.length, ci: hi - 1 });
          curWord.letters += py;
          curWord.chars.push(ch);
          if (curWord.chars.length >= 2) flushWord(false);
        } else {
          if ('，、；：,;:'.indexOf(ch) !== -1) {
            flushWord(false);
            pushToken({ ch: ch, ls: letters.length, le: letters.length });
          } else if ('。！？!?'.indexOf(ch) !== -1) {
            flushWord(true);
            var pt = pushToken({ ch: ch, ls: letters.length, le: letters.length });
            pt.sEnd = true;
            var pv = tokens[tokens.length - 2];
            if (pv) pv.sEnd = true;
          } else {
            pushToken({ ch: ch, ls: letters.length, le: letters.length });
          }
        }
      }
      flushWord(true);
    }
    flushWord(true);

    L.letters = letters;
    L.tokens = tokens;
    L.words = words;

    // 分成左右两屏，避免在英文单词中间切开
    var total = tokens.length;
    var half = Math.ceil(total / 2);
    var cut = half;
    for (var k = Math.min(half, total - 1); k < total; k++) {
      if (!tokens[k].letter || tokens[k].wStart) { cut = k; break; }
    }
    if (cut <= 0 || cut >= total) cut = Math.max(1, Math.floor(total / 2));
    L.leftTokens = tokens.slice(0, cut);
    L.rightTokens = tokens.slice(cut);
  }

  /* ---- 整篇长文：大区块、整块翻页 ---- */
  function articleGeometry() {
    var bw = Math.round(clamp(W * 0.30, 260, 480));
    var bh = Math.round(clamp(H * 0.34, 196, 320));
    var top = Math.round(H * 0.455);
    var lx = Math.round(W * 0.092);
    var rx = W - lx - bw;
    var cfs = clamp(Math.round(W / 86), 14, 17);
    var pad = 12, headH = 24, footH = 26;
    var lineH = Math.round(cfs * 1.5);
    var maxLines = Math.max(3, Math.floor((bh - headH - footH - 8) / lineH));
    return {
      bw: bw, bh: bh, top: top, bottom: top + bh,
      lx: lx, rx: rx, cfs: cfs, pad: pad,
      headH: headH, footH: footH, lineH: lineH,
      maxW: bw - pad * 2, maxLines: maxLines
    };
  }

  function paginateArticle() {
    var L = state.long;
    if (!L || !L.tokens || !L.tokens.length) { if (L) L.pages = []; return; }
    var g = articleGeometry();
    var tokens = L.tokens;
    var pages = [];
    var s = 0, guard = 0;
    while (s < tokens.length && guard++ < 600) {
      var lines = layoutLongLines(tokens.slice(s), g.maxW, g.cfs);
      var take = Math.min(lines.length, g.maxLines * 2);
      var count = 0;
      for (var i = 0; i < take; i++) count += lines[i].length;
      var end = s + count;
      // 不在词中间翻页：回退到上一个词末
      while (end > s + 1) {
        var tk = tokens[end - 1];
        if (tk.wEnd || tk.sEnd || !tk.letter) break;
        end--;
      }
      if (end <= s) end = s + count;
      var pageTokens = tokens.slice(s, end);
      var pl = layoutLongLines(pageTokens, g.maxW, g.cfs);
      // 左右两栏尽量均分，避免一侧过空
      var leftCount = Math.min(g.maxLines, Math.ceil(pl.length / 2));
      pages.push({
        left: pl.slice(0, leftCount),
        right: pl.slice(leftCount),
        startTok: s,
        endTok: end,
        startLetter: pageTokens.length ? pageTokens[0].ls : 0,
        endLetter: pageTokens.length ? pageTokens[pageTokens.length - 1].le : 0
      });
      s = end;
    }
    L.pages = pages;
    L.pageIdx = clamp(L.pageIdx || 0, 0, Math.max(0, pages.length - 1));
  }

  function repaginateArticle() {
    var L = state.long;
    if (!L || !L.article || !L.tokens || !L.tokens.length) return;
    paginateArticle();
    var idx = 0;
    for (var i = 0; i < L.pages.length; i++) {
      idx = i;
      if (L.progress < L.pages[i].endLetter) break;
    }
    L.pageIdx = idx;
  }

  function loadArticleEntry() {
    var L = state.long;
    if (!L) return;
    nextLongEntry();
    var cur = L.cur;
    buildLongTokens(cur.sentences);
    L.entryPos = cur.sentences.length;
    L.batchSentences = cur.sentences.length;
    L.batchNo = 1;
    L.progress = 0;
    L.wordIdx = 0;
    L.advanceAt = 0;
    L.pageIdx = 0;
    paginateArticle();
    updateLongStrip();
  }

  function advanceArticlePage() {
    var L = state.long;
    if (!L) return;
    if (L.pageIdx < L.pages.length - 1) {
      L.pageIdx++;
      L.advanceAt = 0;
      showToast('整块翻页 · 第 ' + (L.pageIdx + 1) + ' / ' + L.pages.length + ' 页');
    } else {
      loadArticleEntry();
      showToast('本篇已成 · 换下一篇');
    }
    updateLongStrip();
  }

  function articlePageEnd() {
    var L = state.long;
    var pg = L && L.pages && L.pages[L.pageIdx];
    return pg ? pg.endLetter : 0;
  }

  function articleCurrentWord(L) {
    if (!L || !L.words) return null;
    for (var i = 0; i < L.words.length; i++) {
      if (L.progress < L.words[i].end) return L.words[i];
    }
    return null;
  }

  function drawArticleBlocks() {
    var L = state.long;
    var pg = L && L.pages && L.pages[L.pageIdx];
    if (!pg) return;
    var g = articleGeometry();
    drawArticleBlock(L, pg, g, 'left');
    drawArticleBlock(L, pg, g, 'right');
  }

  function drawArticleWordHint(L, word, g, w, h) {
    var c = ctx;
    var py = word.letters || '';
    var txt = (word.chars || []).join('');
    var cf = Math.round(g.cfs * 0.82);
    var pf = Math.round(g.cfs * 0.80);
    c.font = '700 ' + cf + 'px ' + CN_FONT;
    var tw = c.measureText(txt).width;
    c.font = pf + 'px ' + CN_FONT;
    var pw = 0;
    for (var i = 0; i < py.length; i++) pw += c.measureText(py.charAt(i)).width;
    var chipW = Math.round(tw + pw + 22);
    var chipH = Math.round(g.cfs * 1.36);
    var bx = w - g.pad - chipW;
    var by = h - g.footH + (g.footH - chipH) / 2 - 1;
    c.fillStyle = 'rgba(168,54,43,0.09)';
    roundRect(c, bx, by, chipW, chipH, 3);
    c.fill();
    c.strokeStyle = 'rgba(168,54,43,0.22)';
    c.lineWidth = 1;
    roundRect(c, bx, by, chipW, chipH, 3);
    c.stroke();
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.font = '700 ' + cf + 'px ' + CN_FONT;
    c.fillStyle = '#17130f';
    c.fillText(txt, bx + 6, by + chipH / 2);
    var lx = bx + 10 + tw;
    c.font = pf + 'px ' + CN_FONT;
    for (var k = 0; k < py.length; k++) {
      var on = (word.start + k) < L.progress;
      c.fillStyle = on ? 'rgba(168,54,43,0.9)' : 'rgba(23,19,15,0.42)';
      var ch = py.charAt(k);
      c.fillText(ch, lx, by + chipH / 2);
      lx += c.measureText(ch).width;
    }
  }

  function drawArticleBlock(L, pg, g, side) {
    var c = ctx;
    var x = side === 'left' ? g.lx : g.rx;
    var y = g.top;
    var w = g.bw;
    var h = g.bh;
    var lines = side === 'left' ? pg.left : pg.right;
    var word = articleCurrentWord(L);

    c.save();
    c.translate(x, y);

    // 纸块
    c.shadowColor = 'rgba(30,25,18,0.30)';
    c.shadowBlur = 22;
    c.shadowOffsetY = 7;
    roundRect(c, 0, 0, w, h, 7);
    var grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(251,246,233,0.94)');
    grd.addColorStop(0.55, 'rgba(245,237,220,0.93)');
    grd.addColorStop(1, 'rgba(235,224,203,0.92)');
    c.fillStyle = grd;
    c.fill();
    c.shadowColor = 'transparent';
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;
    c.strokeStyle = 'rgba(23,19,15,0.24)';
    c.lineWidth = 1.2;
    c.stroke();
    c.strokeStyle = 'rgba(168,54,43,0.15)';
    c.lineWidth = 1;
    roundRect(c, 5, 5, w - 10, h - 10, 5);
    c.stroke();
    if (L.errFlash > 0) {
      c.fillStyle = 'rgba(120,44,32,' + (L.errFlash * 0.09) + ')';
      roundRect(c, 0, 0, w, h, 7);
      c.fill();
    }

    // 卷首
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillStyle = 'rgba(168,54,43,0.9)';
    c.fillRect(g.pad, 8, 13, 13);
    c.fillStyle = 'rgba(247,240,227,0.96)';
    c.font = '700 9px ' + CN_FONT;
    c.textAlign = 'center';
    c.fillText(side === 'left' ? '篇' : '页', g.pad + 6.5, 15);
    c.textAlign = 'left';
    c.fillStyle = 'rgba(23,19,15,0.62)';
    c.font = '700 10px ' + CN_FONT;
    var title;
    if (side === 'left') {
      title = L.entry ? L.entry.s : '整篇';
    } else {
      title = '第 ' + (L.pageIdx + 1) + ' / ' + Math.max(1, L.pages.length) + ' 页 · 难度 ' + ((L.entry && L.entry.lv) || 1);
    }
    c.fillText(title, g.pad + 19, 15);

    // 正文：左对齐连续阅读
    var bodyTop = g.headH + 8 + g.lineH / 2;
    var hasCur = false;
    for (var li = 0; li < lines.length; li++) {
      var row = lines[li];
      var cx = g.pad;
      var ry = bodyTop + li * g.lineH;
      for (var j = 0; j < row.length; j++) {
        var t = row[j];
        var tw = longTokW(t, g.cfs);
        var mx = cx + tw / 2;
        if (t.ch === ' ') { cx += tw; continue; }
        var isLetter = t.letter;
        var typed = t.le > t.ls && t.le <= L.progress;
        var current = t.le > t.ls && t.ls <= L.progress && L.progress < t.le;
        var inWord = word && t.le > t.ls && t.ls >= word.start && t.le <= word.end;
        if (inWord) {
          c.fillStyle = 'rgba(168,54,43,0.10)';
          roundRect(c, mx - g.cfs * 0.62, ry - g.cfs * 0.64, g.cfs * 1.24, g.cfs * 1.30, 3);
          c.fill();
        }
        if (t.le === t.ls && '，、；：。！？,;:.!?'.indexOf(t.ch) !== -1) {
          c.font = Math.round(g.cfs * 0.66) + 'px ' + CN_FONT;
          c.fillStyle = 'rgba(23,19,15,0.26)';
          c.textAlign = 'center';
          c.fillText(t.ch, mx, ry + g.cfs * 0.16);
          cx += tw;
          continue;
        }
        c.font = (isLetter ? '600 ' : '700 ') + Math.round(g.cfs) + 'px ' + (isLetter ? 'Georgia, "Times New Roman", serif' : CN_FONT);
        c.textAlign = 'center';
        c.fillStyle = current ? '#a8362b' : typed ? 'rgba(23,19,15,0.28)' : 'rgba(23,19,15,0.88)';
        c.fillText(t.ch, mx, isLetter ? ry + g.cfs * 0.04 : ry);
        if (current) {
          hasCur = true;
          c.strokeStyle = 'rgba(168,54,43,0.6)';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(mx - g.cfs * 0.34, ry + g.cfs * 0.56);
          c.lineTo(mx + g.cfs * 0.34, ry + g.cfs * 0.56);
          c.stroke();
        }
        cx += tw;
      }
    }

    // 卷尾
    c.textAlign = 'left';
    c.font = '9px ' + CN_FONT;
    c.fillStyle = 'rgba(23,19,15,0.34)';
    var footY = h - 9;
    var pageTotal = pg.endLetter - pg.startLetter;
    var pageDone = clamp(L.progress - pg.startLetter, 0, pageTotal);
    if (side === 'left') {
      c.fillText('输完本页 · 整块翻页', g.pad, footY);
    } else {
      c.fillText('本页 ' + pageDone + ' / ' + pageTotal + ' 字母', g.pad, footY);
    }
    if (hasCur && word) drawArticleWordHint(L, word, g, w, h);

    c.restore();
  }

  function longLettersTyped() {
    var L = state.long;
    return L ? L.progress : 0;
  }

  function handleLongKey(ch) {
    var L = state.long;
    if (!L || L.advanceAt) return;
    state.lastKeyAt = performance.now();
    var expect = L.letters.charAt(L.progress);
    if (!expect) return;
    var ok = ch.toLowerCase() === expect;
    state.total++;
    noteKeyStat(expect, ch, ok);
    if (!ok) {
      state.errors++;
      state.combo = 0;
      L.errFlash = 1;
      SOUND.error();
      updateTier();
      updateHud(true);
      return;
    }
    state.correct++;
    state.combo++;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    L.progress++;
    addUltCharge();
    SOUND.light(state.weapon, state.tier, state.combo);
    state.recoil = 0.12;
    for (var i = 0; i < 2; i++) {
      state.particles.push({
        x: PLAYER.x + rand(-70, 70), y: H * 0.36 + rand(-20, 20),
        vx: rand(-14, 14), vy: rand(-26, -6), r: rand(1, 2.2),
        life: rand(0.18, 0.42), maxLife: 0.42, gravity: 60, color: '#a8362b'
      });
    }
    while (L.wordIdx < L.words.length && L.words[L.wordIdx].end === L.progress) {
      longStrike(L.words[L.wordIdx]);
      L.wordIdx++;
    }
    if (L.article) {
      var pgEnd = articlePageEnd();
      if (pgEnd && L.progress >= pgEnd) {
        L.advanceAt = state.time + 0.6;
        showToast('本页已成 · 整块翻页');
      }
    } else if (L.progress >= L.letters.length) {
      L.advanceAt = state.time + 0.6;
      showToast('本批已成 · 换卷');
    }
    updateTier();
    noteAccuracy();
    updateHud(true);
    updateLongStrip();
  }

  function longStrike(word) {
    var L = state.long;
    var letters = word.letters || 'x';
    var gm = profMul(wordGroup({ letters: letters }));
    var lenMul = lengthMul({ letters: letters });
    var base = Math.round(ATK * 3 * damageMul() * lenMul * gm);
    var pseudo = {
      x: PLAYER.x,
      y: H * 0.36,
      word: { letters: letters, text: (word.chars || []).join(''), en: !!(L && L.en) }
    };
    if (word.sent) {
      var main = nearestEnemy();
      fireHeavy(pseudo, { ultimate: true, target: main, dmg: Math.round(base * 2.1) });
      state.enemies.forEach(function (e) {
        if (!e.dead && e !== main) hitEnemy(e, Math.round(base * 0.7), true);
      });
      state.shake = Math.max(state.shake, 13);
    } else {
      fireHeavy(pseudo, { target: nearestEnemy(), dmg: base, long: true });
    }
  }

  function handleLongComposition(raw) {
    var L = state.long;
    if (!L || L.advanceAt) return;
    var letters = (raw || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
    L.imeRaw = raw || '';
    L.imeLetters = letters;
    // 只处理新增加的字母；退格时按字母回退已记录的进度
    var applied = L.imeApplied || 0;
    if (letters.length < applied) {
      var back = applied - letters.length;
      L.progress = Math.max(0, L.progress - back);
      state.total = Math.max(0, state.total - back);
      L.wordIdx = 0;
      while (L.wordIdx < L.words.length && L.words[L.wordIdx].end <= L.progress) L.wordIdx++;
      updateLongStrip();
      updateHud(true);
    }
    for (var i = applied; i < letters.length; i++) {
      if (L.advanceAt) break;
      handleLongKey(letters.charAt(i));
    }
    L.imeApplied = letters.length;
  }

  function updateLong(dt) {
    var L = state.long;
    if (!L) return;
    if (L.errFlash > 0) L.errFlash = Math.max(0, L.errFlash - dt * 2.6);
    if (L.advanceAt && state.time >= L.advanceAt) {
      if (L.article) {
        advanceArticlePage();
      } else {
        loadLongBatch();
        if (ui.longStrip) ui.longStrip.hidden = false;
      }
    }
  }

  function updateLongStrip() {
    var strip = ui.longStrip;
    if (!strip) return;
    var L = state.long;
    var show = !!(L && state.running && state.phase === 'playing');
    // 整篇模式不设底部词条，避免视线离开文本块
    strip.hidden = !show || !!(L && L.article);
    if (!show || (L && L.article)) return;
    if (ui.lsTitle) ui.lsTitle.textContent = L.entry ? L.entry.s : '长文';
    if (ui.lsBatch) {
      ui.lsBatch.textContent = L.advanceAt ? '换卷中…' : ('第 ' + L.batchNo + ' 批 · 共 ' + L.batchSentences + ' 句');
    }
    var word = null;
    for (var i = 0; i < L.words.length; i++) {
      if (L.progress < L.words[i].end) { word = L.words[i]; break; }
    }
    if (ui.lsWord) ui.lsWord.textContent = word ? (word.chars || []).join('') : '——';
    if (ui.lsPy) {
      var html = '';
      if (word && word.letters) {
        for (var k = 0; k < word.letters.length; k++) {
          var on = (word.start + k) < L.progress ? ' class="on"' : '';
          html += '<i' + on + '>' + word.letters.charAt(k) + '</i>';
        }
      }
      ui.lsPy.innerHTML = html;
    }
  }

  /* ================= 词帖 ================= */
  var SLOTS = [
    { x: 300, y: 246 },
    { x: 980, y: 240 },
    { x: 640, y: 286 }
  ];

  function wordFontSize(len) {
    var f = clamp(H / 800, 1, 1.3);
    var base = 19;
    if (len <= 4) base = 40;
    else if (len <= 6) base = 34;
    else if (len <= 9) base = 29;
    else if (len <= 12) base = 25;
    else if (len <= 15) base = 22;
    return Math.round(base * f);
  }

  function pickWord(exclude) {
    var candidates = wordPool.filter(function (w) {
      return !state.slips.some(function (sl) {
        return sl !== exclude && !sl.removed && sl.word.text === w.text;
      });
    });
    if (!candidates.length) candidates = wordPool;
    // 训练处方：约一半词帖偏向破绽键所在的词
    var rx = state.prescription;
    if (rx && rx.keys && rx.keys.length && Math.random() < 0.5) {
      var biased = candidates.filter(function (w) {
        return rx.keys.some(function (k) { return w.letters.indexOf(k) !== -1; });
      });
      if (biased.length) candidates = biased;
    }
    return pick(candidates);
  }

  function applyWord(slip, word) {
    var fs = wordFontSize(word.letters.length);
    var width = word.en
      ? Math.max(190, word.letters.length * fs * 0.62 + 96)
      : Math.max(210, word.chars.length * 68 + 96);
    slip.word = word;
    slip.w = Math.min(width, 540);
    slip.h = word.en ? 98 : 112;
    slip.progress = 0;
    slip.committed = '';
    slip.speedText = '';
    slip.commitOk = false;
    slip.ready = false;
    slip.wasReady = false;
    slip.lettersDoneAt = 0;
    slip.imeBase = 0;
    slip.imeResults = null;
    slip.imeRaw = '';
    slip.usedIme = false;
    slip.errFlash = 0;
    var lv = state.level;
    slip.rotateAt = lv && lv.rotateEvery ? state.time + lv.rotateEvery : 0;
  }

  function spawnWord(silent) {
    if (state.level && (state.level.boss || state.level.long)) return;
    var limit = (state.level && state.level.slips) || 3;
    var alive = state.slips.filter(function (s) { return !s.removed; }).length;
    if (alive >= limit) return;
    var free = [];
    SLOTS.forEach(function (s, i) {
      var used = state.slips.some(function (sl) { return sl.slot === i && !sl.removed; });
      if (!used) free.push(i);
    });
    if (!free.length) return;
    var slotIndex = pick(free);
    var slot = SLOTS[slotIndex];
    var slip = {
      id: state.nextId++,
      word: null,
      slot: slotIndex,
      x: slot.x,
      y: slot.y,
      w: 0,
      h: 0,
      rot: rand(-1.2, 1.2),
      born: state.time,
      pop: silent ? 1 : 0,
      bob: rand(0, Math.PI * 2),
      removed: false
    };
    applyWord(slip, pickWord(null));
    state.slips.push(slip);
    if (!state.focus) state.focus = slip;
  }

  /* 词帖翻换：只翻换未被玩家动过的非焦点词帖，制造切换压力 */
  function rotateSlip(slip) {
    if (!slip || slip.removed || slip.progress > 0) return;
    applyWord(slip, pickWord(slip));
    slip.born = state.time;
    slip.pop = 1;
    slip.rot = rand(-1.2, 1.2);
    if (state.focus === slip) {
      state.imeActive = false;
      state.imeLen = 0;
    }
  }

  function focusNext(force) {
    var alive = state.slips.filter(function (s) { return !s.removed; });
    if (!alive.length) { state.focus = null; return; }
    alive.sort(function (a, b) { return a.born - b.born; });
    var next = alive[0];
    if (!force && state.focus && !state.focus.removed && state.focus !== next) {
      // 保留刚完成后的下一张
    }
    if (state.focus !== next) {
      state.focus = next;
      state.imeActive = false;
      state.imeLen = 0;
      if (!force) SOUND.flip();
    }
    updateHint();
  }

  function removeSlip(slip) {
    slip.removed = true;
    var idx = state.slips.indexOf(slip);
    if (idx >= 0) state.slips.splice(idx, 1);
    if (state.focus === slip) state.focus = null;
  }

  function showToast(text) {
    if (!ui.toast) return;
    ui.toast.textContent = text;
    ui.toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () {
      if (ui.toast) ui.toast.classList.remove('show');
    }, 1300);
  }

  /* ================= 主循环与逻辑 ================= */
  function loop(ts) {
    if (!state.running) return;
    var dt = (ts - state.lastTs) / 1000;
    state.lastTs = ts;
    if (!isFinite(dt) || dt <= 0) dt = 0.016;
    dt = Math.min(0.05, dt);
    if (!state.paused && state.phase !== 'won' && state.phase !== 'lost') update(dt);
    render(dt);
    state.raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    state.time += dt;
    state.shake *= Math.pow(0.02, dt);
    if (state.shake < 0.05) state.shake = 0;
    state.flash = Math.max(0, state.flash - dt * 2.6);
    state.hurtFlash = Math.max(0, state.hurtFlash - dt * 1.6);
    state.recoil = Math.max(0, state.recoil - dt * 3.4);
    state.charge = Math.max(0, state.charge - dt * 2.2);
    state.readyPulse = Math.max(0, state.readyPulse - dt * 2.2);

    var lv = state.level;
    if (!lv) return;

    // 限时：超时未破境即判负
    if (lv.limit && state.time >= lv.limit) {
      loseBattle('time');
      return;
    }

    if (state.pendingStrike) {
      var ps = state.pendingStrike;
      state.pendingStrike = null;
      if (!ps.removed) speedStrike(ps);
    }

    if (!lv.boss && !(state.drill && state.drill.stage === 'teach')) {
      state.spawnTimer -= dt;
      var alive = 0;
      for (var i = 0; i < state.enemies.length; i++) if (!state.enemies[i].dead) alive++;
      if (state.spawnTimer <= 0 && state.time > 1.3 && alive < (lv.maxAlive || 8)) {
        spawnEnemy();
        state.spawnTimer = Math.max(0.85, lv.spawn * rand(0.86, 1.16) * (1 - Math.min(0.16, state.time * 0.0022)));
      }
    }

    updateEnemies(dt);
    updateBoss(dt);
    updateProjectiles(dt);
    updateUltimate(dt);
    updateBolts(dt);
    updateEffects(dt);
    updateSlips(dt);
    updateLong(dt);

    state.enemies = state.enemies.filter(function (e) { return !e.dead; });

    // 墨迹缓慢淡去
    if (stainCtx && (state.time * 60 | 0) % 2 === 0) {
      stainCtx.save();
      stainCtx.setTransform(1, 0, 0, 1, 0, 0);
      stainCtx.globalCompositeOperation = 'destination-out';
      stainCtx.fillStyle = 'rgba(0,0,0,0.0025)';
      stainCtx.fillRect(0, 0, stainCanvas.width, stainCanvas.height);
      stainCtx.restore();
    }
  }

  function spawnEnemy() {
    var lv = state.level;
    var mix = lv.mix || { crow: 0.3, wolf: 0.5, brute: 0.2 };
    var roll = Math.random();
    var type = 'wolf';
    if (roll < (mix.brute || 0)) type = 'brute';
    else if (roll > 1 - (mix.crow || 0)) type = 'crow';

    var factor = type === 'crow' ? 0.66 : type === 'brute' ? 2.35 : 1;
    var speedFactor = type === 'crow' ? 1.5 : type === 'brute' ? 0.68 : 1;
    var ss = clamp(H / 800, 0.9, 1.5);
    var radius = (type === 'crow' ? 23 : type === 'brute' ? 46 : 32) * ss;
    var hp = Math.round(lv.hp * factor);
    var x = rand(W * 0.12, W * 0.88);
    state.enemies.push({
      id: state.nextId++,
      type: type,
      x: x,
      baseX: x,
      y: -radius - 26 * ss,
      r: radius,
      hp: hp,
      maxHp: hp,
      speed: lv.speed * speedFactor * ss * rand(0.92, 1.1),
      swayA: rand(8, type === 'brute' ? 14 : 30) * ss,
      swayF: rand(0.45, 1.0),
      phase: rand(0, Math.PI * 2),
      angle: 0,
      flash: 0,
      breach: Math.round(lv.breach * (type === 'crow' ? 0.75 : type === 'brute' ? 1.7 : 1)),
      dead: false,
      seed: Math.random() * 1000
    });
    state.spawnCount++;
  }

  function updateEnemies(dt) {
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.dead) continue;
      if (e.type === 'dummy') {
        if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 5);
        continue;
      }
      e.y += e.speed * dt;
      e.x = e.baseX + Math.sin(state.time * e.swayF + e.phase) * e.swayA;
      e.angle = Math.sin(state.time * e.swayF + e.phase) * 0.09;
      if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 5);
      if (e.y > TERRITORY_Y - e.r * 0.2) breachEnemy(e);
    }
  }

  function breachEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    state.killsSinceHit = 0;
    state.hp = Math.max(0, state.hp - e.breach);
    state.shake = Math.max(state.shake, 13);
    state.hurtFlash = 1;
    state.combo = 0;
    SOUND.hurt();
    inkBurst(PLAYER.x, PLAYER.y - 40, 26, 1.7);
    stainAt(PLAYER.x + rand(-40, 40), PLAYER.y - rand(10, 90), rand(18, 34), '#7d2119', 0.35);
    addNumber(PLAYER.x, PLAYER.y - 176, e.breach, true, true);
    updateTier();
    updateHud(true);
    if (state.hp <= 0) loseBattle();
  }

  function updateProjectiles(dt) {
    for (var i = 0; i < state.projectiles.length; i++) {
      var p = state.projectiles[i];
      if (p.dead) continue;
      p.t += dt;
      if (p.target && !p.target.dead) {
        p.tx = p.target.x;
        p.ty = p.target.y;
      } else if (p.target) {
        p.target = nearestEnemyTo(p.x, p.y);
        if (p.target) { p.tx = p.target.x; p.ty = p.target.y; }
      }
      var dx = p.tx - p.x, dy = p.ty - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      p.angle = Math.atan2(dy, dx);
      var step = p.speed * dt;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 12) p.trail.shift();
      if (dist <= step + 16) {
        p.x = p.tx; p.y = p.ty;
        hitProjectile(p);
        p.dead = true;
      } else {
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
      }
      if (p.t > p.life) p.dead = true;
    }
    state.projectiles = state.projectiles.filter(function (p) { return !p.dead; });
  }

  function nearestEnemyTo(x, y) {
    var best = null, bd = Infinity;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.dead) continue;
      var d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function hitProjectile(p) {
    if (!p.dmg || !p.target || p.target.dead) {
      if (p.kind === 'heavy' || p.kind === 'ultimate') {
        inkBurst(p.x, p.y, 18, 1.4);
        ring(p.x, p.y, 10, '#17130f', 90, 0.3);
        state.shake = Math.max(state.shake, 4);
      } else {
        inkBurst(p.x, p.y, 5, 0.7);
      }
      return;
    }
    var e = p.target;
    var heavy = p.kind === 'heavy' || p.kind === 'ultimate';
    if (p.weapon === 'sword') {
      state.slashes.push({
        x: e.x, y: e.y, angle: rand(-1.3, 1.3), t: 0, life: 0.26,
        scale: heavy ? 2.4 : 1.0, heavy: heavy
      });
    }
    if (p.weapon === 'sword' && heavy) {
      for (var k = 1; k <= 2; k++) {
        state.slashes.push({
          x: e.x, y: e.y, angle: rand(-1.4, 1.4), t: -k * 0.05, life: 0.3,
          scale: 2.0 - k * 0.2, heavy: true
        });
      }
    }
    inkBurst(e.x, e.y, heavy ? 30 : 10, heavy ? 1.8 : 0.9);
    stainAt(e.x + rand(-14, 14), e.y + rand(-14, 14), heavy ? rand(22, 38) : rand(8, 15), '#17130f', heavy ? 0.5 : 0.3);
    if (p.weapon === 'brush' && p.kind === 'heavy') {
      for (var bs = 0; bs < 5; bs++) {
        state.brushStrokes.push({
          x: e.x + rand(-26, 26), y: e.y + rand(-24, 24),
          angle: rand(-1.1, 1.1), t: -bs * 0.06, life: 0.5,
          scale: rand(0.85, 1.4), seed: Math.random() * 6.28
        });
      }
      for (var bst = 0; bst < 3; bst++) {
        stainAt(e.x + rand(-40, 40), e.y + rand(-36, 36), rand(10, 22), '#17130f', 0.36);
      }
    }
    var accent = p.weapon === 'sword' ? '#a8362b' : p.weapon === 'staff' ? '#c4703d' : p.weapon === 'brush' ? '#2f4257' : '#201b15';
    var splashes = heavy ? 8 : 3;
    for (var q = 0; q < splashes; q++) {
      var qa = rand(0, Math.PI * 2);
      var qs = rand(130, heavy ? 430 : 260);
      state.particles.push({
        x: e.x, y: e.y,
        vx: Math.cos(qa) * qs, vy: Math.sin(qa) * qs - 30,
        r: rand(1.4, heavy ? 3.4 : 2.4),
        life: rand(0.18, 0.42), maxLife: 0.42, gravity: 300,
        color: q % 4 === 0 ? '#f2e6c8' : accent, streak: true
      });
    }
    if (p.weapon === 'staff') {
      ring(e.x, e.y, 5, heavy ? '#c0503c' : '#2f4257', heavy ? 74 : 34, 0.26);
    }
    if (heavy) {
      ring(e.x, e.y, 8, '#17130f', 130, 0.42);
      state.shake = Math.max(state.shake, 8);
      state.flash = Math.max(state.flash, 0.2);
    }
    hitEnemy(e, p.dmg, heavy);
  }

  function updateBolts(dt) {
    for (var i = 0; i < state.bolts.length; i++) {
      var b = state.bolts[i];
      b.t += dt;
      if (!b.struck && b.t >= b.delay) {
        b.struck = true;
        var target = b.target && !b.target.dead ? b.target : nearestEnemy();
        if (target) { b.x = target.x; b.y = target.y; }
        state.flash = 1;
        state.shake = Math.max(state.shake, 10);
        SOUND.kill(false);
        inkBurst(b.x, b.y, 26, 2.1);
        stainAt(b.x, b.y, rand(28, 44), '#17130f', 0.55);
        ring(b.x, b.y, 10, '#c0503c', 150, 0.45);
        for (var q = 0; q < 12; q++) {
          state.particles.push({
            x: b.x + rand(-18, 18), y: b.y + rand(-6, 8),
            vx: rand(-120, 120), vy: rand(-340, -90),
            r: rand(1.2, 3.2), life: rand(0.24, 0.6), maxLife: 0.6, gravity: 720,
            color: q % 4 === 0 ? '#f2e6c8' : (q % 3 === 0 ? '#c4703d' : '#17130f'),
            streak: true
          });
        }
        if (target) hitEnemy(target, b.dmg, true);
      }
      if (b.t > b.delay + 0.9) b.dead = true;
    }
    state.bolts = state.bolts.filter(function (b) { return !b.dead; });
  }

  function updateSlips(dt) {
    var lv = state.level;
    state.slips.forEach(function (s) {
      if (lv && lv.rotateEvery && s !== state.focus && s.progress === 0 &&
          s.rotateAt && state.time >= s.rotateAt) {
        rotateSlip(s);
      }
      if (s.errFlash > 0) s.errFlash = Math.max(0, s.errFlash - dt * 2.4);
      if (s.word.commitNeeded && !s.ready && s.progress >= s.word.letters.length) {
        updateSlipReady(s, false);
      }
      if (s.ready) s.readyPulse = (s.readyPulse || 0) + dt;
    });
  }

  function updateEffects(dt) {
    var i;
    for (i = 0; i < state.particles.length; i++) {
      var p = state.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= Math.pow(0.35, dt);
    }
    state.particles = state.particles.filter(function (p) { return p.life > 0; });

    for (i = 0; i < state.rings.length; i++) {
      var r = state.rings[i];
      r.t += dt;
      if (r.t > r.life) r.dead = true;
    }
    state.rings = state.rings.filter(function (r) { return !r.dead; });

    // 英文释义：先留住片刻，再上扬散墨消散
    for (i = 0; i < state.meanings.length; i++) {
      var m = state.meanings[i];
      m.t += dt;
      if (!m.dissolved && m.t >= 1.05) {
        m.dissolved = true;
        for (var k = 0; k < 14; k++) {
          state.particles.push({
            x: m.x + rand(-52, 52), y: m.y + rand(-16, 16),
            vx: rand(-26, 26), vy: rand(-46, -10), r: rand(1, 3.4),
            life: rand(0.45, 0.95), maxLife: 0.95, gravity: -14, color: '#6b6053'
          });
        }
      }
      if (m.t > m.life) m.dead = true;
    }
    state.meanings = state.meanings.filter(function (m) { return !m.dead; });

    for (i = 0; i < state.numbers.length; i++) {
      var n = state.numbers[i];
      n.t += dt;
      n.y -= dt * 46;
      if (n.t > n.life) n.dead = true;
    }
    state.numbers = state.numbers.filter(function (n) { return !n.dead; });

    for (i = 0; i < state.slashes.length; i++) {
      var s = state.slashes[i];
      s.t += dt;
      if (s.t > s.life) s.dead = true;
    }
    state.slashes = state.slashes.filter(function (s) { return !s.dead; });

    for (i = 0; i < state.brushStrokes.length; i++) {
      var bs = state.brushStrokes[i];
      bs.t += dt;
      if (bs.t > bs.life) bs.dead = true;
    }
    state.brushStrokes = state.brushStrokes.filter(function (bs) { return !bs.dead; });
  }

  function hitEnemy(e, dmg, heavy) {
    if (!e || e.dead) return;
    e.hp -= dmg;
    e.flash = 0.22;
    e.y = Math.max(-e.r, e.y - (heavy ? 10 : 3));
    addNumber(e.x, e.y - e.r - 12, dmg, heavy, false);
    if (e.hp <= 0) killEnemy(e, heavy);
  }

  function killEnemy(e, heavy) {
    if (e.dead) return;
    e.dead = true;
    state.kills++;
    state.score += Math.round(e.maxHp * (1 + state.tier * 0.12));
    state.killsSinceHit++;
    SOUND.kill(e.type === 'brute');
    inkBurst(e.x, e.y, e.type === 'brute' ? 34 : 20, e.type === 'brute' ? 2.2 : 1.4);
    stainAt(e.x, e.y, e.type === 'brute' ? rand(34, 50) : rand(16, 28), '#17130f', 0.5);
    if (e.type === 'brute') {
      ring(e.x, e.y, 12, '#17130f', 150, 0.5);
      state.shake = Math.max(state.shake, 7);
    }
    if (e.type === 'boss') {
      state.bossShots = [];
      state.flash = Math.max(state.flash, 0.8);
    }
    updateHud(true);
    if (!state.drill && state.kills >= state.goal) finishGoal();
  }

  /* 斩满目标即破境；精准与失误只计入结算，不再作为门槛 */
  function finishGoal() {
    winBattle();
  }

  function updateTier(silent) {
    var prev = state.tier;
    var t = 0;
    for (var i = D.TIERS.length - 1; i >= 0; i--) {
      if (state.combo >= D.TIERS[i].min) { t = i; break; }
    }
    if (t > state.tier && !silent) {
      tierUpFx(t);
      SOUND.tierUp();
    }
    state.tier = t;
    if (t !== prev) SOUND.setMode(t);
    if (ui.tier) {
      ui.tier.textContent = D.TIERS[t].name;
      ui.tier.className = 'tier-seal' + (t >= 4 ? ' t5' : t === 3 ? ' t4' : '');
    }
    if (ui.comboBox) ui.comboBox.classList.toggle('hot', t >= 2);
  }

  function tierUpFx(t) {
    var tier = D.TIERS[t];
    state.shake = Math.max(state.shake, 6 + t * 1.2);
    state.flash = Math.max(state.flash, 0.35);
    ring(PLAYER.x, PLAYER.y - 110, 20, tier.color, 180 + t * 30, 0.6);
    ring(PLAYER.x, PLAYER.y - 110, 10, '#a8362b', 120, 0.45);
    addNumber(PLAYER.x, PLAYER.y - 232, tier.name, true, false, true);
    for (var i = 0; i < 3 + t * 2; i++) {
      state.particles.push({
        x: PLAYER.x + rand(-40, 40), y: PLAYER.y - rand(40, 150),
        vx: rand(-70, 70), vy: rand(-120, -30), r: rand(2, 6),
        life: rand(0.5, 1.1), maxLife: 1.1, gravity: 90,
        color: i % 3 === 0 ? '#a8362b' : '#17130f'
      });
    }
  }

  /* ---------------- 墨迹 ---------------- */
  function inkBurst(x, y, count, power) {
    var n = Math.round(count * (1 + state.tier * 0.12));
    for (var i = 0; i < n; i++) {
      var a = rand(0, Math.PI * 2);
      var sp = rand(40, 260) * (power || 1);
      state.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - rand(0, 60),
        r: rand(1.4, 5.5) * (power || 1),
        life: rand(0.3, 0.9),
        maxLife: 0.9,
        gravity: rand(120, 260),
        color: Math.random() < 0.12 ? '#a8362b' : '#17130f'
      });
    }
  }

  function muzzleFlash(ang) {
    var x = PLAYER.x + 30, y = playerTorso();
    for (var i = 0; i < 6 + state.tier * 3; i++) {
      var a = ang + rand(-0.5, 0.5);
      var sp = rand(120, 340);
      state.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: rand(1, 3.6), life: rand(0.15, 0.4), maxLife: 0.4, gravity: 40,
        color: Math.random() < 0.2 ? '#a8362b' : '#201b15'
      });
    }
    // 出锋：短促的笔锋飞白
    var accent = state.weapon === 'sword' ? '#a8362b' : state.weapon === 'staff' ? '#c4703d' : state.weapon === 'brush' ? '#2f4257' : '#201b15';
    for (var j = 0; j < 4 + state.tier * 2; j++) {
      var fa = ang + rand(-0.32, 0.32);
      var fs = rand(220, 520);
      state.particles.push({
        x: x, y: y,
        vx: Math.cos(fa) * fs, vy: Math.sin(fa) * fs,
        r: rand(1.2, 2.6), life: rand(0.12, 0.3), maxLife: 0.3, gravity: 20,
        color: j % 3 === 0 ? '#f2e6c8' : accent, streak: true
      });
    }
  }

  function inkSmudge(slip) {
    var x = slip.x + rand(-slip.w * 0.3, slip.w * 0.3);
    var y = slip.y + rand(-14, 14);
    stainAt(x, y, rand(16, 30), '#4a4034', 0.35);
    for (var i = 0; i < 7; i++) {
      state.particles.push({
        x: x, y: y, vx: rand(-50, 50), vy: rand(-30, 30),
        r: rand(2, 7), life: rand(0.4, 0.9), maxLife: 0.9, gravity: 0,
        color: '#5a5042'
      });
    }
  }

  function ring(x, y, r0, color, r1, life) {
    state.rings.push({ x: x, y: y, r0: r0, r1: r1 || r0 + 100, color: color || '#17130f', t: 0, life: life || 0.5 });
  }

  function addNumber(x, y, value, heavy, isHurt, isSeal) {
    state.numbers.push({
      x: x + rand(-10, 10), y: y,
      v: value, t: 0, life: isSeal ? 1.1 : 0.85,
      heavy: !!heavy, hurt: !!isHurt, seal: !!isSeal
    });
  }

  function stainAt(x, y, r, color, alpha) {
    if (!stainCtx || !stainCanvas) return;
    stainCtx.save();
    stainCtx.translate(x, y);
    stainCtx.rotate(rand(0, Math.PI * 2));
    stainCtx.globalAlpha = alpha;
    stainCtx.fillStyle = color || '#17130f';
    var blobs = 3 + Math.floor(r / 8);
    for (var i = 0; i < blobs; i++) {
      var a = rand(0, Math.PI * 2);
      var d = rand(0, r * 0.8);
      stainCtx.beginPath();
      stainCtx.ellipse(Math.cos(a) * d, Math.sin(a) * d, r * rand(0.28, 0.7), r * rand(0.2, 0.55), rand(0, Math.PI), 0, Math.PI * 2);
      stainCtx.fill();
    }
    stainCtx.globalAlpha = alpha * 0.7;
    for (var k = 0; k < 4; k++) {
      var ang = rand(0, Math.PI * 2);
      var len = r * rand(0.9, 1.9);
      stainCtx.beginPath();
      stainCtx.moveTo(Math.cos(ang) * r * 0.3, Math.sin(ang) * r * 0.3);
      stainCtx.quadraticCurveTo(
        Math.cos(ang + 0.2) * len * 0.6, Math.sin(ang + 0.2) * len * 0.6,
        Math.cos(ang) * len, Math.sin(ang) * len
      );
      stainCtx.lineWidth = rand(1, 3.2);
      stainCtx.strokeStyle = color || '#17130f';
      stainCtx.lineCap = 'round';
      stainCtx.stroke();
    }
    stainCtx.restore();
  }

  /* ---------------- HUD ---------------- */
  function buildGoalPips() {
    if (!ui.pips) return;
    var html = '';
    for (var i = 0; i < state.goal; i++) html += '<i></i>';
    ui.pips.innerHTML = html;
    paintPips();
  }

  function paintPips() {
    if (!ui.pips) return;
    var n = state.drill ? state.drill.done : state.kills;
    var dots = $$('i', ui.pips);
    for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i < n);
  }

  function updateHud(force) {
    if (!ui.hpFill) cacheUI();
    if (!ui.hpFill) return;
    var hpPct = clamp((state.hp / ((state.level && state.level.hp) || D.PLAYER_HP)) * 100, 0, 100);
    ui.hpFill.style.width = hpPct + '%';
    ui.hpNum.textContent = Math.max(0, Math.round(state.hp));
    var lv = state.level;
    var acc = Math.round(accuracyP());
    ui.acc.textContent = acc + '%';
    if (ui.accReq) ui.accReq.textContent = '本局精准';
    if (ui.accBox) ui.accBox.classList.remove('below');
    if (ui.timer) {
      var left = lv && lv.limit ? Math.max(0, lv.limit - state.time) : 0;
      ui.timer.textContent = lv && lv.limit ? fmtTime(left) : '∞';
      ui.timer.classList.toggle('warn', !!lv && !!lv.limit && left <= 15);
    }
    ui.combo.textContent = state.combo;
    if (ui.goal) {
      if (state.drill) {
        var d = state.drill;
        if (d.stage === 'teach') ui.goal.textContent = '词 ' + d.done + ' / ' + d.words.length + ' · 连对 ' + d.streak + '/' + d.need;
        else if (d.stage === 'practice') ui.goal.textContent = '词 ' + d.done + ' / ' + d.words.length;
        else ui.goal.textContent = '已成 ' + d.done + ' 题 · 斩 ' + state.kills;
      } else {
        ui.goal.textContent = '斩 ' + state.kills + ' / ' + state.goal;
      }
    }
    paintPips();
    updateProfStrip();
    updateUltGauge();
    if (force) updateTierSealOnly();
    updateHint();
  }

  function updateUltGauge() {
    if (!ui.ultGauge) return;
    var pct = clamp((state.ultCharge / ULT_MAX) * 100, 0, 100);
    if (ui.ultFill) ui.ultFill.style.width = pct + '%';
    var ready = state.ultCharge >= ULT_MAX;
    ui.ultGauge.classList.toggle('ready', ready);
    if (ui.ultNum) ui.ultNum.textContent = ready ? 'Enter 释放' : state.ultCharge + '/' + ULT_MAX;
  }

  function updateProfStrip() {
    if (!ui.profStrip) return;
    var fg = state.focus && state.focus.word ? wordGroup(state.focus.word) : null;
    $$('.prof-item', ui.profStrip).forEach(function (el) {
      var id = el.getAttribute('data-group');
      var mul = profMul(id);
      var pct = clamp((mul - 0.58) / 0.64 * 100, 0, 100);
      var bar = $('i', el);
      if (bar) bar.style.width = pct.toFixed(0) + '%';
      el.classList.toggle('is-focus', id === fg);
      el.classList.toggle('is-weak', mul < 0.85);
      var p = save.prof[id];
      var has = p && p.n >= 8;
      var acc = has ? Math.round((p.ok / p.n) * 100) + '%' : '—';
      var spd = has ? (p.spd || 0).toFixed(1) : '—';
      el.title = groupName(id) + ' · 准确 ' + acc + ' · 速度 ' + spd + ' 键/秒 · 攻击 ×' + mul.toFixed(2);
    });
    if (ui.trainTag) {
      ui.trainTag.textContent = state.trainGoal ? '目标 · ' + state.trainGoal.text : '';
    }
  }

  function updateTierSealOnly() {
    if (!ui.tier) return;
    ui.tier.textContent = D.TIERS[state.tier] ? D.TIERS[state.tier].name : '一重';
    ui.tier.className = 'tier-seal' + (state.tier >= 4 ? ' t5' : state.tier === 3 ? ' t4' : '');
  }

  function updateHint() {
    updateSpeedBox();
    if (!ui.hint) return;
    if (state.drill) {
      var dd = state.drill;
      ui.hint.textContent = dd.stage === 'teach'
        ? '连对 3 次进一词 · 木桩靶不还手 · 不限时 · Esc 暂停'
        : dd.stage === 'practice'
          ? '只看汉语 · 每正确一个字母攻击一次 · 不限时 · Esc 暂停'
          : '每正确一个字母攻击一次 · 不设终点 · Esc 结束';
      ui.hint.classList.remove('ready');
      return;
    }
    if (state.long) {
      var LL = state.long;
      if (LL.article) {
        ui.hint.textContent = LL.advanceAt
          ? '整块翻页中 · 下页即将铺开'
          : '整篇长文 · 词末自动重击 · 整块翻页 · Enter 终极';
      } else {
        ui.hint.textContent = LL.advanceAt
          ? '本批已成 · 正在换卷'
          : '长文模式 · 词末自动重击 · 句号超级重击 · Enter 终极';
      }
      ui.hint.classList.remove('ready');
      return;
    }
    var slip = state.focus;
    if (!slip) {
      ui.hint.textContent = state.speedMode
        ? '速字模式 · 打完整词即发'
        : '输入字母落墨 · 空格重击 · Enter 终极';
      ui.hint.classList.remove('ready');
      return;
    }
    if (slip.word.boss) {
      var bcur = (slip.word.keys || [])[slip.progress];
      if (bcur && bcur.k === 'p') {
        ui.hint.textContent = '标点必输 · 按「' + bcur.ch + '」键输入' + (PUNCT_HINT[bcur.ch] || '标点');
        ui.hint.classList.add('ready');
      } else {
        ui.hint.textContent = '一字一击 · 逐字母落墨 · 标点需按键 · Enter 终极 · 本源 ' +
          (state.boss ? state.boss.coreStep : 0) + ' / ' + (state.boss ? state.boss.coreMax : 6);
        ui.hint.classList.remove('ready');
      }
      return;
    }
    if (state.speedMode && !slip.word.en) {
      var speedDone = (slip.speedText || '').length;
      var speedTotal = slip.word.chars.length;
      var speedReady = slip.strikeQueued || speedDone >= speedTotal;
      ui.hint.textContent = speedReady
        ? '整词正确 · 即刻发出'
        : slip.usedIme
          ? '速字模式 · 逐字上屏「' + slip.word.text + '」（' + speedDone + '/' + speedTotal + '）'
          : '速字模式 · 输入「' + slip.word.text + '」，逐字上屏或完整拼音直发';
      ui.hint.classList.toggle('ready', speedReady);
      return;
    }
    if (slip.ready) {
      ui.hint.textContent = '蓄力已成 · 空格重击 · Enter 终极';
      ui.hint.classList.add('ready');
    } else if (!slip.word.en) {
      ui.hint.textContent = '拼音输入 · 逐字母落墨 · 选字后空格重击 · Enter 终极';
      ui.hint.classList.remove('ready');
    } else {
      ui.hint.textContent = '逐字母落墨 · 整词后空格重击 · Enter 终极';
      ui.hint.classList.remove('ready');
    }
  }

  /* ---------------- 结算 / 暂停 ---------------- */
  function winBattle() {
    if (state.ended) return;
    state.ended = true;
    state.phase = 'won';
    if (state.drill && (state.mode === 'army' || state.mode === 'custom')) {
      var bucket = state.drill.stage === 'teach' ? 'teach' : 'practice';
      save.army[bucket][state.drill.key] = true;
      persist();
    }
    saveRecord();
    SOUND.ambient(false);
    setTimeout(function () { if (state.running) showResult(true); }, 780);
  }

  function loseBattle(reason) {
    if (state.ended) return;
    state.ended = true;
    state.failReason = reason || 'hp';
    state.phase = 'lost';
    if (state.failReason === 'hp') state.hp = 0;
    updateHud(true);
    SOUND.ambient(false);
    setTimeout(function () { if (state.running) showResult(false); }, 520);
  }

  function saveRecord() {
    var lv = state.level;
    if (!lv) return;
    if (state.mode !== 'campaign') return;
    var rec = save.records[lv.id];
    var acc = +(state.total ? state.peakAcc : 100).toFixed(1);
    var perfect = state.errors === 0;
    if (!rec) {
      save.records[lv.id] = { acc: acc, perfect: perfect, score: state.score, combo: state.maxCombo, time: +state.time.toFixed(1) };
    } else {
      rec.acc = Math.max(rec.acc, acc);
      rec.perfect = !!rec.perfect || perfect;
      rec.score = Math.max(rec.score, state.score);
      rec.combo = Math.max(rec.combo, state.maxCombo);
      rec.time = Math.min(rec.time || 9999, +state.time.toFixed(1));
    }
    /* 近期趋势：仅追加真实对局快照，供训练报告展示 */
    var minutes = Math.max(0.05, (state.time || 0) / 60);
    var cpm = Math.round((state.correct || 0) / minutes);
    save.history.push({
      t: Date.now(),
      lv: lv.id,
      acc: acc,
      cpm: cpm,
      wpm: Math.round(cpm / 5),
      combo: state.maxCombo || 0,
      time: +state.time.toFixed(1)
    });
    if (save.history.length > 24) save.history = save.history.slice(-24);
    persist();
  }

  function showIntro() {
    if (!ui.overlay) return;
    var lv = state.level;
    var idx = state.levelIndex;
    ui.overlay.className = 'overlay intro';
    ui.overlay.innerHTML =
      '<div class="overlay-card">' +
      '<p class="ov-kicker">' + (state.mode === 'campaign' ? '第' + (LEVEL_CN[idx] || idx + 1) + '境 · ' + esc(lv.en) : esc(lv.en)) + '</p>' +
      '<h3 class="ov-title">' + esc(lv.name) + '</h3>' +
      '<p class="ov-sub">' + esc(lv.focus) + '</p>' +
      '<p class="ov-hint">' + esc(lv.desc) + '</p>' +
      (state.mode === 'campaign' ? '<p class="ov-train">训练目标 · ' + esc(state.trainGoal ? state.trainGoal.text : '无') + '</p>' : '') +
      (state.mode === 'campaign' ? '<p class="ov-reward">达成并破境可得 <b>墨玉</b> 一枚 · 现有 ' + (save.jade || 0) + '</p>' : '') +
      (state.prescription && state.prescription.keys.length
        ? '<p class="ov-reward">训练处方 · 词帖偏向 <b>' + esc(state.prescription.keys.join(' ')) + '</b></p>'
        : '') +
      '<p class="ov-req">' + (state.drill ? '词 ' + ((lv.words || []).length || '∞') + ' · 不限时' : '斩 ' + lv.goal + ' 敌 · 限时 ' + fmtTime(lv.limit) + ' · 同屏 ' + lv.maxAlive) + '</p>' +
      '<p class="ov-hint" style="color:var(--seal)">开始输入，即刻开战</p>' +
      '</div>';
    ui.overlay.removeAttribute('hidden');
    setTimeout(function () {
      if (ui.overlay && ui.overlay.classList.contains('intro')) {
        ui.overlay.setAttribute('hidden', '');
        ui.overlay.className = 'overlay';
        ui.overlay.innerHTML = '';
      }
    }, 2300);
  }

  function togglePause(force) {
    if (!state.running) return;
    if (state.phase !== 'playing' && state.phase !== 'paused') return;
    var want = typeof force === 'boolean' ? force : state.phase !== 'paused';
    if (want) {
      state.paused = true;
      state.phase = 'paused';
      SOUND.ui();
      showPause();
    } else {
      state.paused = false;
      state.phase = 'playing';
      state.lastTs = performance.now();
      if (ui.overlay) {
        ui.overlay.setAttribute('hidden', '');
        ui.overlay.className = 'overlay';
        ui.overlay.innerHTML = '';
      }
      focusCapture();
      SOUND.ui();
    }
  }

  function showPause() {
    if (!ui.overlay) return;
    ui.overlay.className = 'overlay';
    ui.overlay.innerHTML =
      '<div class="overlay-card">' +
      '<p class="ov-kicker">PAUSED</p>' +
      '<h3 class="ov-title">暂 停</h3>' +
      '<p class="ov-sub">' + esc(state.level.name) + ' · ' + (state.drill ? '已成 ' + state.drill.done + ' 题' : '已斩 ' + state.kills + ' / ' + state.goal) + '</p>' +
      '<div class="ov-actions">' +
      '<button class="btn" data-act="resume" type="button">继续</button>' +
      '<button class="btn ghost" data-act="restart" type="button">重打此境</button>' +
      '<button class="btn ghost" data-act="levels" type="button">' + (state.mode === 'army' || state.mode === 'custom' ? '返回外军' : state.mode === 'endless' ? '结束无限' : '返回诸境') + '</button>' +
      '</div>' +
      '<p class="ov-hint">按 Esc 继续</p>' +
      '</div>';
    ui.overlay.removeAttribute('hidden');
    bindOverlayActions();
  }

  function debriefHTML() {
    var keys = Object.keys(state.missKeys).map(function (k) {
      return { k: k, n: state.missKeys[k] };
    }).sort(function (a, b) { return b.n - a.n; });
    var fingers = Object.keys(state.missFingers).map(function (id) {
      return { id: id, n: state.missFingers[id] };
    }).sort(function (a, b) { return b.n - a.n; });
    var top = keys.slice(0, 3);
    var worst = fingers[0] || null;
    var rx = state.prescription;
    var rxText = rx && rx.keys && rx.keys.length
      ? rx.keys.join(' · ') + (rx.groups && rx.groups.length ? '（' + groupName(rx.groups[0]) + '）' : '')
      : '暂无（本局无失误）';
    var rows = '';
    D.KEYBOARD_ROWS.slice(0, 4).forEach(function (row) {
      rows += '<div class="dbr-row" style="padding-left:' + Math.round(row.offset * 9) + 'px">';
      row.keys.forEach(function (k) {
        var n = state.missKeys[k] || 0;
        var cls = n >= 3 ? ' hot2' : n >= 1 ? ' hot1' : '';
        rows += '<span class="dbr-key' + cls + '">' + esc(k.length === 1 ? k.toUpperCase() : k) + '</span>';
      });
      rows += '</div>';
    });
    var topHTML = top.length ? top.map(function (x) {
      return '<i>' + esc(keyLabel(x.k)) + '</i><em>' + x.n + '</em>';
    }).join('') : '—';
    return '<div class="ov-debrief">' +
      '<p class="ov-sec">破绽图 · 训练处方</p>' +
      '<div class="dbr-top">' +
      '<div class="dbr-block"><span>最易错的键</span><b>' + topHTML + '</b></div>' +
      '<div class="dbr-block"><span>拖后腿的手指</span><b>' +
      (worst ? esc(fingerName(worst.id)) + '<em>' + worst.n + ' 次</em>' : '—') + '</b></div>' +
      '</div>' +
      '<div class="dbr-board" aria-hidden="true">' + rows + '</div>' +
      '<div class="dbr-prof">' + GROUP_DEFS.map(function (d) {
        var p = save.prof[d.id];
        var has = p && p.n >= 8;
        return '<div class="dbr-p"><span>' + d.short + '</span>' +
          '<b>' + (has ? Math.round((p.ok / p.n) * 100) + '%' : '—') + '</b>' +
          '<i>' + (has ? (p.spd || 0).toFixed(1) + ' 键/秒' : '待练') + ' · ×' + profMul(d.id).toFixed(2) + '</i></div>';
      }).join('') + '</div>' +
      '<p class="dbr-rx">下局词帖倾向 · <b>' + esc(rxText) + '</b></p>' +
      '</div>';
  }

  function showResult(win) {
    if (!ui.overlay) return;
    var lv = state.level;
    var last = state.mode === 'campaign' && state.levelIndex >= D.LEVELS.length - 1;
    var peak = Math.round(state.total ? state.peakAcc : 100);
    var perfect = win && state.errors === 0;
    var campaign = state.mode === 'campaign';
    var tr = campaign ? trainResult() : { met: false, detail: '' };
    var gotJade = campaign && win && tr.met;
    if (gotJade) {
      save.jade = (save.jade || 0) + 1;
      state.rewardJade = true;
    }
    if (campaign) buildPrescription();
    persist();
    var failText = state.failReason === 'time' ? '时限已尽'
      : state.failReason === 'core' ? '本源入城，城墙失守' : '敌已入墨';
    var hintText = win ? (campaign ? '按 Enter 进入下一境' : '点「再战此境」继续，或返回大破外军')
      : state.failReason === 'time' ? '减少犹豫，先清掉眼前的词帖'
      : state.failReason === 'core' ? '一字一击可拦截墨弹；整句终结技才能击退本源'
      : '准确比速度更重要';
    ui.overlay.className = 'overlay result';
    ui.overlay.innerHTML =
      '<div class="overlay-card">' +
      '<p class="ov-kicker">' + (win ? 'VICTORY' : 'DEFEAT') + '</p>' +
      '<h3 class="ov-title">' + (win ? '破 境' : '墨 尽') + '</h3>' +
      '<p class="ov-sub">' + esc(lv.name) + ' · ' + (win ? '此境已破' : esc(failText)) + '</p>' +
      (perfect ? '<p class="ov-perfect"><span class="seal">无瑕</span>零失误通关</p>' : '') +
      '<div class="ov-stats">' +
      '<div><b class="seal">' + peak + '%</b><span>本局最高精准</span></div>' +
      '<div><b>' + (state.drill ? state.drill.done + ' 词' : state.kills + ' / ' + state.goal) + '</b><span>' + (state.drill ? '完成词题' : '斩敌') + '</span></div>' +
      '<div><b>' + state.maxCombo + '</b><span>最高连击</span></div>' +
      '<div><b>' + fmtTime(state.time) + '</b><span>用时</span></div>' +
      '</div>' +
      '<p class="ov-req">' + (lv.limit ? '限时 ' + fmtTime(lv.limit) + ' · ' : '不限时 · ') + '同屏 ' + lv.maxAlive + ' · 本局失误 ' + state.errors + ' 次</p>' +
      (campaign
        ? '<div class="ov-train-res' + (tr.met ? ' met' : '') + '">' +
          '<span>训练目标 · ' + (tr.met ? '达成' : '未达') + '</span>' +
          '<b>' + esc(state.trainGoal ? state.trainGoal.text : '') + '</b>' +
          '<i>' + esc(tr.detail) + '</i>' +
          (gotJade ? '<em>墨玉 +1</em>' : '<em class="none">' + (tr.met ? '需破境方得墨玉' : '墨玉未得') + '</em>') +
          '</div>'
        : '') +
      (campaign ? debriefHTML() : '') +
      '<div class="ov-actions">' +
      (win && !last && state.mode === 'campaign' ? '<button class="btn" data-act="next" type="button">下一境</button>' : '') +
      '<button class="btn' + (win && !last && state.mode === 'campaign' ? ' ghost' : '') + '" data-act="restart" type="button">' + (win ? '再战此境' : '重整再战') + '</button>' +
      '<button class="btn ghost" data-act="levels" type="button">' + (state.mode === 'army' || state.mode === 'custom' ? '返回外军' : state.mode === 'endless' ? '结束无限' : '返回诸境') + '</button>' +
      '</div>' +
      '<p class="ov-hint">' + hintText + '</p>' +
      '</div>';
    ui.overlay.removeAttribute('hidden');
    bindOverlayActions();
    state.resultWin = win;
  }

  function bindOverlayActions() {
    $$('[data-act]', ui.overlay).forEach(function (btn) {
      btn.addEventListener('click', function () {
        SOUND.ui();
        var act = btn.getAttribute('data-act');
        if (act === 'resume') togglePause(false);
        else if (act === 'restart') {
          if (state.mode === 'campaign') startBattle(state.levelIndex);
          else startBattle(-1, state.lastOpts);
        }
        else if (act === 'levels') {
          stopBattle();
          showView(state.mode === 'army' || state.mode === 'custom' ? 'army' : state.mode === 'endless' ? 'endless' : 'levels');
        }
        else if (act === 'next') startBattle(Math.min(D.LEVELS.length - 1, state.levelIndex + 1));
      });
    });
  }

  /* ================= 渲染：静态背景 ================= */
  function pseudo(n) {
    var x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function roundRect(c, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  /* 水墨山峦：脊线浓、山体渐隐，避免整片填色压得发闷 */
  function ridgeWash(b, baseY, amp, seed, color, topAlpha, lineAlpha) {
    var pts = [];
    for (var x = -60; x <= W + 60; x += 20) {
      var t = x * 0.010 + seed;
      var y = baseY - (Math.sin(t) * 0.5 + 0.5) * amp -
        Math.sin(x * 0.021 + seed * 2.3) * amp * 0.22 -
        Math.sin(x * 0.047 + seed * 3.7) * amp * 0.07;
      pts.push([x, y]);
    }
    b.save();
    b.beginPath();
    b.moveTo(-60, H);
    for (var i = 0; i < pts.length; i++) b.lineTo(pts[i][0], pts[i][1]);
    b.lineTo(W + 60, H);
    b.closePath();
    var g = b.createLinearGradient(0, baseY - amp * 1.08, 0, baseY + amp * 0.85);
    g.addColorStop(0, hexA(color, topAlpha));
    g.addColorStop(0.42, hexA(color, topAlpha * 0.66));
    g.addColorStop(1, hexA(color, 0));
    b.fillStyle = g;
    b.fill();
    if (lineAlpha) {
      b.beginPath();
      for (var j = 0; j < pts.length; j++) {
        if (j === 0) b.moveTo(pts[j][0], pts[j][1]);
        else b.lineTo(pts[j][0], pts[j][1]);
      }
      b.strokeStyle = hexA(color, lineAlpha);
      b.lineWidth = 1.5;
      b.stroke();
    }
    b.restore();
  }

  /* 墙外远景树线：低饱和小团簇，填住中景空档 */
  function drawTreeLine(b, y, h, alpha) {
    b.save();
    for (var x = -30; x < W + 40; x += 22) {
      var hh = h * (0.45 + pseudo(x * 0.73) * 1.05);
      var cy = y + pseudo(x * 1.37) * h * 0.3;
      b.fillStyle = 'rgba(44,58,46,' + (alpha * (0.6 + pseudo(x * 2.1) * 0.5)) + ')';
      b.beginPath();
      b.ellipse(x, cy, 15 + pseudo(x * 3.3) * 15, hh * 0.5, 0, 0, Math.PI * 2);
      b.fill();
      if (pseudo(x * 4.7) > 0.62) {
        b.beginPath();
        b.moveTo(x, cy - hh * 0.5);
        b.lineTo(x + 7, cy + hh * 0.2);
        b.lineTo(x - 7, cy + hh * 0.2);
        b.closePath();
        b.fill();
      }
    }
    b.restore();
  }

  function drawLeaf(b, x, y, len, ang, alpha) {
    b.save();
    b.translate(x, y);
    b.rotate(ang);
    b.beginPath();
    b.moveTo(0, 0);
    b.quadraticCurveTo(len * 0.42, -len * 0.20, len, 0);
    b.quadraticCurveTo(len * 0.42, len * 0.16, 0, 0);
    b.fillStyle = 'rgba(58,70,54,' + alpha + ')';
    b.fill();
    b.restore();
  }

  function drawBamboo(b, x, topY, bottomY, scale, lean, alpha) {
    b.save();
    b.lineCap = 'round';
    var step = 52 * scale;
    var segs = Math.floor((bottomY - topY) / step);
    for (var i = 0; i < segs; i++) {
      var y0 = bottomY - i * step;
      var y1 = y0 - step * 0.86;
      var off0 = lean * i * 0.55;
      b.strokeStyle = 'rgba(58,70,54,' + (alpha * (0.72 + pseudo(i + x) * 0.28)) + ')';
      b.lineWidth = Math.max(2, (5 - i * 0.2) * scale);
      b.beginPath();
      b.moveTo(x + off0, y0);
      b.lineTo(x + off0 + lean * 0.3, y1);
      b.stroke();
      b.lineWidth = Math.max(1, 1.4 * scale);
      b.beginPath();
      b.moveTo(x + off0 - 5 * scale, y1 + 1);
      b.lineTo(x + off0 + 5 * scale, y1 + 1);
      b.stroke();
      if (i % 2 === 1 && i < segs - 1) {
        var lx = x + off0;
        var ly = y1 + 6;
        drawLeaf(b, lx, ly, 46 * scale, -0.95 + pseudo(i) * 0.5, alpha * 0.9);
        drawLeaf(b, lx, ly, 38 * scale, -2.25 + pseudo(i + 3) * 0.4, alpha * 0.8);
        if (i % 4 === 1) drawLeaf(b, lx, ly, 30 * scale, -1.55 + pseudo(i + 7) * 0.5, alpha * 0.7);
      }
    }
    b.restore();
  }

  function fogBand(b, y, h, alpha) {
    var g = b.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, 'rgba(246,240,228,0)');
    g.addColorStop(0.5, 'rgba(247,241,229,' + alpha + ')');
    g.addColorStop(1, 'rgba(246,240,228,0)');
    b.fillStyle = g;
    b.fillRect(0, y - h / 2, W, h);
  }

  function groundTuft(b, x, y, scale, alpha) {
    b.save();
    b.strokeStyle = 'rgba(42,50,38,' + alpha + ')';
    b.lineCap = 'round';
    for (var i = 0; i < 7; i++) {
      var a = -Math.PI / 2 + (i - 3) * 0.19 + pseudo(i + x) * 0.1;
      var len = (26 + pseudo(i * 3 + x) * 34) * scale;
      b.lineWidth = 1.6 + pseudo(i + 7) * 1.2;
      b.beginPath();
      b.moveTo(x + (i - 3) * 2.5 * scale, y);
      b.quadraticCurveTo(
        x + Math.cos(a) * len * 0.5 + 4 * scale,
        y + Math.sin(a) * len * 0.5,
        x + Math.cos(a) * len,
        y + Math.sin(a) * len
      );
      b.stroke();
    }
    b.restore();
  }

  /* 城墙两端的角楼：石台 + 木楼 + 翘檐，补足"城楼"轮廓 */
  function drawCornerTower(b, cx, wallTop, s) {
    var baseW = 118 * s, baseH = 64 * s;
    // 与墙面的接影
    b.fillStyle = 'rgba(22,16,9,0.22)';
    b.beginPath();
    b.ellipse(cx, wallTop + 3, baseW * 0.66, 11 * s, 0, 0, Math.PI * 2);
    b.fill();
    var bodyW = 84 * s, bodyH = 46 * s;
    var roofW = 132 * s, roofH = 34 * s;
    var baseTop = wallTop - baseH;
    var bodyTop = baseTop - bodyH;
    var roofTop = bodyTop - roofH;

    // 石台：与女墙内面同属墙体，色调压深，砖皮与外缘做接地处理
    var bg2 = b.createLinearGradient(0, baseTop, 0, wallTop);
    bg2.addColorStop(0, '#8a7451');
    bg2.addColorStop(0.55, '#6f5c3f');
    bg2.addColorStop(1, '#574830');
    b.fillStyle = bg2;
    b.fillRect(cx - baseW / 2, baseTop, baseW, baseH);
    b.strokeStyle = 'rgba(40,30,18,0.35)';
    b.lineWidth = 1.6;
    b.strokeRect(cx - baseW / 2, baseTop, baseW, baseH);
    b.strokeStyle = 'rgba(48,35,20,0.16)';
    b.lineWidth = 1;
    for (var r = 1; r < 3; r++) {
      var yy = baseTop + (baseH / 3) * r;
      b.beginPath();
      b.moveTo(cx - baseW / 2, yy);
      b.lineTo(cx + baseW / 2, yy);
      b.stroke();
    }
    b.fillStyle = 'rgba(255,244,220,0.16)';
    b.fillRect(cx - baseW / 2, baseTop, baseW, 2);
    // 台脚接地影
    var tsh = b.createLinearGradient(0, wallTop, 0, wallTop + 22 * s);
    tsh.addColorStop(0, 'rgba(24,18,10,0.34)');
    tsh.addColorStop(1, 'rgba(24,18,10,0)');
    b.fillStyle = tsh;
    b.fillRect(cx - baseW / 2 - 8 * s, wallTop, baseW + 16 * s, 22 * s);
    b.fillStyle = 'rgba(24,18,10,0.5)';
    b.fillRect(cx - baseW / 2, wallTop - 1.6, baseW, 2);

    // 木楼
    var lb = b.createLinearGradient(0, bodyTop, 0, baseTop);
    lb.addColorStop(0, '#6d4a2c');
    lb.addColorStop(1, '#3d2817');
    b.fillStyle = lb;
    b.fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyH);
    b.strokeStyle = 'rgba(23,19,15,0.55)';
    b.lineWidth = 1.6;
    b.strokeRect(cx - bodyW / 2, bodyTop, bodyW, bodyH);
    // 朱柱与窗棂
    b.fillStyle = 'rgba(125,33,25,0.9)';
    [-bodyW / 2 + 6, bodyW / 2 - 10].forEach(function (ox) {
      b.fillRect(cx + ox, bodyTop + 4, 4 * s, bodyH - 8);
    });
    b.strokeStyle = 'rgba(222,196,150,0.34)';
    b.lineWidth = 1.2;
    for (var wx = -bodyW / 2 + 20; wx < bodyW / 2 - 14; wx += 12 * s) {
      b.beginPath();
      b.moveTo(cx + wx, bodyTop + 9 * s);
      b.lineTo(cx + wx, baseTop - 6 * s);
      b.stroke();
    }

    // 翘檐屋顶
    b.beginPath();
    b.moveTo(cx - roofW / 2, roofTop + roofH - 8 * s);
    b.quadraticCurveTo(cx - roofW * 0.40, roofTop + roofH * 0.72, cx - roofW * 0.30, roofTop + roofH * 0.28);
    b.quadraticCurveTo(cx - roofW * 0.12, roofTop + 2, cx, roofTop);
    b.quadraticCurveTo(cx + roofW * 0.12, roofTop + 2, cx + roofW * 0.30, roofTop + roofH * 0.28);
    b.quadraticCurveTo(cx + roofW * 0.40, roofTop + roofH * 0.72, cx + roofW / 2, roofTop + roofH - 8 * s);
    b.quadraticCurveTo(cx + roofW * 0.24, roofTop + roofH * 0.90, cx, roofTop + roofH * 0.86);
    b.quadraticCurveTo(cx - roofW * 0.24, roofTop + roofH * 0.90, cx - roofW / 2, roofTop + roofH - 8 * s);
    b.closePath();
    var rg2 = b.createLinearGradient(0, roofTop, 0, roofTop + roofH);
    rg2.addColorStop(0, '#4a5257');
    rg2.addColorStop(0.6, '#333b40');
    rg2.addColorStop(1, '#22282c');
    b.fillStyle = rg2;
    b.fill();
    b.strokeStyle = 'rgba(23,19,15,0.6)';
    b.lineWidth = 1.4;
    b.stroke();
    // 瓦垄
    b.save();
    b.clip();
    b.strokeStyle = 'rgba(214,224,222,0.16)';
    b.lineWidth = 1.2;
    for (var tx = -roofW / 2 + 8; tx < roofW / 2; tx += 9 * s) {
      b.beginPath();
      b.moveTo(cx + tx, roofTop + roofH * 0.86);
      b.quadraticCurveTo(cx + tx * 0.5, roofTop + roofH * 0.3, cx, roofTop + 2);
      b.stroke();
    }
    b.restore();
    // 屋脊与宝顶
    b.strokeStyle = 'rgba(23,19,15,0.7)';
    b.lineWidth = 3 * s;
    b.beginPath();
    b.moveTo(cx - roofW * 0.30, roofTop + roofH * 0.26);
    b.quadraticCurveTo(cx, roofTop - 2, cx + roofW * 0.30, roofTop + roofH * 0.26);
    b.stroke();
    b.fillStyle = '#b9933f';
    b.beginPath();
    b.arc(cx, roofTop - 4 * s, 4.2 * s, 0, Math.PI * 2);
    b.fill();

    // 檐下朱旗
    b.strokeStyle = '#2a1d12';
    b.lineWidth = 2 * s;
    b.beginPath();
    b.moveTo(cx + roofW * 0.34, roofTop + roofH * 0.55);
    b.lineTo(cx + roofW * 0.34, roofTop + roofH * 0.55 - 30 * s);
    b.stroke();
    b.fillStyle = 'rgba(168,54,43,0.8)';
    b.beginPath();
    b.moveTo(cx + roofW * 0.34, roofTop + roofH * 0.55 - 30 * s);
    b.quadraticCurveTo(cx + roofW * 0.34 + 24 * s, roofTop + roofH * 0.55 - 24 * s, cx + roofW * 0.34 + 18 * s, roofTop + roofH * 0.55 - 4 * s);
    b.quadraticCurveTo(cx + roofW * 0.34 + 9 * s, roofTop + roofH * 0.55 - 12 * s, cx + roofW * 0.34, roofTop + roofH * 0.55 - 8 * s);
    b.closePath();
    b.fill();
  }

  /* ================= 守城视角的墙体 =================
     镜头在城内、略高于墙顶，向城外（画面上方）望：
       画面下方  → 城内墙顶步道（我方立足处，城台在此）
       往上      → 女墙内侧墙面（背光砖面、雨痕、墙脚苔）
       墙顶线    → 压顶石（受城外天光，全画面最亮的一条横线）
       再往上    → 垛口；缺口之间透出城外地面、树线与来敌
     敌人先绘制、墙体后绘制：敌人始终位于墙外，逼近墙根时下半身被垛口遮住。
  */

  function wallMetrics() {
    return {
      crest: TERRITORY_Y,
      merH: clamp(H * 0.038, 24, 44),      // 垛口高
      merW: clamp(W * 0.058, 56, 104),     // 垛口宽
      gap: clamp(W * 0.042, 38, 72),       // 垛口间隙
      capD: clamp(H * 0.012, 8, 14),       // 压顶可见顶面进深
      capH: clamp(H * 0.008, 5, 9),        // 压顶立面
      faceH: clamp(H * 0.066, 44, 80)      // 女墙内面高
    };
  }

  /* 女墙内面 + 压顶 + 垛口，以及墙体投在步道上的影 */
  function drawParapet(b, m) {
    var crest = m.crest;
    var capTop = crest - m.capD;
    var faceTop = crest + m.capH;
    var base = faceTop + m.faceH;
    var brow = clamp(W * 0.062, 58, 112);

    /* —— 女墙内面：整段墙体最暗，明确是“背光的里侧” */
    var ig = b.createLinearGradient(0, faceTop, 0, base);
    ig.addColorStop(0, '#6d5a3f');
    ig.addColorStop(0.16, '#7d6849');
    ig.addColorStop(0.62, '#947e59');
    ig.addColorStop(1, '#7b6647');
    b.fillStyle = ig;
    b.fillRect(0, faceTop, W, m.faceH);

    /* 石缝：三皮，竖缝错开 */
    var rows = 3, rh = m.faceH / rows;
    b.save();
    b.lineWidth = 1.2;
    b.strokeStyle = 'rgba(36,27,15,0.34)';
    for (var r = 1; r < rows; r++) {
      b.beginPath();
      b.moveTo(0, faceTop + rh * r);
      b.lineTo(W, faceTop + rh * r);
      b.stroke();
    }
    b.strokeStyle = 'rgba(36,27,15,0.2)';
    for (var r2 = 0; r2 < rows; r2++) {
      var off = (r2 % 2) ? brow * 0.5 : 0;
      for (var bx = off; bx < W; bx += brow) {
        b.beginPath();
        b.moveTo(bx, faceTop + rh * r2);
        b.lineTo(bx, faceTop + rh * (r2 + 1));
        b.stroke();
      }
    }
    b.restore();

    /* 由压顶垂下的雨水痕 */
    for (var wsi = 0; wsi < 9; wsi++) {
      var sx = pseudo(wsi * 7.3) * W;
      var sh = m.faceH * (0.28 + pseudo(wsi * 2.1) * 0.72);
      var sg = b.createLinearGradient(0, faceTop, 0, faceTop + sh);
      sg.addColorStop(0, 'rgba(32,26,15,0.28)');
      sg.addColorStop(1, 'rgba(32,26,15,0)');
      b.fillStyle = sg;
      b.fillRect(sx, faceTop, 3 + pseudo(wsi + 2) * 8, sh);
    }

    /* 压顶投下的暗影 */
    var cs = b.createLinearGradient(0, faceTop, 0, faceTop + m.faceH * 0.42);
    cs.addColorStop(0, 'rgba(24,18,10,0.54)');
    cs.addColorStop(1, 'rgba(24,18,10,0)');
    b.fillStyle = cs;
    b.fillRect(0, faceTop, W, m.faceH * 0.42);

    /* 墙脚苔痕 */
    for (var mk = 0; mk < 12; mk++) {
      b.fillStyle = 'rgba(62,76,50,' + (0.08 + pseudo(mk * 2.7) * 0.14) + ')';
      b.beginPath();
      b.ellipse(pseudo(mk * 4.1) * W, base - 2 - pseudo(mk) * 7, 18 + pseudo(mk + 3) * 34, 3.4, 0, 0, Math.PI * 2);
      b.fill();
    }

    /* 墙脚压线 */
    b.fillStyle = 'rgba(20,15,8,0.55)';
    b.fillRect(0, base - 1.6, W, 2.4);

    /* —— 压顶石：顶面受外光，是全画面最亮的一条横线 */
    var ct = b.createLinearGradient(0, capTop, 0, crest);
    ct.addColorStop(0, '#f3e5c6');
    ct.addColorStop(0.5, '#e3cea7');
    ct.addColorStop(1, '#ccb48b');
    b.fillStyle = ct;
    b.fillRect(0, capTop, W, m.capD);
    var cf = b.createLinearGradient(0, crest, 0, crest + m.capH);
    cf.addColorStop(0, '#b69a70');
    cf.addColorStop(1, '#8a7250');
    b.fillStyle = cf;
    b.fillRect(0, crest, W, m.capH);
    b.fillStyle = 'rgba(255,250,232,0.62)';
    b.fillRect(0, crest, W, 1.4);
    b.strokeStyle = 'rgba(72,56,34,0.22)';
    b.lineWidth = 1;
    for (var cxs = 0; cxs < W; cxs += brow * 1.9) {
      b.beginPath();
      b.moveTo(cxs, capTop);
      b.lineTo(cxs, crest + m.capH);
      b.stroke();
    }

    /* —— 垛口：从里侧看，顶面受光、立面背光，缺口透出城外 */
    for (var x = -m.merW * 0.55; x < W + m.merW; x += m.merW + m.gap) {
      var mt = capTop - m.merH;
      var mg = b.createLinearGradient(0, mt + 5, 0, capTop);
      mg.addColorStop(0, '#84704c');
      mg.addColorStop(0.55, '#6a5739');
      mg.addColorStop(1, '#54452e');
      b.fillStyle = mg;
      b.fillRect(x, mt + 5, m.merW, m.merH - 5);
      b.fillStyle = '#ecdcba';
      b.fillRect(x - 1, mt, m.merW + 2, 4.6);
      b.fillStyle = 'rgba(255,250,232,0.6)';
      b.fillRect(x - 1, mt, m.merW + 2, 1.6);
      b.fillStyle = 'rgba(255,243,214,0.2)';
      b.fillRect(x + m.merW - 3, mt + 5, 3, m.merH - 6);
      b.fillStyle = 'rgba(24,18,10,0.34)';
      b.fillRect(x, mt + 5, 2.6, m.merH - 5);
      b.strokeStyle = 'rgba(38,28,16,0.22)';
      b.lineWidth = 1;
      b.strokeRect(x + 0.5, mt + 0.5, m.merW - 1, m.merH - 1);
      b.strokeStyle = 'rgba(38,28,16,0.26)';
      b.lineWidth = 1;
      b.beginPath();
      b.moveTo(x, mt + 5 + (m.merH - 5) * 0.52);
      b.lineTo(x + m.merW, mt + 5 + (m.merH - 5) * 0.52);
      b.stroke();
    }

    /* —— 墙体投在步道上的影：光自城外来，影子朝城内（画面前方） */
    var shg = b.createLinearGradient(0, base, 0, base + m.faceH * 0.9);
    shg.addColorStop(0, 'rgba(24,18,10,0.48)');
    shg.addColorStop(0.45, 'rgba(24,18,10,0.2)');
    shg.addColorStop(1, 'rgba(24,18,10,0)');
    b.fillStyle = shg;
    b.fillRect(0, base, W, m.faceH * 0.9);
  }

  /* 墙顶步道：暖石面，越靠近画面前方越大越暗 */
  function drawWallWalk(b, m) {
    var wallBase = m.crest + m.capH + m.faceH;

    var wg = b.createLinearGradient(0, m.crest, 0, H);
    wg.addColorStop(0, '#b49a71');
    wg.addColorStop(0.28, '#c8ae84');
    wg.addColorStop(0.7, '#b79c72');
    wg.addColorStop(1, '#8d7450');
    b.fillStyle = wg;
    b.fillRect(0, m.crest, W, H - m.crest);

    /* 横向石缝：自墙脚向画面下方，间距递增 */
    b.save();
    b.strokeStyle = 'rgba(58,44,28,0.22)';
    b.lineWidth = 1.2;
    var acc = 0;
    var step = Math.max(9, (H - wallBase) * 0.06);
    for (var k = 1; k < 9; k++) {
      acc += step * Math.pow(1.26, k - 1);
      if (wallBase + acc > H - 4) break;
      b.beginPath();
      b.moveTo(0, wallBase + acc);
      b.lineTo(W, wallBase + acc);
      b.stroke();
    }
    /* 纵向石缝：向两侧发散 */
    var cols = Math.max(7, Math.round(W / 150));
    for (var ci = 0; ci <= cols; ci++) {
      var fxp = (ci / cols) * W;
      var nx = W / 2 + (fxp - W / 2) * 1.42;
      b.beginPath();
      b.moveTo(fxp, wallBase + 2);
      b.lineTo(nx, H);
      b.stroke();
    }
    b.restore();

    /* 墨染与磨损 */
    for (var w2 = 0; w2 < 10; w2++) {
      b.fillStyle = 'rgba(70,58,40,' + (0.035 + pseudo(w2 * 3.7) * 0.05) + ')';
      b.beginPath();
      b.ellipse(pseudo(w2 * 5.2) * W, wallBase + pseudo(w2 * 2.4) * (H - wallBase), W * (0.05 + pseudo(w2) * 0.1), 5 + pseudo(w2 + 2) * 16, 0, 0, Math.PI * 2);
      b.fill();
    }
    /* 苔痕 */
    for (var m2 = 0; m2 < 12; m2++) {
      b.fillStyle = 'rgba(74,92,62,' + (0.08 + pseudo(m2 * 1.9) * 0.12) + ')';
      b.beginPath();
      b.ellipse(pseudo(m2 * 3.3) * W, wallBase + 6 + pseudo(m2 * 4.7) * (H - wallBase) * 0.7, 14 + pseudo(m2) * 34, 3.2 + pseudo(m2 + 4) * 3, 0, 0, Math.PI * 2);
      b.fill();
    }

    /* 下缘与左右压暗 */
    var vg = b.createLinearGradient(0, H - H * 0.14, 0, H);
    vg.addColorStop(0, 'rgba(38,28,16,0)');
    vg.addColorStop(1, 'rgba(38,28,16,0.36)');
    b.fillStyle = vg;
    b.fillRect(0, H - H * 0.14, W, H * 0.14);

    var lv = b.createLinearGradient(0, 0, W * 0.12, 0);
    lv.addColorStop(0, 'rgba(38,28,16,0.26)');
    lv.addColorStop(1, 'rgba(38,28,16,0)');
    b.fillStyle = lv;
    b.fillRect(0, m.crest, W * 0.12, H - m.crest);

    var rv = b.createLinearGradient(W, 0, W * 0.88, 0);
    rv.addColorStop(0, 'rgba(38,28,16,0.26)');
    rv.addColorStop(1, 'rgba(38,28,16,0)');
    b.fillStyle = rv;
    b.fillRect(W * 0.88, m.crest, W * 0.12, H - m.crest);
  }

  /* 步道上的守军旗：插在墙脚内侧，旗面探到垛口高度 */
  function drawBanner(b, x, baseY, h, s) {
    b.strokeStyle = 'rgba(42,29,18,0.9)';
    b.lineWidth = 2.6;
    b.beginPath();
    b.moveTo(x, baseY);
    b.lineTo(x, baseY - h);
    b.stroke();
    var fw = 34 * s, fh = 23 * s;
    var top = baseY - h + 7 * s;
    b.fillStyle = 'rgba(168,54,43,0.86)';
    b.beginPath();
    b.moveTo(x, top);
    b.quadraticCurveTo(x + fw * 0.9, top + 2 * s, x + fw, top + fh * 0.5);
    b.quadraticCurveTo(x + fw * 0.6, top + fh * 0.9, x, top + fh);
    b.closePath();
    b.fill();
    b.strokeStyle = 'rgba(96,26,20,0.42)';
    b.lineWidth = 1;
    b.stroke();
    b.fillStyle = '#b9933f';
    b.beginPath();
    b.arc(x, baseY - h, 3.2 * s, 0, Math.PI * 2);
    b.fill();
  }

  /* 城内城台：人物立于台面远缘，台面朝镜头铺开，台沿朝下 */
  function drawDais(b, feetY) {
    var cx = PLAYER.x;
    var w = Math.min(W * 0.42, 600);
    var dep = clamp(H * 0.021, 14, 24);
    var h = clamp(H * 0.036, 26, 42);
    var top = feetY;
    var edge = top + dep;
    var bottom = edge + h;

    /* 台面：远窄近宽，铺向画面下方 */
    var tg = b.createLinearGradient(0, top, 0, edge);
    tg.addColorStop(0, '#c9b086');
    tg.addColorStop(1, '#dcc49a');
    b.fillStyle = tg;
    b.beginPath();
    b.moveTo(cx - w * 0.44, top);
    b.lineTo(cx + w * 0.44, top);
    b.lineTo(cx + w * 0.5, edge);
    b.lineTo(cx - w * 0.5, edge);
    b.closePath();
    b.fill();
    b.strokeStyle = 'rgba(48,36,20,0.24)';
    b.lineWidth = 1;
    b.stroke();

    /* 正立面 */
    var dg = b.createLinearGradient(0, edge, 0, bottom);
    dg.addColorStop(0, '#a68c61');
    dg.addColorStop(0.5, '#8b714c');
    dg.addColorStop(1, '#655035');
    b.fillStyle = dg;
    b.fillRect(cx - w * 0.5, edge, w, h);
    b.fillStyle = 'rgba(255,247,226,0.42)';
    b.fillRect(cx - w * 0.5, edge, w, 1.8);
    b.strokeStyle = 'rgba(28,21,12,0.45)';
    b.lineWidth = 1.2;
    b.strokeRect(cx - w * 0.5, edge, w, h);
    b.strokeStyle = 'rgba(30,23,14,0.22)';
    b.lineWidth = 1;
    b.beginPath();
    b.moveTo(cx - w * 0.5, edge + h * 0.62);
    b.lineTo(cx + w * 0.5, edge + h * 0.62);
    b.stroke();

    /* 两侧踏步 */
    b.fillStyle = '#9c8259';
    b.fillRect(cx - w * 0.5 - 26, edge + h * 0.3, 26, h * 0.7);
    b.fillRect(cx + w * 0.5, edge + h * 0.3, 26, h * 0.7);
    b.fillStyle = 'rgba(255,247,226,0.28)';
    b.fillRect(cx - w * 0.5 - 26, edge + h * 0.3, 26, 1.6);
    b.fillRect(cx + w * 0.5, edge + h * 0.3, 26, 1.6);

    /* 台沿牌匾 */
    var pw = Math.min(104, w * 0.18);
    var ph = Math.max(15, Math.min(h * 0.6, 22));
    var pxx = cx - pw / 2;
    var pyy = edge + (h - ph) / 2;
    b.fillStyle = '#2a1d12';
    b.fillRect(pxx, pyy, pw, ph);
    b.strokeStyle = 'rgba(185,147,63,0.8)';
    b.lineWidth = 1.3;
    b.strokeRect(pxx + 1.5, pyy + 1.5, pw - 3, ph - 3);
    b.fillStyle = 'rgba(238,216,170,0.92)';
    b.font = Math.round(ph * 0.56) + 'px "KaiTi","STKaiti","Songti SC",serif';
    b.textAlign = 'center';
    b.textBaseline = 'middle';
    b.fillText('墨关', cx, pyy + ph / 2 + 0.5);
    b.textAlign = 'left';
    b.textBaseline = 'alphabetic';

    /* 台基投在步道上的影 */
    var sh = b.createLinearGradient(0, bottom, 0, bottom + h * 0.55);
    sh.addColorStop(0, 'rgba(24,18,10,0.34)');
    sh.addColorStop(1, 'rgba(24,18,10,0)');
    b.fillStyle = sh;
    b.fillRect(cx - w * 0.52, bottom, w * 1.04, h * 0.55);

    /* 两角灯架：灯头探在女墙前面，暖光落在台面与墙脚 */
    [-w * 0.5, w * 0.5].forEach(function (ox) {
      var lx = cx + ox;
      var baseY = edge + h * 0.55;
      var lampY = baseY - 54;
      b.strokeStyle = 'rgba(42,29,18,0.85)';
      b.lineWidth = 2.4;
      b.beginPath();
      b.moveTo(lx, baseY);
      b.lineTo(lx, lampY);
      b.stroke();
      var g3 = b.createRadialGradient(lx, lampY, 2, lx, lampY, 42);
      g3.addColorStop(0, 'rgba(255,198,128,0.42)');
      g3.addColorStop(1, 'rgba(255,198,128,0)');
      b.fillStyle = g3;
      b.beginPath();
      b.arc(lx, lampY, 42, 0, Math.PI * 2);
      b.fill();
      b.fillStyle = 'rgba(168,54,43,0.95)';
      b.beginPath();
      b.ellipse(lx, lampY, 5.4, 7.4, 0, 0, Math.PI * 2);
      b.fill();
      b.strokeStyle = 'rgba(246,210,150,0.7)';
      b.lineWidth = 1.2;
      b.stroke();
      b.fillStyle = '#b9933f';
      b.fillRect(lx - 3.4, lampY - 9, 6.8, 2.2);
      b.fillRect(lx - 3.4, lampY + 7, 6.8, 2.2);
    });
  }

  /* 近景墙体叠加层：在敌人之后绘制，确保敌人始终位于墙外 */
  function renderCityWall() {
    if (!wallCanvas) return;
    var b = wallCanvas.getContext('2d');
    b.setTransform(DPR, 0, 0, DPR, 0, 0);
    b.clearRect(0, 0, W, H);
    var m = wallMetrics();
    var wallBase = m.crest + m.capH + m.faceH;

    drawWallWalk(b, m);
    drawParapet(b, m);

    // 守军旗：插在墙脚内侧的步道上，旗面不越过墙顶
    var bs = clamp(H / 820, 0.86, 1.3);
    drawBanner(b, W * 0.215, wallBase + 14, H * 0.085, bs);
    drawBanner(b, W * 0.785, wallBase + 14, H * 0.085, bs);

    // 两端角楼：石台压在墙身上，楼身与翘檐探出墙顶
    var ctS = clamp(H / 820, 0.9, 1.35);
    drawCornerTower(b, W * 0.083, m.crest + m.faceH * 0.55, ctS);
    drawCornerTower(b, W * 0.917, m.crest + m.faceH * 0.55, ctS);

    drawDais(b, PLAYER.y + 20);
  }

  function renderBackground() {
    if (!bgCanvas) return;
    var b = bgCanvas.getContext('2d');
    b.setTransform(DPR, 0, 0, DPR, 0, 0);
    b.clearRect(0, 0, W, H);
    var base = Math.min(W, H);
    var wallTop = TERRITORY_Y;

    // 天幕
    var sk = b.createLinearGradient(0, 0, 0, H * 0.68);
    sk.addColorStop(0, '#e7dcc5');
    sk.addColorStop(0.42, '#f0e4cd');
    sk.addColorStop(0.78, '#f4e7cf');
    sk.addColorStop(1, '#ead9ba');
    b.fillStyle = sk;
    b.fillRect(0, 0, W, H * 0.68 + 2);

    // 暖阳
    var sx = W * 0.71, sy = H * 0.175, sr = base * 0.058;
    var halo = b.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 4.4);
    halo.addColorStop(0, 'rgba(255,246,224,0.85)');
    halo.addColorStop(0.36, 'rgba(252,238,210,0.26)');
    halo.addColorStop(1, 'rgba(252,238,210,0)');
    b.fillStyle = halo;
    b.fillRect(sx - sr * 4.4, sy - sr * 4.4, sr * 8.8, sr * 8.8);
    b.beginPath();
    b.arc(sx, sy, sr, 0, Math.PI * 2);
    b.fillStyle = 'rgba(255,250,236,0.72)';
    b.fill();
    b.strokeStyle = 'rgba(140,120,86,0.16)';
    b.lineWidth = 1.4;
    b.stroke();

    // 云带
    [[0.12, 0.11, 0.26], [0.48, 0.115, 0.34], [0.82, 0.24, 0.22]].forEach(function (cl) {
      var cg = b.createRadialGradient(W * cl[0], H * cl[1], 2, W * cl[0], H * cl[1], base * cl[2]);
      cg.addColorStop(0, 'rgba(252,245,232,0.34)');
      cg.addColorStop(0.6, 'rgba(250,242,226,0.14)');
      cg.addColorStop(1, 'rgba(250,242,226,0)');
      b.fillStyle = cg;
      b.fillRect(W * cl[0] - base * cl[2], H * cl[1] - base * cl[2] * 0.4, base * cl[2] * 2, base * cl[2] * 0.8);
    });

    // 远山：脊线浓、山体渐隐
    ridgeWash(b, H * 0.470, H * 0.074, 2.1, '#8b9a8c', 0.20, 0.05);
    ridgeWash(b, H * 0.512, H * 0.098, 1.3, '#76897c', 0.24, 0.07);
    fogBand(b, H * 0.545, H * 0.105, 0.44);

    // 中景山影
    ridgeWash(b, H * 0.578, H * 0.112, 4.6, '#5b6f61', 0.30, 0.10);
    ridgeWash(b, H * 0.628, H * 0.092, 7.1, '#4a5c50', 0.32, 0.11);
    fogBand(b, H * 0.618, H * 0.080, 0.40);

    // 近景山脚
    ridgeWash(b, H * 0.694, H * 0.064, 9.3, '#37463c', 0.36, 0.12);
    fogBand(b, H * 0.694, H * 0.052, 0.20);

    // 近景地面
    var gd = b.createLinearGradient(0, H * 0.655, 0, wallTop);
    gd.addColorStop(0, 'rgba(224,210,182,0)');
    gd.addColorStop(0.45, 'rgba(212,195,163,0.55)');
    gd.addColorStop(1, 'rgba(186,163,126,0.8)');
    b.fillStyle = gd;
    b.fillRect(0, H * 0.655, W, wallTop - H * 0.655 + 2);

    // 地面墨染与笔触
    b.save();
    for (var g = 0; g < 18; g++) {
      var wy = H * (0.672 + pseudo(g * 6.3) * 0.12);
      var ww = W * (0.10 + pseudo(g * 2.9) * 0.26);
      var wx = pseudo(g * 4.4) * (W - ww);
      b.fillStyle = 'rgba(92,104,84,' + (0.03 + pseudo(g + 1) * 0.05) + ')';
      b.beginPath();
      b.ellipse(wx + ww / 2, wy, ww / 2, 5 + pseudo(g + 7) * 9, 0, 0, Math.PI * 2);
      b.fill();
    }
    b.strokeStyle = 'rgba(54,42,28,0.17)';
    b.lineCap = 'round';
    for (var g2 = 0; g2 < 34; g2++) {
      var gy = H * 0.678 + pseudo(g2 * 5.1) * H * 0.112;
      var gx = pseudo(g2 * 2.7) * W;
      var gl = 24 + pseudo(g2 * 4.3) * 96;
      b.lineWidth = 1 + pseudo(g2) * 1.7;
      b.beginPath();
      b.moveTo(gx, gy);
      b.lineTo(gx + gl, gy + (pseudo(g2 + 2) - 0.5) * 3);
      b.stroke();
    }
    b.restore();

    // 墙外树线（城墙会盖住根部）
    drawTreeLine(b, wallTop - 18, Math.max(26, H * 0.045), 0.20);
    drawTreeLine(b, wallTop - 6, Math.max(18, H * 0.032), 0.14);

    // 两侧地面草丛与山石
    for (var t = 0; t < 12; t++) {
      groundTuft(b, W * (0.03 + pseudo(t * 2.2) * 0.22), H * (0.70 + pseudo(t * 3.1) * 0.09), 0.7 + pseudo(t) * 0.8, 0.18);
      groundTuft(b, W * (0.76 + pseudo(t * 4.1) * 0.21), H * (0.70 + pseudo(t * 1.7) * 0.09), 0.7 + pseudo(t + 5) * 0.8, 0.18);
    }
    b.fillStyle = 'rgba(47,55,42,0.18)';
    [[W * 0.075, H * 0.787, 34, 12], [W * 0.90, H * 0.777, 42, 14], [W * 0.22, H * 0.792, 26, 9]].forEach(function (rk) {
      b.beginPath();
      b.ellipse(rk[0], rk[1], rk[2], rk[3], -0.12, 0, Math.PI * 2);
      b.fill();
    });

    // 竹林
    drawBamboo(b, W * 0.94, H * 0.20, H * 0.79, base / 780, 5, 0.14);
    drawBamboo(b, W * 0.975, H * 0.34, H * 0.79, base / 980, 3, 0.10);
    drawBamboo(b, W * 0.055, H * 0.28, H * 0.79, base / 900, -4, 0.10);

    // 飞鸟
    b.save();
    b.strokeStyle = 'rgba(45,52,44,0.32)';
    b.lineWidth = 1.6;
    b.lineCap = 'round';
    [[0.27, 0.19, 9], [0.30, 0.165, 7], [0.325, 0.205, 6]].forEach(function (bd) {
      var bx = W * bd[0], by = H * bd[1], br = bd[2] * base / 800;
      b.beginPath();
      b.moveTo(bx - br, by);
      b.quadraticCurveTo(bx - br * 0.4, by - br * 0.7, bx, by);
      b.quadraticCurveTo(bx + br * 0.4, by - br * 0.7, bx + br, by);
      b.stroke();
    });
    b.restore();

    // 墙根外的踩踏土色：压暗城外地面，让垛口与来敌的轮廓更清楚
    var fg2 = b.createLinearGradient(0, wallTop - H * 0.06, 0, wallTop);
    fg2.addColorStop(0, 'rgba(58,46,28,0)');
    fg2.addColorStop(1, 'rgba(58,46,28,0.28)');
    b.fillStyle = fg2;
    b.fillRect(0, wallTop - H * 0.06, W, H * 0.06);

    // 前景压暗与纸纹
    var vg = b.createRadialGradient(W / 2, H * 0.44, base * 0.28, W / 2, H * 0.44, base * 0.92);
    vg.addColorStop(0, 'rgba(40,34,24,0)');
    vg.addColorStop(1, 'rgba(40,34,24,0.30)');
    b.fillStyle = vg;
    b.fillRect(0, 0, W, H);

    b.fillStyle = 'rgba(70,60,44,0.012)';
    for (var sy2 = 0; sy2 < H; sy2 += 4) b.fillRect(0, sy2, W, 1);
    for (var i = 0; i < 900; i++) {
      var px = pseudo(i * 1.7) * W;
      var py = pseudo(i * 3.1 + 5) * H;
      b.fillStyle = 'rgba(60,50,36,' + (0.018 + pseudo(i) * 0.03) + ')';
      b.beginPath();
      b.arc(px, py, 0.5 + pseudo(i * 2.3) * 1.1, 0, Math.PI * 2);
      b.fill();
    }
  }

  /* ================= 渲染：战场 ================= */
  var CN_FONT = '"KaiTi","STKaiti","Kaiti SC","Songti SC",serif';
  var EN_FONT = '"Palatino Linotype","Book Antiqua",Georgia,serif';

  function render(dt) {
    if (!ctx) return;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var s = state.shake;
    var ox = s > 0.2 ? rand(-s, s) : 0;
    var oy = s > 0.2 ? rand(-s, s) : 0;

    ctx.save();
    ctx.translate(ox, oy);
    if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0, W, H);
    if (stainCanvas) ctx.drawImage(stainCanvas, 0, 0, W, H);
    drawEnemies();
    if (wallCanvas) ctx.drawImage(wallCanvas, 0, 0, W, H);
    drawPlayer(dt);
    drawBolts();
    drawProjectiles();
    drawBossFx();
    drawUltimate();
    drawBrushStrokes();
    drawSlashes();
    drawParticles();
    drawRings();
    drawSlips();
    drawLongPanels();
    drawBossShots();
    drawMeanings();
    drawNumbers();
    ctx.restore();

    drawScreenFx();
  }

  function drawScreenFx() {
    var c = ctx;
    // 重击闪白
    if (state.flash > 0.01) {
      c.fillStyle = 'rgba(248,242,226,' + (state.flash * 0.55) + ')';
      c.fillRect(0, 0, W, H);
    }
    // 受击红晕
    if (state.hurtFlash > 0.01) {
      var hg = c.createRadialGradient(W / 2, H * 0.54, 130, W / 2, H * 0.54, 640);
      hg.addColorStop(0, 'rgba(120,32,22,0)');
      hg.addColorStop(0.7, 'rgba(120,32,22,' + (state.hurtFlash * 0.16) + ')');
      hg.addColorStop(1, 'rgba(120,32,22,' + (state.hurtFlash * 0.52) + ')');
      c.fillStyle = hg;
      c.fillRect(0, 0, W, H);
    }
    // 连击高段位：屏幕边缘气韵
    if (state.tier >= 2 && state.phase === 'playing') {
      var col = D.TIERS[state.tier].color;
      var pulse = 0.05 + 0.035 * Math.sin(state.time * 3.2);
      var tg = c.createLinearGradient(0, 0, 0, 120);
      tg.addColorStop(0, hexA(col, pulse * (state.tier - 1)));
      tg.addColorStop(1, hexA(col, 0));
      c.fillStyle = tg;
      c.fillRect(0, 0, W, 120);
      var bg2 = c.createLinearGradient(0, H, 0, H - 150);
      bg2.addColorStop(0, hexA(col, pulse * (state.tier - 1) * 1.4));
      bg2.addColorStop(1, hexA(col, 0));
      c.fillStyle = bg2;
      c.fillRect(0, H - 150, W, 150);
    }
    // 暂停时压暗
    if (state.phase === 'paused') {
      c.fillStyle = 'rgba(30,26,18,0.28)';
      c.fillRect(0, 0, W, H);
    }
  }

  function hexA(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')';
  }

  /* ---------------- 敌人 ---------------- */
  function drawEnemies() {
    for (var i = 0; i < state.enemies.length; i++) {
      if (!state.enemies[i].dead) drawEnemy(state.enemies[i]);
    }
  }

  function drawEnemy(e) {
    var c = ctx;
    c.save();
    c.translate(e.x, e.y);
    // 落影
    c.globalAlpha = 0.14;
    c.fillStyle = '#17130f';
    c.beginPath();
    c.ellipse(0, e.r * 0.96, e.r * 1.0, e.r * 0.3, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;

    c.rotate(e.angle);
    if (e.type === 'dummy') drawDummy(e);
    else if (e.type === 'crow') drawCrow(e);
    else if (e.type === 'boss') drawBoss(e);
    else if (e.type === 'brute') drawBrute(e);
    else drawWolf(e);

    if (e.flash > 0) {
      c.globalAlpha = Math.min(0.4, e.flash * 1.7);
      var fg = c.createRadialGradient(0, 0, 2, 0, 0, e.r * 1.4);
      fg.addColorStop(0, 'rgba(250,246,232,0.9)');
      fg.addColorStop(1, 'rgba(250,246,232,0)');
      c.fillStyle = fg;
      c.beginPath();
      c.arc(0, 0, e.r * 1.4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    drawEnemyHp(e);
  }

  /* 教学关木桩靶：固定不动、不进攻 */
  function drawDummy(e) {
    var c = ctx;
    var r = e.r;
    c.save();
    // 立柱
    c.strokeStyle = '#6b4a2f';
    c.lineWidth = Math.max(4, r * 0.14);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-r * 0.9, r * 1.5);
    c.lineTo(-r * 0.55, -r * 0.3);
    c.moveTo(r * 0.9, r * 1.5);
    c.lineTo(r * 0.55, -r * 0.3);
    c.stroke();
    // 草垛
    c.fillStyle = '#c9a35e';
    c.strokeStyle = '#8f6c33';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, 0, r * 0.95, r * 1.05, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // 靶心
    ['#f3e6c8', '#a8362b', '#f3e6c8', '#a8362b'].forEach(function (col, i) {
      c.fillStyle = col;
      c.beginPath();
      c.arc(0, 0, r * (0.66 - i * 0.15), 0, Math.PI * 2);
      c.fill();
    });
    // 草绳
    c.strokeStyle = 'rgba(90, 62, 32, 0.55)';
    c.lineWidth = 1.6;
    for (var k = -1; k <= 1; k++) {
      c.beginPath();
      c.moveTo(-r * 0.85, k * r * 0.5);
      c.lineTo(r * 0.85, k * r * 0.5);
      c.stroke();
    }
    c.restore();
  }

  function drawCrow(e) {
    var c = ctx;
    var r = e.r;
    var flap = Math.sin(state.time * 11 + e.seed) * 0.55;
    c.fillStyle = '#17130f';
    c.strokeStyle = '#17130f';
    c.lineWidth = 2;
    // 双翼
    c.globalAlpha = 0.9;
    c.beginPath();
    c.moveTo(-r * 0.15, -r * 0.15);
    c.quadraticCurveTo(-r * 0.65, -r * (0.85 + flap), -r * 1.15, -r * (0.15 + flap * 0.5));
    c.quadraticCurveTo(-r * 0.6, -r * 0.05, -r * 0.15, r * 0.1);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(r * 0.15, -r * 0.15);
    c.quadraticCurveTo(r * 0.72, -r * (0.7 - flap), r * 1.15, -r * (0.05 - flap * 0.5));
    c.quadraticCurveTo(r * 0.6, r * 0.02, r * 0.15, r * 0.1);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
    // 身
    c.beginPath();
    c.ellipse(0, 0, r * 0.64, r * 0.44, 0, 0, Math.PI * 2);
    c.fill();
    // 头
    c.beginPath();
    c.arc(r * 0.62, -r * 0.14, r * 0.28, 0, Math.PI * 2);
    c.fill();
    // 喙
    c.beginPath();
    c.moveTo(r * 0.84, -r * 0.2);
    c.lineTo(r * 1.2, -r * 0.02);
    c.lineTo(r * 0.82, r * 0.06);
    c.closePath();
    c.fill();
    // 尾
    c.beginPath();
    c.moveTo(-r * 0.6, 0);
    c.lineTo(-r * 1.1, r * 0.18);
    c.lineTo(-r * 0.58, r * 0.24);
    c.closePath();
    c.fill();
    // 眼
    c.fillStyle = '#c0503c';
    c.beginPath();
    c.arc(r * 0.7, -r * 0.2, 2.4, 0, Math.PI * 2);
    c.fill();
  }

  function drawWolf(e) {
    var c = ctx;
    var r = e.r;
    var gait = Math.sin(state.time * 9 + e.seed);
    c.fillStyle = '#17130f';
    c.strokeStyle = '#17130f';
    c.lineCap = 'round';
    // 腿
    c.lineWidth = Math.max(3, r * 0.13);
    var legs = [
      [-r * 0.52, -r * 0.26], [r * 0.1, -r * 0.22],
      [-r * 0.4, r * 0.22], [r * 0.22, r * 0.26]
    ];
    legs.forEach(function (lg, i) {
      var sw = gait * (i % 2 ? -1 : 1) * r * 0.16;
      c.beginPath();
      c.moveTo(lg[0], lg[1]);
      c.lineTo(lg[0] + sw, r * 0.76);
      c.stroke();
    });
    // 身
    c.beginPath();
    c.ellipse(0, 0, r * 0.78, r * 0.38, -0.06, 0, Math.PI * 2);
    c.fill();
    // 颈与头
    c.beginPath();
    c.ellipse(r * 0.6, -r * 0.24, r * 0.36, r * 0.3, 0.35, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(r * 0.86, -r * 0.3, r * 0.24, r * 0.19, 0.2, 0, Math.PI * 2);
    c.fill();
    // 吻
    c.beginPath();
    c.moveTo(r * 0.96, -r * 0.36);
    c.lineTo(r * 1.3, -r * 0.16);
    c.lineTo(r * 0.92, -r * 0.1);
    c.closePath();
    c.fill();
    // 耳
    c.beginPath();
    c.moveTo(r * 0.62, -r * 0.48);
    c.lineTo(r * 0.68, -r * 0.78);
    c.lineTo(r * 0.82, -r * 0.5);
    c.closePath();
    c.fill();
    // 尾
    c.beginPath();
    c.moveTo(-r * 0.74, -r * 0.08);
    c.quadraticCurveTo(-r * 1.24, -r * (0.3 + gait * 0.1), -r * 1.18, r * 0.28);
    c.lineWidth = r * 0.16;
    c.stroke();
    // 眼
    c.fillStyle = '#c0503c';
    c.beginPath();
    c.arc(r * 0.9, -r * 0.34, 2.6, 0, Math.PI * 2);
    c.fill();
    // 墨须
    c.strokeStyle = 'rgba(23,19,15,0.5)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(r * 1.28, -r * 0.16);
    c.lineTo(r * 1.44, -r * 0.24);
    c.moveTo(r * 1.26, -r * 0.12);
    c.lineTo(r * 1.4, -r * 0.04);
    c.stroke();
  }

  function drawBrute(e) {
    var c = ctx;
    var r = e.r;
    var breath = Math.sin(state.time * 2.6 + e.seed) * 1.6;
    c.fillStyle = '#17130f';
    // 背后墨晕
    c.globalAlpha = 0.22;
    c.beginPath();
    c.ellipse(0, 0, r * 1.2, r * 1.05, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    // 双角
    c.beginPath();
    c.moveTo(-r * 0.66, -r * 0.5);
    c.quadraticCurveTo(-r * 1.04, -r * 1.18, -r * 0.5, -r * 1.02);
    c.quadraticCurveTo(-r * 0.58, -r * 0.7, -r * 0.4, -r * 0.52);
    c.fill();
    c.beginPath();
    c.moveTo(r * 0.66, -r * 0.5);
    c.quadraticCurveTo(r * 1.04, -r * 1.18, r * 0.5, -r * 1.02);
    c.quadraticCurveTo(r * 0.58, -r * 0.7, r * 0.4, -r * 0.52);
    c.fill();
    // 身躯
    c.beginPath();
    c.ellipse(0, 0, r * 0.84 + breath * 0.3, r * 0.92, 0, 0, Math.PI * 2);
    c.fill();
    // 肩甲
    c.globalAlpha = 0.55;
    c.beginPath();
    c.ellipse(-r * 0.66, -r * 0.18, r * 0.42, r * 0.28, -0.5, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(r * 0.66, -r * 0.18, r * 0.42, r * 0.28, 0.5, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    // 甲纹
    c.strokeStyle = 'rgba(236,226,205,0.28)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(-r * 0.34, -r * 0.3);
    c.quadraticCurveTo(0, -r * 0.06, -r * 0.2, r * 0.44);
    c.moveTo(r * 0.34, -r * 0.3);
    c.quadraticCurveTo(0, -r * 0.06, r * 0.2, r * 0.44);
    c.stroke();
    // 眼
    c.fillStyle = '#c0503c';
    c.beginPath();
    c.arc(-r * 0.24, -r * 0.3, 4.6, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(r * 0.24, -r * 0.3, 4.6, 0, Math.PI * 2);
    c.fill();
    // 口
    c.strokeStyle = '#17130f';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-r * 0.22, r * 0.16);
    c.quadraticCurveTo(0, r * 0.3, r * 0.22, r * 0.16);
    c.stroke();
  }

  function drawBoss(e) {
    var c = ctx;
    var r = e.r;
    if (e.lunge) c.translate(0, e.lunge);
    var pulse = 0.5 + 0.5 * Math.sin(state.time * 2.2 + e.phase);
    // 朱红煞气
    var g = c.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.85);
    g.addColorStop(0, 'rgba(168,54,43,' + (0.1 + pulse * 0.08) + ')');
    g.addColorStop(0.7, 'rgba(168,54,43,0.05)');
    g.addColorStop(1, 'rgba(168,54,43,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, r * 1.85, 0, Math.PI * 2);
    c.fill();
    // 脚下法阵
    c.strokeStyle = 'rgba(168,54,43,' + (0.28 + pulse * 0.2) + ')';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, r * 0.92, r * 1.3, r * 0.34, 0, 0, Math.PI * 2);
    c.stroke();
    // 本体（放大版重甲狼将）
    drawBrute({ r: r * 1.14, seed: e.id, gait: 0.2, type: 'brute' });
    // 甲带与朱印
    c.strokeStyle = '#a8362b';
    c.lineWidth = Math.max(2, r * 0.05);
    c.beginPath();
    c.moveTo(-r * 0.7, -r * 0.1);
    c.quadraticCurveTo(0, r * 0.06, r * 0.55, -r * 0.18);
    c.stroke();
    c.fillStyle = '#a8362b';
    c.beginPath();
    c.arc(-r * 0.06, -r * 0.02, r * 0.13, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f3e7cf';
    c.font = '600 ' + Math.round(r * 0.18) + 'px "Noto Serif SC", "Songti SC", serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('将', -r * 0.06, -r * 0.02);
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    // 头顶旌旗
    c.strokeStyle = '#17130f';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(r * 0.1, -r * 0.62);
    c.lineTo(r * 0.1, -r * 1.42);
    c.stroke();
    c.fillStyle = '#a8362b';
    c.beginPath();
    c.moveTo(r * 0.1, -r * 1.4);
    c.lineTo(r * 0.95, -r * 1.26);
    c.lineTo(r * 0.1, -r * 1.08);
    c.closePath();
    c.fill();
  }

  /* Boss 弹幕与本源：来袭墨弹 + 本源阶位 + 逼近路径 */
  function bossCoreStart(boss) { return boss.baseY + boss.r * 1.6; }

  function drawBossShots() {
    var c = ctx;
    for (var i = 0; i < state.bossShots.length; i++) {
      var s = state.bossShots[i];
      if (s.dead) continue;
      // 拖尾：让墨弹读作飞行弹丸而非纸面污渍
      var sp = Math.sqrt((s.vx || 0) * (s.vx || 0) + (s.vy || 0) * (s.vy || 0)) || 1;
      for (var k = 3; k >= 1; k--) {
        c.fillStyle = 'rgba(140,40,28,' + (0.26 - k * 0.07) + ')';
        c.beginPath();
        c.arc(s.x - (s.vx / sp) * k * 13, s.y - (s.vy / sp) * k * 13, 11 - k * 1.8, 0, Math.PI * 2);
        c.fill();
      }
      var g = c.createRadialGradient(s.x, s.y, 1, s.x, s.y, 22);
      g.addColorStop(0, 'rgba(196,86,58,0.95)');
      g.addColorStop(0.5, 'rgba(140,40,28,0.55)');
      g.addColorStop(1, 'rgba(120,32,22,0)');
      c.fillStyle = g;
      c.beginPath();
      c.arc(s.x, s.y, 22, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#7d2119';
      c.beginPath();
      c.arc(s.x, s.y, 8, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(243,231,207,0.75)';
      c.lineWidth = 1.7;
      c.beginPath();
      c.arc(s.x, s.y, 8, 0, Math.PI * 2);
      c.stroke();
    }
  }

  function drawBossFx() {
    var c = ctx;
    var boss = state.boss;
    if (!boss || boss.dead) return;
    var pulse = 0.5 + 0.5 * Math.sin(state.time * 3 + boss.phase);
    var c0 = bossCoreStart(boss);
    var cx = boss.coreX || boss.x;
    c.save();
    // 本体与本源之间的煞气连线
    c.strokeStyle = 'rgba(168,54,43,' + (0.2 + pulse * 0.16) + ')';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(boss.x, boss.y + boss.r * 0.5);
    c.quadraticCurveTo(boss.x + (cx - boss.x) * 0.4, boss.y + boss.r * 1.1, cx, c0);
    c.stroke();
    c.strokeStyle = 'rgba(168,54,43,' + (0.16 + pulse * 0.12) + ')';
    c.lineWidth = 1.6;
    c.setLineDash([5, 7]);
    c.beginPath();
    c.moveTo(cx, c0);
    c.lineTo(cx, boss.wallY);
    c.stroke();
    c.setLineDash([]);
    for (var k = 0; k <= boss.coreMax; k++) {
      var yy = c0 + (boss.wallY - c0) * (k / boss.coreMax);
      var on = k <= boss.coreStep;
      c.fillStyle = on ? 'rgba(168,54,43,0.9)' : 'rgba(23,19,15,0.22)';
      c.beginPath();
      c.arc(cx, yy, on ? 2.8 : 2, 0, Math.PI * 2);
      c.fill();
    }
    var cy = boss.coreY;
    var rr = 11 + pulse * 3;
    var cg = c.createRadialGradient(cx, cy, 1, cx, cy, rr * 2.4);
    cg.addColorStop(0, 'rgba(226,132,92,0.98)');
    cg.addColorStop(0.42, 'rgba(168,54,43,0.72)');
    cg.addColorStop(1, 'rgba(120,32,22,0)');
    c.fillStyle = cg;
    c.beginPath();
    c.arc(cx, cy, rr * 2.4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f3e7cf';
    c.font = '700 ' + Math.round(rr * 0.92) + 'px "Noto Serif SC", "Songti SC", serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('源', cx, cy);
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.restore();
  }

  function drawEnemyHp(e) {
    if (e.hp >= e.maxHp) return;
    var c = ctx;
    var w = Math.max(38, e.r * 2.4);
    var hgt = 4.5;
    var pct = clamp(e.hp / e.maxHp, 0, 1);
    c.save();
    c.translate(e.x, e.y - e.r - 22);
    c.fillStyle = 'rgba(23,19,15,0.22)';
    c.fillRect(-w / 2, 0, w, hgt);
    c.fillStyle = (e.type === 'brute' || e.type === 'boss') ? '#a8362b' : '#39463a';
    c.fillRect(-w / 2, 0, w * pct, hgt);
    c.restore();
  }

  /* ---------------- 玩家 ---------------- */
  function drawPlayer(dt) {
    var c = ctx;
    var bob = Math.sin(state.time * 2.1) * 2;
    var baseX = PLAYER.x;
    var baseY = PLAYER.y + 26 + bob;
    var tier = state.tier;
    var pf = playerH / 320;

    // 高段位气场
    if (tier >= 2) {
      var col = D.TIERS[tier].color;
      var pl = 0.5 + 0.5 * Math.sin(state.time * 3.4);
      c.save();
      c.globalAlpha = 0.10 + pl * 0.1;
      c.strokeStyle = col;
      c.lineWidth = 2.2;
      c.beginPath();
      c.ellipse(baseX, baseY - 6, (94 + tier * 7) * pf, (27 + tier * 2.4) * pf, 0, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 0.22 + pl * 0.18;
      c.beginPath();
      c.arc(baseX, baseY - 148 * pf, (64 + tier * 3) * pf, 0, Math.PI * 2);
      c.stroke();
      for (var i = 0; i < tier; i++) {
        var ta = state.time * (0.7 + i * 0.12) + i * 1.4;
        var rr = (78 + i * 4) * pf;
        c.globalAlpha = 0.35;
        c.fillStyle = i % 2 ? col : '#17130f';
        c.beginPath();
        c.arc(baseX + Math.cos(ta) * rr, baseY - 140 * pf + Math.sin(ta) * 40 * pf, 2.6, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }

    // 足下墨影
    c.save();
    c.globalAlpha = 0.2;
    c.fillStyle = '#17130f';
    c.beginPath();
    c.ellipse(baseX, baseY - 2, 58 * pf, 15 * pf, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    var torsoY = PLAYER.y - playerH * 0.235;
    var handX = baseX + 30 * pf;

    // 蓄力光
    if (state.charge > 0) {
      c.save();
      c.globalAlpha = Math.min(0.6, state.charge);
      var cg = c.createRadialGradient(handX, torsoY, 2, handX, torsoY, 86 * pf);
      var wcol = state.weapon === 'sword' ? '190,170,120' : state.weapon === 'staff' ? '150,110,90' : state.weapon === 'brush' ? '74,112,142' : '168,54,43';
      cg.addColorStop(0, 'rgba(' + wcol + ',0.55)');
      cg.addColorStop(1, 'rgba(' + wcol + ',0)');
      c.fillStyle = cg;
      c.beginPath();
      c.arc(handX, torsoY, 86 * pf, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    var img = playerImage;
    if (img && img.complete && img.naturalWidth) {
      var sc = 1 + state.recoil * 0.04;
      var iw = playerH * 0.75 * sc;
      var ih = playerH * sc;
      var px = baseX - iw / 2;
      var py = baseY - ih + 9;
      c.drawImage(img, px, py, iw, ih);

      // 武器独立图层：按立绘掌心锚点叠加，换武器只换这一层
      var anchor = SKINS.portraitAnchor(state.charId, state.gender);
      var wp = SKINS.weaponPose(state.weapon, anchor);
      SKINS.drawWeapon(
        c, state.weapon,
        px + (anchor.x + wp.dx) * iw,
        py + (anchor.y + wp.dy) * ih,
        (ih / 1024) * anchor.scale,
        wp.rot - state.recoil * 0.18,
        anchor.dir
      );
    } else {
      // 占位：无立绘时画一枚墨人
      c.save();
      c.fillStyle = 'rgba(23,19,15,0.9)';
      c.beginPath();
      c.arc(baseX, baseY - 210, 30, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(baseX - 42, baseY - 176);
      c.quadraticCurveTo(baseX, baseY - 200, baseX + 42, baseY - 176);
      c.lineTo(baseX + 30, baseY - 20);
      c.lineTo(baseX - 30, baseY - 20);
      c.closePath();
      c.fill();
      c.restore();
    }

    // 就绪脉动
    if (state.focus && state.focus.ready) {
      var pul = 0.55 + 0.45 * Math.sin(state.time * 7);
      c.save();
      c.globalAlpha = 0.35 + pul * 0.3;
      c.strokeStyle = '#b9933f';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(baseX + 30 * pf, torsoY, (20 + pul * 7) * pf, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
  }

  /* ---------------- 词帖 ---------------- */
  /* ---------------- 长文书卷（城楼两侧） ---------------- */
  function longTokW(t, cfs) {
    var ch = t.ch;
    if (ch === ' ') return cfs * 0.34;
    if (/[A-Za-z]/.test(ch)) return cfs * 0.58;
    if ('，、；：,;:。！？!?'.indexOf(ch) !== -1) return cfs * 0.62;
    return cfs;
  }

  function layoutLongLines(tokens, maxW, cfs) {
    var lines = [], line = [], wsum = 0;
    function pushLine() {
      if (line.length) lines.push(line);
      line = [];
      wsum = 0;
    }
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      var tw = longTokW(t, cfs);
      if (line.length && wsum + tw > maxW) {
        var cut = -1;
        if (t.letter && !t.wStart) {
          for (var k = line.length - 1; k >= 0; k--) {
            if (line[k].wEnd || line[k].ch === ' ') { cut = k; break; }
          }
        }
        if (cut > 0 && cut < line.length - 1) {
          var rest = line.slice(cut + 1);
          line = line.slice(0, cut + 1);
          pushLine();
          line = rest;
          for (var q = 0; q < rest.length; q++) wsum += longTokW(rest[q], cfs);
          if (wsum + tw > maxW) pushLine();
        } else {
          pushLine();
        }
      }
      line.push(t);
      wsum += tw;
    }
    pushLine();
    // 行首不留标点
    for (var n = 1; n < lines.length; n++) {
      var first = lines[n][0];
      if (first && first.ch && '，、；：。！？,;:.!?'.indexOf(first.ch) !== -1 && lines[n].length > 1) {
        lines[n - 1].push(lines[n].shift());
      }
    }
    return lines;
  }

  function drawLongPanel(tokens, x, y, w, h, L, side) {
    var c = ctx;
    var focused = state.focus === null && state.long === L;
    var cfs = clamp(w / 12.5, 16, 22);
    var pad = 13;
    var headH = 24;
    var footH = 15;
    var availW = w - pad * 2;
    var availH = h - headH - footH;
    var lineH = cfs * 1.52;
    var lines = layoutLongLines(tokens, availW, cfs);
    // 窄屏或超长句时逐级缩小字号，保证整批文字都能显示
    while (lines.length * lineH > availH && cfs > 13) {
      cfs -= 1;
      lineH = cfs * 1.52;
      lines = layoutLongLines(tokens, availW, cfs);
    }
    var maxLines = Math.max(1, Math.floor(availH / lineH));
    if (lines.length > maxLines) lines = lines.slice(0, maxLines);

    c.save();
    c.translate(x, y);

    // 纸卷
    c.shadowColor = 'rgba(30,25,18,0.28)';
    c.shadowBlur = 20;
    c.shadowOffsetY = 6;
    roundRect(c, 0, 0, w, h, 6);
    var g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(251,246,233,0.93)');
    g.addColorStop(0.6, 'rgba(245,237,220,0.92)');
    g.addColorStop(1, 'rgba(236,225,204,0.9)');
    c.fillStyle = g;
    c.fill();
    c.shadowColor = 'transparent';
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;
    c.strokeStyle = 'rgba(23,19,15,0.26)';
    c.lineWidth = 1.2;
    c.stroke();
    c.strokeStyle = 'rgba(168,54,43,0.16)';
    c.lineWidth = 1;
    roundRect(c, 5, 5, w - 10, h - 10, 4);
    c.stroke();
    if (L.errFlash > 0) {
      c.fillStyle = 'rgba(120,44,32,' + (L.errFlash * 0.10) + ')';
      roundRect(c, 0, 0, w, h, 6);
      c.fill();
    }

    // 卷首
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    var seal = side === 'left' ? '文' : '章';
    c.fillStyle = 'rgba(168,54,43,0.9)';
    c.fillRect(pad, 8, 13, 13);
    c.fillStyle = 'rgba(247,240,227,0.96)';
    c.font = '700 9px ' + CN_FONT;
    c.textAlign = 'center';
    c.fillText(seal, pad + 6.5, 15);
    c.textAlign = 'left';
    c.fillStyle = 'rgba(23,19,15,0.62)';
    c.font = '700 10px ' + CN_FONT;
    var title = side === 'left' ? (L.entry ? L.entry.s : '长文') : ('难度 ' + ((L.entry && L.entry.lv) || 1) + ' · 第 ' + L.batchNo + ' 批');
    c.fillText(title, pad + 19, 15);

    // 正文
    var top = headH + 10 + lineH / 2;
    for (var li = 0; li < lines.length; li++) {
      var row = lines[li];
      var rowW = 0;
      for (var m = 0; m < row.length; m++) rowW += longTokW(row[m], cfs);
      var cx = pad + (availW - rowW) / 2;
      var ry = top + li * lineH;
      for (var j = 0; j < row.length; j++) {
        var t = row[j];
        var tw = longTokW(t, cfs);
        var mx = cx + tw / 2;
        if (t.ch === ' ') { cx += tw; continue; }
        var isLetter = t.letter;
        var typed = t.le > t.ls && t.le <= L.progress;
        var current = t.le > t.ls && t.ls < L.progress && L.progress < t.le;
        if (t.le === t.ls && '，、；：。！？,;:.!?'.indexOf(t.ch) !== -1) {
          c.font = Math.round(cfs * 0.66) + 'px ' + CN_FONT;
          c.fillStyle = 'rgba(23,19,15,0.26)';
          c.textAlign = 'center';
          c.fillText(t.ch, mx, ry + cfs * 0.16);
          cx += tw;
          continue;
        }
        if (current) {
          c.fillStyle = 'rgba(168,54,43,0.13)';
          roundRect(c, mx - cfs * 0.62, ry - cfs * 0.66, cfs * 1.24, cfs * 1.3, 3);
          c.fill();
        }
        c.font = (isLetter ? '600 ' : '700 ') + Math.round(cfs) + 'px ' + (isLetter ? 'Georgia, "Times New Roman", serif' : CN_FONT);
        c.textAlign = 'center';
        c.fillStyle = current ? '#a8362b' : typed ? '#17130f' : 'rgba(23,19,15,0.40)';
        c.fillText(t.ch, mx, isLetter ? ry + cfs * 0.04 : ry);
        if (current) {
          c.strokeStyle = 'rgba(168,54,43,0.65)';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(mx - cfs * 0.34, ry + cfs * 0.56);
          c.lineTo(mx + cfs * 0.34, ry + cfs * 0.56);
          c.stroke();
        }
        cx += tw;
      }
    }

    // 卷尾
    c.textAlign = 'left';
    c.font = '9px ' + CN_FONT;
    c.fillStyle = 'rgba(23,19,15,0.34)';
    var footY = h - 9;
    if (side === 'left') {
      c.fillText('本批 ' + L.batchSentences + ' 句 · 输完自动换卷', pad, footY);
    } else {
      c.fillText('落墨 ' + L.progress + ' / ' + L.letters.length, pad, footY);
      c.textAlign = 'right';
      c.fillStyle = 'rgba(168,54,43,0.55)';
      c.fillText('词末·重击 / 句末·超重击', w - pad, footY);
    }

    c.restore();
  }

  function drawLongPanels() {
    var L = state.long;
    if (!L || !state.running || !L.tokens || !L.tokens.length) return;
    if (L.article) { drawArticleBlocks(); return; }
    var pw = clamp(W * 0.25, 200, 350);
    var gap = W * 0.06;
    var top = H * 0.155;
    // 面板高度随本批行数收缩，避免短句留下大片空白
    var cfs = clamp(pw / 12.5, 16, 22);
    var lineH = cfs * 1.52;
    var availW = pw - 26;
    var nb = Math.max(
      layoutLongLines(L.leftTokens, availW, cfs).length,
      layoutLongLines(L.rightTokens, availW, cfs).length
    );
    var hh = clamp(24 + 15 + nb * lineH + 20, H * 0.17, H * 0.40);
    var lx = W / 2 - gap - pw;
    var rx = W / 2 + gap;
    drawLongPanel(L.leftTokens, lx, top, pw, hh, L, 'left');
    drawLongPanel(L.rightTokens, rx, top, pw, hh, L, 'right');
  }

  function drawSlips() {
    if (state.drill) return;
    var c = ctx;
    var f = state.focus;
    if (f && !f.removed) {
      c.save();
      c.setLineDash([3, 11]);
      c.lineDashOffset = -state.time * 26;
      c.strokeStyle = 'rgba(168,54,43,0.24)';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(f.x, f.y + f.h / 2);
      c.quadraticCurveTo(f.x, (f.y + PLAYER.y) / 2 + 30, PLAYER.x + 30, playerTorso() - playerH * 0.14);
      c.stroke();
      c.restore();
    }
    for (var i = 0; i < state.slips.length; i++) {
      if (state.slips[i].removed) continue;
      if (state.slips[i].boss) drawBossSentence(state.slips[i]);
      else drawSlip(state.slips[i]);
    }
  }

  /* Boss 整句面板：分行汉字 + 逐字拼音进度 + 出处与难度 */
  function drawBossSentence(s) {
    var c = ctx;
    var focus = state.focus === s;
    var word = s.word || {};
    var chars = word.chars || [];
    var syl = word.syllables || [];
    var disp = String(word.display || word.text || '');
    var w = s.w, h = s.h;
    var bob = Math.sin(state.time * 1.2) * 2;

    // 展示字符序列：汉字标 ci 序号，标点 ci=-1 并绑定对应键位
    var items = [], ci = 0, pqi = 0;
    var puncts = word.puncts || [];
    for (var i = 0; i < disp.length; i++) {
      var ch = disp.charAt(i);
      if (/[\u4e00-\u9fa5]/.test(ch)) items.push({ ch: ch, ci: ci++ });
      else if (PUNCT_KEYS[ch]) {
        items.push({ ch: ch, ci: -1, pt: puncts[pqi] ? puncts[pqi].token : -1 });
        pqi++;
      } else items.push({ ch: ch, ci: -1, pt: -1 });
    }
    if (!items.length) return;

    // 每字键位区间（汉字拼音字母，标点单独成键）
    var ranges = word.charRanges || [];
    var keys = word.keys || [];
    var totalKeys = keys.length;
    var progress = clamp(s.progress || 0, 0, totalKeys);

    // 版式：按字数与面板宽度铺行
    var cw = clamp((w - 84) / Math.max(6, Math.min(items.length, 20)), 22, 38);
    var maxPer = Math.max(6, Math.floor((w - 72) / cw));
    var cfs = clamp(cw * 0.82, 18, 30);
    var lines = [[]];
    for (var m = 0; m < items.length; m++) {
      var line = lines[lines.length - 1];
      if (line.length >= maxPer && items[m].ci >= 0) lines.push([]);
      lines[lines.length - 1].push(items[m]);
    }

    var rowH = cfs + 20;
    var areaTop = -h / 2 + 30;
    var areaBot = h / 2 - 24;
    var textH = lines.length * rowH;
    var y0 = areaTop + Math.max(0, (areaBot - areaTop - textH) / 2) + rowH / 2;

    c.save();
    c.translate(s.x, s.y + bob);
    c.globalAlpha = focus ? 1 : 0.9;

    // 纸
    c.shadowColor = 'rgba(30,25,18,0.32)';
    c.shadowBlur = 24;
    c.shadowOffsetY = 7;
    roundRect(c, -w / 2, -h / 2, w, h, 7);
    var g = c.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, 'rgba(252,247,236,0.985)');
    g.addColorStop(0.62, 'rgba(246,238,222,0.975)');
    g.addColorStop(1, 'rgba(238,227,206,0.965)');
    c.fillStyle = g;
    c.fill();
    c.shadowColor = 'transparent';
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;

    // 边框与焦点角
    c.strokeStyle = focus ? 'rgba(168,54,43,0.72)' : 'rgba(23,19,15,0.30)';
    c.lineWidth = focus ? 2 : 1.3;
    c.stroke();
    c.strokeStyle = 'rgba(168,54,43,0.18)';
    c.lineWidth = 1;
    roundRect(c, -w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 5);
    c.stroke();
    if (focus) {
      c.strokeStyle = 'rgba(168,54,43,0.8)';
      c.lineWidth = 2.2;
      var cx = w / 2 + 6, cy = h / 2 + 6, ln = 14;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
        c.beginPath();
        c.moveTo(q[0] * cx, q[1] * cy - q[1] * ln);
        c.lineTo(q[0] * cx, q[1] * cy);
        c.lineTo(q[0] * cx - q[0] * ln, q[1] * cy);
        c.stroke();
      });
    }

    // 错字墨晕
    if (s.errFlash > 0) {
      c.fillStyle = 'rgba(120,44,32,' + (s.errFlash * 0.14) + ')';
      roundRect(c, -w / 2, -h / 2, w, h, 7);
      c.fill();
    }

    // 标题行
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.font = '700 11px ' + CN_FONT;
    c.fillStyle = 'rgba(168,54,43,0.9)';
    c.fillText('BOSS · 整句输入', -w / 2 + 14, -h / 2 + 18);
    c.textAlign = 'right';
    c.font = '10px ' + CN_FONT;
    c.fillStyle = 'rgba(23,19,15,0.42)';
    c.fillText((word.src || '佚名') + ' · 难度 ' + (word.lv || 1), w / 2 - 14, -h / 2 + 18);

    // 正文
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (var li = 0; li < lines.length; li++) {
      var row = lines[li];
      var rowY = y0 + li * rowH;
      var startX = -(row.length - 1) * cw / 2;
      for (var j = 0; j < row.length; j++) {
        var it = row[j];
        var x = startX + j * cw;
        if (it.ci < 0) {
          // 标点：必须实际输入，按对应键位；未打淡墨，当前标点朱红提示键位
          if (it.pt >= 0) {
            var ptyped = progress > it.pt;
            var pcur = progress === it.pt;
            c.font = '700 ' + Math.round(cfs * 0.74) + 'px ' + CN_FONT;
            c.fillStyle = ptyped ? 'rgba(23,19,15,0.88)' : pcur ? '#a8362b' : 'rgba(23,19,15,0.38)';
            c.fillText(it.ch, x, rowY + cfs * 0.12);
            if (pcur && focus) {
              c.strokeStyle = 'rgba(168,54,43,0.55)';
              c.lineWidth = 2;
              c.beginPath();
              c.moveTo(x - cw * 0.28, rowY + cfs * 0.52);
              c.lineTo(x + cw * 0.28, rowY + cfs * 0.52);
              c.stroke();
              c.font = '600 ' + Math.max(8, Math.min(11, Math.round(cfs * 0.4))) + 'px Georgia, "Times New Roman", serif';
              c.fillStyle = 'rgba(168,54,43,0.92)';
              c.fillText(keys[it.pt].ch, x, rowY + cfs * 0.8);
            }
          } else {
            c.font = '400 ' + Math.round(cfs * 0.66) + 'px ' + CN_FONT;
            c.fillStyle = 'rgba(23,19,15,0.30)';
            c.fillText(it.ch, x, rowY + cfs * 0.18);
          }
          continue;
        }
        var rg = ranges[it.ci] || { start: 0, end: 0 };
        var typed = progress >= rg.end && rg.end > rg.start;
        var partial = !typed && progress > rg.start && progress <= rg.end;
        c.font = '700 ' + Math.round(cfs) + 'px ' + CN_FONT;
        c.fillStyle = typed ? '#17130f' : partial ? '#3a332a' : 'rgba(23,19,15,0.40)';
        c.fillText(it.ch, x, rowY);

        // 当前字下划线
        if (partial && focus) {
          c.strokeStyle = 'rgba(168,54,43,0.6)';
          c.lineWidth = 2.2;
          c.beginPath();
          c.moveTo(x - cw * 0.32, rowY + cfs * 0.54);
          c.lineTo(x + cw * 0.32, rowY + cfs * 0.54);
          c.stroke();
        }

        // 拼音：逐字母着色
        var py = (syl[it.ci] || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (py) {
          var padv = Math.min(5.2, (cw - 2) / py.length);
          var pw = py.length * padv;
          var px0 = x - pw / 2 + padv / 2;
          c.font = '600 ' + Math.max(8, Math.min(11, Math.round(padv * 1.7))) + 'px Georgia, "Times New Roman", serif';
          for (var q = 0; q < py.length; q++) {
            var idx = rg.start + q;
            c.fillStyle = idx < progress ? 'rgba(168,54,43,0.9)' : 'rgba(23,19,15,0.32)';
            c.fillText(py.charAt(q), px0 + q * padv, rowY + cfs * 0.62);
          }
        }
      }
    }

    // 脚注：规则提示 + 已释放次数 + 守将余血
    c.textAlign = 'left';
    c.font = '10px ' + CN_FONT;
    c.fillStyle = 'rgba(23,19,15,0.38)';
    var footY = h / 2 - 13;
    c.fillText('一字一击 · 标点需输入（，→ , 。→ . ；→ ; ！→ ! ？→ ?）', -w / 2 + 14, footY);
    if (state.boss && !state.boss.dead) {
      c.textAlign = 'right';
      c.fillStyle = 'rgba(168,54,43,0.62)';
      c.fillText('本源 ' + state.boss.coreStep + ' / ' + state.boss.coreMax +
        ' · 守将 ' + Math.max(0, Math.ceil(state.boss.hp)) + ' / ' + state.boss.maxHp, w / 2 - 14, footY);
    }

    // 输入中提示（IME）
    if (s.imeRaw) {
      c.textAlign = 'center';
      c.font = '11px ' + CN_FONT;
      c.fillStyle = 'rgba(168,54,43,0.78)';
      c.fillText('输入 · ' + s.imeRaw, 0, footY);
    }

    c.restore();
  }

  function drawSlip(s) {
    var c = ctx;
    var focus = state.focus === s;
    var bob = Math.sin(state.time * 1.4 + s.bob) * 2.5;
    var age = state.time - s.born;
    var sc = age < 0.22 ? 0.9 + 0.1 * (age / 0.22) : 1;
    var w = s.w, h = s.h;

    c.save();
    c.translate(s.x, s.y + bob);
    c.rotate(s.rot * Math.PI / 180);
    c.scale(sc, sc);
    c.globalAlpha = focus ? 1 : 0.88;

    // 纸
    c.shadowColor = 'rgba(30,25,18,0.3)';
    c.shadowBlur = focus ? 22 : 10;
    c.shadowOffsetY = 6;
    roundRect(c, -w / 2, -h / 2, w, h, 5);
    var g = c.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, 'rgba(251,246,234,0.98)');
    g.addColorStop(0.6, 'rgba(245,237,220,0.97)');
    g.addColorStop(1, 'rgba(238,228,208,0.96)');
    c.fillStyle = g;
    c.fill();
    c.shadowColor = 'transparent';
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;

    // 边框
    c.strokeStyle = s.ready
      ? 'rgba(185,147,63,0.9)'
      : focus ? 'rgba(168,54,43,0.62)' : 'rgba(23,19,15,0.26)';
    c.lineWidth = focus ? 1.9 : 1.2;
    c.stroke();

    // 焦点四角
    if (focus) {
      c.strokeStyle = 'rgba(168,54,43,0.75)';
      c.lineWidth = 2;
      var cx = w / 2 + 5, cy = h / 2 + 5, ln = 12;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
        c.beginPath();
        c.moveTo(q[0] * cx, q[1] * cy - q[1] * ln);
        c.lineTo(q[0] * cx, q[1] * cy);
        c.lineTo(q[0] * cx - q[0] * ln, q[1] * cy);
        c.stroke();
      });
    }

    // 错字墨晕
    if (s.errFlash > 0) {
      c.fillStyle = 'rgba(120,44,32,' + (s.errFlash * 0.16) + ')';
      roundRect(c, -w / 2, -h / 2, w, h, 5);
      c.fill();
    }

    // 纸纤维
    c.strokeStyle = 'rgba(120,105,80,0.10)';
    c.lineWidth = 0.8;
    for (var i = 0; i < 5; i++) {
      var fy = -h / 2 + (i + 1) * (h / 6);
      c.beginPath();
      c.moveTo(-w / 2 + 12, fy);
      c.lineTo(-w / 2 + 12 + (w - 24) * (0.4 + pseudo(s.id + i) * 0.6), fy);
      c.stroke();
    }

    if (s.word.en) drawEnWord(s, w, h, focus);
    else drawZhWord(s, w, h, focus);

    var mul = lengthMul(s.word);
    if (mul > 1) {
      c.save();
      c.font = '600 10px ' + CN_FONT;
      c.fillStyle = 'rgba(168,54,43,0.82)';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText('长词 ×' + mul, -w / 2 + 10, -h / 2 + 11);
      c.restore();
    }

    if (s.ready) drawReadySeal(s, w, h);

    c.restore();
  }

  /* 英文重击后的释义笺：停留约 1.05s，再用 0.85s 上扬散墨 */
  function drawMeanings() {
    var c = ctx;
    for (var i = 0; i < state.meanings.length; i++) {
      var m = state.meanings[i];
      var t = m.t;
      var alpha = t < 1.05 ? 1 : Math.max(0, 1 - (t - 1.05) / 0.85);
      if (alpha <= 0.01) continue;
      var rise = t < 1.05 ? 0 : (t - 1.05) * 32;
      var w = 190, h = 78;
      var fs = m.text.length <= 3 ? 30 : m.text.length <= 4 ? 26 : 21;

      c.save();
      c.globalAlpha = alpha;
      c.translate(m.x, m.y - rise);
      c.rotate(-0.8 * Math.PI / 180);

      c.shadowColor = 'rgba(30,25,18,0.28)';
      c.shadowBlur = 16;
      c.shadowOffsetY = 5;
      roundRect(c, -w / 2, -h / 2, w, h, 5);
      c.fillStyle = 'rgba(250,244,231,0.96)';
      c.fill();
      c.shadowColor = 'transparent';
      c.shadowBlur = 0;
      c.shadowOffsetY = 0;
      c.strokeStyle = 'rgba(168,54,43,0.5)';
      c.lineWidth = 1.2;
      c.stroke();

      c.strokeStyle = 'rgba(168,54,43,0.7)';
      c.lineWidth = 1.3;
      c.strokeRect(-w / 2 + 9, -h / 2 + 9, 18, 18);
      c.fillStyle = '#a8362b';
      c.font = '700 12px ' + CN_FONT;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('释', -w / 2 + 18, -h / 2 + 18.5);

      c.font = '600 11px ' + EN_FONT;
      c.fillStyle = 'rgba(23,19,15,0.45)';
      c.textAlign = 'right';
      c.fillText(m.en, w / 2 - 10, -h / 2 + 17);

      c.textAlign = 'center';
      c.font = '700 ' + fs + 'px ' + CN_FONT;
      c.fillStyle = '#17130f';
      c.fillText(m.text, 0, 8);

      c.font = '9px ' + CN_FONT;
      c.fillStyle = 'rgba(23,19,15,0.32)';
      c.fillText('墨迹将散', 0, h / 2 - 10);

      c.restore();
    }
  }

  function drawEnWord(s, w, h, focus) {
    var c = ctx;
    var letters = s.word.letters;
    var n = letters.length;
    var fs = wordFontSize(n);
    var adv = Math.min(fs * 0.74, (w - 36) / n);
    var start = -(n - 1) * adv / 2;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '700 ' + fs + 'px ' + EN_FONT;

    for (var i = 0; i < n; i++) {
      var done = i < s.progress;
      var cur = i === s.progress && focus;
      var x = start + i * adv;
      c.fillStyle = done ? '#17130f' : cur ? '#a8362b' : 'rgba(23,19,15,0.38)';
      c.fillText(letters.charAt(i), x, -8);
      if (cur) {
        c.strokeStyle = 'rgba(168,54,43,0.55)';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x - adv * 0.3, -8 + fs * 0.56);
        c.lineTo(x + adv * 0.3, -8 + fs * 0.56);
        c.stroke();
      } else if (done) {
        c.fillStyle = 'rgba(23,19,15,0.25)';
        c.beginPath();
        c.arc(x, -8 + fs * 0.52, 1.6, 0, Math.PI * 2);
        c.fill();
      }
    }

    c.font = '10px ' + EN_FONT;
    c.fillStyle = 'rgba(23,19,15,0.35)';
    c.fillText('SPACE 重击 · ENTER 终极', 0, h / 2 - 13);
  }

  function drawZhWord(s, w, h, focus) {
    var c = ctx;
    var chars = s.word.chars;
    var n = chars.length;
    var syl = s.word.syllables || [];
    var cfs = n <= 2 ? 50 : n <= 3 ? 44 : n <= 4 ? 38 : 32;
    var charW = Math.min(68, (w - 46) / n);
    var start = -(n - 1) * charW / 2;

    // 每个字对应的拼音字母区间
    var cum = [0];
    var k;
    for (k = 0; k < n; k++) {
      var pl0 = (syl[k] || '').replace(/[^a-zA-Z]/g, '');
      cum.push(cum[k] + pl0.length);
    }

    c.textAlign = 'center';
    c.textBaseline = 'middle';

    for (var i = 0; i < n; i++) {
      var x = start + i * charW;
      var typed = s.progress >= cum[i + 1] && cum[i + 1] > cum[i];
      var partial = !typed && s.progress > cum[i];
      var isLastTyped = typed && (i === n - 1 || s.progress < cum[i + 1] + 1);

      c.font = '700 ' + cfs + 'px ' + CN_FONT;
      c.fillStyle = typed ? '#17130f' : partial ? '#3a332a' : 'rgba(23,19,15,0.40)';
      c.fillText(chars[i], x, -12);

      if (isLastTyped && focus) {
        c.strokeStyle = 'rgba(168,54,43,0.5)';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x - charW * 0.32, 14);
        c.lineTo(x + charW * 0.32, 14);
        c.stroke();
      }

      // 拼音
      var py = (syl[i] || '').replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (py) {
        var padv = 8.6;
        var pw = py.length * padv;
        var px0 = x - pw / 2 + padv / 2;
        c.font = '600 13px Georgia, "Times New Roman", serif';
        for (var j = 0; j < py.length; j++) {
          var idx = cum[i] + j;
          var okL = idx < s.progress;
          c.fillStyle = okL ? 'rgba(168,54,43,0.9)' : 'rgba(23,19,15,0.36)';
          c.fillText(py.charAt(j), px0 + j * padv, 26);
        }
      }
    }

    if (s.imeRaw) {
      c.font = '12px ' + CN_FONT;
      c.fillStyle = 'rgba(168,54,43,0.8)';
      c.textAlign = 'center';
      c.fillText('输入 · ' + s.imeRaw, 0, h / 2 - 14);
    }
  }

  function drawReadySeal(s, w, h) {
    var c = ctx;
    var pulse = 1 + 0.07 * Math.sin(state.time * 6.5);
    c.save();
    c.translate(w / 2 - 27, -h / 2 + 24);
    c.rotate(0.1);
    c.scale(pulse, pulse);
    c.strokeStyle = 'rgba(168,54,43,0.85)';
    c.lineWidth = 2;
    c.strokeRect(-16, -16, 32, 32);
    c.strokeStyle = 'rgba(168,54,43,0.32)';
    c.lineWidth = 1;
    c.strokeRect(-12.5, -12.5, 25, 25);
    c.fillStyle = 'rgba(168,54,43,0.88)';
    c.font = '700 19px ' + CN_FONT;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('击', 0, 1);
    c.restore();

    // 金色呼吸边
    c.save();
    c.globalAlpha = 0.35 + 0.25 * Math.sin(state.time * 5);
    c.strokeStyle = '#b9933f';
    c.lineWidth = 1.4;
    roundRect(c, -w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 7);
    c.stroke();
    c.restore();
  }

  /* ---------------- 投射物 ---------------- */
  var ART = {};

  function makeSprite(w, h, paint) {
    var cv = document.createElement('canvas');
    cv.width = Math.round(w * 2);
    cv.height = Math.round(h * 2);
    var g = cv.getContext('2d');
    g.scale(2, 2);
    paint(g, w, h);
    cv._w = w;
    cv._h = h;
    return cv;
  }

  function buildArt() {
    if (ART.arrow) return;
    ART.arrow = makeSprite(100, 44, function (g, w, h) { paintArrow(g, w / 2, h / 2, false); });
    ART.arrowHeavy = makeSprite(186, 74, function (g, w, h) { paintArrow(g, w / 2, h / 2, true); });
    ART.sword = makeSprite(124, 144, function (g, w, h) { paintSwordQi(g, w / 2, h / 2, false); });
    ART.swordHeavy = makeSprite(286, 316, function (g, w, h) { paintSwordQi(g, w / 2, h / 2, true); });
    ART.orb = makeSprite(124, 124, function (g, w, h) { paintOrb(g, w / 2, h / 2); });
    ART.inkDot = makeSprite(104, 74, function (g, w, h) { paintInkDot(g, w * 0.62, h / 2); });
  }

  /* 箭：笔锋形箭镞 + 纸羽 + 尾流墨痕 */
  function paintArrow(g, cx, cy, heavy) {
    g.translate(cx, cy);
    g.lineCap = 'round';
    if (heavy) { paintHeavyArrow(g); return; }

    // —— 轻箭：短促笔锋 ——
    g.globalAlpha = 0.28;
    g.strokeStyle = '#241d17';
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(-40, 1.5);
    g.quadraticCurveTo(-28, -3.4, -16, 0);
    g.stroke();
    g.globalAlpha = 0.16;
    g.lineWidth = 15;
    g.beginPath();
    g.moveTo(-48, 4);
    g.quadraticCurveTo(-32, -2, -20, 1);
    g.stroke();

    g.globalAlpha = 1;
    g.strokeStyle = '#17130f';
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(-22, 0.8);
    g.quadraticCurveTo(0, -1.5, 20, 0);
    g.stroke();
    g.strokeStyle = 'rgba(196,160,110,0.6)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-20, -1.8);
    g.quadraticCurveTo(0, -3.8, 18, -2);
    g.stroke();

    g.fillStyle = '#efe4cb';
    g.beginPath();
    g.moveTo(-20, -0.4);
    g.lineTo(-34, -9.6);
    g.quadraticCurveTo(-27, -3, -23.5, -0.2);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(-20.5, 0.8);
    g.lineTo(-35, 8.6);
    g.quadraticCurveTo(-27.5, 2.6, -24, 0.4);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(23,19,15,0.78)';
    g.lineWidth = 0.9;
    g.beginPath();
    g.moveTo(-20, -0.4);
    g.lineTo(-34, -9.6);
    g.moveTo(-20.5, 0.8);
    g.lineTo(-35, 8.6);
    g.stroke();

    var head = g.createLinearGradient(14, 0, 40, 0);
    head.addColorStop(0, '#2b2620');
    head.addColorStop(1, '#17130f');
    g.fillStyle = head;
    g.beginPath();
    g.moveTo(15, -6);
    g.quadraticCurveTo(30, -2.9, 40, 0);
    g.quadraticCurveTo(30, 2.9, 15, 6);
    g.lineTo(19, 0);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(246,236,210,0.92)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(16.6, -4.7);
    g.quadraticCurveTo(30, -1.8, 38, 0);
    g.stroke();
    g.fillStyle = '#a8362b';
    g.beginPath();
    g.arc(12.6, 0, 1.5, 0, Math.PI * 2);
    g.fill();
  }

  /* 蓄力巨箭：长杆 + 巨笔锋 + 纸羽 + 朱砂气 */
  function paintHeavyArrow(g) {
    // 尾流墨
    g.globalAlpha = 0.32;
    g.strokeStyle = '#241d17';
    g.lineWidth = 15;
    g.beginPath();
    g.moveTo(-78, 2);
    g.quadraticCurveTo(-52, -8, -28, 0);
    g.stroke();
    g.globalAlpha = 0.16;
    g.lineWidth = 26;
    g.beginPath();
    g.moveTo(-86, 7);
    g.quadraticCurveTo(-56, -5, -34, 2);
    g.stroke();

    // 朱砂气（细长、贴杆）
    g.globalAlpha = 0.34;
    g.strokeStyle = '#a8362b';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-58, -13);
    g.quadraticCurveTo(-26, -10, 2, -7);
    g.stroke();
    g.beginPath();
    g.moveTo(-60, 14);
    g.quadraticCurveTo(-28, 11, 2, 7);
    g.stroke();
    g.globalAlpha = 0.5;
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(-64, -19);
    g.quadraticCurveTo(-30, -15, 0, -11);
    g.stroke();
    g.beginPath();
    g.moveTo(-66, 20);
    g.quadraticCurveTo(-30, 16, 0, 12);
    g.stroke();

    // 箭杆
    g.globalAlpha = 1;
    g.strokeStyle = '#17130f';
    g.lineWidth = 5.2;
    g.beginPath();
    g.moveTo(-46, 0.6);
    g.quadraticCurveTo(-8, -2, 30, 0);
    g.stroke();
    g.strokeStyle = 'rgba(218,178,120,0.85)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(-43, -2.4);
    g.quadraticCurveTo(-8, -4.6, 27, -2.6);
    g.stroke();
    // 缠绳
    g.strokeStyle = 'rgba(168,54,43,0.9)';
    g.lineWidth = 2.2;
    for (var b = 0; b < 4; b++) {
      g.beginPath();
      g.moveTo(-30 + b * 12, -4.2);
      g.lineTo(-24 + b * 12, 4.2);
      g.stroke();
    }

    // 纸羽（三片，收在杆尾）
    g.fillStyle = '#f1e6cd';
    g.beginPath();
    g.moveTo(-34, -1);
    g.lineTo(-56, -13);
    g.quadraticCurveTo(-43, -3.5, -38, -0.5);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(-35, 1);
    g.lineTo(-57, 12);
    g.quadraticCurveTo(-43, 3.5, -38.5, 1);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(-38, 0);
    g.lineTo(-52, -1.5);
    g.lineTo(-45, -12);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(23,19,15,0.8)';
    g.lineWidth = 1.1;
    g.beginPath();
    g.moveTo(-34, -1); g.lineTo(-56, -13);
    g.moveTo(-35, 1); g.lineTo(-57, 12);
    g.stroke();

    // 巨笔锋箭镞
    var head = g.createLinearGradient(24, 0, 88, 0);
    head.addColorStop(0, '#2a231c');
    head.addColorStop(0.55, '#17130f');
    head.addColorStop(0.86, '#7d2119');
    head.addColorStop(1, '#a8362b');
    g.fillStyle = head;
    g.beginPath();
    g.moveTo(25, -10);
    g.quadraticCurveTo(56, -7, 78, -2.6);
    g.quadraticCurveTo(88, 0, 78, 2.6);
    g.quadraticCurveTo(56, 7, 25, 10);
    g.lineTo(34, 0);
    g.closePath();
    g.fill();
    // 刃口纸光
    g.strokeStyle = 'rgba(247,238,214,0.95)';
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(28, -7.4);
    g.quadraticCurveTo(56, -4.6, 80, 0);
    g.stroke();
    g.strokeStyle = 'rgba(168,54,43,0.7)';
    g.lineWidth = 1.1;
    g.beginPath();
    g.moveTo(28, 7.4);
    g.quadraticCurveTo(56, 4.6, 80, 0);
    g.stroke();
    // 飞白
    g.fillStyle = 'rgba(247,238,214,0.85)';
    g.beginPath();
    g.ellipse(46, -2, 7, 1.1, -0.06, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(23,19,15,0.75)';
    [[-70, -10, 2.2], [-74, 8, 1.7], [-52, 15, 1.4], [-80, -2, 1.6], [-46, -17, 1.2]].forEach(function (q) {
      g.beginPath();
      g.arc(q[0], q[1], q[2], 0, Math.PI * 2);
      g.fill();
    });
  }

  /* 剑气：厚墨弯月 + 纸白刃线 + 拖尾 */
  function paintSwordQi(g, cx, cy, heavy) {
    var s = heavy ? 2.05 : 1;
    g.translate(cx, cy);
    g.scale(s, s);
    g.lineCap = 'round';

    // 拖尾墨痕
    g.globalAlpha = 0.26;
    g.strokeStyle = '#2b241d';
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(-44, 7);
    g.quadraticCurveTo(-26, 2, -6, 0);
    g.stroke();
    g.globalAlpha = 0.16;
    g.lineWidth = 14;
    g.beginPath();
    g.moveTo(-52, 13);
    g.quadraticCurveTo(-28, 4, -8, 1);
    g.stroke();
    if (heavy) {
      g.globalAlpha = 0.24;
      g.strokeStyle = '#a8362b';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(-48, -9);
      g.quadraticCurveTo(-28, -4, -8, -1);
      g.stroke();
    }

    // 外圈淡墨
    if (heavy) {
      g.globalAlpha = 0.2;
      g.fillStyle = '#17130f';
      g.beginPath();
      g.moveTo(-6, -52);
      g.quadraticCurveTo(30, -18, 28, 0);
      g.quadraticCurveTo(30, 18, -6, 52);
      g.quadraticCurveTo(14, 0, -6, -52);
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
    }

    // 主体：细长笔锋弯月
    g.globalAlpha = 1;
    var body = g.createLinearGradient(-2, 0, 24, 0);
    body.addColorStop(0, '#17130f');
    body.addColorStop(1, heavy ? '#5e1c15' : '#2a231c');
    g.fillStyle = body;
    g.beginPath();
    g.moveTo(-4, -46);
    g.quadraticCurveTo(22, -16, 20, 0);
    g.quadraticCurveTo(22, 16, -4, 46);
    g.quadraticCurveTo(9, 0, -4, -46);
    g.closePath();
    g.fill();

    // 刃口白线
    g.strokeStyle = 'rgba(247,238,214,0.96)';
    g.lineWidth = 1.9;
    g.beginPath();
    g.moveTo(-2, -42);
    g.quadraticCurveTo(21, -14, 19, 0);
    g.stroke();
    // 内侧朱线
    g.strokeStyle = heavy ? 'rgba(168,54,43,0.95)' : 'rgba(47,66,87,0.75)';
    g.lineWidth = 1.3;
    g.beginPath();
    g.moveTo(-2, 42);
    g.quadraticCurveTo(9, 0, -2, -42);
    g.stroke();
    // 墨溅
    g.fillStyle = 'rgba(23,19,15,0.72)';
    [[7, -33, 1.2], [10, 30, 0.95], [-8, 48, 1.3], [-10, -47, 1.1]].forEach(function (q) {
      g.beginPath();
      g.arc(q[0], q[1], q[2], 0, Math.PI * 2);
      g.fill();
    });
  }

  /* 法球：墨球 + 纸光 + 朱砂火心 */
  function paintOrb(g, cx, cy) {
    g.translate(cx, cy);
    var halo = g.createRadialGradient(0, 0, 5, 0, 0, 38);
    halo.addColorStop(0, 'rgba(23,19,15,0.35)');
    halo.addColorStop(0.55, 'rgba(23,19,15,0.14)');
    halo.addColorStop(1, 'rgba(23,19,15,0)');
    g.fillStyle = halo;
    g.beginPath();
    g.arc(0, 0, 38, 0, Math.PI * 2);
    g.fill();

    // 飞白墨环：外圈断续笔触，避免正圆感
    g.lineCap = 'round';
    [[0.4, 0.95, 2.6, 0.34], [1.5, 2.1, 1.7, 0.26], [2.6, 3.3, 3.1, 0.3], [3.5, 4.3, 1.9, 0.22]].forEach(function (a) {
      g.globalAlpha = a[3];
      g.strokeStyle = '#17130f';
      g.lineWidth = a[2];
      g.beginPath();
      g.arc(0, 0, 23 + a[2] * 1.6, a[0], a[1]);
      g.stroke();
    });
    g.globalAlpha = 1;

    // 墨球本体（偏上留出纸白高光）
    var core = g.createRadialGradient(-7, -8, 1, 0, 0, 22);
    core.addColorStop(0, '#6d7a60');
    core.addColorStop(0.34, '#33342a');
    core.addColorStop(0.78, '#1c1813');
    core.addColorStop(1, '#17130f');
    g.fillStyle = core;
    g.beginPath();
    g.arc(0, 0, 21, 0, Math.PI * 2);
    g.fill();

    // 纸白月牙高光
    g.strokeStyle = 'rgba(250,242,222,0.72)';
    g.lineWidth = 3.1;
    g.beginPath();
    g.arc(0, 0, 15.5, -2.6, -1.15);
    g.stroke();
    g.strokeStyle = 'rgba(250,242,222,0.3)';
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(0, 0, 12.5, -2.5, -1.25);
    g.stroke();

    // 朱砂火心（双层，带跳动感）
    var ember = g.createRadialGradient(2.5, 4, 0.5, 2.5, 4, 13);
    ember.addColorStop(0, 'rgba(246,196,132,0.95)');
    ember.addColorStop(0.34, 'rgba(214,116,74,0.72)');
    ember.addColorStop(1, 'rgba(168,54,43,0)');
    g.fillStyle = ember;
    g.beginPath();
    g.arc(2.5, 4, 13, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,226,176,0.9)';
    g.beginPath();
    g.ellipse(2, 3.5, 3.2, 4.6, 0.35, 0, Math.PI * 2);
    g.fill();

    // 内层旋墨
    g.strokeStyle = 'rgba(23,19,15,0.6)';
    g.lineWidth = 1.3;
    g.beginPath();
    g.arc(0, 0, 10.5, 0.45, 2.25);
    g.stroke();
    g.strokeStyle = 'rgba(246,236,210,0.3)';
    g.lineWidth = 0.9;
    g.beginPath();
    g.arc(0, 0, 8, 2.6, 4.1);
    g.stroke();

    // 墨点飞沫
    g.fillStyle = 'rgba(23,19,15,0.6)';
    [[-17, 13, 1.5], [16, -14, 1.2], [14, 17, 0.9], [-15, -15, 0.8], [20, 4, 0.7]].forEach(function (q) {
      g.beginPath();
      g.arc(q[0], q[1], q[2], 0, Math.PI * 2);
      g.fill();
    });
    // 少量朱砂飞沫
    g.fillStyle = 'rgba(168,54,43,0.7)';
    [[-9, 19, 1.1], [19, -7, 0.9], [9, -18, 0.7]].forEach(function (q) {
      g.beginPath();
      g.arc(q[0], q[1], q[2], 0, Math.PI * 2);
      g.fill();
    });
  }

  /* 墨点：飞射的浓墨团 + 飞白尾 */
  function paintInkDot(g, cx, cy) {
    g.translate(cx, cy);
    g.lineCap = 'round';
    // 飞白尾
    g.globalAlpha = 0.26;
    g.strokeStyle = '#2f4257';
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(-20, 0);
    g.quadraticCurveTo(-38, -3.4, -54, 2);
    g.stroke();
    g.globalAlpha = 0.18;
    g.lineWidth = 15;
    g.beginPath();
    g.moveTo(-22, 2);
    g.quadraticCurveTo(-42, -1, -62, 3);
    g.stroke();
    // 拖尾墨尾（楔形渐隐，作为墨迹的一部分而非散线）
    var tail = g.createLinearGradient(-42, 0, -6, 0);
    tail.addColorStop(0, 'rgba(15,13,10,0)');
    tail.addColorStop(0.72, 'rgba(15,13,10,0.34)');
    tail.addColorStop(1, 'rgba(15,13,10,0.62)');
    g.fillStyle = tail;
    g.beginPath();
    g.moveTo(-6, -9);
    g.quadraticCurveTo(-26, -6, -42, 0);
    g.quadraticCurveTo(-26, 6, -6, 9);
    g.closePath();
    g.fill();
    // 淡墨外晕
    g.globalAlpha = 0.12;
    g.fillStyle = '#1e262e';
    g.beginPath();
    g.ellipse(0, 1, 25, 15, -0.1, 0, Math.PI * 2);
    g.fill();
    // 主墨团：一笔落下的不规则墨块
    var core = g.createRadialGradient(4, -5, 1, -1, 0, 24);
    core.addColorStop(0, '#2c3742');
    core.addColorStop(0.45, '#191d21');
    core.addColorStop(1, '#0f0d0a');
    g.globalAlpha = 1;
    g.fillStyle = core;
    g.beginPath();
    g.moveTo(21, 0);
    g.bezierCurveTo(17, -9, 6, -14, -4, -12);
    g.bezierCurveTo(-13, -10, -18, -4, -17, 2);
    g.bezierCurveTo(-16, 8, -8, 13, 0, 13);
    g.bezierCurveTo(9, 13, 18, 7, 21, 0);
    g.closePath();
    g.fill();
    g.beginPath();
    g.ellipse(8, -8, 6.5, 4.6, 0.35, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(-7, 8, 5.4, 3.8, -0.3, 0, Math.PI * 2);
    g.fill();
    // 锋沿一点纸白
    g.strokeStyle = 'rgba(246,236,210,0.36)';
    g.lineWidth = 1.3;
    g.beginPath();
    g.arc(3, 0, 13, -1.05, -0.1);
    g.stroke();
    // 后方墨滴
    g.fillStyle = 'rgba(20,17,13,0.7)';
    [[-20, -8, 1.8], [-23, 8, 1.5], [-30, 1, 1.1]].forEach(function (q) {
      g.beginPath();
      g.arc(q[0], q[1], q[2], 0, Math.PI * 2);
      g.fill();
    });
    // 极淡金屑
    g.fillStyle = 'rgba(216,180,92,0.55)';
    g.beginPath();
    g.arc(15, 6, 1, 0, Math.PI * 2);
    g.fill();
  }

  /* ---------------- 终极一击演出 ---------------- */
  function drawUltimate() {
    var fx = state.ultFx;
    if (!fx) return;
    if (fx.type === 'sword') drawUltimateSword(fx);
    else if (fx.type === 'staff') drawUltimateStaff(fx);
    else if (fx.type === 'brush') drawUltimateBrush(fx);
  }

  function drawUltimateSword(fx) {
    var c = ctx;
    var k = clamp(fx.t / fx.dur, 0, 1);
    var a = k < 0.1 ? k / 0.1 : 1 - clamp((k - 0.76) / 0.24, 0, 1);
    var y = fx.y;
    c.save();
    c.globalAlpha = a;
    // 全屏墨风带
    var wind = c.createLinearGradient(0, y - 170, 0, y + 170);
    wind.addColorStop(0, 'rgba(23,19,15,0)');
    wind.addColorStop(0.42, 'rgba(23,19,15,0.08)');
    wind.addColorStop(0.5, 'rgba(47,66,87,0.22)');
    wind.addColorStop(0.58, 'rgba(23,19,15,0.08)');
    wind.addColorStop(1, 'rgba(23,19,15,0)');
    c.fillStyle = wind;
    c.fillRect(0, y - 170, W, 340);

    // 三层巨剑气：淡墨外晕 / 墨浪 / 纸白刃身（横向霸屏）
    for (var i = 2; i >= 0; i--) {
      var half = i === 2 ? 150 : i === 1 ? 112 : 72;
      var off = i * 12;
      c.globalAlpha = a * (i === 2 ? 0.16 : i === 1 ? 0.5 : 0.96);
      var grad = c.createLinearGradient(0, y - half + off, 0, y + half + off);
      if (i === 0) {
        grad.addColorStop(0, 'rgba(216,180,92,0.28)');
        grad.addColorStop(0.18, 'rgba(250,244,226,0.94)');
        grad.addColorStop(0.5, 'rgba(239,230,211,0.86)');
        grad.addColorStop(0.84, 'rgba(250,244,226,0.9)');
        grad.addColorStop(1, 'rgba(216,180,92,0.24)');
      } else if (i === 1) {
        grad.addColorStop(0, 'rgba(23,19,15,0)');
        grad.addColorStop(0.32, 'rgba(23,19,15,0.34)');
        grad.addColorStop(0.5, 'rgba(47,66,87,0.2)');
        grad.addColorStop(0.68, 'rgba(23,19,15,0.34)');
        grad.addColorStop(1, 'rgba(23,19,15,0)');
      } else {
        grad.addColorStop(0, 'rgba(47,66,87,0)');
        grad.addColorStop(0.5, 'rgba(47,66,87,0.24)');
        grad.addColorStop(1, 'rgba(47,66,87,0)');
      }
      c.fillStyle = grad;
      c.beginPath();
      c.moveTo(-150, y + half + off);
      c.quadraticCurveTo(W * 0.5, y + half * 0.45 + off, W + 150, y + half - 26 + off);
      c.lineTo(W + 150, y - half + 26 + off);
      c.quadraticCurveTo(W * 0.5, y - half * 0.45 + off, -150, y - half + off);
      c.closePath();
      c.fill();
    }
    // 刃线：上下双锋
    c.globalAlpha = a;
    [-1, 1].forEach(function (sgn) {
      c.strokeStyle = 'rgba(23,19,15,0.78)';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(-70, y + sgn * 58);
      c.quadraticCurveTo(W * 0.5, y + sgn * 88, W + 70, y + sgn * 46);
      c.stroke();
      c.strokeStyle = 'rgba(216,180,92,0.92)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-66, y + sgn * 54);
      c.quadraticCurveTo(W * 0.5, y + sgn * 84, W + 66, y + sgn * 42);
      c.stroke();
    });
    // 刃身内的纵向气丝
    c.globalAlpha = a * 0.32;
    for (var f = 0; f < 14; f++) {
      var fx2 = (f * 113 + (state.time * 320 | 0)) % (W + 80) - 40;
      c.strokeStyle = f % 4 === 0 ? '#d8b45c' : 'rgba(23,19,15,0.7)';
      c.lineWidth = f % 4 === 0 ? 1.4 : 2;
      c.beginPath();
      c.moveTo(fx2, y - 46);
      c.lineTo(fx2 + rand(-8, 8), y + 46);
      c.stroke();
    }

    // 上升的墨雨与金屑
    for (var s = 0; s < 18; s++) {
      var sx = (s * 137 + (state.time * 260 | 0)) % (W + 120) - 60;
      var sy = y + 60 - ((s * 53 + state.time * 520) % 220);
      c.globalAlpha = a * 0.35;
      c.strokeStyle = s % 3 === 0 ? '#d8b45c' : '#17130f';
      c.lineWidth = s % 3 === 0 ? 1.4 : 2.4;
      c.beginPath();
      c.moveTo(sx, sy);
      c.lineTo(sx + rand(-4, 4), sy - rand(16, 46));
      c.stroke();
    }
    // 刃口高光
    c.globalAlpha = a * 0.5;
    c.strokeStyle = 'rgba(255,252,240,0.9)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(0, y + 6);
    c.quadraticCurveTo(W * 0.5, y - 138, W, y - 8);
    c.stroke();
    c.restore();
  }

  function drawUltimateStaff(fx) {
    var c = ctx;
    var k = clamp(fx.t / fx.dur, 0, 1);
    var a = k < 0.12 ? k / 0.12 : 1 - clamp((k - 0.7) / 0.3, 0, 1);
    var cx = PLAYER.x, cy = playerTorso();
    var r = Math.max(12, fx.radius);
    c.save();
    c.globalAlpha = a;

    // 席卷全场的灵压
    var vg = c.createRadialGradient(cx, cy, r * 0.16, cx, cy, r);
    vg.addColorStop(0, 'rgba(23,19,15,0)');
    vg.addColorStop(0.62, 'rgba(23,19,15,0.04)');
    vg.addColorStop(0.86, 'rgba(47,66,87,0.16)');
    vg.addColorStop(0.94, 'rgba(216,180,92,0.1)');
    vg.addColorStop(1, 'rgba(23,19,15,0)');
    c.fillStyle = vg;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();

    // 主灵环与内环（外环先铺一层墨晕，增加体量）
    c.globalAlpha = a * 0.16;
    c.strokeStyle = '#2f4257';
    c.lineWidth = 30;
    c.beginPath();
    c.arc(cx, cy, r * 0.985, 0, Math.PI * 2);
    c.stroke();
    var rings = [[1, 0.9, 9], [0.82, 0.5, 5], [0.6, 0.3, 3]];
    rings.forEach(function (rg) {
      var rr2 = r * rg[0];
      c.globalAlpha = a * rg[1];
      c.strokeStyle = rg[0] === 1 ? 'rgba(216,180,92,0.85)' : 'rgba(47,66,87,0.7)';
      c.lineWidth = rg[2];
      c.beginPath();
      c.arc(cx, cy, rr2, 0, Math.PI * 2);
      c.stroke();
    });

    // 旋转符文
    c.globalAlpha = a * 0.6;
    for (var i = 0; i < 12; i++) {
      var ang = (i / 12) * Math.PI * 2 + state.time * 0.9;
      var rr3 = r * 0.92;
      var px2 = cx + Math.cos(ang) * rr3;
      var py2 = cy + Math.sin(ang) * rr3;
      c.save();
      c.translate(px2, py2);
      c.rotate(ang + Math.PI / 2);
      c.strokeStyle = i % 3 === 0 ? '#d8b45c' : '#2f4257';
      c.lineWidth = 1.6;
      c.strokeRect(-5, -8, 10, 16);
      c.beginPath();
      c.moveTo(-5, 0);
      c.lineTo(5, 0);
      c.stroke();
      c.restore();
    }

    // 墨涡旋臂
    c.globalAlpha = a * 0.4;
    c.lineCap = 'round';
    for (var s = 0; s < 5; s++) {
      c.strokeStyle = s % 2 === 0 ? '#17130f' : '#2f4257';
      c.lineWidth = 2.4 - s * 0.24;
      c.beginPath();
      for (var q = 0; q <= 16; q++) {
        var qk = q / 16;
        var qa = s * 1.26 + qk * 1.8 + state.time * 1.1;
        var qr = r * (0.24 + qk * 0.62);
        var qx = cx + Math.cos(qa) * qr;
        var qy = cy + Math.sin(qa) * qr * 0.72;
        if (q === 0) c.moveTo(qx, qy);
        else c.lineTo(qx, qy);
      }
      c.stroke();
    }
    c.restore();
  }

  function drawUltimateBrush(fx) {
    var c = ctx;
    var trail = fx.trail;
    if (!trail.length) return;
    var k = clamp(fx.t / fx.dur, 0, 1);
    var a = k < 0.06 ? k / 0.06 : 1 - clamp((k - 0.9) / 0.1, 0, 1);
    c.save();
    c.globalAlpha = a;
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // 外层墨晕
    for (var i = 1; i < trail.length; i++) {
      var t0 = i / trail.length;
      c.strokeStyle = 'rgba(47,66,87,' + (0.04 + t0 * 0.11) + ')';
      c.lineWidth = 22 + t0 * 66;
      c.beginPath();
      c.moveTo(trail[i - 1].x, trail[i - 1].y);
      c.lineTo(trail[i].x, trail[i].y);
      c.stroke();
    }
    // 墨身：由尾至首渐粗
    for (var i = 1; i < trail.length; i++) {
      var t = i / trail.length;
      c.strokeStyle = 'rgba(23,19,15,' + (0.26 + t * 0.52) + ')';
      c.lineWidth = 12 + t * 54;
      c.beginPath();
      c.moveTo(trail[i - 1].x, trail[i - 1].y);
      c.lineTo(trail[i].x, trail[i].y);
      c.stroke();
    }
    // 纸白腹线
    c.strokeStyle = 'rgba(239,230,211,0.2)';
    c.lineWidth = 2;
    c.beginPath();
    for (var b = 2; b < trail.length; b++) {
      var bt = b / trail.length;
      if (b === 2) c.moveTo(trail[b].x, trail[b].y - 6 - bt * 8);
      else c.lineTo(trail[b].x, trail[b].y - 6 - bt * 8);
    }
    c.stroke();
    // 鎏金脊线
    c.strokeStyle = 'rgba(216,180,92,0.55)';
    c.lineWidth = 2;
    c.beginPath();
    for (var s = 1; s < trail.length; s++) {
      if (s === 1) c.moveTo(trail[s].x, trail[s].y);
      else c.lineTo(trail[s].x, trail[s].y);
    }
    c.stroke();
    // 金鳞与背鳍（稀疏一些，避免像一节节车厢）
    for (var d = 5; d < trail.length - 3; d += 9) {
      var dt = d / trail.length;
      var sc = 1.6 + dt * 3.8;
      c.fillStyle = 'rgba(216,180,92,' + (0.26 + dt * 0.32) + ')';
      c.beginPath();
      c.ellipse(trail[d].x, trail[d].y, sc * 1.6, sc, 0, 0, Math.PI * 2);
      c.fill();
      var p0 = trail[d], p1 = trail[d + 1];
      var fa = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      c.save();
      c.translate(p0.x, p0.y);
      c.rotate(fa);
      c.fillStyle = 'rgba(216,180,92,0.48)';
      c.beginPath();
      c.moveTo(-7, -9 - sc);
      c.lineTo(0, -25 - sc);
      c.lineTo(8, -8 - sc);
      c.closePath();
      c.fill();
      c.restore();
    }

    // 龙首
    var h = fx.head;
    var prev = trail[Math.max(0, trail.length - 2)];
    var ang = Math.atan2(h.y - prev.y, h.x - prev.x);
    c.save();
    c.translate(h.x, h.y);
    c.rotate(ang);
    // 龙头金晕
    var hglow = c.createRadialGradient(16, 0, 4, 16, 0, 78);
    hglow.addColorStop(0, 'rgba(216,180,92,0.26)');
    hglow.addColorStop(1, 'rgba(216,180,92,0)');
    c.fillStyle = hglow;
    c.beginPath();
    c.arc(16, 0, 78, 0, Math.PI * 2);
    c.fill();
    c.scale(1.8, 1.8);
    // 鬃毛
    c.strokeStyle = 'rgba(216,180,92,0.75)';
    c.lineWidth = 2.2;
    for (var m = 0; m < 5; m++) {
      c.beginPath();
      c.moveTo(-6, -16 + m * 8);
      c.quadraticCurveTo(-30, -30 + m * 12, -48, -18 + m * 12);
      c.stroke();
    }
    // 头部
    var hg = c.createLinearGradient(-14, 0, 40, 0);
    hg.addColorStop(0, '#17130f');
    hg.addColorStop(1, '#2f4257');
    c.fillStyle = hg;
    c.beginPath();
    c.moveTo(-20, -20);
    c.quadraticCurveTo(12, -30, 44, -10);
    c.quadraticCurveTo(56, 0, 44, 12);
    c.quadraticCurveTo(10, 28, -20, 20);
    c.quadraticCurveTo(-8, 0, -20, -20);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(216,180,92,0.9)';
    c.lineWidth = 1.6;
    c.stroke();
    // 下颚与口
    c.fillStyle = '#17130f';
    c.beginPath();
    c.moveTo(0, 12);
    c.quadraticCurveTo(26, 30, 46, 16);
    c.quadraticCurveTo(30, 8, 2, 4);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(168,54,43,0.8)';
    c.beginPath();
    c.moveTo(6, 10);
    c.quadraticCurveTo(26, 20, 40, 13);
    c.quadraticCurveTo(24, 15, 8, 13);
    c.closePath();
    c.fill();
    c.strokeStyle = '#f6ecd2';
    c.lineWidth = 1.4;
    for (var tooth = 0; tooth < 3; tooth++) {
      c.beginPath();
      c.moveTo(14 + tooth * 8, 12);
      c.lineTo(17 + tooth * 8, 18);
      c.stroke();
    }
    // 龙角
    c.strokeStyle = '#d8b45c';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(6, -18);
    c.quadraticCurveTo(-2, -42, -24, -44);
    c.stroke();
    c.beginPath();
    c.moveTo(18, -16);
    c.quadraticCurveTo(16, -40, -2, -48);
    c.stroke();
    // 龙须
    c.strokeStyle = 'rgba(246,236,210,0.72)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(44, -4);
    c.quadraticCurveTo(70, -20, 96, -8);
    c.stroke();
    c.beginPath();
    c.moveTo(44, 6);
    c.quadraticCurveTo(72, 18, 92, 6);
    c.stroke();
    // 龙目与龙珠
    c.fillStyle = '#d8b45c';
    c.beginPath();
    c.arc(22, -6, 4.6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#17130f';
    c.beginPath();
    c.arc(23.4, -6, 2, 0, Math.PI * 2);
    c.fill();
    var pearl = c.createRadialGradient(50, 2, 1, 50, 2, 10);
    pearl.addColorStop(0, 'rgba(255,246,214,0.95)');
    pearl.addColorStop(1, 'rgba(216,180,92,0)');
    c.fillStyle = pearl;
    c.beginPath();
    c.arc(50, 2, 10, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // 金屑环
    c.globalAlpha = a * 0.7;
    for (var p = 0; p < 8; p++) {
      var pa = state.time * 1.6 + p * 0.8;
      c.fillStyle = p % 2 === 0 ? '#d8b45c' : '#17130f';
      c.beginPath();
      c.arc(h.x + Math.cos(pa) * 46, h.y + Math.sin(pa) * 30, 1.8, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  function brushStrokePath(c, seed, len, w) {
    var n = 10, top = [], bot = [], i;
    for (i = 0; i <= n; i++) {
      var t = i / n;
      var x = -len * 0.5 + len * t;
      var y = Math.sin(t * Math.PI) * (5 + Math.sin(seed) * 5) - t * 4;
      var env = 0.32 + 0.68 * Math.sin(Math.PI * Math.pow(t, 0.62));
      var ww = w * env * (1 - t * 0.5);
      top.push([x, y - ww * 0.5]);
      bot.push([x, y + ww * 0.5]);
    }
    c.beginPath();
    c.moveTo(top[0][0], top[0][1]);
    for (i = 1; i <= n; i++) c.lineTo(top[i][0], top[i][1]);
    for (i = n; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
    c.closePath();
  }

  function drawBrushStrokes() {
    var c = ctx;
    for (var i = 0; i < state.brushStrokes.length; i++) {
      var bs = state.brushStrokes[i];
      if (bs.t < 0) continue;
      var k = clamp(bs.t / bs.life, 0, 1);
      var a = 1 - k;
      var len = 130 * bs.scale;
      var wid = 17 * bs.scale * (1 - k * 0.45);
      c.save();
      c.translate(bs.x, bs.y);
      c.rotate(bs.angle);
      // 浓墨主痕
      c.globalAlpha = a * 0.86;
      c.fillStyle = '#17130f';
      brushStrokePath(c, bs.seed, len, wid);
      c.fill();
      // 朱砂副痕
      c.globalAlpha = a * 0.34;
      c.fillStyle = '#a8362b';
      c.save();
      c.translate(3, 5);
      brushStrokePath(c, bs.seed + 1.3, len * 0.82, wid * 0.3);
      c.fill();
      c.restore();
      // 纸白飞白
      c.globalAlpha = a * 0.4;
      c.fillStyle = '#f6ecd2';
      c.save();
      c.translate(0, -wid * 0.22);
      brushStrokePath(c, bs.seed + 2.1, len * 0.7, wid * 0.12);
      c.fill();
      c.restore();
      // 落笔积墨与飞沫
      c.globalAlpha = a * 0.7;
      c.fillStyle = '#17130f';
      [[-len * 0.45, 0, 4.4], [len * 0.3, 2, 1.8], [-len * 0.1, -wid * 0.4, 1.3]].forEach(function (q) {
        c.beginPath();
        c.ellipse(q[0], q[1], q[2], q[2] * 0.8, 0, 0, Math.PI * 2);
        c.fill();
      });
      c.restore();
    }
  }

  function drawProjectiles() {
    buildArt();
    var c = ctx;
    for (var i = 0; i < state.projectiles.length; i++) {
      var p = state.projectiles[i];
      // 尾迹：渐细墨痕
      c.save();
      c.lineCap = 'round';
      for (var t = 1; t < p.trail.length; t++) {
        var kt = t / p.trail.length;
        c.globalAlpha = kt * 0.24;
        c.strokeStyle = p.kind === 'heavy' ? '#7d2119' : p.weapon === 'brush' ? '#2f4257' : '#17130f';
        c.lineWidth = (p.kind === 'heavy' ? 6 : 3.4) * kt;
        c.beginPath();
        c.moveTo(p.trail[t - 1].x, p.trail[t - 1].y);
        c.lineTo(p.trail[t].x, p.trail[t].y);
        c.stroke();
      }
      c.restore();

      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.angle);

      if (p.kind === 'heavy') {
        var wob = 0.55 + 0.45 * Math.sin(state.time * 18 + p.t * 30);
        c.globalAlpha = 0.12 + wob * 0.08;
        c.fillStyle = p.weapon === 'sword' ? '#a8362b' : '#17130f';
        c.beginPath();
        c.ellipse(-24, 0, 46, 10, 0, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      }

      var sp = p.weapon === 'bow'
        ? (p.kind === 'heavy' ? ART.arrowHeavy : ART.arrow)
        : p.weapon === 'sword'
          ? (p.kind === 'heavy' ? ART.swordHeavy : ART.sword)
          : p.weapon === 'brush' ? ART.inkDot : ART.orb;
      var sway = p.weapon === 'staff' ? 1 + Math.sin(state.time * 11 + p.t * 24) * 0.045 : 1;
      var pw = p.pw || 1;
      c.drawImage(sp, -sp._w / 2 * sway * pw, -sp._h / 2 * sway * pw, sp._w * sway * pw, sp._h * sway * pw);

      if (p.weapon === 'staff') {
        c.globalAlpha = 0.6;
        c.strokeStyle = 'rgba(168,54,43,0.6)';
        c.lineWidth = 1.35;
        c.beginPath();
        c.arc(0, 0, 24, state.time * 3.6, state.time * 3.6 + 2.1);
        c.stroke();
        c.strokeStyle = 'rgba(246,236,210,0.42)';
        c.beginPath();
        c.arc(0, 0, 27.5, -state.time * 2.3, -state.time * 2.3 + 1.35);
        c.stroke();
        c.globalAlpha = 1;
      }
      if (p.weapon === 'brush') {
        c.globalAlpha = 0.14;
        c.fillStyle = '#2f4257';
        c.beginPath();
        c.ellipse(-4, 0, 30, 15, 0, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 0.5;
        c.fillStyle = 'rgba(23,19,15,0.55)';
        c.beginPath();
        c.arc(-24, 5, 2.2, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      }
      if (p.kind === 'ultimate') {
        c.globalAlpha = 0.5 + Math.sin(state.time * 20 + p.t * 30) * 0.18;
        c.strokeStyle = 'rgba(216,180,92,0.85)';
        c.lineWidth = 1.6;
        c.beginPath();
        c.arc(0, 0, 24, 0, Math.PI * 2);
        c.stroke();
        c.globalAlpha = 1;
      }
      c.restore();
    }
  }

  /* ---------------- 雷击 ---------------- */
  function drawBolts() {
    var c = ctx;
    for (var i = 0; i < state.bolts.length; i++) {
      var b = state.bolts[i];
      if (!b.struck) {
        var warn = clamp(b.t / b.delay, 0, 1);
        var ps = clamp(0.34 + (b.pow || 1) * 0.68, 0.62, 1.18);
        c.save();
        c.translate(b.x, b.y);
        // 天光柱（在词帖上方也看得见）
        var beam = c.createLinearGradient(0, -420, 0, 0);
        beam.addColorStop(0, 'rgba(168,54,43,0)');
        beam.addColorStop(0.72, 'rgba(168,54,43,' + (0.09 + warn * 0.13) + ')');
        beam.addColorStop(1, 'rgba(168,54,43,' + (0.12 + warn * 0.18) + ')');
        c.fillStyle = beam;
        c.fillRect((-9 - warn * 7) * ps, -420, (18 + warn * 14) * ps, 420);
        // 雷符与下坠箭头压在词帖上沿之上，避免被帖面遮挡
        var labelY = clamp(b.y - 186 - warn * 8, 14, 150) - b.y;
        var tipY = Math.min(labelY + 34, 172 - b.y);
        c.globalAlpha = 0.4 + warn * 0.25;
        c.fillStyle = '#a8362b';
        c.beginPath();
        c.moveTo(-12, tipY - 26);
        c.lineTo(12, tipY - 26);
        c.lineTo(0, tipY);
        c.closePath();
        c.fill();
        c.beginPath();
        c.moveTo(-8, tipY - 47);
        c.lineTo(8, tipY - 47);
        c.lineTo(0, tipY - 29);
        c.closePath();
        c.fill();
        // 聚云墨晕
        var cg = c.createRadialGradient(0, -10, 4, 0, 0, 60);
        cg.addColorStop(0, 'rgba(23,19,15,' + (0.1 + warn * 0.12) + ')');
        cg.addColorStop(1, 'rgba(23,19,15,0)');
        c.fillStyle = cg;
        c.beginPath();
        c.arc(0, 0, 60, 0, Math.PI * 2);
        c.fill();
        // 朱砂符环（放大到比词帖更宽，避免被帖面完全遮住）
        c.globalAlpha = 0.45 + 0.4 * Math.sin(state.time * 16);
        c.strokeStyle = 'rgba(168,54,43,0.75)';
        c.lineWidth = 1.8;
        c.setLineDash([6, 10]);
        c.lineDashOffset = -state.time * 46;
        c.beginPath();
        c.arc(0, 0, (52 + warn * 14) * ps, 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);
        c.globalAlpha = 0.5;
        c.lineWidth = 1.1;
        c.beginPath();
        c.arc(0, 0, (30 + warn * 8) * ps, 0, Math.PI * 2);
        c.stroke();
        // 十字准星
        c.lineWidth = 1.3;
        c.beginPath();
        c.moveTo(-(64 + warn * 10) * ps, 0);
        c.lineTo(-40 * ps, 0);
        c.moveTo(40 * ps, 0);
        c.lineTo((64 + warn * 10) * ps, 0);
        c.moveTo(0, -(64 + warn * 10) * ps);
        c.lineTo(0, -40 * ps);
        c.moveTo(0, 40 * ps);
        c.lineTo(0, (64 + warn * 10) * ps);
        c.stroke();
        // 雷符
        c.globalAlpha = 0.4 + warn * 0.4;
        c.fillStyle = '#a8362b';
        c.font = '700 30px ' + CN_FONT;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('雷', 0, labelY);
        c.restore();
      } else {
        var age = b.t - b.delay;
        if (age < 0.45) {
          var k = 1 - age / 0.45;
          c.save();
          c.globalAlpha = k;
          // 天光
          var lg = c.createLinearGradient(0, b.y - 380, 0, b.y);
          lg.addColorStop(0, 'rgba(214,198,160,0)');
          lg.addColorStop(0.7, 'rgba(224,196,150,0.28)');
          lg.addColorStop(1, 'rgba(168,54,43,0.34)');
          c.fillStyle = lg;
          c.fillRect(b.x - 46, b.y - 390, 92, 390);
          // 顶部墨云
          c.globalAlpha = k * 0.5;
          var cloud = c.createRadialGradient(b.x, b.y - 372, 6, b.x, b.y - 372, 86);
          cloud.addColorStop(0, 'rgba(23,19,15,0.75)');
          cloud.addColorStop(1, 'rgba(23,19,15,0)');
          c.fillStyle = cloud;
          c.beginPath();
          c.arc(b.x, b.y - 372, 86, 0, Math.PI * 2);
          c.fill();

          c.globalAlpha = k;
          c.lineCap = 'round';
          c.lineJoin = 'miter';
          var pts = boltPoints(b.x, b.y, b.seed || 0);
          // 外层朱晕
          c.globalAlpha = k * 0.22;
          c.strokeStyle = '#c0503c';
          c.lineWidth = 18;
          strokePoints(c, pts);
          // 墨身
          c.globalAlpha = k;
          c.strokeStyle = '#17130f';
          c.lineWidth = 7.5;
          strokePoints(c, pts);
          // 纸白芯
          c.strokeStyle = '#f7ecd2';
          c.lineWidth = 2.3;
          strokePoints(c, pts);
          // 分叉
          var br = boltBranch(pts, 4, b.seed || 0);
          c.strokeStyle = '#17130f';
          c.lineWidth = 3.4;
          strokePoints(c, br);
          c.strokeStyle = '#f7ecd2';
          c.lineWidth = 1.1;
          strokePoints(c, br);
          var br2 = boltBranch(pts, 8, (b.seed || 0) + 1.7);
          c.strokeStyle = 'rgba(23,19,15,0.85)';
          c.lineWidth = 2.4;
          strokePoints(c, br2);
          // 落点迸溅
          c.globalAlpha = k * 0.9;
          c.fillStyle = '#17130f';
          for (var q = 0; q < 7; q++) {
            var qa = -Math.PI / 2 + (q / 6 - 0.5) * 2.4;
            var ql = 12 + (q % 3) * 9;
            c.beginPath();
            c.ellipse(b.x + Math.cos(qa) * ql, b.y + Math.sin(qa) * ql * 0.5, 2.4, 1.4, qa, 0, Math.PI * 2);
            c.fill();
          }
          c.restore();
        }
      }
    }
  }

  function strokePoints(c, pts) {
    if (!pts.length) return;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  }

  function boltPoints(bx, by, seed) {
    var pts = [];
    for (var i = 0; i <= 12; i++) {
      var t = i / 12;
      var x = bx + Math.sin(i * 2.35 + seed) * 24 * Math.sin(t * Math.PI) + 34 * (1 - t) - 17;
      var y = by - 380 + 380 * t;
      pts.push([x, y]);
    }
    return pts;
  }

  function boltBranch(pts, idx, seed) {
    var p0 = pts[idx];
    var out = [[p0[0], p0[1]]];
    var dir = seed % 2 > 0.5 ? 1 : -1;
    for (var i = 1; i <= 4; i++) {
      out.push([
        p0[0] + dir * (8 + i * 9 + Math.sin(i * 2 + seed) * 4),
        p0[1] + i * 13
      ]);
    }
    return out;
  }

  /* ---------------- 刀光 / 粒子 / 环 / 伤害 ---------------- */
  function drawSlashes() {
    var c = ctx;
    for (var i = 0; i < state.slashes.length; i++) {
      var s = state.slashes[i];
      if (s.t < 0) continue;
      var k = clamp(s.t / s.life, 0, 1);
      var a = 1 - k;
      c.save();
      c.translate(s.x, s.y);
      c.rotate(s.angle);
      c.lineCap = 'round';
      var rad = 26 * s.scale * (0.7 + k * 0.7);
      // 三重笔触：厚墨、朱边、纸白锋
      for (var l = 0; l < 3; l++) {
        var rr = rad - l * 4.2 * s.scale;
        var lw = (s.heavy ? 7.5 : 3.6) * (1 - l * 0.24) * (1 - k * 0.35);
        if (lw <= 0.4) continue;
        c.globalAlpha = a * (l === 0 ? 0.9 : l === 1 ? 0.42 : 0.6);
        c.strokeStyle = l === 0 ? (s.heavy ? '#4b1a14' : '#17130f')
          : l === 1 ? '#a8362b' : 'rgba(247,238,214,0.9)';
        c.lineWidth = lw;
        c.beginPath();
        c.arc(0, 0, rr, -1.16, 1.16);
        c.stroke();
      }
      // 两端飞墨
      c.fillStyle = s.heavy ? '#7d2119' : '#17130f';
      for (var q = 0; q < (s.heavy ? 5 : 3); q++) {
        var qa = (q % 2 ? -1 : 1) * (1.05 + (q >> 1) * 0.09);
        c.globalAlpha = a * 0.55;
        c.beginPath();
        c.arc(Math.cos(qa) * rad, Math.sin(qa) * rad, (1.1 + (q % 3)) * (1 - k * 0.5), 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }
  }

  function drawParticles() {
    var c = ctx;
    for (var i = 0; i < state.particles.length; i++) {
      var p = state.particles[i];
      var k = clamp(p.life / p.maxLife, 0, 1);
      c.globalAlpha = Math.min(1, k * 1.4);
      if (p.streak) {
        var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
        var ux = p.vx / sp, uy = p.vy / sp;
        var len = 5 + p.r * 4 * k;
        c.strokeStyle = p.color;
        c.lineCap = 'round';
        c.lineWidth = Math.max(0.7, p.r * 0.85 * k);
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(p.x - ux * len, p.y - uy * len);
        c.stroke();
      } else {
        c.fillStyle = p.color;
        c.beginPath();
        c.ellipse(p.x, p.y, p.r, p.r * (0.55 + 0.45 * k), p.vx * 0.004, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  function drawRings() {
    var c = ctx;
    for (var i = 0; i < state.rings.length; i++) {
      var r = state.rings[i];
      var k = clamp(r.t / r.life, 0, 1);
      var e = 1 - Math.pow(1 - k, 3);
      var rad = r.r0 + (r.r1 - r.r0) * e;
      c.globalAlpha = (1 - k) * 0.7;
      c.strokeStyle = r.color;
      c.lineWidth = 2.6 * (1 - k) + 0.4;
      c.beginPath();
      c.arc(r.x, r.y, rad, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  function drawNumbers() {
    var c = ctx;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (var i = 0; i < state.numbers.length; i++) {
      var n = state.numbers[i];
      var k = clamp(n.t / n.life, 0, 1);
      var a = k < 0.68 ? 1 : 1 - (k - 0.68) / 0.32;
      c.globalAlpha = Math.max(0, a);
      if (n.seal) {
        c.font = '700 38px ' + CN_FONT;
        c.lineWidth = 6;
        c.strokeStyle = 'rgba(248,242,227,0.9)';
        c.strokeText(n.v, n.x, n.y);
        c.fillStyle = '#a8362b';
        c.fillText(n.v, n.x, n.y);
      } else if (n.hurt) {
        c.font = '700 30px ' + CN_FONT;
        c.lineWidth = 5;
        c.strokeStyle = 'rgba(248,242,227,0.85)';
        c.strokeText('−' + n.v, n.x, n.y);
        c.fillStyle = '#a8362b';
        c.fillText('−' + n.v, n.x, n.y);
      } else {
        c.font = n.heavy ? '700 34px ' + EN_FONT : '600 22px ' + EN_FONT;
        c.lineWidth = n.heavy ? 5 : 3.5;
        c.strokeStyle = 'rgba(248,242,227,0.8)';
        c.strokeText(n.v, n.x, n.y);
        c.fillStyle = n.heavy ? '#8f2c22' : '#17130f';
        c.fillText(n.v, n.x, n.y);
      }
    }
    c.globalAlpha = 1;
  }

  /* ---------------- 词帖点选 ---------------- */
  function pickSlipAt(ev) {
    if (!canvas || !state.slips.length) return null;
    var rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var x = (ev.clientX - rect.left) / rect.width * W;
    var y = (ev.clientY - rect.top) / rect.height * H;
    for (var i = state.slips.length - 1; i >= 0; i--) {
      var s = state.slips[i];
      if (s.removed) continue;
      var hw = s.w / 2 + 4;
      var hh = s.h / 2 + 4;
      if (x > s.x - hw && x < s.x + hw && y > s.y - hh && y < s.y + hh) return s;
    }
    return null;
  }

  function focusSlip(slip) {
    if (!slip || slip === state.focus) return;
    state.focus = slip;
    state.imeActive = false;
    state.imeLen = 0;
    SOUND.flip();
    updateHint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
