# **Business Requirement Document (BRD)**

# **Project: TROO AI**

**Version:** 1.0  
**Prepared By:** Business Analyst  
**Technology Stack:** MERN (MongoDB, Express.js, React.js, Node.js)  
**Project Type:** AI-Powered Theme Generation Platform  
**Deployment:** SaaS (Subscription-Based)

---

# **1\. Executive Summary**

## **Project Overview**

TROO AI is an AI-powered theme generation platform that enables users to create website themes, UI templates, and frontend code through natural language prompts, design uploads, and existing resources.

The platform will function similarly to AI-assisted development tools such as Lovable AI but will focus specifically on generating production-ready frontend themes and templates for:

* ReactJS  
* VueJS  
* AngularJS  
* HTML/CSS  
* WordPress (Divi or supported theme for now)  
* Future CMS Integrations

Users can generate, manage, refine, version, and download themes while leveraging AI-powered project workspaces.

---

# **2\. Business Objectives**

### **Primary Objectives**

1. Enable users to create frontend themes using AI prompts.  
2. Convert designs into code / downloadable themes:  
   * Text Prompt → Theme / HTML  
   * Figma → HTML  
   * Image → HTML  
3. Support multi-project AI workspaces.  
4. Generate downloadable source code packages.  
5. Monetize through subscription plans.  
6. Provide enterprise-ready administration capabilities.  
7. Build scalable SaaS architecture.

---

# **3\. User Roles**

## **3.1 Visitor**

* View Landing Pages  
* View Pricing  
* Register Account  
* Login

---

## **3.2 End User**

* Create Projects  
* Upload Knowledge Base  
* Generate Themes  
* Manage Versions  
* Download Source Code  
* Purchase Subscription  
* View Usage Statistics

---

## **3.3 Admin**

* Manage Users  
* Manage Plans  
* Manage Payments  
* Configure AI Settings  
* View Analytics

---

## **3.4 Super Admin**

* Full System Control  
* Manage Admin Users  
* Configure Platform Settings  
* Manage AI Models  
* Billing Settings  
* Audit Logs

---

# **4\. Functional Modules**

---

# **Module 1: Authentication & User Management**

## **Features**

### **User Registration**

#### **Manual Signup**

Fields:

* Full Name  
* Email  
* Password  
* Confirm Password

Validations:

* Unique Email  
* Password Strength Rules

---

### **Social Login**

Support:

* Google  
* GitHub  
* Microsoft  
* LinkedIn (Future)

---

### **Login**

Methods:

* Email \+ Password  
* Social Login

---

### **Forgot Password**

* OTP Email Verification  
* Reset Password

---

### **Security**

* JWT Authentication  
* Refresh Token  
* MFA (Future Ready)  
* Session Management

---

# **Module 2: Dashboard**

## **User Dashboard**

### **Statistics**

* Total Projects  
* Active Projects  
* Total Generations  
* Credits Remaining  
* Downloads  
* Subscription Status

### **Recent Activities**

* Prompt History  
* Download History  
* Recent Projects

---

# **Module 3: AI Workspace Management**

## **Objective**

Allow users to interact with TROO AI through a chat-based interface where projects are automatically created and organized based on user prompts and AI interactions.

---

## **User Flow**

### **New Theme Creation**

1. User clicks **"New Chat"**  
2. User enters prompt:

Example:

Create a modern SaaS dashboard theme in React with Tailwind CSS.

3. System automatically:  
   * Creates Workspace  
   * Generates unique Workspace ID  
   * Saves initial prompt  
   * Assigns selected framework  
   * Starts AI generation process  
4. Chat becomes the permanent workspace.

---

## **Workspace Auto-Creation Rules**

| Trigger | Action |
| ----- | ----- |
| New Chat Started | Create Workspace |
| First Prompt Submitted | Save as Workspace Context |
| Theme Generated | Create Version 1 |
| User Continues Conversation | Update Same Workspace |
| User Starts New Chat | Create New Workspace |

## **Project Features**

* Rename  
* Archive  
* Delete  
* Share (Future)

---

# **Module 4: AI Theme Generator**

## **Generation Types**

### **A. Text Prompt → Theme / HTML**

Example:

"Create a modern SaaS dashboard using Tailwind and React."

Output:

Complete theme structure.

**Text → HTML**

Input:

Text content

Output:

Responsive HTML page

---

### **B. Figma → HTML**

Input:

Figma URL

Output:

Responsive HTML/CSS

---

### **C. Image → HTML**

Input:

Screenshot/UI image

Output:

HTML/CSS equivalent

---

### **D. Existing Theme Enhancement (Future Ready)**

Input:

Existing code

Output:

Enhanced theme version

---

# **AI Outputs**

Generated: Zip format

