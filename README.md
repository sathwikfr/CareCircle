# CareCircle 🩺

CareCircle is a comprehensive eldercare and medication management platform designed to help families support aging parents with medicine reminders, automated check-in schedules, caregiver coordination, and smart report parsing.

## 🚀 Features

- **Automated Medicine Tracking & Reminders**: Keep track of daily schedules, dosages, and timings.
- **Smart Medicine Report Extraction**: AI-powered extraction and schedule recommendations from uploaded medical documents.
- **Parent & Caregiver Management**: Add family members, manage permissions, and assign caregivers.
- **Subscription & Billing**: Tiered plans integrated with Razorpay.
- **Modern UI/UX**: Built with Next.js App Router, responsive design, and smooth interactions.

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript
- **Database & ORM**: PostgreSQL / SQLite with Prisma ORM
- **Authentication**: JWT & Password Hashing with Bcrypt
- **Payments**: Razorpay Integration
- **Email Notifications**: Resend

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/sathwikfr/CareCircle.git
cd CareCircle
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

### 4. Database Setup
```bash
npx prisma db push
npm run db:seed # (Optional) Seed demo data
```

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
