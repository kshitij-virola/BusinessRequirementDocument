# Project Implementation Plan: TROO AI (1-Month Accelerated Roadmap)

This planning document outlines the consolidated schedule to develop, integrate, and launch both frontend and backend systems for TROO AI within 1 month (30 days), starting **June 4, 2026** and completing by **July 4, 2026**.

| Module / Phase | Duration | Due Date | Core Tasks (Frontend & Backend Integration) |
| :--- | :--- | :--- | :--- |
| **Phase 1: MVP Setup & Authentication Engine** | 7 Days | 11-06-2026 | 1. **Frontend Setup**: Initialize React/Next.js app structure, configure Tailwind CSS, set up basic route protection based on user roles.<br>2. **Authentication UI**: Build signup, login, password recovery, and Google/GitHub login buttons.<br>3. **Backend Setup**: Initialize Node.js/Express app, define MongoDB Mongoose models (`User`, `Token`, `Workspace`), configure secure JWT and HttpOnly cookie-based token rotation.<br>4. **OAuth & Mail Integration**: Set up Google & GitHub OAuth handlers, and integrate Nodemailer/SendGrid for verification emails.<br>5. **Integration**: Bind frontend login/signup screens to backend auth APIs. |
| **Phase 2: Workspaces, Prompt Audits & Real-Time Chat** | 7 Days | 18-06-2026 | 1. **Frontend UI**: Build the primary Workspace chat panel, message bubbles, generation state loaders, and sidebar navigation.<br>2. **Workspace APIs**: Develop RESTful endpoints for CRUD operations on workspaces (create, rename, archive, delete).<br>3. **Real-Time Pipeline**: Configure Socket.IO server to stream generation status updates, logs, and prompt completion states in real-time.<br>4. **Prompt Checks**: Setup backend validator endpoints to parse and log prompts, verify user credit balances, and compute credit deductions. |
| **Phase 3: AI Generation, RAG & Admin UI** | 7 Days | 25-06-2026 | 1. **Extended Inputs UI**: Create Figma link input fields and image screenshot upload drops using React Dropzone.<br>2. **Multi-Modal AI Engine**: Integrate OpenAI, Anthropic, and Gemini SDKs to handle text prompts, Figma links (via Figma API), and screenshot analysis.<br>3. **Code Synthesis & Packaging**: Build the in-memory builder to generate HTML/React/Vue packages, compress them into ZIP archives, and save to AWS S3.<br>4. **RAG & Queuing**: Configure vector database (Pinecone/Weaviate) file ingestion and establish a Redis-based async execution queue (BullMQ) with automated retries. |
| **Phase 4: Billing Portal, Credits & Reports** | 7 Days | 02-07-2026 | 1. **Pricing UI**: Build subscription plan comparison layouts and user analytics charts showing credit history and download volumes.<br>2. **Stripe Integration**: Integrate Stripe SDK, build customer portal redirects, and implement robust webhook processors to handle subscription plans (Free, Pro, Agency) and renewals/failures.<br>3. **Limit Enforcement Middleware**: Implement backend interceptors to block actions when workspace/storage/download quotas are exceeded.<br>4. **Admin KPIs & Management**: Build administrative APIs and tables for CRUD on users, plan updates, AI configuration switches, and cost logs. |
| **Phase 5: Performance, Security & Launch** | 2 Days | 04-07-2026 | 1. **Frontend Optimization**: Implement code-splitting, lazy loading, image optimizations, and GDPR cookie consent overlays.<br>2. **Backend Hardening**: Set up Redis caching layer, database index tuning, Helmet.js headers, rate-limiting (Express Rate Limit), and query sanitization.<br>3. **Automated Testing**: Execute frontend unit tests (Jest/RTL) and backend integration tests (Supertest/Jest) for complete validation.<br>4. **Production Deployment**: Containerize app using Docker, set up CI/CD pipelines, and deploy backend to AWS ECS/Kubernetes and frontend to CloudFront/Vercel. |

---

## Daily Progression Schedule

```mermaid
gantt
    title TROO AI 1-Month Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1: MVP Setup & Auth
    Setup & Base Auth            :active, p1, 2026-06-04, 2026-06-11
    section Phase 2: Chat & Workspace
    Workspace REST & Socket.IO    :p2, 2026-06-11, 2026-06-18
    section Phase 3: AI Engine & RAG
    AI SDKs, ZIP Pack & Queue    :p3, 2026-06-18, 2026-06-25
    section Phase 4: Billing & Admin
    Stripe & Limit Middleware     :p4, 2026-06-25, 2026-07-02
    section Phase 5: Launch
    Security, Tests & Cloud deploy:p5, 2026-07-02, 2026-07-04
```
