# BOUNDS v1 — Foundation v1.3

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
- `domain.js` — pure golfberekeningen
- `data.js` — Supabase data access
- `app.js` — UI orchestration

## Supabase
De frontend gebruikt de bestaande BOUNDS Supabase-projectconfiguratie met een publishable key. De publishable key is geschikt voor browsergebruik; de service-role key wordt nergens gebruikt.

## Belangrijk
Deze foundation gebruikt de bestaande Supabase-tabellen en `save_round_v1` RPC. De bestaande database blijft daarmee de bron van waarheid voor course data, handicap ranges en rondes.

## Run
Open lokaal via een eenvoudige static server, bijvoorbeeld:

`python3 -m http.server 8080`

Open daarna `http://localhost:8080`.


## v1.2 fix
- Rondekeuze (9/18 holes) is onafhankelijk van course variant.
- `main` wordt als `Main Course` weergegeven, niet als `18 holes`.
- 18-hole configuraties van een fysiek 9-hole baanlayout kunnen de 9 fysieke holes veilig twee keer spelen.
- Stroke Index voor de tweede lus wordt afgeleid als even SI (odd → even).
- Course Handicap valt terug op de course-rating/slope formule wanneer er geen range-record beschikbaar is.
- Scorekaart controleert dat het aantal geladen holes exact overeenkomt met de gekozen ronde.
\n## v1.3 fix\n- Loginvelden worden expliciet focusable en niet-disabled gemaakt.\n- Auth-view/form krijgen een expliciete interactielaag zodat geen bovenliggende UI de velden kan blokkeren.\n- Supabase CDN-script gebruikt `defer` zodat een trage CDN-load de pagina niet onnodig blokkeert.\n- Auth boot/logout is robuuster gemaakt; uitloggen toont weer het login-scherm zonder volledige reload.\n