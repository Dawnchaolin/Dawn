/* 墨战 · 键影 —— 内嵌局域网房间服务
 * 同一份代码可被 Electron 主进程直接 require，也可用 `node server/room-server.js` 单独启动。
 * 负责：静态页面托管、WebSocket 房间、服务端攻击结算、UDP 组播自动发现。
 */
'use strict';

var http = require('http');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var dgram = require('dgram');
var os = require('os');
var URL = require('url').URL;

var ROOT = path.resolve(__dirname, '..');
var DISCOVERY_PORT = 8790;
var DISCOVERY_GROUP = '239.255.42.99';
var MAX_HP = 180;
var PROJ_SPEED = 300;
var MATCH_LIMIT_MS = 150000;
var TICK_MS = 50;
var CONTENT_LABEL = {
  'en-zh': '英语 · 汉译英',
  'en-en': '英语 · 直示英文',
  'zh': '汉语文章'
};
var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

function now() { return Date.now(); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function rand(a, b) { return a + Math.random() * (b - a); }
function lanIPs() {
  var out = [];
  var nets = os.networkInterfaces();
  Object.keys(nets).forEach(function (name) {
    (nets[name] || []).forEach(function (n) {
      if (n.family === 'IPv4' && !n.internal) out.push(n.address);
    });
  });
  return out;
}
function safeText(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').slice(0, max);
}
function makeId() {
  var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var s = '';
  for (var i = 0; i < 4; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return s;
}

/* ---------------- 最小 WebSocket 实现 ---------------- */
function wsFrame(str) {
  var payload = Buffer.from(str, 'utf8');
  var head;
  if (payload.length < 126) {
    head = Buffer.alloc(2);
    head[1] = payload.length;
  } else if (payload.length < 65536) {
    head = Buffer.alloc(4);
    head[1] = 126;
    head.writeUInt16BE(payload.length, 2);
  } else {
    head = Buffer.alloc(10);
    head[1] = 127;
    head.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  head[0] = 0x81;
  return Buffer.concat([head, payload]);
}
function closeFrame() {
  return Buffer.from([0x88, 0x02, 0x03, 0xe8]);
}
function makeFrameReader(onText, onClose) {
  var buf = Buffer.alloc(0);
  return function (chunk) {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      var b0 = buf[0], b1 = buf[1];
      var op = b0 & 0x0f;
      var masked = (b1 & 0x80) !== 0;
      var len = b1 & 0x7f;
      var off = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        len = Number(buf.readBigUInt64BE(2));
        off = 10;
      }
      var maskOff = off;
      if (masked) off += 4;
      if (buf.length < off + len) return;
      var payload = buf.slice(off, off + len);
      if (masked) {
        var mask = buf.slice(maskOff, maskOff + 4);
        payload = Buffer.from(payload);
        for (var i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      }
      buf = buf.slice(off + len);
      if (op === 0x8) { onClose(); return; }
      if (op === 0x9) continue;
      if (op === 0x1) {
        var text = payload.toString('utf8');
        try { onText(JSON.parse(text)); } catch (e) { /* 忽略坏消息 */ }
      }
    }
  };
}

function startRoomServer(opts) {
  opts = opts || {};
  var basePort = Number(opts.port || process.env.MOZHAN_PORT || 8799);
  var inst = crypto.randomUUID();
  var rooms = new Map();
  var conns = new Set();
  var discovered = new Map();
  var udp = null;
  var actualPort = 0;

  function roomView(room) {
    return {
      id: room.id,
      name: room.name,
      content: room.content,
      label: CONTENT_LABEL[room.content] || room.content,
      status: room.status,
      host: room.host ? room.host.nick : '',
      guest: room.guest ? room.guest.nick : '',
      count: (room.host ? 1 : 0) + (room.guest ? 1 : 0),
      hostSkin: room.host ? room.host.skin : null,
      guestSkin: room.guest ? room.guest.skin : null
    };
  }
  function aliveConn(c) { return !!(c && c.alive && c.sock && !c.sock.destroyed); }
  function send(conn, obj) {
    if (!aliveConn(conn)) return;
    try { conn.sock.write(wsFrame(JSON.stringify(obj))); } catch (e) { /* 网络已断 */ }
  }
  function roomPeers(room) {
    return [room.host, room.guest].filter(aliveConn);
  }
  function broadcastRoom(room) {
    var peers = roomPeers(room);
    peers.forEach(function (c) {
      send(c, { t: 'room', room: roomView(room), you: c.role });
    });
  }
  function localSummaries() {
    var list = [];
    rooms.forEach(function (room) {
      var v = roomView(room);
      v.addr = '127.0.0.1';
      v.port = actualPort;
      v.local = true;
      list.push(v);
    });
    return list;
  }
  function mergeRooms() {
    var list = localSummaries();
    var stamp = now();
    discovered.forEach(function (v, key) {
      if (stamp - v.seen > 7000) { discovered.delete(key); return; }
      if (v.inst === inst) return;
      if (v.addr === '127.0.0.1' || v.addr === '::1') return;
      list.push({
        id: v.id, name: v.name, content: v.content,
        label: CONTENT_LABEL[v.content] || v.content,
        status: v.status, host: v.host, guest: v.guest, count: v.count,
        addr: v.addr, port: v.port, local: false
      });
    });
    list.sort(function (a, b) {
      if (a.status !== b.status) return a.status === 'waiting' ? -1 : 1;
      return String(a.name).localeCompare(String(b.name));
    });
    return list;
  }

  /* ---------------- 组播发现 ---------------- */
  function announce() {
    if (!udp || !rooms.size) return;
    var payload = Buffer.from(JSON.stringify({
      m: 'mozhan', t: 'ann', inst: inst, port: actualPort,
      rooms: localSummaries().map(function (r) {
        return { id: r.id, name: r.name, content: r.content, status: r.status, host: r.host, guest: r.guest, count: r.count };
      })
    }));
    try { udp.send(payload, DISCOVERY_PORT, DISCOVERY_GROUP); } catch (e) { /* 组播不可用 */ }
  }
  function startDiscovery() {
    try {
      udp = dgram.createSocket({ type: 'udp4', reuseAddr: true });
      udp.on('error', function () { try { udp.close(); } catch (e) {} udp = null; });
      udp.on('message', function (buf, rinfo) {
        var m;
        try { m = JSON.parse(buf.toString('utf8')); } catch (e) { return; }
        if (!m || m.m !== 'mozhan') return;
        if (m.t === 'q') {
          if (rooms.size) setTimeout(announce, 30 + Math.random() * 180);
          return;
        }
        if (m.t !== 'ann' || m.inst === inst) return;
        var addr = rinfo.address;
        (m.rooms || []).forEach(function (r) {
          if (!r || !r.id) return;
          discovered.set(addr + ':' + m.port + ':' + r.id, {
            id: r.id, name: safeText(r.name, 24), content: r.content,
            status: r.status, host: safeText(r.host, 16), guest: safeText(r.guest, 16),
            count: r.count, addr: addr, port: m.port, inst: m.inst, seen: now()
          });
        });
      });
      udp.bind(DISCOVERY_PORT, function () {
        try {
          udp.addMembership(DISCOVERY_GROUP);
          udp.setMulticastTTL(2);
          udp.setMulticastLoopback(true);
        } catch (e) { /* 某些网络禁用组播 */ }
        announce();
      });
    } catch (e) { udp = null; }
  }

  /* ---------------- 对战结算 ---------------- */
  function finishMatch(room, winner, reason) {
    if (!room.match) return;
    room.match = null;
    room.status = 'waiting';
    room.lastActive = now();
    broadcastRoom(room);
    roomPeers(room).forEach(function (c) {
      send(c, { t: 'end', winner: winner || 'draw', reason: reason || '' });
    });
    announce();
  }
  function stepMatch(room) {
    var m = room.match;
    if (!m) return;
    var t = now();
    var dt = clamp((t - m.last) / 1000, 0, 0.12);
    m.last = t;
    if (t < m.at) { broadcastState(room); return; }
    var events = m.events;
    m.events = [];
    m.projs.forEach(function (p) { p.x += (p.o === 'A' ? 1 : -1) * PROJ_SPEED * dt; });
    var dead = {};
    for (var pass = 0; pass < 3; pass++) {
      var hit = false;
      for (var i = 0; i < m.projs.length; i++) {
        var a = m.projs[i];
        if (dead[a.id] || a.o !== 'A') continue;
        for (var j = 0; j < m.projs.length; j++) {
          var b = m.projs[j];
          if (dead[b.id] || b.o !== 'B') continue;
          if (Math.abs(a.x - b.x) > 34 || Math.abs(a.y - b.y) > 52) continue;
          a.acc += b.dmg;
          b.acc += a.dmg;
          hit = true;
          if (a.acc >= a.dmg) dead[a.id] = true;
          if (b.acc >= b.dmg) dead[b.id] = true;
          events.push({ k: 'blk', x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) });
        }
      }
      if (!hit) break;
    }
    m.projs = m.projs.filter(function (p) {
      if (dead[p.id]) return false;
      if (p.x >= 830) {
        m.hp.B = Math.max(0, m.hp.B - p.dmg);
        events.push({ k: 'hit', w: 'B', d: p.dmg });
        return false;
      }
      if (p.x <= 170) {
        m.hp.A = Math.max(0, m.hp.A - p.dmg);
        events.push({ k: 'hit', w: 'A', d: p.dmg });
        return false;
      }
      return true;
    });
    if (m.hp.A <= 0 || m.hp.B <= 0) {
      var winner = m.hp.A <= 0 && m.hp.B <= 0 ? 'draw' : (m.hp.B <= 0 ? 'A' : 'B');
      send(room.host, { t: 'st', a: m.hp.A, b: m.hp.B, p: [], ev: events, at: m.at, left: 0 });
      send(room.guest, { t: 'st', a: m.hp.A, b: m.hp.B, p: [], ev: events, at: m.at, left: 0 });
      finishMatch(room, winner, '生命耗尽');
      return;
    }
    if (t >= m.endAt) {
      var w2 = m.hp.A === m.hp.B ? 'draw' : (m.hp.A > m.hp.B ? 'A' : 'B');
      send(room.host, { t: 'st', a: m.hp.A, b: m.hp.B, p: [], ev: events, at: m.at, left: 0 });
      send(room.guest, { t: 'st', a: m.hp.A, b: m.hp.B, p: [], ev: events, at: m.at, left: 0 });
      finishMatch(room, w2, '时间到');
      return;
    }
    broadcastState(room, events);
  }
  function broadcastState(room, events) {
    var m = room.match;
    if (!m) return;
    var t = now();
    var msg = {
      t: 'st',
      a: m.hp.A,
      b: m.hp.B,
      p: m.projs.map(function (p) { return [p.id, p.o, Math.round(p.x), Math.round(p.y), p.dmg, p.acc]; }),
      ev: events || [],
      at: m.at,
      in: Math.max(0, m.at - t),
      left: Math.max(0, m.endAt - t)
    };
    send(room.host, msg);
    send(room.guest, msg);
  }

  /* ---------------- 房间操作 ---------------- */
  function leaveRoom(conn, quiet) {
    var room = conn.roomId ? rooms.get(conn.roomId) : null;
    conn.roomId = null;
    var wasRole = conn.role;
    conn.role = null;
    if (!room) return;
    var others = roomPeers(room).filter(function (c) { return c !== conn; });
    if (room.match) {
      var winner = wasRole === 'host' ? 'B' : 'A';
      if (others.length) {
        try {
          var m = room.match;
          send(others[0], { t: 'st', a: m.hp.A, b: m.hp.B, p: [], ev: [], at: m.at, left: 0 });
        } catch (e) {}
      }
      finishMatch(room, winner, '对手离开');
    }
    if (wasRole === 'host') {
      if (room.guest && aliveConn(room.guest)) {
        room.host = room.guest;
        room.guest = null;
        room.host.role = 'host';
        room.status = 'waiting';
        room.lastActive = now();
        send(room.host, { t: 'peer-left', role: 'guest' });
        send(room.host, { t: 'room', room: roomView(room), you: 'host' });
      } else {
        rooms.delete(room.id);
      }
    } else {
      room.guest = null;
      room.status = 'waiting';
      room.lastActive = now();
      if (!room.host || !aliveConn(room.host)) rooms.delete(room.id);
      else {
        send(room.host, { t: 'peer-left', role: 'guest' });
        send(room.host, { t: 'room', room: roomView(room), you: 'host' });
      }
    }
    if (!quiet) { /* 离开时已通过房间广播通知对手 */ }
    announce();
  }
  function sanitizeSeq(seq) {
    if (!Array.isArray(seq) || !seq.length || seq.length > 160) return null;
    var out = [];
    for (var i = 0; i < seq.length; i++) {
      var it = seq[i];
      if (!it || typeof it !== 'object') return null;
      if (it.k === 'en') {
        var w = String(it.w || '');
        if (!/^[A-Za-z'\-]{1,30}$/.test(w)) return null;
        out.push({ k: 'en', w: w, m: safeText(it.m, 80) });
      } else if (it.k === 'zh') {
        var tx = safeText(it.t, 140);
        var py = String(it.py || '').toLowerCase().replace(/[^a-z ]/g, '');
        if (!tx || !py) return null;
        out.push({ k: 'zh', t: tx, py: py, s: safeText(it.s, 40) });
      } else {
        return null;
      }
    }
    return out;
  }

  function onMessage(conn, msg) {
    if (!msg || typeof msg.t !== 'string') return;
    conn.last = now();
    if (msg.t === 'ping') { send(conn, { t: 'pong' }); return; }
    if (msg.t === 'hello') {
      conn.nick = safeText(msg.nick, 12) || conn.nick;
      conn.skin = msg.skin && typeof msg.skin === 'object'
        ? { char: safeText(msg.skin.char, 12), gender: safeText(msg.skin.gender, 6) }
        : conn.skin;
      send(conn, { t: 'hello', inst: inst, port: actualPort, nick: conn.nick });
      return;
    }
    if (msg.t === 'rooms') { send(conn, { t: 'rooms', rooms: mergeRooms() }); return; }
    if (msg.t === 'create') {
      if (conn.roomId) leaveRoom(conn);
      var id = makeId();
      while (rooms.has(id)) id = makeId();
      var content = CONTENT_LABEL[msg.content] ? msg.content : 'en-zh';
      var room = {
        id: id,
        name: safeText(msg.name, 18) || (conn.nick + '的房间'),
        content: content,
        status: 'waiting',
        host: conn,
        guest: null,
        createdAt: now(),
        lastActive: now(),
        match: null
      };
      rooms.set(id, room);
      conn.roomId = id;
      conn.role = 'host';
      send(conn, { t: 'room', room: roomView(room), you: 'host' });
      announce();
      return;
    }
    if (msg.t === 'join') {
      var r = rooms.get(String(msg.id || ''));
      if (!r) { send(conn, { t: 'err', msg: '房间不存在或已关闭' }); return; }
      if (r.host === conn || r.guest === conn) { send(conn, { t: 'room', room: roomView(r), you: conn.role }); return; }
      if (r.status === 'playing') { send(conn, { t: 'err', msg: '该房间正在对战' }); return; }
      if (r.guest && aliveConn(r.guest)) { send(conn, { t: 'err', msg: '房间已满' }); return; }
      if (conn.roomId) leaveRoom(conn);
      r.guest = conn;
      conn.roomId = r.id;
      conn.role = 'guest';
      r.lastActive = now();
      broadcastRoom(r);
      announce();
      return;
    }
    if (msg.t === 'cfg') {
      var r2 = conn.roomId && rooms.get(conn.roomId);
      if (!r2 || conn.role !== 'host' || r2.status !== 'waiting') return;
      if (CONTENT_LABEL[msg.content]) r2.content = msg.content;
      broadcastRoom(r2);
      return;
    }
    if (msg.t === 'start') {
      var r3 = conn.roomId && rooms.get(conn.roomId);
      if (!r3 || conn.role !== 'host' || !aliveConn(r3.guest)) { send(conn, { t: 'err', msg: '尚未有对手加入' }); return; }
      if (r3.status !== 'waiting') return;
      var seq = sanitizeSeq(msg.seq);
      if (!seq) { send(conn, { t: 'err', msg: '题目序列无效' }); return; }
      var at = now() + 3200;
      r3.match = {
        seq: seq,
        at: at,
        endAt: at + MATCH_LIMIT_MS,
        last: now(),
        hp: { A: MAX_HP, B: MAX_HP },
        projs: [],
        next: 1,
        events: []
      };
      r3.status = 'playing';
      r3.lastActive = now();
      broadcastRoom(r3);
      send(r3.host, {
        t: 'start', side: 'A', content: r3.content, seq: seq, at: at, in: at - now(), hp: MAX_HP,
        rival: { nick: r3.guest.nick, skin: r3.guest.skin }
      });
      send(r3.guest, {
        t: 'start', side: 'B', content: r3.content, seq: seq, at: at, in: at - now(), hp: MAX_HP,
        rival: { nick: r3.host.nick, skin: r3.host.skin }
      });
      return;
    }
    if (msg.t === 'hit') {
      var r4 = conn.roomId && rooms.get(conn.roomId);
      if (!r4 || !r4.match || r4.status !== 'playing') return;
      var mm = r4.match;
      if (now() < mm.at + 120) return;
      var dmg = Math.round(clamp(Number(msg.dmg) || 0, 1, 60) * rand(0.86, 1.14));
      dmg = clamp(dmg, 1, 70);
      var side = conn === r4.host ? 'A' : 'B';
      var heavy = !!msg.heavy;
      var p = {
        id: mm.next++,
        o: side,
        x: side === 'A' ? 165 : 835,
        y: Math.round(rand(160, 262)),
        dmg: dmg,
        acc: 0,
        heavy: heavy
      };
      mm.projs.push(p);
      mm.events.push({ k: 'spawn', id: p.id, o: side, x: p.x, y: p.y, d: dmg, h: heavy ? 1 : 0 });
      return;
    }
    if (msg.t === 'leave') { leaveRoom(conn); send(conn, { t: 'left' }); return; }
  }

  /* ---------------- HTTP ---------------- */
  var httpServer = http.createServer(function (req, res) {
    var parsed;
    try { parsed = new URL(req.url, 'http://localhost'); } catch (e) { res.writeHead(400); res.end(); return; }
    var pathname = decodeURIComponent(parsed.pathname);
    if (pathname === '/api/net') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({
        ok: true, inst: inst, port: actualPort,
        ips: lanIPs(), rooms: mergeRooms(),
        discovery: !!udp
      }));
      return;
    }
    if (pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('ok');
      return;
    }
    var rel = pathname === '/' ? '/index.html' : pathname;
    var abs = path.join(ROOT, rel);
    if (abs.indexOf(ROOT) !== 0) { res.writeHead(403); res.end('forbidden'); return; }
    fs.stat(abs, function (err, st) {
      if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
      var type = MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      fs.createReadStream(abs).pipe(res);
    });
  });

  httpServer.on('upgrade', function (req, socket) {
    if (!req.url || req.url.indexOf('/ws') !== 0) { socket.destroy(); return; }
    var key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }
    var accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
    );
    socket.setNoDelay(true);
    var conn = { sock: socket, nick: '墨客', skin: null, roomId: null, role: null, alive: true, last: now() };
    conns.add(conn);
    var read = makeFrameReader(function (msg) {
      try { onMessage(conn, msg); } catch (e) { /* 单条消息异常不影响连接 */ }
    }, function () {
      conn.alive = false;
      try { socket.end(); } catch (e) {}
    });
    socket.on('data', function (chunk) {
      conn.last = now();
      read(chunk);
    });
    socket.on('close', function () {
      conn.alive = false;
      conns.delete(conn);
      if (conn.roomId) leaveRoom(conn, true);
    });
    socket.on('error', function () {
      conn.alive = false;
      conns.delete(conn);
      if (conn.roomId) leaveRoom(conn, true);
    });
    send(conn, { t: 'hello', inst: inst, port: actualPort, nick: conn.nick });
  });

  /* ---------------- 启动 ---------------- */
  return new Promise(function (resolve, reject) {
    var port = basePort;
    var tries = 0;
    function tryListen() {
      httpServer.once('error', function (err) {
        if (err.code === 'EADDRINUSE' && tries < 12) {
          tries++;
          port++;
          setTimeout(tryListen, 10);
          return;
        }
        reject(err);
      });
      httpServer.listen(port, '0.0.0.0', function () {
        actualPort = port;
        startDiscovery();
        var timer = setInterval(function () {
          rooms.forEach(function (room) {
            if (room.status === 'playing') stepMatch(room);
            else if (now() - room.lastActive > 600000) {
              roomPeers(room).forEach(function (c) { c.roomId = null; c.role = null; });
              rooms.delete(room.id);
            }
          });
        }, TICK_MS);
        timer.unref && timer.unref();
        var beat = setInterval(function () {
          conns.forEach(function (c) {
            if (now() - c.last > 26000) {
              c.alive = false;
              try { c.sock.destroy(); } catch (e) {}
              conns.delete(c); byebye(c);
            }
          });
        }, 8000);
        beat.unref && beat.unref();
        function byebye(c) { if (c.roomId) leaveRoom(c, true); }
        var ann = setInterval(announce, 2000);
        ann.unref && ann.unref();
        resolve({
          port: actualPort,
          url: 'http://127.0.0.1:' + actualPort + '/index.html',
          ips: lanIPs(),
          close: function () {
            clearInterval(timer);
            clearInterval(beat);
            clearInterval(ann);
            conns.forEach(function (c) { try { c.sock.destroy(); } catch (e) {} });
            try { httpServer.close(); } catch (e) {}
            if (udp) { try { udp.close(); } catch (e) {} udp = null; }
          }
        });
      });
    }
    tryListen();
  });
}

module.exports = { startRoomServer: startRoomServer, MAX_HP: MAX_HP };

if (require.main === module) {
  startRoomServer({ port: process.env.PORT || 8799 }).then(function (s) {
    console.log('墨战 · 键影 房间服务已启动：' + s.url);
    if (s.ips.length) console.log('局域网地址：' + s.ips.map(function (ip) { return 'http://' + ip + ':' + s.port + '/'; }).join('  '));
    console.log('按 Ctrl+C 结束。');
  }).catch(function (err) {
    console.error('启动失败：', err);
    process.exit(1);
  });
}
