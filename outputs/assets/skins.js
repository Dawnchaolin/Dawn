/* 墨战 · 键影 —— 皮肤：角色与兵器（程序化 SVG 占位立绘） */
(function () {
  'use strict';

  var uid = 0;
  var INK = '#17130f';
  var PAPER = '#efe6d3';
  var SKIN = '#e9c6a2';
  var RED = '#a8362b';

  function lin(id, stops, horizontal) {
    var s = stops.map(function (st) {
      return '<stop offset="' + st[0] + '" stop-color="' + st[1] + '"' +
        (st[2] !== undefined ? ' stop-opacity="' + st[2] + '"' : '') + '/>';
    }).join('');
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="' + (horizontal ? '1' : '0') + '" y2="' + (horizontal ? '0' : '1') + '">' + s + '</linearGradient>';
  }

  function radial(id, stops) {
    var s = stops.map(function (st) {
      return '<stop offset="' + st[0] + '" stop-color="' + st[1] + '"' +
        (st[2] !== undefined ? ' stop-opacity="' + st[2] + '"' : '') + '/>';
    }).join('');
    return '<radialGradient id="' + id + '" cx="0.5" cy="0.5" r="0.5">' + s + '</radialGradient>';
  }

  var characters = [
    {
      id: 'scholar',
      name: '墨客',
      family: '执笔为锋',
      accent: '#2f4257',
      titles: { male: '青衫', female: '素绘' },
      desc: {
        male: '青衫落拓，以笔为锋。衣袂翻卷之间，墨痕先至。',
        female: '素衣执笔，落墨成山。看似纤弱，笔下却有千钧。'
      },
      tags: ['轻灵', '精准']
    },
    {
      id: 'general',
      name: '铁衣',
      family: '山河为甲',
      accent: '#a8362b',
      titles: { male: '玄甲', female: '朱缨' },
      desc: {
        male: '玄甲覆身，重剑无锋。一步踏出，山河皆震。',
        female: '朱缨轻甲，弓马娴熟。红缨过处，敌阵自乱。'
      },
      tags: ['厚重', '沉稳']
    },
    {
      id: 'shaman',
      name: '山鬼',
      family: '草木皆兵',
      accent: '#5c6b45',
      titles: { male: '松客', female: '鹿鸣' },
      desc: {
        male: '松间猎客，鹿角为冠。与山同息，与兽同猎。',
        female: '鹿鸣深谷，巫祝之姿。草木皆兵，风雷听令。'
      },
      tags: ['野性', '迅捷']
    },
    {
      id: 'archer',
      name: '射手',
      family: '引弓落月',
      accent: '#7a4a26',
      titles: { male: '游侠', female: '飞羽' },
      desc: {
        male: '负弓入山，箭落惊鸿。寻常一箭，亦可穿云。',
        female: '轻甲束发，引弓如月。弦响之处，风也低头。'
      },
      tags: ['远射', '灵动']
    }
  ];

  var weapons = [
    {
      id: 'bow',
      name: '弓',
      en: 'BOW',
      desc: '普通攻击射出箭矢，每敲对一个字母便发一箭。重击为蓄力巨箭。',
      tag: '远射 · 迅疾'
    },
    {
      id: 'sword',
      name: '剑',
      en: 'SWORD',
      desc: '普通攻击挥出剑气。重击叠成三重剑气，层层斩落。',
      tag: '近锋 · 凌厉'
    },
    {
      id: 'staff',
      name: '法杖',
      en: 'STAFF',
      desc: '普通攻击凝成法球。重击引天雷自屏幕上方劈落。',
      tag: '术法 · 震雷'
    },
    {
      id: 'brush',
      name: '墨笔',
      en: 'BRUSH',
      desc: '普通攻击飞射墨点。重击层叠多道墨痕，墨透纸背。',
      tag: '水墨 · 连叠'
    }
  ];

  // ---------- 背景（每个角色不同） ----------
  function backdropScholar(u) {
    return '<g opacity="0.5">' +
      '<circle cx="122" cy="118" r="82" fill="none" stroke="' + INK + '" stroke-width="1.5" opacity="0.18"/>' +
      '<path d="M24 236 C70 196 132 168 214 136" fill="none" stroke="#2f4257" stroke-width="18" stroke-linecap="round" opacity="0.12"/>' +
      '<path d="M20 250 C82 214 148 190 224 164" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round" opacity="0.12"/>' +
      '</g>';
  }

  function backdropGeneral(u) {
    return '<g opacity="0.55">' +
      '<path d="M32 60 L92 34 L84 268 L18 296 Z" fill="' + RED + '" opacity="0.14"/>' +
      '<path d="M208 54 L152 32 L160 264 L222 292 Z" fill="' + INK + '" opacity="0.12"/>' +
      '<path d="M18 56 L96 30" stroke="' + INK + '" stroke-width="2" opacity="0.18"/>' +
      '<path d="M222 50 L150 28" stroke="' + INK + '" stroke-width="2" opacity="0.18"/>' +
      '<circle cx="120" cy="150" r="84" fill="none" stroke="' + INK + '" stroke-width="1" opacity="0.12"/>' +
      '</g>';
  }

  function backdropShaman(u) {
    return '<g opacity="0.6">' +
      '<path d="M18 282 C48 232 66 214 88 222 C102 196 118 190 128 218 C142 198 160 208 166 240 C188 226 206 244 214 286 Z" fill="' + INK + '" opacity="0.12"/>' +
      '<path d="M28 270 C58 238 76 230 96 240 C112 216 126 214 136 240 C152 226 172 236 182 262" fill="none" stroke="' + INK + '" stroke-width="1.5" opacity="0.18"/>' +
      '<circle cx="186" cy="72" r="34" fill="#a8842c" opacity="0.18"/>' +
      '</g>';
  }

  function backdropArcher(u) {
    return '<g opacity="0.55">' +
      '<circle cx="176" cy="82" r="40" fill="#b9933f" opacity="0.14"/>' +
      '<circle cx="176" cy="82" r="40" fill="none" stroke="' + INK + '" stroke-width="1" opacity="0.16"/>' +
      '<path d="M18 272 C50 232 74 214 96 226 C116 196 140 202 150 236 C174 220 202 238 216 276 Z" fill="' + INK + '" opacity="0.1"/>' +
      '<path d="M28 246 C60 224 88 220 112 236" fill="none" stroke="' + INK + '" stroke-width="1.4" opacity="0.16"/>' +
      '<path d="M44 130 L206 62" stroke="' + INK + '" stroke-width="1.2" opacity="0.14" stroke-dasharray="6 7"/>' +
      '</g>';
  }

  // ---------- 人物 ----------
  function drawScholarMale(u) {
    var robe = 'robe' + u, sleeve = 'slv' + u, skinG = 'sk' + u;
    var defs = lin(robe, [['0', '#3b4d61'], ['0.55', '#2b3a4b'], ['1', '#191d25']]) +
      lin(sleeve, [['0', '#33465a'], ['1', '#171b22']]) +
      lin(skinG, [['0', '#f0cda8'], ['1', '#d5a87f']]);
    var body =
      '<ellipse cx="120" cy="307" rx="58" ry="8" fill="' + INK + '" opacity="0.16"/>' +
      // 飘带
      '<path d="M132 82 C168 90 190 122 182 156 C176 124 158 104 132 98 Z" fill="' + INK + '" opacity="0.28"/>' +
      // 袍
      '<path d="M120 104 C100 104 88 114 84 136 L72 246 C68 274 82 294 100 300 L140 300 C158 294 172 274 168 246 L156 136 C152 114 140 104 120 104 Z" fill="url(#' + robe + ')" stroke="' + INK + '" stroke-width="2"/>' +
      // 内襟
      '<path d="M104 110 L120 154 L136 110 L130 106 L120 136 L110 106 Z" fill="' + PAPER + '" opacity="0.92"/>' +
      '<path d="M86 206 Q120 216 154 206 L152 220 Q120 230 88 220 Z" fill="' + INK + '" opacity="0.14"/>' +
      // 袖
      '<path d="M86 120 C68 132 57 164 55 200 C53 220 63 233 76 231 C87 229 91 219 91 205 L93 150 Z" fill="url(#' + sleeve + ')" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M154 120 C172 132 183 164 185 200 C187 220 177 233 164 231 C153 229 149 219 149 205 L147 150 Z" fill="url(#' + sleeve + ')" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M62 206 L89 206" stroke="' + INK + '" stroke-width="1" opacity="0.2"/>' +
      '<path d="M178 206 L151 206" stroke="' + INK + '" stroke-width="1" opacity="0.2"/>' +
      // 腰带
      '<path d="M82 176 Q120 184 158 176 L156 199 Q120 207 84 199 Z" fill="' + RED + '" opacity="0.82"/>' +
      '<path d="M84 190 Q120 198 156 190" stroke="' + INK + '" stroke-width="1" opacity="0.2"/>' +
      '<path d="M102 200 C98 222 96 238 92 252" stroke="' + RED + '" stroke-width="2.5" opacity="0.55"/>' +
      // 下摆墨渍
      '<path d="M77 266 Q120 284 166 264 L169 286 Q120 302 74 286 Z" fill="' + INK + '" opacity="0.3"/>' +
      // 手
      '<ellipse cx="62" cy="221" rx="7.5" ry="10" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<ellipse cx="177" cy="213" rx="7.5" ry="10" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.4"/>' +
      // 头
      '<path d="M111 96 L129 96 L131 110 L109 110 Z" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<ellipse cx="120" cy="81" rx="18" ry="21" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M101 82 C99 60 108 48 120 48 C132 48 141 60 139 82 C136 66 130 61 120 61 C110 61 104 66 101 82 Z" fill="' + INK + '"/>' +
      '<ellipse cx="120" cy="46" rx="8" ry="7" fill="' + INK + '"/>' +
      '<path d="M120 39 C122 32 126 28 132 26" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M111 76 Q115 74 119 76" fill="none" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M121 76 Q125 74 129 76" fill="none" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M112 84 Q115 82 118 84" fill="none" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M122 84 Q125 82 128 84" fill="none" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M120 85 L119 91 L122 92" fill="none" stroke="#b98a63" stroke-width="1.2" stroke-linecap="round"/>' +
      '<path d="M116 96 Q120 98 124 96" fill="none" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M106 70 L114 68" stroke="' + INK + '" stroke-width="2" opacity="0.65"/>' +
      '<path d="M134 68 L126 70" stroke="' + INK + '" stroke-width="2" opacity="0.65"/>';
    return { defs: defs, body: body };
  }

  function drawScholarFemale(u) {
    var robe = 'robe' + u, sleeve = 'slv' + u, skinG = 'sk' + u, hair = 'hair' + u;
    var defs = lin(robe, [['0', '#f7efdd'], ['0.6', '#e8dac0'], ['1', '#cdb995']]) +
      lin(sleeve, [['0', '#f8f0df'], ['1', '#ddcdb0']]) +
      lin(skinG, [['0', '#f1cda9'], ['1', '#d8ab82']]) +
      lin(hair, [['0', '#2a231d'], ['1', '#0f0d0b']]);
    var body =
      '<ellipse cx="120" cy="307" rx="52" ry="7" fill="' + INK + '" opacity="0.16"/>' +
      // 后发
      '<path d="M102 76 C96 58 106 46 120 46 C134 46 144 58 138 76 C144 104 150 138 146 178 C142 204 136 224 132 244 C126 218 124 202 120 196 C116 202 114 218 108 244 C104 224 98 204 94 178 C90 138 96 104 102 76 Z" fill="url(#' + hair + ')" opacity="0.92"/>' +
      // 飘带
      '<path d="M150 178 C168 206 170 244 160 280" fill="none" stroke="' + RED + '" stroke-width="3" opacity="0.45" stroke-linecap="round"/>' +
      // 裙
      '<path d="M120 104 C106 104 96 114 93 136 L84 240 C82 268 92 292 108 300 L132 300 C148 292 158 268 156 240 L147 136 C144 114 134 104 120 104 Z" fill="url(#' + robe + ')" stroke="' + INK + '" stroke-width="1.8"/>' +
      // 内襟与腰带
      '<path d="M108 108 L120 146 L132 108" fill="none" stroke="' + RED + '" stroke-width="1.6" opacity="0.7"/>' +
      '<path d="M90 174 Q120 182 150 174 L148 192 Q120 200 92 192 Z" fill="#2f4257" opacity="0.85"/>' +
      '<path d="M96 192 C92 218 88 240 82 262" fill="none" stroke="#2f4257" stroke-width="2" opacity="0.4"/>' +
      // 广袖
      '<path d="M95 120 C79 132 70 162 70 196 C70 214 80 224 92 222 C99 220 102 211 102 198 L103 150 Z" fill="url(#' + sleeve + ')" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M145 120 C161 132 170 162 170 196 C170 214 160 224 148 222 C141 220 138 211 138 198 L137 150 Z" fill="url(#' + sleeve + ')" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M80 206 Q92 214 103 206" fill="none" stroke="#2f4257" stroke-width="1.2" opacity="0.5"/>' +
      '<path d="M160 206 Q148 214 137 206" fill="none" stroke="#2f4257" stroke-width="1.2" opacity="0.5"/>' +
      // 下摆墨渍
      '<path d="M86 262 Q120 280 154 260 L157 284 Q120 300 83 284 Z" fill="#2f4257" opacity="0.22"/>' +
      '<path d="M92 286 Q112 292 126 288" fill="none" stroke="' + INK + '" stroke-width="2" opacity="0.28" stroke-linecap="round"/>' +
      '<circle cx="146" cy="270" r="3.5" fill="#2f4257" opacity="0.45"/>' +
      // 手
      '<ellipse cx="84" cy="216" rx="7" ry="9.5" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<ellipse cx="157" cy="214" rx="7" ry="9.5" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.3"/>' +
      // 头
      '<path d="M112 96 L128 96 L130 110 L110 110 Z" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<ellipse cx="120" cy="81" rx="16.5" ry="19.5" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M103 82 C101 60 109 48 120 48 C131 48 139 60 137 82 C133 67 128 62 120 62 C112 62 107 67 103 82 Z" fill="url(#' + hair + ')"/>' +
      '<ellipse cx="120" cy="45" rx="9" ry="8" fill="' + INK + '"/>' +
      '<path d="M113 38 L134 28" stroke="#8a6b45" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="136" cy="26" r="3.4" fill="' + RED + '"/>' +
      '<path d="M112 75 Q115.5 73 119 75" fill="none" stroke="' + INK + '" stroke-width="1.3" stroke-linecap="round"/>' +
      '<path d="M121 75 Q124.5 73 128 75" fill="none" stroke="' + INK + '" stroke-width="1.3" stroke-linecap="round"/>' +
      '<path d="M113 83 Q116 81 119 83" fill="none" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M121 83 Q124 81 127 83" fill="none" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M120 84 L119 90" stroke="#b98a63" stroke-width="1.1" stroke-linecap="round"/>' +
      '<path d="M116 95 Q120 97.5 124 95" fill="none" stroke="' + RED + '" stroke-width="1.6" stroke-linecap="round"/>' +
      '<circle cx="120" cy="69" r="1.8" fill="' + RED + '" opacity="0.8"/>' +
      '<path d="M104 92 C98 96 96 104 98 110" fill="none" stroke="' + INK + '" stroke-width="1.4" opacity="0.6"/>' +
      '<path d="M136 92 C142 96 144 104 142 110" fill="none" stroke="' + INK + '" stroke-width="1.4" opacity="0.6"/>';
    return { defs: defs, body: body };
  }

  function drawGeneralMale(u) {
    var cape = 'cape' + u, armor = 'arm' + u, steel = 'st' + u, skinG = 'sk' + u;
    var defs = lin(cape, [['0', '#732a22'], ['1', '#351210']]) +
      lin(armor, [['0', '#4d5258'], ['0.55', '#33383d'], ['1', '#1d2023']]) +
      lin(steel, [['0', '#6a7076'], ['1', '#3a3f44']]) +
      lin(skinG, [['0', '#efcba6'], ['1', '#d3a67c']]);
    var body =
      '<ellipse cx="120" cy="308" rx="74" ry="9" fill="' + INK + '" opacity="0.18"/>' +
      // 披风
      '<path d="M120 110 C84 104 64 132 56 298 L184 298 C176 132 156 104 120 110 Z" fill="url(#' + cape + ')" opacity="0.92"/>' +
      '<path d="M74 160 C66 210 62 258 60 296" fill="none" stroke="#2a0f0c" stroke-width="2" opacity="0.4"/>' +
      '<path d="M166 160 C174 210 178 258 180 296" fill="none" stroke="#2a0f0c" stroke-width="2" opacity="0.4"/>' +
      // 腿
      '<path d="M96 250 L96 296 L116 296 L116 250 Z" fill="#26292c"/>' +
      '<path d="M124 250 L124 296 L144 296 L144 250 Z" fill="#26292c"/>' +
      '<path d="M90 292 L118 292 L118 302 L86 302 Z" fill="#15171a"/>' +
      '<path d="M122 292 L150 292 L154 302 L122 302 Z" fill="#15171a"/>' +
      // 躯干
      '<path d="M120 102 C96 102 76 116 70 142 L60 232 L86 242 L92 186 L94 258 L146 258 L148 186 L154 242 L180 232 L170 142 C164 116 144 102 120 102 Z" fill="url(#' + armor + ')" stroke="' + INK + '" stroke-width="2"/>' +
      // 胸甲
      '<path d="M98 130 L142 130 L146 194 L94 194 Z" fill="url(#' + steel + ')" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M98 148 L142 148 M96 166 L144 166" stroke="' + INK + '" stroke-width="1.5" opacity="0.45"/>' +
      '<path d="M120 132 L120 192" stroke="' + INK + '" stroke-width="1.2" opacity="0.3"/>' +
      '<path d="M100 136 L140 136" stroke="' + RED + '" stroke-width="2" opacity="0.6"/>' +
      // 肩甲
      '<path d="M72 130 L50 142 L57 174 L82 164 Z" fill="url(#' + steel + ')" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M168 130 L190 142 L183 174 L158 164 Z" fill="url(#' + steel + ')" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M58 152 L79 145" stroke="' + RED + '" stroke-width="2.4" opacity="0.75"/>' +
      '<path d="M182 152 L161 145" stroke="' + RED + '" stroke-width="2.4" opacity="0.75"/>' +
      // 腰带与甲裙
      '<path d="M90 192 L150 192 L148 210 L92 210 Z" fill="#3a2a1c" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<circle cx="120" cy="201" r="5" fill="' + RED + '"/>' +
      '<path d="M92 210 L96 246 L118 246 L118 210 Z" fill="url(#' + steel + ')" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<path d="M122 210 L122 246 L144 246 L148 210 Z" fill="url(#' + steel + ')" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<path d="M104 214 L104 242 M136 214 L136 242" stroke="' + INK + '" stroke-width="1" opacity="0.4"/>' +
      // 手臂
      '<path d="M70 146 C58 168 54 196 56 216 L68 226 L80 214 L82 176 Z" fill="url(#' + armor + ')" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M170 146 C182 168 186 196 184 216 L172 226 L160 214 L158 176 Z" fill="url(#' + armor + ')" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M54 208 L70 214 L68 228 L54 222 Z" fill="#2a2e32" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<path d="M186 208 L170 214 L172 228 L186 222 Z" fill="#2a2e32" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<ellipse cx="61" cy="228" rx="8" ry="9" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<ellipse cx="179" cy="228" rx="8" ry="9" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.3"/>' +
      // 头
      '<path d="M110 96 L130 96 L132 112 L108 112 Z" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<ellipse cx="120" cy="80" rx="19" ry="21" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.6"/>' +
      // 头盔
      '<path d="M99 84 C99 56 108 42 120 42 C132 42 141 56 141 84 L137 88 L103 88 Z" fill="url(#' + steel + ')" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M120 42 L120 66" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M104 70 Q120 64 136 70" fill="none" stroke="' + RED + '" stroke-width="2.2" opacity="0.8"/>' +
      '<path d="M115 84 L125 84 L124 104 L116 104 Z" fill="url(#' + steel + ')" stroke="' + INK + '" stroke-width="1.2"/>' +
      // 红缨
      '<path d="M120 42 C136 26 158 20 174 28 C156 38 144 54 136 72 Z" fill="' + RED + '"/>' +
      '<path d="M136 44 C148 40 158 40 168 44" fill="none" stroke="#7d2119" stroke-width="1.4" opacity="0.6"/>' +
      // 眉眼
      '<path d="M107 78 L116 76" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M133 78 L124 76" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M108 86 Q112 84 116 86" fill="none" stroke="' + INK + '" stroke-width="1.7"/>' +
      '<path d="M132 86 Q128 84 124 86" fill="none" stroke="' + INK + '" stroke-width="1.7"/>' +
      '<path d="M120 86 L119 92 L122 93" fill="none" stroke="#b0835c" stroke-width="1.2"/>' +
      '<path d="M112 100 Q120 104 128 100" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M116 106 Q120 110 124 106" fill="none" stroke="' + INK + '" stroke-width="1.4" opacity="0.6"/>' +
      '<path d="M101 92 C97 96 96 102 98 108" fill="none" stroke="' + INK + '" stroke-width="1.6" opacity="0.5"/>' +
      '<path d="M139 92 C143 96 144 102 142 108" fill="none" stroke="' + INK + '" stroke-width="1.6" opacity="0.5"/>';
    return { defs: defs, body: body };
  }

  function drawGeneralFemale(u) {
    var cape = 'cape' + u, armor = 'arm' + u, steel = 'st' + u, skinG = 'sk' + u;
    var defs = lin(cape, [['0', '#7c2a21'], ['1', '#3a1210']]) +
      lin(armor, [['0', '#4a5057'], ['1', '#23272b']]) +
      lin(steel, [['0', '#72787e'], ['1', '#41464b']]) +
      lin(skinG, [['0', '#f2cfa9'], ['1', '#d7aa80']]);
    var body =
      '<ellipse cx="120" cy="307" rx="58" ry="8" fill="' + INK + '" opacity="0.16"/>' +
      // 披风
      '<path d="M120 108 C92 102 76 130 72 268 L168 268 C164 130 148 102 120 108 Z" fill="url(#' + cape + ')" opacity="0.9"/>' +
      // 马尾
      '<path d="M131 62 C160 50 184 66 182 98 C172 80 154 72 136 80 C146 92 148 106 144 120 C136 100 126 88 118 82 Z" fill="' + INK + '"/>' +
      '<path d="M136 66 L152 60" stroke="' + RED + '" stroke-width="3" stroke-linecap="round"/>' +
      // 腿
      '<path d="M100 244 L100 296 L118 296 L118 244 Z" fill="#2a2d31"/>' +
      '<path d="M124 244 L124 296 L142 296 L142 244 Z" fill="#2a2d31"/>' +
      '<path d="M94 290 L120 290 L120 302 L90 302 Z" fill="#17191b"/>' +
      '<path d="M122 290 L148 290 L152 302 L122 302 Z" fill="#17191b"/>' +
      // 躯干
      '<path d="M120 102 C100 102 84 116 80 140 L74 214 L94 222 L98 176 L100 244 L140 244 L142 176 L146 222 L166 214 L160 140 C156 116 140 102 120 102 Z" fill="url(#' + armor + ')" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M100 128 L140 128 L144 186 L96 186 Z" fill="url(#' + steel + ')" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M100 146 L142 146 M98 164 L144 164" stroke="' + INK + '" stroke-width="1.3" opacity="0.4"/>' +
      '<path d="M120 130 L120 184" stroke="' + INK + '" stroke-width="1" opacity="0.25"/>' +
      // 肩甲
      '<path d="M82 128 L62 138 L66 166 L88 158 Z" fill="url(#' + steel + ')" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M158 128 L178 138 L174 166 L152 158 Z" fill="url(#' + steel + ')" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M68 146 L86 140" stroke="' + RED + '" stroke-width="2.2" opacity="0.8"/>' +
      '<path d="M172 146 L154 140" stroke="' + RED + '" stroke-width="2.2" opacity="0.8"/>' +
      // 腰带与甲裙
      '<path d="M86 184 L154 184 L152 202 L88 202 Z" fill="#41251a" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<path d="M88 202 L94 238 L118 238 L118 202 Z" fill="url(#' + steel + ')" stroke="' + INK + '" stroke-width="1.1"/>' +
      '<path d="M122 202 L122 238 L146 238 L152 202 Z" fill="url(#' + steel + ')" stroke="' + INK + '" stroke-width="1.1"/>' +
      '<circle cx="120" cy="193" r="4.4" fill="' + RED + '"/>' +
      '<path d="M120 197 C118 214 114 226 110 234" fill="none" stroke="' + RED + '" stroke-width="2" opacity="0.7"/>' +
      // 手臂
      '<path d="M80 142 C72 162 70 186 72 204 L84 212 L92 202 L92 170 Z" fill="url(#' + armor + ')" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M160 142 C168 162 170 186 168 204 L156 212 L148 202 L148 170 Z" fill="url(#' + armor + ')" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<ellipse cx="82" cy="210" rx="7" ry="8.5" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<ellipse cx="158" cy="210" rx="7" ry="8.5" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.3"/>' +
      // 头
      '<path d="M112 94 L128 94 L130 110 L110 110 Z" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<ellipse cx="120" cy="79" rx="16.5" ry="19.5" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M103 80 C101 58 109 46 120 46 C131 46 139 58 137 80 C133 64 128 60 120 60 C112 60 107 64 103 80 Z" fill="' + INK + '"/>' +
      '<path d="M104 66 L136 68" stroke="' + steel + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M112 73 Q115 71 118 73" fill="none" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M122 73 Q125 71 128 73" fill="none" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M112 81 Q115.5 79 119 81" fill="none" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M121 81 Q124.5 79 128 81" fill="none" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M120 82 L119 88" stroke="#b98a63" stroke-width="1.1"/>' +
      '<path d="M116 93 Q120 95 124 93" fill="none" stroke="' + RED + '" stroke-width="1.5"/>' +
      '<path d="M108 66 L114 62" stroke="' + RED + '" stroke-width="2" opacity="0.7"/>' +
      '<path d="M138 88 C142 94 142 100 140 106" fill="none" stroke="' + INK + '" stroke-width="1.4" opacity="0.55"/>';
    return { defs: defs, body: body };
  }

  function drawShamanMale(u) {
    var cloak = 'cl' + u, fur = 'fur' + u, skinG = 'sk' + u;
    var defs = lin(cloak, [['0', '#4b5a45'], ['0.6', '#2f3a2b'], ['1', '#171d16']]) +
      lin(fur, [['0', '#8a7756'], ['1', '#5c4f39']]) +
      lin(skinG, [['0', '#e8c29c'], ['1', '#c99c73']]);
    var body =
      '<ellipse cx="120" cy="308" rx="66" ry="9" fill="' + INK + '" opacity="0.18"/>' +
      // 鹿角
      '<path d="M108 54 C96 36 82 26 64 24 C78 36 88 50 98 66" fill="none" stroke="#a8842c" stroke-width="4.6" stroke-linecap="round"/>' +
      '<path d="M85 32 C78 22 68 16 56 16" fill="none" stroke="#a8842c" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M96 46 C94 32 100 22 112 16" fill="none" stroke="#a8842c" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M132 54 C144 36 158 26 176 24 C162 36 152 50 142 66" fill="none" stroke="#a8842c" stroke-width="4.6" stroke-linecap="round"/>' +
      '<path d="M155 32 C162 22 172 16 184 16" fill="none" stroke="#a8842c" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M144 46 C146 32 140 22 128 16" fill="none" stroke="#a8842c" stroke-width="3.2" stroke-linecap="round"/>' +
      // 披毛斗篷
      '<path d="M120 104 C92 100 68 124 60 176 L48 268 L64 254 L68 292 L88 276 L100 304 L120 284 L140 304 L152 276 L172 292 L176 254 L192 268 L180 176 C172 124 148 100 120 104 Z" fill="url(#' + cloak + ')" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M120 104 C106 104 96 112 90 126 L104 150 L120 138 L136 150 L150 126 C144 112 134 104 120 104 Z" fill="url(#' + fur + ')" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M92 132 L84 158 M148 132 L156 158" stroke="' + INK + '" stroke-width="1.4" opacity="0.35"/>' +
      '<path d="M120 150 C112 176 108 208 110 240 M120 150 C128 176 132 208 130 240" fill="none" stroke="' + RED + '" stroke-width="2" opacity="0.4"/>' +
      // 内衬
      '<path d="M104 146 L120 268 L136 146 Z" fill="#1d231b" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<path d="M104 152 L98 268 L112 262 L120 248 L128 262 L142 268 L136 152" fill="#2a3327" opacity="0.8"/>' +
      // 腰带
      '<path d="M88 206 Q120 214 152 206 L150 224 Q120 232 90 224 Z" fill="#3a2c1c" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<circle cx="120" cy="219" r="5" fill="#a8842c"/>' +
      // 羽饰项链
      '<path d="M100 136 L108 152" stroke="' + RED + '" stroke-width="2"/><path d="M140 136 L132 152" stroke="' + RED + '" stroke-width="2"/>' +
      '<path d="M120 142 L116 156 L124 156 Z" fill="#a8842c"/>' +
      '<path d="M106 128 L112 142 L100 138 Z" fill="' + RED + '" opacity="0.8"/>' +
      '<path d="M134 128 L128 142 L140 138 Z" fill="' + RED + '" opacity="0.8"/>' +
      // 手臂
      '<path d="M70 160 C60 184 58 206 62 224 L74 232 L84 220 L86 186 Z" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M170 160 C180 184 182 206 178 224 L166 232 L156 220 L154 186 Z" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M64 196 L80 200 M66 208 L82 212" stroke="' + RED + '" stroke-width="1.6" opacity="0.5"/>' +
      '<path d="M176 196 L160 200 M174 208 L158 212" stroke="' + RED + '" stroke-width="1.6" opacity="0.5"/>' +
      '<ellipse cx="70" cy="230" rx="8" ry="9" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<ellipse cx="170" cy="230" rx="8" ry="9" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.3"/>' +
      // 头
      '<path d="M112 94 L128 94 L130 110 L110 110 Z" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<ellipse cx="120" cy="80" rx="18" ry="20" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M101 80 C100 57 108 46 120 46 C132 46 140 57 139 80 C134 64 128 60 120 60 C112 60 106 64 101 80 Z" fill="' + INK + '"/>' +
      '<path d="M101 78 C94 90 94 104 100 118 C104 106 105 94 106 84 Z" fill="' + INK + '" opacity="0.9"/>' +
      '<path d="M139 78 C146 90 146 104 140 118 C136 106 135 94 134 84 Z" fill="' + INK + '" opacity="0.9"/>' +
      '<path d="M112 76 Q115 74 118 76" fill="none" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M122 76 Q125 74 128 76" fill="none" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M112 84 Q115 82 118 84" fill="none" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M122 84 Q125 82 128 84" fill="none" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M120 84 L119 91 L122 92" fill="none" stroke="#a97b55" stroke-width="1.2"/>' +
      '<path d="M106 100 Q120 106 134 100" fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M112 104 Q120 112 128 104" fill="none" stroke="' + INK + '" stroke-width="1.6" opacity="0.7"/>' +
      '<path d="M104 70 L100 74 M136 70 L140 74" stroke="' + RED + '" stroke-width="2" opacity="0.7"/>' +
      '<path d="M100 88 L104 92 M140 88 L136 92" stroke="' + RED + '" stroke-width="1.6" opacity="0.55"/>';
    return { defs: defs, body: body };
  }

  function drawShamanFemale(u) {
    var cloak = 'cl' + u, fur = 'fur' + u, skinG = 'sk' + u, hair = 'hr' + u;
    var defs = lin(cloak, [['0', '#5c6a4d'], ['0.6', '#3a4634'], ['1', '#1c231a']]) +
      lin(fur, [['0', '#a08d68'], ['1', '#6b5c42']]) +
      lin(skinG, [['0', '#f2cda7'], ['1', '#d6a97f']]) +
      lin(hair, [['0', '#2b241c'], ['1', '#100e0b']]);
    var body =
      '<ellipse cx="120" cy="307" rx="54" ry="8" fill="' + INK + '" opacity="0.16"/>' +
      // 鹿角
      '<path d="M110 52 C100 34 88 24 72 20 C84 34 92 48 100 64" fill="none" stroke="#a8842c" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M90 30 C84 20 76 14 66 12" fill="none" stroke="#a8842c" stroke-width="2.8" stroke-linecap="round"/>' +
      '<path d="M98 46 C98 32 104 22 114 14" fill="none" stroke="#a8842c" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M130 52 C140 34 152 24 168 20 C156 34 148 48 140 64" fill="none" stroke="#a8842c" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M150 30 C156 20 164 14 174 12" fill="none" stroke="#a8842c" stroke-width="2.8" stroke-linecap="round"/>' +
      '<path d="M142 46 C142 32 136 22 126 14" fill="none" stroke="#a8842c" stroke-width="2.6" stroke-linecap="round"/>' +
      // 长发
      '<path d="M104 72 C94 92 92 120 96 146 C88 170 84 198 86 224 C96 200 102 178 106 158 C110 188 110 216 108 244 C116 220 120 194 120 170 C120 194 124 220 132 244 C130 216 130 188 134 158 C138 178 144 200 154 224 C156 198 152 170 144 146 C148 120 146 92 136 72 Z" fill="url(#' + hair + ')" opacity="0.95"/>' +
      // 斗篷
      '<path d="M120 106 C96 102 78 124 72 172 L62 258 L76 246 L80 282 L96 266 L104 296 L120 278 L136 296 L144 266 L160 282 L164 246 L178 258 L168 172 C162 124 144 102 120 106 Z" fill="url(#' + cloak + ')" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M120 106 C108 106 100 114 94 128 L106 150 L120 140 L134 150 L146 128 C140 114 132 106 120 106 Z" fill="url(#' + fur + ')" stroke="' + INK + '" stroke-width="1.3"/>' +
      // 内裙
      '<path d="M104 148 L98 276 L116 268 L120 252 L124 268 L142 276 L136 148 Z" fill="#2a3227" opacity="0.9"/>' +
      '<path d="M120 148 L120 252" stroke="' + RED + '" stroke-width="1.8" opacity="0.5"/>' +
      // 腰带
      '<path d="M92 202 Q120 210 148 202 L146 218 Q120 226 94 218 Z" fill="#3a2c1c" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<circle cx="120" cy="214" r="4.4" fill="#a8842c"/>' +
      // 羽饰
      '<path d="M104 136 L110 150" stroke="' + RED + '" stroke-width="1.8"/>' +
      '<path d="M136 136 L130 150" stroke="' + RED + '" stroke-width="1.8"/>' +
      '<path d="M120 142 L117 156 L123 156 Z" fill="#a8842c"/>' +
      '<path d="M110 126 L116 140 L104 136 Z" fill="' + RED + '" opacity="0.75"/>' +
      // 手臂（右臂有刺青）
      '<path d="M86 158 C78 180 76 200 80 216 L92 222 L100 210 L100 178 Z" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M154 158 C164 180 166 200 162 216 L150 222 L142 210 L142 178 Z" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M150 184 C154 190 156 198 155 206 C151 200 148 192 148 186 Z" fill="' + RED + '" opacity="0.55"/>' +
      '<path d="M92 190 L96 194 M92 200 L96 204" stroke="' + INK + '" stroke-width="1.2" opacity="0.35"/>' +
      '<ellipse cx="82" cy="220" rx="7" ry="8.5" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<ellipse cx="160" cy="220" rx="7" ry="8.5" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.2"/>' +
      // 头
      '<path d="M112 94 L128 94 L130 110 L110 110 Z" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<ellipse cx="120" cy="79" rx="16.5" ry="19" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M104 79 C103 58 110 47 120 47 C130 47 137 58 136 79 C132 65 127 61 120 61 C113 61 108 65 104 79 Z" fill="url(#' + hair + ')"/>' +
      '<path d="M112 72 Q115 70 118 72" fill="none" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<path d="M122 72 Q125 70 128 72" fill="none" stroke="' + INK + '" stroke-width="1.3"/>' +
      '<path d="M112 80 Q115.5 78 119 80" fill="none" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M121 80 Q124.5 78 128 80" fill="none" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M120 81 L119 88" stroke="#b98a63" stroke-width="1.1"/>' +
      '<path d="M116 92 Q120 94 124 92" fill="none" stroke="' + RED + '" stroke-width="1.4"/>' +
      '<path d="M108 88 C106 92 106 96 108 100" fill="none" stroke="#a8842c" stroke-width="1.6" opacity="0.8"/>' +
      '<path d="M132 88 C134 92 134 96 132 100" fill="none" stroke="#a8842c" stroke-width="1.6" opacity="0.8"/>' +
      '<circle cx="102" cy="98" r="2.6" fill="none" stroke="#a8842c" stroke-width="1.2" opacity="0.8"/>' +
      '<path d="M136 108 L140 112 M136 112 L140 108" stroke="#a8842c" stroke-width="1.4" opacity="0.6"/>';
    return { defs: defs, body: body };
  }

  // ---------- 射手 ----------
  function drawArcherMale(u) {
    var coat = 'ac' + u, pants = 'ap' + u, skinG = 'ask' + u, hair = 'ah' + u;
    var defs = lin(coat, [['0', '#6b4a2c'], ['0.55', '#4c3420'], ['1', '#2a1c11']]) +
      lin(pants, [['0', '#3d4a36'], ['1', '#1e261c']]) +
      lin(skinG, [['0', '#f0cda8'], ['1', '#d5a87f']]) +
      lin(hair, [['0', '#2a231d'], ['1', '#100e0c']]);
    var body =
      '<ellipse cx="120" cy="307" rx="56" ry="8" fill="' + INK + '" opacity="0.16"/>' +
      // 箭囊（背在右肩后）
      '<g transform="rotate(18 164 150)">' +
      '<path d="M150 120 L178 120 L174 196 L154 196 Z" fill="#3b2a1a" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M156 196 L158 126 M162 196 L164 126 M168 196 L170 126" stroke="#8d7c62" stroke-width="2"/>' +
      '<path d="M152 120 L150 106 M160 120 L159 103 M168 120 L168 106" stroke="#7a694f" stroke-width="2.4"/>' +
      '<path d="M148 104 L152 96 L156 104 Z" fill="' + RED + '"/>' +
      '<path d="M164 102 L168 94 L172 102 Z" fill="' + RED + '"/>' +
      '</g>' +
      // 腿与靴
      '<path d="M100 232 L94 292 L112 296 L118 232 Z" fill="url(#' + pants + ')" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M140 232 L146 292 L128 296 L122 232 Z" fill="url(#' + pants + ')" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M88 290 L112 292 L114 304 L86 302 Z" fill="#241a12" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M152 290 L128 292 L126 304 L154 302 Z" fill="#241a12" stroke="' + INK + '" stroke-width="1.4"/>' +
      // 短袍
      '<path d="M120 104 C102 104 92 114 89 136 L80 232 C78 250 92 258 108 258 L132 258 C148 258 162 250 160 232 L151 136 C148 114 138 104 120 104 Z" fill="url(#' + coat + ')" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M104 108 L120 150 L136 108 L130 104 L120 134 L110 104 Z" fill="' + PAPER + '" opacity="0.9"/>' +
      // 护肩皮甲
      '<path d="M88 118 C76 126 72 142 76 154 L96 148 L99 122 Z" fill="#3f2c1b" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M152 118 C164 126 168 142 164 154 L144 148 L141 122 Z" fill="#3f2c1b" stroke="' + INK + '" stroke-width="1.6"/>' +
      // 腰带
      '<path d="M84 174 Q120 182 156 174 L154 196 Q120 204 86 196 Z" fill="#5c6b45" stroke="' + INK + '" stroke-width="1.2" opacity="0.95"/>' +
      '<path d="M118 184 L124 184 L124 208 L118 208 Z" fill="#b9933f"/>' +
      // 左臂
      '<path d="M92 128 C78 142 70 172 68 202 C67 216 74 225 84 224 C92 223 96 215 96 204 L98 150 Z" fill="url(#' + coat + ')" stroke="' + INK + '" stroke-width="1.8"/>' +
      // 右臂（持弓手，向前伸出）
      '<path d="M146 128 C162 140 172 166 176 192 C178 206 174 214 166 214 C158 214 153 207 152 196 L146 152 Z" fill="url(#' + coat + ')" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<ellipse cx="70" cy="222" rx="7.5" ry="10" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<ellipse cx="177" cy="213" rx="7.5" ry="10" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.4"/>' +
      // 头
      '<path d="M111 96 L129 96 L131 110 L109 110 Z" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<ellipse cx="120" cy="81" rx="18" ry="21" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M102 84 C98 60 108 47 120 47 C133 47 143 60 138 84 C136 66 129 61 120 61 C110 61 104 67 102 84 Z" fill="url(#' + hair + ')"/>' +
      '<path d="M103 70 Q120 60 137 70 L137 76 Q120 68 103 76 Z" fill="' + RED + '" opacity="0.9"/>' +
      '<path d="M137 70 C156 74 164 90 160 108 C154 92 146 82 136 78 Z" fill="url(#' + hair + ')" opacity="0.9"/>' +
      '<path d="M111 78 Q115 76 119 78" fill="none" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M121 78 Q125 76 129 78" fill="none" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M112 86 Q115 84 118 86" fill="none" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M122 86 Q125 84 128 86" fill="none" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>' +
      '<path d="M120 87 L119 92 L122 93" fill="none" stroke="#b98a63" stroke-width="1.2" stroke-linecap="round"/>' +
      '<path d="M116 97 Q120 99 124 97" fill="none" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M106 70 L114 68" stroke="' + INK + '" stroke-width="2" opacity="0.65"/>' +
      '<path d="M134 68 L126 70" stroke="' + INK + '" stroke-width="2" opacity="0.65"/>';
    return { defs: defs, body: body };
  }

  function drawArcherFemale(u) {
    var coat = 'afc' + u, skirt = 'afs' + u, skinG = 'afk' + u, hair = 'afh' + u;
    var defs = lin(coat, [['0', '#5a6b4a'], ['0.6', '#3f4d35'], ['1', '#232c1d']]) +
      lin(skirt, [['0', '#47573b'], ['1', '#1f271b']]) +
      lin(skinG, [['0', '#f1cda9'], ['1', '#d8ab82']]) +
      lin(hair, [['0', '#2a231d'], ['1', '#0f0d0b']]);
    var body =
      '<ellipse cx="120" cy="307" rx="52" ry="7" fill="' + INK + '" opacity="0.16"/>' +
      // 后发与朱砂发带
      '<path d="M103 76 C97 58 106 45 120 45 C134 45 144 58 138 76 C146 104 150 130 146 158 C142 182 136 208 132 232 C126 206 124 194 120 190 C116 194 114 206 108 232 C104 208 98 182 94 158 C90 130 94 104 103 76 Z" fill="url(#' + hair + ')" opacity="0.92"/>' +
      '<path d="M138 62 C158 82 160 118 148 146" fill="none" stroke="' + RED + '" stroke-width="3.4" opacity="0.85" stroke-linecap="round"/>' +
      // 腿与靴
      '<path d="M104 234 L98 292 L114 296 L120 234 Z" fill="#2a3324" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M136 234 L142 292 L126 296 L120 234 Z" fill="#2a3324" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M92 290 L114 292 L116 304 L90 302 Z" fill="#241a12" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M148 290 L126 292 L124 304 L150 302 Z" fill="#241a12" stroke="' + INK + '" stroke-width="1.4"/>' +
      // 短甲与裙
      '<path d="M120 104 C106 104 96 114 93 136 L86 210 C84 226 90 242 104 250 L136 250 C150 242 156 226 154 210 L147 136 C144 114 134 104 120 104 Z" fill="url(#' + coat + ')" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M96 206 Q120 216 144 206 L150 238 Q120 252 90 238 Z" fill="url(#' + skirt + ')" stroke="' + INK + '" stroke-width="1.5"/>' +
      // 胸甲与腰带
      '<path d="M100 112 Q120 126 140 112 L142 152 Q120 164 98 152 Z" fill="#3f2c1b" opacity="0.9"/>' +
      '<path d="M90 172 Q120 180 150 172 L148 190 Q120 198 92 190 Z" fill="' + RED + '" opacity="0.82"/>' +
      // 护肩
      '<path d="M94 118 C82 126 78 142 82 154 L100 148 L102 122 Z" fill="#3f2c1b" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M146 118 C158 126 162 142 158 154 L140 148 L138 122 Z" fill="#3f2c1b" stroke="' + INK + '" stroke-width="1.5"/>' +
      // 双臂
      '<path d="M96 126 C84 140 78 166 76 194 C75 208 81 218 90 217 C98 216 102 208 102 196 L103 148 Z" fill="url(#' + coat + ')" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M144 126 C156 140 162 166 164 194 C165 208 159 218 150 217 C142 216 138 208 138 196 L137 148 Z" fill="url(#' + coat + ')" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<ellipse cx="86" cy="216" rx="7" ry="9.5" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<ellipse cx="164" cy="214" rx="7" ry="9.5" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.4"/>' +
      // 头
      '<path d="M112 96 L128 96 L130 110 L110 110 Z" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<ellipse cx="120" cy="82" rx="17" ry="20" fill="url(#' + skinG + ')" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<path d="M103 82 C100 60 108 49 120 49 C132 49 140 60 137 82 C135 66 129 62 120 62 C111 62 105 66 103 82 Z" fill="url(#' + hair + ')"/>' +
      '<path d="M104 68 Q120 58 136 68 L136 74 Q120 66 104 74 Z" fill="' + RED + '" opacity="0.92"/>' +
      '<path d="M111 80 Q115 78 119 80" fill="none" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M121 80 Q125 78 129 80" fill="none" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M112 87 Q115 85 118 87" fill="none" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M122 87 Q125 85 128 87" fill="none" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/>' +
      '<path d="M120 88 L119 93 L122 94" fill="none" stroke="#b98a63" stroke-width="1.2" stroke-linecap="round"/>' +
      '<path d="M116 98 Q120 100 124 98" fill="none" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M140 90 L144 102" stroke="' + RED + '" stroke-width="2" opacity="0.6" stroke-linecap="round"/>';
    return { defs: defs, body: body };
  }

  var drawers = {
    'scholar-male': drawScholarMale,
    'scholar-female': drawScholarFemale,
    'general-male': drawGeneralMale,
    'general-female': drawGeneralFemale,
    'shaman-male': drawShamanMale,
    'shaman-female': drawShamanFemale,
    'archer-male': drawArcherMale,
    'archer-female': drawArcherFemale
  };

  var backdrops = { scholar: backdropScholar, general: backdropGeneral, shaman: backdropShaman, archer: backdropArcher };


  // ---------- 兵器叠加 ----------
  function weaponLayer(weapon, x, y, u) {
    if (weapon === 'bow') {
      return '<g transform="translate(' + x + ' ' + y + ') rotate(10)">' +
        '<path d="M0 -50 C34 -34 34 34 0 50" fill="none" stroke="#211b15" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M0 -50 L-14 0 L0 50" fill="none" stroke="#7a694f" stroke-width="1.4"/>' +
        '<path d="M-14 0 L-54 0" stroke="#8d7c62" stroke-width="2"/>' +
        '<path d="M-54 0 L-46 -4 L-46 4 Z" fill="#211b15"/>' +
        '<path d="M-30 0 L-14 0" stroke="#a8362b" stroke-width="2.2"/>' +
        '</g>';
    }
    if (weapon === 'brush') {
      return '<g transform="translate(' + x + ' ' + y + ') rotate(-14)">' +
        '<path d="M0 84 L0 -34" stroke="#2f2a22" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M0 84 L0 -34" stroke="#6b5236" stroke-width="2.4" opacity="0.7"/>' +
        '<path d="M-7 84 L7 84" stroke="#b9933f" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M-6 -34 L6 -34" stroke="#b9933f" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M0 -38 C13 -54 16 -74 8 -92 C3 -82 -3 -82 -8 -92 C-16 -74 -13 -54 0 -38 Z" fill="#17130f" stroke="#17130f" stroke-width="1.6"/>' +
        '<path d="M-4 -44 C2 -56 4 -70 1 -82" fill="none" stroke="rgba(239,230,211,0.5)" stroke-width="1.2"/>' +
        '<path d="M-6 12 C-15 30 -13 46 0 54 C13 46 15 30 6 12 Z" fill="' + RED + '" opacity="0.82"/>' +
        '<path d="M0 14 L0 50" stroke="#f0d9b5" stroke-width="1.2" opacity="0.5"/>' +
        '</g>';
    }
    if (weapon === 'sword') {
      return '<g transform="translate(' + x + ' ' + y + ') rotate(16)">' +
        '<path d="M0 14 L0 -76" stroke="#2a2723" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M0 -76 L4 -62 L0 -52 L-4 -62 Z" fill="#2a2723"/>' +
        '<path d="M0 -68 L0 8" stroke="#e7dfcd" stroke-width="2" opacity="0.75"/>' +
        '<path d="M-12 14 L12 14" stroke="#8f2f25" stroke-width="4.6" stroke-linecap="round"/>' +
        '<path d="M0 16 L0 36" stroke="#3b2d20" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M-4 38 L4 38" stroke="#a8842c" stroke-width="3"/>' +
        '</g>';
    }
    return '<g transform="translate(' + x + ' ' + y + ') rotate(12)">' +
      '<path d="M0 62 L0 -60" stroke="#3b2d20" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M0 -60 L0 -70" stroke="#a8842c" stroke-width="3"/>' +
      '<circle cx="0" cy="-78" r="10" fill="#a8362b"/>' +
      '<circle cx="0" cy="-78" r="15" fill="none" stroke="#a8362b" stroke-width="1.4" opacity="0.5"/>' +
      '<path d="M0 -78 L0 -70" stroke="#f0d9b5" stroke-width="2"/>' +
      '<path d="M-5 -82 L5 -74" stroke="#f0d9b5" stroke-width="1.6" opacity="0.6"/>' +
      '</g>';
  }

  function handAnchor(charId, gender) {
    if (charId === 'scholar') return gender === 'male' ? { x: 177, y: 213 } : { x: 157, y: 214 };
    if (charId === 'general') return gender === 'male' ? { x: 179, y: 228 } : { x: 158, y: 210 };
    if (charId === 'archer') return gender === 'male' ? { x: 177, y: 213 } : { x: 164, y: 214 };
    return gender === 'male' ? { x: 170, y: 230 } : { x: 160, y: 220 };
  }

  function characterSVG(charId, gender, weaponId, opts) {
    opts = opts || {};
    var u = 'u' + (++uid);
    var draw = drawers[charId + '-' + gender] || drawScholarMale;
    var art = draw(u);
    var anchor = handAnchor(charId, gender);
    var weapon = weaponId || 'bow';
    var wl = weaponLayer(weapon, anchor.x, anchor.y, u);
    var bd = backdrops[charId] ? backdrops[charId](u) : '';
    var cls = opts.className || '';
    var bg = opts.transparent ? '' :
      '<rect x="8" y="26" width="224" height="282" rx="10" fill="#f2e9d7" opacity="0.55"/>' +
      '<path d="M16 40 Q60 18 108 34" fill="none" stroke="#c9b998" stroke-width="1" opacity="0.5"/>';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" class="' + cls + '" role="img" aria-label="' + charId + ' ' + gender + '">' +
      '<defs>' + art.defs + '</defs>' +
      bg + bd + art.body + wl +
      '</svg>';
  }

  // ---------- 兵器图标 ----------
  function weaponIconSVG(weaponId, cls) {
    var art = '';
    if (weaponId === 'bow') {
      art = '<g transform="translate(60 62) rotate(-32)">' +
        '<path d="M0 -38 C30 -24 30 24 0 38" fill="none" stroke="#1c1813" stroke-width="4.6" stroke-linecap="round"/>' +
        '<path d="M0 -38 L-11 0 L0 38" fill="none" stroke="#7a694f" stroke-width="1.3"/>' +
        '<path d="M-11 0 L-46 0" stroke="#6f5f49" stroke-width="2"/>' +
        '<path d="M-46 0 L-39 -3.5 L-39 3.5 Z" fill="#1c1813"/>' +
        '<path d="M-28 0 L-11 0" stroke="#a8362b" stroke-width="2"/>' +
        '</g>' +
        '<path d="M18 92 C34 84 48 80 62 78" fill="none" stroke="#a8362b" stroke-width="1.4" opacity="0.5"/>';
    } else if (weaponId === 'sword') {
      art = '<g transform="translate(62 62) rotate(28)">' +
        '<path d="M0 28 L0 -44" stroke="#1f1c18" stroke-width="6" stroke-linecap="round"/>' +
        '<path d="M0 -44 L3 -32 L0 -24 L-3 -32 Z" fill="#1f1c18"/>' +
        '<path d="M0 -36 L0 20" stroke="#ede5d3" stroke-width="1.8" opacity="0.8"/>' +
        '<path d="M-11 28 L11 28" stroke="#8f2f25" stroke-width="4.2" stroke-linecap="round"/>' +
        '<path d="M0 30 L0 46" stroke="#3b2d20" stroke-width="5" stroke-linecap="round"/>' +
        '</g>' +
        '<path d="M84 30 C92 22 100 20 108 22" fill="none" stroke="#a8362b" stroke-width="1.4" opacity="0.5"/>';
    } else if (weaponId === 'staff') {
      art = '<g transform="translate(60 60) rotate(24)">' +
        '<path d="M0 54 L0 -36" stroke="#3b2d20" stroke-width="5" stroke-linecap="round"/>' +
        '<circle cx="0" cy="-48" r="10" fill="#a8362b"/>' +
        '<circle cx="0" cy="-48" r="16" fill="none" stroke="#a8362b" stroke-width="1.3" opacity="0.5"/>' +
        '<path d="M-6 -52 L6 -44" stroke="#f0d9b5" stroke-width="1.6" opacity="0.7"/>' +
        '</g>' +
        '<path d="M30 26 L40 34 L36 44" fill="none" stroke="#1c1813" stroke-width="1.6" opacity="0.55"/>' +
        '<path d="M84 20 L94 16 L100 24" fill="none" stroke="#a8362b" stroke-width="1.4" opacity="0.5"/>';
    } else {
      art = '<g transform="translate(60 62) rotate(16)">' +
        '<path d="M0 50 L0 -30" stroke="#2f2a22" stroke-width="5.6" stroke-linecap="round"/>' +
        '<path d="M-6 50 L6 50" stroke="#b9933f" stroke-width="3.4" stroke-linecap="round"/>' +
        '<path d="M-5 -30 L5 -30" stroke="#b9933f" stroke-width="5"/>' +
        '<path d="M0 -34 C12 -48 14 -66 7 -82 C3 -73 -3 -73 -7 -82 C-14 -66 -12 -48 0 -34 Z" fill="#17130f"/>' +
        '<path d="M-4 6 C-12 22 -10 36 0 43 C10 36 12 22 4 6 Z" fill="#a8362b" opacity="0.82"/>' +
        '</g>' +
        '<path d="M24 82 C36 88 48 88 58 84" fill="none" stroke="#a8362b" stroke-width="1.4" opacity="0.5"/>' +
        '<circle cx="92" cy="78" r="2.4" fill="#17130f" opacity="0.55"/>' +
        '<circle cx="84" cy="90" r="1.6" fill="#17130f" opacity="0.4"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" class="' + (cls || '') + '" role="img">' +
      '<circle cx="60" cy="58" r="44" fill="#e8ddc7" opacity="0.55"/>' +
      '<circle cx="60" cy="58" r="44" fill="none" stroke="#1c1813" stroke-width="1" opacity="0.18" stroke-dasharray="3 5"/>' +
      art + '</svg>';
  }

  function getCharacter(id) {
    for (var i = 0; i < characters.length; i++) if (characters[i].id === id) return characters[i];
    return characters[0];
  }

  // ---------- 正式立绘（图像生成 + 抠图，本地文件） ----------
  var PORTRAITS = {
    scholar: { male: 'assets/portraits/scholar-male.png', female: 'assets/portraits/scholar-female.png' },
    general: { male: 'assets/portraits/general-male.png', female: 'assets/portraits/general-female.png' },
    shaman: { male: 'assets/portraits/shaman-male.png', female: 'assets/portraits/shaman-female.png' },
    archer: { male: 'assets/portraits/archer-male.png', female: 'assets/portraits/archer-female.png' }
  };

  function portraitPath(charId, gender) {
    var g = gender === 'female' ? 'female' : 'male';
    var set = PORTRAITS[charId] || PORTRAITS.scholar;
    return set[g];
  }

  function portraitHTML(charId, gender, cls) {
    return '<img class="' + (cls || 'portrait') + '" src="' + portraitPath(charId, gender) + '" alt="' + escAttr(charId + ' ' + gender) + '" draggable="false">';
  }

  function escAttr(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  /* ---------- 武器独立图层 ----------
     立绘本身不再绘制武器；以下锚点标出每张立绘空手的掌心位置（0-1），
     武器按锚点、旋转与缩放叠加到立绘之上，因此换武器立绘不变、武器实时更换。 */
  var PORTRAIT_ANCHORS = {
    'scholar-male': { x: 0.225, y: 0.352, dir: -1, scale: 1 },
    'scholar-female': { x: 0.225, y: 0.357, dir: -1, scale: 1 },
    'general-male': { x: 0.162, y: 0.552, dir: -1, scale: 1.02 },
    'general-female': { x: 0.792, y: 0.418, dir: 1, scale: 0.98 },
    'shaman-male': { x: 0.182, y: 0.538, dir: -1, scale: 1 },
    'shaman-female': { x: 0.215, y: 0.548, dir: -1, scale: 0.96 },
    'archer-male': { x: 0.700, y: 0.532, dir: 1, scale: 1 },
    'archer-female': { x: 0.705, y: 0.528, dir: 1, scale: 0.98 }
  };

  function portraitAnchor(charId, gender) {
    var key = charId + '-' + (gender === 'female' ? 'female' : 'male');
    return PORTRAIT_ANCHORS[key] || PORTRAIT_ANCHORS['scholar-male'];
  }

  function weaponPose(weaponId, anchor) {
    var d = anchor.dir || -1;
    if (weaponId === 'sword') return { rot: d * 0.24, dx: 0, dy: 0 };
    if (weaponId === 'staff') return { rot: d * 0.07, dx: 0, dy: 0 };
    if (weaponId === 'brush') return { rot: d * 0.17, dx: 0, dy: 0 };
    return { rot: d * 0.11, dx: 0, dy: 0 };
  }

  function rr(c, x, y, w, h, r) {
    var q = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + q, y);
    c.arcTo(x + w, y, x + w, y + h, q);
    c.arcTo(x + w, y + h, x, y + h, q);
    c.arcTo(x, y + h, x, y, q);
    c.arcTo(x, y, x + w, y, q);
    c.closePath();
  }

  function tassel(c, x, y, len, width, color) {
    c.save();
    c.strokeStyle = color;
    c.lineCap = 'round';
    for (var i = -1; i <= 1; i++) {
      c.lineWidth = width * (i === 0 ? 1 : 0.72);
      c.beginPath();
      c.moveTo(x + i * width * 0.6, y);
      c.quadraticCurveTo(x + i * width * 1.5, y + len * 0.55, x + i * width * 0.9, y + len);
      c.stroke();
    }
    c.fillStyle = color;
    c.beginPath();
    c.arc(x, y, width * 1.15, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function drawBowArt(c, dir) {
    var d = dir || -1;
    var path = function () {
      c.beginPath();
      c.moveTo(0, -300);
      c.bezierCurveTo(74 * d, -190, 74 * d, 190, 0, 300);
    };
    c.lineCap = 'round';
    // 纸白外缘，保证在深色衣甲上也清晰
    c.strokeStyle = 'rgba(246,236,212,0.62)';
    c.lineWidth = 22;
    path();
    c.stroke();
    c.strokeStyle = '#17130f';
    c.lineWidth = 15;
    path();
    c.stroke();
    c.strokeStyle = '#7a4a26';
    c.lineWidth = 9;
    path();
    c.stroke();
    c.strokeStyle = 'rgba(240,192,116,0.95)';
    c.lineWidth = 3.6;
    path();
    c.stroke();
    // 弓梢
    [[0, -300], [0, 300]].forEach(function (p) {
      c.fillStyle = '#c8a34a';
      c.beginPath();
      c.arc(p[0], p[1], 8, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(23,19,15,0.75)';
      c.lineWidth = 1.8;
      c.stroke();
    });
    // 握把
    c.fillStyle = '#241a12';
    rr(c, -17, -50, 34, 100, 9);
    c.fill();
    c.strokeStyle = 'rgba(214,178,116,0.9)';
    c.lineWidth = 2.4;
    c.stroke();
    c.strokeStyle = 'rgba(168,54,43,0.85)';
    c.lineWidth = 4;
    for (var i = -3; i <= 3; i++) {
      c.beginPath();
      c.moveTo(-15, i * 12);
      c.lineTo(15, i * 12 + 6);
      c.stroke();
    }
    // 弦
    c.strokeStyle = 'rgba(255,250,236,0.9)';
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(0, -300);
    c.quadraticCurveTo(-12 * d, 0, 0, 300);
    c.stroke();
    // 朱砂流苏
    tassel(c, 16 * d, 54, 62, 5, 'rgba(168,54,43,0.9)');
    // 墨点
    c.fillStyle = 'rgba(23,19,15,0.45)';
    [[58 * d, -130, 2.6], [62 * d, 92, 1.9], [44 * d, 214, 1.6]].forEach(function (p) {
      c.beginPath();
      c.arc(p[0], p[1], p[2], 0, Math.PI * 2);
      c.fill();
    });
  }

  function drawSwordArt(c) {
    // 刃（纸白外缘）
    c.beginPath();
    c.moveTo(-14, -320);
    c.lineTo(0, -352);
    c.lineTo(14, -320);
    c.lineTo(7, -34);
    c.lineTo(-7, -34);
    c.closePath();
    c.strokeStyle = 'rgba(246,236,212,0.55)';
    c.lineWidth = 15;
    c.lineJoin = 'round';
    c.stroke();
    c.fillStyle = '#221d17';
    c.fill();
    c.strokeStyle = 'rgba(23,19,15,0.85)';
    c.lineWidth = 2;
    c.stroke();
    // 纸白锋
    c.strokeStyle = 'rgba(246,236,212,0.85)';
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(8, -316);
    c.lineTo(0, -344);
    c.lineTo(-8, -316);
    c.stroke();
    // 朱砂血槽
    c.strokeStyle = 'rgba(168,54,43,0.72)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, -306);
    c.lineTo(0, -50);
    c.stroke();
    // 剑格
    c.fillStyle = '#3a2418';
    rr(c, -48, -34, 96, 14, 6);
    c.fill();
    c.strokeStyle = 'rgba(202,164,94,0.9)';
    c.lineWidth = 2;
    c.stroke();
    // 剑柄
    c.fillStyle = '#241a12';
    rr(c, -14, -24, 28, 82, 8);
    c.fill();
    c.strokeStyle = 'rgba(214,178,116,0.7)';
    c.lineWidth = 2.4;
    for (var i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(-12, -18 + i * 15);
      c.lineTo(12, -10 + i * 15);
      c.stroke();
    }
    // 剑首
    c.fillStyle = '#b9933f';
    c.beginPath();
    c.arc(0, 64, 10, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(23,19,15,0.8)';
    c.lineWidth = 2;
    c.stroke();
    // 剑穗
    tassel(c, 8, 74, 110, 6, 'rgba(168,54,43,0.9)');
  }

  function drawStaffArt(c) {
    // 杆（纸白外缘）
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(246,236,212,0.5)';
    c.lineWidth = 23;
    c.beginPath();
    c.moveTo(0, 400);
    c.lineTo(0, -250);
    c.stroke();
    c.strokeStyle = '#17130f';
    c.lineWidth = 15;
    c.beginPath();
    c.moveTo(0, 400);
    c.lineTo(0, -250);
    c.stroke();
    c.strokeStyle = '#5d3f27';
    c.lineWidth = 9.5;
    c.beginPath();
    c.moveTo(0, 400);
    c.lineTo(0, -250);
    c.stroke();
    c.strokeStyle = 'rgba(214,170,110,0.5)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(3.2, 390);
    c.lineTo(3.2, -244);
    c.stroke();
    // 金箍
    [-180, -60, 92].forEach(function (y) {
      c.fillStyle = '#b9933f';
      c.fillRect(-8, y, 16, 9);
      c.strokeStyle = 'rgba(23,19,15,0.6)';
      c.lineWidth = 1.4;
      c.strokeRect(-8, y, 16, 9);
    });
    // 握把缠绳
    c.strokeStyle = 'rgba(168,54,43,0.85)';
    c.lineWidth = 3;
    for (var i = 0; i < 7; i++) {
      c.beginPath();
      c.moveTo(-9, -24 + i * 15);
      c.lineTo(9, -16 + i * 15);
      c.stroke();
    }
    // 顶部 Y 形托架（托住法珠）
    [[-36, -324, -9, -258], [36, -324, 9, -258]].forEach(function (b) {
      c.strokeStyle = '#2c1d12';
      c.lineWidth = 10;
      c.beginPath();
      c.moveTo(b[2], b[3]);
      c.quadraticCurveTo(b[2] + (b[0] - b[2]) * 0.5, b[1] - 20, b[0], b[1]);
      c.stroke();
      c.strokeStyle = 'rgba(202,164,94,0.9)';
      c.lineWidth = 2.6;
      c.beginPath();
      c.moveTo(b[2], b[3]);
      c.quadraticCurveTo(b[2] + (b[0] - b[2]) * 0.5, b[1] - 20, b[0], b[1]);
      c.stroke();
    });
    // 法珠光晕
    var gl = c.createRadialGradient(0, -320, 3, 0, -320, 56);
    gl.addColorStop(0, 'rgba(255,216,154,0.92)');
    gl.addColorStop(0.32, 'rgba(224,118,64,0.5)');
    gl.addColorStop(1, 'rgba(168,54,43,0)');
    c.fillStyle = gl;
    c.beginPath();
    c.arc(0, -320, 56, 0, Math.PI * 2);
    c.fill();
    // 金环
    c.strokeStyle = 'rgba(220,184,108,0.95)';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(0, -320, 26, 0, Math.PI * 2);
    c.stroke();
    // 法珠
    var orb = c.createRadialGradient(-6, -327, 2, 0, -320, 22);
    orb.addColorStop(0, '#e4705a');
    orb.addColorStop(0.55, '#a8362b');
    orb.addColorStop(1, '#6d1a14');
    c.fillStyle = orb;
    c.beginPath();
    c.arc(0, -320, 21, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(23,19,15,0.7)';
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = 'rgba(255,232,190,0.92)';
    c.beginPath();
    c.arc(-6, -327, 5.4, 0, Math.PI * 2);
    c.fill();
    // 骨坠与流苏
    c.fillStyle = '#efe4cb';
    rr(c, -7, -236, 14, 26, 6);
    c.fill();
    tassel(c, 0, -208, 84, 5, 'rgba(168,54,43,0.8)');
  }

  function drawBrushArt(c) {
    // 笔杆（纸白外缘）
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(246,236,212,0.52)';
    c.lineWidth = 22;
    c.beginPath();
    c.moveTo(0, 340);
    c.lineTo(0, -196);
    c.stroke();
    c.strokeStyle = '#17130f';
    c.lineWidth = 14;
    c.beginPath();
    c.moveTo(0, 340);
    c.lineTo(0, -196);
    c.stroke();
    c.strokeStyle = '#6b5236';
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(0, 340);
    c.lineTo(0, -196);
    c.stroke();
    c.strokeStyle = 'rgba(224,192,132,0.55)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(3, 332);
    c.lineTo(3, -190);
    c.stroke();
    // 金箍
    [-176, -30, 150].forEach(function (y) {
      c.fillStyle = '#b9933f';
      rr(c, -9, y, 18, 10, 3);
      c.fill();
      c.strokeStyle = 'rgba(23,19,15,0.6)';
      c.lineWidth = 1.4;
      c.stroke();
    });
    // 握把缠绳与竹节
    c.strokeStyle = 'rgba(168,54,43,0.55)';
    c.lineWidth = 2.4;
    for (var i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(-9, 30 + i * 20);
      c.lineTo(9, 37 + i * 20);
      c.stroke();
    }
    c.strokeStyle = 'rgba(23,19,15,0.42)';
    c.lineWidth = 1.8;
    [262, 96, -58].forEach(function (ny) {
      c.beginPath();
      c.moveTo(-9, ny);
      c.lineTo(9, ny + 2);
      c.stroke();
    });
    // 笔头根部金箍（加宽，明确笔与杆的分界）
    c.fillStyle = '#c8a34a';
    rr(c, -26, -236, 52, 30, 7);
    c.fill();
    c.strokeStyle = 'rgba(23,19,15,0.78)';
    c.lineWidth = 2;
    c.stroke();
    c.strokeStyle = 'rgba(23,19,15,0.32)';
    c.lineWidth = 1.2;
    [-226, -217, -208].forEach(function (yy) {
      c.beginPath();
      c.moveTo(-24, yy);
      c.lineTo(24, yy);
      c.stroke();
    });
    // 笔毫：饱满的锥形笔肚，靠近金箍最宽，向上收成圆钝锋尖
    var tip = c.createLinearGradient(0, -350, 0, -232);
    tip.addColorStop(0, 'rgba(9,8,7,0.99)');
    tip.addColorStop(0.5, 'rgba(26,21,16,0.98)');
    tip.addColorStop(1, 'rgba(84,66,45,0.95)');
    c.beginPath();
    c.moveTo(-30, -234);
    c.bezierCurveTo(-38, -260, -32, -306, -10, -334);
    c.bezierCurveTo(-5, -339, 2, -340, 7, -335);
    c.bezierCurveTo(30, -306, 36, -260, 30, -234);
    c.closePath();
    c.fillStyle = tip;
    c.fill();
    c.strokeStyle = 'rgba(246,236,212,0.34)';
    c.lineWidth = 1.6;
    c.stroke();
    // 毫毛纹理：由根至锋逐层收拢
    var hairs = [
      [-24, -236, -16, -300, -8, -328, 0.26],
      [-15, -234, -10, -308, -3, -335, 0.34],
      [-4, -234, -2, -316, 1, -338, 0.22],
      [9, -235, 8, -308, 4, -332, 0.3],
      [23, -236, 17, -296, 9, -324, 0.18]
    ];
    hairs.forEach(function (h) {
      c.strokeStyle = 'rgba(239,230,211,' + h[6] + ')';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(h[0], h[1]);
      c.bezierCurveTo(h[2] * 0.92, h[3] - 8, h[4] * 0.92, h[5] + 5, h[4], h[5]);
      c.stroke();
    });
    // 笔尖积墨
    var wet = c.createRadialGradient(0, -326, 1, 0, -318, 20);
    wet.addColorStop(0, 'rgba(6,6,5,0.96)');
    wet.addColorStop(1, 'rgba(12,10,8,0.1)');
    c.fillStyle = wet;
    c.beginPath();
    c.ellipse(0, -320, 14, 22, 0, 0, Math.PI * 2);
    c.fill();
    // 锋沿微光
    c.strokeStyle = 'rgba(246,236,212,0.18)';
    c.lineWidth = 2.4;
    c.beginPath();
    c.arc(0, -318, 15, -1.9, -1.05);
    c.stroke();
    // 悬垂墨滴
    c.fillStyle = 'rgba(23,19,15,0.86)';
    [[-26, -304, 3.6], [27, -262, 2.8], [-18, -244, 2]].forEach(function (p) {
      c.beginPath();
      c.arc(p[0], p[1], p[2], 0, Math.PI * 2);
      c.fill();
    });
    // 朱砂流苏
    tassel(c, 8, 196, 92, 5.4, 'rgba(168,54,43,0.88)');
    // 墨点
    c.fillStyle = 'rgba(23,19,15,0.4)';
    [[34, -58, 2.2], [-30, 62, 1.8], [26, 250, 1.6]].forEach(function (p) {
      c.beginPath();
      c.arc(p[0], p[1], p[2], 0, Math.PI * 2);
      c.fill();
    });
  }

  function drawWeapon(c, weaponId, x, y, scale, rot, dir) {
    if (!c || !scale) return;
    c.save();
    c.translate(x, y);
    c.rotate(rot || 0);
    c.scale(scale, scale);
    if (weaponId === 'sword') drawSwordArt(c);
    else if (weaponId === 'staff') drawStaffArt(c);
    else if (weaponId === 'brush') drawBrushArt(c);
    else drawBowArt(c, dir || -1);
    c.restore();
  }

  function paintLoadout(cv, charId, gender, weaponId) {
    if (!cv) return;
    var c = cv.getContext('2d');
    var w = cv.width, h = cv.height;
    var a = portraitAnchor(charId, gender);
    var pose = weaponPose(weaponId, a);
    var painted = false;
    function paint(img) {
      if (painted) return;
      painted = true;
      c.clearRect(0, 0, w, h);
      c.drawImage(img, 0, 0, w, h);
      drawWeapon(c, weaponId, (a.x + pose.dx) * w, (a.y + pose.dy) * h, h / 1024 * a.scale, pose.rot, a.dir);
    }
    var img = new Image();
    img.onload = function () { paint(img); };
    img.src = portraitPath(charId, gender);
    if (img.complete && img.naturalWidth) paint(img);
  }

  function loadoutCanvasHTML(charId, gender, cls) {
    return '<canvas class="' + (cls || 'portrait-canvas') + '" width="480" height="640" data-char="' +
      escAttr(charId) + '" data-gender="' + escAttr(gender) + '" aria-label="' +
      escAttr(charId + ' ' + gender) + '"></canvas>';
  }

  function getWeapon(id) {
    for (var i = 0; i < weapons.length; i++) if (weapons[i].id === id) return weapons[i];
    return weapons[0];
  }

  window.SKINS = {
    characters: characters,
    weapons: weapons,
    characterSVG: characterSVG,
    portraitPath: portraitPath,
    portraitHTML: portraitHTML,
    portraitAnchor: portraitAnchor,
    weaponPose: weaponPose,
    drawWeapon: drawWeapon,
    paintLoadout: paintLoadout,
    loadoutCanvasHTML: loadoutCanvasHTML,
    weaponIconSVG: weaponIconSVG,
    getCharacter: getCharacter,
    getWeapon: getWeapon,
    handAnchor: handAnchor
  };
})();
