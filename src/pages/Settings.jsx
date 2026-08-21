import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dbService } from '../db';

export default function Settings() {
  const { user, logoutUser } = useApp();
  const [activeSubTab, setActiveSubTab] = useState(null); // null (menu), 'profile', 'about', 'support'
  const [isEditing, setIsEditing] = useState(false);

  // Profile Details State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Change Password State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Support Form State
  const [supportSubject, setSupportSubject] = useState('');
  const [supportType, setSupportType] = useState('General Inquiry');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [ticketId, setTicketId] = useState('');

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setProfileLoading(true);

    try {
      await dbService.auth.updateProfile(profileName);
      setProfileSuccess('Profile updated successfully! Refreshing details...');
      setIsEditing(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      await dbService.auth.updatePassword(newPassword);
      setPasswordSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    setSupportLoading(true);
    // Simulate support ticket creation
    setTimeout(() => {
      const generatedId = 'CB-' + Math.floor(100000 + Math.random() * 900000);
      setTicketId(generatedId);
      setSupportSuccess(true);
      setSupportLoading(false);
      setSupportSubject('');
      setSupportMessage('');
    }, 800);
  };

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const renderProfile = () => {
    return (
      <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>

        <div className="flex justify-between items-center mb-6 border-b border-outline-variant/30 pb-3 relative z-10">
          <div>
            <h2 className="font-headline-lg text-title-md font-bold text-on-surface flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-[20px]">person</span>
              Profile Details
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Manage your personal information and security details.</p>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold rounded-lg transition-all shadow-sm border border-primary/20"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Edit Profile
            </button>
          )}
        </div>

        {profileError && (
          <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {profileError}
          </div>
        )}
        {profileSuccess && (
          <div className="mb-4 p-3 bg-primary-container text-on-primary-container rounded-xl text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {profileSuccess}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-6 text-xs max-w-2xl relative z-10">
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div className={`relative shrink-0 ${isEditing ? 'group cursor-pointer' : ''}`}>
              <img
                alt="Profile"
                className={`w-24 h-24 rounded-full object-cover ring-4 ring-surface-container-high shadow-md transition-transform duration-300 ${
                  isEditing ? 'group-hover:scale-105' : ''
                }`}
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"
              />
              {isEditing && (
                <div className="absolute inset-0 bg-on-surface/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="material-symbols-outlined text-on-primary text-[24px]">photo_camera</span>
                </div>
              )}
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-title-md text-body-md font-bold text-on-surface">{user?.name}</h3>
              <p className="text-on-surface-variant text-[11px] mb-2">{user?.email}</p>
              {isEditing && (
                <button type="button" className="text-primary font-semibold hover:underline text-xs">Change Photo</button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-on-surface-variant uppercase tracking-wider text-[10px] mb-2">Full Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                readOnly={!isEditing}
                className={`w-full rounded-xl py-2.5 px-4 outline-none transition-all ${
                  isEditing
                    ? 'bg-surface border border-outline-variant focus:ring-2 focus:ring-primary focus:border-transparent'
                    : 'bg-surface-container border border-transparent cursor-default opacity-80 text-on-surface-variant'
                }`}
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-on-surface-variant uppercase tracking-wider text-[10px] mb-2">Email Address</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-surface-container border border-outline-variant rounded-xl py-2.5 px-4 outline-none opacity-60 cursor-not-allowed text-on-surface-variant"
              />
              <p className="text-on-surface-variant text-[10px] mt-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px] text-primary">verified</span>
                Primary login method
              </p>
            </div>
          </div>

          {isEditing ? (
            <div className="flex justify-end gap-3 pt-2 border-b border-outline-variant/30 pb-6">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setProfileName(user?.name || '');
                  setProfileSuccess('');
                  setProfileError('');
                }}
                className="border border-outline-variant text-on-surface hover:bg-surface-container-low font-semibold text-xs px-5 py-2.5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={profileLoading}
                className="bg-primary text-on-primary font-semibold text-xs px-5 py-2.5 rounded-xl hover:bg-primary-container hover:text-on-primary-container shadow transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">save</span>
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center pt-2 border-b border-outline-variant/30 pb-6">
              <button
                type="button"
                onClick={logoutUser}
                className="border border-error/30 text-error hover:bg-error/5 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </form>

        {/* Security Section */}
        <div className="pt-6 text-xs max-w-2xl">
          <h3 className="font-title-md text-body-md font-bold text-on-surface mb-1">Security & Password</h3>
          <p className="font-body-sm text-[11px] text-on-surface-variant mb-4">Manage password updates to safeguard your cash records.</p>

          {showPasswordForm ? (
            <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md bg-surface p-4 rounded-xl border border-outline-variant/30">
              {passwordError && (
                <div className="p-3 bg-error-container text-on-error-container rounded-xl text-[11px] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-primary-container text-on-primary-container rounded-xl text-[11px] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {passwordSuccess}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface-variant text-[10px] uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-primary transition-all text-xs"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-on-surface-variant text-[10px] uppercase tracking-wider">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-surface-container-lowest border border-outline-variant rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-primary transition-all text-xs"
                  required
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="bg-primary text-on-primary font-semibold text-xs px-4 py-2 rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  {passwordLoading ? 'Saving...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPasswordForm(false); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); }}
                  className="border border-outline-variant text-on-surface font-semibold text-xs px-4 py-2 rounded-lg hover:bg-surface-container-low transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="bg-surface-container text-on-surface font-semibold text-xs px-4 py-2.5 rounded-xl hover:bg-surface-container-high transition-all flex items-center gap-1.5 shadow-sm border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[16px]">key</span>
              Change Password
            </button>
          )}
        </div>
      </section>
    );
  };

  const renderAbout = () => {
    const features = [
      { icon: 'account_balance_wallet', title: 'Multi-Ledger Management', desc: 'Maintain multiple business, office, or personal ledger books with ease.' },
      { icon: 'history', title: 'Real-time Audit Trail', desc: 'Every transaction entry, rename, or update creates a logged action in activity logs.' },
      { icon: 'analytics', title: 'Interactive Analytics', desc: 'Instantly view visual breakdowns of cash in/out flows and category distributions.' },
      { icon: 'verified_user', title: 'Access Role Control', desc: 'Collaborate with precise permissions: Owner, Editor, or Viewer roles.' }
    ];

    return (
      <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>

        <div className="mb-6 relative z-10">
          <h2 className="font-headline-lg text-title-md font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-2 mb-2">
            <span className="material-symbols-outlined text-primary text-[20px]">info</span>
            About CashBook
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Information about the application, version, and architecture.</p>
        </div>

        <div className="space-y-6 text-xs max-w-3xl relative z-10">
          {/* Logo & Description */}
          <div className="flex flex-col md:flex-row gap-6 items-start bg-surface-container-low/40 p-5 rounded-2xl border border-outline-variant/20">
            <div className="bg-primary/10 text-primary p-4 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-primary/10">
              <span className="material-symbols-outlined text-[48px]">account_balance_wallet</span>
            </div>
            <div>
              <h3 className="font-headline-lg text-title-md font-bold text-primary mb-1">CashBook App</h3>
              <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider mb-2">Premium Cashflow Management System</p>
              <p className="text-on-surface-variant leading-relaxed text-body-sm">
                CashBook is designed to help modern businesses and individuals optimize cashflow tracking, category distributions, and real-time collaboration. Crafted with clean aesthetics, micro-interactions, and secure data storage schemas.
              </p>
            </div>
          </div>

          {/* Grid Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-surface p-4 rounded-xl border border-outline-variant/30">
            <div>
              <div className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider mb-1">App Version</div>
              <div className="font-bold text-on-surface font-mono-data text-xs">v2.4.2 (Stable)</div>
            </div>
            <div>
              <div className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider mb-1">Release Channel</div>
              <div className="font-bold text-on-surface text-xs">Production</div>
            </div>
            <div>
              <div className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider mb-1">Build Target</div>
              <div className="font-bold text-on-surface text-xs font-mono-data">Web-Vite React</div>
            </div>
            <div>
              <div className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider mb-1">License</div>
              <div className="font-bold text-primary text-xs">Active Subscription</div>
            </div>
          </div>

          {/* Core Features */}
          <div>
            <h4 className="font-title-md text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-3">System Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((f, i) => (
                <div key={i} className="flex gap-3 items-start p-3 bg-surface-container-lowest border border-outline-variant/10 rounded-xl hover:border-primary/20 hover:shadow-sm transition-all duration-300">
                  <span className="material-symbols-outlined text-primary text-[20px] bg-primary/5 p-1.5 rounded-lg">{f.icon}</span>
                  <div>
                    <div className="font-bold text-on-surface mb-0.5 text-xs">{f.title}</div>
                    <div className="text-on-surface-variant text-[11px] leading-snug">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center pt-4 border-t border-outline-variant/30 text-on-surface-variant text-[10px]">
            &copy; 2026 CashBook Inc. All rights reserved. Created in partnership with Apta Skills.
          </div>
        </div>
      </section>
    );
  };

  const renderSupport = () => {
    const faqs = [
      {
        q: 'How do I add and manage multiple books?',
        a: "Navigate to the 'Cash Books' tab in the left sidebar menu. From there, you can view existing ledger books or click 'Create Book' to instantiate a new ledger. Note that each book operates with its own specific opening balances, custom category list, and transaction history."
      },
      {
        q: 'How do Ledger roles and access control work?',
        a: "CashBook features three permission roles: Owners have full control over book configuration, categories, activity logs, and renaming operations. Editors can perform day-to-day work, including transaction additions, category creations, and editing existing entries. Viewers have strict read-only permissions and cannot mutate any ledger record."
      },
      {
        q: 'How do I export cashbook statement reports?',
        a: "Go to the 'Reports' tab. Filter the ledger transactions using the header controls (date range, type, category). Once the desired list is structured, click 'Export PDF' to generate and download a print-ready formatted statement of accounts."
      }
    ];

    return (
      <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>

        <div className="mb-6 relative z-10">
          <h2 className="font-headline-lg text-title-md font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant/30 pb-2 mb-2">
            <span className="material-symbols-outlined text-primary text-[20px]">help</span>
            Help &amp; Support
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Find answers to common questions or message our help desk.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10 text-xs">
          {/* FAQ Accordion on the Left */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="font-title-md text-body-md font-bold text-on-surface mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">quiz</span>
              Frequently Asked Questions
            </h3>

            <div className="space-y-2">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={index} className="border border-outline-variant/30 rounded-xl overflow-hidden bg-surface">
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full flex items-center justify-between p-3.5 text-left font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
                    >
                      <span className="pr-4 text-xs">{faq.q}</span>
                      <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </button>
                    {isOpen && (
                      <div className="p-3.5 pt-0 text-on-surface-variant text-[11px] leading-relaxed border-t border-outline-variant/10 bg-surface-container-lowest">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl mt-4">
              <div className="font-bold text-primary mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">mail</span>
                Direct Contacts
              </div>
              <p className="text-[11px] text-on-surface-variant leading-snug">
                Email support: <strong className="text-on-surface">support@cashbook.com</strong><br />
                Operating hours: <span className="text-on-surface">Mon - Fri, 9:00 AM - 6:00 PM EST</span>
              </p>
            </div>
          </div>

          {/* Contact Support Form on the Right */}
          <div className="lg:col-span-6 bg-surface p-5 rounded-2xl border border-outline-variant/30">
            <h3 className="font-title-md text-body-md font-bold text-on-surface mb-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">support_agent</span>
              Submit a Support Ticket
            </h3>
            <p className="text-[11px] text-on-surface-variant mb-4">Send a direct message to our support agents.</p>

            {supportSuccess ? (
              <div className="bg-primary-container/30 border border-primary-container text-on-primary-container p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-primary text-xs">
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  Ticket Submitted Successfully
                </div>
                <p className="text-[11px] leading-relaxed text-on-surface-variant">
                  Thank you! Your inquiry has been registered. Ticket reference is <strong className="text-on-surface">{ticketId}</strong>. We will reply to your account email (<span className="underline">{user?.email}</span>) within 24 hours.
                </p>
                <button
                  onClick={() => setSupportSuccess(false)}
                  className="mt-2 text-xs font-semibold text-primary hover:underline"
                >
                  Submit another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div>
                  <label className="block font-semibold text-on-surface-variant uppercase tracking-wider text-[9px] mb-1.5">Inquiry Type</label>
                  <div className="relative">
                    <select
                      value={supportType}
                      onChange={(e) => setSupportType(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-primary appearance-none text-xs"
                    >
                      <option>General Inquiry</option>
                      <option>Technical Issue</option>
                      <option>Feature Request</option>
                      <option>Billing Support</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
                      expand_more
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-on-surface-variant uppercase tracking-wider text-[9px] mb-1.5">Subject</label>
                  <input
                    type="text"
                    value={supportSubject}
                    onChange={(e) => setSupportSubject(e.target.value)}
                    placeholder="Brief summary of your inquiry"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-primary text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-on-surface-variant uppercase tracking-wider text-[9px] mb-1.5">Message Details</label>
                  <textarea
                    rows={4}
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="How can we assist you today? Provide context/steps if describing a bug..."
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl py-2 px-3 outline-none focus:ring-2 focus:ring-primary text-xs resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={supportLoading}
                  className="w-full bg-primary text-on-primary font-semibold text-xs py-2.5 rounded-xl hover:bg-primary-container shadow transition-colors flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  {supportLoading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    );
  };

  if (activeSubTab === null) {
    return (
      <div className="flex flex-col w-full max-w-4xl mx-auto gap-8 px-4 py-6">
        {/* Title */}
        <div className="text-center sm:text-left select-none">
          <h1 className="font-headline-lg text-3xl font-extrabold text-on-background tracking-tight">
            Settings
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1.5">
            Configure your Profile, review app statistics, and get Help &amp; Support.
          </p>
        </div>

        {/* Main Options Menu - Stacked Vertically */}
        <div className="flex flex-col gap-4 mt-2">
          {/* Option 1: Profile */}
          <button
            onClick={() => setActiveSubTab('profile')}
            className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/45 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 group w-full gap-4"
          >
            <div className="bg-primary/10 text-primary p-3.5 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[28px]">person</span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <h3 className="font-title-md text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                Profile
              </h3>
              <p className="text-on-surface-variant text-xs leading-relaxed">
                Manage your personal information, contact email, and update password credentials.
              </p>
            </div>
            <div className="flex items-center gap-1 text-primary text-xs font-semibold group-hover:underline mt-2 sm:mt-0 shrink-0">
              Manage Profile
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </button>

          {/* Option 2: About CashBook */}
          <button
            onClick={() => setActiveSubTab('about')}
            className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/45 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 group w-full gap-4"
          >
            <div className="bg-primary/10 text-primary p-3.5 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[28px]">info</span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <h3 className="font-title-md text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                About CashBook
              </h3>
              <p className="text-on-surface-variant text-xs leading-relaxed">
                Information about the application version, release channels, and core features.
              </p>
            </div>
            <div className="flex items-center gap-1 text-primary text-xs font-semibold group-hover:underline mt-2 sm:mt-0 shrink-0">
              View App Info
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </button>

          {/* Option 3: Help & Support */}
          <button
            onClick={() => setActiveSubTab('support')}
            className="flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left bg-surface-container-lowest border border-outline-variant/30 hover:border-primary/45 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 group w-full gap-4"
          >
            <div className="bg-primary/10 text-primary p-3.5 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[28px]">help</span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <h3 className="font-title-md text-base font-bold text-on-surface group-hover:text-primary transition-colors">
                Help &amp; Support
              </h3>
              <p className="text-on-surface-variant text-xs leading-relaxed">
                Find answers to FAQs or directly submit ticket requests to our help desk.
              </p>
            </div>
            <div className="flex items-center gap-1 text-primary text-xs font-semibold group-hover:underline mt-2 sm:mt-0 shrink-0">
              Get Support
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </button>
        </div>

        {/* Separated Logout button at the bottom of options */}
        <div className="mt-8 border-t border-outline-variant/30 pt-6 flex justify-center sm:justify-start">
          <button
            onClick={logoutUser}
            className="border border-error/30 text-error hover:bg-error/5 font-semibold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            Sign Out of Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto gap-6 px-4 py-6">
      {/* Back Button Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
        <button
          onClick={() => {
            setActiveSubTab(null);
            setIsEditing(false);
          }}
          className="flex items-center gap-2 text-primary hover:bg-primary/5 font-semibold transition-all text-xs py-1.5 px-3 rounded-lg border border-primary/20 shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Settings</span>
        </button>
        <span className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider select-none bg-surface-container-high px-3 py-1 rounded-full border border-outline-variant/30">
          {activeSubTab === 'profile' ? 'Profile Details' : activeSubTab === 'about' ? 'About App' : 'Help & Support'}
        </span>
      </div>

      {/* Right Detail Panel Content */}
      <div className="w-full">
        {activeSubTab === 'profile' && renderProfile()}
        {activeSubTab === 'about' && renderAbout()}
        {activeSubTab === 'support' && renderSupport()}
      </div>
    </div>
  );
}
