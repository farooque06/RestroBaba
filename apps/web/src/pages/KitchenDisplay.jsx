import React, { useState, useEffect } from 'react';
import {
    ChefHat,
    Timer,
    CheckCircle2,
    PlayCircle,
    AlertCircle,
    Loader2,
    Utensils,
    History,
    Wifi,
    WifiOff
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { initSocket, disconnectSocket } from '../services/socket';
import toast from 'react-hot-toast';

const KitchenDisplay = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLive, setIsLive] = useState(false);
    const [activeStation, setActiveStation] = useState(localStorage.getItem('kdsStation') || 'All');
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 10000); // Update every 10s
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchOrders();

        // Use clientId from user object if available, otherwise fallback to localStorage
        const clientId = user?.clientId || localStorage.getItem('restroClientId');

        if (clientId) {
            console.log('⚡ Initializing socket for client:', clientId);
            const socket = initSocket(clientId);

            socket.on('connect', () => setIsLive(true));
            socket.on('disconnect', () => setIsLive(false));

            socket.on('ORDER_NEW', (newOrder) => {
                console.log('🆕 New order via socket:', newOrder);
                // Audio Alert
                const tableNum = newOrder.table?.number || 'Walk-in';
                const msg = new SpeechSynthesisUtterance(`New order for Table ${tableNum}`);
                window.speechSynthesis.speak(msg);
                fetchOrders(true);
            });

            socket.on('ORDER_UPDATE', (updatedOrder) => {
                console.log('🔄 Order update via socket:', updatedOrder);
                fetchOrders(true);
            });
        }

        return () => {
            disconnectSocket();
        };
    }, [user?.clientId]);

    const fetchOrders = async (silent = false) => {
        if (!silent) setLoading(true);
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                // Kitchen only cares about Pending, Cooking, and Ready
                const activeOrders = data.filter(o => ['Pending', 'Cooking', 'Ready'].includes(o.status));
                setOrders(activeOrders);
            }
        } catch (err) {
            console.error('KDS fetch error', err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                toast.success(`Order marked as ${newStatus}`);
                fetchOrders(true);
            }
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const getElapsedTime = (createdAt) => {
        const diff = Math.floor((new Date() - new Date(createdAt)) / 1000 / 60);
        return `${diff}m ago`;
    };

    if (loading) return (
        <div className="page-container flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            <p style={{ color: 'var(--text-muted)' }}>Syncing kitchen orders...</p>
        </div>
    );

    // Sort orders by age (oldest first)
    const sortedOrders = [...orders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Filter orders and their items by station + Auto-Archive (5 min)
    const filteredOrders = sortedOrders.map(order => {
        const stationItems = activeStation === 'All'
            ? order.items
            : order.items.filter(item => item.menuItem?.category?.station === activeStation);

        // Auto-Archive: Filter out items that were ready > 5 minutes ago
        const activeItems = stationItems.filter(item => {
            if (item.status !== 'Ready') return true;
            const readyTime = new Date(item.updatedAt || item.createdAt);
            const diffInMins = (currentTime - readyTime) / 1000 / 60;
            return diffInMins < 5;
        });

        return { ...order, items: activeItems };
    }).filter(order => order.items.length > 0);

    const columns = {
        Pending: filteredOrders.filter(o => o.status === 'Pending'),
        Cooking: filteredOrders.filter(o => o.status === 'Cooking'),
        Ready: filteredOrders.filter(o => o.status === 'Ready')
    };

    return (
        <div className="page-container animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <ChefHat size={32} color="var(--primary)" />
                        Kitchen Display System
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Managing live orders and prep workflow.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.4rem', borderRadius: '12px' }}>
                        {['All', 'Kitchen', 'Bar', 'Grill', 'Dessert'].map(station => (
                            <button
                                key={station}
                                onClick={() => {
                                    setActiveStation(station);
                                    localStorage.setItem('kdsStation', station);
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: activeStation === station ? 'var(--primary)' : 'transparent',
                                    color: activeStation === station ? 'white' : 'var(--text-muted)',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {station === 'All' ? 'GLOBAL VIEW' : `${station.toUpperCase()} ONLY`}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: isLive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '0.5rem 1rem', borderRadius: '20px', border: `1px solid ${isLive ? '#10b98133' : '#ef444433'}` }}>
                        {isLive ? <Wifi size={14} color="#10b981" /> : <WifiOff size={14} color="#ef4444" />}
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isLive ? '#10b981' : '#ef4444' }}>
                            {isLive ? 'LIVE SYNC ACTIVE' : 'CONNECTION LOST'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="kds-grid" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '1.5rem',
                minHeight: '70vh'
            }}>
                {/* Pending Column */}
                <div className="kds-column">
                    <div className="kds-column-header" style={{ borderTop: '4px solid var(--warning)' }}>
                        <AlertCircle size={20} color="var(--warning)" />
                        <span>Incoming / Pending</span>
                        <span className="badge badge-warning">{columns.Pending.length}</span>
                    </div>
                    <div className="kds-column-content">
                        {columns.Pending.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onAction={() => updateStatus(order.id, 'Cooking')}
                                actionLabel="Start Cooking"
                                actionIcon={<PlayCircle size={18} />}
                                time={getElapsedTime(order.createdAt)}
                                variant="warning"
                                currentTime={currentTime}
                                onRefresh={() => fetchOrders(true)}
                            />
                        ))}
                    </div>
                </div>

                {/* Cooking Column */}
                <div className="kds-column">
                    <div className="kds-column-header" style={{ borderTop: '4px solid var(--primary)' }}>
                        <Utensils size={20} color="var(--primary)" />
                        <span>Now Cooking</span>
                        <span className="badge badge-primary">{columns.Cooking.length}</span>
                    </div>
                    <div className="kds-column-content">
                        {columns.Cooking.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onAction={() => updateStatus(order.id, 'Ready')}
                                actionLabel="Mark Ready"
                                actionIcon={<CheckCircle2 size={18} />}
                                time={getElapsedTime(order.createdAt)}
                                variant="primary"
                                currentTime={currentTime}
                                onRefresh={() => fetchOrders(true)}
                            />
                        ))}
                    </div>
                </div>

                {/* Ready Column */}
                <div className="kds-column">
                    <div className="kds-column-header" style={{ borderTop: '4px solid var(--success)' }}>
                        <CheckCircle2 size={20} color="var(--success)" />
                        <span>Ready for Pickup</span>
                        <span className="badge badge-success">{columns.Ready.length}</span>
                    </div>
                    <div className="kds-column-content">
                        {columns.Ready.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                onAction={() => updateStatus(order.id, 'Served')}
                                actionLabel="Served"
                                actionIcon={<History size={18} />}
                                time={getElapsedTime(order.createdAt)}
                                variant="success"
                                currentTime={currentTime}
                                onRefresh={() => fetchOrders(true)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const OrderCard = ({ order, onAction, actionLabel, actionIcon, time, variant, currentTime, onRefresh }) => {
    const isUrgent = (currentTime - new Date(order.createdAt)) > 10 * 60 * 1000; // 10 minutes

    return (
        <div className={`premium-glass kds-card ${isUrgent && order.status !== 'Ready' ? 'urgent-flash' : ''}`}
            style={{ marginBottom: '1rem', padding: '1.25rem', borderLeft: `8px solid var(--${variant})` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>#{order.id.slice(-4).toUpperCase()}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Table {order.table?.number || 'Walk-in'}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: isUrgent ? 'var(--danger)' : 'var(--text-muted)', fontWeight: isUrgent ? 800 : 500 }}>
                    <Timer size={14} className={isUrgent ? 'animate-pulse' : ''} />
                    {time}
                </div>
            </div>

            <div style={{ borderTop: '1px dashed var(--border)', borderBottom: '1px dashed var(--border)', padding: '0.75rem 0', marginBottom: '1.25rem' }}>
                {order.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '6px', opacity: item.status === 'Ready' ? 0.5 : 1 }}>
                        <div style={{
                            minWidth: '24px',
                            height: '24px',
                            background: item.status === 'Ready' ? 'var(--success)' : 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: item.status === 'Ready' ? 'white' : 'inherit'
                        }}>
                            {item.quantity}x
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                textDecoration: item.status === 'Ready' ? 'line-through' : 'none',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                {item.menuItem?.name}
                                {item.status === 'Pending' && order.status !== 'Pending' && (
                                    <span style={{
                                        marginLeft: '8px',
                                        fontSize: '0.65rem',
                                        background: 'var(--danger)',
                                        color: 'white',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontWeight: 800,
                                        animation: 'pulse 1.5s infinite'
                                    }}>
                                        NEW
                                    </span>
                                )}
                                <span style={{
                                    marginLeft: 'auto',
                                    fontSize: '0.7rem',
                                    color: 'var(--text-muted)',
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <Timer size={10} />
                                    {Math.floor((currentTime - new Date(item.createdAt)) / 1000 / 60)}m
                                </span>
                            </div>
                            {item.notes && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontStyle: 'italic' }}>Note: {item.notes}</div>}
                        </div>
                        {order.status === 'Cooking' && (
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    const newStatus = item.status === 'Ready' ? 'Pending' : 'Ready';
                                    const token = localStorage.getItem('restroToken');
                                    const res = await fetch(`${API_BASE_URL}/api/orders/item/${item.id}/status`, {
                                        method: 'PATCH',
                                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                        body: JSON.stringify({ status: newStatus })
                                    });
                                    if (res.ok) {
                                        toast.success(newStatus === 'Ready' ? 'Item Prepared' : 'Item Reset');
                                        if (onRefresh) onRefresh();
                                    }
                                }}
                                style={{ background: 'transparent', border: 'none', color: item.status === 'Ready' ? 'var(--success)' : 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                <CheckCircle2 size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <button
                className="btn-primary"
                onClick={onAction}
                style={{
                    width: '100%',
                    justifyContent: 'center',
                    gap: '8px',
                    background: `var(--${variant})`,
                    boxShadow: `0 4px 12px var(--${variant}-glow)`
                }}
            >
                {actionIcon}
                {actionLabel}
            </button>
        </div>
    );
};

export default KitchenDisplay;
