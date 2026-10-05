# Server Pulse

See which of your servers are up and how many people are on, right on MC²'s Play
screen, and hear about it when a friend comes online.

- **A card on the Play screen** with up to eight servers: online or offline,
  player count, and the server's message. Friends who are online show as chips
  underneath.
- **Your servers, or the ones you play.** List addresses in the settings, or
  leave it empty and Server Pulse watches the servers you have played.
- **"Steve is online, playing Vanilla Beans on Odyssey."** A heads-up when a
  friend comes online, with what they are playing.
- **"Odyssey is back online."** When a server that was down comes back. A server
  is only called offline after two missed checks in a row, so a hiccup does not
  set it off.

Checks once a minute.

## Install

In MC², open **Plugins › Browse**, find Server Pulse and press **Install**.
Or use **Install from GitHub** with `pikzelperfekt/mc2-plugin-server-pulse`.

## Settings

| Setting | What it does |
|---|---|
| Servers | Addresses to watch, comma separated, like `hypixel.net, play.example.com:25566`. Empty means the servers you have played. |
| Tell me when a friend comes online | On by default |
| Tell me when a server comes back | On by default |

## Permissions

| Permission | Why |
|---|---|
| Servers | To check each server's status and know which servers you have played |
| Friends | To know which friends are online and what they are playing |
| Save plugin data | Keeps the latest status for the card |
| Navigate the app | Adds the card to the Play screen |

Needs MC² with plugin API 2 or newer.
