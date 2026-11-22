/* 墨战 · 键影 —— 三步上手引导 / 训练报告 / 异常兜底（参赛优化新增）
   数据全部来自本地存档 mozhan.save.v1，不另造统计。 */
(function () {
  'use strict';

  var SAVE_KEY = 'mozhan.save.v1';
  var GUIDE_KEY = 'mozhan.guide.v1';

  /* 与 game.js 的键位分组保持一致 */
  var GROUPS = [
    { id: 'lh', name: '左手基准', keys: 'asdfg' },
    { id: 'rh', name: '右手基准', keys: "hjkl;'" },
    { id: 'top', name: '上排', keys: 'qwertyuiop[]\\' },
    { id: 'bottom', name: '下排', keys: 'zxcvbnm,./' },
    { id: 'num', name: '数字符号', keys: '1234567890-=`~!@#$%^&*()_+{}|:"<>?' }
  ];

  var HEAT_ROWS = ['1234567890', 'qwertyuiop', "asdfghjkl;'", 'zxcvbnm,./'];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function readSave() {
    try {
      var s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      return isObj(s) ? s : {};
    } catch (e) { return {}; }
  }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }

  /* ---------------- 全局提示 ---------------- */
  var toastTimer = 0;
  function toast(msg, ms) {
    var el = $('#extra-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'extra-toast';
      el.className = 'extra-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, ms || 5000);
  }

  function fatal(msg) {
    var bar = $('#fatal-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'fatal-bar';
      bar.className = 'fatal-bar';
      bar.setAttribute('role', 'alert');
      document.body.appendChild(bar);
    }
    bar.textContent = msg;
  }

  /* ---------------- 三步上手 ---------------- */
  function guideSeen() {
    try { return localStorage.getItem(GUIDE_KEY) === '1'; } catch (e) { return true; }
  }
  function markGuideSeen() {
    try { localStorage.setItem(GUIDE_KEY, '1'); } catch (e) {}
  }
  function showGuide() {
    var g = $('#home-guide');
    if (g) g.hidden = false;
  }
  function hideGuide() {
    var g = $('#home-guide');
    if (g) g.hidden = true;
    markGuideSeen();
  }
  function goView(name) {
    var btn = document.querySelector('[data-go="' + name + '"]');
    if (btn) btn.click();
  }
  function enterFirstLevel() {
    hideGuide();
    goView('levels');
    setTimeout(function () {
      var card = $('.level-card[data-level="0"]');
      if (card) card.click();
    }, 360);
  }
  function bindGuide() {
    var start = $('#guide-start');
    var later = $('#guide-later');
    var skip = $('#guide-skip');
    var again = $('#btn-guide');
    if (start) start.addEventListener('click', enterFirstLevel);
    if (later) later.addEventListener('click', hideGuide);
    if (skip) skip.addEventListener('click', hideGuide);
    if (again) again.addEventListener('click', function () {
      if (document.body.getAttribute('data-view') !== 'home') goView('home');
      showGuide();
    });
  }

  /* ---------------- 训练报告 ---------------- */
  function readStats() {
    var s = readSave();
    var prof = isObj(s.prof) ? s.prof : {};
    var records = isObj(s.records) ? s.records : {};
    var miss = isObj(s.missKeys) ? s.missKeys : {};
    var history = Array.isArray(s.history) ? s.history.filter(isObj) : [];
    var levels = (window.GAME_DATA && Array.isArray(window.GAME_DATA.LEVELS)) ? window.GAME_DATA.LEVELS : [];

    var n = 0, ok = 0, spdSum = 0;
    GROUPS.forEach(function (g) {
      var p = prof[g.id];
      if (p && num(p.n) > 0) {
        n += num(p.n);
        ok += num(p.ok);
        spdSum += num(p.spd) * num(p.n);
      }
    });
    var acc = n ? ok / n * 100 : 0;
    var cpm = n ? (spdSum / n) * 60 : 0;

    /* 没有逐键统计时，用真实对局快照兜底 */
    if (!n && history.length) {
      var hc = 0, ha = 0;
      history.forEach(function (h) { hc += num(h.cpm); ha += num(h.acc); });
      cpm = hc / history.length;
      acc = ha / history.length;
    }

    var cleared = 0, perfect = 0, bestCombo = 0;
    Object.keys(records).forEach(function (k) {
      var r = records[k];
      if (!isObj(r)) return;
      cleared++;
      if (r.perfect) perfect++;
      bestCombo = Math.max(bestCombo, num(r.combo));
    });
    history.forEach(function (h) { bestCombo = Math.max(bestCombo, num(h.combo)); });

    return {
      prof: prof, records: records, miss: miss, history: history, levels: levels,
      n: n, acc: acc, cpm: cpm, wpm: cpm / 5,
      cleared: cleared, perfect: perfect, bestCombo: bestCombo,
      rounds: history.length || cleared
    };
  }

  function statCard(label, value, unit) {
    return '<div class="rep-stat"><em>' + esc(label) + '</em><b>' + esc(value) +
      '</b><span>' + esc(unit || '') + '</span></div>';
  }

  function groupRows(st) {
    return GROUPS.map(function (g) {
      var p = st.prof[g.id];
      var has = p && num(p.n) > 0;
      var acc = has ? num(p.ok) / num(p.n) : 0;
      var spd = has ? num(p.spd) : 0;
      var mul = (has && num(p.n) >= 8)
        ? clamp(0.58 + clamp((acc - 0.60) / 0.38, 0, 1) * 0.42 + clamp(spd / 6.5, 0, 1) * 0.20, 0.58, 1.22)
        : null;
      return {
        name: g.name,
        label: g.keys.slice(0, 5).toUpperCase(),
        has: has, acc: acc * 100, cpm: spd * 60, mul: mul
      };
    }).map(function (r) {
      return '<div class="rep-row">' +
        '<span class="rn">' + esc(r.name) + '</span>' +
        '<span class="rep-bar"><i style="width:' + clamp(r.acc, 0, 100).toFixed(1) + '%"></i></span>' +
        '<span class="rep-num">' + (r.has ? r.acc.toFixed(1) + '% · ' + Math.round(r.cpm) + ' CPM' : '未记录') + '</span>' +
        '<span class="rep-mul">' + (r.mul ? '×' + r.mul.toFixed(2) : '—') + '</span>' +
        '</div>';
    }).join('');
  }

  function heatmap(miss) {
    var max = 0;
    Object.keys(miss).forEach(function (k) { max = Math.max(max, num(miss[k])); });
    var html = '';
    HEAT_ROWS.forEach(function (row) {
      html += '<div class="kb-row">';
      row.split('').forEach(function (ch) {
        var n = num(miss[ch]);
        var t = max ? n / max : 0;
        var alpha = t > 0 ? (0.10 + t * 0.62) : 0.03;
        var color = t > 0.55 ? '#fff8ec' : 'var(--ink-2)';
        html += '<span class="kb-cell" style="background:rgba(168,54,43,' + alpha.toFixed(2) + ');color:' + color + '"' +
          ' title="' + esc(ch) + ' · 错 ' + n + ' 次">' + esc(ch) +
          (n > 0 ? '<em>' + n + '</em>' : '') + '</span>';
      });
      html += '</div>';
    });
    var top = Object.keys(miss).map(function (k) { return { k: k, n: num(miss[k]) }; })
      .filter(function (x) { return x.n > 0; })
      .sort(function (a, b) { return b.n - a.n; })
      .slice(0, 6);
    var chips = top.map(function (x) {
      return '<span class="rep-chip">' + esc(x.k) + ' ×' + x.n + '</span>';
    }).join('');
    return (max ? html : '<p class="rep-sub">暂无易错键记录，完成一局后自动统计。</p>') +
      (chips ? '<div class="rep-top-miss"><span class="rep-sub">最易错：</span>' + chips + '</div>' : '');
  }

  function trendChart(st) {
    var pts = st.history.slice(-12);
    if (!pts.length) return '';
    var W = 640, H = 200, padL = 42, padR = 40, padT = 16, padB = 26;
    var maxC = 0;
    pts.forEach(function (p) { maxC = Math.max(maxC, num(p.cpm)); });
    maxC = Math.max(60, Math.ceil(maxC / 20) * 20);
    function x(i) {
      return pts.length === 1 ? (padL + W - padR) / 2 : padL + i / (pts.length - 1) * (W - padL - padR);
    }
    function yC(v) { return H - padB - clamp(v / maxC, 0, 1) * (H - padT - padB); }
    function yA(v) { return H - padB - clamp(v / 100, 0, 1) * (H - padT - padB); }

    var bars = '';
    var slot = (W - padL - padR) / Math.max(1, pts.length);
    var bw = Math.min(30, slot * 0.52);
    pts.forEach(function (p, i) {
      var y = yC(num(p.cpm));
      bars += '<rect x="' + (x(i) - bw / 2).toFixed(1) + '" y="' + y.toFixed(1) +
        '" width="' + bw.toFixed(1) + '" height="' + (H - padB - y).toFixed(1) +
        '" fill="rgba(168,54,43,0.55)"><title>' + esc(fmtDay(p.t)) + ' · ' + Math.round(num(p.cpm)) + ' CPM</title></rect>';
    });
    var line = pts.map(function (p, i) {
      return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + yA(num(p.acc)).toFixed(1);
    }).join(' ');
    var dots = pts.map(function (p, i) {
      return '<circle cx="' + x(i).toFixed(1) + '" cy="' + yA(num(p.acc)).toFixed(1) + '" r="2.6" fill="#2f4257">' +
        '<title>' + esc(fmtDay(p.t)) + ' · 精准 ' + num(p.acc).toFixed(1) + '%</title></circle>';
    }).join('');

    var grid = '';
    [0, 0.5, 1].forEach(function (t) {
      var y = H - padB - t * (H - padT - padB);
      grid += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) +
        '" stroke="rgba(23,19,15,0.12)" stroke-dasharray="3 4"/>' +
        '<text x="' + (padL - 6) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" font-size="8" fill="#948876">' + Math.round(maxC * t) + '</text>' +
        '<text x="' + (W - padR + 6) + '" y="' + (y + 3).toFixed(1) + '" font-size="8" fill="#948876">' + Math.round(100 * t) + '%</text>';
    });

    var first = pts[0], last = pts[pts.length - 1];
    return '<svg class="rep-trend" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="近期速度与精准趋势">' +
      grid + bars +
      '<path d="' + line + '" fill="none" stroke="#2f4257" stroke-width="1.6"/>' + dots +
      '<text x="' + padL + '" y="' + (H - 8) + '" font-size="8" fill="#948876">' + esc(fmtDay(first.t)) + '</text>' +
      '<text x="' + (W - padR) + '" y="' + (H - 8) + '" font-size="8" fill="#948876" text-anchor="end">' + esc(fmtDay(last.t)) + '</text>' +
      '</svg>' +
      '<div class="rep-legend"><span>▮ CPM（字符/分）</span><span>— 精准度</span><span>共 ' + pts.length + ' 局</span></div>';
  }

  function fmtDay(t) {
    if (!t) return '';
    var d = new Date(t);
    if (isNaN(d.getTime())) return '';
    var mm = d.getMonth() + 1, dd = d.getDate();
    return mm + '/' + dd;
  }

  function recordsChart(st) {
    var ids = Object.keys(st.records).filter(function (k) { return isObj(st.records[k]); });
    if (!ids.length) return '';
    ids.sort(function (a, b) { return Number(a) - Number(b); });
    var rows = ids.slice(0, 12).map(function (id) {
      var r = st.records[id];
      var acc = clamp(num(r.acc), 0, 100);
      var name = '';
      for (var i = 0; i < st.levels.length; i++) {
        if (String(st.levels[i].id) === String(id)) { name = st.levels[i].name; break; }
      }
      return '<div class="rep-row">' +
        '<span class="rn">第 ' + esc(id) + ' 境</span>' +
        '<span class="rep-bar"><i style="width:' + acc.toFixed(1) + '%"></i></span>' +
        '<span class="rep-num">' + acc.toFixed(1) + '%</span>' +
        '<span class="rep-mul">' + (name ? esc(name) : '—') + '</span>' +
        '</div>';
    }).join('');
    return rows;
  }

  function bestLevels(st) {
    var ids = Object.keys(st.records).filter(function (k) { return isObj(st.records[k]); });
    if (!ids.length) return '<p class="rep-sub">尚未通关任何关卡。</p>';
    ids.sort(function (a, b) { return Number(a) - Number(b); });
    return '<ul class="rep-levels">' + ids.map(function (id) {
      var r = st.records[id];
      var name = '第 ' + id + ' 境';
      for (var i = 0; i < st.levels.length; i++) {
        if (String(st.levels[i].id) === String(id)) { name = '第 ' + id + ' 境 · ' + st.levels[i].name; break; }
      }
      return '<li><b>' + esc(name) + (r.perfect ? ' · 无瑕' : '') + '</b>' +
        '<span>精准 ' + num(r.acc).toFixed(1) + '% · 连击 ' + num(r.combo) + ' · ' +
        (num(r.time) > 0 ? num(r.time).toFixed(1) + 's' : '—') + '</span></li>';
    }).join('') + '</ul>';
  }

  function renderReport() {
    var body = $('#report-body');
    if (!body) return;
    var st = readStats();
    var stamp = $('#report-stamp');
    if (stamp) stamp.textContent = '共 ' + st.rounds + ' 局 · 存档本地';

    if (!st.n && !st.history.length && !st.cleared) {
      body.innerHTML =
        '<div class="rep-empty">' +
        '<b>还没有对局数据</b>' +
        '<p>完成任意一局后，这里会自动汇总 WPM / CPM、精准度、五组键位熟练度、易错键热力图与近期趋势。</p>' +
        '<button class="btn" id="rep-go" type="button">去打第一关</button>' +
        '</div>';
      var go = $('#rep-go');
      if (go) go.addEventListener('click', enterFirstLevel);
      return;
    }

    body.innerHTML =
      '<div class="rep-grid">' +
      statCard('对局', String(st.rounds), '局') +
      statCard('速度 CPM', String(Math.round(st.cpm)), '字符 / 分') +
      statCard('速度 WPM', String(Math.round(st.wpm)), '词 / 分') +
      statCard('综合精准', st.acc.toFixed(1), '%') +
      statCard('通关', st.cleared + ' / ' + (st.levels.length || 22), '境') +
      statCard('最高连击', String(st.bestCombo), '连') +
      '</div>' +
      '<div class="rep-cols">' +
      '<section class="rep-card">' +
      '<h3>五组键位熟练度</h3>' +
      '<p class="rep-sub">精准度越高、击键越快，攻击倍率越高（0.58–1.22）；样本不足 8 次不出倍率。</p>' +
      groupRows(st) +
      '</section>' +
      '<section class="rep-card">' +
      '<h3>易错键热力图</h3>' +
      '<p class="rep-sub">颜色越深，按键失误越多；数字为该键累计错误次数。</p>' +
      '<div class="kb-heat">' + heatmap(st.miss) + '</div>' +
      '</section>' +
      '</div>' +
      '<div class="rep-cols">' +
      '<section class="rep-card">' +
      '<h3>近期趋势</h3>' +
      '<p class="rep-sub">最近 ' + Math.min(12, st.history.length || 0) + ' 局的速度与精准变化。</p>' +
      (trendChart(st) || '<p class="rep-sub">暂无逐局快照，下方先看各境最高精准。</p>' + recordsChart(st)) +
      '</section>' +
      '<section class="rep-card">' +
      '<h3>逐境最佳</h3>' +
      '<p class="rep-sub">只记录已破关卡的历史最好成绩。</p>' +
      bestLevels(st) +
      '</section>' +
      '</div>';
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    var missing = window.__MOZHAN_ASSET_ERROR;
    if (!window.GAME_DATA || !window.SKINS || !window.SOUND) {
      missing = missing || 'assets/game.js';
    }
    if (missing) {
      fatal('资源加载失败：' + missing + '。请确认 assets 目录完整，或重新解压后再打开。');
    }
    if (window.MOZHAN_SAVE_CORRUPT) {
      toast('存档损坏，已重置为新档；旧进度无法恢复。', 7000);
    }
    if (missing) return;

    bindGuide();
    renderReport();

    var mo = new MutationObserver(function () {
      if (document.body.getAttribute('data-view') === 'report') renderReport();
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ['data-view'] });

    if (!guideSeen()) {
      setTimeout(function () {
        if (document.body.getAttribute('data-view') === 'home') showGuide();
      }, 650);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
