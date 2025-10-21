/**
 * Money utility functions following financial best practices
 * 
 * Best Practices:
 * 1. Always round to 2 decimal places for display
 * 2. Use integer cents for storage when possible
 * 3. Avoid floating-point arithmetic for money
 * 4. Use Number.EPSILON for precise rounding
 */

export class MoneyUtils {
  
  /**
   * Round money to 2 decimal places (best practice for currency)
   * Uses Number.EPSILON to handle floating-point precision issues
   */
  static roundToCents(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }

  /**
   * Convert dollars to cents (for storage)
   * Example: 12.34 -> 1234
   */
  static dollarsToCents(dollars: number): number {
    return Math.round(dollars * 100);
  }

  /**
   * Convert cents to dollars (for display)
   * Example: 1234 -> 12.34
   */
  static centsToDollars(cents: number): number {
    return this.roundToCents(cents / 100);
  }

  /**
   * Calculate commission with proper rounding
   */
  static calculateCommission(amount: number, rate: number): number {
    const commission = amount * rate;
    return this.roundToCents(commission);
  }

  /**
   * Calculate display price (amount + commission) with proper rounding
   */
  static calculateDisplayPrice(amount: number, commission: number): number {
    return this.roundToCents(amount + commission);
  }

  /**
   * Format money for display (adds currency symbol)
   */
  static formatCurrency(amount: number, currency: string = 'USD'): string {
    const rounded = this.roundToCents(amount);
    return `${currency} ${rounded.toFixed(2)}`;
  }

  /**
   * Safe addition of money amounts
   */
  static addMoney(amount1: number, amount2: number): number {
    return this.roundToCents(amount1 + amount2);
  }

  /**
   * Safe subtraction of money amounts
   */
  static subtractMoney(amount1: number, amount2: number): number {
    return this.roundToCents(amount1 - amount2);
  }

  /**
   * Safe multiplication of money amounts
   */
  static multiplyMoney(amount: number, multiplier: number): number {
    return this.roundToCents(amount * multiplier);
  }

  /**
   * Validate if amount is a valid money value
   */
  static isValidMoney(amount: any): boolean {
    return typeof amount === 'number' && 
           !isNaN(amount) && 
           isFinite(amount) && 
           amount >= 0;
  }

  /**
   * Get commission rate by category
   */
  static getCommissionRate(category: string): number {
    const rates: { [key: string]: number } = {
      'Engine': 0.08,
      'Transmission': 0.10,
      'Brakes': 0.12,
      'Suspension': 0.10,
      'Electrical': 0.15,
      'Body': 0.12,
      'Interior': 0.15,
      'Exhaust': 0.10,
      'General': 0.10,
      'default': 0.10
    };
    
    return rates[category] || rates.default;
  }
}

// Export individual functions for convenience
export const {
  roundToCents,
  dollarsToCents,
  centsToDollars,
  calculateCommission,
  calculateDisplayPrice,
  formatCurrency,
  addMoney,
  subtractMoney,
  multiplyMoney,
  isValidMoney,
  getCommissionRate
} = MoneyUtils;
