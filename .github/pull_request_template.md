## What does this change

<!-- A short description. Link any related issue with "Closes #123". -->

## Type

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor (no behaviour change)
- [ ] Documentation
- [ ] Build / CI

## How was it tested

<!--
Describe what you ran. For example:

  npm run check && npm run build
  npx wrangler dev --config wrangler.dev.toml --local
  curl -s -A clash "http://127.0.0.1:8787/tabora/sub" | python3 -c "import yaml,sys; yaml.safe_load(sys.stdin)"
-->

## Checklist

- [ ] `npm run check` passes
- [ ] `npm run build` succeeds
- [ ] New settings have a validator in `src/config/validators.ts`
- [ ] No secrets are logged or committed
- [ ] Generated configs still parse (Clash YAML / Sing-box JSON)
- [ ] README updated if behaviour or options changed

## Notes for operators

<!-- Anything that affects existing deployments: settings shape, routes, DB schema. -->
