# 03 — Workflows (step by step)

Every workflow below is traced from the actual controllers. Where the Mongo path and the in-memory
path differ, both are shown.

## 1. Authentication: password, then OTP, then JWT

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant SI as SignIn / SignUp page
    participant API as Express auth.controller
    participant DB as MongoDB or in-memory store
    participant MAIL as nodemailer (optional)
    participant LS as localStorage

    U->>SI: email + password (+ fullName on signup)
    SI->>API: POST /auth/signup or /auth/signin
    API->>DB: find user by email
    alt signup and email already exists
        API-->>SI: 400 "Email is already registered"
    else signin and user missing (Mongo mode)
        API-->>SI: 404 "User not found with this email"
    else in-memory signin and user missing
        API->>DB: auto-provision user with the typed password
    end
    API->>API: bcrypt.compare (Mongo signin)<br/>or accept literal "password123"
    API->>DB: user.otpCode = "123456", expiry = now + 10 min
    API->>MAIL: sendOTPEmail(email, "123456") — failure ignored
    API-->>SI: { accountId }
    SI->>U: open OTP modal
    U->>SI: 6-digit code
    SI->>API: POST /auth/verify { accountId, password: code }
    API->>DB: find by accountId (Mongo → memory → demo user)
    API->>API: accept if code == "123456" OR code == user.otpCode
    API->>API: jwt.sign({ userId }, JWT_SECRET, 30d)
    API-->>SI: { token, sessionId, user }
    SI->>LS: store token + user, AuthContext.login()
    SI->>U: navigate to /
```

**In plain words.** Login is a three-act play: password, code, badge.

1. The form sends email + password (plus full name on signup).
2. The server looks the user up. Signup refuses an existing email; signin in Mongo mode refuses an unknown one; in memory mode an unknown email is created on the spot.
3. It checks the password with `bcrypt.compare` — bcrypt stores a scrambled hash, never the password itself. (It also accepts the literal string `password123`, which is a serious hole.)
4. It writes a one-time code and a 10-minute expiry on the user record, then tries to email the code. Mail failure is ignored.
5. The response is only `{ accountId }`, so the UI opens the code dialog.
6. The user submits the code to `/auth/verify`. The server finds the user, accepts `123456` or the stored code, and signs a JWT containing the user id, valid 30 days.
7. The browser saves the token and user in `localStorage`, the auth context updates, and the app navigates to the dashboard.

Put simply: the password proves *something you know*, the code is supposed to prove *you own the inbox*, and the JWT is the wristband you wear for the next 30 days. In this code the code is always `123456` and its expiry is never checked, so the wristband is effectively free — see `05-findings.md`.

Key properties of this implementation:

- **The OTP is a constant.** `123456` is set on signup, signin and resend, and the UI even prints
  "(Default code: 123456)". Email delivery is cosmetic; verification succeeds without it.
- `accountId` is the MongoDB `_id` (or the in-memory id). It is not a secret — it is returned to
  anyone who knows the email address and any password accepted by signin.
- The JWT lasts 30 days. There is no refresh token, no revocation list, no logout endpoint.
- Signup with Mongo stores a bcrypt hash (cost 10). Signup in memory mode stores the hash too, but
  the in-memory signin path never compares it (it auto-provisions or accepts anything).

### Token use on every subsequent request

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant AX as apiClient (axios)
    participant MW as authMiddleware
    participant DB as MongoDB or memory

    B->>AX: API call
    AX->>AX: read localStorage.token
    AX->>MW: Authorization: Bearer <token>
    MW->>MW: jwt.verify(token, JWT_SECRET)
    alt verify ok
        MW->>MW: userId = decoded.userId
    else verify throws
        MW->>DB: treat the raw token as an in-memory user id
        alt that user exists
            MW->>MW: userId = user._id
        else
            MW-->>AX: 401 "Invalid or expired authentication token"
        end
    end
    MW->>DB: load user (Mongo findById, else memory)
    alt user missing
        MW-->>AX: 401 "User not found or session has expired"
    else user found
        MW->>MW: req.user = user
        MW->>MW: next()
    end
```

**In plain words.** This is the bouncer every protected route must pass.

