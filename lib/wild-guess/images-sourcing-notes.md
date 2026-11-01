# Balls in the Ballpark — image sourcing notes

Photos on the option cards (the `.wg-choice-grid` buttons) and on the
reveal sides (the `.wg-reveal-sides` articles), in the same format: a large
16/10 photo, then the label. One entry per subject id in
`lib/wild-guess/images.mjs`: 163 of 163 subjects covered, zero nulls.
Expanding the pool is data-only — add a subject to
`lib/wild-guess/subjects.mjs` and one entry here.

Where a photo loads, it replaces the emoji (the original deprecate-emoji
direction); where an image fails to load, no photo element renders and the
emoji shows as the fallback. The reveal sides carry the subject id through
`buildReveal` so they use the same manifest lookup as the choice cards.

## The bar (Kai, 2026-10-28)

"Don't over complicate it. Treat the image as an attention catcher or an
illustration." The image should loosely evoke the label and catch the eye;
it does not need to depict the subject exactly. A generic representative is
fine (any fly for midge wingbeats, any whale for blue whales, a beach for
grains of sand). Nothing was rejected for inexact species or
generic-vs-specific mismatch, and no entry was dropped over a verification
technicality.

## Sourcing

Four parallel workers, ~41 subjects each, Commons files only, filenames
taken from actual search/category results — never guessed. All 163
filenames and licenses were then verified against the Commons API
(`imageinfo` / `extmetadata`): 162 existed on first pass. The API
`LicenseShortName` wins wherever a worker's snippet differed (4 cases:
cat CC0 1.0 → CC0; sandcastle "version of choice" → CC BY-SA 4.0; people
weight CC BY → CC BY 4.0; Lake Erie "license of choice" → CC BY-SA 3.0)
and filled 22 licenses the workers had left uncertain.

## Replacements and flags

- **Cheetah running** (`speed-a-cheetah-running`): the worker's file
  ("Cheetah-GO!.jpg") does not exist on Commons. Replaced with
  "Cheetah Run.jpg" (CC BY 2.0, Mark Dumont), verified via the API.
- **Body surface** (`area-the-outer-surface-of-an-adults-body`): the
  textbook illustration is Leonardo's Vitruvian Man — a classical nude
  figure drawing, public domain. Kept deliberately; swap it if the
  portal's audience makes that the wrong call.
- **Snail** (`duration-a-snail-crossing-the-united-states`): license is
  "Copyrighted free use" per the API — a free license permitting any use,
  so it passes the test allowlist, which documents it explicitly.
- **Butterfly photos** (`duration-an-adult-butterflys-life`,
  `count-tiny-scales-on-a-butterflys-wings`): GFDL 1.2, same as the
  Outsider mosquito photo; the allowlist covers GFDL for the same reason.
- **Authors recorded as "Unknown"** (2): the oak photo
  (`duration-an-acorn-growing-into-a-full-sized-oak`) and the heart photo
  (`volume-the-blood-one-heart-pumps-in-a-day`) — the API returns no
  artist for either.
