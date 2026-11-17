# Mist Cloud — Architecture & Workflow Documentation

This folder documents the code **as it runs today**, not as older notes describe it.

> ⚠️ Repo docs drift: [`ARCHITECTURE.md`](../ARCHITECTURE.md), [`DEPLOYMENT.md`](../DEPLOYMENT.md),
> [`forme.md`](../forme.md), [`ForMe2.md`](../ForMe2.md) and [`For-Me2.md`](../For-Me2.md) describe a
> **Next.js + Appwrite + Groq + Upstash** app. That code does not exist in this repository.
> The running stack is **React (Vite) + Express + MongoDB (Mongoose) + AWS S3**, with in-memory and
> local-disk fallbacks. Everything in `docs/` reflects the actual source files.

## Read in this order

| Doc | What it answers |
| --- | --- |
| [00-technology-architecture.md](00-technology-architecture.md) | **Start here.** Every technology in one connected diagram, one upload/download traced through the whole stack, and what each tool actually does. |
| [01-system-architecture.md](01-system-architecture.md) | What the system is, how it is deployed, how the backend is layered, the full API surface. |
| [02-frontend.md](02-frontend.md) | Route tree, component tree, where state lives, how the UI refreshes, how search works. |
| [03-workflows.md](03-workflows.md) | Step-by-step sequences: signup/signin/OTP, upload, list, usage, download, rename/share/delete, fallbacks. |
| [04-data-model.md](04-data-model.md) | MongoDB schemas, in-memory equivalents, metadata vs. bytes movement, who can see which file. |
| [05-findings.md](05-findings.md) | Workflow gaps, security/data risks, dead code, unused dependencies, suggested reading order of source. |

Every diagram in every file is followed by an **In plain words** explanation that walks through
what is happening without assuming prior knowledge of the stack.
| [diagrams.html](diagrams.html) | All diagrams in one renderable page (opens in a browser; needs internet for the Mermaid CDN). |

## 60-second summary

- **One repo, two servers.** Root [`server.js`](../server.js) is the "everything" server on
  `:3000` (API + built SPA). [`backend/server.js`](../backend/server.js) is a standalone API-only
  server on `:5000` used with the Vite dev server's proxy.
- **Frontend** = React SPA, React Router, Axios, Tailwind. Auth state in a context; JWT in
  `localStorage`; every API call carries `Authorization: Bearer <token>`.
- **Backend** = Express routers → controllers → services. Auth is password + a 6-digit OTP
  (hardcoded `123456`) that mints a 30-day JWT. Files are hashed into 5 categories by extension.
- **Storage** = binary bytes in **S3** (or `backend/uploads` on disk), metadata in **MongoDB**
  (or an in-process map). Reads of bytes go browser → API → 302 redirect to an S3 presigned URL.
- **Degradation is automatic and silent.** No Mongo → in-memory demo store. No AWS keys → local
  disk. No SMTP → OTP logged to console. The app always boots, which is great for demos and
  dangerous for production expectations.

## Rendering the diagrams

- GitHub / VS Code (Markdown Preview Mermaid Support) / Obsidian render the ```mermaid blocks
  in the `.md` files directly.
- `diagrams.html` is a standalone viewer: open it in a browser and use the sidebar. It loads
  Mermaid from jsDelivr, so it needs network access the first time.
