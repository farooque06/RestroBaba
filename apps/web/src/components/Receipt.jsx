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
    const taxMode = client?.taxMode || 'NONE';
    const isVAT = taxMode === 'VAT_REGISTERED';
    const hasPAN = taxMode === 'PAN_ONLY' || taxMode === 'VAT_REGISTERED';
    const invoiceNumber = order.taxInvoice?.invoiceNumber;

    // Determine document title (Honest Labeling - Pre-Certification)
    const getDocTitle = () => {
        if (isVAT) return 'PROFORMA INVOICE (VAT)';
        if (hasPAN) return 'INTERNAL BILL (PAN)';
        return 'ESTIMATE / ORDER SLIP';
    };

    return (
        <div
            ref={ref}
            className="receipt-print-wrapper"
            style={{
                padding: '4mm',
                background: 'white',
                color: 'black',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '12px',
                lineHeight: '1.2',
                boxSizing: 'border-box',
                margin: '0 auto', /* Center in preview */
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
                {client?.businessAddress && (
                    <p style={{ margin: '2px 0', fontSize: '11px' }}>{client.businessAddress}</p>
                )}
                {client?.address && !client?.businessAddress && (
                    <p style={{ margin: '2px 0', fontSize: '11px' }}>{client.address}</p>
                )}
                {(client?.businessPhone || client?.phone) && (
                    <p style={{ margin: '2px 0', fontSize: '11px' }}>
                        Tel: {client.businessPhone || client.phone}
                    </p>
                )}
                {/* PAN Number - Required for PAN_ONLY and VAT_REGISTERED */}
                {hasPAN && client?.panNumber && (
                    <p style={{ margin: '4px 0 2px', fontSize: '11px', fontWeight: 'bold' }}>
                        PAN No: {client.panNumber}
                    </p>
                )}
                <p style={{ 
                    margin: '6px 0 2px', 
                    fontSize: isVAT ? '13px' : '11px', 
                    fontWeight: isVAT ? 'bold' : 'normal',
                    letterSpacing: isVAT ? '1px' : '0'
                }}>
                    {getDocTitle()}
                </p>
            </div>

            <div style={{ borderBottom: '1px dashed #000', margin: '8px 0' }} />

            {/* Order & Invoice Info */}
            <div style={{ fontSize: '11px', marginBottom: '8px' }}>
                {/* Invoice Number - Still useful for internal tracking */}
                {isVAT && invoiceNumber && (
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        fontWeight: 'bold',
                        marginBottom: '4px'
                    }}>
                        <span>Document No:</span>
                        <span>{invoiceNumber}</span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Order #{order.id?.slice(-6).toUpperCase()}</span>
                    <span>{order.type === 'TAKEAWAY' ? 'Type: PARCEL' : `Table: ${order.table?.number || 'Walk-in'}`}</span>
                </div>
                {order.type === 'TAKEAWAY' && (
                    <div style={{ fontWeight: 'bold', textAlign: 'center', margin: '6px 0', border: '1px solid black', padding: '4px', fontSize: '13px' }}>PARCEL / TAKEAWAY</div>
                )}
                <div>Date: {new Date(order.createdAt).toLocaleString()}</div>
                {/* Customer info if available */}
                {order.customer?.name && (
                    <div>Customer: {order.customer.name}</div>
                )}
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

                {/* Service Charge */}
                {order.serviceChargeAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Service Charge ({client?.serviceChargeRate || 0}%)</span>
                        <span>{formatCurrency(order.serviceChargeAmount)}</span>
                    </div>
                )}

                {/* VAT Section - Only for VAT_REGISTERED mode */}
                {isVAT && order.taxAmount > 0 && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dotted #999', paddingTop: '4px', marginTop: '4px' }}>
                            <span>Taxable Amount</span>
                            <span>{formatCurrency((order.subtotal || 0) + (order.serviceChargeAmount || 0))}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>VAT (13%)</span>
                            <span>{formatCurrency(order.taxAmount)}</span>
                        </div>
                    </>
                )}

                {/* Grand Total */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        marginTop: '8px',
                        paddingTop: '6px',
                        borderTop: '2px solid #000',
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

                {/* Pre-Certification Disclosure */}
                <div style={{ 
                    marginTop: '10px', 
                    padding: '6px', 
                    border: '1px solid #ddd', 
                    fontSize: '9px', 
                    lineHeight: '1.4',
                    color: '#444'
                }}>
                    <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', textTransform: 'uppercase' }}>Non-Fiscal Document</p>
                    <p style={{ margin: 0 }}>This is a computer-generated internal estimate and not a legal tax invoice. RestroBaba (Pre-Certification Version).</p>
                </div>

                <p style={{ margin: '12px 0 4px' }}>Thank you for visiting {client?.name || 'us'}!</p>
                <p style={{ margin: '2px 0', fontSize: '10px' }}>Software by RestroBaBa</p>
            </div>
        </div>
    );
});

export default Receipt;