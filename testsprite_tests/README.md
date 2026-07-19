# TestSprite Artifacts Index

This directory contains the TestSprite-generated assets used for the CinePurr Hackathon S2 submission.

## Review Order (for judges)

1. `HACKATHON_EVIDENCE.md` - quick summary of what is committed and what is pending.
2. `testsprite_frontend_test_plan.json` - frontend test plan (13 scenarios).
3. `testsprite_backend_test_plan.json` - backend test plan (9 scenarios).
4. `standard_prd.json` - generated PRD and feature map used by TestSprite.
5. `TC*.py` files - generated Playwright tests across multiple rounds.

## File Groups

- `testsprite_frontend_test_plan.json`
  - Frontend plan with priorities and step-level flows.
- `testsprite_backend_test_plan.json`
  - Backend/API plan with core scenario definitions.
- `standard_prd.json`
  - Generated product and code summary used by TestSprite.
- `TC*.py`
  - Generated test scripts from multiple generation/execution rounds.
- `fix.js`
  - Local helper script used during one execution pass.
- `testsprite_dashboard_proof.png`
  - Proof of local TestSprite execution via screenshot showing the final **13/13** run.

## Naming Note

Some test IDs repeat by prefix (for example `TC001`, `TC002`, etc.) because TestSprite generated files in multiple rounds and domains. Use the full filename for unique identification.

## Local-Only Temporary Data

Runtime scratch files are written under `testsprite_tests/tmp/` and are ignored by git in this repository configuration.

If you want to publish temporary results for judging, export the final pass/fail summary into a tracked markdown file first.
