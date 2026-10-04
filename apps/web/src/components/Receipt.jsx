import React from 'react';
import { formatCurrency } from '../utils/formatters';

const Receipt = React.forwardRef(({ order, client }, ref) => {
    if (!order) {
        return (
            <div
                ref={ref}
                style={{
                    width: '80mm',
                    padding: '10mm 5mm',
                    background: 'white',
                    color: 'black',
                    fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
                    fontSize: '12px',
                    textAlign: 'center',
                }}
            >
                <p style={{ color: 'var(--danger)', fontWeight: 'bold' }}>
                    [DEBUG] No order data received
                </p>
            </div>
        );
    }

    const items = order.items?.filter((i) => i.status !== 'Waste') || [];
    const taxMode = client?.taxMode || 'NONE';
    const isVAT = taxMode === 'VAT_REGISTERED';
    const hasPAN = taxMode === 'PAN_ONLY' || taxMode === 'VAT_REGISTERED';
    const invoiceNumber = order.taxInvoice?.invoiceNumber;

    const getDocTitle = () => {
        if (isVAT) return 'TAX INVOICE (VAT)';
        if (hasPAN) return 'SALES RECEIPT (PAN)';
        return 'ORDER SLIP / ESTIMATE';
    };

    return (
        <div
            ref={ref}
            className="receipt-print-wrapper"
            style={{
                width: '100%',
                maxWidth: '80mm',
                padding: '6mm 4mm',
                background: 'white',
                color: '#1a1a1a',
                fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
                fontSize: '11px',
                lineHeight: '1.4',
                boxSizing: 'border-box',
                margin: '0 auto',
            }}
        >
            {/* Header / Logo Section */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h1 style={{
                    fontSize: '20px',
                    fontWeight: '900',
                    margin: '0 0 4px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '-0.5px'
                }}>
                    {client?.name || 'RESTROBABA'}
                </h1>
                
                <div style={{ fontSize: '10px', color: '#444', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {client?.businessAddress || client?.address ? (
                        <p style={{ margin: 0 }}>{client.businessAddress || client.address}</p>
                    ) : null}
                    {(client?.businessPhone || client?.phone) && (
                        <p style={{ margin: 0, fontWeight: '600' }}>Tel: {client.businessPhone || client.phone}</p>
                    )}
                    {hasPAN && client?.panNumber && (
                        <p style={{ margin: '4px 0 0', fontWeight: '800', color: '#000' }}>
                            PAN: {client.panNumber}
                        </p>
                    )}
                </div>

                <div style={{ 
                    margin: '12px auto 0',
                    padding: '4px 8px',
                    border: '1px solid #000',
                    display: 'inline-block',
                    fontSize: '10px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}>
                    {getDocTitle()}
                </div>
            </div>

            {/* Transaction Metadata */}
            <div style={{ 
                borderTop: '1px solid #eee',
                borderBottom: '1px solid #eee',
                padding: '8px 0',
                marginBottom: '12px',
                fontSize: '10px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: '#666' }}>Order ID:</span>
                    <span style={{ fontWeight: '700' }}>#{order.id?.slice(-6).toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: '#666' }}>Table/Type:</span>
                    <span style={{ fontWeight: '700' }}>
                        {order.type === 'TAKEAWAY' ? 'PARCEL' : `Table ${order.table?.number || 'Walk-in'}`}
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ color: '#666' }}>Date:</span>
                    <span>{new Date(order.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                {order.customer?.name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #eee' }}>
                        <span style={{ color: '#666' }}>Guest:</span>
                        <span style={{ fontWeight: '700' }}>{order.customer.name}</span>
                    </div>
                )}
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                <thead>
                    <tr style={{ borderBottom: '1.5px solid #000' }}>
                        <th style={{ textAlign: 'left', padding: '6px 0', fontSize: '10px', textTransform: 'uppercase' }}>Description</th>
                        <th style={{ textAlign: 'center', padding: '6px 0', width: '15%', fontSize: '10px', textTransform: 'uppercase' }}>Qty</th>
                        <th style={{ textAlign: 'right', padding: '6px 0', width: '25%', fontSize: '10px', textTransform: 'uppercase' }}>Price</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 ? (
                        <tr><td colSpan={3} style={{ textAlign: 'center', padding: '12px 0', color: '#999' }}>No items found</td></tr>
                    ) : (
                        items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                <td style={{ padding: '8px 0', verticalAlign: 'top' }}>
                                    <div style={{ fontWeight: '700', fontSize: '11px' }}>{item.menuItem?.name || 'Item'}</div>
                                    {item.comboDealName && (
                                        <div style={{ fontSize: '9px', color: '#666', fontWeight: '500' }}>
                                            {item.comboDealName}{item.comboGroupName ? ` · ${item.comboGroupName}` : ''}
                                        </div>
                                    )}
                                    {item.variant?.name && (
                                        <div style={{ fontSize: '9px', color: '#666', fontWeight: '500' }}>{item.variant.name}</div>
                                    )}
                                </td>
                                <td style={{ textAlign: 'center', padding: '8px 0', verticalAlign: 'top', fontWeight: '600' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'right', padding: '8px 0', verticalAlign: 'top', fontWeight: '700' }}>
                                    {formatCurrency((item.price || 0) * (item.quantity || 0))}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Summary / Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: '#666' }}>Subtotal</span>
                    <span style={{ fontWeight: '600' }}>{formatCurrency(order.subtotal || 0)}</span>
                </div>

                {order.serviceChargeAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span style={{ color: '#666' }}>Service Charge ({client?.serviceChargeRate || 0}%)</span>
                        <span style={{ fontWeight: '600' }}>{formatCurrency(order.serviceChargeAmount)}</span>
                    </div>
                )}

                {isVAT && order.taxAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '4px 0', borderTop: '1px dashed #eee', marginTop: '2px' }}>
                        <span style={{ color: '#666' }}>VAT (13%)</span>
                        <span style={{ fontWeight: '600' }}>{formatCurrency(order.taxAmount)}</span>
                    </div>
                )}

                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '16px', 
                    fontWeight: '900', 
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '2px solid #000'
                }}>
                    <span>TOTAL</span>
                    <span>{formatCurrency(order.totalAmount || 0)}</span>
                </div>
            </div>

            {/* Footer / Disclosures */}
            <div style={{ textAlign: 'center' }}>
                <div style={{ 
                    background: '#f9f9f9',
                    padding: '8px',
                    borderRadius: '4px',
                    marginBottom: '16px',
                    fontSize: '10px',
                    fontWeight: '700'
                }}>
                    Paid via: {order.paymentMethod || 'Cash'}
                </div>

                <div style={{ marginTop: '12px', fontSize: '10px' }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: '700' }}>Thank you for visiting!</p>
                    <p style={{ 
                        fontSize: '8.5px',
                        lineHeight: '1.4',
                        color: '#888',
                        marginTop: '8px',
                        borderTop: '1px solid #eee',
                        paddingTop: '8px'
                    }}>
                        * This is an internal estimate and not a legal tax invoice. *
                    </p>
                </div>
            </div>
        </div>
    );
});

export default Receipt;