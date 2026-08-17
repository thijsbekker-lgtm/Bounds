## v1.14.3 — login fix

Supabase Auth loading now uses a robust browser script loader with jsDelivr + unpkg fallback, and login errors are shown clearly instead of appearing to do nothing.

# BOUNDS v1 — Foundation v1.10 v1.4

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
\n## v1.4 fix
- Hole-stats openen/sluiten per hole; niet meer alle stats tegelijk.
- Geopende stats blijven open na score-, putt-, penalty- of notitiewijzigingen.
- Fairway wordt niet getoond op par 3.
- Tee-keuze toont alleen de teenaam; CR/Slope blijft in het configuratieblok eronder.

## v1.3 fix\n- Loginvelden worden expliciet focusable en niet-disabled gemaakt.\n- Auth-view/form krijgen een expliciete interactielaag zodat geen bovenliggende UI de velden kan blokkeren.\n- Supabase CDN-script gebruikt `defer` zodat een trage CDN-load de pagina niet onnodig blokkeert.\n- Auth boot/logout is robuuster gemaakt; uitloggen toont weer het login-scherm zonder volledige reload.\n

## v1.9 fixes
- Save round sends `played_hole_number` explicitly.
- Per-hole Stats button uses robust event delegation.
- App script cache-busted to ensure the latest frontend is loaded.
- Supabase `save_round_v1` updated separately to persist `played_hole_number`.


## v1.10
- Fix round save payload: empty score values are normalized to NULL before Supabase sync.
- Optional stats remain nullable and are normalized to valid integer ranges.
- No database constraint changes.


## v1.11 — edit saved rounds
- Saved round editing reconstructs the complete 9/18-hole scorecard from the course/tee definition.
- Existing hole scores and optional stats are overlaid onto that full card.
- Empty holes remain visible and editable instead of disappearing.
- 18-hole rounds on physical 9-hole courses are reconstructed consistently with the live round setup.

## v1.12 fix
- Opgeslagen rondes kunnen vanuit Historie definitief worden verwijderd.
- Verwijderen loopt via de beveiligde Supabase RPC `delete_round_v1`; alleen de eigenaar kan zijn eigen ronde verwijderen.
- Bijbehorende spelers, hole-scores, notities en shares worden door de bestaande cascade-relaties mee verwijderd.


## v1.14
- Fix Golfpark Almkreek Par 3/4 qualifying 9-hole layout.
- The scorecard now uses physical holes 6–14 (9 playable holes) instead of all 14 physical holes.
- Saved-round loading applies the same qualifying-hole mapping.
- No database schema changes.


## v1.14
- My Game now reads saved hole-level statistics from Supabase.
- Added first actionable insights: score vs par by par type, putting, GIR, fairway and penalties.
- Added recent score trend and data coverage indicators.
- Avoids claiming strokes gained; uses score above par where appropriate.
