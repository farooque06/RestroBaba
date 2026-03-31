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
    
    const date = new Date(order.createdAt).toLocaleDateString();
    const time = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let title = 'RECEIPT';
    if (isVAT) title = 'PROFORMA INVOICE';
    else if (hasPAN) title = 'BILL';

    let message = `*${title} | ${client?.name?.toUpperCase() || 'RESTROBABA'}*\n`;
    message += `--------------------------------\n`;
    
    if (isVAT && invoiceNumber) {
        message += `*Invoice No:* ${invoiceNumber}\n`;
    }
    
    if (hasPAN && client?.panNumber) {
        message += `*PAN No:* ${client.panNumber}\n`;
    }

    message += `*Order ID:* #${order.id.slice(-6).toUpperCase()}\n`;
    message += `*Date:* ${date} | ${time}\n`;
    message += `*Table:* ${order.table ? order.table.number : 'Walk-in'}\n`;
    message += `--------------------------------\n\n`;

    order.items?.forEach(item => {
        if (item.status === 'Waste') return;
        let itemName = item.menuItem?.name || 'Item';
        if (item.variant?.name) itemName += ` (${item.variant.name})`;
        const qty = item.quantity;
        const total = formatCurrency((item.price || 0) * qty);
        message += `• ${itemName} x${qty} = ${total}\n`;
    });

    message += `\n--------------------------------\n`;
    message += `*Subtotal:* ${formatCurrency(order.subtotal || 0)}\n`;
    
    if (order.serviceChargeAmount > 0) {
        message += `*Service Charge:* ${formatCurrency(order.serviceChargeAmount)}\n`;
    }

    if (isVAT && order.taxAmount > 0) {
        message += `*Taxable Amt:* ${formatCurrency((order.subtotal || 0) + (order.serviceChargeAmount || 0))}\n`;
        message += `*VAT (13%):* ${formatCurrency(order.taxAmount)}\n`;
    } else if (order.taxAmount > 0) {
        message += `*Tax:* ${formatCurrency(order.taxAmount)}\n`;
    }

    message += `*TOTAL:* ${formatCurrency(order.totalAmount)}\n`;
    message += `--------------------------------\n\n`;
    
    message += `*Payment:* ${order.paymentMethod || 'Paid'}\n`;
    message += `_Thank you for dining with us!_\n`;
    message += `_Note: This is a computer-generated internal estimate and not a legal tax invoice._\n`;
    message += `~ Software by RestroBaBa`;

    return encodeURIComponent(message);
};
