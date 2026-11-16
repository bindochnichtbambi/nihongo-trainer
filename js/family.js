// Familie: Stammbaum mit den zwei Wortreihen
// „meine Familie“ (wenn ich anderen erzähle, bescheiden) und „andere / Anrede“ (Familie von anderen, höflich).
// [id, Deutsch, Avatar, mein kana, mein kanji, andere kana, andere kanji, wie rufe ich die eigene Person?, x, y]
window.FAMILY = [
  ["sofu", "Grossvater", "av-oldman", "そふ", "祖父", "おじいさん", "お祖父さん", "おじいさん / おじいちゃん", 1, 0],
  ["sobo", "Grossmutter", "av-oldwoman", "そぼ", "祖母", "おばあさん", "お祖母さん", "おばあさん / おばあちゃん", 2, 0],
  ["chichi", "Vater", "av-man", "ちち", "父", "おとうさん", "お父さん", "おとうさん (auch パパ)", 1.5, 1],
  ["haha", "Mutter", "av-woman", "はは", "母", "おかあさん", "お母さん", "おかあさん (auch ママ)", 2.5, 1],
  ["ani", "älterer Bruder", "av-boy", "あに", "兄", "おにいさん", "お兄さん", "おにいさん / おにいちゃん", 0, 2],
  ["ane", "ältere Schwester", "av-girl", "あね", "姉", "おねえさん", "お姉さん", "おねえさん / おねえちゃん", 1, 2],
  ["me", "ich", "", "わたし", "私", "", "", "", 4, 2],
  ["partner", "Ehemann / Ehefrau", "s-heart", "おっと / つま", "夫 / 妻", "ごしゅじん / おくさん", "ご主人 / 奥さん", "beim Vornamen", 5, 2],
  ["otouto", "jüngerer Bruder", "av-boy", "おとうと", "弟", "おとうとさん", "弟さん", "beim Vornamen", 2, 2],
  ["imouto", "jüngere Schwester", "av-girl", "いもうと", "妹", "いもうとさん", "妹さん", "beim Vornamen", 3, 2],
  ["musuko", "Sohn", "c-boy", "むすこ", "息子", "むすこさん", "息子さん", "beim Vornamen", 3.5, 3.25],
  ["musume", "Tochter", "s-girl", "むすめ", "娘", "むすめさん", "娘さん", "beim Vornamen", 5, 3.25],
];
// Sammelbegriffe: [Deutsch, mein kana, mein kanji, andere kana, andere kanji]
window.FAMILY_WORDS = [
  ["Familie", "かぞく", "家族", "ごかぞく", "ご家族"],
  ["Eltern", "りょうしん", "両親", "ごりょうしん", "ご両親"],
  ["Geschwister", "きょうだい", "兄弟", "ごきょうだい", "ご兄弟"],
  ["Kind(er)", "こども", "子ども", "おこさん", "お子さん"],
];
