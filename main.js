// Server Pulse: favourite servers' live status on the Play screen, and a
// heads-up when a friend comes online or a server that was down comes back.
//
// With no favourites set, the servers you have played are watched instead.
// A server is only called offline after two missed checks in a row, so one
// dropped ping does not send a false alarm.

var POLL_MS = 60000;
var MAX_SERVERS = 8;
var MISSES_TO_OFFLINE = 2;

var known = {};            // address -> { online, misses }
var friendsOnline = {};    // uuid -> { username, playing }
var timer = null;
var polling = null;

function isV2() { return typeof mc2.apiVersion === "number" && mc2.apiVersion >= 2; }

/** "a.com, b.net:25566" -> ["a.com", "b.net:25566"], lowercased, no repeats. */
function parseAddresses(text) {
  var seen = {};
  return String(text || "").split(/[,\n]/).map(function (s) { return s.trim().toLowerCase(); })
    .filter(function (s) { if (!s || seen[s]) return false; seen[s] = true; return true; });
}

/** The servers to watch: { name, address }, favourites first. */
async function watchList() {
  var played = [];
  try { played = await mc2.servers.played(); } catch (e) { played = []; }
  var names = {};
  played.forEach(function (p) { names[String(p.address).toLowerCase()] = p.name; });
  var favourites = parseAddresses(await mc2.settings.get("favourites"));
  var addresses = favourites.length ? favourites : played.map(function (p) { return String(p.address).toLowerCase(); });
  var seen = {};
  return addresses.filter(function (a) { if (seen[a]) return false; seen[a] = true; return true; })
    .slice(0, MAX_SERVERS)
    .map(function (a) { return { name: names[a] || a, address: a }; });
}

/** Check every watched server once and store what the card shows. */
function poll() {
  if (polling) return polling;
  polling = (async function () {
    var list = await watchList();
    var announce = await mc2.settings.get("serverAlerts");
    var rows = [];
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      var status;
      try { status = await mc2.servers.status(s.address); } catch (e) { status = { online: false }; }
      var before = known[s.address];
      var entry = before || { online: null, misses: 0 };
      if (status && status.online) {
        if (announce && before && before.online === false) mc2.notify(s.name + " is back online.");
        entry.online = true;
        entry.misses = 0;
      } else {
        entry.misses += 1;
        // A first check that fails is simply offline; after that it takes
        // two misses in a row.
        if (entry.online === null || entry.misses >= MISSES_TO_OFFLINE) entry.online = false;
      }
      known[s.address] = entry;
      rows.push({
        name: s.name,
        address: s.address,
        online: entry.online === true,
        players: status && status.online ? status.players : null,
        max: status && status.online ? status.max : null,
        motd: status && status.online ? status.motd || "" : "",
        version: status && status.online ? status.version || "" : "",
      });
    }
    var pulse = { servers: rows, friends: onlineFriends(), checkedAt: Date.now() };
    await mc2.storage.set("pulse", pulse);
    return pulse;
  })();
  return polling.then(function (p) { polling = null; return p; }, function (e) { polling = null; throw e; });
}

function onlineFriends() {
  return Object.keys(friendsOnline).map(function (uuid) {
    return { uuid: uuid, username: friendsOnline[uuid].username, playing: friendsOnline[uuid].playing };
  }).sort(function (a, b) { return a.username.localeCompare(b.username); });
}

async function saveFriends() {
  var pulse = (await mc2.storage.get("pulse")) || { servers: [], checkedAt: null };
  pulse.friends = onlineFriends();
  await mc2.storage.set("pulse", pulse);
}

async function seedFriends() {
  var list = [];
  try { list = await mc2.friends.list(); } catch (e) { list = []; }
  friendsOnline = {};
  list.forEach(function (f) { if (f.online) friendsOnline[f.uuid] = { username: f.username, playing: f.playing || null }; });
  await saveFriends();
}

function describe(playing) {
  if (!playing) return "";
  if (playing.server && playing.pack) return ", playing " + playing.pack + " on " + playing.server;
  if (playing.server) return ", on " + playing.server;
  if (playing.pack) return ", playing " + playing.pack;
  return "";
}

async function onFriendOnline(e) {
  if (!e || !e.uuid) return;
  var playing = null;
  try {
    var match = (await mc2.friends.list()).filter(function (f) { return f.uuid === e.uuid; })[0];
    playing = match ? match.playing || null : null;
  } catch (err) { playing = null; }
  friendsOnline[e.uuid] = { username: e.username, playing: playing };
  await saveFriends();
  if (await mc2.settings.get("friendAlerts")) mc2.notify(e.username + " is online" + describe(playing) + ".");
}

async function onFriendOffline(e) {
  if (!e || !e.uuid) return;
  delete friendsOnline[e.uuid];
  await saveFriends();
}

if (!isV2()) {
  mc2.notify("Server Pulse needs a newer version of MC². Update MC² to use it.");
} else {
  module.exports = {
    onload: async function () {
      mc2.addWidget({ id: "pulse", title: "Servers", file: "widget.html", height: 200 });
      mc2.on("friend-online", onFriendOnline);
      mc2.on("friend-offline", onFriendOffline);
      mc2.on("settings-change", function (e) {
        if (e && e.key === "favourites") { known = {}; return poll(); }
      });
      await seedFriends();
      await poll();
      timer = setInterval(function () { poll(); }, POLL_MS);
    },
    onunload: function () {
      if (timer !== null) clearInterval(timer);
      timer = null;
    },
    // For tests.
    _parseAddresses: parseAddresses,
    _poll: poll,
  };
}
