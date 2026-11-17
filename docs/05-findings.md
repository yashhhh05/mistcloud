# 05 — Findings, Risks & Workflow Notes

Everything here is observed in the current source. Nothing was changed.

## 1. How the project is meant to be run (and where that breaks down)

| Command | What actually happens | Problem |
| --- | --- | --- |
| `npm run dev` (root) | `vite build frontend && node server.js` | Builds once, then serves the static build on `:3000`. **No HMR**; the "Vite middleware" branch in `server.js` is dead code because `dist/` exists after the build. |
| `npm start` (root) | `node server.js` | Same server, `:3000`, serves `dist/` if present. |
| `npm run dev` (`frontend/`) | Vite on `:3000` with proxy to `:5000` | Requires `cd backend && npm run dev` in another terminal, otherwise `/api` fails. |
| `npm run dev` (`backend/`) | nodemon on `:5000` | Fine, but diverges from the unified server (different CORS origin, `PORT` respected). |

Two other workflow hazards:

- Root `server.js` hardcodes `PORT = 3000` and ignores `process.env.PORT`, even though `.env`
  and `.env.example` advertise `PORT=3000`. Changing the port requires editing code.
- Root and backend declare **different major versions**: Express 5 vs 4, Mongoose 9 vs 8. Running
  the root server uses the root install; running `backend/server.js` resolves from the nearest
  `node_modules`, so behavior can differ between the two entry points.

## 2. Security and data risks (ordered by severity)

### Critical — account takeover by design

1. **Universal password bypass.** In `auth.controller.js` signin:
   ```js
   if (!isMatch && password !== "password123") { ... }
   ```
   With MongoDB connected, *any* account can be signed into with the literal password
   `password123`. Combined with the next item, this is full takeover of any known email.
2. **OTP is a constant, and expiry is never checked.** Signup, signin and resend all set
   `otpCode = "123456"`; `verifyOTP` accepts `"123456"` unconditionally
   (`password !== "123456" && ...`). `otpExpiresAt` is written but never compared. The UI even
   prints "(Default code: 123456)".
3. **Unknown `accountId` falls back to the demo user** in `verifyOTP`
   (`inMemoryStore.findUserById(accountId) || inMemoryStore.getDefaultUser()`), so a bogus id plus
   `123456` mints a JWT for the demo account.
4. **In-memory signin accepts any password** and auto-provisions unknown emails, so without Mongo
   there is no credential check at all.

### High

5. **No ownership check on single-file mutations.** `renameFile`, `updateFileUsers` and `deleteFile`
   look the file up by id and act, with no comparison against `req.user`. Any authenticated user
   with a file id can rename, reshare or delete someone else's file. (List/usage/search/download
   *are* scoped correctly.)
