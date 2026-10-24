# MyFund Frontend

React 19 + Vite + Tailwind.

```bash
npm install
npm test                     # checks the mock ledger rules
npm run dev                  # http://localhost:3000
```

All backend calls go through `src/services/api.ts`. In `npm run dev` (or with `VITE_USE_MOCK=true`) they hit
the in-memory `src/services/mockApi.ts`; a production build calls Spring Boot unless told otherwise. Set
`VITE_USE_MOCK=false` to call Spring Boot in dev too. In dev, `/api`
is proxied to `http://localhost:8080`.

Request and response shapes are in `src/types/index.ts`. The endpoint list is in the root README.
