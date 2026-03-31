import React, { useState, useEffect } from 'react';
import { 
    Clock, 
    Play, 
    Square, 
    AlertCircle, 
    CheckCircle2, 
    DollarSign, 
    TrendingUp, 
    History,
    FileText,
    ArrowRight,
    Loader2
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { formatCurrency } from '../utils/formatters';
import toast from 'react-hot-toast';

const ShiftManagement = () => {
    const [currentShift, setCurrentShift] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [openingCash, setOpeningCash] = useState('');
    const [closingCash, setClosingCash] = useState('');
    const [showCloseModal, setShowCloseModal] = useState(false);

    useEffect(() => {
        fetchShiftData();
    }, []);

    const fetchShiftData = async () => {
        setLoading(true);
        const token = localStorage.getItem('restroToken');
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const [currentRes, historyRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/shifts/current`, { headers }),
                fetch(`${API_BASE_URL}/api/shifts/history`, { headers })
            ]);

            if (currentRes.ok) setCurrentShift(await currentRes.json());
            if (historyRes.ok) setHistory(await historyRes.json());
        } catch (error) {
            toast.error('Failed to load shift data');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenShift = async () => {
        if (!openingCash || isNaN(openingCash)) {
            toast.error('Please enter a valid opening cash amount');
            return;
        }

        setActionLoading(true);
        const token = localStorage.getItem('restroToken');
        try {
            const res = await fetch(`${API_BASE_URL}/api/shifts/open`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ openingCash })
            });

            if (res.ok) {
                toast.success('Shift opened successfully');
                setOpeningCash('');
                fetchShiftData();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to open shift');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCloseShift = async () => {
        if (!closingCash || isNaN(closingCash)) {
            toast.error('Please enter a valid closing cash amount');
            return;
        }

        setActionLoading(true);
        const token = localStorage.getItem('restroToken');
        try {
            const res = await fetch(`${API_BASE_URL}/api/shifts/close/${currentShift.id}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ closingCash })
            });

            if (res.ok) {
                toast.success('Shift closed & Z-Report generated');
                setClosingCash('');
                setShowCloseModal(false);
                fetchShiftData();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to close shift');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        </div>
    );

    return (
        <div className="page-container animate-fade">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '0.5rem' }}>
                        Shift Management
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Track daily operations and reconcile financials</p>
                </div>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    padding: '0.75rem 1.25rem', 
                    background: currentShift ? 'var(--primary-glow)' : 'rgba(239, 68, 68, 0.1)', 
                    color: currentShift ? 'var(--primary)' : '#ef4444', 
                    borderRadius: '16px', 
                    fontWeight: 700, 
                    border: `1px solid ${currentShift ? 'var(--primary)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                    <Clock size={18} />
                    {currentShift ? 'Shift in Progress' : 'No Active Shift'}
                </div>
            </div>

            <div className="dashboard-grid" style={{ marginBottom: '3.5rem', gap: '2rem' }}>
                {/* Active Action Card */}
                <div className="premium-glass" style={{ gridColumn: 'span 2', padding: '0', display: 'flex', flexDirection: 'column' }}>
                    {!currentShift ? (
                        <div style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                            <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 8px 32px rgba(212, 175, 55, 0.2)' }}>
                                <Play size={36} color="var(--primary)" style={{ marginLeft: '4px' }} />
                            </div>
                            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem', color: 'var(--text-heading)' }}>Start Your Day</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '1.1rem' }}>Open a new shift to begin recording sales and expenses.</p>
                            
                            <div style={{ width: '100%', maxWidth: '360px', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                <label style={{ display: 'block', textAlign: 'left', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Initial Cash (Opening Balance)
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '0.8rem 1.2rem', marginBottom: '1.5rem', transition: 'border-color 0.2s' }}>
                                    <DollarSign size={20} color="var(--primary)" style={{ marginRight: '0.75rem' }} />
                                    <input 
                                        type="number" 
                                        placeholder="0.00"
                                        value={openingCash}
                                        onChange={(e) => setOpeningCash(e.target.value)}
                                        style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.2rem', fontWeight: 700, width: '100%', outline: 'none' }}
                                    />
                                </div>
                                <button 
                                    className="btn-primary" 
                                    style={{ width: '100%', padding: '1rem', borderRadius: '14px', fontSize: '1rem', fontWeight: 800, gap: '10px' }}
                                    onClick={handleOpenShift}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Loader2 className="animate-spin" /> : 'Open Shift'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2.5rem', height: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Play size={24} color="var(--primary)" style={{ marginLeft: '2px' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>Current Shift Status</h3>
                                    <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.9rem' }}>Shift is actively tracking operations</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Clock size={14} /> Opened At
                                    </span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>{new Date(currentShift.openedAt).toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <DollarSign size={14} /> Opening Cash
                                    </span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(currentShift.openingCash)}</span>
                                </div>
                            </div>
                            
                            <div style={{ marginTop: 'auto' }}>
                                <button 
                                    className="btn-ghost" 
                                    onClick={() => setShowCloseModal(true)}
                                    style={{ width: '100%', padding: '1rem', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 800, gap: '10px' }}
                                >
                                    <Square size={20} />
                                    Close Shift & Reconcile
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Stats (Only if shift open) */}
                {currentShift && (
                    <div className="premium-glass" style={{ gridColumn: 'span 1', padding: '0', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>Live Reconciliation</h3>
                        </div>
                        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1 }}>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <TrendingUp size={24} color="#10b981" />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '4px' }}>Total Sales</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>{formatCurrency(currentShift.totalSales || 0)}</span>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>{formatCurrency(currentShift.totalExpenses || 0)}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Cash Sales</span>
                                    <span style={{ fontWeight: 700 }}>{formatCurrency(currentShift.cashSales || 0)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Card Sales</span>
                                    <span style={{ fontWeight: 700 }}>{formatCurrency(currentShift.cardSales || 0)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Online Sales</span>
                                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(currentShift.upiSales || 0)}</span>
                                </div>
                                <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Taxable Amount</span>
                                    <span style={{ fontWeight: 700 }}>{formatCurrency(currentShift.taxableAmount || 0)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>VAT Collected (13%)</span>
                                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(currentShift.totalTax || 0)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Service Charge</span>
                                    <span style={{ fontWeight: 700 }}>{formatCurrency(currentShift.totalServiceCharge || 0)}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', padding: '1.25rem', background: 'var(--primary-glow)', borderRadius: '16px', border: '1px solid rgba(var(--primary-rgb, 212, 175, 55), 0.2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>Expected Cash Drawer</span>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)' }}>
                                            {formatCurrency(Number(currentShift.openingCash) + Number(currentShift.cashSales) - Number(currentShift.totalExpenses))}
                                        </span>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>Opening + Cash Sales - Expenses</div>
                                    </div>
                                </div>
                                <div style={{ width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: '100%', height: '100%', background: 'var(--primary)' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Shift History */}
            <div className="premium-glass" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <History size={20} color="var(--text-main)" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-heading)' }}>Recent Shifts (Z-Reports)</h3>
                        <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.85rem' }}>Historical shift records and reconciliations</p>
                    </div>
                </div>
                
                <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '1.25rem 2rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 800 }}>Date/Time</th>
                                <th style={{ padding: '1.25rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 800 }}>Status</th>
                                <th style={{ padding: '1.25rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 800 }}>Sales</th>
                                <th style={{ padding: '1.25rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 800 }}>Expected Cash</th>
                                <th style={{ padding: '1.25rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 800 }}>Actual Cash</th>
                                <th style={{ padding: '1.25rem 1rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 800 }}>Discrepancy</th>
                                <th style={{ padding: '1.25rem 2rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 800, textAlign: 'right' }}>Tax/VAT</th>
                                <th style={{ padding: '1.25rem 2rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 800, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                        <History size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                                        <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No shift history yet.</p>
                                    </td>
                                </tr>
                            )}
                            {history.map((shift) => {
                                const discrepancy = shift.closingCash - shift.expectedCash;
                                return (
                                    <tr key={shift.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.01)' } }}>
                                        <td style={{ padding: '1.25rem 2rem', fontWeight: 600, color: 'white' }}>{new Date(shift.openedAt).toLocaleString()}</td>
                                        <td style={{ padding: '1.25rem 1rem' }}>
                                            <span style={{ 
                                                background: shift.status === 'OPEN' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', 
                                                color: shift.status === 'OPEN' ? '#10b981' : 'var(--text-muted)', 
                                                padding: '4px 12px', 
                                                borderRadius: '8px',
                                                fontSize: '0.7rem', 
                                                fontWeight: 800,
                                                border: `1px solid ${shift.status === 'OPEN' ? 'rgba(16, 185, 129, 0.2)' : 'var(--border)'}`
                                            }}>
                                                {shift.status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem', fontWeight: 600 }}>{formatCurrency(shift.totalSales)}</td>
                                        <td style={{ padding: '1.25rem 1rem', fontWeight: 600 }}>{formatCurrency(shift.expectedCash)}</td>
                                        <td style={{ padding: '1.25rem 1rem', fontWeight: 600 }}>{shift.closingCash !== null ? formatCurrency(shift.closingCash) : '-'}</td>
                                        <td style={{ padding: '1.25rem 1rem', color: discrepancy < 0 ? '#ef4444' : '#10b981', fontWeight: 800 }}>
                                            {shift.closingCash !== null ? formatCurrency(discrepancy) : '-'}
                                        </td>
                                        <td style={{ padding: '1.25rem 2rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            <div>VAT: {formatCurrency(shift.totalTax || 0)}</div>
                                            <div>SC: {formatCurrency(shift.totalServiceCharge || 0)}</div>
                                        </td>
                                        <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                                            <button className="btn-ghost" title="View Report" style={{ padding: '8px', borderRadius: '10px', display: 'inline-flex' }}>
                                                <FileText size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Closing Modal */}
            {showCloseModal && (
                <div className="modal-overlay animate-fade" style={{ backdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="premium-glass animate-slideUp" style={{ width: '100%', maxWidth: '440px', border: '1px solid var(--border)', padding: '0', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        <div style={{ padding: '1.5rem 2rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Square size={16} color="#ef4444" />
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>End of Shift</h3>
                            </div>
                            <button onClick={() => setShowCloseModal(false)} className="btn-ghost" style={{ padding: '4px', borderRadius: '8px' }}>
                                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>×</span>
                            </button>
                        </div>
                        
                        <div style={{ padding: '2rem' }}>
                            <div style={{ display: 'flex', gap: '1rem', padding: '1.25rem', background: 'var(--primary-glow)', borderRadius: '14px', border: '1px solid rgba(var(--primary-rgb, 212, 175, 55), 0.2)', marginBottom: '2rem', alignItems: 'flex-start' }}>
                                <AlertCircle size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>Physical Count Required</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>Please count all physical cash currently in the drawer to finalize the day's reconciliation.</p>
                                </div>
                            </div>
                            
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Actual Cash in Drawer
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.8rem 1.25rem' }}>
                                    <DollarSign size={20} color="var(--primary)" style={{ marginRight: '0.75rem' }} />
                                    <input 
                                        type="number" 
                                        placeholder="0.00"
                                        value={closingCash}
                                        onChange={(e) => setClosingCash(e.target.value)}
                                        style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.25rem', fontWeight: 800, width: '100%', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button className="btn-ghost" onClick={() => setShowCloseModal(false)} style={{ flex: 1, padding: '1rem', borderRadius: '12px', fontWeight: 700 }}>Cancel</button>
                                <button 
                                    className="btn-primary" 
                                    onClick={handleCloseShift}
                                    disabled={actionLoading}
                                    style={{ flex: 2, padding: '1rem', borderRadius: '12px', fontWeight: 800, gap: '8px', background: '#ef4444', border: 'none', boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)' }}
                                >
                                    {actionLoading ? <Loader2 className="animate-spin" /> : 'Confirm & Close Shift'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftManagement;
