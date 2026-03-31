import { formatCurrency } from './formatters';

/**
 * Formats an order into a professional WhatsApp-ready message string.
 * @param {Object} order - The order object
 * @param {Object} client - Simple client/business details
 * @returns {string} - URL encoded message string
 */
export const formatWhatsAppReceipt = (order, client) => {
    const orderId = order.id.slice(-6).toUpperCase();
    const date = new Date(order.createdAt).toLocaleDateString();
    const time = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let message = `*RECEIPT | ${client.name.toUpperCase()}*\n`;
    message += `--------------------------------\n`;
    message += `*Order ID:* #${orderId}\n`;
    message += `*Date:* ${date} | ${time}\n`;
    message += `*Table:* ${order.table ? order.table.number : 'Walk-in'}\n`;
    message += `--------------------------------\n\n`;

    order.items.forEach(item => {
        if (item.status === 'Waste') return;
        let itemName = item.menuItem?.name || 'Item';
        if (item.variant?.name) itemName += ` (${item.variant.name})`;
        const qty = item.quantity;
        const total = formatCurrency(item.price * qty);
        message += `• ${itemName} x${qty} = ${total}\n`;
    });

    message += `\n--------------------------------\n`;
    message += `*Subtotal:* ${formatCurrency(order.subtotal || 0)}\n`;
    
    if (order.taxAmount > 0) {
        message += `*Tax:* ${formatCurrency(order.taxAmount)}\n`;
    }
    
    if (order.serviceChargeAmount > 0) {
        message += `*Service Charge:* ${formatCurrency(order.serviceChargeAmount)}\n`;
    }

    message += `*TOTAL:* ${formatCurrency(order.totalAmount)}\n`;
    message += `--------------------------------\n\n`;
    
    message += `*Payment:* ${order.paymentMethod || 'Paid'}\n`;
    message += `_Thank you for dining with us!_\n`;
    message += `~ RestroBaba Systems`;

    return encodeURIComponent(message);
};
