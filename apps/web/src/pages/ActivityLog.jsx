import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { History, Search, Loader2, ArrowUpRight, ArrowDownLeft, User, Activity, Clock } from 'lucide-react';

const ActivityLog = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchingMore, setFetchingMore] = useState(false);
    const [filter, setFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        fetchLogs(1, true);
    }, [startDate, endDate]);

    const fetchLogs = async (pageNum = 1, initial = false) => {
        if (!initial) setFetchingMore(true);
        const token = localStorage.getItem('restroToken');
        try {
            let url = `${API_BASE_URL}/api/activity?page=${pageNum}&limit=50`;
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                if (initial) {
                    setLogs(data.logs);
                } else {
                    setLogs(prev => [...prev, ...data.logs]);
                }
                setHasMore(data.pagination.hasMore);
                setPage(data.pagination.page);
            }
        } catch (err) {
            console.error('Failed to fetch logs', err);
        } finally {
            setLoading(false);
            setFetchingMore(false);
        }
    };

    const loadMore = () => {
        if (!fetchingMore && hasMore) {
            fetchLogs(page + 1);
        }
    };

    const getActionColor = (action) => {
        if (action.includes('ADD') || action.includes('CREATED')) return '#10b981';
        if (action.includes('DELETE') || action.includes('CANCELLED')) return 'var(--danger)';
        if (action.includes('UPDATE') || action.includes('CHANGE')) return 'var(--primary)';
        return 'var(--text-muted)';
    };

    if (loading) return (
        <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        </div>
    );

    return (
        <div className="page-container animate-fade">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>System Activity Log</h1>
                <p style={{ color: 'var(--text-muted)' }}>Audit trail of all administrative and operational actions.</p>
            </div>

            <div className="premium-glass" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={() => setFilter('ALL')} className={`nav-item ${filter === 'ALL' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>All Activity</button>
                    <button onClick={() => setFilter('STATUS_CHANGE')} className={`nav-item ${filter === 'STATUS_CHANGE' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>Order Status</button>
                    <button onClick={() => setFilter('INVENTORY')} className={`nav-item ${filter === 'INVENTORY' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>Inventory</button>
                </div>

                <div style={{ height: '24px', width: '1px', background: 'var(--glass-border)' }}></div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>From:</span>
                        <input
                            type="date"
                            className="premium-glass"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>To:</span>
                        <input
                            type="date"
                            className="premium-glass"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                        />
                    </div>
                    {(startDate || endDate) && (
                        <button
                            onClick={() => { setStartDate(''); setEndDate(''); }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            <div className="premium-glass" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'grid', gridTemplateColumns: '150px 1fr 150px 150px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <span>Timestamp</span>
                    <span>Action / Details</span>
                    <span>User</span>
                    <span>Role</span>
                </div>
                <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                    {logs.filter(log => filter === 'ALL' || log.action.includes(filter)).map(log => (
                        <div key={log.id} style={{ padding: '1.25rem', borderBottom: '1px solid var(--glass-border)', display: 'grid', gridTemplateColumns: '150px 1fr 150px 150px', alignItems: 'center', transition: 'background 0.2s' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={14} />
                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                <br />
                                {new Date(log.createdAt).toLocaleDateString()}
                            </div>
                            <div>
                                <span style={{ fontWeight: 700, color: getActionColor(log.action), fontSize: '0.9rem', marginBottom: '0.25rem', display: 'block' }}>
                                    {log.action.replace('_', ' ')}
                                </span>
                                <p style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{log.details}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                <User size={16} color="var(--text-muted)" />
                                <span>{log.user?.name || log.userId.slice(-6).toUpperCase()}</span>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                                    {log.role}
                                </span>
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <Activity size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                            <p>No activity logs found.</p>
                        </div>
                    )}
                </div>

                {hasMore && (
                    <div style={{ padding: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--glass-border)' }}>
                        <button
                            onClick={loadMore}
                            disabled={fetchingMore}
                            className="premium-glass"
                            style={{
                                padding: '0.75rem 2rem',
                                border: '1px solid var(--primary)',
                                color: 'var(--primary)',
                                fontWeight: 700,
                                cursor: fetchingMore ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                margin: '0 auto',
                                transition: 'all 0.2s'
                            }}
                        >
                            {fetchingMore ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <Clock size={18} />
                                    Load More Activity
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLog;
