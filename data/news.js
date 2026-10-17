/**
 * NEWS DATA - EDIT THIS FILE TO ADD/UPDATE NEWS
 * Each article will automatically appear on:
 *   - index.html  (latest 5, horizontal scroll)
 *   - news.html   (all articles, full page)
 *
 * HOW TO ADD NEWS:
 * 1. Copy one of the objects below
 * 2. Paste it at the TOP of the NEWS array (newest first)
 * 3. Fill in your details
 * 4. Save and done!
 *
 * FIELDS:
 *   id       - unique slug, no spaces (e.g. "patch-2-4-7")
 *   title    - headline
 *   summary  - short blurb shown on cards (1-2 sentences)
 *   content  - full article body (HTML allowed)
 *   tag      - one of: "Update" | "Event" | "Patch" | "Announcement" | "Community"
 *   date     - human-readable date string
 *   author   - author display name
 *   thumb    - emoji or leave "" for default
 */

const NEWS = [
	{
    id: "projectgatherwood",
    title: "Gatherwood Releases and Info",
    summary: "Gatherwood update info, links, and other info",
    content: `
      <p>Winterpixel never really announced Gatherwood, but the devs presumably finished the game since no further updates were made after it was put on all platforms on 9/18/2026.</p>
      <h3>Links to play the game</h3>
      <ul>
        <li><strong>(website)</strong> https://gatherwood.winterpixel.io/</li>
        <li><strong>(staging)</strong> https://farmer-staging.winterpixel.io/</li>
        <li><strong>(poki)</strong> https://poki.com/en/g/project-gatherwood?</li>
        <li><strong>(crazy games)</strong> https://www.crazygames.com/game/project-gatherwood-gou</li>
        <li><strong>(app store)</strong> https://apps.apple.com/au/app/project-gatherwood/id6808748210</li>
        <li><strong>(google play)</strong> https://play.google.com/store/apps/details?id=com.winterpixel.gatherwood</li>
      </ul>
      <h3>About the game</h3>
      <img src="ui/news/assets/gatherwood.png" alt="" style="width:30%;border-radius:8px; 0;" />
      <p>Gatherwood is a MMO style game where you play with other players in one large map that resets daily. Or at least used to, now instead of one large continuous map with many areas, you have to be of a certain level to get to each map. And each map only has 2 themes. But the game is decently fun and I bet devs tried out many different features in this game such as finding ways to update the game easier. There are many things to do in this game, fight enemies, fishing for rare fish in each area, discovering all items, upgrading tools, unlocking areas, upgrading your dorm, and even playing Soccer! I played this game while it was in development and I can say that this game is way more fun with other people. But even then, there is not many ways to talk with other players unfortunately. You CAN help others and communicate using emotes, you can drop items and go on expeditions together to explore the world and make it easier to collect gems.</p>
      <img src="ui/news/assets/gatherwood2.png" alt="" style="width:50%;border-radius:8px;margin:1rem 0;" />
      <p><strong>(Have fun playing!)</strong></p>
    `,
    tag: "Announcement",
    date: "October 15, 2026",
    author: "TarasKhan475",
    thumb: "📰"
  },
  {
    id: "pixelcommunityupdatev3",
    title: "Winterpixel Community Update 3!",
    summary: "Ui revamped and new cosmetics viewer tool!",
    content: `
      <h3>What is in this update?</h3>
      <p>You might have noticed that the entire front page got a slightly new look! But there is definitely more, tools page got a nicer look too! There is actually way more features that got added that I can barely summarize!</p>
      <h3>Changes</h3>
      <ul>
        <li><strong>Front Page redesigned with cooler banners</strong></li>
        <li><strong>New View Cosmetics tool added, you can view cosmetics of anyone easily!</strong></li>
        <li>Tools Page redesigned with a cleaner ui</li>
        <li>Account footer now looks cleaner with white non distracting color (got a lot of complaints on it being distracting! By the way I got a bit lazy on forums page footer color)</li>
        <li><strong>You can now choose from thousands of different tanks and colors as your pfp</strong></li>
        <li>Embedding articles now actually gives you real articles, and you can also now embed user stats because before there was a api error because of the new api restrictions devs set</li>
        <li>Pressing enter when typing ":happy" now actually enters the emoji instead of sending the message</li>
      </ul>
      <p><strong>you might have also noticed many new people on the site that is because I made a youtube ad for my site youtube.com/watch?v=qaOtQdeKL5M</strong></p>
    `,
    tag: "Update",
    date: "July 28, 2026",
    author: "TarasKhan475",
    thumb: "📰"
  },
  {
    id: "pixelcommunityupdatev2",
    title: "Winterpixel Community Update",
    summary: "Added friends manager tool, revamped tools page!",
    content: `
      <h3>Winterpixel Update V2</h3>
      <p>After a while of no updates, I finally finished many things! All of the changes are listed below!</p>
      <ul>
        <li><strong>Added RBR friends manager!</strong></li>
        <li>News ratings now work (you have to be logged in)</li>
        <li>Updated tools page to show only tools now</li>
        <li>Stats tool can now accept friend codes</li>
        <li>Added contact page</li>
      </ul>
      <p>Some planned features...</p>
      <ul>
        <li>Badges you can choose to show next to your username</li>
        <li>Clans possibly</li>
        <li>Finishing "About" page</li>
        <li>Adding the rest of the tools that exist on winterpixelcheats website</li>
        <li>Adding Gifs support and better moderation system</li>
        <li>Fix the guide creator so people can make guides more easily as well as the news creator</li>
      </ul>
    `,
    tag: "Update",
    date: "May 28, 2026",
    author: "TarasKhan475",
    thumb: "📢"
  },
{
    id: "rbryear4",
    title: "Rocket Bot Royale is now 4 years old!",
    summary: "Today, April 20, 2026, Rocket Bot Royale turns 4 years old!",
    content: `
      <p>Exactly four years ago today, April 20, 2026, Rocket Bot Royale officially turns four years old. The game first launched on this date across major platforms including Steam, Apple, and Android, marking the start of its growing community and evolving gameplay.</p>
      <p>Each anniversary has brought something new. For its first birthday (Season 20), the developers introduced a 4-player ranked mode along with special birthday cosmetics. The second birthday update added a new smoke bomb weapon, plus even more themed cosmetics. By the third anniversary, the game took on an Egyptian theme, continuing the tradition with fresh birthday cosmetics as well.</p>
      <img src="ui/news/assets/pink_tread-party.png" alt="Rocket Bot Royale party tread tank" style="width:10%;border-radius:8px;margin:1rem 0;" />
      <p>Now the question remains, will Season 54 be birthday themed to honor the fourth anniversary of Rocket Bot Royale?</p>
    `,
    tag: "Announcement",
    date: "April 20, 2026",
    author: "Colt",
    thumb: "🎂"
  },
  {
    id: "sdmUpdate",
    title: "Squads Deathmatch is Returning to 6 Teams and 20 Kills in Season 54",
    summary: "After player feedback in Season 53, Jordo confirmed Squads Deathmatch will return in Season 54 with 6 teams.",
    content: `
      The community finally got its answer in Season 53. Many players felt Squads Deathmatch had become stale and lacked the chaos it once had. After ongoing feedback, <strong>Jordo</strong> responded, confirming that in 
      Season 54, the mode will be “bumped” back up to 6 teams of 4 players, along with a 20-kill win condition to restore its fast-paced, chaotic feel
      <img src="ui/news/assets/SDMnews.png" alt="Squad Deathmatch Update message" style="width:40%;border-radius:8px;margin:1rem 0;" />
    `,
    tag: "Update",
    date: "April 19, 2026",
    author: "Colt",
    thumb: "📰"
  },
  {
    id: "pixelcommunitylaunch",
    title: "Winterpixel Community launch soon?",
    summary: "This website might officially get launched in a few days!",
    content: `
      <p>I am planning on launching this Winterpixel Community site!</p>
      <h3>Overview</h3>
      <p>This website has been in development for a long time now, I want to launch this website soon and I am quite happy with the forums page finally working! I also will clean up the front page so it is not as messy and may try to add a section for yt videos lol. But on serious note the next few serious features I am planning to add is RBR and GD statistics.</p>
      <img src="ui/logo.png" alt="Winterpixel Community Logo" style="width:10%;border-radius:8px;margin:1rem 0;" />
    `,
    tag: "Announcement",
    date: "April 19, 2026",
    author: "TarasKhan475",
    thumb: "📰"
  },
  {
    id: "kingcat",
    title: "What is King Cat and how to get the new badge!",
    summary: "The new King cat can be controlled by mods and devs! Also talks about how to get badge",
    content: `
      <h3>Overview</h3>
      <p>King cat is part of the new update where the devs finally show the lore hidden around the game! King Cat is controlled by the devs and sometimes mods that were given the tank! They usually join in red vs blue game mode making it very chaotic. I find it funny when we collectively break the game by going beyond the lobby limit just to try killing the king cat XD. The tank has 12 health perks, speed perk, and a lot of homing missiles!</p>
      <img src="ui/news/assets/kingcat.png" alt="" style="width:200px;border-radius:8px;" />
      <p>I really like this design and I think this just might be my new favorite tank! Now for how to actually obtain the badge, you have to kill the king cat in any way, only the person who killed the king cat gets the new badge!</p>
      <img src="ui/news/assets/catslayer.png" alt="" style="width:100px;" />
    `,
    tag: "Update",
    date: "May 25, 2025",
    author: "Rocket Bot Royale",
    thumb: "📰"
  },
];