* Components  
* Pages  
* Assets Structure  
* CSS  
* Tailwind  
* Theme Configuration

# **Module 5: Subscription & Billing**

## **Payment Gateway**

### **Phase 1**

* Stripe / Razorpay Integration

---

## **Billing Cycles**

### **Monthly**

### **Yearly**

Yearly Discount Configurable

---

# **Sample Subscription Plans**

## **Free Plan**

| Feature | Limit |
| ----- | ----- |
| Projects | 2 |
| Generations | 25/month |
| Storage | 500 MB |
| Downloads | 5/month |
| Frameworks | HTML Only |
| Support | Community |

---

## **Pro Plan ($29/month)**

| Feature | Limit |
| ----- | ----- |
| Projects | 25 |
| Generations | 500/month |
| Storage | 10 GB |
| Downloads | Unlimited |
| Frameworks | All |
| Figma Conversion | Yes |
| Image Conversion | Yes |

---

## **Agency Plan ($99/month)**

| Feature | Limit |
| ----- | ----- |
| Projects | Unlimited |
| Generations | 5000/month |
| Storage | 100 GB |
| Team Members | 20 |
| Priority Queue | Yes |
| API Access | Yes |
| White Label | Future |

---

# 

# 

# 

# **Credit System (Configurable)**

Every AI action consumes credits.

Examples:

| Action | Credits |
| ----- | ----- |
| Prompt Generation | 1 |
| Image Conversion | 5 |
| Figma Conversion | 10 |
| Theme Export | 2 |

Admin configurable.

---

# **Module 6: Admin Panel**

---

## **Dashboard KPIs**

* Total Users  
* Active Users  
* New Registrations  
* Revenue  
* MRR  
* ARR  
* AI Requests  
* AI Cost  
* Downloads  
* Conversion Rate

---

## **Admin User Management**

CRUD

Fields:

* Name  
* Role  
* Permissions

---

## **End User Management**

View:

* Subscription  
* Credits  
* Transactions  
* Projects  
* Prompt History

Actions:

* Suspend  
* Activate  
* Reset Credits

---

## **Plan Management**

Manage:

* Pricing  
* Features  
* Credit Allocation  
* Generation Limits

---

## **Payment Management**

View:

* Transactions  
* Refunds  
* Failed Payments  
* Renewals

---

## **AI Model Configuration**

Manage:

* LLM Provider  
* Prompt Templates  
* Cost Controls  
* Rate Limits

---

## **Content Moderation**

Manage:

* Blocked Prompts  
* Abuse Detection  
* Spam Filtering

---

## **Audit Logs**

Track:

* User Actions  
* Admin Actions  
* Payment Activities

---

# **5\. Non-Functional Requirements**

## **Performance**

* Page Load \< 3 Seconds  
* AI Generation \< 60 Seconds

---

## **Availability**

* 99.9% Uptime

---

## **Scalability**

* 100,000+ Users  
* Horizontal Scaling

---

## **Security**

* HTTPS  
* JWT  
* Encryption at Rest  
* OWASP Compliance

---

## **Compliance**

* GDPR Ready  
* Cookie Consent  
* Data Retention Policies

---

# **6\. Edge Cases & Business Rules**

## **Authentication**

### **Edge Cases**

* Duplicate email signup  
* Social account already exists  
* Email verification pending  
* Session expiration

---

## **Project Management**

### **Edge Cases**

* Project deletion with active generations  
* Knowledge base exceeds storage limit  
* Project clone exceeds plan limits

---

## **AI Generation**

### **Edge Cases**

* Empty prompt  
* Prompt exceeds token limit  
* Unsupported file uploaded  
* Corrupted image  
* Invalid Figma URL  
* AI timeout  
* AI model failure  
* Partial generation response

---

## **Subscription**

### **Edge Cases**

* Payment failure  
* Card expired  
* Subscription downgrade  
* Subscription upgrade mid-cycle  
* Cancel auto-renewal  
* Refund request

---

## **Credit Consumption**

### **Edge Cases**

* Credits exhausted during generation  
* Simultaneous requests  
* Failed generation after credit deduction

Business Rule:

* Credits should be refunded for system failures.

---

## **Downloads**

### **Edge Cases**

* ZIP generation failure  
* Download interrupted  
* Download limit exceeded

---

## **Security**

### **Edge Cases**

* Prompt injection attacks  
* Excessive API calls  
* Unauthorized downloads  
* Abuse of free plan  
* Account sharing

---

# **7\. AI-Specific Requirements**

## **Prompt History**

Store:

* Prompt  
* Generated Output  
* Tokens Used  
* Credits Consumed

---

## **AI Generation Queue**

Statuses:

* Pending  
* Processing  
* Completed  
* Failed  
* Cancelled

