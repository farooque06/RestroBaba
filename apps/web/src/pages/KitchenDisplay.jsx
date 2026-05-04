import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    ChefHat,
    Timer,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Utensils,
    History,
    Wifi,
    WifiOff,
    Flame,
    UtensilsCrossed,
    Clock,
    Zap,
    Volume2,
    VolumeX
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { initSocket, disconnectSocket } from '../services/socket';


// ── Helper: Elapsed time ──
const getElapsedTime = (createdAt) => {
    if (!createdAt) return '0m';
    const diff = Math.floor((new Date() - new Date(createdAt)) / 1000 / 60);
    if (diff >= 60) return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    return `${diff}m`;
};

// ── Inline flash notification (replaces blocking toasts for KDS actions) ──
const KDSFlash = ({ message, variant, onDone }) => {
    useEffect(() => {
        const t = setTimeout(onDone, 1800);
        return () => clearTimeout(t);
    }, [onDone]);

    const colors = {
        cooking: { bg: 'rgba(212,175,55,0.15)', border: '#d4af37', text: '#d4af37', icon: '🔥' },
        ready: { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#10b981', icon: '✅' },
        served: { bg: 'rgba(99,102,241,0.15)', border: '#6366f1', text: '#6366f1', icon: '🍽️' },
        error: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', text: '#ef4444', icon: '⚠️' },
        item: { bg: 'rgba(16,185,129,0.15)', border: '#10b981', text: '#10b981', icon: '✓' }
    };
    const c = colors[variant] || colors.ready;

    return (
        <div className="kds-flash animate-flash-in" style={{
            background: c.bg,
            border: `1px solid ${c.border}`,
            color: c.text,
        }}>
            <span>{c.icon}</span>
            <span>{message}</span>
        </div>
    );
};

const KitchenDisplay = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLive, setIsLive] = useState(false);
    const [activeStation, setActiveStation] = useState(localStorage.getItem('kdsStation') || 'All');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeTab, setActiveTab] = useState('Pending');
    const [togglingItems, setTogglingItems] = useState({});
    const [dismissingOrders, setDismissingOrders] = useState({});
    const [flashMessages, setFlashMessages] = useState([]);
    const [soundEnabled, setSoundEnabled] = useState(localStorage.getItem('kdsSoundEnabled') !== 'false');
    const flashIdRef = useRef(0);

    // ── Flash message system (non-blocking) ──
    const showFlash = useCallback((message, variant = 'ready') => {
        const id = ++flashIdRef.current;
        setFlashMessages(prev => [...prev.slice(-2), { id, message, variant }]);
    }, []);

    const removeFlash = useCallback((id) => {
        setFlashMessages(prev => prev.filter(f => f.id !== id));
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 10000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchOrders();
        const clientId = user?.clientId || localStorage.getItem('restroClientId');

        if (clientId) {
            const socket = initSocket(clientId);
            socket.on('connect', () => setIsLive(true));
            socket.on('disconnect', () => setIsLive(false));

            socket.on('ORDER_NEW', (newOrder) => {
                if (soundEnabled) {
                    const tableNum = newOrder.table?.number || 'Walk-in';
                    const msg = new SpeechSynthesisUtterance(`New order for Table ${tableNum}`);
                    window.speechSynthesis.speak(msg);
                }
                showFlash(`New order incoming!`, 'cooking');
                fetchOrders(true);
            });

            socket.on('ORDER_UPDATE', () => fetchOrders(true));

            socket.on('ORDER_ITEMS_ADDED', (data) => {
                const tableNum = data.tableNumber || 'Walk-in';
                const itemCount = data.newItems?.length || 0;
                if (soundEnabled) {
                    const msg = new SpeechSynthesisUtterance(
                        `Attention: ${itemCount} new item${itemCount > 1 ? 's' : ''} added to Table ${tableNum}`
                    );
                    msg.rate = 1.1;
                    window.speechSynthesis.speak(msg);
                }
                showFlash(`+${itemCount} items → Table ${tableNum}`, 'cooking');
                fetchOrders(true);
            });
        }

        return () => disconnectSocket();
    }, [user?.clientId, soundEnabled]);

    const fetchOrders = async (silent = false) => {
        if (!silent) setLoading(true);
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                const activeOrders = data.filter(o => ['Pending', 'Cooking', 'Ready'].includes(o.status));
                const cleanedOrders = activeOrders.map(order => ({
                    ...order,
                    items: order.items.filter(item => !['Served', 'Waste'].includes(item.status))
                })).filter(order => order.items.length > 0);
                setOrders(cleanedOrders);
            }
        } catch (err) {
            console.error('KDS fetch error', err);
        } finally {
            setLoading(false);
        }
    };

    // ── OPTIMISTIC status update ──
    const updateStatus = useCallback(async (orderId, newStatus) => {
        // 1. Immediately animate the card out
        setDismissingOrders(prev => ({ ...prev, [orderId]: newStatus }));

        // 2. Show instant flash feedback
        const labels = { 'Cooking': '🔥 Firing!', 'Ready': '✅ Ready for pickup!', 'Served': '🍽️ Served!' };
        showFlash(labels[newStatus] || `→ ${newStatus}`, newStatus.toLowerCase());

        // 3. Remove from local state after animation (300ms)
        setTimeout(() => {
            setOrders(prev => {
                if (newStatus === 'Served') {
                    return prev.filter(o => o.id !== orderId);
                }
                return prev.map(o => {
                    if (o.id !== orderId) return o;
                    const updated = { ...o, status: newStatus };
                    if (newStatus === 'Cooking') {
                        updated.items = o.items.map(i => ({
                            ...i,
                            status: 'Cooking',
                            cookingStartedAt: new Date().toISOString()
                        }));
                    }
                    if (newStatus === 'Ready') {
                        updated.items = o.items.map(i => ({ ...i, status: 'Ready' }));
                    }
                    return updated;
                });
            });
            setDismissingOrders(prev => { const n = { ...prev }; delete n[orderId]; return n; });
        }, 320);

        // 4. Fire API in background (non-blocking)
        const token = localStorage.getItem('restroToken');
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            if (!response.ok) {
                showFlash('Update failed — reverting', 'error');
                fetchOrders(true);
            }
        } catch (err) {
            showFlash('Network error — reverting', 'error');
            fetchOrders(true);
        }
    }, [showFlash]);

    if (loading) return (
        <div className="page-container flex-center" style={{ flexDirection: 'column', gap: '1rem', background: '#0a0a0b', minHeight: '100vh' }}>
            <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>Syncing kitchen orders...</p>
        </div>
    );

    const sortedOrders = [...orders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const filteredOrders = sortedOrders.map(order => {
        const stationItems = activeStation === 'All'
            ? order.items
            : order.items.filter(item => item.menuItem?.category?.station === activeStation);

        const activeItems = stationItems.filter(item => {
            if (item.status !== 'Ready') return true;
            const readyTime = new Date(item.updatedAt || item.createdAt);
            return (currentTime - readyTime) / 1000 / 60 < 5;
        });

        return { ...order, items: activeItems };
    }).filter(order => order.items.length > 0);

    const columns = {
        Pending: filteredOrders.filter(o => o.status === 'Pending').map(o => {
            const pendingItems = o.items.filter(i => i.status === 'Pending');
            const displayTime = pendingItems.length > 0
                ? new Date(Math.min(...pendingItems.map(i => new Date(i.createdAt))))
                : new Date(o.createdAt);
            return { ...o, displayTime };
        }),
        Cooking: filteredOrders.filter(o => o.status === 'Cooking').map(o => {
            const cookingItems = o.items.filter(i => i.status === 'Cooking' && i.cookingStartedAt);
            const displayTime = cookingItems.length > 0
                ? new Date(Math.min(...cookingItems.map(i => new Date(i.cookingStartedAt))))
                : new Date(o.createdAt);
            return { ...o, displayTime };
        }),
        Ready: filteredOrders.filter(o => o.status === 'Ready').map(o => {
            const displayTime = new Date(Math.max(...o.items.map(i => new Date(i.updatedAt || i.createdAt))));
            return { ...o, displayTime };
        })
    };

    const totalActive = columns.Pending.length + columns.Cooking.length + columns.Ready.length;

    return (
        <div className="page-container animate-fade kds-pro-theme">
            {/* ── FLASH NOTIFICATIONS ── */}
            <div className="kds-flash-container">
                {flashMessages.map(f => (
                    <KDSFlash
                        key={f.id}
                        message={f.message}
                        variant={f.variant}
                        onDone={() => removeFlash(f.id)}
                    />
                ))}
            </div>

            {/* ── KDS HEADER ── */}
            <div className="kds-header">
                <div className="kds-header-left">
                    <div className="kds-logo-wrapper">
                        <ChefHat size={28} />
                    </div>
                    <div>
                        <h1>Live Kitchen Feed</h1>
                        <div className="kds-status-bar">
                            <div className={`kds-sync-chip ${isLive ? 'live' : 'lost'}`}>
                                {isLive ? <Wifi size={12} /> : <WifiOff size={12} />}
                                <span>{isLive ? 'SYSTEM LIVE' : 'SYNC LOST'}</span>
                            </div>
                            <span className="kds-time-display">
                                <Timer size={12} />
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="kds-order-count">
                                <Zap size={10} style={{ marginRight: '3px' }} />
                                {totalActive} Active
                            </span>
                            <button
                                className="kds-sound-toggle"
                                onClick={() => {
                                    const next = !soundEnabled;
                                    setSoundEnabled(next);
                                    localStorage.setItem('kdsSoundEnabled', next);
                                }}
                                title={soundEnabled ? 'Mute voice alerts' : 'Enable voice alerts'}
                            >
                                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="kds-header-right">
                    <div className="kds-station-switcher">
                        {['All', 'Kitchen', 'Bar', 'Grill', 'Dessert'].map(station => (
                            <button
                                key={station}
                                onClick={() => {
                                    setActiveStation(station);
                                    localStorage.setItem('kdsStation', station);
                                }}
                                className={`kds-station-btn ${activeStation === station ? 'active' : ''}`}
                            >
                                {station === 'All' ? 'ALL STATIONS' : station.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── MOBILE TABS ── */}
            <div className="kds-mobile-tabs">
                {[
                    { id: 'Pending', label: 'INCOMING', icon: <AlertCircle size={16} />, color: '#f59e0b', count: columns.Pending.length },
                    { id: 'Cooking', label: 'NOW PREP', icon: <Flame size={16} />, color: '#d4af37', count: columns.Cooking.length },
                    { id: 'Ready', label: 'PICKUP', icon: <CheckCircle2 size={16} />, color: '#10b981', count: columns.Ready.length }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`kds-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        style={{ '--tab-color': tab.color }}
                    >
                        <div className="tab-icon-row">
                            {tab.icon}
                            <span>{tab.count}</span>
                        </div>
                        <span className="tab-label">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* ── MAIN KDS GRID ── */}
            <div className="kds-main-content">
                <div className="kds-layout-grid">
                    {/* Pending Column */}
                    <div className={`kds-column pending ${activeTab === 'Pending' ? 'mobile-show' : 'mobile-hide'}`}>
                        <div className="kds-column-header">
                            <div className="header-tag warning"><AlertCircle size={14} /> INCOMING</div>
                            <span className="count">{columns.Pending.length}</span>
                        </div>
                        <div className="kds-orders-container">
                            {columns.Pending.length === 0 && (
                                <div className="kds-empty-state">
                                    <UtensilsCrossed size={32} />
                                    <span>No incoming orders</span>
                                </div>
                            )}
                            {columns.Pending.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    onAction={() => updateStatus(order.id, 'Cooking')}
                                    actionLabel="FIRE"
                                    actionIcon={<Flame size={18} />}
                                    time={getElapsedTime(order.displayTime)}
                                    variant="warning"
                                    currentTime={currentTime}
                                    onRefresh={() => fetchOrders(true)}
                                    togglingItems={togglingItems}
                                    setTogglingItems={setTogglingItems}
                                    isDismissing={dismissingOrders[order.id]}
                                    showFlash={showFlash}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Cooking Column */}
                    <div className={`kds-column cooking ${activeTab === 'Cooking' ? 'mobile-show' : 'mobile-hide'}`}>
                        <div className="kds-column-header">
                            <div className="header-tag primary"><Flame size={14} /> COOKING</div>
                            <span className="count">{columns.Cooking.length}</span>
                        </div>
                        <div className="kds-orders-container">
                            {columns.Cooking.length === 0 && (
                                <div className="kds-empty-state">
                                    <Flame size={32} />
                                    <span>Nothing on the stove</span>
                                </div>
                            )}
                            {columns.Cooking.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    onAction={() => updateStatus(order.id, 'Ready')}
                                    actionLabel="DONE"
                                    actionIcon={<CheckCircle2 size={18} />}
                                    time={getElapsedTime(order.displayTime)}
                                    variant="primary"
                                    currentTime={currentTime}
                                    onRefresh={() => fetchOrders(true)}
                                    togglingItems={togglingItems}
                                    setTogglingItems={setTogglingItems}
                                    isDismissing={dismissingOrders[order.id]}
                                    showFlash={showFlash}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Ready Column */}
                    <div className={`kds-column ready ${activeTab === 'Ready' ? 'mobile-show' : 'mobile-hide'}`}>
                        <div className="kds-column-header">
                            <div className="header-tag success"><CheckCircle2 size={14} /> PICKUP</div>
                            <span className="count">{columns.Ready.length}</span>
                        </div>
                        <div className="kds-orders-container">
                            {columns.Ready.length === 0 && (
                                <div className="kds-empty-state">
                                    <CheckCircle2 size={32} />
                                    <span>All served up!</span>
                                </div>
                            )}
                            {columns.Ready.map(order => (
                                <OrderCard
                                    key={order.id}
                                    order={order}
                                    onAction={() => updateStatus(order.id, 'Served')}
                                    actionLabel="SERVED"
                                    actionIcon={<History size={18} />}
                                    time={getElapsedTime(order.displayTime)}
                                    variant="success"
                                    currentTime={currentTime}
                                    onRefresh={() => fetchOrders(true)}
                                    togglingItems={togglingItems}
                                    setTogglingItems={setTogglingItems}
                                    isDismissing={dismissingOrders[order.id]}
                                    showFlash={showFlash}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── ORDER CARD COMPONENT ──
const OrderCard = ({ order, onAction, actionLabel, actionIcon, time, variant, currentTime, onRefresh, togglingItems = {}, setTogglingItems = () => { }, isDismissing, showFlash }) => {
    const [pressing, setPressing] = useState(false);
    const ageInMins = Math.floor((currentTime - new Date(order.displayTime)) / 1000 / 60);

    let urgencyClass = '';
    if (order.status === 'Cooking') {
        if (ageInMins >= 10) urgencyClass = 'urgent-critical';
        else if (ageInMins >= 5) urgencyClass = 'urgent-warning';
        else urgencyClass = 'urgent-normal';
    }

    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const readyItems = order.items.filter(i => i.status === 'Ready').reduce((sum, i) => sum + i.quantity, 0);

    const handleAction = () => {
        setPressing(true);
        onAction();
    };

    return (
        <div className={`kds-card ${variant} ${urgencyClass} ${isDismissing ? 'kds-card-dismiss' : ''}`}>
            {/* Card Header */}
            <div className="kds-card-header">
                <div className="order-info">
                    <div className="order-num">#{order.id.slice(-4).toUpperCase()}</div>
                    <div className="table-info">
                        <Utensils size={12} />
                        {order.type === 'TAKEAWAY' ? 'Parcel' : `T${order.table?.number || '?'}`}
                        {order.type === 'TAKEAWAY' && (
                            <span className="parcel-badge">PKG</span>
                        )}
                    </div>
                </div>
                <div className={`timer ${urgencyClass}`}>
                    <Timer size={14} className={ageInMins >= 10 ? 'animate-pulse' : ''} />
                    <span>{time}</span>
                </div>
            </div>

            {/* Progress indicator for cooking orders */}
            {order.status === 'Cooking' && totalItems > 0 && (
                <div className="kds-progress-bar">
                    <div className="kds-progress-fill" style={{ width: `${(readyItems / totalItems) * 100}%` }} />
                    <span className="kds-progress-text">{readyItems}/{totalItems} done</span>
                </div>
            )}

            {/* Items List */}
            <div className="kds-item-list">
                {[...order.items]
                    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt) || a.id.localeCompare(b.id))
                    .map((item) => {
                        const isToggling = togglingItems[item.id];
                        const displayReady = isToggling
                            ? (item.status !== 'Ready')
                            : (item.status === 'Ready');
                        return (
                            <div key={item.id} className={`kds-item-row ${displayReady ? 'ready' : ''}`}>
                                <div className="qty-box">{item.quantity}x</div>
                                <div className="item-details">
                                    <div className="name-row">
                                        <span className="item-name">
                                            {item.menuItem?.name}
                                            {item.variant?.name && <span className="item-variant"> ({item.variant.name})</span>}
                                        </span>
                                        {item.status === 'Pending' && !isToggling && <span className="new-badge">NEW</span>}
                                        {item.cookingStartedAt && order.status === 'Cooking' && (
                                            <span className="item-elapsed">
                                                <Clock size={10} /> {getElapsedTime(item.cookingStartedAt)}
                                            </span>
                                        )}
                                    </div>
                                    {item.notes && <div className="item-notes">📝 {item.notes}</div>}
                                </div>

                                {order.status === 'Cooking' && (
                                    <button
                                        className={`item-check-btn ${displayReady ? 'checked' : ''}`}
                                        disabled={isToggling}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            const newStatus = item.status === 'Ready' ? 'Pending' : 'Ready';
                                            setTogglingItems(prev => ({ ...prev, [item.id]: true }));
                                            showFlash(newStatus === 'Ready' ? `${item.menuItem?.name} ✓` : `${item.menuItem?.name} reset`, 'item');
                                            const token = localStorage.getItem('restroToken');
                                            try {
                                                const res = await fetch(`${API_BASE_URL}/api/orders/item/${item.id}/status`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                                    body: JSON.stringify({ status: newStatus })
                                                });
                                                if (!res.ok) showFlash('Item update failed', 'error');
                                            } finally {
                                                setTogglingItems(prev => { const n = { ...prev }; delete n[item.id]; return n; });
                                                if (onRefresh) onRefresh();
                                            }
                                        }}
                                    >
                                        <CheckCircle2 size={22} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
            </div>

            {/* Action Button */}
            <button
                className={`kds-action-btn ${variant} ${pressing ? 'kds-btn-pressed' : ''}`}
                onClick={handleAction}
            >
                {actionIcon}
                <span>{actionLabel}</span>
            </button>
        </div>
    );
};

export default KitchenDisplay;
