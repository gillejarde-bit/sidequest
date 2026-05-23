# Ship It Workflow
Slash Command: `/ship-it`

## Steps
1. **QA Agent Pass**: Full pass by QA Agent (TypeScript, ESLint, accessibility).
2. **Build Check**: Run `pnpm build` to verify the production bundle compiles correctly.
3. **CF Pages Deploy Preview**: Push to branch and verify Cloudflare Pages deployment preview URL.
