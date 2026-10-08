# 🧠 DocuChat AI (formerly TalkToPDF)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

**DocuChat AI** is a powerful, full-stack Retrieval-Augmented Generation (RAG) application that transforms static PDF documents into interactive, conversational AI assistants. By leveraging Google Gemini, MongoDB Vector Search, and Redis, it allows users to intuitively "talk" to their documents and retrieve highly accurate, context-aware answers.

---

## ✨ Features

- **📄 Smart Document Ingestion**: Upload any PDF document to securely extract, clean, and process the text content.
- **🧠 Semantic Vector Search**: Text is split into meaningful chunks and embedded into high-dimensional vector embeddings, which are then queried for semantic relevance.
- **💬 Conversational AI**: Ask questions in natural language and receive grounded, accurate answers directly sourced from the document, powered by Google's Gemini AI.
- **⚡ Real-time Streaming**: Enjoy a ChatGPT-like experience with Server-Sent Events (SSE) streaming responses in real-time.
- **⏳ Background Processing**: Heavy tasks like text parsing, chunking, and embedding generation are offloaded to asynchronous background workers to ensure the main API remains fast and responsive.
- **📚 Persistent Chat History**: Conversations are seamlessly stored and managed per session using Redis.

---

## 🏗️ Architecture & Tech Stack

**Flow of Execution:**
1. **Upload**: User uploads a PDF via the React frontend.
2. **Acceptance**: Express API receives the file, storing metadata in MongoDB.
3. **Queuing**: A background job is dispatched to a Redis queue.
4. **Worker Processing**: The worker parses the PDF, chunks the text, invokes Gemini to generate embeddings, and saves them in MongoDB Atlas.
5. **Querying**: User asks a question about the document.
6. **Retrieval**: MongoDB Vector Search retrieves the most semantically relevant text chunks.
7. **Generation**: Gemini generates a grounded response using the retrieved chunks and streams it back to the client.

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React + Vite | Fast, responsive User Interface |
| **Backend** | Node.js + Express | Robust REST API and Server-Sent Events |
| **Database** | MongoDB Atlas | Storage for document metadata and Vector Embeddings |
| **Queue / Cache** | Redis | Job queuing and transient Chat History storage |
| **AI Engine** | Google Gemini APIs | Text Embeddings & Large Language Model (LLM) generation |
| **File Handling** | Multer + pdf-parse | Multipart uploads and raw text extraction |

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed and set up:
- **Node.js** (v20 or higher recommended)
- **MongoDB Atlas** account (for database and vector search capabilities)
- **Redis** server (running locally or remotely)
- **Google Gemini API Key** (Get one from Google AI Studio)

### 2. Installation
Clone the repository and install dependencies for both frontend and backend.

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Environment Variables Setup
In the `backend` directory, create a `.env` file and populate it with your credentials:

```env
PORT=8000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/<database>
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. MongoDB Vector Search Configuration
To enable the semantic search capabilities, you must create a Vector Search Index in MongoDB Atlas.

1. Go to your MongoDB Atlas dashboard -> **Search** -> **Create Search Index**.
2. Select **JSON Editor**.
3. Target the `chunks` collection.
4. Name the index `vector_index`.
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

### 5. Running the Application

You will need three terminal windows to run all services simultaneously.

**Terminal 1: Start the Backend API**
```bash
cd backend
npm run dev
```

**Terminal 2: Start the Background Worker**
```bash
cd backend
node --env-file=.env src/runWorker.js
```

**Terminal 3: Start the Frontend UI**
```bash
cd frontend
npm run dev
```

The application UI will be accessible at `http://localhost:5173`.

---

## 🌐 API Reference

### Document Management
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/documents/upload` | Upload a new PDF and queue ingestion |
| `GET` | `/api/documents` | Retrieve a list of all processed documents |
| `GET` | `/api/documents/:id` | Fetch details of a specific document |
| `DELETE` | `/api/documents/:id` | Remove a document and its associated vector chunks |

### Chat Interface
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat/ask` | Submit a question and receive a streamed AI response |
| `GET` | `/api/chat/history/:sessionId` | Fetch the chat history for a given session |
| `DELETE`| `/api/chat/history/:sessionId` | Clear the chat history for a session |

### Job Monitoring
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/job/:jobId` | Poll the status of a background ingestion job |

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📜 License
This project is licensed under the MIT License. Use it for learning, modifying, and building your own RAG applications!