1. Axios reads the token from `localStorage` and adds `Authorization: Bearer <token>`.
2. `authMiddleware` verifies the signature with `JWT_SECRET`. A JWT is just a small JSON object plus a signature — if the signature matches, the server believes the contents without a database lookup.
3. If verification succeeds, the user id comes from the token payload.
4. If verification fails, the middleware tries a second, looser interpretation: treat the raw string as an in-memory user id. That keeps demo mode working without real tokens.
5. It then loads the user (Mongo first, memory second). No user → `401`.
6. On success it attaches `req.user` and calls `next()`, so the controller can trust `req.user`.

The middleware also reads `?token=` from the query string. That exists so `window.open` can download a file without custom headers, but it means tokens can end up in browser history, referrers and logs.

The `?token=` query parameter is accepted as well, which is what makes `window.open` downloads and
inline previews work. It also means JWTs end up in URLs (browser history, referrer headers, logs).

## 2. Upload

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant FU as FileUploader (dropzone)
    participant AX as apiClient
    participant MW as multer middleware
    participant FC as file.controller
    participant ST as s3.service
    participant OBJ as S3 or backend/uploads
    participant DB as File model or memory

    U->>FU: drop or pick file(s)
    FU->>FU: reject > 50 MB (client-side, toast)
    FU->>AX: POST /api/files/upload (FormData)
    AX->>AX: Authorization + onUploadProgress
    AX->>MW: multipart body
    MW->>MW: memoryStorage, limit 50 MB
    MW->>FC: req.file = { originalname, buffer, mimetype, size }
    FC->>FC: getFileType(name) → type + extension
    FC->>ST: uploadFileToStorage({ buffer, originalname, mimetype })
    alt S3 configured
        ST->>OBJ: PutObject(bucket, key, buffer, ContentType)
        ST-->>FC: { s3Key, bucketFileId, url: https://bucket.s3.region/key, bucket }
    else no S3 credentials
        ST->>OBJ: fs.writeFile(backend/uploads/<timestamp>-<random><ext>)
        ST-->>FC: { ..., url: /uploads/<key>, bucket: "local-storage" }
    end
    alt Mongo connected
        FC->>DB: File.create({ name, url, type, extension, size, owner, users: [], s3Key, bucketFileId, bucket })
        FC->>DB: findById().populate("owner", "fullName email avatar")
        FC->>FC: if S3, replace url with a 1-hour inline presigned URL
        FC-->>AX: 201 file JSON
    else no Mongo (or DB write failed)
        FC->>DB: createFile({ ..., owner embedded, users: [user.email] })
        FC-->>AX: 201 file JSON
    end
    AX-->>FU: 201 or error
    FU->>FU: progress 100, toast, remove from portal list
    FU->>FU: onUploadSuccess → RootLayout.refreshTrigger++
```

**In plain words.** Upload has two separate jobs: move the bytes, then write the index card.

1. The dropzone rejects anything over 50 MB before sending.
2. Axios posts multipart form data with the token attached and reports progress.
3. `multer` receives the body and keeps the whole file in RAM (memory storage), not on disk.
4. The controller reads the extension to decide the category and builds a storage key from timestamp + random bytes + extension. The original filename is never used as a path, which prevents collisions and path traversal.
5. `s3.service` writes the bytes: `PutObject` to S3 if keys exist, otherwise `fs.writeFile` into `backend/uploads`.
6. Then metadata is written: with Mongo via `File.create` and `populate('owner')`, otherwise into the in-memory array with the owner object embedded.
7. The response is the file document; the UI shows a toast, removes the progress row, then bumps `refreshTrigger` so the list re-fetches.

Note the cost: the file passes *through* the API process, so a 50 MB upload occupies roughly 50 MB of server RAM while it is being forwarded to S3. There is no direct browser-to-S3 upload here.

Notes:

- The file bytes pass **through** the API process: multer buffers the whole file in memory, then
  the S3 SDK re-uploads it. Memory use ≈ one file per concurrent upload (up to 50 MB each).
- The storage key is `Date.now() + 8 random bytes + original extension`; the original filename is
  never used as a key, so collisions and path traversal are avoided.
- `bucketFileId` duplicates `s3Key` in this implementation (it is an Appwrite leftover).
- In-memory files carry an embedded owner object and their own email in `users`, which is why the
  demo user sees the seeded files.

### Extension → category

```mermaid
flowchart LR
    EXT["extension from filename"] --> D{"document list?<br/>pdf doc docx txt xls xlsx csv rtf ods ppt odp md html htm epub pages fig psd ai indd xd sketch"}
    D -- yes --> DOC["document"]
    D -- no --> I{"image list?<br/>jpg jpeg png gif bmp svg webp"}
    I -- yes --> IMG["image"]
    I -- no --> V{"video list?<br/>mp4 avi mov mkv webm wmv flv m4v 3gp"}
    V -- yes --> VID["video"]
    V -- no --> A{"audio list?<br/>mp3 wav ogg flac aac wma m4a aiff alac"}
    A -- yes --> AUD["audio"]
    A -- no --> OTH["other"]
```

**In plain words.** This is sorting mail into trays. The server looks only at the letters after the last dot in the filename.

- On the document list → `document`
- On the image list → `image`
- On the video list → `video`
- On the audio list → `audio`
- Nothing matches → `other`

The category is stored on the file record and is what the sidebar tabs filter on, so a `.pdf` always appears under Documents and a `.mp4` under Media. There is no content sniffing: renaming `song.mp3` to `song.pdf` changes its category. The same list exists in the frontend to pick an icon during upload, and the two copies can drift slightly.

This function exists twice: `backend/controllers/file.controller.js` (authoritative, stored in the
DB) and `frontend/src/utils/index.ts` (used for the optimistic thumbnail while uploading). The two
lists are nearly identical but drift slightly (frontend omits `pptx` from its extra list and adds
nothing else); any divergence changes only the icon shown during upload.

## 3. Listing files (every page load)

```mermaid
sequenceDiagram
    autonumber
    participant P as Dashboard / FilesView
    participant AX as apiClient
    participant MW as authMiddleware
    participant FC as file.controller
    participant DB as File model or memory
    participant ST as s3.service

    P->>AX: GET /files?types&searchText&sort&limit
    AX->>MW: Bearer token
    MW->>MW: resolve req.user
    MW->>FC: getFiles
    alt Mongo connected
        FC->>DB: File.find({ $or: [{owner: userId}, {users: user.email}] })
        Note right of FC: + type $in list<br/>+ name regex (case-insensitive)<br/>+ sort createdAt|name|size<br/>+ limit
        DB-->>FC: documents with owner populated
        loop each document
            FC->>ST: presign inline URL (if S3 and bucket != local-storage)
            ST-->>FC: url valid 1 hour
        end
        FC-->>P: { total, documents }
    else memory
        FC->>DB: getFiles({ ownerId, userEmail, types, searchText, sort, limit })
        FC-->>P: { total, documents }
    end
```

**In plain words.** Every page load asks one question: *which files may this user see?*

1. The page calls `GET /api/files` with an optional category list, search text, sort field/order and limit.
2. The guard resolves the user from the token.
3. The controller builds the access filter: files where `owner` is this user **or** the share list `users` contains this user's email.
4. On top of that it applies the category filter, a case-insensitive name search, sorting (`createdAt`, `name` or `size`) and the limit.
5. Each returned file gets its `url` refreshed: in S3 mode a new one-hour signed link per file; in local mode the stable `/uploads/<key>` path.
6. The page receives `{ total, documents }` and renders one card per document.

Because listing, usage and search all reuse that same filter, sharing behaves consistently everywhere. The only extra work per page load is signing URLs — one call per file, with no caching.

Access rule (identical in list, usage and search): **owner `_id` matches** OR **`users` array
contains the requester's email**. `users` is the share list.

## 4. Storage usage (Dashboard)

```mermaid
flowchart TD
    REQ["GET /files/usage"] --> AUTH["authMiddleware"]
    AUTH --> Q{"Mongo connected?"}
    Q -- yes --> Q1["File.find({owner: userId} or {users: email})"]
    Q -- yes --> AGG
    Q -- no --> Q2["inMemoryStore.getFiles({ownerId, userEmail})"]
    Q1 --> AGG
    Q2 --> AGG
    AGG["initialise image/document/video/audio/other = {size:0, latestDate:''}<br/>used = 0, all = 2 GB"] --> LOOP["for each file: add size to its type,<br/>track newest updatedAt/createdAt"]
    LOOP --> OUT["TotalSpace JSON"]
    OUT --> R["Dashboard: donut %, 4 category cards, Media = video + audio"]
```

**In plain words.** This is a tally, not a database query.

1. The dashboard asks `GET /api/files/usage`.
2. The server loads every file the user can see, using the same owner-or-shared rule.
3. It starts five counters at zero — image, document, video, audio, other — each with a size and a latest date, plus a grand total and a limit.
4. For each file it adds the size to its category and remembers the newest date.
5. It returns the totals; the dashboard draws a donut and four cards, where *Media* is video + audio added together.

Two caveats: `all` is hardcoded to 2 GB and nothing enforces it, so the donut can pass 100%; and a file shared with three people counts fully in all three accounts' usage.

Quota handling is display-only: `all` is always `2 * 1024 * 1024 * 1024`, and nothing in upload
rejects a file that would exceed it. The same 2 GB constant is duplicated in
`frontend/src/utils/index.ts` (`calculatePercentage`) and in `Dashboard.tsx`'s initial state.

## 5. Download / open

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant W as New tab (window.open)
    participant MW as authMiddleware
    participant FC as file.controller
    participant ST as s3.service
    participant OBJ as S3 or disk

    U->>W: click card, or Download action
    W->>MW: GET /files/:id/download?token=JWT&inline=true
    MW->>MW: token from query string
    MW->>FC: downloadFile
    FC->>FC: find file by id (Mongo, else memory)
    alt S3 active and bucket != local-storage
        FC->>ST: getDownloadUrlForFile(s3Key, name, inline|attachment)
        ST-->>FC: presigned GET (1 hour, Content-Disposition set)
        FC-->>W: 302 Location: presigned URL
        W->>OBJ: GET bytes directly from S3
    else local storage and file exists
        FC-->>W: res.sendFile (inline) or res.download (attachment)
    else url is absolute or a public asset
        FC-->>W: 302 to file.url
    else nothing usable
        FC-->>W: 200 { status: "ready", name, url }
    end
```

**In plain words.** Opening a file and downloading it are the same endpoint with a different flag.

1. The card opens `/api/files/:id/download?token=<JWT>&inline=true` in a new tab; the download action uses the same URL without `inline`.
2. The guard accepts the token from the query string because a plain `window.open` cannot send headers.
3. The controller loads the file record.
4. **S3 mode:** it asks the SDK for a presigned `GetObject` URL — a temporary link that already contains permission — sets `Content-Disposition` to inline or attachment, and replies `302`. The browser then downloads from S3 directly.
5. **Local-disk mode:** Express sends the file with `sendFile` (inline) or `download` (attachment).
6. If the record only holds a plain public URL, it redirects there; if nothing is usable it returns a small JSON placeholder.

The signed URL is valid for an hour and is not tied to the user after it is issued: anyone who copies it can fetch the file until it expires. That is also why each listing has to mint new links.

In S3 mode the bytes never transit the API for downloads — only metadata does. In local-disk mode
they stream through Express. Note that the presigned URL is valid for an hour and is not tied to
the requesting user once issued.

## 6. Rename, share, delete

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant AD as ActionDropdown modal
    participant MW as authMiddleware
    participant FC as file.controller
    participant DB as File model or memory
    participant OBJ as S3 or disk

    U->>AD: Rename → new base name
    AD->>MW: PATCH /files/:id/rename { name, extension }
    MW->>FC: renameFile
    FC->>DB: find by id, ensure ".ext" suffix, save
    FC-->>AD: updated document

    U->>AD: Share → add/remove emails
    AD->>MW: PATCH /files/:id/share { emails }
    MW->>FC: updateFileUsers
    FC->>DB: file.users = unique(emails), save
    FC-->>AD: updated document

    U->>AD: Delete → confirm
    AD->>MW: DELETE /files/:id
    MW->>FC: deleteFile
    FC->>DB: find file by id
    FC->>OBJ: deleteFileFromStorage(file.s3Key)
    FC->>DB: findByIdAndDelete / deleteFile
    FC-->>AD: { status: "success" }
```

**In plain words.** Three small operations, each one request.

- **Rename** sends a new base name and the existing extension; the controller looks up the file, appends `.ext` if it is missing, and saves. Only the display name changes — the storage key and the bytes stay put.
- **Share** sends the complete list of emails. The controller lowercases and de-duplicates it, stores it in `users`, and returns the file. There is no invitation and no notification: the next time that person loads their list, the file is there.
- **Delete** looks up the file, deletes the blob (`DeleteObject` in S3 or `unlink` on disk), then removes the metadata. It is immediate and there is no trash.

The gap: none of these three checks that the caller owns the file. A valid token is enough, so anyone who knows a file id can rename, re-share or delete it — while listing and search are properly scoped.

**Authorization gap:** the only check is "is there a valid JWT". `renameFile`, `updateFileUsers` and
`deleteFile` never compare `file.owner` with `req.user`, so any signed-in user who knows (or guesses)
a file id can rename, re-share or delete it. Listing and search are correctly scoped; single-file
mutations are not.

Sharing has no acceptance step and no notification: adding an email immediately makes the file
appear in that user's list the next time they load it, and lets them delete it (see above).

## 7. Search

```mermaid
flowchart LR
    IN["GET /search?query=foo"] --> AU["authMiddleware"]
    AU --> E{"query empty?"}
    E -- yes --> EMPTY["[]"]
    E -- no --> DBQ{"Mongo connected?"}
    DBQ -- yes --> M["File.find({ $and: [ access rule,<br/>{ $or: name|type|extension regex } ] })<br/>sort createdAt desc, limit 10, populate owner"]
    DBQ -- no --> MEM["inMemoryStore.getFiles({ searchText: name contains })<br/>limit 10"]
    M --> PRESIGN["presign inline urls when S3 active"]
    PRESIGN --> OUT["FileDoc[]"]
    MEM --> OUT
```

**In plain words.** Search is a text match, not semantic search.

1. The query arrives at `GET /api/search?query=…` behind the guard.
2. Empty query → an empty array, no database work.
3. **Mongo mode:** one query combining the access rule with a case-insensitive pattern over `name`, `type` and `extension`, newest first, at most ten, owner populated.
4. **Memory mode:** a simple lowercase *contains* on the name only, also capped at ten.
5. In S3 mode each hit gets a fresh inline signed URL so the thumbnail can load.

So typing `pdf` matches the type and extension in Mongo mode, but only filenames in memory mode. Either way the result is a short preview list; the real filtered listing happens on the category page you land on.

Differences between the two modes: Mongo searches `name`, `type` and `extension`; the in-memory
store searches only `name`. Mongo is case-insensitive via `$regex /i`; memory lowercases the query
and the filename.

## 8. Fallback decision tree (runs at boot and per request)

```mermaid
flowchart TD
    BOOT["node server.js"] --> DBQ{"MONGODB_URI set?"}
    DBQ -- no --> MEM["in-memory store active<br/>demo user demo@mistcloud.com / password123<br/>5 seeded files"]
    DBQ -- yes --> TRY["mongoose.connect (2 s serverSelectionTimeout)"]
    TRY -- ok --> MONGO["readyState = 1"]
    TRY -- fail --> MEM

    BOOT --> S3Q{"AWS key + secret + bucket set?"}
    S3Q -- no --> DISK["local disk backend/uploads<br/>url = /uploads/:key"]
    S3Q -- yes --> S3["S3Client ready"]

    BOOT --> SMQ{"SMTP_USER and SMTP_PASS set?"}
    SMQ -- no --> CONSOLE["OTP printed in server logs"]
    SMQ -- yes --> SMTP["nodemailer sendMail"]
```

**In plain words.** At boot the app checks three sockets, like a power strip with backup batteries.

- **Database socket.** No `MONGODB_URI` → in-memory store with a demo user and five seed files. URI present → try to connect with a 2-second timeout; failure → fall back to memory too.
- **Storage socket.** AWS key, secret and bucket all present → S3 client. Anything missing → local `backend/uploads`, with URLs served from `/uploads`.
- **Mail socket.** SMTP user and password present → real email. Missing → the code is printed in the server log.

Every branch is caught, so a misconfigured server still starts and looks healthy. The tells are subtle: data disappears after a restart (memory), files vanish when the machine is rebuilt (local disk), and no email ever arrives. This is why the failure is described as *silent* — nothing in the UI says which mode is active.

Because every failure is caught, a misconfigured deployment looks like a working one. The only
visible clue is the server log line printed at boot, plus data that disappears on restart
(in-memory) or files that vanish when the container is rebuilt (local disk).

| Runtime mode | Users | File metadata | File bytes | OTP delivery |
| --- | --- | --- | --- | --- |
| Fully configured | MongoDB | MongoDB | S3 | Email |
| No Mongo | process memory (reset on restart) | process memory | S3 or disk | Email or console |
| No S3 | MongoDB or memory | MongoDB or memory | `backend/uploads` | Email or console |
| No Mongo + no S3 | process memory | process memory | `backend/uploads` | console |
| Everything missing | demo store + auto-provisioned users | demo + uploaded | local disk | console |
