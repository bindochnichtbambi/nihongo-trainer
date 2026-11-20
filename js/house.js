// Haus & Wohnen: drei Bilder zum Antippen (von aussen, Grundriss, im Zimmer), Wohnformen, Stockwerke, Grundrisse
// Alles selbst gezeichnet und selbst geschrieben.
// Farben über CSS-Klassen: h-a navy, h-b rot, h-c weiss, h-d rosé, h-e hellblau, hs = Umriss
// Eintrag: { k: kana, j: kanji, de, box: [x, y, b, h] oder [[…], […]], note?, ex?: [kana, kanji, deutsch], lab?: Name im Bild, col?: Name links (Stockwerke) }
(function () {
  const rng = (x0, x1, step, f) => { let s = ""; for (let x = x0; x <= x1; x += step) s += f(x); return s; };
  const floorWin = top => `<rect class="h-e hs" x="70" y="${top + 14}" width="30" height="28"/><rect class="h-e hs" x="110" y="${top + 14}" width="30" height="28"/>
    <path class="hs thin" d="M85 ${top + 14}v28M125 ${top + 14}v28"/>`;
  const balcony = top => `<rect class="h-d hs" x="66" y="${top + 46}" width="80" height="22"/><path class="hs thin" d="${rng(76, 140, 10, x => `M${x} ${top + 46}v22`)}"/>`;
  const liftDoor = top => `<rect class="h-a" x="162" y="${top + 30}" width="20" height="40"/><path class="hc" d="M172 ${top + 30}v40"/>`;

  const OUT = {
    vb: [372, 400],
    art: `
      <circle class="h-d" cx="336" cy="52" r="20"/>
      <rect class="h-e" x="0" y="332" width="372" height="68"/><rect class="h-a" x="0" y="330" width="372" height="3"/>
      <rect class="h-c hs" x="60" y="336" width="136" height="54"/>
      <use href="#c-car" x="68" y="338" width="54" height="50"/>
      <rect class="h-c hs" x="60" y="120" width="136" height="210"/>
      <path class="hs" d="M60 190H156M60 260H156"/>
      ${floorWin(120)}${floorWin(190)}
      <rect class="h-e hs" x="70" y="276" width="30" height="28"/><path class="hs thin" d="M85 276v28"/>
      <rect class="h-e hs" x="110" y="286" width="30" height="44"/><path class="hs thin" d="M125 286v44"/>
      ${balcony(120)}${balcony(190)}
      <rect class="h-e hs" x="156" y="120" width="32" height="210"/>
      ${liftDoor(120)}${liftDoor(190)}${liftDoor(260)}
      <rect class="h-a" x="56" y="114" width="144" height="6"/>
      <path class="hs" d="M60 100H196${rng(60, 196, 17, x => `M${x} 100v14`)}"/>
      <path class="hs" stroke-width="3" d="M198 330L222 295L198 260L222 225L198 190L222 155L198 120"/><path class="hs thin" d="M222 120V330"/>
      <rect class="h-d hs" x="242" y="252" width="92" height="78"/>
      <path class="h-b" d="M232 255L288 208L344 255Z"/>
      <rect class="h-c hs" x="254" y="268" width="30" height="26"/><path class="hs thin" d="M269 268v26M254 281h30"/>
      <rect class="h-a" x="304" y="288" width="22" height="42"/><circle class="h-c" cx="321" cy="310" r="2"/>
      <use href="#s-tree" x="330" y="266" width="44" height="66"/>`,
    items: [
      { k: "ちか いっかい", j: "地下1階", de: "1. Untergeschoss", box: [60, 336, 136, 54], col: 363, note: "ちか = unter der Erde. Hier ist oft die Tiefgarage.", ex: ["ちかに ちゅうしゃじょうが あります。", "地下に駐車場があります。", "Im Untergeschoss ist ein Parkplatz."] },
      { k: "いっかい", j: "1階", de: "Erdgeschoss (!)", box: [60, 260, 96, 70], col: 295, note: "In Japan ist das Erdgeschoss schon der 1. Stock: いっかい. Achtung: いっ (nicht いち).", ex: ["コンビニは いっかいです。", "コンビニは1階です。", "Der Laden ist im Erdgeschoss."] },
      { k: "にかい", j: "2階", de: "1. Stock (Schweiz)", box: [60, 190, 96, 70], col: 225, note: "Japanisch 2階 = bei uns der 1. Stock.", ex: ["わたしの へやは にかいです。", "私の部屋は2階です。", "Mein Zimmer ist im 1. Stock (japanisch: 2. Etage)."] },
      { k: "さんがい", j: "3階", de: "2. Stock (Schweiz)", box: [60, 120, 96, 70], col: 155, note: "Bei 3 wird かい zu がい: さんがい.", ex: ["レストランは さんがいです。", "レストランは3階です。", "Das Restaurant ist im 2. Stock (japanisch: 3. Etage)."] },
      { k: "おくじょう", j: "屋上", de: "Flachdach, Dachterrasse", box: [56, 96, 144, 24], col: 108, note: "Viele Warenhäuser haben oben eine Dachterrasse.", ex: ["おくじょうは ひろいです。", "屋上は広いです。", "Die Dachterrasse ist gross."] },
      { k: "マンション", j: "", de: "Wohnblock (Wohnung)", box: [72, 74, 112, 22], lab: [128, 89], note: "Ein grosses Wohnhaus aus Beton, meist mit Lift. Nicht wie englisch „mansion“ (Villa)!", ex: ["わたしの いえは マンションです。", "私の家はマンションです。", "Ich wohne in einer Wohnung (Wohnblock)."] },
      { k: "いっこだて", j: "一戸建て", de: "Einfamilienhaus", box: [246, 182, 84, 24], lab: [288, 198], note: "Ein eigenes Haus für eine Familie, oft mit kleinem Garten.", ex: ["いっこだてに すんで います。", "一戸建てに住んでいます。", "Ich wohne in einem Einfamilienhaus."] },
      { k: "ちゅうしゃじょう", j: "駐車場", de: "Parkplatz, Garage", box: [66, 340, 58, 48], ex: ["くるまは ちゅうしゃじょうに あります。", "車は駐車場にあります。", "Das Auto ist auf dem Parkplatz."] },
      { k: "エレベーター", j: "", de: "Lift", box: [156, 120, 32, 210], ex: ["エレベーターは どこですか。", "", "Wo ist der Lift?"] },
      { k: "かいだん", j: "階段", de: "Treppe", box: [196, 118, 30, 214], note: "Kleine アパート haben oft eine Treppe aussen am Haus.", ex: ["かいだんで にかいに いきます。", "階段で2階に行きます。", "Ich gehe über die Treppe in den 1. Stock."] },
      { k: "ベランダ", j: "", de: "Balkon", box: [[66, 166, 80, 22], [66, 236, 80, 22]], note: "Auf dem Balkon trocknet man in Japan Wäsche und Futons.", ex: ["ベランダが あります。", "", "Es gibt einen Balkon."] },
      { k: "いりぐち", j: "入口", de: "Eingang", box: [110, 286, 30, 44], note: "Gegenteil: でぐち 出口 (Ausgang).", ex: ["いりぐちは どこですか。", "入口はどこですか。", "Wo ist der Eingang?"] },
      { k: "やね", j: "屋根", de: "Dach", box: [232, 208, 112, 46], ex: ["やねは あかいです。", "屋根は赤いです。", "Das Dach ist rot."] },
      { k: "げんかん", j: "玄関", de: "Haustür, Eingangsbereich", box: [302, 286, 26, 44], note: "Hinter der Haustür kommt die げんかん: Dort zieht man die Schuhe aus.", ex: ["げんかんで くつを ぬぎます。", "玄関で靴を脱ぎます。", "Im Eingang zieht man die Schuhe aus."] },
      { k: "まど", j: "窓", de: "Fenster", box: [252, 266, 34, 30], ex: ["まどが ちいさいです。", "窓が小さいです。", "Das Fenster ist klein."] },
      { k: "にわ", j: "庭", de: "Garten", box: [330, 262, 42, 70], ex: ["にわに きが あります。", "庭に木があります。", "Im Garten steht ein Baum."] },
    ],
  };

  // Grundriss einer 3LDK-Wohnung (von oben)
  const R = { ver: [10, 10, 352, 34], wa: [10, 44, 120, 110], shin: [130, 44, 110, 110], liv: [240, 44, 122, 150], rou: [10, 154, 230, 40],
    dai: [240, 194, 122, 116], toi: [10, 194, 60, 56], furo: [70, 194, 80, 56], sen: [150, 194, 90, 56], gen: [10, 250, 100, 60], ko: [110, 250, 130, 60] };
  const room = (b, cls) => `<rect class="${cls} hs room" x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${b[3]}"/>`;
  const ROOMS = {
    vb: [372, 324],
    art: `
      ${room(R.ver, "h-e")}${rng(20, 352, 12, x => `<path class="hs thin" d="M${x} 12v30"/>`)}
      ${room(R.wa, "h-d")}<path class="hs thin" d="M10 99h120M70 44v55M40 99v55M100 99v55"/>
      ${room(R.shin, "h-c")}<rect class="h-e hs" x="190" y="120" width="46" height="30" rx="3"/><rect class="h-c hs" x="194" y="124" width="10" height="22" rx="3"/>
      ${room(R.liv, "h-c")}<rect class="h-a" x="250" y="150" width="70" height="20" rx="5"/><rect class="h-a" x="340" y="110" width="8" height="40"/>
      ${room(R.rou, "h-c")}
      ${room(R.dai, "h-c")}<rect class="h-e hs" x="330" y="200" width="28" height="104"/><circle class="hs" cx="344" cy="220" r="6"/><circle class="hs" cx="344" cy="244" r="6"/>
        <rect class="h-d hs" x="262" y="278" width="44" height="24" rx="3"/>
      ${room(R.toi, "h-c")}<ellipse class="h-e hs" cx="40" cy="238" rx="9" ry="10"/>
      ${room(R.furo, "h-c")}<rect class="h-e hs" x="110" y="214" width="36" height="32" rx="8"/>
      ${room(R.sen, "h-c")}<rect class="h-e hs" x="210" y="226" width="26" height="20" rx="4"/>
      ${room(R.gen, "h-e")}<path class="h-a" d="M20 296h12v6h-12zM36 296h12v6h-12z"/>
      ${room(R.ko, "h-c")}<rect class="h-d hs" x="212" y="284" width="24" height="20" rx="2"/>
      <rect class="h-b" x="30" y="308" width="56" height="6" rx="2"/>`,
    items: [
      { k: "ベランダ", j: "", de: "Balkon", box: R.ver, lab: 1, ex: ["ベランダに でます。", "", "Ich gehe auf den Balkon."] },
      { k: "わしつ", j: "和室", de: "Tatami-Zimmer", box: R.wa, lab: 1, note: "Japanisches Zimmer mit Tatami-Matten. Man schläft auf einem Futon. Ein Zimmer mit westlichem Boden heisst ようしつ 洋室.", ex: ["わしつで ねます。", "和室で寝ます。", "Ich schlafe im Tatami-Zimmer."] },
      { k: "しんしつ", j: "寝室", de: "Schlafzimmer", box: R.shin, lab: 1, ex: ["しんしつに ベッドが あります。", "寝室にベッドがあります。", "Im Schlafzimmer ist ein Bett."] },
      { k: "リビング", j: "", de: "Wohnzimmer", box: R.liv, lab: 1, note: "Das L in 3LDK. Auch: いま 居間.", ex: ["リビングに ソファが あります。", "", "Im Wohnzimmer ist ein Sofa."] },
      { k: "ろうか", j: "廊下", de: "Gang, Flur", box: R.rou, lab: 1, ex: ["ろうかは せまいです。", "廊下は狭いです。", "Der Gang ist schmal."] },
      { k: "だいどころ", j: "台所", de: "Küche", box: R.dai, lab: 1, note: "Auch: キッチン – das K in 3LDK. Mit Esstisch: ダイニング (D).", ex: ["ここは だいどころです。", "ここは台所です。", "Hier ist die Küche."] },
      { k: "トイレ", j: "", de: "Toilette", box: R.toi, lab: 1, note: "In Japan meist ein eigener kleiner Raum, nicht im Bad.", ex: ["あのう、トイレは どこですか。", "", "Ähm, wo ist die Toilette?"] },
      { k: "おふろ", j: "お風呂", de: "Bad (Badewanne)", box: R.furo, lab: 1, note: "Man wäscht sich vor der Wanne und steigt dann sauber ins heisse Wasser.", ex: ["まいばん おふろに はいります。", "毎晩お風呂に入ります。", "Ich bade jeden Abend."] },
      { k: "せんめんじょ", j: "洗面所", de: "Waschraum (Lavabo)", box: R.sen, lab: 1, note: "Vorraum zum Bad mit Lavabo, oft steht hier auch die Waschmaschine.", ex: ["せんめんじょは おふろの となりです。", "洗面所はお風呂の隣です。", "Der Waschraum ist neben dem Bad."] },
      { k: "げんかん", j: "玄関", de: "Eingangsbereich", box: R.gen, lab: 1, note: "Hier zieht man die Schuhe aus. Die Stufe danach betritt man nur in Socken oder Hausschuhen.", ex: ["げんかんで くつを ぬぎます。", "玄関で靴を脱ぎます。", "Im Eingang zieht man die Schuhe aus."] },
      { k: "こどもべや", j: "子ども部屋", de: "Kinderzimmer", box: R.ko, lab: 1, note: "こども + へや → こどもべや (das へ wird zu べ).", ex: ["こどもべやは ちいさいです。", "子ども部屋は小さいです。", "Das Kinderzimmer ist klein."] },
    ],
  };

  // Wohnzimmer und Küche von vorne
  const IN = {
    vb: [372, 300],
    art: `
      <rect class="h-c" x="0" y="0" width="372" height="236"/><rect class="h-d" x="0" y="236" width="372" height="64"/><path class="hs" d="M0 236H372M0 1H372"/>
      <rect class="h-e hs" x="12" y="96" width="46" height="140" rx="4"/><path class="hs" d="M12 146h46M50 112v20M50 158v24"/>
      <rect class="h-e hs" x="58" y="176" width="64" height="60"/><path class="hs thin" d="M58 190h64"/>
      <rect class="h-a" x="62" y="122" width="58" height="5" rx="1"/>
      <path class="h-b" d="M70 106h12v14h-12zM82 109h3a3 3 0 0 1 0 8h-3M94 106h12v14h-12zM106 109h3a3 3 0 0 1 0 8h-3"/>
      <rect class="h-e hs" x="98" y="244" width="20" height="28" rx="3"/><path class="hs thin" d="M98 250h20"/>
      <rect class="h-e hs" x="134" y="92" width="46" height="144"/><circle class="h-a" cx="172" cy="168" r="3"/>
      <ellipse class="h-b" cx="146" cy="268" rx="8" ry="4"/><ellipse class="h-b" cx="166" cy="268" rx="8" ry="4"/>
      <circle class="h-c hs" cx="157" cy="54" r="15"/><path class="hs" d="M157 54v-9M157 54h7"/>
      <path class="hs" d="M262 0v24"/><path class="h-d hs" d="M248 42L256 24H268L276 42Z"/>
      <rect class="h-c hs" x="298" y="14" width="64" height="22" rx="4"/><path class="hs thin" d="M304 30h52"/>
      <rect class="h-e hs" x="206" y="62" width="104" height="82"/><path class="hs thin" d="M258 62v82M206 103h104"/>
      <path class="h-b" d="M194 56h16v94q-8 4-16 0zM306 56h16v94q-8 4-16 0z"/>
      <rect class="h-a" x="200" y="168" width="124" height="40" rx="8"/><rect class="h-a" x="192" y="198" width="140" height="38" rx="6"/>
      <rect class="h-d" x="212" y="176" width="28" height="22" rx="5"/>
      <rect class="h-e hs" x="196" y="258" width="96" height="10" rx="2"/><path class="hs" d="M204 268v18M284 268v18"/>
      <rect class="h-a" x="226" y="252" width="20" height="6" rx="2"/>
      <use href="#s-catsleep" x="300" y="258" width="58" height="36"/>`,
    items: [
      { k: "かべ", j: "壁", de: "Wand", box: [0, 0, 372, 236], ex: ["かべに とけいが あります。", "壁に時計があります。", "An der Wand hängt eine Uhr."] },
      { k: "ゆか", j: "床", de: "Fussboden", box: [0, 236, 372, 64], ex: ["ゆかに ねこが います。", "床に猫がいます。", "Auf dem Boden ist eine Katze."] },
      { k: "れいぞうこ", j: "冷蔵庫", de: "Kühlschrank", box: [10, 94, 50, 144], ex: ["ぎゅうにゅうは れいぞうこの なかです。", "牛乳は冷蔵庫の中です。", "Die Milch ist im Kühlschrank."] },
      { k: "たな", j: "棚", de: "Regal", box: [60, 120, 62, 9], ex: ["カップは たなの うえです。", "カップは棚の上です。", "Die Tassen sind auf dem Regal."] },
      { k: "カップ", j: "", de: "Tasse", box: [66, 102, 48, 20], ex: ["カップが ふたつ あります。", "カップが二つあります。", "Es gibt zwei Tassen."] },
      { k: "ごみばこ", j: "ごみ箱", de: "Mülleimer", box: [94, 240, 28, 36], ex: ["ごみばこは どこですか。", "ごみ箱はどこですか。", "Wo ist der Mülleimer?"] },
      { k: "ドア", j: "", de: "Tür", box: [132, 90, 50, 148], ex: ["ドアの うえに とけいが あります。", "ドアの上に時計があります。", "Über der Tür ist eine Uhr."] },
      { k: "スリッパ", j: "", de: "Hausschuhe", box: [134, 260, 44, 16], note: "Gäste bekommen in Japan oft Hausschuhe. Auf Tatami geht man aber nur in Socken.", ex: ["スリッパを どうぞ。", "", "Bitte, hier sind Hausschuhe."] },
      { k: "とけい", j: "時計", de: "Uhr", box: [140, 37, 34, 34], ex: ["とけいは ドアの うえです。", "時計はドアの上です。", "Die Uhr ist über der Tür."] },
      { k: "でんき", j: "電気", de: "Licht, Lampe", box: [244, 0, 36, 46], note: "でんき heisst auch „Strom“.", ex: ["でんきを つけて ください。", "電気をつけてください。", "Mach bitte das Licht an."] },
      { k: "エアコン", j: "", de: "Klimaanlage", box: [296, 12, 68, 26], note: "In Japan heizt und kühlt man oft mit der エアコン.", ex: ["エアコンが あります。", "", "Es gibt eine Klimaanlage."] },
      { k: "まど", j: "窓", de: "Fenster", box: [210, 62, 96, 82], ex: ["まどが おおきいです。", "窓が大きいです。", "Das Fenster ist gross."] },
      { k: "カーテン", j: "", de: "Vorhang", box: [[192, 54, 20, 100], [304, 54, 20, 100]], ex: ["カーテンは あかいです。", "カーテンは赤いです。", "Die Vorhänge sind rot."] },
      { k: "ソファ", j: "", de: "Sofa", box: [190, 166, 144, 72], ex: ["ソファは おおきいです。", "ソファは大きいです。", "Das Sofa ist gross."] },
      { k: "クッション", j: "", de: "Kissen", box: [208, 172, 36, 30], ex: ["クッションは ソファの うえです。", "クッションはソファの上です。", "Das Kissen ist auf dem Sofa."] },
      { k: "テーブル", j: "", de: "Tisch", box: [192, 258, 104, 30], ex: ["リモコンは テーブルの うえです。", "リモコンはテーブルの上です。", "Die Fernbedienung ist auf dem Tisch."] },
      { k: "リモコン", j: "", de: "Fernbedienung", box: [222, 248, 28, 12], ex: ["リモコンは どこですか。", "", "Wo ist die Fernbedienung?"] },
      { k: "ねこ", j: "猫", de: "Katze", box: [298, 258, 62, 36], ex: ["ねこは テーブルの よこに います。", "猫はテーブルの横にいます。", "Die Katze ist neben dem Tisch."] },
    ],
  };

  window.HOUSE = { out: OUT, rooms: ROOMS, in: IN };

  // Wohnformen: [kana, kanji, deutsch, Erklärung]
  window.HOUSE_TYPES = [
    ["いっこだて", "一戸建て", "Einfamilienhaus", "Ein eigenes Haus, oft mit kleinem Garten."],
    ["マンション", "", "Wohnung im Wohnblock", "Grosses Haus aus Beton, oft mit Lift – kein Luxus-Haus!"],
    ["アパート", "", "Mietwohnung", "Kleines Wohnhaus mit 2–3 Stockwerken, oft aus Holz, Treppe aussen."],
    ["ワンルーム", "", "Einzimmerwohnung", "Ein Zimmer mit kleiner Kochnische – typisch für Studierende."],
    ["シェアハウス", "", "WG", "Man teilt Küche und Bad mit anderen."],
    ["りょう", "寮", "Wohnheim", "Für Studierende oder Angestellte einer Firma."],
  ];
  // Grundriss-Kürzel: [Kürzel, Erklärung]
  window.HOUSE_PLANS = [
    ["1R", "1 Zimmer, Küche im selben Raum (ワンルーム)"],
    ["1K", "1 Zimmer + kleine Küche (K = Kitchen)"],
    ["1DK", "1 Zimmer + Küche mit Essplatz (D = Dining)"],
    ["1LDK", "1 Zimmer + Wohnzimmer mit Essplatz und Küche (L = Living)"],
    ["3LDK", "3 Zimmer + LDK – wie im Bild „Räume“"],
  ];
  // Stockwerke: [Zahl, kana, unregelmässig?]
  window.HOUSE_FLOORS = [
    ["1", "いっかい", 1], ["2", "にかい"], ["3", "さんがい", 1], ["4", "よんかい"], ["5", "ごかい"],
    ["6", "ろっかい", 1], ["7", "ななかい"], ["8", "はっかい", 1], ["9", "きゅうかい"], ["10", "じゅっかい", 1],
  ];
})();
