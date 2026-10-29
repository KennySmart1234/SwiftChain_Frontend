import type {
  HighValueCargoApproval,
  SubmitHighValueApprovalResponse,
} from '@/types/highValueCargo';

/**
 * Recorded response shapes from GET/POST /api/escrow/{id}/multisig-approval,
 * used to stub the service layer in hook and component tests.
 */

export const SHIPMENT_ID = 'shp_7Q2K9XH4';
/** Fixed clock for tests: 2h 30m 15s before the approval deadline. */
export const FIXED_NOW = Date.parse('2026-10-01T09:29:45Z');

export const awaitingApprovalResponse: HighValueCargoApproval = {
  shipmentId: SHIPMENT_ID,
  trackingNumber: 'SWC-2026-009113',
  declaredValue: 185000,
  currency: 'USD',
  riskLevel: 'high',
  riskFactors: ['Declared value above $100,000', 'Cross-border transit'],
  isCrossBorder: true,
  originCountry: 'Nigeria',
  destinationCountry: 'Ghana',
  requiredSignatures: 3,
  signers: [
    {
      publicKey: 'GBSHIPPERK2Z3Q4W5E6R7T8Y9U0I1O2P3A4S5D6F7G8H9J0K1L2Z3X4C5',
      name: 'Adaeze Okafor',
      role: 'Shipper',
      status: 'approved',
      signedAt: '2026-10-01T08:10:00Z',
    },
    {
      publicKey: 'GCCOMPLIANCEA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2',
      name: 'Kwame Mensah',
      role: 'Compliance officer',
      status: 'pending',
      signedAt: null,
    },
    {
      publicKey: 'GDESCROWAGENTQ1W2E3R4T5Y6U7I8O9P0A1S2D3F4G5H6J7K8L9Z0X1C2',
      name: 'SwiftChain Escrow',
      role: 'Escrow agent',
      status: 'pending',
      signedAt: null,
    },
  ],
  deadline: '2026-10-01T12:00:00Z',
  status: 'awaiting_signatures',
};

export const readyApprovalResponse: HighValueCargoApproval = {
  ...awaitingApprovalResponse,
  status: 'ready',
  signers: awaitingApprovalResponse.signers.map((signer) => ({
    ...signer,
    status: 'approved',
    signedAt: signer.signedAt ?? '2026-10-01T09:00:00Z',
  })),
};

export const expiredApprovalResponse: HighValueCargoApproval = {
  ...awaitingApprovalResponse,
  status: 'expired',
  deadline: '2026-10-01T09:00:00Z',
};

export const domesticApprovalResponse: HighValueCargoApproval = {
  ...readyApprovalResponse,
  isCrossBorder: false,
  destinationCountry: 'Nigeria',
  riskLevel: 'critical',
  riskFactors: [],
};

export const submitApprovalResponse: SubmitHighValueApprovalResponse = {
  shipmentId: SHIPMENT_ID,
  status: 'submitted',
  transactionHash: '9c1e5a7b3d2f4e6a8c0b1d3f5e7a9c2b4d6f8e0a1c3b5d7f9e2a4c6b8d0f1e3a',
};
