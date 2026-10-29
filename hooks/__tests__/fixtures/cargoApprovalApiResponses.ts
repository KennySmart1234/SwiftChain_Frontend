import type { CargoApproval } from '@/types/cargoApproval';

export const SIGNER_FLEET_MANAGER = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
export const SIGNER_SHIPPER = 'GBFRZ3E3AAFGBY6JIAX6OFEBW5JVE7KMU6MVADXXWTRLZ25TK22ENLCW';
export const SIGNER_INSURER = 'GCBAWFKS45CQA4C4BUIXM57Z2YKSP6HPIWXXUF7ZJVM6WTLNRAWML26O';
export const NON_SIGNER = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37';

/** Threshold 3: fleet manager (2) already signed, shipper (1) and insurer (1) outstanding. */
export const pendingApprovalFixture: CargoApproval = {
  escrowId: 'escrow-hv-001',
  threshold: 3,
  signers: [
    {
      publicKey: SIGNER_FLEET_MANAGER,
      weight: 2,
      hasSigned: true,
      signedAt: '2026-09-28T08:00:00.000Z',
      label: 'Fleet manager',
    },
    { publicKey: SIGNER_SHIPPER, weight: 1, hasSigned: false, signedAt: null, label: 'Shipper' },
    { publicKey: SIGNER_INSURER, weight: 1, hasSigned: false, signedAt: null, label: 'Insurer' },
  ],
  transactionXdr: 'AAAAAgAAAAB8k0hvYl5yTHV0cmFuc2FjdGlvbkVudmVsb3Bl',
  expiresAt: '2099-01-01T00:00:00.000Z',
  status: 'pending',
};

/** Shipper's signature brings the combined weight to 3 and meets the threshold. */
export const thresholdMetApprovalFixture: CargoApproval = {
  ...pendingApprovalFixture,
  signers: pendingApprovalFixture.signers.map((signer) =>
    signer.publicKey === SIGNER_SHIPPER
      ? { ...signer, hasSigned: true, signedAt: '2026-09-28T09:00:00.000Z' }
      : signer,
  ),
  status: 'threshold_met',
};

export const expiredApprovalFixture: CargoApproval = {
  ...pendingApprovalFixture,
  expiresAt: '2020-01-01T00:00:00.000Z',
  status: 'expired',
};
