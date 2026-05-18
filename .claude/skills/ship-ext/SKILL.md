---
name: ship-ext
description: Bump the Chrome extension version, build extension.zip, and commit+tag+push. Use when the user wants to publish a new extension update.
disable-model-invocation: true
allowed-tools: Bash(npm run ext:publish*)
---

Run `npm run ext:publish` to bump the extension version (patch by default), security-scan extension files, build `extension.zip`, then commit, tag `v<version>`, and push.

Variants:
- `npm run ext:publish` — patch bump (1.1.8 → 1.1.9)
- `npm run ext:publish -- minor` — minor bump
- `npm run ext:publish -- major` — major bump

After the script finishes:
1. Report the new version number.
2. Paste the "What's new" patch notes block from the script's output so the user can copy it into the Chrome Web Store.
3. Remind the user to upload `extension.zip` at https://chrome.google.com/webstore/devconsole → Orianna → Package → Upload new package.
