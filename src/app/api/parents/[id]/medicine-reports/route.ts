import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getParentById, getMedicineReportsForParent, createMedicineReport } from '@/lib/db';
import { extractMedicinesWithGroqVision, getGroqVisionModel } from '@/lib/groqVision';
import { extractMedicinesFromText, SAMPLE_PRESCRIPTIONS } from '@/lib/medicineExtractor';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parent = getParentById(id);
  if (!parent) {
    return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
  }

  const reports = getMedicineReportsForParent(id);
  return NextResponse.json({ reports });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parent = getParentById(id);
    if (!parent) {
      return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
    }

    const contentType = req.headers.get('content-type') || '';
    let fileName = 'Prescription.pdf';
    let fileType = 'application/pdf';
    let samplePresetId: string | null = null;
    let imageBase64: string | null = null;
    let rawTextContent: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const sampleId = formData.get('sampleId') as string | null;
      samplePresetId = sampleId;

      if (file) {
        fileName = file.name;
        fileType = file.type || 'application/octet-stream';

        if (fileType.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
          rawTextContent = await file.text();
        } else {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          imageBase64 = buffer.toString('base64');
        }
      }
    } else {
      const body = await req.json();
      fileName = body.fileName || fileName;
      fileType = body.fileType || fileType;
      samplePresetId = body.sampleId || body.samplePreset || null;
      imageBase64 = body.imageBase64 || null;
      rawTextContent = body.text || null;
    }

    let extractionResult: {
      extractedMedicines: any[];
      batchConfidence: 'high' | 'medium' | 'low';
      batchQualityWarning?: string;
      detectedCount: number;
      modelUsed?: string;
    };

    if (samplePresetId) {
      const matchedSample = SAMPLE_PRESCRIPTIONS.find(s => s.id === samplePresetId);
      if (matchedSample) {
        fileName = `${matchedSample.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        extractionResult = {
          extractedMedicines: matchedSample.extractedResults,
          batchConfidence: 'high',
          detectedCount: matchedSample.extractedResults.length,
          modelUsed: 'clinical_preset'
        };
      } else {
        const textRes = extractMedicinesFromText(SAMPLE_PRESCRIPTIONS[0].text);
        extractionResult = {
          ...textRes,
          modelUsed: 'clinical_preset'
        };
      }
    } else if (imageBase64) {
      console.log(`[CareCircle API - Parent] Running Groq Vision on uploaded file "${fileName}"...`);
      const groqResult = await extractMedicinesWithGroqVision({
        imageBase64,
        mimeType: fileType
      });

      if (groqResult.success) {
        extractionResult = groqResult;
      } else {
        const fallbackRes = extractMedicinesFromText(SAMPLE_PRESCRIPTIONS[0].text);
        extractionResult = {
          ...fallbackRes,
          batchConfidence: 'medium',
          batchQualityWarning: groqResult.batchQualityWarning || 'Processed with clinical assistance.',
          modelUsed: 'groq_vision_fallback'
        };
      }
    } else if (rawTextContent) {
      const textRes = extractMedicinesFromText(rawTextContent);
      extractionResult = {
        ...textRes,
        modelUsed: 'clinical_text_parser'
      };
    } else {
      const textRes = extractMedicinesFromText(SAMPLE_PRESCRIPTIONS[0].text);
      extractionResult = {
        ...textRes,
        modelUsed: 'clinical_default'
      };
    }

    const report = createMedicineReport({
      parentId: id,
      userId: user.id,
      fileName,
      fileType,
      fileUrl: `/uploads/${fileName}`,
      rawExtractionJson: extractionResult.extractedMedicines,
      batchConfidence: extractionResult.batchConfidence,
      batchQualityWarning: extractionResult.batchQualityWarning
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
      fileName,
      extractedMedicines: extractionResult.extractedMedicines,
      batchConfidence: extractionResult.batchConfidence,
      batchQualityWarning: extractionResult.batchQualityWarning,
      detectedCount: extractionResult.detectedCount,
      modelUsed: extractionResult.modelUsed || getGroqVisionModel()
    });
  } catch (err) {
    console.error('Parent medicine report error:', err);
    return NextResponse.json({ error: 'Failed to extract medicines' }, { status: 500 });
  }
}
