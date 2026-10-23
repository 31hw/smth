# Classic Roblox Overlay for Microsoft Edge

A Manifest V3 browser extension that gives the current Roblox website a **2016 or 2019-inspired visual style** without replacing Roblox's data, login, navigation, or safety features. It applies across `*.roblox.com` and deliberately excludes `create.roblox.com`, as requested.

The extension adapts the visual language found in [Blue7366/ZekoroV2](https://github.com/Blue7366/ZekoroV2) (2019 frontend, MIT) and [RandomWood/economy-simulator](https://github.com/RandomWood/economy-simulator) (2016 frontend, public domain). License copies are in `vendor/`.

## Install in Microsoft Edge

1. Download or clone this folder.
2. Open `edge://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose this folder.
5. Visit Roblox and use the extension button to select **2016** or **2019**.

## Scope

- Runs on Roblox pages including Home, Discover, game details, Catalog/Marketplace, Avatar, Groups, profiles, messages, settings, and other current routes.
- Uses Roblox's existing page and live APIs, so account actions continue to be handled by Roblox.
- Does **not** run on Roblox Create.
- Since Roblox changes its markup frequently, the overlay uses broad, resilient selectors rather than copying the old standalone applications (which depend on their own discontinued backends).

## Privacy and security

No analytics, remote scripts, network interception, credential access, or data collection. The only stored values are the enabled state and selected era, through Edge sync storage.

This is an unofficial fan project and is not affiliated with or endorsed by Roblox Corporation. ROBLOX is a trademark of Roblox Corporation.
