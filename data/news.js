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
 * 4. Save — done!
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
      <p>Exactly four years ago today, April 20, 2026, Rocket Bot Royale officially turns four years old. The game first launched on this date across major platforms including Steam, Apple, and Android, marking the start of its growing community and evolving gameplay.
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
      <img src="ui\\logo.png" alt="Winterpixel Community Logo" style="width:10%;border-radius:8px;margin:1rem 0;" />
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
