# LinguaLoop: Conversational Voice & Text AI English Tutoring Platform

LinguaLoop is a real-time interactive language tutoring application featuring low-latency voice calling and Server-Sent Events (SSE) text chat. It leverages edge-based Speech-to-Text (STT), full-duplex WebSocket communication, sentence-boundary chunking, and the Mastra Agent framework powered by Ollama (`qwen2.5:1.5b`).

The platform enforces a strict, demanding English tutor persona that tailors conversation topics, vocabulary, and questions according to the user's demographic profile (age, education standard, learning goals, hobbies, and proficiency level) while providing mandatory grammar and sentence structure feedback on every conversational turn.

---

## Core Features

- Edge-Based Speech-To-Text (STT): Utilizes the browser-native `SpeechRecognition` API for instant, client-side audio transcription. Eliminates high-bandwidth audio uploads and costly server-side GPU inference for STT.
- Full-Duplex WebSocket Voice Gateway: Bi-directional persistent communication channel (`ws://localhost:5000/audio-stream`) supporting real-time user speech input, AI speech streaming, and cancellation signals.
- Low-Latency Sentence-Boundary Chunking: Streams LLM response tokens and buffers them until sentence punctuation (`[.!?]`) is detected. Generates discrete audio chunks via Microsoft Edge Neural TTS (`msedge-tts`) and plays them back with sub-second time-to-first-audio latency.
- Real-Time Barge-In & Interruption Handling: Instantly cancels browser audio output (`speechSynthesis.cancel()`) when user speech is detected during AI output. Sends a high-priority `INTERRUPT` payload to abort backend LLM generation using an `AbortController`.
- Personalized Demographics & Level Adaptation: Automatically inspects user profile attributes (`age`, `studyStandard`, `englishRating`, `learningGoal`, `hobbies`) to adjust topic selection. Young learners are shielded from adult/business scenarios and guided through age-appropriate role-plays.
- Strict Tutor Persona with Mandatory Feedback: Demands well-formed complete sentences and appends an explicit `**Feedback:**` section to every response containing corrections or structural validation.
- Dual Database Architecture: Redis maintains transient voice session state, active call statuses, and activity heartbeats. MongoDB persists user accounts, user profiles, and Mastra conversation thread histories.
- Server-Sent Events (SSE) Text Chat: Provides text-based streaming chat (`/api/agent/chat`) with token streaming over standard HTTP headers.
- OpenAPI / Swagger Documentation: Interactive API specification rendered at `/api/docs`.

---

## Technology Stack

### Backend
- Framework: Node.js (>=22.13.0), Express 5, TypeScript
- AI Framework: `@mastra/core` (v1.64.0), `@mastra/memory`, `@mastra/mongodb`
- Model Provider: `ai-sdk-ollama` running `qwen2.5:1.5b` locally via Ollama
- Real-Time Protocol: WebSocket (`ws` v8.21.3)
- Text-To-Speech: `msedge-tts` (v2.0.7) for neural speech generation
- Primary Database: MongoDB & Mongoose (v9.9.5)
- Cache & Session Store: Redis & `ioredis` (v6.0.0)
- Security & Auth: JWT (`jsonwebtoken` v9.0.3), `bcryptjs` (v3.0.3)
- Documentation: `swagger-jsdoc` & `swagger-ui-express`

### Frontend
- Core Library: React 19, TypeScript
- Build Tool: Vite (v8.2.2)
- Router: `react-router-dom` (v7.18.3)
- Styling: Tailwind CSS (v3.4.19), PostCSS, Autoprefixer
- Icons: `lucide-react`
- Web APIs: Web Speech API (`window.SpeechRecognition`, `window.speechSynthesis`), Native WebSockets

---

## System Architecture & Data Flow

