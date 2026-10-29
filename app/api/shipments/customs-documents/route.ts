// DEV-ONLY DEMO ROUTE — delete before opening the PR.
// Stands in for the real backend so the Customs Documentation manager renders
// with API-sourced data on localhost. Expiry dates are generated relative to
// "now" so the expiry warning thresholds are demonstrable.
import { NextResponse } from 'next/server';
import type { CustomsDocument, CustomsDocType } from '@/types/customsDocumentation';

export const dynamic = 'force-dynamic';

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const templates: Array<{
  type: CustomsDocType;
  filename: string;
  status: CustomsDocument['status'];
  expiresInDays: number | null;
}> = [
  {
    type: 'commercial_invoice',
    filename: 'commercial-invoice-SW-1042.pdf',
    status: 'verified',
    expiresInDays: 120,
  },
  {
    type: 'packing_list',
    filename: 'packing-list-SW-1042.pdf',
    status: 'pending',
    expiresInDays: 21,
  },
  {
    type: 'bill_of_lading',
    filename: 'bill-of-lading-SW-1042.pdf',
    status: 'verified',
    expiresInDays: 4,
  },
  {
    type: 'certificate_of_origin',
    filename: 'certificate-of-origin-SW-1042.pdf',
    status: 'expired',
    expiresInDays: -3,
  },
  {
    type: 'customs_declaration',
    filename: 'customs-declaration-SW-1042.pdf',
    status: 'verified',
    expiresInDays: null,
  },
];

function buildFixture(shipmentId: string): CustomsDocument[] {
  const now = new Date().toISOString();
  return templates.map((t, index) => ({
    id: `doc_${index + 1}`,
    shipmentId,
    type: t.type,
    filename: t.filename,
    fileSize: 182_400 + index * 9_100,
    mimeType: 'application/pdf',
    status: t.status,
    issuedAt: daysFromNow(-30),
    expiresAt: t.expiresInDays === null ? null : daysFromNow(t.expiresInDays),
    uploadedAt: now,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shipmentId = searchParams.get('shipmentId') ?? 'SW-1042';

  return NextResponse.json({
    success: true,
    message: 'Customs documents retrieved',
    data: buildFixture(shipmentId),
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('document') as File | null;
  const documentType =
    (formData.get('documentType') as string) ?? 'commercial_invoice';
  const shipmentId = (formData.get('shipmentId') as string) ?? 'SW-1042';

  if (!file) {
    return NextResponse.json(
      { success: false, message: 'No document file provided' },
      { status: 400 }
    );
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 45);

  const document: CustomsDocument = {
    id: `doc_${Date.now()}`,
    shipmentId,
    type: documentType as CustomsDocType,
    filename: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/pdf',
    status: 'pending',
    issuedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    uploadedAt: new Date().toISOString(),
  };

  return NextResponse.json(
    { success: true, message: 'Document uploaded', data: document },
    { status: 201 }
  );
}
