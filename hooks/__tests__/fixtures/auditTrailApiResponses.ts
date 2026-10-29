import type { AuditTrailEvent } from '@/types/auditTrail';

/** Deliberately returned out of order to exercise client-side sorting. */
export const auditTrailEventsFixture: AuditTrailEvent[] = [
  {
    eventId: 'evt-0002',
    eventType: 'driver_assigned',
    timestamp: '2026-09-20T10:15:00.000Z',
    actor: {
      address: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H',
      role: 'driver',
    },
    txHash: '7d2c1f0e9b8a7968574635241302f1e0d9c8b7a6958473625140f3e2d1c0b9a8',
    ledger: 51234567,
    metadata: { vehicleId: 'TRK-204', estimatedPickup: '2026-09-20T12:00:00Z' },
  },
  {
    eventId: 'evt-0003',
    eventType: 'escrow_funded',
    timestamp: '2026-09-20T11:30:00.000Z',
    actor: {
      address: 'GACV3JHPXU7CKKYIRSTNLPFVFWGCAYDGBVNFNFJDG5BFCPJV7ZRKJSGN',
      role: 'customer',
      displayName: 'Acme Imports',
    },
    txHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    ledger: 51235002,
    metadata: { amount: 1500, asset: 'XLM', insured: true },
  },
  {
    eventId: 'evt-0001',
    eventType: 'contract_created',
    timestamp: '2026-09-20T09:00:00.000Z',
    actor: {
      address: 'CCJZ5DGASBWQXR5MPFCJXMBI333XE5U3FSJTNQU7RIKE3P5GN2K2WYD5',
      role: 'contract',
    },
    ledger: 51233900,
  },
];