```
+------------------------------------------------------------------------------+
|                                CLIENT BROWSER                                |
|                                                                              |
|  [Microphone]                                                 [Speaker]      |
|       |                                                           ^          |
|       v                                                           |          |
| [Web Speech STT]                                          [Web Speech TTS /  |
| (SpeechRecognition)                                        Audio Decoder]    |
|       |                                                           ^          |
|       | "USER_SPEECH"                                             | "AI_SPEECH"
|       v                                                           |          |
| +--------------------------------------------------------------------------+ |
| |                           useVoiceChat Hook                              | |
| +--------------------------------------------------------------------------+ |
+--------------------------------------|----------------------------^----------+
                                       | WebSocket                  |
                                       | ws://host/audio-stream     |
+--------------------------------------v----------------------------|----------+
|                                BACKEND SERVER                                |
|                                                                              |
| [VoiceConnectionHandler (voice.controller.ts)]                               |
|   - Parses query parameters (conversationId, userId)                         |
|   - Dispatches USER_SPEECH, INTERRUPT events                                 |
|                                      |                                       |
|                                      v                                       |
| [VoiceService (voice.service.ts)] <=======> [RedisService (redis.service.ts)]|
|   - Manages AbortController instances        - Stores ephemeral session      |
|   - Sentence-boundary chunking [.!?]           status (connected, streaming, |
|   - Synthesizes audio with msedge-tts          interrupted) & TTL heartbeats |
|                                      |                                       |
|                                      v                                       |
| [Mastra Agent (src/mastra/agents/agent.ts)]                                  |
|   - Persona: English Practice Tutor                                          |
|   - Streaming LLM inference: agent.stream(...)                               |
|   - Memory Store: MongoDB thread history & user profile injection            |
+------------------------------------------------------------------------------+
```

### Voice Data Transport Sequence
1. Audio Capture & STT: Client initializes `SpeechRecognition` in continuous mode. User speech is processed locally.
2. 3-Second Silence Debounce: Upon detecting a 3-second pause with zero user speech, the client finalizes the text segment.
3. Payload Transmission & Mute: Client transmits a JSON payload `{ "type": "USER_SPEECH", "text": "..." }` over the WebSocket and immediately auto-mutes the microphone to prevent self-echo during AI response generation.
4. Server Ingestion & Profile Context: Backend retrieves the active session from Redis, injects `UserProfile` attributes into Mastra `RequestContext`, and invokes `agent.stream()`.
5. Sentence Chunking & Synthesis: `VoiceService` buffers LLM text tokens. When sentence punctuation (`.`, `!`, `?`) is matched, `msedge-tts` synthesizes the text into audio buffers sent directly over the WebSocket.
6. Playback & Unmute: The client plays received audio chunks. Once playback finishes and `AI_TURN_COMPLETE` is received, the microphone automatically unmutes after a 300ms settling delay.
7. Interruption Protocol: If the user speaks while AI audio is playing, the client cancels `speechSynthesis` and transmits `{ "type": "INTERRUPT" }`. The server executes `AbortController.abort()`, terminating LLM generation and updating Redis session state to `interrupted`.

---

## Database Schemas & Data Models

### MongoDB Schemas

#### User Schema (`agent/src/models/User.ts`)
- `name` (String, required, 2-50 chars, trimmed): Full name of the user.
- `email` (String, required, unique, lowercase, regex-validated): Primary authentication identifier.
- `password` (String, required, select: true, minlength 6): Bcrypt-hashed password.
- `timestamps`: `createdAt` and `updatedAt` ISO date records.

#### UserProfile Schema (`agent/src/models/User-Profile.ts`)
- `userId` (String, required, unique, indexed): Reference to associated User ID.
- `age` (String, optional): Age of the learner (e.g., `"12"`, `"25"`).
- `studyStandard` (String, optional): Education level (e.g., `"Grade 7"`, `"Undergraduate"`).
- `englishRating` (String, optional): Self-assessed proficiency (`"Beginner"`, `"Intermediate"`, `"Advanced"`).
- `learningGoal` (String, optional): Target objective (`"General Fluency"`, `"Job Interview"`, `"Exam Prep"`).
- `hobbies` (String, optional): Comma-separated user interest tags used for prompt adaptation.
- `isOnboarded` (Boolean, default: `false`): Flag indicating profile setup completion.

---

### Redis Session Data Model (`agent/src/services/redis.service.ts`)

- Key Structure: `voice:session:<conversationId>`
- Default TTL: 86400 seconds (24 hours)
- Payload Structure:
  ```json
  {
    "conversationId": "string (UUID)",
    "userId": "string (MongoDB ObjectId)",
    "status": "connected | streaming | interrupted | closed",
    "userProfile": {
      "age": "string",
      "studyStandard": "string",
      "englishRating": "string",
      "learningGoal": "string",
      "hobbies": "string",
      "isOnboarded": true
    },
    "createdAt": "ISO Timestamp",
    "lastActiveAt": "ISO Timestamp"
  }
  ```

---

## Project Structure

