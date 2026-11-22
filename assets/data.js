/* 墨战 · 键影 —— 关卡、词库与规则数据 */
(function () {
  'use strict';

  // 英文词库：按指法递进
  var POOLS = {
    home: [
      'sad', 'dad', 'fall', 'glad', 'hall', 'lash', 'flag', 'gas', 'salad', 'shall',
      'flask', 'glass', 'half', 'ask', 'dash', 'flash', 'gash', 'slag', 'fads', 'halls'
    ],
    top: [
      'quiet', 'tower', 'power', 'type', 'quote', 'write', 'pretty', 'tiger', 'water',
      'upper', 'pilot', 'outer', 'wiper', 'towel', 'poetry', 'quality', 'quarter',
      'require', 'trophy', 'outlet', 'trout', 'quietly', 'output', 'portrait'
    ],
    bottom: [
      'mix', 'vex', 'cave', 'zinc', 'buzz', 'box', 'came', 'numb', 'move', 'bench',
      'corn', 'vamp', 'maze', 'zoom', 'brick', 'crime', 'vivid', 'bonus', 'cabin',
      'combo', 'canvas', 'become', 'combine', 'vacuum'
    ],
    all: [
      'shadow', 'brush', 'river', 'mountain', 'silent', 'storm', 'wander', 'blade',
      'spirit', 'harbor', 'lantern', 'thunder', 'whisper', 'ember', 'frost', 'vessel',
      'hollow', 'climb', 'distant', 'shelter', 'glimmer', 'pathway', 'ancient', 'drifting'
    ],
    numbers: [
      '2026', '77', '42', '108', '365', '1000', '8080', '2048', '512', '99',
      '404', '1200', '6000', '314', '1024', '60', '88', '1927', '2046', '4004'
    ],
    symbols: [
      '(1)', 'a+b', 'x=y', '50%', '#ink', '@home', 'c_d', 'f(x)', '3>2', '1<9',
      '~end', '&ink', '*star', '-dash', 'a/b', '{n}', '[k]', 'a=b', 'x%y', 'q&a'
    ],
    long: [
      'extraordinary', 'resonance', 'wandering', 'illumination', 'consistency',
      'transformation', 'calligraphy', 'perseverance', 'architecture', 'constellation',
      'unbelievable', 'characteristic', 'responsibility', 'determination',
      'sophisticated', 'misunderstanding', 'incomprehensible', 'straightforward',
      'simultaneously', 'extraordinarily'
    ],
    phrases: [
      'the-quiet-river', 'ink-and-blade', 'night-falls-softly', 'follow-the-wind',
      'still-waters-deep', 'a-thousand-miles', 'moon-over-the-pass', 'sword-in-the-mist',
      'letters-from-home', 'beneath-the-pines', 'walk-by-the-water', 'the-last-lantern'
    ],
    // 大写：训练 Shift + 字母，左手小指按住右 Shift，右手小指按住左 Shift
    caps: [
      'Moon', 'River', 'Blade', 'Thunder', 'Lantern', 'Whisper', 'Ember', 'Frost',
      'Harbor', 'Spirit', 'Mountain', 'Silent', 'Storm', 'Shadow', 'Brush', 'Wander',
      'Ancient', 'Distant', 'Glimmer', 'Vessel'
    ],
    // 标点：句读与引号，需 Shift 与基准位移配合
    punct: [
      'ink.', 'blade,', 'storm!', 'river?', 'frost;', 'shadow:', 'ember"', "spirit'",
      '(brush)', '"moon"', 'lantern,', 'whisper!', 'harbor.', 'vessel;', 'mist,',
      'sword:', 'cloud!', 'stone.', 'rain?', 'flame;'
    ]
  };

  // 英文词 → 最常用汉语释义（重击后短暂展示）
  var EN_MEANINGS = {
    sad: '悲伤', dad: '父亲', fall: '落下', glad: '欣喜', hall: '厅堂', lash: '鞭击',
    flag: '旗帜', gas: '气体', salad: '沙拉', shall: '将要', flask: '长颈瓶', glass: '玻璃',
    half: '一半', ask: '询问', dash: '疾冲', flash: '闪光', gash: '深痕', slag: '矿渣',
    fads: '一时风尚', halls: '厅堂',

    quiet: '安静', tower: '高塔', power: '力量', type: '打字', quote: '引语', write: '书写',
    pretty: '秀美', tiger: '猛虎', water: '流水', upper: '上方', pilot: '领航', outer: '外层',
    wiper: '雨刷', towel: '巾帕', poetry: '诗篇', quality: '品质', quarter: '四分之一',
    require: '需要', trophy: '战利品', outlet: '出口', trout: '鳟鱼', quietly: '悄然',
    output: '输出', portrait: '画像',

    mix: '混合', vex: '烦扰', cave: '洞穴', zinc: '锌', buzz: '嗡鸣', box: '匣子',
    came: '来了', numb: '麻木', move: '移动', bench: '长凳', corn: '谷物', vamp: '即兴',
    maze: '迷宫', zoom: '疾驰', brick: '砖石', crime: '罪案', vivid: '鲜明', bonus: '额外之赏',
    cabin: '木屋', combo: '连击', canvas: '画布', become: '成为', combine: '合并', vacuum: '真空',

    shadow: '影子', brush: '笔刷', river: '江河', mountain: '山岳', silent: '寂静',
    storm: '风暴', wander: '漫游', blade: '锋刃', spirit: '神魂', harbor: '港湾',
    lantern: '灯笼', thunder: '雷声', whisper: '低语', ember: '余烬', frost: '霜',
    vessel: '舟器', hollow: '空谷', climb: '攀登', distant: '遥远', shelter: '庇护',
    glimmer: '微光', pathway: '小径', ancient: '古老', drifting: '漂游',

    extraordinary: '非凡', resonance: '共鸣', wandering: '流浪', illumination: '启明',
    consistency: '恒常', transformation: '蜕变', calligraphy: '书法', perseverance: '坚忍',
    architecture: '建筑', constellation: '星宿', unbelievable: '难以置信',
    characteristic: '特征', responsibility: '责任', determination: '决心',
    sophisticated: '精妙', misunderstanding: '误会', incomprehensible: '难解',
    straightforward: '直截了当', simultaneously: '同时', extraordinarily: '非凡地',

    'the-quiet-river': '静谧之河', 'ink-and-blade': '墨与刃', 'night-falls-softly': '夜色轻落',
    'follow-the-wind': '随风而行', 'still-waters-deep': '静水流深', 'a-thousand-miles': '千里之行',
    'moon-over-the-pass': '关山月', 'sword-in-the-mist': '雾中剑', 'letters-from-home': '家书',
    'beneath-the-pines': '松下文', 'walk-by-the-water': '临水而行', 'the-last-lantern': '最后一盏灯'
  };

  // 长组合伤害倍率：按字母 / 拼音字母总数取档
  var LENGTH_BONUS = [
    { min: 17, mul: 1.7 },
    { min: 12, mul: 1.45 },
    { min: 8, mul: 1.25 },
    { min: 5, mul: 1.1 }
  ];

  // 中文词：拼音按字分隔，用于逐字母判定与提示
  var ZH = [
    { t: '山河', py: 'shan he' },
    { t: '明月', py: 'ming yue' },
    { t: '清风', py: 'qing feng' },
    { t: '落叶', py: 'luo ye' },
    { t: '长歌', py: 'chang ge' },
    { t: '孤舟', py: 'gu zhou' },
    { t: '寒江', py: 'han jiang' },
    { t: '星辰', py: 'xing chen' },
    { t: '剑影', py: 'jian ying' },
    { t: '墨客', py: 'mo ke' },
    { t: '江湖', py: 'jiang hu' },
    { t: '烟雨', py: 'yan yu' },
    { t: '松风', py: 'song feng' },
    { t: '竹影', py: 'zhu ying' },
    { t: '归途', py: 'gui tu' },
    { t: '惊鸿', py: 'jing hong' },
    { t: '霜雪', py: 'shuang xue' },
    { t: '流云', py: 'liu yun' },
    { t: '天地', py: 'tian di' },
    { t: '侠客', py: 'xia ke' },
    { t: '灯火', py: 'deng huo' },
    { t: '春山', py: 'chun shan' },
    { t: '塞北', py: 'sai bei' },
    { t: '江南', py: 'jiang nan' },
    { t: '破晓', py: 'po xiao' },
    { t: '千山', py: 'qian shan' },
    { t: '暮色', py: 'mu se' },
    { t: '苍穹', py: 'cang qiong' },
    { t: '听雨', py: 'ting yu' },
    { t: '白雪', py: 'bai xue' },
    // 成语：更长、更考验整词输入
    { t: '一鸣惊人', py: 'yi ming jing ren' },
    { t: '画龙点睛', py: 'hua long dian jing' },
    { t: '守株待兔', py: 'shou zhu dai tu' },
    { t: '亡羊补牢', py: 'wang yang bu lao' },
    { t: '井底之蛙', py: 'jing di zhi wa' },
    { t: '掩耳盗铃', py: 'yan er dao ling' },
    { t: '刻舟求剑', py: 'ke zhou qiu jian' },
    { t: '对牛弹琴', py: 'dui niu tan qin' },
    { t: '拔苗助长', py: 'ba miao zhu zhang' },
    { t: '自相矛盾', py: 'zi xiang mao dun' },
    { t: '滥竽充数', py: 'lan yu chong shu' },
    { t: '狐假虎威', py: 'hu jia hu wei' },
    { t: '塞翁失马', py: 'sai weng shi ma' },
    { t: '愚公移山', py: 'yu gong yi shan' },
    { t: '精卫填海', py: 'jing wei tian hai' },
    { t: '叶公好龙', py: 'ye gong hao long' },
    { t: '杯弓蛇影', py: 'bei gong she ying' },
    { t: '望梅止渴', py: 'wang mei zhi ke' },
    { t: '破釜沉舟', py: 'po fu chen zhou' },
    { t: '卧薪尝胆', py: 'wo xin chang dan' },

    // —— 扩充：双字词语（山河江湖之外的常用意象与日常词） ——
    { t: '烽火', py: 'feng huo' },
    { t: '铁马', py: 'tie ma' },
    { t: '金戈', py: 'jin ge' },
    { t: '战鼓', py: 'zhan gu' },
    { t: '沙场', py: 'sha chang' },
    { t: '关山', py: 'guan shan' },
    { t: '故人', py: 'gu ren' },
    { t: '长亭', py: 'chang ting' },
    { t: '古道', py: 'gu dao' },
    { t: '西风', py: 'xi feng' },
    { t: '归雁', py: 'gui yan' },
    { t: '落霞', py: 'luo xia' },
    { t: '秋水', py: 'qiu shui' },
    { t: '清泉', py: 'qing quan' },
    { t: '幽谷', py: 'you gu' },
    { t: '深林', py: 'shen lin' },
    { t: '远山', py: 'yuan shan' },
    { t: '近水', py: 'jin shui' },
    { t: '春江', py: 'chun jiang' },
    { t: '夜雨', py: 'ye yu' },
    { t: '晓风', py: 'xiao feng' },
    { t: '残月', py: 'can yue' },
    { t: '疏星', py: 'shu xing' },
    { t: '银河', py: 'yin he' },
    { t: '云海', py: 'yun hai' },
    { t: '松涛', py: 'song tao' },
    { t: '竹林', py: 'zhu lin' },
    { t: '梅香', py: 'mei xiang' },
    { t: '书画', py: 'shu hua' },
    { t: '琴音', py: 'qin yin' },
    { t: '棋局', py: 'qi ju' },
    { t: '诗酒', py: 'shi jiu' },
    { t: '茶烟', py: 'cha yan' },
    { t: '灯影', py: 'deng ying' },
    { t: '钟声', py: 'zhong sheng' },
    { t: '鼓角', py: 'gu jiao' },
    { t: '旌旗', py: 'jing qi' },
    { t: '铠甲', py: 'kai jia' },
    { t: '长枪', py: 'chang qiang' },
    { t: '短剑', py: 'duan jian' },
    { t: '弓弦', py: 'gong xian' },
    { t: '羽箭', py: 'yu jian' },
    { t: '城门', py: 'cheng men' },
    { t: '关隘', py: 'guan ai' },
    { t: '驿站', py: 'yi zhan' },
    { t: '侠义', py: 'xia yi' },
    { t: '恩仇', py: 'en chou' },
    { t: '知己', py: 'zhi ji' },
    { t: '故园', py: 'gu yuan' },
    { t: '乡愁', py: 'xiang chou' },
    { t: '归心', py: 'gui xin' },
    { t: '征途', py: 'zheng tu' },
    { t: '远方', py: 'yuan fang' },
    { t: '天涯', py: 'tian ya' },
    { t: '海角', py: 'hai jiao' },
    { t: '浮生', py: 'fu sheng' },
    { t: '流年', py: 'liu nian' },
    { t: '岁月', py: 'sui yue' },
    { t: '光阴', py: 'guang yin' },
    { t: '朝暮', py: 'zhao mu' },
    { t: '黄昏', py: 'huang hun' },
    { t: '黎明', py: 'li ming' },
    { t: '晨曦', py: 'chen xi' },
    { t: '晚霞', py: 'wan xia' },
    { t: '星河', py: 'xing he' },
    { t: '大地', py: 'da di' },
    { t: '长空', py: 'chang kong' },
    { t: '风雨', py: 'feng yu' },
    { t: '雷霆', py: 'lei ting' },
    { t: '霜露', py: 'shuang lu' },
    { t: '冰雪', py: 'bing xue' },
    { t: '寒冬', py: 'han dong' },
    { t: '盛夏', py: 'sheng xia' },
    { t: '金秋', py: 'jin qiu' },
    { t: '早春', py: 'zao chun' },
    { t: '江海', py: 'jiang hai' },
    { t: '湖光', py: 'hu guang' },
    { t: '山色', py: 'shan se' },
    { t: '鸟鸣', py: 'niao ming' },
    { t: '花香', py: 'hua xiang' },
    { t: '月影', py: 'yue ying' },
    { t: '云影', py: 'yun ying' },
    { t: '波光', py: 'bo guang' },
    { t: '帆影', py: 'fan ying' },
    { t: '渔火', py: 'yu huo' },
    { t: '客船', py: 'ke chuan' },
    { t: '石桥', py: 'shi qiao' },
    { t: '小巷', py: 'xiao xiang' },
    { t: '屋檐', py: 'wu yan' },
    { t: '庭院', py: 'ting yuan' },
    { t: '书斋', py: 'shu zhai' },
    { t: '笔墨', py: 'bi mo' },
    { t: '纸砚', py: 'zhi yan' },
    { t: '丹青', py: 'dan qing' },
    { t: '印章', py: 'yin zhang' },
    { t: '卷轴', py: 'juan zhou' },
    { t: '古琴', py: 'gu qin' },
    { t: '长笛', py: 'chang di' },
    { t: '箫声', py: 'xiao sheng' },
    { t: '剑气', py: 'jian qi' },
    { t: '刀光', py: 'dao guang' },
    { t: '侠影', py: 'xia ying' },

    // —— 扩充：四字成语 ——
    { t: '风起云涌', py: 'feng qi yun yong' },
    { t: '水落石出', py: 'shui luo shi chu' },
    { t: '山高水长', py: 'shan gao shui chang' },
    { t: '月明星稀', py: 'yue ming xing xi' },
    { t: '花好月圆', py: 'hua hao yue yuan' },
    { t: '柳暗花明', py: 'liu an hua ming' },
    { t: '峰回路转', py: 'feng hui lu zhuan' },
    { t: '云开见日', py: 'yun kai jian ri' },
    { t: '雨过天晴', py: 'yu guo tian qing' },
    { t: '雪中送炭', py: 'xue zhong song tan' },
    { t: '锦上添花', py: 'jin shang tian hua' },
    { t: '画蛇添足', py: 'hua she tian zu' },
    { t: '守口如瓶', py: 'shou kou ru ping' },
    { t: '一诺千金', py: 'yi nuo qian jin' },
    { t: '一言九鼎', py: 'yi yan jiu ding' },
    { t: '志同道合', py: 'zhi tong dao he' },
    { t: '肝胆相照', py: 'gan dan xiang zhao' },
    { t: '同心协力', py: 'tong xin xie li' },
    { t: '众志成城', py: 'zhong zhi cheng cheng' },
    { t: '坚持不懈', py: 'jian chi bu xie' },
    { t: '持之以恒', py: 'chi zhi yi heng' },
    { t: '循序渐进', py: 'xun xu jian jin' },
    { t: '温故知新', py: 'wen gu zhi xin' },
    { t: '举一反三', py: 'ju yi fan san' },
    { t: '融会贯通', py: 'rong hui guan tong' },
    { t: '学以致用', py: 'xue yi zhi yong' },
    { t: '博览群书', py: 'bo lan qun shu' },
    { t: '笔走龙蛇', py: 'bi zou long she' },
    { t: '妙笔生花', py: 'miao bi sheng hua' },
    { t: '行云流水', py: 'xing yun liu shui' },
    { t: '气吞山河', py: 'qi tun shan he' },
    { t: '叱咤风云', py: 'chi zha feng yun' },
    { t: '运筹帷幄', py: 'yun chou wei wo' },
    { t: '决胜千里', py: 'jue sheng qian li' },
    { t: '按兵不动', py: 'an bing bu dong' },
    { t: '出奇制胜', py: 'chu qi zhi sheng' },
    { t: '势如破竹', py: 'shi ru po zhu' },
    { t: '所向披靡', py: 'suo xiang pi mi' },
    { t: '一鼓作气', py: 'yi gu zuo qi' },
    { t: '再接再厉', py: 'zai jie zai li' },
    { t: '百折不挠', py: 'bai zhe bu nao' },
    { t: '勇往直前', py: 'yong wang zhi qian' },
    { t: '临危不惧', py: 'lin wei bu ju' },
    { t: '处变不惊', py: 'chu bian bu jing' },
    { t: '泰然自若', py: 'tai ran zi ruo' },
    { t: '从容不迫', py: 'cong rong bu po' },
    { t: '心旷神怡', py: 'xin kuang shen yi' },
    { t: '怡然自得', py: 'yi ran zi de' },
    { t: '闲云野鹤', py: 'xian yun ye he' },
    { t: '世外桃源', py: 'shi wai tao yuan' },
    { t: '鸟语花香', py: 'niao yu hua xiang' },
    { t: '山清水秀', py: 'shan qing shui xiu' },
    { t: '湖光山色', py: 'hu guang shan se' },
    { t: '万紫千红', py: 'wan zi qian hong' },
    { t: '春暖花开', py: 'chun nuan hua kai' },
    { t: '秋高气爽', py: 'qiu gao qi shuang' },
    { t: '白雪皑皑', py: 'bai xue ai ai' },
    { t: '银装素裹', py: 'yin zhuang su guo' }
  ];

  /*
   * 关卡字段
   * goal       过关所需斩杀数
   * limit      限时（秒），到时未达成即判负
   * maxAlive   同屏敌人上限
   * slips      同屏词帖数量，越少越难取巧
   * rotateEvery 每隔多少秒翻换一张未动的词帖（0 表示不翻）
   * hp/speed/spawn/breach 怪物基础血量、推进速度、刷新间隔、突破伤害
   */
  var LEVELS = [
    {
      id: 1, name: '基准键位', en: 'HOME ROW', pool: 'home',
      focus: 'A S D F · J K L ;',
      desc: '双手归位，只敲基准键。认准每一根手指该落的地方。',
      tip: '食指管 F 与 J，键帽上的小凸起就是归位标记。',
      goal: 16, hp: 44, speed: 40, spawn: 1.05, breach: 14,
      maxAlive: 6, slips: 3, limit: 70,
      mix: { crow: 0.7, wolf: 0.3, brute: 0 }
    },
    {
      id: 2, name: '上排扩张', en: 'TOP ROW', pool: 'top',
      focus: 'Q W E R T · Y U I O P',
      desc: '手指从基准位上探，敲完立刻回位，不要整只手搬家。',
      tip: '上排由基准键斜向上伸指，肩与腕保持不动。',
      goal: 17, hp: 48, speed: 44, spawn: 0.95, breach: 15,
      maxAlive: 6, slips: 3, limit: 75,
      mix: { crow: 0.6, wolf: 0.4, brute: 0 }
    },
    {
      id: 3, name: '下排落定', en: 'BOTTOM ROW', pool: 'bottom',
      focus: 'Z X C V B · N M , . /',
      desc: '下排距离最短，指尖下压即可，别让手腕塌下去。',
      tip: 'B 键归左手食指，Y 与 N 分属左右手，这是最容易错的两处。',
      goal: 18, hp: 52, speed: 48, spawn: 0.85, breach: 16,
      maxAlive: 7, slips: 3, limit: 80,
      mix: { crow: 0.45, wolf: 0.5, brute: 0.05 }
    },
    {
      id: 4, name: '全键巡游', en: 'FULL BOARD', pool: 'all',
      focus: '26 字母 · 全键位',
      desc: '三排合一。让手指在整块键盘上自由行走。',
      tip: '速度来自准确：先稳住节奏，再慢慢加速。',
      goal: 19, hp: 56, speed: 52, spawn: 0.78, breach: 17,
      maxAlive: 7, slips: 3, limit: 85,
      mix: { crow: 0.35, wolf: 0.5, brute: 0.15 }
    },
    {
      id: 5, name: '数字列阵', en: 'NUMBER ROW', pool: 'numbers',
      focus: '1 2 3 4 5 · 6 7 8 9 0',
      desc: '数字在最上排，伸指幅度最大，记得敲完回位。',
      tip: '数字键用对应的手指上探，不要用食指包办整排。',
      goal: 19, hp: 60, speed: 56, spawn: 0.72, breach: 18,
      maxAlive: 8, slips: 3, limit: 90,
      mix: { crow: 0.35, wolf: 0.5, brute: 0.15 }
    },
    {
      id: 6, name: '符号符箓', en: 'SYMBOLS', pool: 'symbols',
      focus: 'Shift + 符号键',
      desc: '符号需要 Shift 配合。左手符号用右 Shift，右手符号用左 Shift。',
      tip: '按住 Shift 的那只手保持不动，另一只手去敲符号键。',
      goal: 20, hp: 64, speed: 60, spawn: 0.70, breach: 19,
      maxAlive: 8, slips: 3, limit: 90,
      mix: { crow: 0.3, wolf: 0.5, brute: 0.2 }
    },
    {
      id: 7, name: '大写威仪', en: 'CAPITALS', pool: 'caps',
      focus: 'Shift + 大写字母',
      desc: '大写靠对侧 Shift：左手字母用右 Shift，右手字母用左 Shift。',
      tip: '大写仍是一次落墨，不要因为多按 Shift 而停顿。',
      goal: 20, hp: 66, speed: 62, spawn: 0.66, breach: 20,
      maxAlive: 8, slips: 3, limit: 95,
      mix: { crow: 0.3, wolf: 0.45, brute: 0.25 }
    },
    {
      id: 8, name: '标点断句', en: 'PUNCTUATION', pool: 'punct',
      focus: '句读 · 引号 · 括号',
      desc: '标点混在词尾。先看清最后一个符号，再决定是否伸手。',
      tip: '逗号左手中指、句点右手无名指，引号与括号需要 Shift。',
      goal: 21, hp: 70, speed: 64, spawn: 0.64, breach: 21,
      maxAlive: 9, slips: 3, limit: 100, rotateEvery: 16,
      mix: { crow: 0.25, wolf: 0.45, brute: 0.3 }
    },
    {
      id: 9, name: '长词行云', en: 'LONG WORDS', pool: 'long',
      focus: '长单词 · 连续节奏',
      desc: '长词考验的是稳定的连续击键，不要一味图快。',
      tip: '把长词拆成两三个音节块，心里默念节拍。',
      goal: 21, hp: 74, speed: 66, spawn: 0.62, breach: 22,
      maxAlive: 9, slips: 3, limit: 100, rotateEvery: 15,
      mix: { crow: 0.3, wolf: 0.45, brute: 0.25 }
    },
    {
      id: 10, name: '短语连章', en: 'PHRASES', pool: 'phrases',
      focus: '连字符短语 · 全键',
      desc: '短语比单词更长，先看清整句再落指。',
      tip: '连字符用右手小指，敲完立刻回基准位。',
      goal: 22, hp: 78, speed: 68, spawn: 0.60, breach: 23,
      maxAlive: 9, slips: 3, limit: 105, rotateEvery: 14,
      mix: { crow: 0.25, wolf: 0.45, brute: 0.3 }
    },
    {
      id: 11, name: '中州词话', en: 'PINYIN', pool: 'zh',
      focus: '拼音输入 · 汉字词语',
      desc: '用拼音输入法打出汉字。逐字母落墨，整词上屏后可释放重击。',
      tip: '例：山河 → shanhe，逐字母判定攻击；选字上屏后按 Enter 重击。',
      goal: 22, hp: 82, speed: 46, spawn: 1.15, breach: 24,
      maxAlive: 8, slips: 3, limit: 120,
      mix: { crow: 0.3, wolf: 0.45, brute: 0.25 }
    },
    {
      id: 12, name: '成语连章', en: 'IDIOMS', pool: 'idioms',
      focus: '四字成语 · 整词上屏',
      desc: '词库只留四字成语，每词都是长拼音与四字选字。',
      tip: '先默念整句拼音再落指；速字模式下整词上屏即自动重击。',
      goal: 24, hp: 84, speed: 54, spawn: 2.6, breach: 22,
      maxAlive: 7, slips: 3, limit: 120, rotateEvery: 14,
      mix: { crow: 0.25, wolf: 0.45, brute: 0.3 }
    },
    {
      id: 13, name: '混战无涯', en: 'MIXED', pool: 'mixed',
      focus: '全词库混合 · 双词帖',
      desc: '英文、数字、符号与中文一同来袭。同屏只留两张词帖，没有挑选余地。',
      tip: '把长词留给重击，短词用来抢节奏。',
      goal: 24, hp: 92, speed: 72, spawn: 0.66, breach: 27,
      maxAlive: 10, slips: 2, limit: 110, rotateEvery: 12,
      mix: { crow: 0.25, wolf: 0.45, brute: 0.3 }
    },
    {
      id: 14, name: '十指归一', en: 'FINAL', pool: 'final',
      focus: '长词 · 短语 · 中文成语',
      desc: '终局只留长内容：长词、短语、符号与四字成语，没有短词可躲。',
      tip: '节奏、准确、切换词帖三者缺一不可。',
      goal: 26, hp: 92, speed: 70, spawn: 0.85, breach: 28,
      maxAlive: 11, slips: 2, limit: 140, rotateEvery: 11,
      mix: { crow: 0.2, wolf: 0.45, brute: 0.35 }
    },
    {
      id: 15, name: '镇关·名言', en: 'BOSS · QUOTES', pool: 'final', boss: 'quote',
      focus: '整句输入 · 名言',
      desc: '守关之将现身，持续放出墨弹并缓缓逼近。每打完一个字便落一矢拦截来弹；整句完成放出终结技。',
      tip: '标点必须输入：，→ , 。→ . ；→ ; ：→ : ！→ ! ？→ ?。每 4 轮攻击本源逼近一阶，终结技可击退本源。',
      goal: 1, hp: 900, speed: 0, spawn: 99, breach: 100,
      maxAlive: 1, slips: 1, limit: 95
    },
    {
      id: 16, name: '文心·终章', en: 'BOSS · CLASSICS', pool: 'final', boss: 'classic',
      focus: '整句输入 · 古文名篇',
      desc: '终章之敌不惧墨矢，只惧一口气读完的长句。墨弹更密、本源推进更快。',
      tip: '一字一击；标点按对应键位实际输入，打错计失误。整句终结技是击退本源与破敌的主要手段。',
      goal: 1, hp: 1600, speed: 0, spawn: 99, breach: 100,
      maxAlive: 1, slips: 1, limit: 150
    },
    {
      id: 17, name: '长文·初章', en: 'LONG TEXT · I', pool: 'longtext', long: true, longBand: [1, 2],
      focus: '城楼两侧长文 · 句读重击',
      desc: '词帖散去，长文铺上城楼两侧。汉语以词为单位自动重击，句号处落下超级重击。',
      tip: '汉字无需空格；每两字一词自动重击，整句打完自动超级重击，无需按输出键。',
      goal: 14, hp: 72, speed: 44, spawn: 1.15, breach: 20,
      maxAlive: 7, slips: 0, limit: 120
    },
    {
      id: 18, name: '长文·中章', en: 'LONG TEXT · II', pool: 'longtext', long: true, longBand: [2, 3],
      focus: '长文连读 · 分批换卷',
      desc: '篇目更长，分批显示；输完当前批次最后一句，自动换下一页。',
      tip: '保持稳定节奏，不要在句末减速；每句结束的超级重击会自动扫向全场。',
      goal: 18, hp: 82, speed: 52, spawn: 1.02, breach: 22,
      maxAlive: 8, slips: 0, limit: 150
    },
    {
      id: 19, name: '长文·终章', en: 'LONG TEXT · III', pool: 'longtext', long: true, longBand: [4, 5],
      focus: '长篇古文 · 高阶断句',
      desc: '只取长句名篇与英文原文；标点只断句不输入，词、句各自成击。',
      tip: '英文每个单词一次重击；中文每词一次重击并在句号处追加超级重击。',
      goal: 22, hp: 92, speed: 60, spawn: 0.88, breach: 24,
      maxAlive: 9, slips: 0, limit: 180
    },
    {
      id: 20, name: '整篇·短章', en: 'ESSAY · I', pool: 'essay', long: true, article: true, longBand: [1, 2],
      focus: '左下右下整篇 · 整块翻页',
      desc: '整篇文章铺在城楼两侧的左下与右下，视线只在一块文本里连续移动；本页打完整块翻页。',
      tip: '沿用长文规则：词末自动重击、句末超级重击、标点不输入；本页最后一个字母打完自动翻页。',
      goal: 16, hp: 74, speed: 46, spawn: 1.12, breach: 20,
      maxAlive: 7, slips: 0, limit: 150
    },
    {
      id: 21, name: '整篇·中篇', en: 'ESSAY · II', pool: 'essay', long: true, article: true, longBand: [3, 3],
      focus: '中篇整读 · 整块翻页',
      desc: '三百至四百余字的完整名篇，按块铺满两屏后整块翻页，不再逐句跳动。',
      tip: '目光跟着当前词走；已打过的字会淡化，不必回头确认。',
      goal: 20, hp: 84, speed: 54, spawn: 1.0, breach: 22,
      maxAlive: 8, slips: 0, limit: 180
    },
    {
      id: 22, name: '整篇·长卷', en: 'ESSAY · III', pool: 'essay', long: true, article: true, longBand: [4, 5],
      focus: '长卷整读 · 整块翻页',
      desc: '五百至八百字的整篇长文，连续输入两到三页；字更小，版面更满，但仍在两座城楼之间。',
      tip: '保持匀速，不要在页末停顿；超级重击会自动清扫全场。',
      goal: 24, hp: 94, speed: 62, spawn: 0.88, breach: 24,
      maxAlive: 9, slips: 0, limit: 210
    }
  ];

  /* Boss 整句：公版先秦诸子、史传、唐诗宋词与古文名篇（标注出处与难度） */
  var BOSS_SENTENCES = {
    quote: [
      { t: '天行健，君子以自强不息。', py: 'tian xing jian jun zi yi zi qiang bu xi', src: '《周易》', lv: 1 },
      { t: '千里之行，始于足下。', py: 'qian li zhi xing shi yu zu xia', src: '《道德经》', lv: 1 },
      { t: '知人者智，自知者明。', py: 'zhi ren zhe zhi zi zhi zhe ming', src: '《道德经》', lv: 1 },
      { t: '三人行，必有我师焉。', py: 'san ren xing bi you wo shi yan', src: '《论语》', lv: 1 },
      { t: '学而不思则罔，思而不学则殆。', py: 'xue er bu si ze wang si er bu xue ze dai', src: '《论语》', lv: 2 },
      { t: '生于忧患，死于安乐。', py: 'sheng yu you huan si yu an le', src: '《孟子》', lv: 2 },
      { t: '得道多助，失道寡助。', py: 'de dao duo zhu shi dao gua zhu', src: '《孟子》', lv: 2 },
      { t: '会当凌绝顶，一览众山小。', py: 'hui dang ling jue ding yi lan zhong shan xiao', src: '杜甫《望岳》', lv: 2 },
      { t: '长风破浪会有时，直挂云帆济沧海。', py: 'chang feng po lang hui you shi zhi gua yun fan ji cang hai', src: '李白《行路难》', lv: 3 },
      { t: '海内存知己，天涯若比邻。', py: 'hai nei cun zhi ji tian ya ruo bi lin', src: '王勃《送杜少府之任蜀州》', lv: 3 }
    ],
    classic: [
      { t: '吾生也有涯，而知也无涯。', py: 'wu sheng ye you ya er zhi ye wu ya', src: '《庄子》', lv: 3 },
      { t: '先天下之忧而忧，后天下之乐而乐。', py: 'xian tian xia zhi you er you hou tian xia zhi le er le', src: '范仲淹《岳阳楼记》', lv: 4 },
      { t: '落霞与孤鹜齐飞，秋水共长天一色。', py: 'luo xia yu gu wu qi fei qiu shui gong chang tian yi se', src: '王勃《滕王阁序》', lv: 4 },
      { t: '路漫漫其修远兮，吾将上下而求索。', py: 'lu man man qi xiu yuan xi wu jiang shang xia er qiu suo', src: '屈原《离骚》', lv: 4 },
      { t: '大江东去，浪淘尽，千古风流人物。', py: 'da jiang dong qu lang tao jin qian gu feng liu ren wu', src: '苏轼《念奴娇》', lv: 4 },
      { t: '山重水复疑无路，柳暗花明又一村。', py: 'shan chong shui fu yi wu lu liu an hua ming you yi cun', src: '陆游《游山西村》', lv: 4 },
      { t: '人生自古谁无死，留取丹心照汗青。', py: 'ren sheng zi gu shui wu si liu qu dan xin zhao han qing', src: '文天祥《过零丁洋》', lv: 5 },
      { t: '业精于勤，荒于嬉；行成于思，毁于随。', py: 'ye jing yu qin huang yu xi xing cheng yu si hui yu sui', src: '韩愈《进学解》', lv: 5 },
      { t: '老吾老，以及人之老；幼吾幼，以及人之幼。', py: 'lao wu lao yi ji ren zhi lao you wu you yi ji ren zhi you', src: '《孟子》', lv: 5 },
      { t: '不积跬步，无以至千里；不积小流，无以成江海。', py: 'bu ji kui bu wu yi zhi qian li bu ji xiao liu wu yi cheng jiang hai', src: '《荀子》', lv: 5 }
    ]
  };

  // 连击档位：只影响视听强度，不影响伤害
  var TIERS = [
    { min: 0, name: '一重', seal: '一', color: '#2b2620', droplets: 5, shake: 2.0, pitch: 1.0 },
    { min: 10, name: '二重', seal: '二', color: '#4a4034', droplets: 8, shake: 3.0, pitch: 1.05 },
    { min: 25, name: '三重', seal: '三', color: '#8c2f24', droplets: 12, shake: 4.2, pitch: 1.1 },
    { min: 50, name: '四重', seal: '四', color: '#a8362b', droplets: 16, shake: 5.4, pitch: 1.16 },
    { min: 80, name: '五重', seal: '五', color: '#c07a22', droplets: 22, shake: 6.6, pitch: 1.22 }
  ];

  // 指法分工（教学页）
  var FINGERS = [
    {
      id: 'l-pinky', hand: '左', name: '小指', color: '#9c3a2e',
      keys: ['`', '1', 'q', 'a', 'z'],
      extra: '左 Shift · Tab · Caps',
      desc: '力量最弱，负责最外侧一列与修饰键。'
    },
    {
      id: 'l-ring', hand: '左', name: '无名指', color: '#a8842c',
      keys: ['2', 'w', 's', 'x'],
      extra: '',
      desc: '跟随小指，敲击 W S X 一列。'
    },
    {
      id: 'l-middle', hand: '左', name: '中指', color: '#4f6b52',
      keys: ['3', 'e', 'd', 'c'],
      extra: '',
      desc: '支撑手型，负责 E D C 一列。'
    },
    {
      id: 'l-index', hand: '左', name: '食指', color: '#2f4257',
      keys: ['4', '5', 'r', 't', 'f', 'g', 'v', 'b'],
      extra: 'F 键有归位凸起',
      desc: '最灵活的手指，兼顾两列。'
    },
    {
      id: 'r-index', hand: '右', name: '食指', color: '#2f4257',
      keys: ['6', '7', 'y', 'u', 'h', 'j', 'n', 'm'],
      extra: 'J 键有归位凸起',
      desc: '与左手食指对称，兼顾两列。'
    },
    {
      id: 'r-middle', hand: '右', name: '中指', color: '#4f6b52',
      keys: ['8', 'i', 'k', ','],
      extra: '',
      desc: '负责 I K 与逗号一列。'
    },
    {
      id: 'r-ring', hand: '右', name: '无名指', color: '#a8842c',
      keys: ['9', 'o', 'l', '.'],
      extra: '',
      desc: '负责 O L 与句点一列。'
    },
    {
      id: 'r-pinky', hand: '右', name: '小指', color: '#9c3a2e',
      keys: ['0', '-', '=', 'p', '[', ']', ';', "'", '/', '\\'],
      extra: '右 Shift · Enter · Backspace',
      desc: '负担最重，需要单独练习。'
    },
    {
      id: 'thumb', hand: '双', name: '拇指', color: '#6b5545',
      keys: ['space'],
      extra: '空格键',
      desc: '两拇指轻放空格，由惯用手敲击。'
    }
  ];

  // 键盘布局（教学示意图）
  var KEYBOARD_ROWS = [
    { offset: 0.0, keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='] },
    { offset: 0.5, keys: ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']'] },
    { offset: 0.85, keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'"] },
    { offset: 1.25, keys: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'] },
    { offset: 2.1, keys: ['space'] }
  ];

  window.GAME_DATA = {
    ATK: 12,
    PLAYER_HP: 100,
    TERRITORY_LINE: 0.8,
    POOLS: POOLS,
    ZH: ZH,
    EN_MEANINGS: EN_MEANINGS,
    LENGTH_BONUS: LENGTH_BONUS,
    LEVELS: LEVELS,
    BOSS_SENTENCES: BOSS_SENTENCES,
    TIERS: TIERS,
    FINGERS: FINGERS,
    KEYBOARD_ROWS: KEYBOARD_ROWS
  };
})();
