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
                    fontFamily: "'Courier New', Courier, monospace",
                    fontSize: '12px',
                    textAlign: 'center',
                }}
            >
                <p style={{ color: 'red', fontWeight: 'bold' }}>
                    [DEBUG] No order data received
                </p>
            </div>
        );
    }

    const items = order.items?.filter((i) => i.status !== 'Waste') || [];

    return (
        <div
            ref={ref}
            className="receipt-print-wrapper"
            style={{
                width: '80mm',
                padding: '4mm',
                background: 'white',
                color: 'black',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '12px',
                lineHeight: '1.2',
                boxSizing: 'border-box',
            }}
        >

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <h2
                    style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        margin: '0 0 4px 0',
                    }}
                >
                    {client?.name || 'RESTROBABA'}
                </h2>
                {client?.address && <p style={{ margin: '2px 0', fontSize: '11px' }}>{client.address}</p>}
                {client?.phone && <p style={{ margin: '2px 0', fontSize: '11px' }}>{client.phone}</p>}
                <p style={{ margin: '6px 0 2px', fontSize: '11px' }}>Tax Invoice</p>
            </div>

            <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

            {/* Order info */}
            <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Order #{order.id?.slice(-6).toUpperCase()}</span>
                    <span>Table: {order.table?.number || 'Walk-in'}</span>
                </div>
                <div>Date: {new Date(order.createdAt).toLocaleString()}</div>
            </div>

            <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

            {/* Items table */}
            <table
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '12px',
                    marginBottom: '10px',
                }}
            >
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Item</th>
                        <th style={{ textAlign: 'center', paddingBottom: '4px', width: '18%' }}>Qty</th>
                        <th style={{ textAlign: 'right', paddingBottom: '4px', width: '30%' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={3} style={{ textAlign: 'center', padding: '8px 0' }}>
                                No items
                            </td>
                        </tr>
                    ) : (
                        items.map((item, idx) => (
                            <tr key={idx}>
                                <td style={{ padding: '3px 0' }}>
                                    {item.menuItem?.name || 'Unknown Item'}
                                    {item.variant?.name && <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>({item.variant.name})</div>}
                                </td>
                                <td style={{ textAlign: 'center', padding: '3px 0' }}>{item.quantity}</td>
                                <td style={{ textAlign: 'right', padding: '3px 0' }}>
                                    {formatCurrency((item.price || 0) * (item.quantity || 0))}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

            {/* Totals */}
            <div style={{ fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal || 0)}</span>
                </div>

                {order.taxAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>VAT ({client?.taxRate || 0}%)</span>
                        <span>{formatCurrency(order.taxAmount)}</span>
                    </div>
                )}

                {order.serviceChargeAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Service ({client?.serviceChargeRate || 0}%)</span>
                        <span>{formatCurrency(order.serviceChargeAmount)}</span>
                    </div>
                )}

                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        marginTop: '8px',
                        paddingTop: '6px',
                        borderTop: '1px solid #000',
                    }}
                >
                    <span>GRAND TOTAL</span>
                    <span>{formatCurrency(order.totalAmount || 0)}</span>
                </div>
            </div>

            <div style={{ borderBottom: '1px dashed #000', margin: '12px 0' }} />

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '11px' }}>
                <p style={{ margin: '4px 0', fontWeight: 'bold' }}>
                    Payment: {order.paymentMethod || 'Cash'}
                </p>
                <p style={{ margin: '8px 0 4px' }}>Thank you for visiting {client?.name || 'us'}!</p>
                <p style={{ margin: '2px 0', fontSize: '10px' }}>Software by RestroBaBa</p>
            </div>
        </div>
    );
});

export default Receipt;