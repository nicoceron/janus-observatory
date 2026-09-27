# Deployment handoff

The application has a verified production build. No hosting target or public origin has been selected in this task.

Use the repository's provider-neutral Next.js/Node deployment, retaining the workspace and generated data files. Node 24 and pnpm 10.10.0 are the operations baseline. Set `JANUS_PUBLIC_BASE_URL` to the final HTTPS origin **before building**, because canonical and social URLs are prerendered. Keep `JANUS_RESEARCH_PREVIEW_ENABLED=false` until its separate release gate is satisfied. Use the existing `.env.example` and `docs/OPERATIONS_RUNBOOK.md` for server-only settings.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm bundle:check
pnpm --filter @janus/web start --hostname 0.0.0.0
```

The Next server defaults to port 3000; the hosting platform can supply its required port with `--port`. Fonts are fetched during the build and served locally at runtime. Ship the bundled `public/licenses` notices with the build.

After deploying, verify the real origin's `/api/health`, Atlas selection and record links, Observatory query-state restoration, scenario JSON/CSV downloads, font/model responses and mobile scrolling. Enable HTTPS-upgrade/HSTS settings only after the final origin has working HTTPS, as specified in the operations runbook.

The current canonical review remains `candidate_not_reviewed`, with eight independent dataset reviews pending. Do not change that status to bypass public-release review. This frontend handoff does not certify live providers or scientific review.