```
LinguaLoop/
├── README.md                       Root project documentation
├── architecture.txt                Architectural specification document
└── agent/                          Main application workspace
    ├── Makefile                    System build, service management, and launch commands
    ├── package.json                Dependencies, engine versions, and script definitions
    ├── tsconfig.json               TypeScript compiler settings
    ├── vite.config.ts              Vite bundler configuration
    ├── tailwind.config.js          Tailwind CSS configuration
    ├── .env.example                Environment variable templates
    └── src/
        ├── app.ts                  Express application initialization, CORS, routes, error handlers
        ├── server.ts               HTTP server bootstrapper, MongoDB connection, WS initialization
        ├── config/
        │   ├── db.ts               Mongoose connection logic
        │   └── swagger.ts          OpenAPI/Swagger documentation setup
        ├── controllers/
        │   ├── authController.ts   User registration, authentication, profile endpoints
        │   ├── agents.controller.ts SSE chat streaming, message history, topic suggestions
        │   └── voice.controller.ts WebSocket gateway handler for voice streaming
        ├── services/
        │   ├── auth.service.ts     User verification, JWT issuance, profile persistence
        │   ├── agents.service.ts   Mastra agent chat integration and thread lookup
        │   ├── voice.service.ts    Sentence chunking, TTS audio synthesis, AbortController lifecycle
        │   ├── redis.service.ts    Redis session state management and TTL updates
        │   └── chatService.ts      Frontend SSE chat consumer
        ├── routes/
        │   ├── authRoutes.ts       Auth API endpoint router (/api/auth)
        │   └── agent.routes.ts     Agent API endpoint router (/api/agent)
        ├── middleware/
        │   └── auth.ts             JWT verification middleware (`verifyToken`, `protectRoute`)
        ├── models/
        │   ├── User.ts             MongoDB User Mongoose model
        │   └── User-Profile.ts     MongoDB UserProfile Mongoose model
        ├── mastra/
        │   ├── index.ts            Mastra singleton instance, storage setup
        │   ├── agents/
        │   │   └── agent.ts        English Tutor Agent system prompt and personalization logic
        │   └── utils/
        │       └── config.ts       Ollama model provider configuration (qwen2.5:1.5b)
        ├── hooks/
        │   └── useVoiceChat.ts     React voice hook managing Web Speech STT/TTS and WebSocket
        ├── pages/
        │   ├── Dashboard.tsx       Main application dashboard
        │   ├── ChatPage.tsx        Text chat interface
        │   ├── VoiceChatPage.tsx   Voice tutor interaction screen
        │   ├── LoginPage.tsx       Authentication login view
        │   └── RegisterPage.tsx    User onboarding and registration view
        └── components/
            ├── VoiceTutor.tsx      Voice conversation UI with animated visualizer
            └── VoiceChatUI.tsx     Alternative voice call workspace interface
```

---

## Core Services & Controller Details

### 1. Auth Controller & Service (`authController.ts`, `auth.service.ts`)
Handles user authentication and profile synchronization:
- `register`: Validates user inputs, creates MongoDB `User` and default `UserProfile` records, and issues a JWT token.
- `login`: Verifies user credentials using bcrypt password comparison and returns JWT access tokens.
- `getProfile`: Fetches current user information along with demographic preferences.

### 2. Agent Controller & Service (`agents.controller.ts`, `agents.service.ts`)
Manages text-based conversation sessions:
- `chat`: Sets up SSE headers (`text/event-stream`), streams LLM response chunks, writes `data: [DONE]`, and saves interaction threads to Mastra memory.
- `getConversations`: Fetches stored conversation threads for a specific user.
- `getMessages`: Retrieves full message history for a given `conversationId`.
- `getSuggestions`: Supplies starter prompts for role-play practice (e.g., ordering food, job interview, business English).

### 3. Voice Controller & Service (`voice.controller.ts`, `voice.service.ts`)
Manages real-time WebSocket voice streaming:
- `initializeVoiceWebSocket`: Attaches `WebSocketServer` to the HTTP server at `/audio-stream`.
- `VoiceConnectionHandler`: Parses connection parameters, binds `USER_SPEECH` and `INTERRUPT` event listeners, and manages connection teardown.
- `processSentence`: Manages per-conversation `AbortController` instances, streams LLM tokens, chunks output at sentence boundaries (`[.!?]`), synthesizes audio via `msedge-tts`, and dispatches binary audio buffers to the client.

### 4. Redis Service (`redis.service.ts`)
Manages volatile session states:
- `saveVoiceSession`: Stores call state and user profile snapshot with a 24-hour TTL.
- `updateVoiceSessionStatus`: Updates status (`connected`, `streaming`, `interrupted`, `closed`).
- `updateVoiceSessionActivity`: Updates heartbeats to maintain session freshness.

