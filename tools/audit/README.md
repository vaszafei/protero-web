# Page audit harness

Drives every route with a real browser and reports what actually renders: console
errors, failed requests, rendered text length, horizontal overflow, and a full-page
screenshot per route per viewport.

This exists because the frontend had two pages rendering nothing but the nav bar and
three queries failing with a 400/404 on every load, and none of it was visible from
reading the code. `text=68` on `/account` is what found it.

## Setup

Playwright is not a project dependency — install it wherever you run this:

```bash
npm i --no-save playwright        # browsers are already cached under ~/.cache/ms-playwright
```

Mint a session (no password needed; `session_id` is a plain cookie against the
`sessions` table):

```bash
export PGPASSWORD=postgres
TOKEN="audit$(date +%s)"
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -q -c \
  "INSERT INTO sessions (user_id, token, expires_at) VALUES (1, '$TOKEN', now() + interval '1 day');"
export PROTERO_SESSION="$TOKEN"
```

User 1 is `admin@protero.com`. Delete the row when done, or let it expire.

## Use

```bash
npm run dev                                  # must be running

node tools/audit/crawl.mjs                   # every route, mobile + desktop
node tools/audit/check.mjs /wallet /entities # just these, desktop only
```

`crawl.mjs` writes `results.json` and `shots/<route>-<viewport>.png` into the working
directory. `check.mjs` prints to stdout and writes `shots/chk-*.png`.

`PROTERO_BASE` overrides `http://localhost:3000`.

## Reading the output

| Signal | What it usually means |
|---|---|
| `text=` under ~150 | The page rendered its chrome and nothing else. Check `ERR` for unresolved components. |
| `Failed to resolve component: X` | Auto-import name mismatch — `components/foo/Bar.vue` registers as `<FooBar>`, not `<Bar>`, unless the filename already repeats the folder. |
| `NET 400 …` | Column drift. Replay the URL against PostgREST; the error names the missing column. |
| `NET 404 …rest/v1/<table>` | The table does not exist. Check it was not renamed. |
| `H-SCROLL!` | Something overflows the viewport — usually a table without `overflow-x-auto`. |

A route that redirects shows its post-load URL, which is how you catch middleware
sending you to `/login` unexpectedly.

## Caveat

The crawl only exercises each route's **default** state. Tabs, modals and filters are
not clicked, so a broken component behind a non-default tab will not show up. Two of
the six auto-import failures found in the 2026-08-22 audit were on default views; the
rest of the tree was verified separately with a static scan comparing every
`components/**/*.vue` path to the tags used against it.
