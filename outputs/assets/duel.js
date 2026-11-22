/* 墨战 · 键影 —— 局域网对坐
 * 依赖桌面版内嵌房间服务（或 node server/room-server.js）。
 * 单机模式不加载本文件的任何网络逻辑，file:// 下也能正常游玩。
 */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var SAVE_KEY = 'mozhan.save.v1';
  var MAX_HP = 180;
  var CONTENT_LABEL = { 'en-zh': '英语 · 汉译英', 'en-en': '英语 · 直示英文', 'zh': '汉语文章' };
  var VIEW_W = 1000;
  var VIEW_H = 360;

  var net = {
    ws: null, url: '', open: false, remote: false, closing: false,
    port: 0, ips: [], rooms: [], room: null, role: null,
    poll: 0, retry: 0, connecting: false, lastMsg: 0
  };
  var battle = null;
  var rafId = 0;
  var viewActive = false;
  var ui = {};
  var portraitCache = {};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function readSave() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function mySkin() {
    var sk = readSave().skin || {};
    var chars = ['scholar', 'archer', 'general', 'shaman'];
    var char = chars.indexOf(sk.char) >= 0 ? sk.char : 'scholar';
    var gender = sk.gender === 'female' ? 'female' : 'male';
    return { char: char, gender: gender };
  }
  function myWeapon() {
    var w = readSave().skin && readSave().skin.weapon;
    return w || 'bow';
  }
  function myNick() { return localStorage.getItem('mozhan.duel.nick') || '墨客'; }
  function isHttp() { return location.protocol === 'http:' || location.protocol === 'https:'; }
  function localWsUrl() { return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------------- 连接 ---------------- */
  function send(obj) {
    if (net.ws && net.ws.readyState === 1) {
      try { net.ws.send(JSON.stringify(obj)); } catch (e) {}
    }
  }
  function connect(url, cb) {
    if (net.ws && net.url === url && net.ws.readyState === 1) { if (cb) cb(); return; }
    closeSocket();
    net.closing = false;
    net.url = url;
    net.connecting = true;
    var ws;
    try { ws = new WebSocket(url); } catch (e) {
      net.connecting = false;
      setConn(false, '无法连接房间服务');
      return;
    }
    net.ws = ws;
    ws.onopen = function () {
      if (net.ws !== ws) return;
      net.open = true;
      net.connecting = false;
      net.lastMsg = Date.now();
      setConn(true);
      send({ t: 'hello', nick: myNick(), skin: mySkin() });
      if (cb) cb();
    };
    ws.onmessage = function (ev) {
      if (net.ws !== ws) return;
      net.lastMsg = Date.now();
      var m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      onMsg(m);
    };
    ws.onclose = function () {
      if (net.ws !== ws) return;
      net.open = false;
      net.connecting = false;
      onClosed();
    };
    ws.onerror = function () {};
  }
  function closeSocket() {
    if (net.ws) {
      net.closing = true;
      try { net.ws.close(); } catch (e) {}
      net.ws = null;
    }
    net.open = false;
    net.connecting = false;
  }
  function connectLocal() {
    if (!isHttp()) return;
    connect(localWsUrl(), function () { net.remote = false; fetchNet(); });
  }
  function onClosed() {
    if (net.closing) { net.closing = false; return; }
    if (battle && !battle.over) {
      battle.over = true;
      stopLoop();
      showResult('断', '连接中断', '与对手或房间服务的连接已断开。', false);
    }
    setConn(false, '连接中断');
    if (net.remote) {
      net.remote = false;
      net.room = null;
      toast('与对手主机的连接已断开');
      showLobby();
      connectLocal();
      return;
    }
    if (viewActive) {
      scheduleRetry();
    }
  }
  function scheduleRetry() {
    if (net.retry) return;
    net.retry = setTimeout(function () {
      net.retry = 0;
      if (viewActive && isHttp() && !net.open) connectLocal();
    }, 2500);
  }

  function fetchNet() {
    if (!isHttp()) return;
    fetch('/api/net', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || d.ok === false) return;
      net.port = d.port || net.port;
      net.ips = d.ips || [];
      net.rooms = d.rooms || [];
      setConn(true);
      updateNetInfo(d);
      if (ui.lobby && !ui.lobby.hidden) renderRooms();
    }).catch(function () {
      setConn(false, '房间服务不可用');
    });
  }

  /* ---------------- 消息 ---------------- */
  function onMsg(m) {
    if (!m || !m.t) return;
    if (m.t === 'hello') { net.port = m.port || net.port; updateNetInfo(); return; }
    if (m.t === 'rooms') { net.rooms = m.rooms || []; renderRooms(); return; }
    if (m.t === 'room') { showRoom(m.room, m.you); return; }
    if (m.t === 'err') { toast(m.msg || '操作失败'); return; }
    if (m.t === 'peer-left') { toast('对手已离开房间'); return; }
    if (m.t === 'start') { beginMatch(m); return; }
    if (m.t === 'st') { applyState(m); return; }
    if (m.t === 'end') { endMatch(m); return; }
    if (m.t === 'left') { net.room = null; net.role = null; showLobby(); return; }
    if (m.t === 'pong') return;
  }

  /* ---------------- 页面切换 ---------------- */
  function navigate(name) {
    $$('.view').forEach(function (v) {
      v.classList.toggle('is-active', v.getAttribute('data-view') === name);
    });
    document.body.setAttribute('data-view', name);
    try { window.scrollTo(0, 0); } catch (e) {}
  }
  function enterDuel() {
    viewActive = true;
    if (battle && !battle.over) return;
    if (!isHttp()) {
      setConn(false, '单机模式');
      if (ui.fileHint) ui.fileHint.hidden = false;
      if (ui.createBtn) ui.createBtn.disabled = true;
      renderRooms();
      return;
    }
    if (ui.fileHint) ui.fileHint.hidden = true;
    if (ui.createBtn) ui.createBtn.disabled = false;
    showLobby();
    connectLocal();
    fetchNet();
    if (!net.poll) {
      net.poll = setInterval(function () {
        if (!viewActive) return;
        if (ui.lobby && !ui.lobby.hidden) fetchNet();
      }, 2000);
    }
  }
  function leaveDuelView() {
    viewActive = false;
    clearTimeout(net.retry);
    net.retry = 0;
    if (net.poll) { clearInterval(net.poll); net.poll = 0; }
    if (net.room) send({ t: 'leave' });
    net.room = null;
    net.role = null;
    battle = null;
    stopLoop();
    closeSocket();
    if (ui.lobby) ui.lobby.hidden = false;
    if (ui.roomPanel) ui.roomPanel.hidden = true;
    if (ui.stage) ui.stage.hidden = true;
  }

  function hideAll() {
    if (ui.lobby) ui.lobby.hidden = true;
    if (ui.roomPanel) ui.roomPanel.hidden = true;
    if (ui.stage) ui.stage.hidden = true;
  }
  function showLobby() {
    hideAll();
    if (ui.lobby) ui.lobby.hidden = false;
    if (ui.roomPanel) ui.roomPanel.hidden = true;
    renderRooms();
  }

  /* ---------------- 大厅 ---------------- */
  function renderRooms() {
    if (!ui.roomList) return;
    var list = net.rooms || [];
    if (!list.length) {
      ui.roomList.innerHTML = '<p class="duel-empty">暂无房间。点「开房」建立房间；同一局域网内的房间会自动出现。</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      var full = r.count >= 2 || r.status === 'playing';
      var key = (r.addr || '') + '|' + (r.port || '') + '|' + r.id;
      html += '<button class="duel-room-item' + (full ? ' is-full' : '') + '" type="button" data-key="' + esc(key) + '"' + (full ? ' disabled' : '') + '>' +
        '<span class="dr-main"><b>' + esc(r.name || '未命名房间') + '</b>' +
        '<em>' + esc(CONTENT_LABEL[r.content] || r.content) + ' · ' + (r.count || 1) + '/2 · ' +
        (r.status === 'playing' ? '对战中' : '等待中') + (r.local ? ' · 本机' : ' · ' + esc(r.addr || '')) + '</em></span>' +
        '<span class="dr-go">' + (full ? '已满' : '加入') + '</span></button>';
    }
    ui.roomList.innerHTML = html;
  }
  function findRoomByKey(key) {
    for (var i = 0; i < net.rooms.length; i++) {
      var r = net.rooms[i];
      if (((r.addr || '') + '|' + (r.port || '') + '|' + r.id) === key) return r;
    }
    return null;
  }
  function joinRoom(r) {
    if (!r) return;
    if (r.local || !r.addr || r.addr === '127.0.0.1' || r.addr === 'localhost') {
      connectLocal();
      var tryJoin = function () { send({ t: 'join', id: r.id }); };
      if (net.open) tryJoin();
      else connect(localWsUrl(), tryJoin);
      return;
    }
    var url = 'ws://' + r.addr + ':' + r.port + '/ws';
    net.remote = true;
    connect(url, function () { send({ t: 'join', id: r.id }); });
  }

  function updateNetInfo(data) {
    if (ui.netInfo) {
      if (!isHttp()) {
        ui.netInfo.textContent = '当前为 file:// 单机模式，联机需桌面版或本地房间服务。';
      } else {
        var ips = (data && data.ips) || net.ips || [];
        ui.netInfo.textContent = '房间服务端口 ' + net.port +
          (ips.length ? ' · 局域网 ' + ips[0] : '') +
          ' · 自动发现' + ((data && data.discovery === false) ? '受限（仍可手动连接）' : '已开启');
      }
    }
    setConn(net.open, net.connecting ? '连接中…' : null);
  }
  function setConn(ok, text) {
    if (!ui.conn) return;
    ui.conn.className = 'duel-conn' + (ok ? ' is-on' : '');
    var label = text || (ok ? '已连接' : '未连接');
    if (net.remote && ok) label = '已连入对手主机';
    ui.connText.textContent = label;
  }

  /* ---------------- 房间 ---------------- */
  function showRoom(room, role, force) {
    net.room = room;
    net.role = role;
    if (!force && ui.stage && !ui.stage.hidden) return;
    hideAll();
    if (ui.stage) ui.stage.hidden = true;
    if (ui.roomPanel) ui.roomPanel.hidden = false;
    if (!room) { showLobby(); return; }
    if (ui.rName) ui.rName.textContent = room.name || '未命名房间';
    if (ui.rContent) ui.rContent.textContent = CONTENT_LABEL[room.content] || room.content;
    if (ui.rHost) ui.rHost.textContent = room.host || '—';
    if (ui.rGuest) ui.rGuest.textContent = room.guest || '等待加入';
    if (ui.rRole) ui.rRole.textContent = role === 'host' ? '你是房主' : '你是应战者';
    if (ui.rState) {
      ui.rState.textContent = room.status === 'playing' ? '对战中' :
        (room.count >= 2 ? '双方就位，等待开始' : '等待对手加入');
    }
    $$('input[name="duel-content"]').forEach(function (inp) {
      inp.disabled = role !== 'host' || room.status === 'playing';
      inp.checked = inp.value === room.content;
    });
    if (ui.roomStart) {
      ui.roomStart.hidden = role !== 'host';
      ui.roomStart.disabled = room.count < 2 || room.status === 'playing';
      ui.roomStart.textContent = room.status === 'playing' ? '对战中…' : '开始对战';
    }
    if (ui.roomWait) {
      ui.roomWait.textContent = role === 'host'
        ? (room.count < 2 ? '等待对手加入…（同一局域网会自动发现本房间）' : '对手已就位，点「开始对战」')
        : '等待房主开始…';
    }
  }
  function hostStart() {
    if (!net.room || net.role !== 'host') return;
    if (net.room.count < 2) { toast('还没有对手加入'); return; }
    var seq = buildSeq(net.room.content);
    if (!seq || !seq.length) { toast('题库为空，无法开始'); return; }
    send({ t: 'start', seq: seq });
  }
  function buildSeq(content) {
    var out = [];
    if (content === 'zh') {
      var pool = (window.LONG_TEXTS || []).filter(function (x) {
        return x && x.t && x.py && x.t.length >= 8 && x.t.length <= 36;
      });
      pool = shuffle(pool).slice(0, 20);
      pool.forEach(function (x) {
        out.push({ k: 'zh', t: x.t, s: x.s || '', py: x.py });
      });
      return out;
    }
    var all = (window.VOCAB && window.VOCAB.EN3500) || [];
    var words = all.filter(function (x) {
      return x && /^[a-z'\-]{3,11}$/.test(String(x.w || '')) && x.r <= 1600;
    });
    var seen = {};
    var picked = [];
    shuffle(words).forEach(function (x) {
      if (seen[x.w] || picked.length >= 70) return;
      seen[x.w] = 1;
      picked.push(x);
    });
    picked.forEach(function (x) {
      out.push({ k: 'en', w: x.w, m: x.m || '' });
    });
    return out;
  }
  function leaveToLobby() {
    if (net.room) send({ t: 'leave' });
    net.room = null;
    net.role = null;
    battle = null;
    stopLoop();
    if (net.remote) {
      net.remote = false;
      closeSocket();
      connectLocal();
    }
    hideAll();
    if (ui.lobby) ui.lobby.hidden = false;
    renderRooms();
    fetchNet();
  }

  /* ---------------- 对战 ---------------- */
  function promptLetters(item) {
    if (!item) return '';
    if (item.k === 'zh') return String(item.py || '').replace(/ /g, '');
    return String(item.w || '');
  }
  function letterDamage() {
    if (!battle) return 10;
    var acc = battle.total ? (battle.correct / battle.total) * 100 : 100;
    return Math.max(1, Math.round(5 * (1 + acc / 100)));
  }
  function beginMatch(m) {
    if (!m || !m.seq || !m.seq.length) return;
    hideAll();
    if (ui.roomPanel) ui.roomPanel.hidden = true;
    if (ui.stage) ui.stage.hidden = false;
    if (ui.result) ui.result.hidden = true;
    battle = {
      side: m.side === 'B' ? 'B' : 'A',
      content: m.content || 'en-zh',
      seq: m.seq,
      idx: 0,
      typed: 0,
      correct: 0,
      total: 0,
      combo: 0,
      errors: 0,
      hp: MAX_HP,
      foeHp: MAX_HP,
      left: 150000,
      readyAt: performance.now() + Math.max(0, m.in || 0),
      started: false,
      over: false,
      rival: m.rival || {},
      projs: {},
      fx: [],
      shake: 0,
      banner: '',
      bannerUntil: 0
    };
    var me = mySkin();
    var foe = battle.rival.skin && battle.rival.skin.char ? battle.rival.skin : null;
    loadPortrait('me', me);
    loadPortrait('foe', foe || { char: me.char === 'scholar' ? 'archer' : 'scholar', gender: me.gender });
    if (ui.nickMe) ui.nickMe.textContent = myNick() + '（你）';
    if (ui.nickFoe) ui.nickFoe.textContent = battle.rival.nick || '对手';
    renderPrompt();
    updateHud();
    setBanner('3');
    try { window.SOUND.unlock(); window.SOUND.ui(); } catch (e) {}
    startLoop();
    if (ui.promptBox) ui.promptBox.classList.remove('is-flash');
  }
  function stopLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }
  function startLoop() {
    stopLoop();
    rafId = requestAnimationFrame(function tick() {
      rafId = 0;
      if (!battle || battle.over) return;
      drawField();
      updateBanner();
      rafId = requestAnimationFrame(tick);
    });
  }
  function setBanner(text) {
    battle.banner = text;
    if (ui.banner) { ui.banner.hidden = false; ui.banner.textContent = text; }
  }
  function updateBanner() {
    if (!battle) return;
    var left = battle.readyAt - performance.now();
    if (left > 0) {
      setBanner(String(Math.ceil(left / 1000)));
      battle.started = false;
    } else if (!battle.started) {
      battle.started = true;
      setBanner('开战');
      battle.bannerUntil = performance.now() + 700;
      try { window.SOUND.ready(); } catch (e) {}
    } else if (battle.bannerUntil && performance.now() > battle.bannerUntil) {
      battle.bannerUntil = 0;
      if (ui.banner) ui.banner.hidden = true;
    }
  }
  function applyState(s) {
    if (!battle || battle.over) return;
    battle.hp = battle.side === 'A' ? s.a : s.b;
    battle.foeHp = battle.side === 'A' ? s.b : s.a;
    battle.left = s.left || 0;
    var seen = {};
    var list = s.p || [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var id = p[0];
      seen[id] = 1;
      var old = battle.projs[id];
      if (!old) {
        battle.projs[id] = { o: p[1], x: p[2], y: p[3], tx: p[2], ty: p[3], dmg: p[4], acc: p[5], born: performance.now() };
      } else {
        old.tx = p[2]; old.ty = p[3]; old.acc = p[5];
      }
    }
    Object.keys(battle.projs).forEach(function (k) {
      if (!seen[k]) delete battle.projs[k];
    });
    var evs = s.ev || [];
    for (var e = 0; e < evs.length; e++) {
      var ev = evs[e];
      if (ev.k === 'blk') {
        addBurst(ev.x, ev.y, 8, '#6b6053');
        try { window.SOUND.flip(); } catch (err) {}
      } else if (ev.k === 'hit') {
        var meHit = ev.w === battle.side;
        if (meHit) {
          battle.shake = 12;
          addFloat(battle.side === 'A' ? 170 : 830, 210, '-' + ev.d, '#a8362b');
          try { window.SOUND.hurt(); } catch (err) {}
        } else {
          addFloat(battle.side === 'A' ? 830 : 170, 210, '-' + ev.d, '#2f4257');
          try { window.SOUND.kill(true); } catch (err) {}
        }
      }
    }
    updateHud();
  }
  function endMatch(m) {
    if (!battle) return;
    battle.over = true;
    stopLoop();
    drawField();
    var reason = m.reason || '';
    if (m.winner === 'draw') {
      showResult('平', '平局', reason || '双方同时力竭', false);
    } else if (m.winner === battle.side) {
      showResult('胜', '胜局', reason || '对手生命耗尽', true);
    } else {
      showResult('负', '惜败', reason || '你的生命耗尽', false);
    }
    try { window.SOUND.ultimate(myWeapon()); } catch (e) {}
  }
  function showResult(seal, title, sub, win) {
    if (!ui.result) return;
    ui.result.hidden = false;
    ui.result.className = 'duel-result' + (win ? ' is-win' : '');
    if (ui.resultSeal) ui.resultSeal.textContent = seal;
    if (ui.resultTitle) ui.resultTitle.textContent = title;
    if (ui.resultSub) ui.resultSub.textContent = sub;
    if (ui.resultAgain) {
      ui.resultAgain.hidden = net.role !== 'host';
      ui.resultAgain.textContent = '再开一局';
    }
  }
  function updateHud() {
    if (!battle) return;
    var acc = battle.total ? (battle.correct / battle.total) * 100 : 100;
    if (ui.hpMe) ui.hpMe.textContent = Math.max(0, Math.round(battle.hp));
    if (ui.hpFoe) ui.hpFoe.textContent = Math.max(0, Math.round(battle.foeHp));
    if (ui.barMe) ui.barMe.style.width = Math.max(0, Math.min(100, battle.hp / MAX_HP * 100)) + '%';
    if (ui.barFoe) ui.barFoe.style.width = Math.max(0, Math.min(100, battle.foeHp / MAX_HP * 100)) + '%';
    if (ui.combo) ui.combo.textContent = battle.combo + ' 连';
    if (ui.acc) ui.acc.textContent = acc.toFixed(0) + '%';
    if (ui.timer) {
      var sec = Math.max(0, Math.ceil(battle.left / 1000));
      ui.timer.textContent = Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
    }
  }
  function renderPrompt() {
    if (!battle || !battle.seq.length) return;
    var item = battle.seq[battle.idx];
    var letters = promptLetters(item);
    if (ui.pLabel) ui.pLabel.textContent = CONTENT_LABEL[battle.content] || '对坐';
    if (ui.pMeta) ui.pMeta.textContent = '第 ' + (battle.idx + 1) + ' / ' + battle.seq.length + ' 题';
    if (!item) return;
    if (item.k === 'zh') {
      if (ui.pMain) ui.pMain.textContent = item.t;
      if (ui.pSub) ui.pSub.innerHTML = markLetters(item.py || '', battle.typed);
      if (ui.pTyped) { ui.pTyped.className = 'dp-typed'; ui.pTyped.textContent = item.s || ''; }
    } else if (battle.content === 'en-en' || battle.content === 'en-zh' && item.k === 'en') {
      if (battle.content === 'en-zh') {
        if (ui.pMain) ui.pMain.textContent = item.m || '—';
        if (ui.pSub) ui.pSub.textContent = '';
        if (ui.pTyped) { ui.pTyped.className = 'dp-typed is-word'; ui.pTyped.innerHTML = typedMarks(letters, battle.typed); }
      } else {
        if (ui.pMain) ui.pMain.innerHTML = markLetters(item.w || '', battle.typed);
        if (ui.pSub) ui.pSub.textContent = '';
        if (ui.pTyped) { ui.pTyped.className = 'dp-typed'; ui.pTyped.textContent = '照词输入 · ' + letters.length + ' 字母'; }
      }
    }
    if (ui.pTip) {
      ui.pTip.textContent = item.k === 'zh' ? '输入拼音字母（无需切换输入法）' : '正确字母即发一击 · 整词完成额外重击';
    }
  }
  function markLetters(text, n) {
    var out = '';
    var k = 0;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (ch === ' ') { out += ' '; continue; }
      out += '<b class="' + (k < n ? 'on' : 'off') + '">' + esc(ch) + '</b>';
      k++;
    }
    return out;
  }
  function typedMarks(letters, n) {
    var out = '';
    for (var i = 0; i < letters.length; i++) {
      out += i < n ? '<b class="on">' + esc(letters.charAt(i)) + '</b>' : '<i>_</i>';
    }
    return out;
  }
  function flashPrompt() {
    if (!ui.promptBox) return;
    ui.promptBox.classList.remove('is-flash');
    void ui.promptBox.offsetWidth;
    ui.promptBox.classList.add('is-flash');
  }
  function forfeit() {
    if (!battle || battle.over) return;
    battle.over = true;
    stopLoop();
    if (net.room) send({ t: 'leave' });
    net.room = null;
    net.role = null;
    toast('你已退出对局');
    if (net.remote) { net.remote = false; closeSocket(); connectLocal(); }
    hideAll();
    if (ui.lobby) ui.lobby.hidden = false;
    battle = null;
    fetchNet();
  }

  /* ---------------- 输入 ---------------- */
  function onKeyDown(e) {
    if (document.body.getAttribute('data-view') !== 'duel') return;
    if (!battle || battle.over) return;
    if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
    if (e.key === 'Escape') { e.preventDefault(); forfeit(); return; }
    if (e.key.length !== 1) return;
    e.preventDefault();
    if (performance.now() < battle.readyAt) return;
    var item = battle.seq[battle.idx];
    if (!item) return;
    var letters = promptLetters(item);
    if (battle.typed >= letters.length) return;
    var ch = e.key;
    battle.total++;
    if (ch.toLowerCase() === letters.charAt(battle.typed).toLowerCase()) {
      battle.correct++;
      battle.combo++;
      battle.typed++;
      var dmg = letterDamage();
      send({ t: 'hit', dmg: dmg });
      try { window.SOUND.light(myWeapon(), 0, battle.combo); } catch (err) {}
      if (battle.typed >= letters.length) {
        battle.typed = 0;
        battle.idx = (battle.idx + 1) % battle.seq.length;
        send({ t: 'hit', dmg: Math.round(dmg * 3), heavy: true });
        try { window.SOUND.heavy(myWeapon()); } catch (err) {}
        flashPrompt();
      }
    } else {
      battle.errors++;
      battle.combo = 0;
      battle.shake = 6;
      try { window.SOUND.error(); } catch (err) {}
    }
    updateHud();
    renderPrompt();
  }

  /* ---------------- 画布 ---------------- */
  function loadPortrait(which, skin) {
    var key = (skin.char || 'scholar') + '-' + (skin.gender === 'female' ? 'female' : 'male');
    if (portraitCache[key]) { if (which === 'me') battle.imgMe = portraitCache[key]; else battle.imgFoe = portraitCache[key]; return; }
    var img = new Image();
    img.onload = function () {
      portraitCache[key] = img;
      if (!battle) return;
      if (which === 'me') battle.imgMe = img; else battle.imgFoe = img;
    };
    img.onerror = function () { portraitCache[key] = null; };
    img.src = 'assets/portraits/' + key + '.png';
  }
  function drawField() {
    if (!battle || !ui.canvas) return;
    var box = ui.canvas.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.round(box.width * dpr);
    var h = Math.round(box.height * dpr);
    if (ui.canvas.width !== w || ui.canvas.height !== h) {
      ui.canvas.width = w;
      ui.canvas.height = h;
    }
    var c = ui.cctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, box.width, box.height);
    var scale = Math.min(box.width / VIEW_W, box.height / VIEW_H);
    var ox = (box.width - VIEW_W * scale) / 2;
    var oy = (box.height - VIEW_H * scale) / 2;
    c.save();
    c.translate(ox, oy);
    c.scale(scale, scale);
    if (battle.shake > 0.3) {
      c.translate((Math.random() - 0.5) * battle.shake, (Math.random() - 0.5) * battle.shake);
      battle.shake *= 0.86;
    }
    drawScene(c);
    drawProjectiles(c);
    drawFx(c);
    c.restore();
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
  function drawScene(c) {
    var g = c.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#f4ecdc');
    g.addColorStop(0.7, '#e9dcc4');
    g.addColorStop(1, '#ddcdb1');
    c.fillStyle = g;
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.fillStyle = 'rgba(75,70,61,0.14)';
    c.beginPath();
    c.moveTo(0, 250);
    c.quadraticCurveTo(120, 172, 250, 232);
    c.quadraticCurveTo(360, 272, 500, 216);
    c.quadraticCurveTo(660, 158, 800, 226);
    c.quadraticCurveTo(900, 266, 1000, 208);
    c.lineTo(1000, 320);
    c.lineTo(0, 320);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(23,19,15,0.26)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(40, 312);
    c.lineTo(960, 312);
    c.stroke();
    c.fillStyle = 'rgba(23,19,15,0.06)';
    c.beginPath();
    c.ellipse(150, 314, 110, 10, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(850, 314, 110, 10, 0, 0, Math.PI * 2);
    c.fill();
    drawPortrait(c, battle.imgMe, 150, 'me');
    drawPortrait(c, battle.imgFoe, 850, 'foe');
  }
  function drawPortrait(c, img, cx, which) {
    var w = 148, h = 198, x = cx - w / 2, y = 312 - h;
    c.save();
    c.shadowColor = 'rgba(23,19,15,0.28)';
    c.shadowBlur = 16;
    c.shadowOffsetY = 5;
    c.fillStyle = '#efe6d3';
    roundRect(c, x, y, w, h, 8);
    c.fill();
    c.restore();
    if (img) {
      c.save();
      roundRect(c, x, y, w, h, 8);
      c.clip();
      c.drawImage(img, x, y, w, h);
      c.restore();
    } else {
      c.fillStyle = 'rgba(23,19,15,0.10)';
      roundRect(c, x, y, w, h, 8);
      c.fill();
    }
    c.strokeStyle = which === 'me' ? 'rgba(168,54,43,0.55)' : 'rgba(47,66,87,0.5)';
    c.lineWidth = 2;
    roundRect(c, x, y, w, h, 8);
    c.stroke();
    c.fillStyle = which === 'me' ? '#a8362b' : '#2f4257';
    c.font = '600 12px "Songti SC", "STSong", serif';
    c.textAlign = 'center';
    c.fillText(which === 'me' ? '你' : '对手', cx, 330);
  }
  function drawProjectiles(c) {
    var keys = Object.keys(battle.projs);
    for (var i = 0; i < keys.length; i++) {
      var p = battle.projs[keys[i]];
      p.x += (p.tx - p.x) * 0.35;
      p.y += (p.ty - p.y) * 0.35;
      var dir = p.o === 'A' ? 1 : -1;
      var col = p.o === 'A' ? 'rgba(168,54,43,0.85)' : 'rgba(47,66,87,0.85)';
      var heavy = p.dmg >= 26;
      c.save();
      c.strokeStyle = col;
      c.lineWidth = heavy ? 4 : 2;
      c.beginPath();
      c.moveTo(p.x - dir * (heavy ? 46 : 28), p.y);
      c.lineTo(p.x, p.y);
      c.stroke();
      c.fillStyle = col;
      c.beginPath();
      c.arc(p.x, p.y, heavy ? 6 : 3.6, 0, Math.PI * 2);
      c.fill();
      if (p.acc > 0) {
        c.strokeStyle = 'rgba(23,19,15,0.45)';
        c.lineWidth = 1;
        c.beginPath();
        c.arc(p.x, p.y, heavy ? 10 : 7, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
    }
  }
  function addFloat(x, y, text, color) {
    if (!battle) return;
    battle.fx.push({ type: 'text', x: x, y: y, text: text, color: color, life: 1 });
  }
  function addBurst(x, y, n, color) {
    if (!battle) return;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 20 + Math.random() * 60;
      battle.fx.push({ type: 'dot', x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, color: color, life: 1 });
    }
  }
  function drawFx(c) {
    for (var i = battle.fx.length - 1; i >= 0; i--) {
      var f = battle.fx[i];
      f.life -= 0.03;
      if (f.life <= 0) { battle.fx.splice(i, 1); continue; }
      if (f.type === 'dot') {
        f.x += f.vx * 0.05;
        f.y += f.vy * 0.05;
        c.globalAlpha = f.life;
        c.fillStyle = f.color;
        c.beginPath();
        c.arc(f.x, f.y, 2.2, 0, Math.PI * 2);
        c.fill();
      } else {
        c.globalAlpha = Math.min(1, f.life);
        c.fillStyle = f.color;
        c.font = '700 18px "Songti SC", "STSong", serif';
        c.textAlign = 'center';
        c.fillText(f.text, f.x, f.y - (1 - f.life) * 34);
      }
      c.globalAlpha = 1;
    }
  }

  /* ---------------- 交互绑定 ---------------- */
  function toast(msg) {
    if (!ui.toast) return;
    ui.toast.textContent = msg;
    ui.toast.hidden = false;
    clearTimeout(ui._toastTimer);
    ui._toastTimer = setTimeout(function () { ui.toast.hidden = true; }, 2400);
  }
  function bind() {
    if (ui.createBtn) {
      ui.createBtn.addEventListener('click', function () {
        if (!isHttp()) { toast('联机需要桌面版或本地房间服务'); return; }
        var name = (ui.roomName && ui.roomName.value || '').trim().slice(0, 18);
        var content = 'en-zh';
        var checked = $('input[name="duel-content"]:checked');
        if (checked) content = checked.value;
        if (!net.open) {
          connect(localWsUrl(), function () { send({ t: 'create', name: name, content: content }); });
        } else {
          send({ t: 'create', name: name, content: content });
        }
      });
    }
    if (ui.refreshBtn) ui.refreshBtn.addEventListener('click', function () { fetchNet(); });
    if (ui.roomList) {
      ui.roomList.addEventListener('click', function (e) {
        var btn = e.target.closest ? e.target.closest('[data-key]') : null;
        if (!btn) return;
        var r = findRoomByKey(btn.getAttribute('data-key'));
        if (r) joinRoom(r);
      });
    }
    if (ui.nickInput) {
      ui.nickInput.value = myNick();
      ui.nickInput.addEventListener('change', function () {
        var v = ui.nickInput.value.trim().slice(0, 12) || '墨客';
        localStorage.setItem('mozhan.duel.nick', v);
        send({ t: 'hello', nick: v, skin: mySkin() });
      });
    }
    $$('input[name="duel-content"]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        if (net.role === 'host' && net.room && net.room.status !== 'playing') {
          send({ t: 'cfg', content: inp.value });
        }
      });
    });
    if (ui.roomStart) ui.roomStart.addEventListener('click', hostStart);
    if (ui.roomLeave) ui.roomLeave.addEventListener('click', leaveToLobby);
    if (ui.lobbyBack) ui.lobbyBack.addEventListener('click', function () { navigate('home'); });
    if (ui.back) ui.back.addEventListener('click', function () { navigate('home'); });
    if (ui.resultRoom) {
      ui.resultRoom.addEventListener('click', function () {
        if (ui.result) ui.result.hidden = true;
        if (net.room) showRoom(net.room, net.role, true);
        else showLobby();
      });
    }
    if (ui.resultAgain) {
      ui.resultAgain.addEventListener('click', function () { hostStart(); });
    }
    if (ui.resultLeave) {
      ui.resultLeave.addEventListener('click', function () { leaveToLobby(); });
    }
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', function () { if (battle) drawField(); });

    var mo = new MutationObserver(function () {
      if (document.body.getAttribute('data-view') === 'duel') {
        if (!viewActive) enterDuel();
      } else if (viewActive) {
        leaveDuelView();
      }
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
  }

  function cache() {
    ui.lobby = $('#duel-lobby');
    ui.roomPanel = $('#duel-room');
    ui.stage = $('#duel-stage');
    ui.conn = $('#duel-conn');
    ui.connText = $('#duel-conn-text');
    ui.netInfo = $('#duel-netinfo');
    ui.fileHint = $('#duel-filehint');
    ui.roomList = $('#duel-room-list');
    ui.createBtn = $('#duel-create');
    ui.refreshBtn = $('#duel-refresh');
    ui.roomName = $('#duel-roomname');
    ui.nickInput = $('#duel-nick');
    ui.rName = $('#duel-room-name');
    ui.rContent = $('#duel-room-content');
    ui.rHost = $('#duel-room-host');
    ui.rGuest = $('#duel-room-guest');
    ui.rRole = $('#duel-room-role');
    ui.rState = $('#duel-room-state');
    ui.roomStart = $('#duel-room-start');
    ui.roomLeave = $('#duel-room-leave');
    ui.roomWait = $('#duel-room-wait');
    ui.lobbyBack = $('#duel-back');
    ui.back = $('#duel-stage-back');
    ui.canvas = $('#duel-canvas');
    if (ui.canvas) ui.cctx = ui.canvas.getContext('2d');
    ui.banner = $('#duel-banner');
    ui.result = $('#duel-result');
    ui.resultSeal = $('#duel-result-seal');
    ui.resultTitle = $('#duel-result-title');
    ui.resultSub = $('#duel-result-sub');
    ui.resultRoom = $('#duel-result-room');
    ui.resultAgain = $('#duel-result-again');
    ui.resultLeave = $('#duel-result-leave');
    ui.hpMe = $('#duel-hp-me');
    ui.hpFoe = $('#duel-hp-foe');
    ui.barMe = $('#duel-bar-me');
    ui.barFoe = $('#duel-bar-foe');
    ui.nickMe = $('#duel-nick-me');
    ui.nickFoe = $('#duel-nick-foe');
    ui.timer = $('#duel-timer');
    ui.promptBox = $('#duel-prompt');
    ui.pLabel = $('#duel-prompt-label');
    ui.pMeta = $('#duel-prompt-meta');
    ui.pMain = $('#duel-prompt-main');
    ui.pSub = $('#duel-prompt-sub');
    ui.pTyped = $('#duel-prompt-typed');
    ui.pTip = $('#duel-prompt-tip');
    ui.combo = $('#duel-combo');
    ui.acc = $('#duel-acc');
    ui.toast = $('#duel-toast');
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!$('#duel-lobby')) return;
    cache();
    bind();
    if (document.body.getAttribute('data-view') === 'duel') enterDuel();
  });
})();
