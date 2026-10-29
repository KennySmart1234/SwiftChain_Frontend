import { currencyRateService } from '@/services/currencyRateService';

export const SUPPORTED_CURRENCIES = ['USD', 'NGN', 'EUR', 'GBP'] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export interface CurrencyRates {
  rates: Record<CurrencyCode, number>;
  updatedAt: string;
}

function isPositiveRate(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Loads every selectable XLM/fiat rate through the backend API. Fetching the
 * rates together keeps currency changes instant after the initial load.
 */
export const currencyService = {
  async getRates(): Promise<CurrencyRates> {
    const responses = await Promise.all(
      SUPPORTED_CURRENCIES.map((currency) =>
        currencyRateService.getXlmRate(currency),
      ),
    );

    const rates = responses.reduce<Record<CurrencyCode, number>>(
      (result, response) => {
        const currency = response.fiat.toUpperCase() as CurrencyCode;
        if (
          SUPPORTED_CURRENCIES.includes(currency) &&
          isPositiveRate(response.xlmRate)
        ) {
          result[currency] = response.xlmRate;
        }
        return result;
      },
      {} as Record<CurrencyCode, number>,
    );

    const missingCurrency = SUPPORTED_CURRENCIES.find(
      (currency) => !isPositiveRate(rates[currency]),
    );
    if (missingCurrency) {
      throw new Error(`Missing ${missingCurrency} exchange rate`);
    }

    return {
      rates,
      updatedAt: responses.reduce(
        (latest, response) =>
          response.updatedAt > latest ? response.updatedAt : latest,
        responses[0].updatedAt,
      ),
    };
  },
};
