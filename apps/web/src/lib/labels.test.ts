import { describe, expect, it } from 'vitest';
import {
  companyStatusLabels,
  dealStatusLabels,
  documentTypeLabels,
  label,
  listingFrequencyLabels,
  listingReasonLabels,
  listingStatusLabels,
  listingTypeLabels,
  logisticsQuoteStatusLabels,
  logisticsRequestStatusLabels,
  memberRoleLabels,
  paymentStatusLabels,
  platformRoleLabels,
  proposalStatusLabels,
  reportStatusLabels,
  subscriptionStatusLabels,
  verificationStatusLabels,
} from './labels';

function assertCovers(map: Record<string, string>, values: string[]) {
  for (const value of values) {
    expect(map[value], `${value} deve ter rótulo`).toBeTruthy();
  }
}

describe('labels', () => {
  it('maps every listing status to a label', () => {
    assertCovers(listingStatusLabels, [
      'DRAFT',
      'PENDING_REVIEW',
      'PUBLISHED',
      'PAUSED',
      'NEGOTIATING',
      'CLOSED',
      'EXPIRED',
      'REJECTED',
      'ARCHIVED',
    ]);
  });

  it('maps deal and listing reason labels', () => {
    expect(dealStatusLabels.AWAITING_PAYMENT).toBe('Aguardando pagamento');
    expect(listingReasonLabels.MODERATION_APPROVED).toBe(
      'Aprovado pela moderação',
    );
  });

  it('covers all deal statuses', () => {
    assertCovers(dealStatusLabels, [
      'OPEN',
      'AWAITING_DOCUMENTS',
      'AWAITING_PAYMENT',
      'AWAITING_PICKUP',
      'IN_TRANSIT',
      'DELIVERED',
      'COMPLETED',
      'DISPUTED',
      'CANCELLED',
    ]);
  });

  it('covers proposal, payment and subscription statuses', () => {
    assertCovers(proposalStatusLabels, [
      'PENDING',
      'COUNTERED',
      'ACCEPTED',
      'REJECTED',
      'CANCELLED',
      'EXPIRED',
    ]);
    assertCovers(paymentStatusLabels, [
      'INITIATED',
      'PENDING',
      'PAID',
      'FAILED',
      'CANCELLED',
      'REFUNDED',
    ]);
    assertCovers(subscriptionStatusLabels, [
      'PENDING',
      'ACTIVE',
      'PAST_DUE',
      'CANCELLED',
      'EXPIRED',
    ]);
    assertCovers(reportStatusLabels, [
      'OPEN',
      'IN_REVIEW',
      'RESOLVED',
      'DISMISSED',
    ]);
  });

  it('covers company, logistics and reference labels', () => {
    assertCovers(companyStatusLabels, ['ACTIVE', 'PENDING', 'BLOCKED']);
    assertCovers(verificationStatusLabels, [
      'UNVERIFIED',
      'PENDING',
      'VERIFIED',
      'REJECTED',
    ]);
    assertCovers(logisticsRequestStatusLabels, [
      'REQUESTED',
      'QUOTED',
      'ACCEPTED',
      'IN_TRANSIT',
      'COMPLETED',
      'CANCELLED',
    ]);
    assertCovers(logisticsQuoteStatusLabels, [
      'ACTIVE',
      'ACCEPTED',
      'REJECTED',
      'EXPIRED',
    ]);
    assertCovers(listingTypeLabels, ['BUY', 'SELL']);
    assertCovers(listingFrequencyLabels, [
      'ONE_TIME',
      'WEEKLY',
      'MONTHLY',
      'CONTINUOUS',
    ]);
    assertCovers(documentTypeLabels, [
      'CNPJ_CARD',
      'SOCIAL_CONTRACT',
      'ADDRESS_PROOF',
      'OPERATING_LICENSE',
      'ENVIRONMENTAL_LICENSE',
      'OTHER',
    ]);
    assertCovers(platformRoleLabels, ['USER', 'MODERATOR', 'ADMIN']);
    assertCovers(memberRoleLabels, ['OWNER', 'ADMIN', 'MEMBER']);
  });

  it('label helper falls back to the raw value and blank for empty', () => {
    expect(label(dealStatusLabels, 'COMPLETED')).toBe('Concluída');
    expect(label(dealStatusLabels, 'SOMETHING_NEW')).toBe('SOMETHING_NEW');
    expect(label(dealStatusLabels, null)).toBe('');
    expect(label(dealStatusLabels, undefined)).toBe('');
  });
});
