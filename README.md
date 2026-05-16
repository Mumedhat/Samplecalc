# StudySize Pro

Standalone browser application for academic sample size planning in in vivo, in vitro, clinical, translational, and observational studies.

## Deploy on Netlify

This folder is ready to deploy as a Netlify static site with one optional AI function.

1. Push or upload the folder to Netlify.
2. In Netlify, set the publish directory to the project root (`.`). The included `netlify.toml` already does this.
3. Add environment variables in Netlify:
   - `OPENAI_API_KEY`: required for cloud AI consensus analysis.
   - `OPENAI_MODEL`: optional. Defaults to `gpt-4o-mini`.
   - `ENABLE_OPENAI_WEB_SEARCH`: optional, set to `true` only if you want the function to allow OpenAI web search tooling.
4. Deploy.

If `OPENAI_API_KEY` is not set, the app still works using the local protocol-first analyzer.

## Open locally

Open `index.html` in a browser.

For local testing with the Netlify Function, install Netlify CLI and run:

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and add your API key before testing cloud AI locally.

## Included features

- Sample size calculators for common universal designs:
  - independent and paired means
  - precision for one mean
  - one and two proportions
  - ANOVA
  - correlation
  - equivalence / non-inferiority
  - survival log-rank planning
  - diagnostic sensitivity and specificity
  - regression events-per-parameter planning
  - in vivo animal resource equation
- Literature-aware reference table with weighted and conservative effect-size summaries.
- Protocol-first study text analysis that identifies experimental unit, primary endpoint, endpoint type, comparison, statistical design, extractable assumptions, missing assumptions, and study-strengthening suggestions before calculating.
- Optional server-side OpenAI multi-agent consensus analyzer via Netlify Function.
- Provisional automatic calculations use explicit assumptions first, user-entered similar studies second, and clearly labeled standardized planning benchmarks only when essential values are missing.
- Similar-study search links for PubMed, Semantic Scholar, and Google Scholar, plus design-matched candidate references that can be added to the evidence table.
- Hover question-mark help beside calculator, literature, upload, and report controls.
- TXT/MD upload extraction offline.
- DOCX and PDF extraction in-browser when the CDN libraries load.
- Exportable HTML report that can be printed or saved as PDF from the browser.

## Important note

The app provides transparent planning calculations and AI-style decision support. Final sample size decisions should be reviewed by a qualified biostatistician and matched to the exact endpoint distribution, experimental unit, clustering, repeated-measures structure, multiplicity strategy, ethics requirements, and protocol constraints.
