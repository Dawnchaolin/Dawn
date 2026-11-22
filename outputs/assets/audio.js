/* 墨战 · 键影 —— WebAudio 合成音效（无外部音频资源） */
(function () {
  'use strict';

  function Sound() {
    this.ctx = null;
    this.master = null;
    this.noise = null;
    this.muted = false;
    this.ambientNode = null;
    try {
      var saved = localStorage.getItem('mozhan.mute');
      this.muted = saved === '1';
    } catch (e) {}
  }

  Sound.prototype.unlock = function () {
    if (!this.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch (e) {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.noise = this._noiseBuffer();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch (e) {}
    }
  };

  Sound.prototype._noiseBuffer = function () {
    var len = Math.floor(this.ctx.sampleRate * 1.0);
    var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  };

  Sound.prototype._ok = function () {
    if (!this.ctx || !this.master) return false;
    if (this.ctx.state === 'suspended') {
      try { this.ctx.resume(); } catch (e) {}
    }
    return true;
  };

  Sound.prototype._tone = function (type, f0, f1, dur, vol, delay) {
    if (!this._ok()) return;
    var t = this.ctx.currentTime + (delay || 0);
    var o = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + Math.min(0.012, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  };

  Sound.prototype._noiseBurst = function (filterType, f0, f1, dur, vol, delay, q) {
    if (!this._ok()) return;
    var t = this.ctx.currentTime + (delay || 0);
    var src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    var f = this.ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.setValueAtTime(Math.max(40, f0), t);
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    f.Q.value = q || 1;
    var g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.03);
  };

  Sound.prototype.setMuted = function (m) {
    this.muted = !!m;
    try { localStorage.setItem('mozhan.mute', m ? '1' : '0'); } catch (e) {}
    if (this.master) {
      var t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, t, 0.03);
    }
  };

  Sound.prototype.toggleMuted = function () {
    this.setMuted(!this.muted);
    return this.muted;
  };

  /* 连击音高：每次连击都比上一键略高，并在档位边界落到下一音级 */
  function comboSteps(combo) {
    var c = Math.max(0, combo || 0);
    if (c >= 80) return 9 + Math.min(1.9, (c - 80) / 20 * 2);
    if (c >= 50) return 7 + Math.min(1.9, (c - 50) / 30 * 2);
    if (c >= 25) return 4 + Math.min(1.9, (c - 25) / 25 * 2);
    if (c >= 10) return 2 + Math.min(1.9, (c - 10) / 15 * 2);
    return Math.min(1.9, c / 10 * 2);
  }

  /* 每次正确字母：与击键同一帧触发；音高随连击爬升 */
  Sound.prototype.light = function (weapon, tier, combo) {
    if (!this._ok()) return;
    var p = Math.pow(2, comboSteps(combo) / 12);
    if (weapon === 'sword') {
      this._noiseBurst('highpass', 3400 * p, 1500 * p, 0.075, 0.11, 0, 0.8);
      this._tone('triangle', 1750 * p, 900 * p, 0.09, 0.05);
      this._tone('sine', 3200 * p, 2500 * p, 0.05, 0.025);
    } else if (weapon === 'staff') {
      this._tone('sine', 620 * p, 880 * p, 0.18, 0.055);
      this._tone('sine', 940 * p, 1330 * p, 0.15, 0.03);
      this._noiseBurst('highpass', 5200, 7600, 0.1, 0.025);
    } else if (weapon === 'brush') {
      this._noiseBurst('bandpass', 1900 * p, 3600 * p, 0.065, 0.07, 0, 1.9);
      this._tone('triangle', 1240 * p, 720 * p, 0.075, 0.035);
      this._noiseBurst('highpass', 5400, 2600, 0.045, 0.022);
    } else {
      this._noiseBurst('bandpass', 2500 * p, 620 * p, 0.1, 0.15, 0, 1.2);
      this._tone('sine', 190, 90, 0.075, 0.09);
    }
    if (tier >= 3) {
      this._tone('sine', 440 * p, 440 * p, 0.12, 0.022);
    }
  };

  /* 连击档位音景：三重起铺一层稳定调式，断连击即回落 */
  Sound.prototype.setMode = function (tier) {
    if (!this._ok()) return;
    var t = this.ctx.currentTime;
    if (!tier || tier < 2) {
      if (this.modeNode) {
        var n = this.modeNode;
        this.modeNode = null;
        n.g.gain.cancelScheduledValues(t);
        n.g.gain.setTargetAtTime(0.0001, t, 0.28);
        setTimeout(function () {
          try { n.o1.stop(); n.o2.stop(); n.o3.stop(); } catch (e) {}
        }, 1500);
      }
      return;
    }
    var roots = [0, 0, 0, 5, 7];
    var f0 = 110 * Math.pow(2, (roots[Math.min(4, tier)] || 0) / 12);
    if (!this.modeNode) {
      var g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.012 + tier * 0.002, t + 1.1);
      var f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 820;
      f.Q.value = 0.6;
      var o1 = this.ctx.createOscillator();
      var o2 = this.ctx.createOscillator();
      var o3 = this.ctx.createOscillator();
      o1.type = 'sine'; o1.frequency.value = f0;
      o2.type = 'sine'; o2.frequency.value = f0 * 1.5;
      o3.type = 'triangle'; o3.frequency.value = f0 * 2;
      var o3g = this.ctx.createGain();
      o3g.gain.value = 0.35;
      var og = this.ctx.createGain();
      og.gain.value = 0.5;
      o1.connect(f); o2.connect(f); o3.connect(o3g); o3g.connect(f);
      f.connect(og); og.connect(g); g.connect(this.master);
      o1.start(); o2.start(); o3.start();
      this.modeNode = { g: g, f: f, o1: o1, o2: o2, o3: o3 };
    } else {
      var m = this.modeNode;
      m.g.gain.setTargetAtTime(0.012 + tier * 0.002, t, 0.3);
      m.o1.frequency.setTargetAtTime(f0, t, 0.5);
      m.o2.frequency.setTargetAtTime(f0 * 1.5, t, 0.5);
      m.o3.frequency.setTargetAtTime(f0 * 2, t, 0.5);
    }
  };

  Sound.prototype.heavy = function (weapon) {
    if (!this._ok()) return;
    this._tone('sine', 95, 38, 0.42, 0.26);
    this._noiseBurst('lowpass', 2200, 180, 0.34, 0.18, 0, 0.7);
    if (weapon === 'sword') {
      this._noiseBurst('bandpass', 4200, 900, 0.32, 0.16, 0, 2);
      this._tone('triangle', 1400, 760, 0.55, 0.05);
      this._tone('sine', 2500, 1500, 0.4, 0.028);
    } else if (weapon === 'staff') {
      this._noiseBurst('highpass', 4200, 1800, 0.14, 0.15);
      this._noiseBurst('lowpass', 9000, 120, 0.6, 0.28, 0.02, 0.9);
      this._tone('sine', 62, 28, 0.55, 0.22, 0.02);
    } else if (weapon === 'brush') {
      this._noiseBurst('bandpass', 2600, 320, 0.5, 0.2, 0, 1.1);
      this._tone('triangle', 430, 150, 0.36, 0.06);
      this._noiseBurst('lowpass', 900, 170, 0.42, 0.14, 0.02, 0.8);
    } else {
      this._noiseBurst('bandpass', 3200, 300, 0.4, 0.2, 0, 1.4);
      this._tone('sine', 150, 70, 0.25, 0.1);
    }
  };

  Sound.prototype.ultimate = function (weapon) {
    if (!this._ok()) return;
    this._tone('sine', 74, 30, 1.5, 0.28);
    this._tone('sine', 148, 74, 1.1, 0.09, 0.03);
    this._noiseBurst('lowpass', 7000, 120, 1.2, 0.22, 0, 0.8);
    this._noiseBurst('highpass', 3000, 9000, 0.5, 0.06, 0.05);
    this._tone('triangle', 330, 660, 0.9, 0.035, 0.06);
    this._tone('sine', 880, 1320, 0.7, 0.02, 0.18);
    if (weapon === 'bow') {
      for (var i = 0; i < 8; i++) {
        this._noiseBurst('highpass', 5200 - i * 260, 1300, 0.13, 0.045, 0.04 + i * 0.045, 1.2);
      }
      this._tone('sine', 1200, 2400, 0.5, 0.03, 0.1);
    } else if (weapon === 'sword') {
      this._tone('triangle', 2100, 900, 0.8, 0.055, 0.08);
      this._tone('sine', 1600, 2600, 0.6, 0.03, 0.2);
      this._noiseBurst('bandpass', 5600, 1400, 0.55, 0.12, 0.06, 2);
    } else if (weapon === 'staff') {
      this._tone('sine', 96, 44, 1.1, 0.16, 0.05);
      this._noiseBurst('bandpass', 1200, 3800, 0.9, 0.09, 0.1, 1.4);
      this._tone('sine', 660, 990, 0.8, 0.025, 0.22);
    } else {
      this._tone('triangle', 520, 260, 0.9, 0.06, 0.06);
      this._noiseBurst('bandpass', 1800, 4200, 0.9, 0.12, 0.04, 1.6);
      this._tone('sine', 196, 392, 0.7, 0.04, 0.24);
    }
  };

  Sound.prototype.error = function () {
    this._noiseBurst('lowpass', 520, 190, 0.17, 0.07, 0, 0.6);
    this._tone('sine', 132, 98, 0.14, 0.045);
  };

  Sound.prototype.kill = function (big) {
    this._noiseBurst('bandpass', big ? 900 : 1300, 240, big ? 0.34 : 0.2, big ? 0.16 : 0.1, 0, 0.7);
    this._tone('sine', big ? 170 : 240, 70, big ? 0.28 : 0.16, big ? 0.12 : 0.07);
  };

  Sound.prototype.hurt = function () {
    this._tone('sine', 105, 46, 0.34, 0.18);
    this._noiseBurst('lowpass', 420, 110, 0.28, 0.1, 0, 0.6);
  };

  Sound.prototype.ready = function () {
    this._tone('sine', 880, 880, 0.22, 0.028);
    this._tone('sine', 1320, 1320, 0.18, 0.018, 0.05);
  };

  Sound.prototype.tierUp = function () {
    this._tone('sine', 220, 220, 1.1, 0.075);
    this._tone('sine', 330, 330, 1.0, 0.045);
    this._tone('triangle', 440, 440, 0.85, 0.028);
    this._noiseBurst('highpass', 3800, 2200, 0.5, 0.035, 0, 0.8);
  };

  Sound.prototype.ui = function () {
    this._tone('triangle', 760, 620, 0.055, 0.035);
    this._noiseBurst('highpass', 2600, 1400, 0.04, 0.02);
  };

  Sound.prototype.flip = function () {
    this._tone('triangle', 520, 640, 0.06, 0.024);
  };

  /* 环境底噪：极轻的风声，战斗时开启 */
  Sound.prototype.ambient = function (on) {
    if (!this._ok()) return;
    var t = this.ctx.currentTime;
    if (on) {
      if (this.ambientNode) return;
      var g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.018, t + 1.6);
      var f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 260;
      var o1 = this.ctx.createOscillator();
      var o2 = this.ctx.createOscillator();
      o1.type = 'sine'; o1.frequency.value = 55;
      o2.type = 'sine'; o2.frequency.value = 82.5;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.master);
      o1.start(); o2.start();
      this.ambientNode = { g: g, o1: o1, o2: o2 };
    } else if (this.ambientNode) {
      var a = this.ambientNode;
      this.ambientNode = null;
      a.g.gain.cancelScheduledValues(t);
      a.g.gain.setTargetAtTime(0.0001, t, 0.3);
      setTimeout(function () {
        try { a.o1.stop(); a.o2.stop(); } catch (e) {}
      }, 1200);
    }
  };

  window.SOUND = new Sound();
})();
