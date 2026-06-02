import { PursuitKey } from './pursuits.config';

export interface PursuitLoreItem {
  tagline: string;
  body: string;
  emblemKey: string;
}

export interface ArchetypeLoreItem {
  short: string;
  long: string;
}

export const pursuitLore: Record<PursuitKey, PursuitLoreItem> = {
  gastronomy: {
    tagline: "Every meal is a quest worth taking.",
    body: "The Gourmand reads a city through its flavors. Where others see a street, they see the smoke off a grill, the line outside a counter that's been there forty years, the dish you can only get on a Tuesday. Their power is appetite turned into attention — they remember the meal and the people across the table. To level Gastronomy is to keep saying yes to the table: new kitchens, old favorites, the snack run at 1 a.m. Fuel for the body, excuse for the gathering.",
    emblemKey: "gastronomy"
  },
  wilds: {
    tagline: "The map ends; the Ranger keeps walking.",
    body: "The Ranger is most themselves where the pavement gives out — trailheads, shorelines, the park at golden hour. They trade comfort for air and altitude, and they bring people with them who'd never have gone alone. Their power is endurance and a good sense of where the light falls. To level the Wilds is to choose the harder, greener route on purpose, and to know the difference between being lost and being somewhere new.",
    emblemKey: "wilds"
  },
  revelry: {
    tagline: "The night is long, and the Reveler knows its rooms.",
    body: "The Reveler turns an ordinary evening into a story people retell. They feel the tempo of a room, know when to move the group on, and never let a good night die quietly. Their power is momentum — they pull others into the moment and keep it alive. To level Revelry is to show up when the calendar says stay home, to dance badly and gladly, and to be the reason a Tuesday becomes a memory.",
    emblemKey: "revelry"
  },
  athletics: {
    tagline: "Showing up is the first rep.",
    body: "The Contender measures the week in efforts, not intentions. Courts, trails, climbing walls, the early run nobody else wanted — they meet the body where it is and ask a little more. Their power is consistency that quietly compounds. To level Athletics is to keep your standing appointment with effort, to compete without contempt, and to learn that the hardest opponent and the best teammate are usually the same person: you.",
    emblemKey: "athletics"
  },
  lore: {
    tagline: "Knows the story behind the thing.",
    body: "The Loremaster collects worlds — films, exhibits, novels, the deep trivia nobody asked for and everybody enjoys. They're the friend who explains why the building looks like that, who turns a museum into a heist of ideas. Their power is curiosity with a memory attached. To level Lore is to keep feeding the mind in public — matinees, galleries, game nights — and to share what you find rather than hoard it.",
    emblemKey: "lore"
  },
  wayfaring: {
    tagline: "Always one more place over the horizon.",
    body: "The Wayfarer is allergic to the usual radius. Day trips, road trips, the neighborhood three towns over they've been meaning to try — distance is just an invitation. Their power is restlessness pointed somewhere good. To level Wayfaring is to widen the circle you call 'nearby,' to treat the unfamiliar as the point rather than the risk, and to come back with somewhere to recommend.",
    emblemKey: "wayfaring"
  },
  fellowship: {
    tagline: "The plan was never the point. You were.",
    body: "The Companion keeps the group a group. They remember birthdays, send the 'still on for Thursday?' text, and turn a quiet hang into the part of the week people protect. Their power is loyalty made into logistics — showing up, again, for the same beloved few. To level Fellowship is to tend the friendships most people let drift, and to understand that consistency is affection.",
    emblemKey: "fellowship"
  },
  discovery: {
    tagline: "First to the spot nobody knew was there.",
    body: "The Pathfinder has a nose for the undiscovered — the unmarked door, the view off the side trail, the place that isn't on anyone's list yet. They don't just find it; they put it on the map for everyone after. Their power is the instinct to wander slightly off-route. To level Discovery is to nominate, to verify, to be the first check-in — to leave the world a little more charted than you found it.",
    emblemKey: "discovery"
  }
};

