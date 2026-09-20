---
name: sync-kb-from-doc
description: Fetch a project's Google Doc knowledge base, diff it against the published FAQ JSON, apply reviewed Q&A updates, and re-ingest embeddings. Use when the user asks to sync, pull, or update CodiceFiscale / ItalianNotary knowledge from the Google Doc, or says fetch-kb.
---

# Sync KB from Google Doc

Chat never reads Google at runtime. The Doc is the stakeholder source; `data/*.faq.json` is what ingest embeds into the matching Supabase.

## When the user names a project

1. Map the name:
   - CodiceFiscale / CF / italian_immigration → `italian_immigration`
   - ItalianNotary / IN / italian_notary → `italian_notary`
2. Run `npm run fetch-kb -- <project_id>` (needs network). This overwrites `data/sources/<project_id>.md` and prints a diff. It does **not** write FAQ JSON or ingest. Pass `--write-faq` to overlay Doc Q&As onto the JSON (keeps JSON-only rows; skips later-policy regressions).
3. Read that diff before changing anything.

## Apply rules

- Update matching FAQ entries (`question` / `answer` / `plain_english`) when the Doc is the intended source.
- Preserve `section`, `category`, and `tags` from the existing JSON when the question still exists. Do not invent categories.
- **Do not delete** JSON-only entries unless the user explicitly says to drop them.
  - CodiceFiscale: keep `tax-services` / section `2.x` (ItalianTaxes.com) and later funnel Qs that are not in PART 1 of the Doc.
  - ItalianNotary: later stakeholder email **overrides** v1.4 on translation. If the Doc says ItalianNotary **provides** translation, or CONFIG still uses `/booking_step_one/booking-step-1-other/`, **stop and tell the user**. Live bot: canned "does not currently provide translation"; booking URL `https://www.studiolegalemetta.com/booking-appointments/`.
- CONFIG (Notary, before PART 1) is **not** ingested. Only change `lib/config/project.ts` (starters, fallback, canned replies) if the user confirms the Doc CONFIG should win.
- CodiceFiscale: ingest **PART 1** Q&As only. Ignore PART 2 page copy.

## After JSON (and optional config) edits

Do not ingest until the user has seen the fetch-kb warnings, then:

```bash
npm run fetch-kb -- <project_id> --write-faq
npm run ingest -- <project_id>
```

`italian_notary` writes `SUPABASE_*_ITALIAN_NOTARY`. Summarize added / changed / JSON-only kept. Do not ingest until the user has seen the fetch-kb warnings.

## Google access

Docs must be **Anyone with the link → Viewer**. 403 means sharing is wrong. IDs live on `googleDocId` in `lib/config/project.ts`.
