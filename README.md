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
| `scripts/` | Fake device and device key maker |

## Next hooks (from the week-1 plan)

- **Real device:** the ESP32 calls `GET /api/nonce?deviceId=…`, sniffs, signs with the ATECC608, and POSTs the record to `/api/ingest`.
- **Model:** run `nafha serve --release <dir>` from `nafha-ml` and set `CLASSIFIER_URL`. Certificates only go out when the service says `certifiable`.
- **Blockchain:** batch `record_hash` values into a Merkle tree and anchor with `nafha-chain/lib/merkle.js`, then
  have the buyer page read the root from the contract with viem (`nafha-chain/lib/certificate.js` has the checks).
- **NFC seal:** add `/v` that checks the NTAG 424 tap URL with `nafha-chain/lib/sun.js`.
- **Look:** colours live in `tailwind.config.ts`. Swap in the new brand when it's ready.
