# BOUNDS v1 — Foundation

Deze versie is bewust opnieuw opgebouwd als schone basis en niet als uitbreiding van het oude monolithische HTML-prototype.

## Productscope
- Play
- My Game
- Courses
- Accounts + Supabase cloud
- Optionele hole-stats
- Offline draft voor een actieve ronde

Social/Find a Golfer/challenges zijn bewust niet in deze foundation opgenomen.

## Architectuur
- `index.html` — UI shell
- `styles.css` — BOUNDS visual system
- `js/domain.js` — pure golfberekeningen
- `js/data.js` — Supabase data access
- `js/app.js` — UI orchestration

## Supabase
De frontend gebruikt de bestaande BOUNDS Supabase-projectconfiguratie met een publishable key. De publishable key is geschikt voor browsergebruik; de service-role key wordt nergens gebruikt.

## Belangrijk
Deze foundation gebruikt de bestaande Supabase-tabellen en `save_round_v1` RPC. De bestaande database blijft daarmee de bron van waarheid voor course data, handicap ranges en rondes.

## Run
Open lokaal via een eenvoudige static server, bijvoorbeeld:

`python3 -m http.server 8080`

Open daarna `http://localhost:8080`.
