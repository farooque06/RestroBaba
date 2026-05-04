import { formatCurrency } from './formatters';

/**
 * Formats an order into a professional WhatsApp-ready message string.
 * @param {Object} order - The order object
 * @param {Object} client - Simple client/business details
 * @returns {string} - URL encoded message string
 */
export const formatWhatsAppReceipt = (order, client) => {
    const taxMode = client?.taxMode || 'NONE';
    const isVAT = taxMode === 'VAT_REGISTERED';
    const hasPAN = taxMode === 'PAN_ONLY' || taxMode === 'VAT_REGISTERED';
    const invoiceNumber = order.taxInvoice?.invoiceNumber;
    
    const date = new Date(order.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
    const time = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let docIcon = '📄';
    let docTitle = 'ORDER SLIP';
    if (isVAT) {
        docIcon = '🧾';
        docTitle = 'TAX INVOICE';
    } else if (hasPAN) {
        docIcon = '💵';
        docTitle = 'SALES BILL';
    }

    let message = `*${docIcon} ${docTitle} | ${client?.name?.toUpperCase() || 'RESTROBABA'}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    
    if (isVAT && invoiceNumber) {
        message += `*Inv No:* ${invoiceNumber}\n`;
    }
    
    if (hasPAN && client?.panNumber) {
        message += `*PAN No:* ${client.panNumber}\n`;
    }

    message += `*Order:* #${order.id.slice(-6).toUpperCase()}\n`;
    message += `*Date:* ${date}  ${time}\n`;
    message += `*Table:* ${order.table ? order.table.number : 'Walk-in'}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    message += `*🛒 ITEMS ORDERED:*\n`;
    order.items?.forEach(item => {
        if (item.status === 'Waste') return;
        let itemName = item.menuItem?.name || 'Item';
        if (item.variant?.name) itemName += ` (${item.variant.name})`;
        const qty = item.quantity;
        const total = formatCurrency((item.price || 0) * qty);
        message += `▫️ ${itemName} × ${qty} = *${total}*\n`;
    });

    message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    message += `*Subtotal:* ${formatCurrency(order.subtotal || 0)}\n`;
    
    if (order.serviceChargeAmount > 0) {
        message += `*Service Charge:* ${formatCurrency(order.serviceChargeAmount)}\n`;
    }

    if (isVAT && order.taxAmount > 0) {
        message += `*VAT (13%):* ${formatCurrency(order.taxAmount)}\n`;
    }

    message += `*TOTAL AMOUNT: ${formatCurrency(order.totalAmount)}*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    message += `✅ *Payment:* ${order.paymentMethod || 'Paid'}\n`;
    if (order.customer?.name) {
        message += `👤 *Guest:* ${order.customer.name}\n`;
    }
    message += `\n_Thank you for dining with ${client?.name || 'us'}!_\n`;

    return message;
};
