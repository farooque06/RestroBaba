import React, { useState } from 'react';
import {
    AlertCircle,
    ArrowRight,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    DollarSign,
    HelpCircle,
    Layout,
    LifeBuoy,
    Mail,
    MessageCircle,
    Package,
    Phone,
    Search,
    Smartphone,
    Utensils,
    X
} from 'lucide-react';

const faqs = [
    {
        id: 'payment-qr',
        category: 'Payments',
        question: "How do I set up my restaurant's QR code for payments?",
        answer: "Open Settings and go to the Business & Finance tab. Upload your payment QR code there. It will be available during checkout when you choose Online payment."
    },
    {
        id: 'install-app',
        category: 'Getting started',
        question: 'Can I use RestroBaba on my phone or tablet?',
        answer: "Yes. Open RestroBaba in your browser and use its Install App or Add to Home Screen option. The install guide on this page has steps for Android, iPhone/iPad, and desktop."
    },
    {
        id: 'staff-roles',
        category: 'Account & security',
        question: 'How do I manage staff roles and access?',
        answer: 'Open Staff Management to add team members and assign a role such as Admin, Manager, Chef, or Waiter. Access to pages and actions is based on each role.'
    },
    {
        id: 'out-of-stock',
        category: 'Menu & inventory',
        question: 'What should I do if a menu item is out of stock?',
        answer: 'You can change item availability from Menu Management. If you use Inventory, update the stock level there as well so your team can keep track of what is available.'
    },
    {
        id: 'split-bill',
        category: 'Payments',
        question: 'How do I split a bill?',
        answer: "Open checkout for an occupied table and choose Split Bill. Split options depend on the checkout screen you're using; if you don't see the option, try opening the bill from the Floor Plan."
    },
    {
        id: 'order-status',
        category: 'Orders & tables',
        question: 'Where can I track an order after sending it to the kitchen?',
        answer: 'Use the Orders page to follow order status and the Kitchen Display to monitor preparation. Orders are shown newest first, and the Orders page lets you move through results with pagination.'
    },
    {
        id: 'data-security',
        category: 'Account & security',
        question: 'How can I keep my account secure?',
        answer: 'Use a strong, unique password and give each staff member their own account with only the role access they need. Never share sign-in credentials.'
    },
    {
        id: 'printer-help',
        category: 'Getting started',
        question: 'Why is my receipt or printer not working?',
        answer: 'Check that the printer is connected and selected by your device, then confirm the browser can open the print dialog. If the dialog is blocked, allow pop-ups for the RestroBaba site and try again.'
    }
];

const guides = [
    {
        id: 'table-service',
        title: 'Table service',
        category: 'Orders & tables',
        description: 'From seating guests to sending their order to the kitchen.',
        icon: Utensils,
        steps: ['Choose an available table', 'Add items to the order', 'Review the order', 'Send it to the kitchen']
    },
    {
        id: 'billing-payment',
        title: 'Billing & payment',
        category: 'Payments',
        description: 'Close a table bill and give guests their receipt.',
        icon: DollarSign,
        steps: ['Open the bill for an occupied table', 'Choose a payment method', 'Confirm the payment', 'Print or download the receipt']
    },
    {
        id: 'menu-setup',
        title: 'Set up your menu',
        category: 'Menu & inventory',
        description: 'Organize categories and add items your guests can order.',
        icon: Layout,
        steps: ['Create menu categories', 'Add item names and prices', 'Include descriptions', 'Add photos when available']
    },
    {
        id: 'stock-control',
        title: 'Stock control',
        category: 'Menu & inventory',
        description: 'Keep a closer eye on stock and low-inventory items.',
        icon: Package,
        steps: ['Add inventory items', 'Set low-stock thresholds', 'Keep quantities up to date', 'Review stock as items are used']
    }
];

const topics = [
    'All topics',
    'Getting started',
    'Orders & tables',
    'Payments',
    'Menu & inventory',
    'Account & security'
];

const installSteps = [
    {
        title: 'Android · Chrome',
        steps: [
            'Open RestroBaba in Chrome.',
            'Choose Install App or Add to Home Screen from the browser menu.',
            'Confirm to add RestroBaba to your device.'
        ]
    },
    {
        title: 'iPhone or iPad · Safari',
        steps: [
            'Open RestroBaba in Safari.',
            'Tap Share, then choose Add to Home Screen.',
            'Tap Add to finish.'
        ]
    },
    {
        title: 'Desktop · Chrome or Edge',
        steps: [
            'Open RestroBaba in your browser.',
            'Select the install icon in the address bar, or choose Install from the browser menu.',
            'Confirm to open RestroBaba in its own app window.'
        ]
    }
];

const HelpPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTopic, setActiveTopic] = useState('All topics');
    const [openFaq, setOpenFaq] = useState(null);
    const [showInstallGuide, setShowInstallGuide] = useState(false);
    const query = searchQuery.trim().toLowerCase();

    const filteredFaqs = faqs.filter((faq) => {
        const matchesTopic = activeTopic === 'All topics' || faq.category === activeTopic;
        const matchesSearch = !query || `${faq.question} ${faq.answer} ${faq.category}`.toLowerCase().includes(query);
        return matchesTopic && matchesSearch;
    });

    const filteredGuides = guides.filter((guide) => {
        const matchesTopic = activeTopic === 'All topics' || guide.category === activeTopic;
        const matchesSearch = !query || `${guide.title} ${guide.description} ${guide.steps.join(' ')} ${guide.category}`.toLowerCase().includes(query);
        return matchesTopic && matchesSearch;
    });

    const toggleFaq = (id) => setOpenFaq((current) => current === id ? null : id);

    return (
        <div className="page-container animate-fade help-page">
            {showInstallGuide && (
                <div
                    className="modal-overlay"
                    onClick={() => setShowInstallGuide(false)}
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') setShowInstallGuide(false);
                    }}
                >
                    <section
                        className="modal-card help-install-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="help-install-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="help-modal-header">
                            <div>
                                <span className="help-eyebrow">Take RestroBaba with you</span>
                                <h2 id="help-install-title">Install the app</h2>
                            </div>
                            <button
                                type="button"
                                className="help-icon-button"
                                onClick={() => setShowInstallGuide(false)}
                                aria-label="Close install guide"
                            >
                                <X size={19} />
                            </button>
                        </div>
                        <p className="help-modal-intro">Install RestroBaba on a phone, tablet, or computer for quick access from your home screen or desktop.</p>
                        <div className="help-install-options">
                            {installSteps.map((platform) => (
                                <article className="help-install-option" key={platform.title}>
                                    <h3><Smartphone size={18} />{platform.title}</h3>
                                    <ol>
                                        {platform.steps.map((step) => <li key={step}>{step}</li>)}
                                    </ol>
                                </article>
                            ))}
                        </div>
                        <button type="button" className="help-primary-button" onClick={() => setShowInstallGuide(false)}>
                            <CheckCircle2 size={17} /> Got it
                        </button>
                    </section>
                </div>
            )}

            <header className="help-hero">
                <div className="help-hero-copy">
                    <div className="help-eyebrow"><HelpCircle size={15} /> RESTROBABA HELP CENTER</div>
                    <h1>How can we help?</h1>
                    <p>Find quick answers, learn the essentials, and get your restaurant running smoothly.</p>
                    <label className="help-search">
                        <Search size={20} aria-hidden="true" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search guides and frequently asked questions"
                            aria-label="Search help guides and frequently asked questions"
                        />
                        {searchQuery && (
                            <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search">
                                <X size={17} />
                            </button>
                        )}
                    </label>
                </div>
                <div className="help-hero-art" aria-hidden="true">
                    <div className="help-hero-orbit"><LifeBuoy size={74} strokeWidth={1.2} /></div>
                    <span className="help-art-dot help-art-dot-one" />
                    <span className="help-art-dot help-art-dot-two" />
                </div>
                <div className="help-hero-footer">
                    <span><BookOpen size={15} /> {guides.length} quick-start guides</span>
                    <span><MessageCircle size={15} /> {faqs.length} answers</span>
                </div>
            </header>

            <nav className="help-topics" aria-label="Help topics">
                <span className="help-topics-label">Browse topics</span>
                <div className="help-topic-list">
                    {topics.map((topic) => (
                        <button
                            type="button"
                            key={topic}
                            className={`help-topic${activeTopic === topic ? ' active' : ''}`}
                            onClick={() => {
                                setActiveTopic(topic);
                                setOpenFaq(null);
                            }}
                            aria-pressed={activeTopic === topic}
                        >
                            {topic}
                        </button>
                    ))}
                </div>
            </nav>

            {filteredGuides.length > 0 && (
                <section className="help-section">
                    <div className="help-section-heading">
                        <div className="help-section-icon"><BookOpen size={19} /></div>
                        <div>
                            <h2>Quick-start guides</h2>
                            <p>Simple steps for everyday restaurant tasks.</p>
                        </div>
                    </div>
                    <div className="help-guide-grid">
                        {filteredGuides.map((guide, index) => {
                            const Icon = guide.icon;
                            return (
                                <article className="help-guide-card" key={guide.id} style={{ animationDelay: `${index * 45}ms` }}>
                                    <div className="help-guide-card-top">
                                        <span className="help-guide-icon"><Icon size={20} /></span>
                                        <span className="help-guide-step-count">{guide.steps.length} steps</span>
                                    </div>
                                    <h3>{guide.title}</h3>
                                    <p className="help-guide-description">{guide.description}</p>
                                    <ol>
                                        {guide.steps.map((step) => <li key={step}>{step}</li>)}
                                    </ol>
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}

            <div className="help-content-grid">
                <section className="help-section help-faq-section">
                    <div className="help-section-heading">
                        <div className="help-section-icon"><MessageCircle size={19} /></div>
                        <div>
                            <h2>Frequently asked questions</h2>
                            <p>Practical answers to common questions.</p>
                        </div>
                        <span className="help-result-count">{filteredFaqs.length}</span>
                    </div>

                    {filteredFaqs.length > 0 ? (
                        <div className="help-faq-list">
                            {filteredFaqs.map((faq) => {
                                const isOpen = openFaq === faq.id;
                                const answerId = `help-answer-${faq.id}`;
                                return (
                                    <article className={`help-faq-item${isOpen ? ' open' : ''}`} key={faq.id}>
                                        <button
                                            type="button"
                                            className="help-faq-question"
                                            onClick={() => toggleFaq(faq.id)}
                                            aria-expanded={isOpen}
                                            aria-controls={answerId}
                                        >
                                            <span className="help-faq-question-copy">
                                                <span className="help-faq-category">{faq.category}</span>
                                                <span className="help-faq-title">{faq.question}</span>
                                            </span>
                                            <span className="help-faq-chevron"><ChevronDown size={18} /></span>
                                        </button>
                                        {isOpen && (
                                            <div className="help-faq-answer" id={answerId}>
                                                {faq.answer}
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="help-empty-state">
                            <Search size={25} />
                            <h3>No matching questions</h3>
                            <p>Try another search or browse the guides above.</p>
                            <button type="button" className="help-text-button" onClick={() => { setSearchQuery(''); setActiveTopic('All topics'); }}>
                                Clear filters <ArrowRight size={15} />
                            </button>
                        </div>
                    )}
                </section>

                <aside className="help-sidebar">
                    <section className="help-support-card">
                        <div className="help-support-icon"><LifeBuoy size={22} /></div>
                        <span className="help-eyebrow">HERE FOR YOU</span>
                        <h2>Need a hand?</h2>
                        <p>Talk to our support team and get help with your setup or daily workflow.</p>
                        <div className="help-support-actions">
                            <a className="help-contact-button whatsapp" href="https://wa.me/9779765231402" target="_blank" rel="noopener noreferrer">
                                <MessageCircle size={17} /> Chat on WhatsApp <ArrowRight size={15} />
                            </a>
                            <a className="help-contact-button" href="tel:9765231402">
                                <Phone size={17} /> Call support
                            </a>
                            <a className="help-contact-link" href="mailto:farooque12.alam@gmail.com">
                                <Mail size={16} /> Email support
                            </a>
                        </div>
                    </section>

                    <section className="help-install-card">
                        <div className="help-aside-heading">
                            <span className="help-aside-icon"><Smartphone size={18} /></span>
                            <h3>Install RestroBaba</h3>
                        </div>
                        <p>Add it to your device for faster access during a busy shift.</p>
                        <button type="button" className="help-secondary-button" onClick={() => setShowInstallGuide(true)}>
                            View install guide <ArrowRight size={16} />
                        </button>
                    </section>

                    <section className="help-tip-card">
                        <div className="help-aside-heading">
                            <span className="help-aside-icon"><AlertCircle size={18} /></span>
                            <h3>Quick troubleshooting</h3>
                        </div>
                        <div className="help-tip">
                            <strong>Page not loading?</strong>
                            <span>Refresh the page and check that your internet connection is stable.</span>
                        </div>
                        <div className="help-tip">
                            <strong>Print dialog not opening?</strong>
                            <span>Allow pop-ups for this site, then try printing again.</span>
                        </div>
                    </section>
                </aside>
            </div>

        </div>
    );
};

export default HelpPage;
