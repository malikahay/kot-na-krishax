/* Кот на крышах — справочные данные: друзья, умения, скины, миры. */
(function(K){
'use strict';

/* Друзья: на каждом уровне спасаешь одного и получаешь его умение. */
K.FRIENDS=[
  {id:'crow',emoji:'🐦‍⬛',name:'Ворона Кара',abil:'double',abilName:'Двойной прыжок',icon:'⤒',
   how:'Нажмите прыжок ещё раз в воздухе.',
   line:'Кар! Спасибо, котик! Держись за мои перья — теперь ты прыгнешь дважды.',
   home:'Я видела блестяшку высоко над первой крышей. Без двойного прыжка туда не достать!'},
  {id:'owl',emoji:'🦉',name:'Сова Ухти',abil:'glide',abilName:'Планирование',icon:'🪶',
   how:'Удерживайте прыжок, когда падаете. В восходящем ветре можно подняться вверх.',
   line:'Ух-ух! Расправь лапы, как крылья, и плыви по ночному воздуху.',
   home:'Тёплый ветер над трубами поднимает того, кто умеет парить.'},
  {id:'squirrel',emoji:'🐿️',name:'Белка Шустрик',abil:'dash',abilName:'Перекат',icon:'»',
   how:'Shift или J — рывок вперёд. Сбивает даже тени в броне. В воздухе — один раз.',
   line:'Вжух! Катись быстрее ветра, бронированные тени этого не любят!',
   home:'С перекатом можно перелететь туда, куда обычным прыжком не допрыгнуть.'},
  {id:'raccoon',emoji:'🦝',name:'Енот Бублик',abil:'paw',abilName:'Удар лапой',icon:'✊',
   how:'X или K — удар лапой. Ломает треснувшие стены, броню и тёмные шары.',
   line:'Хрясь! Треснувшие стены — это не стены, а приглашение.',
   home:'Я слышал, что в старых трещинах прячутся золотые рыбки.'},
  {id:'lizard',emoji:'🦎',name:'Ящерка Зига',abil:'wall',abilName:'Прыжок от стен',icon:'⇅',
   how:'Прыгните, касаясь стены, чтобы оттолкнуться. Прижмитесь к стене, чтобы скользить медленнее.',
   line:'Стены — это просто пол, который стоит боком!',
   home:'Узкие колодцы между домами больше тебя не остановят.'},
  {id:'firefly',emoji:'✨',name:'Светлячок Люми',abil:'light',abilName:'Свет светлячка',icon:'✦',
   how:'Призрачные мостки теперь видны и держат вас. Даже на старых уровнях!',
   line:'Я освещу тебе дорогу. Некоторые мостики видны только в моём свете.',
   home:'Загляни на старые крыши — там полно мостков, которых ты раньше не видел.'},
  {id:'mouse',emoji:'🐭',name:'Мышка Пип',abil:'magnet',abilName:'Звёздный магнит',icon:'◎',
   how:'Звёзды и рыбки рядом сами летят к вам, даже сквозь стены.',
   line:'Пи-пи! Звёздочки сами к тебе прибегут, я договорилась.',
   home:'Говорят, одну рыбку замуровали в кирпич. Но магниту стены не помеха.'},
  {id:'hedgehog',emoji:'🦔',name:'Ёж Колючка',abil:'shield',abilName:'Колючий щит',icon:'✷',
   how:'Щит спасает от одного удара. Заряжается у каждого фонаря.',
   line:'Фыр! Мои иголки — твоя броня. Один удар я возьму на себя.',
   home:'Щит перезаряжается у фонарей. Не жалей его!'},
  {id:'kitten',emoji:'🐱',name:'Котёнок Пушок',abil:'heart',abilName:'Четвёртое сердце',icon:'♥',
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
  {name:'Берлога Короля Теней',sub:'Пещеры под городом: тьма, сталактиты, слизь и огонь теней',
   theme:{cave:true,sky:['#020107','#0a0418','#1a0a2a'],fog:0x0c0618,brick:0x3a3048,brickLine:'#1a1424',roof:0x2f8a74,far:[0x120a20,0x1a1030],near:[0x1e1430,0x2a1c40],win:[120,255,200],moon:0x5ad1a8,hemi:0x6a4aff,music:'lair'}}
];

/* Вещи для спасения: прячутся на уровне, без них клетку не открыть. */
K.ITEMS={
  key:{name:'Ключ',icon:'🔑',color:0xffd34a,desc:'открывает замок клетки'},
  rope:{name:'Верёвка',icon:'🪢',color:0xd8a060,desc:'спускает подвешенную клетку'},
  cutter:{name:'Кусачки',icon:'✂️',color:0xc8d0ff,desc:'перекусывают цепи'},
  kit:{name:'Набор ловушек',icon:'🧰',color:0x7ff7c8,desc:'ещё одна ловушка'}
};
/* Ловушки: на каждом уровне новая и сильнее. stun — сколько кадров пёс стоит, back — на сколько кадров следа его отбрасывает. */
K.TRAPS=[
  {name:'Клубок ниток',icon:'🧶',stun:90,back:0,charges:2,desc:'Пёс запутывается на полторы секунды'},
  {name:'Банановая кожура',icon:'🍌',stun:110,back:40,charges:2,desc:'Пёс поскальзывается и откатывается назад'},
  {name:'Мышеловка',icon:'🪤',stun:150,back:0,charges:3,desc:'Щёлк! Две с половиной секунды покоя'},
  {name:'Липкий мёд',icon:'🍯',stun:200,back:0,charges:3,desc:'Пёс прилипает на три секунды'},
  {name:'Сеть',icon:'🕸️',stun:220,back:50,charges:3,desc:'Ловит пса и тащит назад'},
  {name:'Капкан',icon:'⚙️',stun:260,back:0,charges:3,desc:'Держит пса больше четырёх секунд'},
  {name:'Петарда',icon:'🧨',stun:150,back:220,charges:3,desc:'Бабах! Пса отбрасывает далеко назад'},
  {name:'Ледяная ловушка',icon:'🧊',stun:320,back:60,charges:4,desc:'Замораживает пса на пять секунд'},
  {name:'Звёздная клетка',icon:'⭐',stun:420,back:140,charges:4,desc:'Запирает пса в клетке из звёзд'}
];
/* Преследователи: с каждым уровнем быстрее, в каждом мире новый облик. */
K.CHASERS=[
  {name:'Тень-пёс',color:0x0b071f,eye:0xff3a6a,glow:0x3a0f60,heads:1,armor:false},
  {name:'Железный пёс',color:0x3a3a4a,eye:0xffa23a,glow:0x5a2a10,heads:1,armor:true},
  {name:'Цербер Короля',color:0x14081f,eye:0xd88aff,glow:0x6a1aa0,heads:3,armor:false}
];
/* Сюжетные сцены */
K.STORY={
  intro:[
    {scene:{bg:'night',actors:[{k:'cat',x:0,ry:-.9},{k:'friend',id:'crow',x:-1.4,ry:-.4},{k:'friend',id:'owl',x:1.4,ry:-1.2},{k:'friend',id:'squirrel',x:-2.7,ry:-.3},{k:'friend',id:'raccoon',x:2.8,ry:-1.3},{k:'friend',id:'kitten',x:.8,z:.8,ry:-1}]},text:'Обычная ночь. Кот и его друзья сидят на крыше и считают звёзды.'},
    {scene:{bg:'storm',actors:[{k:'king',x:0,y:.6,s:1.1,glow:0x8a2cff},{k:'cage',id:'crow',x:-2.8,s:.9},{k:'cage',id:'owl',x:2.8,s:.9},{k:'cage',id:'kitten',x:-4.8,s:.7,z:-1}]},text:'Вдруг налетает Король Теней! Он хватает друзей, запирает их в клетки и разбрасывает по городу. Ключи от клеток он прячет на крышах.'},
    {scene:{bg:'night',actors:[{k:'kennel',id:0,x:-3.2,ry:.5},{k:'dog',id:0,x:-1,ry:0,s:1.1,glow:0xff3a6a},{k:'cat',x:2.4,ry:0}]},text:'А по следу кота Король пускает своего Тень-пса. Пёс не отстанет ни на шаг.'},
    {scene:{bg:'night',actors:[{k:'cat',x:-.6,ry:-.7},{k:'item',id:'key',x:1.2,y:1.4,s:1.4},{k:'item',id:'rope',x:2.4,y:1.1,s:1.4},{k:'item',id:'cutter',x:3.5,y:1.5,s:1.4},{k:'trap',id:0,x:-2.2,s:1.3}]},text:'Ищи ключи, верёвки и кусачки, ставь псу ловушки и спасай друзей. Путь ведёт к берлоге Короля.'}
  ],
  world2:[
    {scene:{bg:'factory',actors:[{k:'general',x:-1.2,s:.95},{k:'cat',x:2,ry:-2.4},{k:'friend',id:'squirrel',x:3,ry:-2.4}]},text:'Генерал теней разбит, но клетки увезли дальше, к фабричным трубам.'},
    {scene:{bg:'factory',actors:[{k:'dog',id:1,x:-.6,s:1.3,ry:-.3,glow:0xffa23a},{k:'cat',x:2.6,ry:0}]},text:'Король заковал пса в железо. Теперь он быстрее и умеет делать рывки.'}
  ],
  world3:[
    {scene:{bg:'cave',actors:[{k:'cat',x:-.5,ry:-.6},{k:'friend',id:'firefly',x:.6,y:.8},{k:'enemy',id:'bat',x:2.6,y:2.2},{k:'enemy',id:'bat',x:-2.8,y:2.6}]},text:'Под городом открывается вход в берлогу Короля Теней. Здесь нет луны, только тьма, слизь и огонь теней.'},
    {scene:{bg:'cave',actors:[{k:'dog',id:2,x:-.8,s:1.5,ry:-.3,glow:0xd88aff},{k:'cat',x:2.6,ry:0}]},text:'У входа просыпается Цербер Короля о трёх головах. Последние друзья совсем рядом.'}
  ]
};
K.HUB_THEME={sky:['#0a0820','#1c1546','#43306e'],fog:0x2a1f55,brick:0x4a3a8f,brickLine:'#2a2060',roof:0xa595f0,far:[0x1b1544,0x241c55],near:[0x2a2162,0x3a2f7a],win:[255,205,120],moon:0xfff3c4,hemi:0x9c8dff,music:'hub'};
})(window.KOT=window.KOT||{});
