# PolyPact: Multimodal AI Paralegal Platform
[https://lexis-ai-iota.vercel.app/](https://lexis-ai-iota.vercel.app/)

PolyPact is a state-of-the-art multimodal AI Paralegal Platform designed to revolutionize legal reasoning and case management. Built with a focus on efficiency, security, and ultra-high performance, it utilizes a state-driven "Case Container" model to provide isolated legal contexts and automated legal intelligence.

## 🚀 Key Features
- **High-Fidelity Vision AI OCR**: Powered by Gemini 2.5 Flash Lite, extracting text, handwriting, and anomalies from complex legal documents and scanned PDFs with deep analysis.
- **AI Legal Chat**: Context-aware legal assistance supporting multiple distinct sessions per case, powered by Cydonia 24B (TheDrummer).
- **Strategy Generation**: Professional legal reasoning engine supporting redrafting, clause-level favorability analysis, and reflexive intelligence (Jurisdiction/Fact checking).
- **Case Dashboard (Spaces)**: Premium Spotify-inspired UI/UX for managing isolated RAG containers and reviewing real-time AI insights.
- **Neural Brain Map**: High-fidelity interactive graph visualization of case entities, evidence, and relationships with hierarchical anchoring.
- **Paralegal Search**: Hybrid research engine utilizing the Indian Kanoon API for live verdict retrieval, synthesized via Gemini.
- **Case Vault**: Secure file persistence in Firebase Storage with an integrated document viewer and automatic audit readiness.
- **Context Management**: Token-optimized "Strategic Case Ledger" for managing massive case contexts via background summarization.

## 🛠️ Technical Stack (Strict)
### Frontend
- **Framework**: Next.js 16+ (App Router)
- **OCR Engine**: Gemini 2.5 Flash Lite (via Backend Proxy)
- **Styling**: Tailwind CSS v4 (Spotify Aesthetic)
- **State**: Zustand (User Mode & Global State Management)
- **Auth**: Firebase Client SDK

### Backend (Poly-Core)
- **Runtime**: Bun (Strict)
- **Framework**: Hono (Optimized for ultra-low latency)
- **AI Orchestration**: OpenRouter (Cydonia 24B) & Gemini 2.5 Flash Lite
- **Legal Data**: Indian Kanoon API (22+ High Courts, Supreme Court)
- **Security**: Custom dual-layer Rate Limiting (500 req / 15min)

## 📁 Directory Architecture
```
/ (Root)
├── context.md          # Single Source of Truth for Architecture
├── README.md           # Project Documentation
├── frontend/           # Next.js Application & Client Components
├── backend/            # Bun / Hono API (Business logic & AI Proxy)
└── shared/             # TypeScript Types & API Contracts (Shared)
```

## 🔒 Security & Compliance
- **Context Isolation**: Strict per-case isolation via Firebase/Firestore security rules and backend proxying.
- **Secret Management**: All Vision AI and Firebase secret keys are proxied through the Bun backend; never exposed to the client.
- **Audit Trails**: Integrated document analysis ensures all uploaded files are audited and prepared for litigation immediately.

## 🚦 Getting Started
### Prerequisites
- **Bun** (Required runtime for both Frontend and Backend)
- **Firebase Account** & Firestore/Storage Configuration
- **OpenRouter API Key**

### Setup
1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   # Both frontend and backend
   bun install
   ```
3. **Configure Environment**:
   - Copy `.env.example` to `.env` in both frontend and backend.
   - Ensure `FIREBASE_ADMIN_SDK` is correctly configured in the backend for REST mode.
4. **Run Development Mode**:
   ```bash
   # Terminal 1: Backend
   cd backend && bun run dev

   # Terminal 2: Frontend
   cd frontend && bun next dev
   ```

---
**PolyPact** | Advanced Legal Intelligence
