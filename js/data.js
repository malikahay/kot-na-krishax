/* Кот на крышах — справочные данные: друзья, умения, скины, миры. */
(function(K){
'use strict';

/* Друзья: на каждом уровне спасаешь одного и получаешь его умение. */
K.FRIENDS=[
  {id:'crow',name:'Ворона Кара',abil:'double',abilName:'Двойной прыжок',icon:'⤒',
   how:'Нажмите прыжок ещё раз в воздухе.',
   line:'Кар! Спасибо, котик! Держись за мои перья — теперь ты прыгнешь дважды.',
   home:'Я видела блестяшку высоко над первой крышей. Без двойного прыжка туда не достать!'},
  {id:'owl',name:'Сова Ухти',abil:'glide',abilName:'Планирование',icon:'🪶',
   how:'Удерживайте прыжок, когда падаете. В восходящем ветре можно подняться вверх.',
   line:'Ух-ух! Расправь лапы, как крылья, и плыви по ночному воздуху.',
   home:'Тёплый ветер над трубами поднимает того, кто умеет парить.'},
  {id:'squirrel',name:'Белка Шустрик',abil:'dash',abilName:'Перекат',icon:'»',
   how:'Shift или J — рывок вперёд. Сбивает даже тени в броне. В воздухе — один раз.',
   line:'Вжух! Катись быстрее ветра, бронированные тени этого не любят!',
   home:'С перекатом можно перелететь туда, куда обычным прыжком не допрыгнуть.'},
  {id:'raccoon',name:'Енот Бублик',abil:'paw',abilName:'Удар лапой',icon:'✊',
   how:'X или K — удар лапой. Ломает треснувшие стены, броню и тёмные шары.',
   line:'Хрясь! Треснувшие стены — это не стены, а приглашение.',
   home:'Я слышал, что в старых трещинах прячутся золотые рыбки.'},
  {id:'lizard',name:'Ящерка Зига',abil:'wall',abilName:'Прыжок от стен',icon:'⇅',
   how:'Прыгните, касаясь стены, чтобы оттолкнуться. Прижмитесь к стене, чтобы скользить медленнее.',
   line:'Стены — это просто пол, который стоит боком!',
   home:'Узкие колодцы между домами больше тебя не остановят.'},
  {id:'firefly',name:'Светлячок Люми',abil:'light',abilName:'Свет светлячка',icon:'✦',
   how:'Призрачные мостки теперь видны и держат вас. Даже на старых уровнях!',
   line:'Я освещу тебе дорогу. Некоторые мостики видны только в моём свете.',
   home:'Загляни на старые крыши — там полно мостков, которых ты раньше не видел.'},
  {id:'mouse',name:'Мышка Пип',abil:'magnet',abilName:'Звёздный магнит',icon:'◎',
   how:'Звёзды и рыбки рядом сами летят к вам, даже сквозь стены.',
   line:'Пи-пи! Звёздочки сами к тебе прибегут, я договорилась.',
   home:'Говорят, одну рыбку замуровали в кирпич. Но магниту стены не помеха.'},
  {id:'hedgehog',name:'Ёж Колючка',abil:'shield',abilName:'Колючий щит',icon:'✷',
   how:'Щит спасает от одного удара. Заряжается у каждого фонаря.',
   line:'Фыр! Мои иголки — твоя броня. Один удар я возьму на себя.',
   home:'Щит перезаряжается у фонарей. Не жалей его!'},
  {id:'kitten',name:'Котёнок Пушок',abil:'heart',abilName:'Четвёртое сердце',icon:'♥',
   how:'Теперь вы начинаете каждый уровень с четырьмя сердцами.',
   line:'Братик! Ты пришёл за мной! Пойдём домой… но сначала — Король Теней.',
   home:'Мы все вместе! Теперь ничего не страшно.'}
];
K.FRIEND=Object.fromEntries(K.FRIENDS.map(f=>[f.id,f]));
K.ABIL_FRIEND=Object.fromEntries(K.FRIENDS.map(f=>[f.abil,f]));

/* Скины. price — в звёздах; unlock — особое условие вместо цены. */
K.SKINS={
  color:[
    {id:'ginger',name:'Рыжик',price:0,body:0xf2873a,dark:0xb55a1e,eye:0xffd85a},
    {id:'black',name:'Уголёк',price:150,body:0x2b2638,dark:0x17131f,eye:0x9dff6a},
    {id:'white',name:'Снежок',price:150,body:0xf3efe9,dark:0xc9c2d6,eye:0x6ac8ff},
    {id:'grey',name:'Дымок',price:220,body:0x8d8ca0,dark:0x5d5b70,eye:0xffd85a},
    {id:'siam',name:'Сиамский',price:320,body:0xefe1c6,dark:0x5a3b2a,eye:0x5ab0ff},
    {id:'tiger',name:'Тигрёнок',price:420,body:0xf5a623,dark:0x3a1f0a,eye:0x9dff6a},
    {id:'calico',name:'Трёхцветка',price:520,body:0xf7f1e6,dark:0xe07a2f,eye:0xffd85a},
    {id:'mint',name:'Мятный',price:700,body:0x7fe0c4,dark:0x3c9c84,eye:0xffffff,glow:.15},
    {id:'neon',name:'Неон',price:1200,body:0xff4fd8,dark:0x7a2cff,eye:0xffffff,glow:.45},
    {id:'gold',name:'Золотой',unlock:'fish',body:0xffcf4a,dark:0xc58a12,eye:0xffffff,metal:.8,glow:.2},
    {id:'shadow',name:'Тень',unlock:'king',body:0x1a1430,dark:0x0b071f,eye:0xff5d8f,glow:.1}
  ],
  hat:[
    {id:'none',name:'Без шапки',price:0},
    {id:'bandana',name:'Бандана',price:200},
    {id:'ushanka',name:'Ушанка',price:260},
    {id:'flower',name:'Цветочек',price:300},
    {id:'party',name:'Колпак',price:350},
    {id:'tophat',name:'Цилиндр',price:450},
    {id:'headphones',name:'Наушники',price:550},
    {id:'halo',name:'Нимб',price:900},
    {id:'crown',name:'Корона',unlock:'king'}
  ],
  tail:[
    {id:'normal',name:'Обычный',price:0},
    {id:'fluffy',name:'Пушистый',price:200},
    {id:'bow',name:'С бантиком',price:300},
    {id:'double',name:'Двойной',price:480},
    {id:'glow',name:'Светящийся',price:650},
    {id:'bolt',name:'Молния',price:850}
  ]
};
K.UNLOCK_TEXT={fish:'Найдите все золотые рыбки',king:'Победите Короля Теней'};

/* Миры и их оформление. */
K.WORLDS=[
  {name:'Старые крыши',sub:'Черепица, антенны и первый ветер',
   theme:{sky:['#08061a','#1a1340','#3b2868'],fog:0x241a4e,brick:0x43358a,brickLine:'#271e58',roof:0x8f80e0,far:[0x1b1544,0x241c55],near:[0x2a2162,0x3a2f7a],win:[255,200,110],moon:0xfff3c4,hemi:0x8c7dff,music:'w1'}},
  {name:'Фабричные трубы',sub:'Пар, движущиеся платформы и броня',
   theme:{sky:['#03100f','#0d2a2c','#1f4a48'],fog:0x123432,brick:0x2d5a5a,brickLine:'#173838',roof:0x6fd6c0,far:[0x0f2a2a,0x163838],near:[0x1d4444,0x2a5a58],win:[140,255,210],moon:0xd7fff4,hemi:0x6fe0d0,music:'w2'}},
  {name:'Небоскрёбы у луны',sub:'Призрачные мостки и логово Короля',
   theme:{sky:['#0a0420','#2a0f45','#6a2a6e'],fog:0x3a1848,brick:0x4a2f70,brickLine:'#2a1745',roof:0xff8fc8,far:[0x221040,0x2e1652],near:[0x3a1d5e,0x4f2a78],win:[255,150,220],moon:0xffe6f4,hemi:0xff9de0,music:'w3'}}
];
K.HUB_THEME={sky:['#0a0820','#1c1546','#43306e'],fog:0x2a1f55,brick:0x4a3a8f,brickLine:'#2a2060',roof:0xa595f0,far:[0x1b1544,0x241c55],near:[0x2a2162,0x3a2f7a],win:[255,205,120],moon:0xfff3c4,hemi:0x9c8dff,music:'hub'};
})(window.KOT=window.KOT||{});