---

## **Retry Mechanism**

Automatic retry:

* AI timeout  
* Temporary API failures

---

## **AI Cost Tracking**

Track:

* Tokens Used  
* Provider Cost  
* User Consumption

---

# **8\. Reporting & Analytics**

## **User Reports**

* Credit Usage  
* Generation History  
* Download History

---

## **Admin Reports (Phase 2\)**

* Revenue Report  
* Subscription Report  
* User Growth  
* AI Usage Cost  
* Plan Conversion  
* Churn Analysis

---

# **9\. Recommended Future Enhancements** 

### **Phase 2**

* Team Collaboration  
* Workspace Sharing  
* Theme Marketplace  
* AI Theme Refinement Chat  
* AI Design Assistant  
* Custom Domain Publishing

### **Phase 3**

* White Label SaaS  
* API Marketplace  
* Plugin Ecosystem  
* Multi-language Theme Generation  
* AI Agent-Based Theme Builder

---

# **10\. Recommended High-Level MERN Architecture**

### **Frontend**

* ReactJS \+ Next.js  
* Tailwind CSS  
* Redux Toolkit  
* Socket.IO

### **Backend**

* Node.js  
* Express.js  
* REST \+ GraphQL APIs

### **Database**

* MongoDB Atlas

### **AI Layer**

* OpenAI / Anthropic / Gemini  
* Vector Database (Pinecone / Weaviate)  
* RAG-based Knowledge Base Engine

### **Storage**

* AWS S3

### **Infrastructure**

* AWS ECS / Kubernetes  
* CloudFront CDN  
* Redis Queue  
* Stripe Billing

---

# **11\. Project Phases for Frontend Development**

To ensure a structured and iterative rollout focusing strictly on frontend development and API integrations, the project is divided into the following phases:

## **Phase 1: MVP - Frontend Setup & Authentication UI (Weeks 1)**
* **Infrastructure Setup**: Set up the ReactJS/Next.js frontend project structure, configure Tailwind CSS, and establish the base routing layout.
* **Authentication UI & Integration**: Build screens for manual signup, login, password recovery, and social login buttons (Google, GitHub), integrating them with the authentication APIs.
* **User Roles & Guards**: Implement client-side route protection and access control based on user roles (Visitor, End User, Admin).
* **Base Workspace & Dashboard UI**: Create the user dashboard layouts, integrating them with APIs to fetch and display statistics, projects, and active workspaces dynamically.

## **Phase 2: Chat-Based Workspace & Prompt UI (Weeks 2)**
* **AI Workspace Chat Interface**: Design and develop the interactive, chat-style workspace panel where new workspaces are initialized upon submitting the first prompt.
* **Prompt Interaction & Code Preview**: Build input interfaces supporting prompt submissions, show loading states, and display code preview windows for generated templates.
* **Download & Export Triggers**: Integrate the frontend actions to download generated theme packages (ZIP format) and trigger theme exports.
* **Credit Tracking UI**: Display credit balances and credit costs dynamically on the UI by calling the backend analytics endpoints.

## **Phase 3: Extended Inputs & Admin Panels (Weeks 3)**
* **Design Upload Interfaces**: Create clean form fields for Figma link submission and drag-and-drop zones for image/screenshot uploads.
* **Admin Dashboard & KPIs**: Build the administrator dashboard interface featuring charts and data tables to monitor system statistics (users, revenue, API costs).
* **Admin Management Tables**: Implement CRUD UI for Managing Users (suspending, resetting credits), managing subscription plans, and selecting AI Model configurations.

## **Phase 4: Billing Portal & Detailed Reports (Weeks 4)**
* **Subscription & Pricing Pages**: Design clean, comparative pricing cards for the Free, Pro, and Agency plans, linking them to Stripe/Razorpay checkouts and billing portals.
* **Plan Restriction UI**: Implement UI blockers, modals, and notifications to restrict user actions when workspace, generation, or storage limits are exceeded.
* **Reporting Charts**: Build detailed analytics views showing daily/monthly credit consumption and generation histories for users.

## **Phase 5: Frontend Performance, Security & Launch (Weeks 5)**
* **Performance Optimization**: Implement code-splitting, image optimization, lazy loading, and cache controls to ensure page load times remain under 3 seconds.
* **Security & Compliance UI**: Ensure secure token storage (JWT), establish CSRF protection mechanisms, and deploy cookie consent and GDPR banners.
* **Testing & Deployment**: Run comprehensive component testing (Jest/React Testing Library) and end-to-end testing, followed by production deployment on CDN hosts (Vercel/Netlify/CloudFront).

---

# **12\. Project Phases for Backend Development**

To ensure the server-side architecture matches the frontend rollout and operates with high reliability, security, and scalability, the backend development is structured into the following parallel phases:

