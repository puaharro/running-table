<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Application security

- Treat form fields, URL parameters, imported race data, and CMS payloads as untrusted. Validate types and bounds where data enters the application. Allow only `http:` and `https:` for externally supplied web links, and use the existing URL and schema validation helpers where applicable.
- Render imported text through React's default escaping. Use the existing safe serialization helpers when embedding structured data in HTML. If a feature needs to render untrusted rich HTML, sanitize it with a maintained library before rendering.
- Keep credentials out of Git, logs, the static export, and `NEXT_PUBLIC_*` variables. Keep the editorial and content management endpoints local by default and preserve their existing authentication and request checks.
- Give GitHub Actions only the permissions they need. Pin third-party actions to full commit SHAs. Pass untrusted GitHub event values through environment variables and quote them in shell commands.
- Review scanner findings in context before suppressing them. Record the reason and scope of any exception next to its configuration. Keep secret values redacted in output.

Reference: [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

## Editorial publication

- New race scores and review wording require the human owner's explicit approval of the complete identified revision. General requests to update, test, merge or deploy do not approve a review.
- Never create an approval receipt or claim human/legal review on the owner's behalf. Test fixtures may contain clearly fictional approvals.
- Keep original interviews, evidence, complaints and pending reviews in ignored `.editorial-private/`, outside public assets and source imports. Do not commit these files or include them in deployment archives.
- Only approved reviews belong in `src/data/editorial-reviews.json`. A changed score, wording, evidence, response or rule requires renewed approval. Run `npm run check:editorial` before publishing.
- Feedback forms prepare private email only; do not send messages or publish responses without user authorization. Never claim a submission was received when no backend receipt exists.

## Race research coverage

- Follow every source-search category configured in `scripts/research/sources.mjs` for each race research task. Do not silently skip a platform or treat search snippets as a completed original-source review.
- When a source requires login, ask the owner to complete login in the browser, then resume that same source. Never request passwords, cookies or tokens. Continue independent source checks while waiting, but keep the blocked source pending.
- Record each category's query, actual review time, links inspected, results and access limitations. Distinguish not searched, awaiting login, searched with no relevant result, inspected original sources, and inaccessible after an attempted review.
- Do not describe research as complete while a source remains pending. If access cannot be resolved, report that specific limitation; an empty or inaccessible platform is not evidence that runners expressed no opinion.

## Runner accounts presentation

For runner accounts across editions, use the [Hong Kong–Zhuhai–Macao Bridge Half Marathon layout](skills/nxtgo-site-qa/SKILL.md#跑手分享年份切換) as the format for race pages.
