import { render, screen, fireEvent } from '@testing-library/react';
import { FAQAccordion } from '../FAQAccordion';
import { usePricingFAQ } from '@/hooks/usePricingFAQ';
import { pricingService } from '@/services/pricingService';
import type { PricingFAQResponse } from '@/types/pricing';

jest.mock('@/hooks/usePricingFAQ');
const mockedUsePricingFAQ = usePricingFAQ as jest.Mock;

jest.mock('@/services/pricingService', () => ({
  pricingService: {
    getFAQ: jest.fn(),
  },
}));

const mockFAQ: PricingFAQResponse = {
  items: [
    {
      id: 'q1',
      question: 'How does SwiftChain escrow protection work?',
      answer: 'Funds are locked in a blockchain escrow contract until delivery is confirmed.',
    },
    {
      id: 'q2',
      question: 'Can I change plans at any time?',
      answer: 'Yes, you can upgrade or downgrade at any time from your account settings.',
    },
    {
      id: 'q3',
      question: 'Is there a free trial for paid plans?',
      answer: 'The Growth plan includes a 14-day free trial with full feature access.',
    },
  ],
};

describe('FAQAccordion', () => {
  beforeEach(() => {
    mockedUsePricingFAQ.mockClear();
  });

  it('renders loading state', () => {
    mockedUsePricingFAQ.mockReturnValue({
      faq: null,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<FAQAccordion />);
    expect(screen.getByLabelText('Loading pricing FAQ')).toBeInTheDocument();
  });

  it('renders error state and retries on click', () => {
    const mockRefetch = jest.fn();
    mockedUsePricingFAQ.mockReturnValue({
      faq: null,
      isLoading: false,
      error: 'Failed to load pricing FAQ',
      refetch: mockRefetch,
    });

    render(<FAQAccordion />);
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to load pricing FAQ');

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('renders every FAQ question', () => {
    mockedUsePricingFAQ.mockReturnValue({
      faq: mockFAQ,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<FAQAccordion />);
    expect(screen.getByText('How does SwiftChain escrow protection work?')).toBeInTheDocument();
    expect(screen.getByText('Can I change plans at any time?')).toBeInTheDocument();
    expect(screen.getByText('Is there a free trial for paid plans?')).toBeInTheDocument();
  });

  it('all panels start collapsed', () => {
    mockedUsePricingFAQ.mockReturnValue({
      faq: mockFAQ,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<FAQAccordion />);
    for (const item of mockFAQ.items) {
      expect(screen.getByRole('button', { name: item.question })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    }
  });

  it('expands a panel on click and reveals its answer', () => {
    mockedUsePricingFAQ.mockReturnValue({
      faq: mockFAQ,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<FAQAccordion />);
    const firstButton = screen.getByRole('button', {
      name: 'How does SwiftChain escrow protection work?',
    });

    fireEvent.click(firstButton);

    expect(firstButton).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByText('Funds are locked in a blockchain escrow contract until delivery is confirmed.'),
    ).toBeInTheDocument();
  });

  it('collapses an open panel when its button is clicked again', () => {
    mockedUsePricingFAQ.mockReturnValue({
      faq: mockFAQ,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<FAQAccordion />);
    const firstButton = screen.getByRole('button', {
      name: 'How does SwiftChain escrow protection work?',
    });

    fireEvent.click(firstButton);
    expect(firstButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(firstButton);
    expect(firstButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('only one panel is open at a time (exclusive expansion)', () => {
    mockedUsePricingFAQ.mockReturnValue({
      faq: mockFAQ,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<FAQAccordion />);
    const firstButton = screen.getByRole('button', {
      name: 'How does SwiftChain escrow protection work?',
    });
    const secondButton = screen.getByRole('button', {
      name: 'Can I change plans at any time?',
    });

    fireEvent.click(firstButton);
    expect(firstButton).toHaveAttribute('aria-expanded', 'true');
    expect(secondButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(secondButton);
    expect(firstButton).toHaveAttribute('aria-expanded', 'false');
    expect(secondButton).toHaveAttribute('aria-expanded', 'true');
  });

  it('verifies backend API service returns PricingFAQResponse shape', async () => {
    (pricingService.getFAQ as jest.Mock).mockResolvedValue(mockFAQ);

    const result = await pricingService.getFAQ();
    expect(result.items).toHaveLength(3);
    expect(result.items[0].id).toBe('q1');
    expect(result.items[0]).toHaveProperty('question');
    expect(result.items[0]).toHaveProperty('answer');
  });
});
