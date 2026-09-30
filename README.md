# Aaptha 🩺

> **Aaptha** is the platform and care ecosystem.  
> **Saathi AI** is the warm, empathetic voice that families and aging parents come to know and trust.

Aaptha is an eldercare and medication management platform built to give families total peace of mind. While adult children manage schedules, reports, and real-time health alerts through the Aaptha dashboard, their aging parents receive friendly daily check-in calls from **Saathi AI** in their preferred language.

---

## 🌟 Core Architecture & Identity

| Entity | Role & Purpose |
| :--- | :--- |
| **Aaptha** | **The Platform & Service**: The family dashboard, medicine scheduling, emergency escalation tree, caregiver permissions, subscription management, and prescription report parsing. |
| **Saathi AI** | **The Voice & Companion**: The AI care companion that dials parents daily at designated times, speaks warmly in regional languages (Hindi, English, etc.), verifies meal-time medication adherence, checks on wellbeing and mood, and flags urgent concerns to the family. |

---

## 🚀 Key Features

- 📞 **Saathi AI Daily Voice Check-ins**: Automated, conversational phone calls that feel natural, respectful, and caring.
- 💊 **Automated Medicine Tracking & Schedules**: Multi-slot daily regimens (morning, afternoon, evening, bedtime, before/after meals).
- 📄 **Smart Prescription & Report Vision**: AI-powered extraction of medicines, dosages, and instructions from uploaded doctor prescription slips.
- 🚨 **Multi-Tier Health Alerts**: Automatic detection of missed doses, unwell symptoms, or emergencies with instant WhatsApp/SMS/Email notifications to caregivers.
- 👨‍👩‍👧 **Caregiver Coordination**: Invite family members, siblings, and doctors to view logs or co-manage parents' health.
- 💳 **Seamless Billing**: Integrated subscriptions with Razorpay (Free, Family, and Extended tiers).

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router) + [React 19](https://react.dev)
- **Language**: TypeScript
- **Database & ORM**: PostgreSQL (Supabase) with [Prisma ORM](https://www.prisma.io)
- **Authentication**: JWT & DB-backed sessions with bcryptjs
- **Payments**: [Razorpay](https://razorpay.com) Integration (Subscriptions & AutoPay)
- **Email Notifications**: [Resend](https://resend.com)
- **Vision & LLM**: Groq Vision & AI models for prescription extraction and conversational intelligence

---

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/sathwikfr/Saathi-AI.git
cd Saathi-AI
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Provide your database URL (`DATABASE_URL`), JWT secret, Razorpay, Resend, and Groq API keys.

### 4. Database Setup
```bash
npx prisma db push
```

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
