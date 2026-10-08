# 🧠 TalkToPDF

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

**TalkToPDF** is an advanced, production-ready full-stack **Retrieval-Augmented Generation (RAG)** application. It completely redefines how users interact with dense information by transforming static, multi-page PDF documents into interactive, conversational AI assistants. 

By heavily leveraging Google Gemini for both Large Language Model (LLM) generation and high-dimensional Text Embeddings, alongside MongoDB Atlas Vector Search and Redis for distributed queuing and caching, TalkToPDF provides a fast, highly accurate, and grounded answering system.

---

## ✨ Core Features

- **📄 Smart Document Ingestion Pipeline**: Upload any complex PDF document. The backend securely extracts the text, sanitizes it, and prepares it for processing.
- **🧠 Advanced Semantic Vector Search**: The application splits extracted text into semantically cohesive, overlapping chunks. These chunks are embedded into 768-dimensional vector representations and indexed in MongoDB Atlas, allowing the AI to perfectly retrieve information based on meaning rather than mere keyword matching.
- **💬 Conversational AI & Context Awareness**: Ask questions in natural English and receive highly accurate, grounded answers. The AI strictly answers based *only* on the contents of the uploaded document, preventing hallucinations.
- **⚡ Real-time SSE Streaming**: To provide a seamless "ChatGPT-like" UX, the backend streams the AI's response token-by-token directly to the React frontend using Server-Sent Events (SSE).
- **⏳ Asynchronous Background Processing**: Heavy analytical tasks (PDF parsing, chunking algorithms, AI embedding generation) are decoupled from the main thread. A dedicated Redis-backed Worker processes these jobs to ensure the main API remains lighting fast and highly available.
- **📚 Persistent Chat History**: Conversations are persistently stored in a Redis cache managed per user session, providing the AI with conversational memory (e.g. "Can you elaborate on your previous point?").
- **🛡️ Built-in Rate Limiting**: Ensures fair usage and API protection via Redis-backed rate limiters.

---

## 🏗️ Architecture & Component Breakdown

The architecture is strictly decoupled into a fast API Gateway layer and an asynchronous Worker layer.

### System Workflow
1. **Upload Phase**: The user uploads a PDF via the React frontend.
2. **Acceptance**: The Express API safely receives the multipart-form data, temporarily stores the file, creates a document metadata entry in MongoDB, and dispatches a background job to a Redis message queue.
3. **Worker Processing**:
   - **Text Extraction**: The worker uses `pdf-parse` to strip out all text.
   - **Chunking**: The text is passed through an algorithmic chunker that splits it into optimized paragraphs (e.g., 1000 characters) with a defined overlap (e.g., 200 characters) to ensure no context is lost at the boundaries.
   - **Embedding**: Batches of chunks are sent to the Google Gemini Embedding API (`text-embedding-004`).
   - **Indexing**: The resulting vectors are securely inserted into MongoDB Atlas.
4. **Query Phase**: The user submits a natural language question.
5. **Retrieval**: The user's question is embedded into a vector. MongoDB Vector Search (`$vectorSearch`) computes the cosine similarity against all document chunks and returns the top `K` most relevant chunks.
6. **Generation**: A carefully crafted prompt, containing the user's question and the retrieved chunks, is sent to the Gemini LLM.
7. **Streaming**: Gemini streams the response, which is piped through the Express API directly to the user's screen.

---

## 📂 Project Structure

```text
TalkToPDF/
├── backend/
│   ├── server.js               # Express API Entry Point
│   └── src/
│       ├── runWorker.js        # Redis Worker Entry Point
│       ├── config/             # DB, Redis, and Gemini initializers
│       ├── controllers/        # Route logic and request handling
│       ├── middlewares/        # Rate limiting, file uploads, error catching
│       ├── models/             # Mongoose schemas (Documents, Chunks)
│       ├── routes/             # API endpoint definitions
│       ├── services/           # Business logic (LLM, Embeddings, PDF, Retrieval)
│       ├── utils/              # Standardized API Responses and Error classes
│       └── worker/             # Ingestion job processing logic
└── frontend/
    ├── vite.config.js
    └── src/
        ├── App.jsx             # Main Application View
        ├── components/         # ChatBox, Sidebar, UploadArea UI components
        └── utils/              # API clients and Server-Sent Event (SSE) parsers
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed and configured:
- **Node.js** (v20 or higher recommended)
- **MongoDB Atlas** account (Must be Atlas for Vector Search capabilities)
- **Redis** server (Running locally via Docker or a cloud instance)
- **Google Gemini API Key** (Obtain from Google AI Studio)

### 2. Installation
Clone the repository and install the dependencies for both layers.

```bash
git clone https://github.com/saaisaahitthi/TalkToPDF.git
cd TalkToPDF

# Install Backend
cd backend
npm install

# Install Frontend
cd ../frontend
npm install
```

### 3. Environment Variables Setup
In the `backend` directory, create a `.env` file and populate it:

```env
PORT=8000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Configure MongoDB Atlas Vector Search Index
This is a critical step. The semantic search will fail without an explicit index.
1. Go to your MongoDB Atlas Dashboard -> **Atlas Search**.
2. Click **Create Search Index** -> **JSON Editor**.
3. Select your Database and the `chunks` collection.
4. Name the index `vector_index` (it must match exactly).
5. Paste the following configuration:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "documentId"
    }
  ]
}
```

### 5. Running the Application Locally
You will need three separate terminal windows to run the microservices locally.

**Terminal 1: Start the Backend API Gateway**
```bash
cd backend
npm run dev
```

**Terminal 2: Start the Background Ingestion Worker**
```bash
cd backend
node --env-file=.env src/runWorker.js
```

**Terminal 3: Start the React Frontend**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173` in your browser to start interacting!

---

## 🌐 Complete API Reference

### Document Management (`/api/documents`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload` | Multipart upload for a new PDF; triggers the background ingestion job. |
| `GET` | `/` | Retrieves metadata for all previously processed documents. |
| `GET` | `/:id` | Fetches details and ingestion status of a specific document. |
| `DELETE` | `/:id` | Cascading delete; removes the document metadata and all associated vector chunks. |

### Conversational AI (`/api/chat`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ask` | Submit a prompt. Returns a `text/event-stream` (SSE) of the generated AI answer. |
| `GET` | `/history/:sessionId` | Retrieves the Redis-cached chat memory for the given session. |
| `DELETE`| `/history/:sessionId` | Flushes the session memory from Redis. |

### Background Jobs (`/api/job`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/:jobId` | Poll this endpoint to get real-time status updates on PDF processing. |

---

## 🛠️ Troubleshooting

- **No answers returned / Similarity Search Fails**: Ensure your MongoDB Vector Index is named exactly `vector_index` and that it has finished building in the Atlas dashboard.
- **Worker Crashes on Upload**: Ensure your local Redis instance is running (`redis-cli ping` should return `PONG`).
- **Gemini API Errors**: Verify your API key has enough quota and is authorized for `gemini-1.5-flash` and `text-embedding-004` models.

---

## 📜 License
This software is provided under the MIT License. Feel free to use, modify, and build your own highly capable RAG pipelines!