- **Same file, several subjects** (fine — the manifest is keyed by
  subject id, and cards show one subject at a time): Webb's First Deep
  Field (stars in the observable universe; age of the universe), the
  Apollo 17 Earth photo (weight of Earth; distance around Earth), and the
  NOAA blue whale photo (all blue whales' weight; blue whale heartbeats;
  a blue whale's weight).

- duration-high-fiving-every-kid-in-your-school: File:US Navy 110804-N-DR144-456 Master Chief Petty Officer of the Navy (MCPON) Rick D. West high fives Commander, Naval Surface Force U.S. Pacific Fleet.jpg — Public domain, U.S. Navy photo by Mass Communication Specialist 2nd Class James R. Evans. Verified 2026-11-01.
- duration-ants-carrying-away-your-picnic-sandwich: File:Ants carrying food.jpg — CC0, DKDEVS. Verified 2026-11-01.
- duration-stacking-pennies-to-the-top-of-the-empire-state-building: File:Stack of pennies.jpg — CC0, Doorknob747. Verified 2026-11-01.
- duration-a-caterpillar-crawling-up-a-beanstalk-to-the-clouds: File:Caterpillar on leaf 03.jpg — CC BY-SA 4.0, Sabina Bajracharya. Verified 2026-11-01.
- duration-a-spider-spinning-a-web-over-your-whole-house: File:Spider web Luc Viatour.jpg — CC BY-SA 3.0, Luc Viatour. Verified 2026-11-01.
- duration-blowing-up-a-hot-air-balloon-with-your-lungs: File:Cappadocia Balloon Inflating Wikimedia Commons.JPG — CC BY-SA 3.0, Benh LIEU SONG (Flickr). Verified 2026-11-01.
- duration-an-ice-hotel-melting-in-spring: File:Icehotel entrance.jpg — CC BY-SA 2.5, Markus Bernet. Verified 2026-11-01.
- duration-reading-all-seven-harry-potter-books-out-loud: File:Stack of Books for decor.jpg — CC BY-SA 4.0, mycurrency.com. Verified 2026-11-01.
- duration-counting-to-one-million-out-loud: File:Child calculating with fingers.jpg — CC BY-SA 4.0, Jeuwre. Verified 2026-11-01.
- duration-a-termite-eating-a-pencil: File:Coptotermes formosanus shiraki USGov k8204-7.jpg — Public domain, Photo by Scott Bauer. Verified 2026-11-01.
- duration-a-sloth-walking-a-marathon: File:Bradypus.jpg — Public domain, Stefan Laube (Tauchgurke). Verified 2026-11-01.
- duration-mowing-all-of-central-park-alone: File:Sheep Meadow Central Park NYC 2007 001.jpg — Public domain, Gryffindor. Verified 2026-11-01.
- duration-a-penguin-waddling-all-the-way-around-antarctica: File:Aptenodytes forsteri -Snow Hill Island, Antarctica -adults and juvenile-8.jpg — CC BY 2.0, Ian Duffy from UK. Verified 2026-11-01.
- duration-grass-swallowing-a-parked-car: File:Abandoned cars overgrown with plants in a natural setting.jpg — CC BY 2.0, Shixart1985. Verified 2026-11-01.
- duration-a-robot-vacuum-cleaning-all-of-heathrow-airport: File:Roomba original.jpg — CC BY 4.0, Larry D. Moore. Verified 2026-11-01.
- duration-walking-to-the-moon: File:Full moon partially obscured by atmosphere.jpg — Public domain, NASA. Verified 2026-11-01.
- duration-a-message-in-a-bottle-drifting-across-the-pacific: File:Message in a bottle - geograph.org.uk - 1095870.jpg — CC BY-SA 2.0, Ashley Dace. Verified 2026-11-01.
- duration-growing-a-beard-down-to-your-toes: File:Sarwan Singh - Longest Beard World Records 2014 in India.JPG — CC BY-SA 3.0, Paavans. Verified 2026-11-01.
- duration-painting-the-white-house-with-an-art-brush: File:North Façade White House.JPG — Public domain, Nishkid64. Verified 2026-11-01.
- duration-a-mail-carrier-delivering-to-every-house-in-america: File:CAMPBELL, MRS. PARMLEE. WOMAN MAIL CARRIER. DELIVERING MAIL TO MRS. NELLIE McGRATH LCCN2016868589.jpg — Public domain, Harris & Ewing, photographer. Verified 2026-11-01.
- duration-building-the-great-pyramid-brick-by-brick-all-by-yourself: File:Great Pyramid of Giza.jpg — CC BY-SA 3.0, kallerna. Verified 2026-11-01.
- duration-a-beaver-building-the-hoover-dam: File:American Beaver.jpg — CC BY-SA 2.0, Steve from Washington, DC, USA. Verified 2026-11-01.
- duration-a-dog-digging-a-tunnel-to-china: File:Dog (Flatcoated retriever) digging a hole on the beach.jpg — CC BY-SA 4.0, Hondenfun.nl. Verified 2026-11-01.
- duration-a-lumberjack-chopping-down-the-whole-black-forest-alone: File:Madera Sugar Pine Company fellers undercut 1911.jpg — Public domain, Madera Sugar Pine Company. Verified 2026-11-01.
- duration-a-dripping-faucet-filling-an-olympic-pool: File:Dripping Tap.jpg — CC BY-SA 4.0, Ramani Marimuthu. Verified 2026-11-01.
- duration-carving-mount-rushmore-with-a-chisel: File:Mount Rushmore2.jpg — Public domain, Rise Studio, Rapid City, S. Dak. Copyright not renewed. Verified 2026-11-01.
- duration-knitting-a-scarf-for-planet-earth: File:Knitting needles and yarn (Unsplash).jpg — CC0, Olliss fomaolea. Verified 2026-11-01.
- duration-a-slime-mold-eating-a-banana-peel: File:Slime mold stemonitis fusca.jpg — CC BY-SA 3.0, Farnishk. Verified 2026-11-01.

- count-mcdonalds-restaurants-worldwide: File:World's Largest Entertainment McDonald's - exterior.jpg — CC0, Mx. Granger. Verified 2026-11-01.
- count-leaves-on-an-oak-tree: File:New oak leaves with female flowers.jpg — CC0, W.carter. Verified 2026-11-01.
- count-termites-in-a-tall-mound: File:Litchfield National Park (AU), Magnetic Termite Mounds -- 2019 -- 3721.jpg — CC BY-SA 4.0, Dietmar Rabich. Verified 2026-11-01.
- count-microbes-in-earths-oceans: File:Emiliania huxleyi coccolithophore (PLoS).png — CC BY 2.5, Alison R. Taylor (University of North Carolina Wilmington Microscopy Facility). Verified 2026-11-01.
