# Pump Curve Lab

Small browser app for testing pump-curve uploads and recommendation workflows.

## Features
- Upload CSV pump curve libraries
- Enter duty point in US or metric units
- Convert pressure to TDH
- TDH helper based on pipe length, diameter, fittings, SG, and viscosity
- Select pump style: submersible, flooded suction, self-priming
- Recommend best-fit pump and motor
- Plot updated operating point against uploaded pump curves

## Expected CSV columns
Recommended columns:
- `MODEL`
- `ROTOR`
- `FLOW_GPM`
- `HEAD_FT`
- `EFFICIENCY_PCT`
- `POWER_HP`

Also accepts the prior report-style headers:
- `PUMP MODEL`
- `ROTOR SIZE`
- `FLOW (GPM)`
- `HEAD (FT)`
- `EFFICIENCY (%)`
- `POWER (HP)`

## Run locally
Because it is a static app, any simple web server works.

Python:
```bash
cd apps/pump-curve-lab
python3 -m http.server 8080
```

Then open:
- http://localhost:8080

## Notes
This is a prototype recommendation tool, not a final engineering release tool.
It should still be validated for:
- NPSH / suction conditions
- solids size and wear
- motor starting margin
- material compatibility
- true manufacturer curve selection logic
