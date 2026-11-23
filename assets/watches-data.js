// Alizeh Bullion — Rolex catalogue data.
// Add or edit a watch by changing one line. `ref` is the key the market-value API will use.
// colors drive the illustrated face (assets/watch-art.js):
//   dial, sub (Daytona sub-dials), bezel: [top, bottom] for GMT or [color] otherwise,
//   case: steel | yellow | white | everose | platinum | twotone | twotoneRose,
//   bezelStyle: gmt | dive | tachy | fluted | smooth | rainbow | diamond, hand: hand colour, accent: GMT hand / detail colour
// image: optional real photo path (overrides the illustration on the card).
// NOTE: references and nicknames compiled from collector guides; verify against current market listings before launch.

window.AB_WATCH_FAMILIES = [
  { id: 'daytona', name: 'Cosmograph Daytona', short: 'Daytona',
    intro: 'Introduced in 1963 for endurance racing, the Daytona chronograph is among the most sought-after watches in the world. Collectors know each dial by its nickname.',
    photo: 'assets/img/watches/daytona.jpg', photoAlt: 'A Rolex Cosmograph Daytona with a white "Panda" dial on a green background',
    credit: { author: 'Shuntfield', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Rolex_Cosmograph_Daytona_Panda.jpg' } },
  { id: 'gmt', name: 'GMT-Master II', short: 'GMT-Master II',
    intro: 'Created for airline pilots crossing time zones, the GMT-Master II is recognised by its two-colour 24-hour bezel. Each colour combination carries its own name.',
    photo: 'assets/img/watches/gmt.jpg', photoAlt: 'A Rolex GMT-Master II with a blue and black "Batgirl" bezel on a Jubilee bracelet',
    credit: { author: 'Brattyq', license: 'CC0', url: 'https://commons.wikimedia.org/wiki/File:Rolex-GMT-Master-II-Batgirl.jpg' } },
  { id: 'submariner', name: 'Submariner', short: 'Submariner',
    intro: 'The reference dive watch since 1953. Green and blue editions have become collecting categories of their own.',
    photo: 'assets/img/watches/submariner.jpg', photoAlt: 'A Rolex Submariner with a black dial and black bezel',
    credit: { author: 'FrankWilliams', license: 'Public domain', url: 'https://commons.wikimedia.org/wiki/File:Rolex-Submariner.jpg' } },
  { id: 'daydate', name: 'Day-Date', short: 'Day-Date',
    intro: 'Made only in precious metals, the Day-Date was the first watch to show the day spelled out in full. Its bracelet gave it the name "President".',
    photo: 'assets/img/watches/daydate.jpg', photoAlt: 'A Rolex Day-Date with a multicoloured "Puzzle" dial',
    credit: { author: 'EMore98', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Rolex_Day-Date_quadrante_Puzzle.jpg' } },
  { id: 'datejust', name: 'Datejust', short: 'Datejust',
    intro: 'The classic everyday Rolex, and the first self-winding watch to show the date in a window. Its dial variations have earned nicknames of their own.',
    photo: 'assets/img/watches/datejust.jpg', photoAlt: 'A two-tone Rolex Datejust with a slate "Wimbledon" dial and green Roman numerals',
    credit: { author: 'EMore98', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Rolex_Datejust_con_quadrante_Wimbledon.jpg' } },
];

window.AB_WATCHES = [
  // ── Daytona ──
  { family: 'daytona', nickname: 'Panda', model: 'Cosmograph Daytona', ref: '126500LN', metal: 'Oystersteel', dial: 'White dial, black sub-dials', bezel: 'Black Cerachrom', colors: { dial: '#F3F1EB', sub: '#18181A', bezel: ['#151517'], case: 'steel', bezelStyle: 'tachy', hand: '#2A2A2A' } },
  { family: 'daytona', nickname: 'Reverse Panda', model: 'Cosmograph Daytona', ref: '126500LN', metal: 'Oystersteel', dial: 'Black dial, silver-ringed sub-dials', bezel: 'Black Cerachrom', colors: { dial: '#141416', sub: '#C9CBCE', subRing: true, bezel: ['#151517'], case: 'steel', bezelStyle: 'tachy', hand: '#E9E9E9' } },
  { family: 'daytona', nickname: 'John Mayer', model: 'Cosmograph Daytona', ref: '116508', metal: '18k yellow gold', dial: 'Green sunburst dial', bezel: 'Gold tachymeter', colors: { dial: '#1E6A3B', sub: '#1A5A32', subRing: true, bezel: ['#D7B25A'], case: 'yellow', bezelStyle: 'tachy', hand: '#E8CF8A' } },
  { family: 'daytona', nickname: 'Ice Blue', model: 'Cosmograph Daytona', ref: '126506', metal: '950 platinum', dial: 'Ice-blue dial, chestnut accents', bezel: 'Chestnut brown Cerachrom', colors: { dial: '#BFE1EC', sub: '#9CCADB', subRing: true, bezel: ['#5A3426'], case: 'platinum', bezelStyle: 'tachy', hand: '#3A3A3A' } },
  { family: 'daytona', nickname: 'Le Mans', model: 'Cosmograph Daytona', ref: '126529LN', metal: '18k white gold', dial: 'Black dial, white sub-dials, red "100"', bezel: 'Black Cerachrom', colors: { dial: '#141416', sub: '#F2F1EE', bezel: ['#151517'], case: 'white', bezelStyle: 'tachy', hand: '#E9E9E9', accent: '#C8322B' } },
  { family: 'daytona', nickname: 'Rainbow', model: 'Cosmograph Daytona', ref: '116598RBOW', metal: '18k yellow gold', dial: 'Black dial, gold details', bezel: 'Graded rainbow sapphires', colors: { dial: '#141416', sub: '#1E1E20', subRing: true, bezel: ['rainbow'], case: 'yellow', bezelStyle: 'rainbow', hand: '#E8CF8A' } },
  { family: 'daytona', nickname: 'Eye of the Tiger', model: 'Cosmograph Daytona', ref: '116588TBR', metal: '18k yellow gold', dial: 'Tiger-pattern pavé dial', bezel: 'Diamond-set', colors: { dial: '#C99A3E', sub: '#2A2016', subRing: true, bezel: ['#F4F4F2'], case: 'yellow', bezelStyle: 'diamond', hand: '#F1DFA8', pattern: 'tiger' } },
  { family: 'daytona', nickname: 'Paul Newman', model: 'Cosmograph Daytona (vintage)', ref: '6239 / 6263', metal: 'Steel', dial: 'Exotic cream dial, black sub-dials', bezel: 'Steel tachymeter', colors: { dial: '#EDE6D4', sub: '#1B1B1D', bezel: ['#D7D9DC'], case: 'steel', bezelStyle: 'tachy', hand: '#2A2A2A', accent: '#B0322A' } },

  // ── GMT-Master II ── (bezel: [top half, bottom half])
  { family: 'gmt', nickname: 'Pepsi', model: 'GMT-Master II', ref: '126710BLRO', metal: 'Oystersteel', dial: 'Black dial', bezel: 'Red and blue Cerachrom', colors: { dial: '#141416', bezel: ['#B4242C', '#1F3F8C'], case: 'steel', bezelStyle: 'gmt', hand: '#ECECEC', accent: '#C0282F' } },
  { family: 'gmt', nickname: 'Batman', model: 'GMT-Master II', ref: '126710BLNR-0003', metal: 'Oystersteel, Oyster bracelet', dial: 'Black dial', bezel: 'Blue and black Cerachrom', colors: { dial: '#141416', bezel: ['#18181A', '#22448F'], case: 'steel', bezelStyle: 'gmt', hand: '#ECECEC', accent: '#2C5BB8' } },
  { family: 'gmt', nickname: 'Batgirl', model: 'GMT-Master II', ref: '126710BLNR-0002', metal: 'Oystersteel, Jubilee bracelet', dial: 'Black dial', bezel: 'Blue and black Cerachrom', colors: { dial: '#141416', bezel: ['#18181A', '#22448F'], case: 'steel', bezelStyle: 'gmt', hand: '#ECECEC', accent: '#2C5BB8', jubilee: true } },
  { family: 'gmt', nickname: 'Sprite', model: 'GMT-Master II (left-hand)', ref: '126720VTNR', metal: 'Oystersteel', dial: 'Black dial, crown on the left', bezel: 'Green and black Cerachrom', colors: { dial: '#141416', bezel: ['#1F6B3D', '#18181A'], case: 'steel', bezelStyle: 'gmt', hand: '#ECECEC', accent: '#2E8B4E', lefty: true } },
  { family: 'gmt', nickname: 'Root Beer', model: 'GMT-Master II', ref: '126711CHNR', metal: 'Everose Rolesor', dial: 'Black dial', bezel: 'Brown and black Cerachrom', colors: { dial: '#141416', bezel: ['#5B3524', '#18181A'], case: 'twotoneRose', bezelStyle: 'gmt', hand: '#E6B9A3', accent: '#B87A5E' } },
  { family: 'gmt', nickname: 'Bruce Wayne', model: 'GMT-Master II', ref: '126710GRNR', metal: 'Oystersteel', dial: 'Black dial', bezel: 'Grey and black Cerachrom', colors: { dial: '#141416', bezel: ['#7A7D80', '#18181A'], case: 'steel', bezelStyle: 'gmt', hand: '#ECECEC', accent: '#3E8A55' } },
  { family: 'gmt', nickname: 'Coke', model: 'GMT-Master II (vintage)', ref: '16710', metal: 'Steel', dial: 'Black dial', bezel: 'Red and black aluminium', colors: { dial: '#141416', bezel: ['#A3262B', '#18181A'], case: 'steel', bezelStyle: 'gmt', hand: '#ECECEC', accent: '#C0282F' } },

  // ── Submariner ──
  { family: 'submariner', nickname: 'Hulk', model: 'Submariner Date', ref: '116610LV', metal: 'Oystersteel', dial: 'Green sunburst dial', bezel: 'Green Cerachrom', colors: { dial: '#1D6A3A', bezel: ['#1C5A33'], case: 'steel', bezelStyle: 'dive', hand: '#ECECEC', date: true } },
  { family: 'submariner', nickname: 'Kermit', model: 'Submariner Date', ref: '16610LV', metal: 'Steel', dial: 'Black dial', bezel: 'Green aluminium', colors: { dial: '#141416', bezel: ['#2F8C47'], case: 'steel', bezelStyle: 'dive', hand: '#ECECEC', date: true } },
  { family: 'submariner', nickname: 'Starbucks', model: 'Submariner Date', ref: '126610LV', metal: 'Oystersteel', dial: 'Black dial', bezel: 'Green Cerachrom', colors: { dial: '#141416', bezel: ['#1D5C35'], case: 'steel', bezelStyle: 'dive', hand: '#ECECEC', date: true } },
  { family: 'submariner', nickname: 'Smurf', model: 'Submariner Date', ref: '116619LB', metal: '18k white gold', dial: 'Blue dial', bezel: 'Blue Cerachrom', colors: { dial: '#1E3F8C', bezel: ['#1D3A80'], case: 'white', bezelStyle: 'dive', hand: '#ECECEC', date: true } },
  { family: 'submariner', nickname: 'Cookie Monster', model: 'Submariner Date', ref: '126619LB', metal: '18k white gold', dial: 'Black dial', bezel: 'Blue Cerachrom', colors: { dial: '#141416', bezel: ['#1D3A80'], case: 'white', bezelStyle: 'dive', hand: '#ECECEC', date: true } },
  { family: 'submariner', nickname: 'Bluesy', model: 'Submariner Date', ref: '126613LB', metal: 'Yellow Rolesor', dial: 'Royal blue dial', bezel: 'Blue Cerachrom', colors: { dial: '#1E3F8C', bezel: ['#1D3A80'], case: 'twotone', bezelStyle: 'dive', hand: '#E8CF8A', date: true } },

  // ── Day-Date ──
  { family: 'daydate', nickname: 'President', model: 'Day-Date 40', ref: '228238', metal: '18k yellow gold', dial: 'Champagne dial', bezel: 'Fluted gold', colors: { dial: '#E2C88C', bezel: ['#D7B25A'], case: 'yellow', bezelStyle: 'fluted', hand: '#B8913F', day: true, date: true } },
  { family: 'daydate', nickname: 'Olive', model: 'Day-Date 40', ref: '228238', metal: '18k yellow gold', dial: 'Olive-green dial', bezel: 'Fluted gold', colors: { dial: '#55693A', bezel: ['#D7B25A'], case: 'yellow', bezelStyle: 'fluted', hand: '#E8CF8A', day: true, date: true } },
  { family: 'daydate', nickname: 'Ice Blue', model: 'Day-Date 40', ref: '228206', metal: '950 platinum', dial: 'Ice-blue dial', bezel: 'Fluted platinum', colors: { dial: '#BFE1EC', bezel: ['#E3E3E1'], case: 'platinum', bezelStyle: 'fluted', hand: '#5A6670', day: true, date: true } },
  { family: 'daydate', nickname: 'Puzzle', model: 'Day-Date 36', ref: '128235', metal: '18k Everose gold', dial: 'Multicoloured puzzle motif, emoji day wheel', bezel: 'Fluted Everose', colors: { dial: '#E77A3A', bezel: ['#E0AE97'], case: 'everose', bezelStyle: 'fluted', hand: '#FFFFFF', pattern: 'puzzle', day: true, date: true } },

  // ── Datejust ──
  { family: 'datejust', nickname: 'Wimbledon', model: 'Datejust 41', ref: '126333', metal: 'Yellow Rolesor', dial: 'Slate dial, green Roman numerals', bezel: 'Fluted gold', colors: { dial: '#5F6466', bezel: ['#D7B25A'], case: 'twotone', bezelStyle: 'fluted', hand: '#E8CF8A', accent: '#3E9A5A', date: true, jubilee: true } },
  { family: 'datejust', nickname: 'Palm Motif', model: 'Datejust 41', ref: '126334', metal: 'White Rolesor', dial: 'Olive-green palm motif', bezel: 'Fluted white gold', colors: { dial: '#5D7A4B', bezel: ['#E3E5E8'], case: 'steel', bezelStyle: 'fluted', hand: '#ECECEC', pattern: 'palm', date: true } },
  { family: 'datejust', nickname: 'Mint Green', model: 'Datejust 36', ref: '126200', metal: 'Oystersteel', dial: 'Mint-green dial', bezel: 'Smooth steel', colors: { dial: '#A9D9C2', bezel: ['#D7D9DC'], case: 'steel', bezelStyle: 'smooth', hand: '#4A4F52', date: true } },
  { family: 'datejust', nickname: 'Thunderbird', model: 'Datejust Turn-O-Graph (vintage)', ref: '1625', metal: 'Steel and yellow gold', dial: 'Silver dial', bezel: 'Rotating gold bezel', colors: { dial: '#D9DBDC', bezel: ['#D7B25A'], case: 'steel', bezelStyle: 'dive', hand: '#3A3A3A', date: true } },
];
