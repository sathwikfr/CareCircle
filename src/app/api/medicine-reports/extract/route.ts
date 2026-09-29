import { NextResponse } from 'next/server';
import { getGroqVisionModel } from '@/lib/groqVision';
import { SAMPLE_PRESCRIPTIONS } from '@/lib/medicineExtractor';
import { createMedicineReport, getParentById } from '@/lib/db';
import { requireUser } from '@/lib/access';
import { extractFromRequest } from '@/lib/medicineReportIntake';

export async function GET() {
  // Sample prescriptions for 1-click preview (no personal data)
  return NextResponse.json({
    visionModel: getGroqVisionModel(),
    samples: SAMPLE_PRESCRIPTIONS.map(s => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      source: s.source
    }))
  });
}

/** Extraction used during onboarding (before the parent profile exists). */
export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const result = await extractFromRequest(req);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Only attach the report to a parent the user owns.
    let parentId: string | undefined;
    if (result.parentId) {
      const parent = await getParentById(result.parentId);
      if (parent && parent.userId === auth.user.id) parentId = parent.id;
    }

    const report = await createMedicineReport({
      parentId,
      userId: auth.user.id,
      fileName: result.fileName,
      fileType: result.fileType,
      rawExtractionJson: result.extractedMedicines,
      batchConfidence: result.batchConfidence,
      batchQualityWarning: result.batchQualityWarning
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
      fileName: result.fileName,
      fileType: result.fileType,
      uploadedAt: report.uploadedAt,
      extractedMedicines: result.extractedMedicines,
      batchConfidence: result.batchConfidence,
      batchQualityWarning: result.batchQualityWarning,
      detectedCount: result.detectedCount,
      modelUsed: result.modelUsed
    });
  } catch (err) {
    console.error('[CareCircle API] Medicine extraction error:', err);
    return NextResponse.json({ error: 'Failed to process the report. You can enter medicines manually.' }, { status: 500 });
  }
}