export const archetypeLore: Record<string, ArchetypeLoreItem> = {
  gastronomy: {
    short: "A devoted eater and gatherer of tables. If there's a new place or an old favorite, they're already booking it.",
    long: "When one pursuit burns brightest and it's Gastronomy, you get a true Gourmand — someone whose social life orbits the table. They're the friend with the list: the spot for bad days, the spot for celebrations, the hole-in-the-wall worth the drive. Eating, for them, is never just eating; it's how they say I'm glad you're here. Pure Gourmands tend to host the dinners, plan around the meal, and remember what you ordered last time. Their gift to a crew is simple and profound — they make sure everyone's fed, together, often."
  },
  wilds: {
    short: "Happiest off the pavement. Will absolutely text you 'let's catch the sunrise' at an unreasonable hour.",
    long: "A pure Ranger lives for the outdoors with an intensity that pulls others outside too. Trails, water, open sky — they need the air the way other people need a feed to scroll. They're the one who already knows the hike, packed the extra water, and chose the route with the better view. Pure Rangers turn 'we should get outside more' from a guilt into a plan. Their gift to a crew is altitude and perspective — they get everyone out of the four walls and into somewhere that makes the week feel bigger."
  },
  revelry: {
    short: "The heartbeat of the night out. Where they go, the good time tends to follow.",
    long: "A pure Reveler is the one who keeps the night alive — the friend who knows the place with no cover, reads the room's energy, and somehow turns four people standing around into an actual evening. They don't party at you, they party with you, and they're generous with the spotlight. Pure Revelers protect the social ritual most adults quietly let lapse: going out, on purpose, with people you like. Their gift to a crew is momentum — the reason the group still makes memories instead of just plans."
  },
  athletics: {
    short: "Trains, plays, repeats. Will turn 'we should hoop sometime' into a standing weekly thing.",
    long: "A pure Contender organizes their life around movement and showing up for it. Pickup games, the gym, the climb, the run — they meet effort as a friend and invite you along. They're not the sideline type; they want a teammate, a rival, a reason to lace up. Pure Contenders make fitness social instead of solitary, and they hold others to the appointments they'd skip alone. Their gift to a crew is energy and accountability — they keep the body in the friendship, not just the brunch."
  },
  lore: {
    short: "Endlessly curious. Turns a movie night or museum trip into the best conversation of the week.",
    long: "A pure Loremaster is the crew's deep well — films, books, exhibits, the trivia that makes a dull wait fly by. They're the one who picked the screening, knows why the show matters, and can make you care about something you'd never have looked twice at. They consume culture and then, crucially, share it. Pure Loremasters keep a friend group thinking and discovering rather than just scrolling. Their gift to a crew is depth — they make hanging out feel like it grew you a little."
  },
  wayfaring: {
    short: "Constantly widening the map. 'It's only an hour away' is their love language.",
    long: "A pure Wayfarer refuses to let life shrink to a five-block radius. They're the one proposing the day trip, the new neighborhood, the 'let's just drive and see.' Where others feel friction in the unfamiliar, they feel oxygen. Pure Wayfarers drag a crew out of its ruts and into new ground, and they return with recommendations that become everyone's favorites. Their gift is horizon — they make the world feel larger and more available than it did before they suggested going."
  },
  fellowship: {
    short: "The glue. Remembers the plans, sends the text, keeps everyone actually together.",
    long: "A pure Companion is the reason a friend group survives adulthood. They're not chasing novelty or the spotlight — they're tending the bond itself: the check-in text, the 'you free Thursday?', the showing-up that nobody else organized. They measure a good week in people seen, not boxes ticked. Pure Companions do the quiet, unglamorous work that holds a crew together long after everyone got busy. Their gift is continuity — they make sure the people you love don't quietly drift away."
  },
  discovery: {
    short: "Always finds the spot first. Has a sixth sense for the place that isn't on anyone's list yet.",
    long: "A pure Pathfinder is wired to wander off the obvious route. They find the unmarked door, the better view, the place before it's a place — and then they share it, putting it on the map for everyone after them. They're the first check-in, the gem nominator, the friend whose recommendations feel like secrets. Pure Pathfinders expand a crew's whole sense of what's out there. Their gift is the new — they make sure the group never runs out of undiscovered ground."
  },
  wanderer: {
    short: "Just getting started. Their legend hasn't been written yet.",
    long: "Every legend starts as a Wanderer. You haven't logged enough quests yet for a calling to show — and that's the fun part. Check in, explore, gather with your crew, and your pursuits will start to tilt. Lean hard into one and you'll become a pure class; balance two and you'll forge a hybrid all your own. The map is blank. Go make some marks on it."
  },
  
  // Hybrids
  "athletics+discovery": {
    short: "Treats the city like terrain. Finds new routes, courts, and crags nobody else clocked.",
    long: "The Freerunner fuses the Contender's drive with the Pathfinder's nose for the new. They don't just work out — they go find where to do it: the secret stair climb, the off-grid trail, the court across town with the good rim. Movement is their way of exploring and exploring is how they stay moving. In a crew they're the one turning a normal jog into an expedition, the reason 'let's just walk' becomes 'how did you find this?'"
  },
  "athletics+fellowship": {
    short: "Rallies the squad and makes sure everyone plays. The standing-game organizer.",
    long: "The Captain pairs the Contender's love of effort with the Companion's loyalty, and the result is the person who keeps the team a team. They run the group chat for the weekly game, make sure the slow folks still get invited, and treat showing up as a promise. They compete hard but never at the cost of the bond. In a crew they're the heartbeat of every recurring activity — the reason 'we should do this more' actually becomes a habit."
  },
  "athletics+gastronomy": {
    short: "Earns the feast and shares it. Trains hard, eats well, brings the post-game food.",
    long: "The Provisioner balances the Contender and the Gourmand — effort and reward, in that order. They're the one who runs the trail and knows exactly where breakfast is after, who believes a hard session is best finished at a good table. Discipline and indulgence aren't enemies to them; they're a rhythm. In a crew they make the active life feel generous instead of punishing — there's always a meal waiting at the end of the work."
  },
  "athletics+lore": {
    short: "Studies the game as hard as they play it. The one who actually knows the rules.",
    long: "The Tactician fuses the Contender's competitiveness with the Loremaster's depth. They don't just show up to play — they know the history, the strategy, the why behind the win. Fantasy drafts, deep dives, the breakdown after the match: this is their joy. In a crew they raise the level of every competition, turning a casual game into something with stakes and stories. They make 'good at it' and 'fascinated by it' the same thing."
  },
  "athletics+revelry": {
    short: "Goes hard at everything — the game and the afterparty. Pure high-energy.",
    long: "The Gladiator marries the Contender's intensity to the Reveler's appetite for a great night. They bring the same full-send energy to the court and the dancefloor, and they're usually the one organizing both. Effort and celebration are two halves of the same drive: earn it, then enjoy it loudly. In a crew they're the engine — the person whose sheer wattage makes the whole day, from the morning game to the late night, feel like an event."
  },
  "athletics+wayfaring": {
    short: "Will travel for the activity. Races, climbs, and pickup games in new places.",
    long: "The Globetrotter blends the Contender with the Wayfarer — effort that refuses to stay local. They're drawn to the race in another city, the climb that requires a road trip, the idea that the best way to see a place is to do something physical in it. In a crew they expand the playing field, literally — they're the reason 'let's go somewhere' and 'let's do something active' become the same plan, and the reason the photos are always somewhere new."
  },
  "athletics+wilds": {
    short: "Outdoor effort specialist. Hikes that are basically training, with a view as the reward.",
    long: "The Mountaineer fuses the Contender's drive with the Ranger's love of wild places. Pavement bores them; they want the trail with the elevation, the climb with the summit, the swim across the cove. Effort and nature are inseparable — the harder route is the better one because of where it ends. In a crew they're the one who makes 'getting outside' genuinely demanding and genuinely worth it, turning a walk into an achievement and a viewpoint into a trophy."
  },
  "discovery+fellowship": {
    short: "The friend who's always taking the group somewhere new and good. People follow their lead.",
    long: "The Lodestar fuses the Pathfinder's instinct for the undiscovered with the Companion's devotion to the people. They don't explore to get away from others — they explore for them, bringing the crew along to every new find. They're the guiding star of the group: when nobody knows what to do, the Lodestar already has a spot, and it's somewhere none of you had heard of. Their gift is the rare one of making discovery a shared act. The group is never bored and never scattered."
  },
  "discovery+gastronomy": {
    short: "Has a sixth sense for the food spot nobody's found yet. Eats off the beaten path.",
    long: "The Truffle Hunter combines the Pathfinder's nose for the hidden with the Gourmand's devotion to flavor — and the result is uncanny. They find the unmarked kitchen, the pop-up before the line, the dish you'll be telling people about for months. Eating, for them, is exploration; the menu is a map. In a crew they're the one whose recommendations feel like secrets handed down, the reason the group's food stories always start with 'okay so nobody knows about this place yet.'"
  },
  "discovery+lore": {
    short: "Uncovers the hidden and the obscure. Knows the secret history of everywhere you go.",
    long: "The Sleuth pairs the Pathfinder's love of the undiscovered with the Loremaster's hunger for knowledge. They don't just find new places — they find the story under them: the closed-down theater with the wild past, the mural nobody can explain, the trivia that turns a normal block into a mystery. In a crew they make exploring feel like investigating. Every outing with a Sleuth comes with a reveal, and the world ends up feeling deeper and stranger than it looked."
  },
  "discovery+revelry": {
    short: "Knows the spots that aren't on the map. Finds the secret bar, the underground set.",
    long: "The Nighthawk fuses the Pathfinder's instinct for the hidden with the Reveler's love of the night. While everyone else is checking the same listings, they've already found the unmarked door, the warehouse set, the rooftop that isn't advertised. Their nightlife is one layer deeper than everyone else's. In a crew they're the key to the city after dark — the friend who makes a night out feel like access to a secret, the reason the group's best stories happen where the maps go blank."
  },
  "discovery+wayfaring": {
    short: "Explorer in the truest sense. Always pushing into genuinely new ground.",
    long: "The Voyager is the Pathfinder and the Wayfarer combined — discovery without a leash on distance. They're not content to find the new spot across town; they want the new spot across the map, the trip that goes somewhere none of you have been. Theirs is the oldest adventuring instinct: over the next hill, just to see. In a crew they're the one who turns a free weekend into an expedition, expanding not just where the group has been but what it believes is reachable."
  },
  "discovery+wilds": {
    short: "Forges into untouched nature. Finds the trail before it's a trail.",
    long: "The Pathbreaker fuses the Pathfinder's drive to discover with the Ranger's love of wild places. They're drawn to the parts of the outdoors nobody's tamed yet — the unmarked route, the cove with no name, the overlook you have to earn. They don't follow trails so much as find them. In a crew they're the one taking everyone genuinely off-grid, the reason a hike becomes a discovery and the group's nature stories all start with 'there's no sign for it, you just have to know.'"
  },
  "fellowship+gastronomy": {
    short: "Feeds their people. The one whose place becomes everyone's kitchen and dining room.",
    long: "The Hearthkeeper joins the Companion's loyalty with the Gourmand's love of the table, and becomes the warm center of a friend group. Their home is the default gathering place; their cooking (or their reservations) is how they hold the crew together. Food and friendship are one thing to them — a full table is a happy family. In a crew they're the keeper of the flame in the oldest sense: the person who makes sure everyone is fed, welcome, and not alone, week after week."
  },
  "fellowship+lore": {
    short: "Runs the game night, the book club, the movie marathon. Gathers the group around a story.",
    long: "The Gamemaster fuses the Companion's devotion to the crew with the Loremaster's love of worlds — and becomes the friend who builds the recurring ritual. The campaign, the watch-party, the monthly club: they host it, prep it, and make sure everyone's included. They turn shared culture into glue. In a crew they're the architect of the inside jokes and the long-running arcs, the one who gives the group not just things to do but a story it's telling together over years."
  },
  "fellowship+revelry": {
    short: "Rallies everyone out and makes sure no one's left behind. The social organizer-in-chief.",
    long: "The Ringleader pairs the Companion's loyalty with the Reveler's love of a great time, and the result is the person who actually gets the group out the door. They send the invite, pick the place, and make sure the quiet friend feels included in the loud night. Theirs is celebration with a conscience — a party where everyone's accounted for. In a crew they're the engine of the social calendar, the reason the group still gathers in numbers instead of drifting into one-on-one texts."
  },
  "fellowship+wayfaring": {
    short: "Steers the crew's adventures. The one who plans the trip everyone actually takes.",
    long: "The Navigator fuses the Companion's care for the group with the Wayfarer's pull toward new places — and becomes the friend who turns 'we should go somewhere' into a booked itinerary. They handle the logistics nobody else will, keep the group moving, and make sure the trip happens instead of evaporating in the chat. In a crew they're the reason the big plans become real memories: the person holding the map and counting heads, so everyone gets there and everyone gets home."
  },
  "fellowship+wilds": {
    short: "Your ride-or-die for the outdoors. Makes nature a group thing, never a solo grind.",
    long: "The Trailmate combines the Companion's loyalty with the Ranger's love of the wild — the friend who'd never let you hike alone. They bring the crew outside and keep it together out there: the one who waits at the top, packs the extra snack, picks the route everyone can manage. For them the outdoors is a place to deepen the bond, not escape it. In a crew they make nature accessible and shared, turning 'I'd love to but I won't go alone' into a standing weekend plan."
  },
  "gastronomy+lore": {
    short: "A cultured palate. Treats food, art, and history as one big appetite.",
    long: "The Connoisseur fuses the Gourmand's love of flavor with the Loremaster's depth, and approaches the world as something to be appreciated. They know why the dish is made that way, the history of the room you're eating in, the craft behind the thing. Taste, for them, is intelligence applied to pleasure. In a crew they elevate every outing — a meal becomes an education, a night out becomes a curated experience. They make refinement feel generous rather than snobbish, always eager to share what they know."
  },
  "gastronomy+revelry": {
    short: "Lives well and loudly. Believes a good meal and a good night are the same project.",
    long: "The Bon Vivant — 'one who lives well' — joins the Gourmand's love of the table with the Reveler's love of the night. For them, pleasure is a craft: the long dinner that becomes the late night, the celebration that needs both a great meal and great company. They don't do things halfway. In a crew they're the patron saint of the good time, the one who insists life is meant to be savored and then proves it, turning ordinary evenings into the kind people describe as 'we really lived that night.'"
  },
  "gastronomy+wayfaring": {
    short: "Chases flavor across the map. Will drive two hours for the right meal.",
    long: "The Spice Trader fuses the Gourmand's devotion to food with the Wayfarer's itch to roam — a culinary explorer in the oldest tradition. Distance is no obstacle to a great meal; the road trip is the menu. They collect dishes the way others collect souvenirs, and the unfamiliar cuisine is the whole reason to go. In a crew they turn travel into a feast and a feast into a reason to travel, always returning with a flavor and a place the group now has to try."
  },
  "gastronomy+wilds": {
    short: "Finds and eats off the land. Campfire cook, picnic planner, outdoor-feast specialist.",
    long: "The Forager joins the Gourmand's love of flavor with the Ranger's love of the wild — the friend who packs the good food for the trail and knows the orchard, the beach where you can grill, the spot worth hauling the cooler to. For them a meal tastes better outdoors, and the outdoors is better with a meal. In a crew they fuse two of life's great pleasures into one plan, turning a hike into a picnic and a campsite into a kitchen. Nature, with snacks. Excellent snacks."
  },
  "lore+revelry": {
    short: "Music, performance, the storyteller of the night. Lives for the gig and the scene.",
    long: "The Bard fuses the Loremaster's love of culture with the Reveler's love of the night, and lands exactly where art meets celebration: concerts, theater, the open mic, the set you'll be talking about for years. They don't just attend culture — they perform their enthusiasm for it, pulling the crew into the experience. In a crew they're the one who finds the show, knows the band, and makes a night out feel like it meant something. Equal parts scholar and showman, joy with a soundtrack."
  },
  "lore+wayfaring": {
    short: "Travels for meaning. Museums, history, and the places worth crossing distance to see.",
    long: "The Pilgrim fuses the Loremaster's hunger for knowledge with the Wayfarer's pull toward the horizon — the friend who travels to learn, not just to relax. The historic site, the famous museum, the town with the story: these are their destinations. Distance is justified by significance. In a crew they give travel a deeper purpose, turning a trip into something you come back from changed by. With a Pilgrim, you don't just see new places — you understand them."
  },
  "lore+wilds": {
    short: "Reads the land like a book. Naturalist energy — knows the trees, the stars, the why.",
    long: "The Druid fuses the Loremaster's depth with the Ranger's love of the wild, and becomes the friend who makes nature legible. They know the names of the trees, the story of the canyon, which stars you're looking at and why. For them the outdoors isn't an escape from thinking — it's the richest subject there is. In a crew they turn a hike into a revelation, layering knowledge over landscape so the group doesn't just see the wild but understands it. Ancient wisdom, modern trailhead."
  },
  "revelry+wayfaring": {
    short: "Chases the scene city to city. The festival, the trip, the night out somewhere new.",
    long: "The Jetsetter fuses the Reveler's love of the night with the Wayfarer's wanderlust — celebration that refuses to stay home. The out-of-town festival, the weekend in a new city, the nightlife you can only find by going: this is their natural habitat. In a crew they raise the ceiling on what a good time can be, turning 'let's go out' into 'let's go somewhere and go out.' With a Jetsetter the party has a passport, and the best nights are always a little bit of an adventure."
  },
  "revelry+wilds": {
    short: "Bonfires, beach parties, open-air festivals. Brings the celebration outdoors.",
    long: "The Wildfire fuses the Reveler's love of celebration with the Ranger's love of the wild — the friend who takes the party where there's no roof. Bonfire on the beach, festival in the field, sunrise after the all-nighter outside: they marry good energy to open air. In a crew they're the reason the best nights don't happen in a venue at all, but somewhere with stars overhead and a fire going. Untamed and unforgettable — celebration with the wind in it."
  },
  "wayfaring+wilds": {
    short: "Blazes wild routes across regions. The long-haul outdoor adventurer.",
    long: "The Trailblazer fuses the Wayfarer's reach with the Ranger's love of the wild — outdoor adventure that thinks big. They're not content with the local trail; they want the multi-region trek, the road trip between national parks, the route that takes real planning. Distance and wilderness together are the whole appeal. In a crew they're the one with the ambitious outdoor plan, the reason the group's adventures get a little bolder and a little farther each year. They go where the trail hasn't been worn smooth yet."
  }
};
