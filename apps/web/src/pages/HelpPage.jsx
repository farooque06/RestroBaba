import React, { useState } from 'react';
import { 
    HelpCircle, 
    Book, 
    MessageCircle, 
    ChevronDown, 
    ChevronUp, 
    Search, 
    Layout, 
    Utensils, 
    DollarSign, 
    Settings, 
    Users, 
    Package, 
    LifeBuoy,
    ShieldCheck,
    Smartphone,
    AlertCircle,
    Phone,
    X
} from 'lucide-react';

const HelpPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [openFaq, setOpenFaq] = useState(null);

    const faqs = [
        {
            question: "How do I set up my restaurant's QR code for payments?",
            answer: "Go to the Settings page, specifically the 'Business & Finance' tab. There you can upload your payment QR code image (like UPI or WhatsApp Pay). Once saved, this QR code will automatically appear on the checkout screen when 'Online' payment is selected."
        },
        {
            question: "Can I use RestroBaba on my phone or tablet?",
            answer: "Yes! RestroBaba is a Progressive Web App (PWA). You can 'Add to Home Screen' from your browser's menu on any device. This gives you a standalone app experience that works perfectly on tablets (for waiters) and phones (for owners)."
        },
        {
            question: "How do I manage multi-role staff?",
            answer: "In the Staff Management section, you can add members and assign roles like Admin, Manager, Chef, or Waiter. Each role has specific permissions (e.g., Chefs only see the Kitchen Display, Waiters cannot access financial reports)."
        },
        {
            question: "What should I do if an item is out of stock?",
            answer: "You can quickly toggle item availability in the Menu Management screen. Alternatively, if you use the Inventory module, you can set stock levels, and the system can warn you when items run low."
        },
        {
            question: "How do I process a split bill?",
            answer: "During checkout in Table Management or Billing, click the 'Split Bill' button. You can then split the total evenly or by specific items between your guests."
        },
        {
            question: "Is my data secure?",
            answer: "RestroBaba uses enterprise-grade encryption for all data transmissions. We also support Two-Factor Authentication (2FA/TOTP) for Admin accounts to ensure the highest level of security."
        }
    ];

    const guides = [
        {
            title: "Table Service",
            icon: <Utensils size={24} />,
            steps: ["Select an available table", "Add guest count and seat them", "Add items to the order", "Send to kitchen"]
        },
        {
            title: "Billing & Payment",
            icon: <DollarSign size={24} />,
            steps: ["Click 'Bill' on an occupied table", "Select payment method (Cash/Card/Online)", "Confirm payment", "Print or Download receipt"]
        },
        {
            title: "Menu Setup",
            icon: <Layout size={24} />,
            steps: ["Create Menu Categories (e.g., Pizzas, Drinks)", "Add Items with prices and descriptions", "Upload images for a premium look"]
        },
        {
            title: "Stock Control",
            icon: <Package size={24} />,
            steps: ["Add inventory items", "Set minimum thresholds", "Track stock usage automatically via recipes"]
        }
    ];

    const toggleFaq = (index) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const filteredFaqs = faqs.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const [showInstallGuide, setShowInstallGuide] = useState(false);

    const InstallGuideModal = () => (
        <div className="modal-overlay" onClick={() => setShowInstallGuide(false)}>
            <div className="modal-card" style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>How to Install RestroBaba</h2>
                    <button className="btn-ghost" onClick={() => setShowInstallGuide(false)}>
                        <X size={20} />
                    </button>
                </div>

                <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                    <div className="premium-glass" style={{ padding: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                            <Smartphone size={20} /> Android (Chrome)
                        </h3>
                        <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.8' }}>
                            <li>Open RestroBaba in your <strong>Chrome browser</strong>.</li>
                            <li>Wait for the <strong>"Add to Home Screen"</strong> banner at the bottom.</li>
                            <li>If no banner appears, tap the <strong>three dots (⋮)</strong> in the top right.</li>
                            <li>Select <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.</li>
                        </ol>
                    </div>

                    <div className="premium-glass" style={{ padding: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                            <Smartphone size={20} /> iPhone / iPad (Safari)
                        </h3>
                        <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.8' }}>
                            <li>Open RestroBaba in <strong>Safari</strong>.</li>
                            <li>Tap the <strong>Share button</strong> (square icon with upward arrow) at the bottom.</li>
                            <li>Scroll down and tap <strong>"Add to Home Screen"</strong>.</li>
                            <li>Tap <strong>"Add"</strong> in the top right corner.</li>
                        </ol>
                    </div>

                    <div className="premium-glass" style={{ padding: '1.5rem' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--primary)' }}>
                            <Layout size={20} /> Desktop (Chrome/Edge)
                        </h3>
                        <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.8' }}>
                            <li>Open the site in your browser.</li>
                            <li>Look at the right side of your <strong>Address Bar</strong>.</li>
                            <li>Click the <strong>Install icon</strong> (monitor with plus sign).</li>
                            <li>Confirm the installation to get a standalone app window.</li>
                        </ol>
                    </div>
                </div>

                <button 
                    className="btn-primary" 
                    style={{ width: '100%', marginTop: '2rem', padding: '1rem' }}
                    onClick={() => setShowInstallGuide(false)}
                >
                    Got it!
                </button>
            </div>
        </div>
    );

    return (
        <div className="page-container animate-fade">
            {showInstallGuide && <InstallGuideModal />}
            <header style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="icon-box-premium primary">
                        <HelpCircle size={32} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', margin: 0 }}>Help & Support Center</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Everything you need to master your RestroBaba system.</p>
                    </div>
                </div>

                <div className="search-bar" style={{ maxWidth: '600px', margin: '2rem 0' }}>
                    <Search size={20} />
                    <input 
                        type="text" 
                        placeholder="Search for guides, FAQs, or troubleshooting tips..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            <section style={{ marginBottom: '4rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                    <Book className="primary" /> Quick Start Guides
                </h2>
                <div className="dashboard-grid">
                    {guides.map((guide, idx) => (
                        <div key={idx} className="premium-glass card-hover" style={{ padding: '2rem' }}>
                            <div style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>{guide.icon}</div>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{guide.title}</h3>
                            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {guide.steps.map((step, sIdx) => (
                                    <li key={sIdx} style={{ fontSize: '0.9rem' }}>{step}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
                <section>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                        <MessageCircle className="primary" /> Frequently Asked Questions
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {filteredFaqs.map((faq, idx) => (
                            <div 
                                key={idx} 
                                className="premium-glass" 
                                style={{ 
                                    overflow: 'hidden', 
                                    transition: 'all 0.3s ease',
                                    border: openFaq === idx ? '1px solid var(--primary)' : '1px solid var(--glass-border)'
                                }}
                            >
                                <button 
                                    onClick={() => toggleFaq(idx)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '1.5rem', 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        background: 'none', 
                                        border: 'none', 
                                        cursor: 'pointer',
                                        color: 'inherit',
                                        textAlign: 'left'
                                    }}
                                >
                                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{faq.question}</span>
                                    {openFaq === idx ? <ChevronUp size={20} className="primary" /> : <ChevronDown size={20} />}
                                </button>
                                {openFaq === idx && (
                                    <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="premium-glass" style={{ padding: '2rem', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <Smartphone className="primary" size={20} />
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>PWA Install</h3>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Install RestroBaba as an app on your iOS or Android device for better performance.
                        </p>
                        <button 
                            className="nav-item active" 
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}
                            onClick={() => setShowInstallGuide(true)}
                        >
                            View Install Guide
                        </button>
                    </div>

                    <div className="premium-glass" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                            <AlertCircle style={{ color: '#f59e0b' }} size={20} />
                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Troubleshooting</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ fontSize: '0.8rem' }}>
                                <strong style={{ display: 'block', color: 'var(--text-main)' }}>Page not loading?</strong>
                                <span style={{ color: 'var(--text-muted)' }}>Try refreshing the page or clearing browser cache.</span>
                            </div>
                            <div style={{ fontSize: '0.8rem' }}>
                                <strong style={{ display: 'block', color: 'var(--text-main)' }}>Printers not working?</strong>
                                <span style={{ color: 'var(--text-muted)' }}>Check if your browser allows pop-ups and has printer access.</span>
                            </div>
                        </div>
                    </div>

                    <div className="premium-glass" style={{ padding: '2rem', textAlign: 'center' }}>
                        <LifeBuoy size={32} className="primary" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ marginBottom: '0.5rem' }}>Need More Help?</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            Our premium support team is available to assist you via WhatsApp or Email.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <a href="https://wa.me/9779818998937" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                <button className="nav-item active" style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#25D366', borderColor: '#25D366' }}>
                                    <MessageCircle size={18} />
                                    WhatsApp Support
                                </button>
                            </a>
                            <a href="tel:9818998937" style={{ textDecoration: 'none' }}>
                                <button className="nav-item active" style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Phone size={18} />
                                    Direct Call
                                </button>
                            </a>
                            <a href="mailto:support@restrobaba.io" style={{ textDecoration: 'none' }}>
                                <button className="btn-ghost" style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem' }}>
                                    Email Support
                                </button>
                            </a>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default HelpPage;
