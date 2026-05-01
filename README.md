# Pump Curve Lab

Pump Curve Lab is a browser-based prototype for testing pump curve uploads, duty-point calculations, and pump recommendation workflows.

## What it does
- Upload one or more pump curve CSVs
- Interpolate each pump family to the requested duty-point flow
- Accept flow in US or metric units
- Accept pressure or TDH in multiple units
- Calculate TDH from pipe variables
- Account for specific gravity, viscosity, solids burden, and pump style
- Compare multiple pump families on one screen
- Recommend a pump and motor size
- Plot the requested operating point against uploaded curves
- Export recommendation results to JSON, CSV, or HTML
- Print or Save PDF from the browser
- Save and reload project files locally

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
- manufacturer-approved curve interpolation and acceptance windows
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
3. Enter specific gravity, viscosity, solids size, and pump style.
4. Use **Calculate TDH from pipe variables** if needed.
5. Click **Recommend pump**.
6. Review:
   - best pump
   - recommended motor HP
   - comparison table
   - plotted operating point
7. Export JSON / CSV / HTML, Print / Save PDF, or save a project file.
8. Reload a saved project JSON to resume work later.

## What changed in this version
- Added family interpolation at the requested flow before ranking pumps
- Added local project save/load
- Added richer branded HTML report export
- Added print-to-PDF workflow
- Added more application inputs and clearer recommendation explanation

## Suggested next development steps
1. true backend persistence with user accounts
2. polished branded PDF generation server-side
3. full fittings library and more robust TDH calculator
4. manufacturer-specific curve rules and warning thresholds
5. NPSH and suction-condition calculator
6. solids/wear/material selection advisor
7. deploy preview or hosted staging environment


## PumpFlo workflow findings now reflected in the app
- electric/flooded sizing starts with customer flow, TDH, and slurry properties
- self-priming mode emphasizes suction lift and warns above the recommended lift range
- 50 to 200 GPM with head above 120 ft prefers HH2000
- 5-inch pump recommendations are intentionally discouraged
- recommendation screen now includes PumpFlo-style workflow guidance and manual-review reminders