6. **Secrets committed in `.env.example`.** The tracked template contains a real-looking
   `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `JWT_SECRET`. `.env` itself is correctly
   gitignored, but the template is not a placeholder. Rotate the AWS key and the JWT secret, then
   replace the values with dummies.
7. **JWT stored in `localStorage` and passed in URLs.** `localStorage` exposes the token to any
   XSS; `?token=` puts it in history, referrers and server logs. The token is valid 30 days with no
   revocation path.
8. **No rate limiting or lockout** on signin, OTP verification or resend. OTPs are 6 digits, and
   attempts are unlimited.

### Medium

9. **Public user directory.** `GET /api/auth/users/:id` has no auth middleware and returns
   `fullName`, `email`, `avatar`.
10. **Over-permissive CORS in the unified server.** `cors({ origin: true, credentials: true })`
    reflects any origin. The backend-only server is stricter (`CLIENT_URL`).
11. **Quota is cosmetic.** `all` is hardcoded to 2 GB; uploads are never checked against it, so
    "Storage Usage" can exceed 100%.
12. **Extension-only validation.** Content type comes from the client (`mimetype`) and the category
    from the filename suffix. No magic-byte check, no malware scanning.
13. **Fallback secrets.** Missing `JWT_SECRET` silently uses
    `super_secret_cloudy_jwt_key_12345!`.
14. **Error handler leaks stack traces** whenever `NODE_ENV !== "production"`.
15. **Passwords are stored unhashed in one path.** The signup `catch` block calls
    `inMemoryStore.createUser({ ..., password })` with the raw password.

## 3. Data-consistency issues

- **Uploads are not atomic.** Bytes are written before metadata. A failure after `PutObject` but
  before `File.create` leaves an orphan object (and the request still returns 201 from the memory
  fallback). Deletes do the reverse and always remove metadata, so a failed blob delete leaves an
  orphan.
- **Silent degradation hides configuration errors.** A bad `MONGODB_URI` or missing AWS keys does
  not fail the boot; the app quietly switches to volatile memory / local disk.
- **In-memory store is process-global.** Every user shares the same array and the same demo
  account; shared seed files appear in every new user's list (`users` contains the demo email, and
  in-memory signin can auto-provision any email).
- **`users` semantics differ by path**: `[]` for Mongo uploads, `[ownerEmail]` for memory uploads.
  Sharing logic still works because access is `owner OR users`, but "shared with" lists look
  different depending on mode.
- **Usage double-counts shared files.** Each viewer's usage totals the full file size, and shared
  files count toward both owner and recipient.
- **Presigned-URL churn.** Listing N files performs N signing calls and returns URLs that expire in
  an hour; anything caching `file.url` client-side will break later.
- **`bucketFileId` is a duplicate of `s3Key`**, a leftover from the Appwrite design.

## 4. Dead code, duplication and drift

| Item | Detail |
| --- | --- |
| Legacy docs | `ARCHITECTURE.md`, `DEPLOYMENT.md`, `forme.md`, `ForMe2.md`, `For-Me2.md` describe Next.js + Appwrite + Groq + Upstash Vector. No such code exists here. |
| Unused runtime deps | `@upstash/vector`, `groq-sdk`, `pdf-parse`, `node-appwrite`, `recharts`, all `@radix-ui/*`, `react-hook-form`, `@hookform/resolvers`, `zod`, `use-debounce`, `input-otp`, `lucide-react`, `class-variance-authority`, `mongoose`-adjacent extras — none imported in `backend/` or `frontend/src/`. |
| Duplicated constants | Root `constants/index.ts` is a byte-for-byte near-copy of `frontend/src/constants/index.ts` and is never imported. |
| Duplicated assets | Root `public/` duplicates `frontend/public/` and also carries stale Next.js assets (`next.svg`, `vercel.svg`, `window.svg`, `globe.svg`, `file.svg`). |
| Legacy types | Root `index.d.ts` references Appwrite's `Models.Document` and Next.js `SearchParamProps`; unused by the Vite build. |
| Dead code paths | `getMe`'s fallback calls `inMemoryStore.getDefaultUser().toJSON()`, but the default user object has no `toJSON`; the branch is unreachable after `authMiddleware` and would throw if reached. `resendOTP` in memory mode resets an arbitrary/default user's OTP. |
| Tests / lint | No test files. Lint scripts exist (`eslint` at root, `oxlint` in `frontend`) but there is no CI config. |

## 5. Reading order for the source

1. `server.js` — how the app is assembled and served.
2. `backend/routes/index.js` → the three routers — the whole API surface in ~50 lines.
3. `backend/controllers/file.controller.js` — the core domain logic (upload, list, usage, download,
   rename, share, delete), each with an in-memory branch.
4. `backend/controllers/auth.controller.js` + `backend/middleware/auth.middleware.js` — the OTP/JWT
   flow and its fallbacks.
5. `backend/services/s3.service.js` + `backend/config/s3.js` — the storage abstraction.
6. `backend/config/inMemoryStore.js` — the alternative data layer.
7. `frontend/src/App.tsx` → `RootLayout.tsx` → `Dashboard.tsx` / `FilesView.tsx` — routing, refresh
   trigger, page data.
8. `frontend/src/api/*` — the exact request/response contracts.
9. `frontend/src/components/ActionDropdown.tsx` — every mutation the UI can perform.

## 6. Small, high-leverage fixes if this is to go further

Not applied — listed so the analysis is actionable.

1. Rotate the AWS key/JWT secret in `.env.example`; replace with placeholders.
2. Remove the `password123` bypass and the `123456` acceptance; compare `otpExpiresAt`; add attempt
   limits.
3. Add an ownership/membership guard to rename, share and delete (and optionally to download).
4. Move the JWT to an `HttpOnly` cookie (or at least stop putting it in query strings by issuing
   short-lived download tickets).
5. Enforce the 2 GB quota on upload, server-side.
6. Fail loudly (or expose `/health` detail) when configured services are unreachable, instead of
   silently degrading.
7. Delete the legacy docs or move them to `docs/legacy/`, so the repo has one source of truth.
8. Add `PORT` support to the root server and unify dependency versions between root and `backend/`.
