# ☁️ Cloudy: Personal Storage with Intelligence

Welcome to the internal documentation of **Cloudy**. This guide explains the "magic" happening under the hood—from how you log in to how the system "understands" the content of your files.

---

## 🛠️ The Tech Stack: Why these?

We didn't just pick these technologies because they are popular; we picked them because they work together to create a **fast, secure, and smart** experience.

| Technology | Role | Why we used it? |
| :--- | :--- | :--- |
| **Next.js (16+)** | Frontend & Backend | Provides a unified framework for fast page loads (SSR) and secure backend logic (Server Actions). |
| **Appwrite** | The Core Engine | Handles everything from User Authentication to Database and File Storage. It's a powerful open-source alternative to Firebase. |
| **Groq (AI)** | The Brain | Groq is the world's fastest AI inference engine. We use it to "read" your PDFs and "see" your images in milliseconds. |
| **Upstash Vector** | Smart Search | Instead of just searching for filenames, this allows "Semantic Search" (searching by meaning). |
| **Tailwind CSS** | Styling | Allows us to build a premium, responsive, and modern UI quickly without writing thousands of lines of CSS. |

---

## 🔐 Authentication Workflow (The OTP Flow)

Unlike traditional password-based systems, Cloudy uses a **Passwordless OTP (One-Time Password)** system. It's more secure and easier for users.

### 1. The Trigger (Sign-up / Sign-in)
- When a user enters their email, the `sendEmailOTP` action is triggered.
- **Backend**: Appwrite's `createEmailToken` is called. Appwrite automatically generates a unique 6-digit code and sends it to the user's inbox.

### 2. The Verification
- The user enters the code received in their email.
- **Backend**: The `verifySecret` action calls Appwrite's `createSession`. If the code matches, Appwrite generates a **Session Secret**.

### 3. The Security (Cookies)
- We don't store the session in local storage (which is vulnerable). Instead, we store it in a **HttpOnly Cookie**.
- This means the browser can't read the session via JavaScript, protecting the user from XSS attacks.

---

## 📂 Storage & Metadata Pipeline

When you upload a file, it's not just "saved." A whole pipeline of events is triggered.

### Step 1: Physical Storage
The file is uploaded to the **Appwrite Bucket**. This is where the actual bytes (PDF, JPG, MP4) live.

### Step 2: Metadata Database
We create a document in the **Files Collection** (Database) that stores:
- **Owner ID**: Who uploaded it.
- **Type/Extension**: Is it a video or a document?
- **URL**: A unique link to view/download the file.
- **Shared Users**: A list of emails who have access to this file.

### Step 3: Access Control (Security)
Every time a file is fetched, we run a query:
*"Give me files where (Owner == MyID) OR (MyEmail is in the Shared List)."*
This ensures your files are private unless you choose to share them.

---

## 🧠 The "Intelligence" Pipeline (Semantic Search)

This is what makes Cloudy different from Google Drive or Dropbox. When a file is uploaded, we trigger a **Background Pipeline**.

### 1. Extraction
- **For PDFs**: We extract the text from the document.
- **For Images**: We use Groq's Vision model (Llama-3-Scout) to "look" at the image and describe it.

### 2. Summarization (Groq)
We send the extracted data to **Groq**.
- For a 50-page PDF, Groq generates a concise 2-sentence summary.
- For an image of a beach, Groq generates: *"A sunny beach with blue waves and golden sand."*

### 3. Vector Indexing (Upstash)
We take this summary/description and send it to **Upstash Vector**.
- Upstash converts this text into **Numbers (Vectors)**.
- If you search for *"summer vacation"*, Upstash looks for files with vectors mathematically similar to that phrase, even if the filename is just `IMG_1234.jpg`.

---

## 🔄 The Search Workflow

1. **User enters query**: *"Invoices from March"*
2. **Upstash Check**: We ask Upstash, *"Which files talk about invoices in March?"*
3. **ID Retrieval**: Upstash returns the IDs of the top 5 most relevant files.
4. **Appwrite Fetch**: We fetch the full metadata (names, urls) for those IDs from Appwrite.
5. **Result**: The user sees the most relevant files instantly.

---

## 📊 Database Collections Summary

### `Users` Collection
- `fullName`: User's display name.
- `email`: Primary identifier.
- `accountId`: Maps to the Appwrite Auth system.
- `avatar`: URL to user profile picture.

### `Files` Collection
- `name`: Filename.
- `type`: Category (image, document, video, etc).
- `url`: The link to the file.
- `owner`: Relationship to the User.
- `users`: List of shared emails.
- `bucketFileId`: The link to the actual file in storage.

---

## 🔬 Deep Dive: Internal Processes

To truly understand Cloudy, we need to look at the mathematical and architectural "why" behind the technologies.

### 1. Upstash Vector: The Geometry of Meaning
When you search for "Blue car," Upstash doesn't look for the letters B-L-U-E. It uses **Vector Embeddings**.

*   **What is an Embedding?**: Our system sends the summary text to an embedding model (like `bge-m3`). This model converts the sentence into a list of ~1024 numbers (a vector). This vector represents the "location" of that concept in a high-dimensional mathematical space.
*   **Cosine Similarity**: When you search, your query is also turned into a vector. Upstash calculates the **Cosine Similarity** (the cosine of the angle between two vectors). 
    *   If the angle is small (close to 0°), the vectors are pointing in the same direction, meaning the concepts are highly related.
    *   This is why searching for *"Happy"* can find a file that only mentions *"Joyful"*—they live in the same "neighborhood" in the vector space.

### 2. Groq: Why is it so fast?
Most AI runs on GPUs (Graphics Processing Units). Cloudy uses **Groq**, which uses a **LPU (Language Processing Unit)**.
*   **SRAM over HBM**: Unlike GPUs that wait for data from slow memory, Groq’s LPU uses high-speed SRAM, allowing it to process tokens (words) at speeds exceeding 500 tokens/second.
*   **Vision Processing**: For images, we use Groq's vision models. It "decodes" the pixels into visual tokens, which the LLM then describes in natural language. This description is what eventually becomes the searchable vector in Upstash.

### 3. Appwrite: The BaaS Architecture
Appwrite acts as our "Headless Backend." 
*   **File Buffering**: When you upload, we read the file into a `Buffer` in the Next.js server-side environment before sending it to Appwrite. This prevents the client from needing a direct connection to the storage bucket, keeping your API keys hidden.
*   **Atomic Operations**: When a file is uploaded, we ensure the storage file and the database document are created in a sequence. If the database entry fails, we trigger a "cleanup" to delete the orphan file from storage.

### 4. Next.js: Server Actions & Security
Cloudy uses **Server Actions** instead of traditional API routes.
*   **RPC Pattern**: When you click "Rename," Next.js makes a secure POST request (Remote Procedure Call) to the server.
*   **Zero-JS Footprint**: Because the logic for renaming or deleting lives on the server, the code for Appwrite and Groq is never sent to the user's browser. This makes the app incredibly lightweight and impossible to hack from the frontend.

---

## 🚀 Deployment & Pipelines

- **CI/CD**: Usually deployed via Vercel or similar platforms.
- **Revalidation**: We use `revalidatePath("/")` to ensure the UI updates instantly after you upload, rename, or delete a file without needing a full page refresh.

---

> [!TIP]
> **Why Appwrite instead of Supabase?**
> Appwrite provides a more "all-in-one" experience for Node.js developers, especially with its built-in Image Transformation and easy-to-use Storage Buckets that integrate perfectly with its Auth system.
