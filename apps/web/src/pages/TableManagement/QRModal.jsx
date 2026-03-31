import React from 'react';
import { createPortal } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const QRModal = ({ table, onClose }) => {
    if (!table) return null;

    const qrValue = `${window.location.origin}/menu/${user?.clientId}?table=${table.number}`;

    const downloadQRCode = () => {
        const canvas = document.getElementById('table-qr');
        if (!canvas) return;
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `QR-Table-${table.number}.png`;
        link.href = url;
        link.click();
        toast.success('QR Code Downloaded');
    };

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" style={{ width: '100%', maxWidth: '340px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>QR Code — Table {table.number}</h2>
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '1.25rem', display: 'inline-block', boxShadow: 'var(--shadow-md)', marginBottom: '1.5rem' }}>
                    <QRCodeCanvas
                        id="table-qr"
                        value={qrValue}
                        size={200}
                        level="H"
                        includeMargin={true}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>
                        <X size={16} />
                        Close
                    </button>
                    <button onClick={downloadQRCode} className="btn-primary" style={{ flex: 1 }}>
                        <Download size={16} />
                        Download
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default QRModal;
