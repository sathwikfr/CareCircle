# Launch checklist

Everything in the code is finished. What is left is **accounts and keys**. Run this any time to see what is missing
(it never prints a secret):

```bash
npm run check:setup
```

Put keys in **`.env.local`** (Next.js reads it before `.env`, so a key in `.env.local` always wins). On Vercel, add the
same names under Project → Settings → Environment Variables.

## 1. Sarvam (start first: KYC takes days)
1. Sign up at Sarvam Voice Agents, complete KYC, **Deploy → Phone Numbers → Add Connection → Rent from Sarvam**, buy a number.
2. Ask Sarvam: price per minute, whether Do-Not-Disturb numbers can receive service calls, whether unanswered calls are billed, whether webhooks are retried.
3. Build the agent with `docs/sarvam-agent.md` (prompt, input/output variables, the `escalate_emergency` tool).
4. Fill `SARVAM_API_KEY`, `SARVAM_ORG_ID`, `SARVAM_WORKSPACE_ID`, `SARVAM_APP_ID`, `SARVAM_APP_VERSION`, `SARVAM_CONNECTION_ID`, `SARVAM_AGENT_PHONE_NUMBER`. (`SARVAM_WEBHOOK_SECRET` is already generated; paste it into the agent tool's bearer token.)
5. Re-check the prices in `src/lib/plans.ts` against Sarvam's quote (the margin table is at the top of that file).

## 2. Razorpay
1. **Test mode first.** Dashboard → API Keys → generate. Set `RAZORPAY_KEY_ID`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` (same Key ID) and `RAZORPAY_KEY_SECRET`.
2. Create the plans: `npx tsx scripts/create-razorpay-plans.ts` (preview), then add `--confirm`. Put the two printed ids in `RAZORPAY_PLAN_ID_FAMILY` / `RAZORPAY_PLAN_ID_EXTENDED`.
3. Dashboard → Webhooks → add `https://<your-domain>/api/razorpay/webhook`, paste the value of `RAZORPAY_WEBHOOK_SECRET` (already generated), and tick the `subscription.*` and `payment.failed` events.
4. Test a subscription with the test card `4718 6091 0820 4366` (any CVV, any future expiry, OTP of 4-10 digits to succeed).
5. Repeat 1-3 with **Live** keys when you go live. Live and test plan ids are different. GST: prices do not include it; decide whether to add it.

## 3. Email
Resend → Domains → verify a domain you own → set `RESEND_FROM_EMAIL=CareCircle <no-reply@yourdomain>`. Also set `NEXT_PUBLIC_SUPPORT_EMAIL` (shown on the Privacy and Terms pages).

## 4. Deploy (Vercel)
1. Import the GitHub repo. Framework: Next.js. Build command stays `npm run build`.
2. Add every variable from `.env.local` to the Vercel environment. Set `NEXT_PUBLIC_APP_URL` to the real `https://` address.
3. Point your domain at it. Never copy `.env` files into the repository.

## 5. Scheduler (free option: GitHub Actions)
The workflow `.github/workflows/dispatch-calls.yml` calls the dispatcher every 5 minutes. In GitHub → Settings → Secrets and variables → Actions add:
- `APP_URL` = your `https://` address, no trailing slash
- `CRON_SECRET` = the same value as `CRON_SECRET` in Vercel

GitHub runs can be a few minutes late and pause after 60 days without repository activity; the dispatcher tolerates this (each slot stays due for 90 minutes). cron-job.org or any scheduler that can send an HTTP request works too.

## 6. Optional: Google sign-in
Google Cloud Console → Credentials → OAuth client (Web) → add your domain as an authorised origin → set `GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. The button appears automatically.

## 7. Live test before real families (about 15 minutes, use your own phone)
Follow `docs/sarvam-agent.md` §8: an answered call with a missed medicine, a "chest pain" call (expect a level-4 alert and a critical email), and an unanswered call (expect a retry 15 minutes later and a "couldn't reach" alert after the third miss).

## 8. Legal
The Privacy Policy and Terms pages are written from how the product works. Have a lawyer read them once, especially the refund, liability and governing-law clauses, before you take payments.