### 5. Mastra Agent Configuration (`agent/src/mastra/agents/agent.ts`)
Defines the English Practice Tutor persona:
- Custom Prompt Function: Evaluates `RequestContext` for user demographics (`age`, `studyStandard`, `englishRating`, `learningGoal`, `hobbies`).
- Age Protection: Instructs LLM to never suggest adult workplace topics to users under 18 unless requested.
- Feedback Requirement: Mandates a bold `**Feedback:**` section in every turn with explicit structural corrections.

---

## API & Protocol Reference

### REST API Endpoints

| HTTP Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Server health status check |
| `POST` | `/api/auth/register` | No | Create user account and profile |
| `POST` | `/api/auth/login` | No | Authenticate user and issue JWT |
| `POST` | `/api/auth/logout` | No | Clear user session |
| `GET` | `/api/auth/me` | Yes | Fetch authenticated user profile |
| `POST` | `/api/agent/chat` | Yes | Initiate SSE text chat stream |
| `GET` | `/api/agent/conversations` | Yes | List active user conversation threads |
| `GET` | `/api/agent/conversations/:id/messages` | Yes | Retrieve message history for thread |
| `GET` | `/api/agent/suggestions` | Yes | Fetch practice topic suggestions |

---

### WebSocket Gateway Protocol

- Connection URL: `ws://localhost:5000/audio-stream?conversationId=<UUID>&userId=<ID>`

#### Client to Server Payloads

- Transcribe User Speech:
  ```json
  {
    "type": "USER_SPEECH",
    "text": "Hello, how can I improve my spoken English today?"
  }
  ```

- User Interruption Signal:
  ```json
  {
    "type": "INTERRUPT"
  }
  ```

#### Server to Client Payloads

- AI Processing Initiated:
  ```json
  {
    "type": "AI_PROCESSING_START"
  }
  ```

- AI Audio Buffer: Binary MP3 Audio Chunk (synthesized via `msedge-tts`).

- AI Turn Completion Signal:
  ```json
  {
    "type": "AI_TURN_COMPLETE"
  }
  ```

---

## Environment Variables

Configure `.env` in the `agent/` directory using the parameters below:

| Variable Name | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | HTTP and WebSocket server port |
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB_NAME` | `lingualoop_db` | MongoDB target database name |
| `REDIS_URL` | `redis://localhost:6379` | Redis server connection URL |
| `JWT_SECRET` | Secret string | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | `24h` | Token expiration duration |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama model service endpoint |
| `MASTRA_STORAGE_URL` | `file:./mastra.db` | Local libSQL database path for Mastra |

---

## Prerequisites & Installation

### Prerequisites
- Node.js: `v22.13.0` or higher
- Package Manager: `pnpm`
- System Services: Redis Server, Ollama

### Automated Setup Command
Run the automated Makefile target inside the `agent/` directory to install system dependencies, start background services, pull the required LLM model (`qwen2.5:1.5b`), and install Node packages:

```bash
cd agent && make setup
```

### Manual Dependency Installation
If installing manually without Make:

1. Install Redis and Ollama on host system.
2. Start services:
   ```bash
   sudo systemctl start redis
   sudo systemctl start ollama
   ```
3. Pull Ollama model:
   ```bash
   ollama pull qwen2.5:1.5b
   ```
4. Install Node dependencies:
   ```bash
   cd agent && pnpm install
   ```

---

## Running the Application

### Development Commands

Inside the `agent/` directory:

- Start Background Services (Redis & Ollama):
  ```bash
  make start-services
  ```

- Stop Background Services:
  ```bash
  make stop-services
  ```

- Run Backend Agent Server Only:
  ```bash
  make dev
  ```

- Run Full Application (Server + Vite Frontend concurrently):
  ```bash
  make dev-all
  ```
  Or using pnpm directly:
  ```bash
  pnpm run dev:all
  ```

### Accessing Application Services
- Frontend UI: `http://localhost:5173` (Vite dev server)
- Backend REST API: `http://localhost:5000`
- Swagger API Docs: `http://localhost:5000/api/docs`
- Voice WebSocket Gateway: `ws://localhost:5000/audio-stream`

---

## Verification & Testing

Execute automated unit tests for authentication services:

```bash
cd agent && pnpm run test:auth
```

Verify backend health status:

```bash
curl http://localhost:5000/api/health
```

Expected Response:
```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "status": "ok",
    "timestamp": "2026-09-14T19:53:47.000Z"
  }
}
```
