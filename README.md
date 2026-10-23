# Schmoop Quest

A retro pixel-art browser game (Stardew Valley-style art). Pick your Staffy and explore nine places, from the park and veggie garden to the house, garage and vet, snapping up snacks before it's home time.

## How to play

**Play online:** https://bushy13.github.io/schmoop-quest/ (computers, phones and tablets). Or double-click `index.html` to play from this folder: no install or internet connection needed. The **How to Play** option on the title screen explains everything in-game, with pictures.

| Key | Action |
| --- | --- |
| Arrow keys | Move (also navigates menus) |
| A (hold) | Sneak: creep along slowly and quietly. Critters don't notice you until you're close, pet store staff spot you from less far, and at night it's the quiet way to move |
| S | Bark: scares off birds and ducks, sends awake cats packing (and wakes sleeping ones), and it's noisy. At night outdoors, hold S to howl at the moon |
| D (hold) | Run (uses stamina, shown as the RUN bar in the round panel). Shift also works |
| Space | Sniff: every snack within about 7.5 tiles (about 5 metres) glows (rare ones in rainbow colours), with arrows at the screen edge for off-screen ones |
| W (hold) | Beg, in the Beg levels only (W does nothing anywhere else) |
| Esc / P | Pause menu: Resume, Restart Level, This Game (the pop-up for the kind of game you're playing), How to Play, Options, Quit to Menu |
| M | Mute everything |
| N | Music on/off |
| Enter | Choose a menu option |

**On a phone or tablet** (turn it sideways; held upright it asks you to): the game fills the whole screen, and on a phone the playing field zooms in (up to 1.5×) so the dog, snacks and HUD are big enough to read; menus stay full size. Put your right thumb down anywhere on the right half of the screen and slide to move (a joystick appears under it). Small see-through round buttons sit bottom-left, over the game: **SNIFF** (top, glows when ready), **RUN** (nearest the edge), **SNEAK**, **BARK**, plus **BEG** in the Beg levels. Hold them like the keys. **Options → JOYSTICK** swaps the sides, and **PHONE ZOOM** turns the zoom off (both only show on a touch screen). **II** in the top corner pauses; on menus it becomes **✕** (back / no). Tap menu items, tabs and level tiles. On Choose Your Dog, tap the dog, tap either side of the difficulty or level row to change it, then **START!** In tug of war and the snake fight, two big ◀ ▶ pads fill the bottom: tap them in turn. All the hints and How to Play name the buttons instead of keys (pressing a real key switches back). For full screen: on iPhone/iPad use Share → **Add to Home Screen** (opens like an app, with a Harley icon; Apple doesn't allow full screen in a browser tab, in Safari or Chrome, so the title screen shows this tip there); Android goes full screen on the first tap. Progress is saved per device and browser. `js/touch.js` builds these controls: each one just sends the matching key press.

**Title screen:** **Continue Schmoop Quest** (once you've made progress) jumps straight into your furthest level with your last dog and difficulty (or the level picker once you've finished). **Begin New Schmoop Quest** starts again from level 1: after a "START OVER?" check it wipes your stars, unlocked levels, best scores and the pop-ups you've seen, but keeps your options. **Bedtime Story** appears once you've finished the game. **Options** has music and sound volume, screen shake on/off, **reduced motion** (no shake, freeze-frames, slow-motion or screen wipes), and on a touch screen **joystick** side and **phone zoom**. Settings are saved.

**First-time pop-ups:** the first time you play each kind of game (Snack Hunt, Menace Run, Fetch, Beg, and the Tug of War and Snake Fight mini-games), the game waits while a card explains what it is, the goal, the keys and the rules. Press Enter for LET'S GO!

**How to Play** opens on **Controls**: every key drawn as a key cap, with your dog acting it out. The other tabs (two rows): The Goal, Snacks, Finding Snacks, Your Dog, Scoring, Dangers, Distractions, Places & Weather, Mischief, and Special Levels & Games. Up/down swaps rows.

**Choose Your Dog** screen: up/down picks a row (dog, difficulty, level); left/right changes it; Enter starts.

**Choose Level** (from the title screen): six pages of tiles (all 50 levels, plus the Bedtime Story), with your total stars at the top, each with a snapshot of the level, your best stars, and a padlock on levels you haven't unlocked yet. Each level number always builds the same layout, so the snapshot matches what you play, but the snacks, critters and cats are placed somewhere new every time you play it. Tiles also show your best round score for that level.

**The HUD:** the round panel (bottom-left; top-left on phones, out of the way of your thumb) has the big snack counter (e.g. `3 / 11`, "8 TO GO"), your score, the **combo** meter, and the RUN, SNIFF and SNEAK keys. Each snack you eat flies into the counter. The timer is at the top in the middle; level info and the menu keys are small along the top. The HUD hides behind the pause menu and results.

### The dogs
- **Harley** (black Staffy, white chest, green collar) is **Anxious**.
  - He sees danger coming: warning bubbles over nearby cats, critters, birds and bees.
  - Cats make him shiver at half speed for 3 seconds, and birds make him nervous (70% speed, 2 seconds).
- **Bobbin** (white Staffy, pink nose, pink collar, tongue out) is **Deaf**.
  - She never slows down near danger.
  - She gets no warnings, and she chases birds.

### Difficulty
| | Easy | Medium | Hard |
|---|---|---|---|
| Snacks | More | Normal | Fewer |
| Cats | Fewer, never follow you | Normal, follow when close | Twice as many, hunt you from far away |
| Distractions | Fewer | Normal | More |

### The 50 levels
Every place comes in variants: **outdoors** (Park, Veggie Garden, Pool Yard, Dog Park, Beach, Market) can be sunny, rainy or night; **indoors** (House, Garage, Vet, Pet Store) can be day or night. There are **50 levels** in five sections of ten: 30 snack hunts (every place and variant, plus seven harder "II" remixes with new layouts), 8 Menace Runs, 6 Fetch and 6 Beg levels. Each place shows up in daylight before its rainy and night versions, and the levels get busier as you go.

1 Park · 2 Veggie Garden · 3 House · **4 Menace Run: Park** · 5 Pool Yard · 6 Dog Park · **7 Fetch: Park** · 8 Garage · **9 The Market (beg)** · 10 Beach
11 Vet · **12 Menace Run: Veggie Garden** · 13 Pet Store · 14 Rainy Park · **15 Fetch: Beach** · 16 House at Night · **17 The Family Party (beg)** · 18 Rainy Veggie Garden · **19 Menace Run: Pool Yard** · 20 Park at Night
21 Rainy Pool Yard · **22 Fetch: Dog Park** · 23 Garage at Night · **24 Menace Run: Beach** · 25 Veggie Garden at Night · **26 The Rainy Market (beg)** · 27 Rainy Dog Park · **28 Menace Run: Rainy Park** · 29 Vet at Night · 30 Beach at Night
**31 Fetch: Rainy Park** · 32 Park II · **33 The Party at Night (beg)** · 34 Pool Yard at Night · **35 Menace Run: Dog Park** · 36 Rainy Beach · 37 Veggie Garden II · **38 Fetch: Rainy Beach** · 39 Dog Park at Night · **40 The Night Market (beg)**
41 Pet Store at Night · **42 Menace Run: Rainy Pool Yard** · 43 Garage II · **44 Fetch: Park at Night** · 45 Beach II · **46 Market II (beg)** · 47 Dog Park II · 48 Pet Store II · 49 Vet II · **50 Menace Run: Dog Park at Night**

**The ending:** finish level 50 and pick **THE END: TIME FOR BED** for a bedtime story: your dog trots in, curls up in its bed by the fire and falls fast asleep ("SCHMOOP QUEST COMPLETE! WHAT A BIG DAY I'VE HAD. I CAN'T WAIT TO DO IT ALL OVER AGAIN TOMORROW."), with your total stars out of 150. After that, the title screen's **Bedtime Story** and the last tile in Choose Level play it again.

(Saved progress from older versions moves across automatically: each level's stars go to the matching level, repeats of the same place keep their best, and progress past the end unlocks all 50. The ordinary places keep the same map layouts they had before.)

### Special levels
- **Menace Run** (Park, Veggie Garden, Pool Yard, Beach, Dog Park, some rainy or at night): 30 seconds of zoomies that never run out, on a map stuffed with 40-90 things to smash (bins, wheelie bins, cones, pot plants, gnomes, boxes, garden chairs...). Every crash scores, with the combo; run into a stick or a shoe and your dog grabs it and shakes it about. It's a race: the other dog (Bobbin if you're Harley, Harley if you're Bobbin) is smashing things too, and at the Dog Park every dog is a menace. Stars: 10 / 18 / 28 crashes, or 3 stars for finishing first with 18+. Fast music (176 BPM, faster in the last 5 seconds).
- **Fetch** (Park, Beach, Dog Park, some rainy or at night): the owner asks "DO YOU WANT THE BALL?", spins round three times and flings it anywhere in the park (sometimes into a bush). Race the other dog to it (an arrow shows where it went for a second, then sniff to find it), grab it and bring it back to her. Bump into whoever's carrying it to steal it. 5 throws, 25 seconds each. Stars: 1 / 3 / 4+ balls. At the **Dog Park** every dog chases the ball: any of them can grab it or steal it, a park dog that gets it runs off and drops it after a few seconds, and the results name the **ball hog**.
- **Beg** (The Market, rainy and at night, Market II, The Family Party and The Party at Night): hold **W** next to someone and your dog sits, then begs on its back legs while a cute meter fills. Some say "OH LOOK HOW CUTE YOU ARE! HERE YOU GO!" and drop a snack; others say "NO WAY, THIS IS MY PIZZA!" (whatever they're eating), and plenty can't make up their mind ("HMM... MAYBE LATER?", a ? over their head): ask them again a few seconds later and they decide. Otherwise each person can be begged once (a Y or X over their head). Get 10 snacks before time runs out (100 / 90 / 75 seconds). Now and then someone leaves a plate on a table: sneak up and pinch it (it counts!), but if anyone sees you it's "HEY! BAD DOG!" (-5 seconds and nobody nearby will feed you for a while). The market has food stalls, food trucks (hot chips, tacos, ice cream, pizza), picnic tables, bunting, and a seagull that swoops for snacks you haven't picked up yet.
- Menace Run and Fetch need 1 star to unlock the next level.
- In the rain, special levels start with the raincoat on (no raincoat hunt). At the rainy market, shoppers carry umbrellas; the night market is strung with lights; Market II is packed, stingier, and the seagull's hungrier.

- **Park:** treats in the open and hidden in bushes, plus a golden bone.
- **Veggie Garden:** 28 raised beds of carrots, tomatoes, peas, strawberries, corn, eggplant and cucumber, ripening at random (grab them before they rot). Arches over the paths, trellises, pots and urns, a fountain plaza with a Staffy statue, benches, a wheelbarrow, a bird bath and a scarecrow. It also has a **beehive**: its honey is a bonus treat, but mind the bees. The **first sting** makes your dog YELP!: 20% speed for 5 seconds, the sniff bar all but emptied, a hard screen shake and a red flash (and 2.5 seconds' grace before another can sting). A **second sting** sends you to the vet and ends the level; a bee by the clock shows you've had your warning.
- **Pool Yard:** a deck with the BBQ (sausages and burgers), table and loungers; the pool with a ring and a lilo (sprint or zoom into it and you fall in); a lawn with a round table under an umbrella, a dog house, a shed, a rotary clothesline, a mower, gnomes, big shade trees; and **sprinklers** that tick, then spray every 30 seconds.
- **Tug of war (backyards and the dog park):** about half the time the other dog waits on the lawn with a rope, and at the dog park 1-2 dogs always bring one (each with its own strength). Walk up to start, then tap Left and Right in turn to pull the knot your way (about 10 taps a second on Medium). Watch for the GRRR and crouch: tap fast to brace, or a big YANK pulls the knot back. Win: +75 points and +5 seconds. Lose: no penalty.
- **House, Garage, Vet:**
  - **House:** kitchen with an island and dining table, lounge with sofa, armchairs, bookshelves and lamps (they glow), bedroom, bathroom and laundry.
  - **Garage:** two cars, a workbench, tall shelving, box piles, a fridge, a sink, a mower and a hose. By day the roller door's up and the lights are on; at night it's dark, lit by ceiling lights (some flicker).
  - **Hazards:** sleeping household cats (sneak past, don't run!), a robot vacuum, slippery spills and oil, and the vet with her thermometer.
  - **Distractions:** mice, bugs, toys and the TV.
- **Dog Park:** an agility course (jumps, a tunnel to run through, weave poles, an A-frame). Other dogs (red, blue, fawn and chocolate Staffies) wander about: if one reaches you it stops to play, holding you up for a moment, and now and then one sniffs out a snack and eats it (the snack turns up again somewhere else a few seconds later).
- **Beach:** most snacks are buried. Stop on a sand mound and your dog digs; sniffing shows which mounds really have snacks (the rest are shells). Big waves wash up the sand every so often and soak you; crabs scuttle off to the water when chased; seagulls fly over. **Sandcastles** dot the sand: run into one to smash it, and it might hide a snack, a crab (which bolts, and your dog can't resist chasing it), or just sand. **Beach-goers** (by day; just a hardy few in the rain, nobody at night): swimmers out past the waves, sunbakers on their towels (trot right over them: "OH! SILLY DOG!"), readers under the umbrellas, and kids building sandcastles. Flatten a kid's castle and they burst into tears while a grown-up asks "OH! WHOSE DOG IS THAT?" (just for fun).
- **Pet Store:** aisles of shelves, fish tanks, birds and a dog wash. Staff patrol the aisles and see what's in front of them: if one spots you they chase you, and if they catch you it's BATH TIME (carried to the dog wash, -3 seconds, soaked). Break their line of sight to get away.
- **House at Night:** dark and moonlit, the owner asleep in bed and every cat asleep. Running, zoomies, barking at distractions and squeaky toys fill the NOISE meter (standing still lets it settle). Loud noise wakes nearby cats, and a full meter wakes the owner, which ends the round.
- **Night outdoors:** dark and moonlit, with lamp posts along the paths. No butterflies: moths, and fireflies glowing in the dark (chase-able). Birds and lizards are asleep, frogs are out. Garden: porch light and fairy lights over the patio, and the **bees are asleep** (the honey is safe). Pool Yard: the pool lights glow. Dog Park: only a few dogs. Beach: more crabs. No noise meter outdoors.
- **Night indoors:** lamps off, a NOISE meter.
  - **Garage at Night:** a full meter wakes the owner (the round ends).
  - **Vet at Night:** the vet's gone home; the pets in carriers are asleep (noise wakes them, and they yap, making more noise). A **janitor** mops the floors, leaving slippery wet patches. Noise brings him over to look; a full meter sets him running; and he spots you if you get close (he's busy mopping, so not from far). Caught: "SHOO!", a slosh of mop water, -3 seconds, back to the door.
  - **Pet Store at Night:** closed; a **security guard** with a torch patrols the aisles (sees a long way in front, less if you sneak). Noise and crashes bring them over. Caught: "OUT YOU GO!", -3 seconds, back to the door.
- **Rain:**
  - More mud (slippery, and it leaves paw prints), fewer cats, frogs instead of lizards, fewer birds.
  - Rain slows your dog until you find the **raincoat**.

### Finding snacks
Each place has more snacks the more ground there is to cover (indoors is a little denser), and mixes these ways of finding them. A sniff (S) makes every hiding place with a snack in it glow; empty ones don't.
- **On the ground**, and **trails** of 3-4 of the same snack in a row (a dropped bag): eat them in a row for a big combo.
- **In cover:** under bushes and tables.
- **Up on tables:** coffee tables, side tables, the dining table, kitchen island, bedside tables, the vet's desk and exam tables, the checkout, the patio table. Walk up beside the table to grab it.
- **Buried:** stop on a mound to dig. Every outdoor place has some (soil mounds on grass, sand at the beach), and some are empty.
- **Knock over:** hold A and charge into a bin, box pile, paint tins, pet-food bags, an esky or some laundry baskets. CRASH: it tips over and a snack might fall out, and from then on you (and everyone else) can walk straight through the mess. It's loud: sleeping cats nearby wake up, it fills the night-time noise meter, and in the pet store a staff member comes to see what happened.
- **Rummage:** stand still beside a sofa, armchair, dog bed, toy box, shoe rack, hose pile, toolbox, magazine rack or some laundry baskets, and your dog searches it (quietly).
- **Veggie Garden:** about half the snacks are produce picked from the beds; the rest are found the ways above.

### Mischief (naughty but fun, bonus points)
None of this is needed to finish a level, but each naughty act scores bonus points (full points the first time in a round, less for repeats) and shows on the results card as `MISCHIEF +85: ...`.
- **Knock it over:** charge (hold A) into pot plants, urns, gnomes, bird baths, sandcastles (stomped flat), coat racks, floor lamps, bins and boxes. The garden statue only goes over with zoomies.
- **Raid things:** stand still beside the BBQ and your dog rears up at the grill (a sausage, or "TOO HOT!"); nose open the esky; your own dog house always has a chew in it; rummage the wardrobe, dresser, wheelbarrow and beach towels; the fridge won't open ("NICE TRY.").
- **Tangle the hose:** dig at a hose pile or hose reel and it unravels into a tangled mess that trips you up for the rest of the round.
- **Smells:** 1-3 per level (fox poo, a dead fish, bin juice...). They're faint wisps until you sniff. Walk onto one and your dog rolls in it belly up, then becomes a **STINKY DOG** for 10 seconds: cats keep away and won't swipe.
- **Ducks:** on rainy outdoor levels a mum and ducklings waddle about. Walking past is fine; run or bark at them and they scatter, quacking.
- **Presents:** pick up a stick (outdoors) or a shoe (from the shoe rack) and carry it to the owner at home time. Eating a snack makes you drop it for a moment.
- **Mud and puddles:** stand still in mud to roll in it (a mud-covered dog leaves big paw prints); run through puddles in the rain to splash.
- **Bounce on the bed:** run onto the owner's bed (the daytime house): boing, boing, muddy paw prints on the duvet.
- **Drink:** stand at a water bowl, water station or bird bath to refill your RUN bar (useful, not naughty).

### The noise meter (quiet levels at night)
Noise hangs in the air: after any sound the meter holds for 2.5 seconds, then settles slowly (about 25 seconds from full). Walking adds a little, running a lot, squeaky toys and barks +0.14 each, crashes +0.25. Sneaking makes none. Zoomies are kept quieter here ("ZOOMIES! (SHHH!)"): on their own they can't fill the meter past 85%, and a single crash can't fill it on its own either. The first time the meter fills, the owner **stirs** ("MMPH...?") and the meter drops back to 70%, with OWNER STIRRING! on the HUD; let it settle below 20% and she's back to sleep. Fill it again while she's stirring and she wakes up.

### Snacks, hazards and distractions
- **Snacks** count toward the level target. Eat them within 3 seconds of each other for a **Schmoop combo**: the 2nd is worth x2, the 3rd x3, up to x5. Distractions, cat swipes, stings, soakings, a pool splash and getting caught all break the combo.
- **The last snack** gets a heartbeat while it's the only one left, then slow-motion, a camera punch-in and confetti. **Cheese and pizza** are rare: they set off **zoomies** (5 seconds of super speed; you steer but can't stop; costs half your stamina).
- **Poop break:** every 10 snacks your dog stops for 4 seconds. The poop stays there, and stepping in it slows you down.
- **Chases:** frogs hop, lizards dart, mice scurry along walls and beetles crawl about (sometimes across your path). Get close and they bolt: "WHAT'S THAT?" and your dog chases them, barking, for up to 5 seconds. Moths and butterflies flutter round flowers and bushes (4 second chase).
- **Birds:** clip a corner, cross the screen, swoop in and climb away, or flit from tree to tree and perch. Only low-flying birds close by bother the dog; some still burst out of bushes.
- **Fixations:** toys (pounce and play) and the TV (sit and watch) hold your dog's attention for 5 seconds.
- **Snake (very rare, outdoors):**
  - The mini-game: alternate Left/Right to fill the bar within 6 seconds. Harley barks it away; Bobbin grabs it and shakes it.
  - Win: +100 points and +5 seconds. Lose: **bitten!** You lose 8 seconds and limp (slower) for 6 seconds, but the round carries on.

### End of a round
When time runs out, or as soon as you've found everything, the owner pops in and calls your dog home. The results screen shows:
- **snacks #/#**, **%**, and **stars** (50% / 75% / 100%), stamped in one at a time, with your dog beside the card
- a **recap**: your best combo, where your time went (e.g. `CATS 6S - FROG 5S - POOP 4S`), and how many snacks you missed and where they were (buried, in furniture, in cover, on tables)
- **Replay Level**, **Continue to Next Level** (needs 50%), or **Return to Menu**

A vet trip (two bee stings) is a fail: no stars, and you can't continue.

Saved in this browser: best score, unlocked levels, best %, stars and round score per level, last dog, last difficulty, options.

If you leave the dog alone for 6 seconds it sits down; after a while longer it nods off.

## Project layout

```
index.html         page shell; loads the scripts in order (plus phone meta tags and the app manifest)
style.css          centres the canvas and keeps pixels crisp; styles the on-screen touch controls
manifest.json      "Add to Home Screen" app details; icon-192.png / icon-512.png are its Harley icon
js/art/painter.js  pixel painter: shapes auto-shaded with colour ramps and outlined
js/art/font.js     5x7 bitmap font and drawText()
js/art/dogs.js     Harley & Bobbin: the DOGS table (names, colours, traits) and the code that slices
                   the dog sprite sheets into animations
js/art/dogsheets.js  the dog sprite sheets as data (generated: don't edit by hand)
js/art/people.js   the owner, the vet, pet store staff, and the beg-level guests and shoppers
js/art/animals.js  cats (incl. sleeping), frog, lizard, bird, moth, bee, mouse, beetle, snake, pet carriers
js/art/items.js    snacks, toys, poop, honey, raincoat, crop plants, stars
js/art/props.js    every prop and piece of furniture, drawn in three-quarter view with materials and detail
                   (cars, shelving, sofas, BBQ, fountain, statue, trellises...) + the robot vacuum
js/art/terrain.js  ground tiles (grass, paths, water, mud, beds, deck, pool, floors, walls...) and
                   tree/bush styles; pre-renders each level's ground
js/sprites.js      builds every sprite once at load
js/touch.js        on-screen controls for phones and tablets (joystick, buttons, tug pads, pause), which
                   send the same key presses as the keyboard; game.js tells it which screen is showing
js/audio.js        sound effects, the rain loop and the chiptune music (sunny, rainy, spooky garage, cosy
                   indoors, menu, mini-games), all synthesised in code (no audio files)
js/world.js        the 50 levels, difficulty table, snacks, a generator for each place (plus the market), and the special-level dressing (Menace Run, Fetch, Beg)
js/game.js         game loop, input, all gameplay systems, menus, HUD and screens
art_src/           source art for the dogs: Sprite Fusion frames, and build_dog_sheets.py, which
                   lines the frames up, recolours Bobbin, adds the raincoat and bandage, and writes
                   js/art/dogsheets.js (run: python3 art_src/build_dog_sheets.py)
```

The dogs are pixel art from Sprite Fusion, animated: trotting, sprinting (running, zoomies, chases),
creeping (when something slows them), sniffing, nervous (Harley near danger), sitting happily
(playing and at home time), squatting for the poop break, and walking toward and away from the camera.
In the rain, once the raincoat is found, the dogs switch to their own raincoat sprites.

The game draws at 800x450 with 32px tiles and scales to fill the window. Apart from the dogs (see above), all art is drawn in code: each sprite is built from shapes (ellipses, capsules, polygons) that the painter shades with a 6-step colour ramp and outlines. Scripts are plain `<script>` tags rather than ES modules, because modules don't load from `file://`.

## Online (GitHub Pages)

The game lives in a GitHub repository (https://github.com/Bushy13/schmoop-quest) and GitHub Pages serves it at https://bushy13.github.io/schmoop-quest/. Every push to the `main` branch updates the site about a minute later; friends just refresh. The workflow: make changes and test locally, commit (a saved snapshot with a message), then push (upload). The repo's **Commits** page has the full history, **Settings → Pages** shows the live link, and the **Actions** tab shows each deploy. `art_src/spritefusion/asset_ids.txt` is kept out of the repo (see `.gitignore`).

## Ideas for next steps
- A "What's that?" temptation window (give in to a distraction, or resist)
- A playable first walk that teaches the controls
- An itch.io page for the game