## **Phase 1: Infrastructure Setup, Authentication & Session Security (Weeks 1)**
* **Environment & Database Setup**: Initialize Node.js/Express.js server, configure ESLint/Prettier, establish MongoDB Atlas connection using Mongoose models (User, Token, Workspace).
* **Robust Auth Engine**: Develop JWT-based authentication APIs (Signup, Login, Logout) and implement a secure token rotation mechanism (Access token + HttpOnly Refresh token).
* **Social OAuth & Email Integrations**: Set up Google, GitHub OAuth configurations, and integrate Nodemailer/SendGrid for OTP/verification email services.
* **Role-Based Authorization (RBAC)**: Implement API gateway-level middleware to enforce route protection and user role-based permissions (Visitor, End User, Admin, Super Admin).

## **Phase 2: Workspaces, Prompt Audits & Base Analytics (Weeks 2)**
* **Workspace Lifecycle APIs**: Implement RESTful endpoints to manage workspaces (Create, Rename, Archive, Delete) mapping directly to MongoDB schemas.
* **Socket.IO Real-Time Engine**: Set up Socket.IO server to support persistent connections and real-time generation status streaming between frontend and backend.
* **Prompt Processing Pipeline**: Establish prompt validation endpoints, prompt history storage schema, and credit cost validation checks prior to forwarding requests to AI services.
* **Basic Dashboard Statistics**: Construct endpoints that aggregate user workspace counts, recent activities, and download volumes for the base dashboard.

## **Phase 3: AI Theme Generation Pipeline & RAG Storage (Weeks 3)**
* **Multi-Modal AI Integration**: Integrate OpenAI/Anthropic/Gemini SDKs to process text prompts, Figma links (via Figma API), and image files.
* **Dynamic Code Packaging Engine**: Develop a server-side build/compression system that packages generated theme assets (HTML/CSS, React, Tailwind configs) into downloadable ZIP archives stored on AWS S3.
* **Knowledge Base RAG Integration**: Set up Vector Database (Pinecone/Weaviate) configurations and ingestion pipelines to index custom user files/knowledge bases.
* **Asynchronous Queue & Retry Systems**: Build a Redis-based queue (BullMQ) to process long-running AI generation tasks asynchronously with retry mechanisms on failures.

## **Phase 4: Billing Portal, Plans & Credit Enforcement (Weeks 4)**
* **Payment Gateway & Webhooks**: Implement Stripe/Razorpay SDK integrations to handle plan subscriptions, credit purchases, and secure webhook event processing (renewals, failures).
* **Dynamic Plan/Credit Middleware**: Develop interceptors that monitor and deduct credits per generation activity and restrict operations when plan thresholds (storage, downloads) are breached.
* **Admin Control Center APIs**: Create administrative endpoints featuring paginated CRUD operations for user auditing, billing disputes, plan settings, and cost analysis.
* **AI Cost & Audit Logs**: Set up tracking mechanisms that capture model token usage, calculate precise API costs, and output activity logs.

## **Phase 5: Performance, API Security & Production Launch (Weeks 5)**
* **Scaling & Performance Optimization**: Integrate Redis caching layer for quick-look queries, implement API rate limiters (Express Rate Limit), and structure database indexes.
* **System Compliance & Hardening**: Run security scans (OWASP compliance checks), sanitize all database queries to prevent SQL/NoSQL injections, and enforce HTTPS/SSL headers (Helmet.js).
* **CI/CD & Deployment**: Create Docker configurations, build automated testing suites (supertest/Jest), and deploy the application on AWS ECS/Kubernetes behind CloudFront.












# Run all pending migrations (first deploy)
npm run migrate:up

# Check what's been applied
npm run migrate:status

# Roll back the last migration
npm run migrate:down

# Populate with dev dummy data (dev only)
npm run seed:dev



To start both services:


# Terminal 1 — Backend (needs MongoDB running on localhost:27017)
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
# runs on http://localhost:3100
To run migrations + seed first login:


cd backend
npm run migrate:up        # creates plans + admin user
npm run seed:dev          # creates test accounts (password: Test1234!)
Test login credentials:

alice@example.com / Test1234! (Free plan)
bob@example.com / Test1234! (Pro plan)
admin@trooai.com / Admin@Troo2026! (Super Admin)



Then login with:

Email	Password	Plan
alice@example.com	Test1234!	Free
bob@example.com	Test1234!	Pro
carol@example.com	Test1234!	Agency
          

Super Admin	admin@trooai.com	Admin@Troo2026!	/admin/dashboard
Admin	      adminuser@trooai.com	AdminUser@2026!	/admin/dashboard
User	      user@trooai.com	User@Troo2026!	/dashboard