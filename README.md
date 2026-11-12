# getebook.ai — a little more considered

An independent, responsive React replica based on the public getebook.ai landing page. Following a browser-driven comparison, its hero typography/composition, sample-book presentation, four-feature grid, section order, original product demonstrations, testimonials, distribution graphic, stacked pricing, FAQ, coral call-to-action, and multi-column footer were brought closer to the original. Accessible sample controls, credit selection, and a local draft workspace are retained.

## Run

Requires Node.js 22.12+ (this VM uses Node via nvm).

```sh
npm ci
cp .env.example .env
# Add your OpenRouter key to .env (server-side only).
npm run api
```

In a second terminal:

```sh
npm run dev
```

```sh
npm test
npm run build
npm run preview -- --port 4173
```

Keep `npm run api` running for both dev and production preview. Vite proxies `/api` to the loopback API on port 3001. If you change `API_PORT`, also change the proxy target in `vite.config.js`. Never put a key in a `VITE_*` variable or browser code. `.env` is ignored; the source archive must not include it. This session’s credential is kept outside the project and is not included in deliverables.

Default model: `openai/gpt-4.1-mini`, configurable with server-side `OPENROUTER_MODEL`. The server uses the documented [OpenRouter chat-completions API](https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request). Generation costs use the owner’s API balance; there is no subscription checkout.

## What works

- Responsive navigation, anchor links, prompt suggestions, and input validation.
- Ebook and coloring-book samples: cover plus ten pages each, with bounded previous/next controls and category filters.
- Live OpenRouter creator: idea and audience → AI-written, editable six-chapter outline → complete chapter-by-chapter AI manuscript, typically 3,600–4,800 words.
- Visible progress, cancellation, automatic local save after every chapter, and resume of missing chapters without overwriting paid-for chapters or author edits. Provider errors are surfaced; generation never silently substitutes a template.
- An explicitly labeled offline starter-template option is retained.
- Save and reopen multiple drafts in browser local storage; delete with confirmation.
- Download edited manuscripts as plain-text `.txt`; completed AI books also export EPUB3 with a typographic title page, table of contents, metadata, and six chapter documents.
- Credit-plan selection, honest non-payment plan dialog, accessible FAQ accordion, keyboard-operable dialogs, and reduced-motion support.

## Deliberate boundaries

This is an independent private-preview replica, not the original getebook.ai backend. AI text generation is connected through OpenRouter. Authentication, payments, cover/illustration generation, cloud sync, PDF/DOCX export, and direct publishing are not connected. EPUB exports use a typographic title page, not an AI-generated image. All AI output needs editorial review and fact-checking before publication; a complete manuscript is not a guarantee of publication quality or factual accuracy.

Your idea, audience, outline, and relevant chapter text are sent to OpenRouter and its selected model provider. Avoid confidential inputs. Saved books stay in the current browser, with no cloud backup. Download a copy before clearing storage.

### Private-preview safeguards

The API binds to `127.0.0.1`, accepts only the two generation routes, validates inputs, requires same-origin JSON requests with a custom client header, caps requests at 70 per hour across the process and two concurrently, limits output tokens and request size, times out provider calls, and cancels disconnected requests. The key is sent only from the server to OpenRouter, never to the browser. Error messages do not echo upstream payloads or credentials.

These controls are **not user authentication** or a durable billing system. Do not expose the Vite preview publicly without adding authenticated users, persistent per-user budgets, HTTPS, production hosting, and appropriate privacy/legal policies. Restarting the API resets its in-memory rate limit. The supplied key was posted in chat; rotate it after testing.

## REA

The requested `npx rea-agents@latest setup` was run successfully with the **Devin** integration (REA 6.8.0). REA’s installed reverse-engineering skill was followed. The current session used the equivalent CLI because MCP registration requires a client restart:

1. `list-browser-targets` identified the already-open getebook.ai page.
2. `inspect-web-page --include-accessibility-text` captured the public page structure and accessible UI.
3. `analyze-web-bundle` examined captured public browser scripts without executing them.

REA evidence identifiers:
- Discovery: `ev_c13396b244aa22712e207b1f10303e424814db3d0611025e0c115241abc1f48e`
- Page: `ev_655a979a44b5d4abf179656a871606cdad6a0531f07de78ff269df499d865580`
- Bundle: `ev_bd13253d42626dbe71070a77a5a4cc97daba3f5b29e64a64c986fd05a58f9360`

These observations cover public client-side behavior and structure, not private server-side implementation. The React implementation is newly written. Sample-book imagery, original product demonstration videos, testimonial proof imagery, platform logos, and DM Sans font files are from public getebook.ai resources; they remain attributed and are not offered as resale assets. Testimonial/earnings claims are reproduced from the source, not independently verified and not results of this demo. Product branding belongs to its respective owner. Review asset rights before publicly deploying the replica.
