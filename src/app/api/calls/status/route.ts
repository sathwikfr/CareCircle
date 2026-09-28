/**
 * POST /api/calls/status
 *
 * Twilio's status callback — called when a call ends.
 * Updates the CallLog with the final call status (completed, busy, no-answer, failed).
 * For unanswered / busy calls, creates an AlertRecord so the family is notified.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const formData   = await req.formData();
    const callSid    = (formData.get('CallSid')       as string | null) ?? '';
    const callStatus = (formData.get('CallStatus')     as string | null) ?? 'unknown';
    const duration   = parseInt((formData.get('CallDuration') as string | null) ?? '0', 10);
    const to         = (formData.get('To')             as string | null) ?? '';

    // Map Twilio call status to our enum
    const statusMap: Record<string, string> = {
      completed:   'answered',
      busy:        'busy',
      'no-answer': 'unanswered',
      failed:      'unanswered',
      canceled:    'unanswered'
    };
    const mappedStatus = statusMap[callStatus] ?? 'unanswered';

    // Look up the most recent pending call log for the parent with this phone
    if (to && mappedStatus !== 'answered') {
      const parent = await prisma.parentProfile.findFirst({
        where: { phone: to, isDeleted: false }
      });

      if (parent) {
        // Create a brief call log for the missed call
        await prisma.callLog.create({
          data: {
            parentId:           parent.id,
            scheduledTime:      new Date().toISOString(),
            status:             mappedStatus,
            durationSeconds:    duration,
            medicationConfirmed: false,
            mood:               'neutral',
            summary:            `Saathi called ${parent.name} but the call was ${callStatus}.`
          }
        });

        // Alert the family for unanswered / busy calls
        if (mappedStatus === 'unanswered' || mappedStatus === 'busy') {
          await prisma.alertRecord.create({
            data: {
              parentId:  parent.id,
              level:     2,
              title:     `Missed call — ${parent.name}`,
              message:   `Saathi tried to call ${parent.name} but the call was ${callStatus}. Please check in with them.`,
              channel:   'whatsapp',
              timestamp: new Date().toISOString(),
              status:    'sent'
            }
          });
        }
      }
    }

    console.log(`[calls/status] CallSid=${callSid} status=${callStatus} duration=${duration}s`);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[calls/status]', err);
    return NextResponse.json({ error: 'Status callback error' }, { status: 500 });
  }
}
