import trmService from './trm.service.js';

class QuoteService {
  constructor() {
    // Basic business constants for GOAT
    this.BASE_SHIPPING_USD = 16.0;
    
    // Default margins (can be moved to DB settings later)
    this.MARGINS = {
      Normal: 1.2,  // 20% margin
      Hype: 1.3,    // 30% margin
      Perfume: 1.25, // 25% margin
      Clothing: 1.2  // 20% margin
    };
  }

  /**
   * Calculates the quote for an array of items.
   * Applying the logic: $16 USD flat shipping if > 1 item.
   * Or $16 USD for a single item (or whatever constant applies).
   */
  async calculateQuote(items) {
    const trm = await trmService.getCurrentTrm();
    
    let subtotalUsd = 0;
    let totalUsdWithShipping = 0;
    
    // Applying the logic: "descuento de un solo envío de $16 USD si el usuario lleva más de un artículo"
    // Usually means flat shipping fee for the whole order regardless of item count.
    const shippingUsd = items.length > 0 ? this.BASE_SHIPPING_USD : 0;

    const detailedItems = items.map(item => {
      const margin = this.MARGINS[item.category] || this.MARGINS.Normal;
      const priceWithMargin = Number(item.priceUsd) * margin;
      
      return {
        ...item,
        priceUsdWithMargin: Number(priceWithMargin.toFixed(2)),
        priceCop: Math.round(priceWithMargin * trm)
      };
    });

    const totalProductUsdWithMargin = detailedItems.reduce((acc, curr) => acc + curr.priceUsdWithMargin, 0);
    
    // Total order value in USD (Products + Flat Shipping)
    const finalTotalUsd = totalProductUsdWithMargin + shippingUsd;
    const finalTotalCop = Math.round(finalTotalUsd * trm);

    return {
      trm,
      shippingUsd,
      items: detailedItems,
      totalUsd: finalTotalUsd,
      totalCop: finalTotalCop,
      abonoMinimoCop: Math.round(finalTotalCop * 0.5) // 50% abono logic
    };
  }
}

export default new QuoteService();
