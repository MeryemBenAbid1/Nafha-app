# Nafha web app

One web app for all four Nafha roles: technician, expert, brand, and the buyer (no login).
Next.js 15 + Tailwind + Supabase. It installs on phones as an app (PWA), so there's no app store step.

The sensors haven't arrived yet, so `scripts/fake-device.mjs` plays the device: it makes up a sniff, signs
it with a P-256 key exactly like the ATECC608 chip will, and sends it to the app. When the real ESP32 is
ready, it sends the same record to the same address and nothing in the app changes.

> Readings from the fake device and verdicts from the stub classifier are made up. Never put them in the report as results.

## Set up (once, about 20 minutes)

1. **Install** Node.js 20 or newer (nodejs.org). Then in this folder: `npm install`
2. **Supabase:** make a free project at supabase.com. Open *SQL Editor → New query*, paste all of
   `supabase/schema.sql`, press *Run*.
   For quick testing, turn off *Authentication → Sign In / Providers → Email → Confirm email*.
3. **Keys:** copy `.env.example` to `.env.local` and fill it in from *Project Settings → API*
   (the URL, the anon/publishable key and the service_role key).
4. **Run it:** `npm run dev`, then open http://localhost:3000
5. **Make a fake device:** `npm run device:key -- NFH-01`. It prints one line of SQL. Run that line in the
   Supabase SQL editor to register the device.
6. **Sign up** three accounts on the login page (one per role: technician, expert, brand). Use any emails.

## Try the whole flow

1. As **brand**: register a lot, e.g. `LOT-0042`, and open *Print labels*.
2. As **technician**: set device NFH-01 to test LOT-0042.
3. In a terminal: `npm run device:fake -- --every 5`. A new sniff arrives every 5 seconds and the technician
   screen updates live. Use `--blend genuine|diluted|synthetic|unknown` to pick one.
4. Click *certificate* on a row, or scan a label with your phone camera. That's the buyer's page. The device
   signature is checked on the buyer's phone.
5. As **expert**: "unknown" sniffs wait here for a decision; any sniff can go into the reference library.
6. Try to cheat: `npm run device:fake -- --tamper` changes a number after signing and `--replay` reuses a
   counter. Both must be rejected. That's a good demo for the "Forge a certificate" booth game.

To open it on your phone during development, run `npm run dev -- -H 0.0.0.0` and visit
`http://<your-laptop-ip>:3000` on the same Wi-Fi. Set `NEXT_PUBLIC_APP_URL` to that address so QR codes point there.

## Blockchain (works now on a local chain)

1. In `nafha-chain`: `npm install`, then `npm run node` in one terminal and `npm run deploy:local` in another
   (add `USE_SOLCJS=1` in front if the compiler download is blocked). The contract address is printed.
2. In `.env.local`: `NEXT_PUBLIC_CHAIN_ID=31337`, `NEXT_PUBLIC_CHAIN_RPC_URL=http://127.0.0.1:8545`,
   `NEXT_PUBLIC_ANCHOR_CONTRACT=<NafhaAnchor address>`, and `ANCHOR_PRIVATE_KEY` = Hardhat's account #0 key
   (printed by `npm run node`; it's a public test key).
3. Make your account admin (Supabase table editor → profiles → role = admin). On the technician screen press
   **Put key on chain** for the device, make some sniffs, then press **Anchor now**.
4. Open a certificate. The buyer page shows three ticks, all checked on the phone: the sniff matches the certificate,
   the device key read from the chain signed it, and the Merkle proof leads to the root stored in the contract.
5. For Polygon Amoy, deploy with `npm run deploy:amoy` in `nafha-chain` and use chain ID 80002 and an Amoy RPC.

Tested on 5 Nov against a local Hardhat deployment: register key → anchor batch → all three buyer checks pass, and a
certificate with a changed product name fails the Merkle check. Hashes, leaves and roots match `nafha-chain` exactly.

## NFC seals (NTAG 424 DNA)

1. Program each tag with NXP TagXplorer (PC + USB reader) or TagWriter (Android): SDM on, mirror UID + counter
   (encrypted PICC data) and CMAC, URL `<APP_URL>/t?picc_data=00000000000000000000000000000000&cmac=0000000000000000`.
2. Put the tag keys in `SUN_K_META` and `SUN_K_FILE`. Never ship tags with the factory zero keys.
3. As brand, link each tag's UID to a lot. A tap opens the lot's certificate with a green "seal is genuine" line;
   a copied link fails because its counter was already used.

The check is a copy of `nafha-chain/lib/sun.js` and passes NXP's AN12196 example tap.

## Deploy (when you want a public link)

Push this folder to GitHub, import it at vercel.com, and add the same four environment variables
(with `NEXT_PUBLIC_APP_URL` = your vercel.app address).

## How the pieces fit

| Path | What it is |
|---|---|
| `app/api/nonce` | The device asks for a one-time nonce before each sniff (report FR-FW-03) |
| `app/api/ingest` | Every sniff arrives here: shape → device → **signature** → counter + nonce → save → classify → certificate |
| `lib/record.ts` | The record format (report §5.9), its hash (JCS, matches `nafha-chain` test vector) and signature check |
| `lib/classifier.ts` | Stub rules for fake data; set `CLASSIFIER_URL=http://localhost:8001` to use the real model (`nafha serve`) |
| `app/technician` | Pick the lot under test, watch sniffs and verdicts live |
| `app/expert` | Review unknown sniffs, build the reference library |
| `app/brand` | Register lots, print QR label sheets |
| `app/c/[id]` | The buyer's certificate page (public) |
| `app/l/[code]` | A lot label's QR lands here and jumps to the newest certificate |
| `supabase/schema.sql` | All tables, roles and security rules |
| `lib/chain/` | Certificate body, Merkle batch and buyer checks (port of `nafha-chain/lib`), contract reads and writes |
| `app/c/[id]/ChainCheck.tsx` | The three checks on the buyer's phone, reading the chain directly |
| `app/t` + `lib/sun.ts` | NFC seal tap check (NTAG 424 DNA SUN) |
| `scripts/` | Fake device and device key maker |

## Next hooks (from the week-1 plan)

- **Real device:** the ESP32 calls `GET /api/nonce?deviceId=…`, sniffs, signs with the ATECC608, and POSTs the record to `/api/ingest`.
- **Model:** run `nafha serve --release <dir>` from `nafha-ml` and set `CLASSIFIER_URL`. Certificates only go out when the service says `certifiable`.
- **Escrow:** the buyer and brand wallet screens for `NafhaEscrow` (optional add-on) aren't built yet.
- **Automatic anchoring:** right now someone presses "Anchor now". A Vercel cron calling it every hour would also work.
- **Look:** colours live in `tailwind.config.ts`. Swap in the new brand when it's ready.
