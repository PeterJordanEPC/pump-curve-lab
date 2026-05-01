# Pump Curve Lab

Pump Curve Lab is a browser-based prototype for testing pump curve uploads, duty-point calculations, and pump recommendation workflows.

## What it does
- Upload one or more pump curve CSVs
- Accept flow in US or metric units
- Accept pressure or TDH in multiple units
- Calculate TDH from pipe variables
- Account for specific gravity, viscosity, solids burden, and pump style
- Compare multiple pump families on one screen
- Recommend a pump and motor size
- Plot the requested operating point against uploaded curves
- Export recommendation results to JSON, CSV, or HTML
- Print or Save PDF from the browser

## Current prototype scope
This is a practical evaluation app, not a final released hydraulic design system.

It is useful for:
- early pump screening
- comparing uploaded family curves
- testing user experience and calculator flow
- validating what a customer-facing upload/recommendation workflow should feel like

It still needs engineering validation for:
- NPSH / suction margin
- cavitation risk
- solids passage and wear life
- manufacturer-approved curve interpolation
- exact motor starting/current margin
- material compatibility and temperature derating

## Expected CSV columns
Preferred columns:
- `MODEL`
- `ROTOR`
- `FLOW_GPM`
- `HEAD_FT`
- `EFFICIENCY_PCT`
- `POWER_HP`

Also accepted:
- `PUMP MODEL`
- `ROTOR SIZE`
- `FLOW (GPM)`
- `HEAD (FT)`
- `EFFICIENCY (%)`
- `POWER (HP)`

## Local run
Because the app is static, any small web server works.

### Python
```bash
cd apps/pump-curve-lab
python3 -m http.server 8080
```

Open:
- http://localhost:8080

## Test workflow
1. Load the sample curves or upload one or more CSV files.
2. Enter target flow and pressure/TDH.
3. Enter specific gravity, viscosity, pump style, and pipe variables.
4. Use **Calculate TDH from pipe variables** if needed.
5. Click **Recommend pump**.
6. Review:
   - best pump
   - recommended motor HP
   - comparison table
   - plotted operating point
7. Export JSON / CSV / HTML or use Print / Save PDF.

## Suggested next development steps
1. true curve interpolation instead of point scoring
2. multi-point curve smoothing and family envelopes
3. backend persistence for uploaded libraries
4. user accounts and saved projects
5. full pipe/TDH calculator with fittings library
6. NPSH and suction configuration logic
7. editable manufacturer-specific pump rules
8. PDF report styling and branded output
9. GitHub Actions deploy preview

## Repo usage
This app was pushed as a standalone repo so it can be tested independently without mixing with the rest of the workspace automation.
