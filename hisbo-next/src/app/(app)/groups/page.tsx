'use client';

import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { fmt, paise, gShares, gDues, gNet, NOW } from '@/lib/state/calculations';
import { Group, GroupExpense } from '@/types/state';

export default function GroupsPage() {
  const {
    state,
    addGroup,
    addSharedExpense,
    toggleGroupExpensePaid,
    markAllGroupDuesSettled,
    deleteGroup,
    deleteSharedExpense,
    saveMemberPhone,
    setActiveGroup,
    showToast,
  } = useApp();

  const groups = state.groups || [];
  const currentGroupId = state.gid || groups[0]?.id || '';
  const currentGroup = groups.find((g) => g.id === currentGroupId) || groups[0] || null;

  // New Group Modal
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState('');

  // Add Shared Expense Form state
  const [expDesc, setExpDesc] = useState('');
  const [expAmt, setExpAmt] = useState('');
  const [expPayer, setExpPayer] = useState(0);
  const [expWith, setExpWith] = useState<number[]>([]);

  // Phone Modal
  const [editingPhoneMember, setEditingPhoneMember] = useState<{ index: number; name: string } | null>(null);
  const [phoneInput, setPhoneInput] = useState('');

  // Delete Confirmations
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<GroupExpense | null>(null);

  // Initialize split members when group changes
  React.useEffect(() => {
    if (currentGroup) {
      setExpWith(currentGroup.members.map((_, i) => i));
      setExpPayer(0);
    }
  }, [currentGroup?.id, currentGroup?.members.length]);

  // Group calculations
  const dues = useMemo(() => (currentGroup ? gDues(currentGroup) : []), [currentGroup]);
  const pendingDues = useMemo(() => dues.filter((d) => !d.done), [dues]);
  const collectDues = useMemo(() => pendingDues.filter((d) => d.to === 0), [pendingDues]);
  const payDues = useMemo(() => pendingDues.filter((d) => d.from === 0), [pendingDues]);
  const netBalances = useMemo(() => (currentGroup ? gNet(currentGroup) : []), [currentGroup]);

  const totalGroupSpend = useMemo(
    () => (currentGroup ? currentGroup.exps.reduce((sum, e) => sum + e.amt, 0) : 0),
    [currentGroup]
  );

  const totalCollect = useMemo(
    () => collectDues.reduce((sum, d) => sum + d.amt, 0),
    [collectDues]
  );
  const totalPay = useMemo(
    () => payDues.reduce((sum, d) => sum + d.amt, 0),
    [payDues]
  );

  // Member paid totals
  const memberPaidTotals = useMemo(() => {
    if (!currentGroup) return [];
    return currentGroup.members.map((_, i) =>
      currentGroup.exps.filter((e) => e.payer === i).reduce((sum, e) => sum + e.amt, 0)
    );
  }, [currentGroup]);

  // Real-time split preview calculation
  const splitPreview = useMemo(() => {
    if (!currentGroup) return null;
    const amtPaise = paise(expAmt);
    if (amtPaise <= 0 || !expWith.length) return null;

    const shares = gShares({
      id: '',
      desc: '',
      date: '',
      amt: amtPaise,
      payer: expPayer,
      with: expWith,
    });

    const debtors = expWith.filter((m) => m !== expPayer);
    const payerName = currentGroup.members[expPayer] || 'Payer';

    return {
      amtPaise,
      count: expWith.length,
      debtorsText: debtors.map(
        (m) => `${currentGroup.members[m]} owes ${payerName} ${fmt(shares[m] || 0, state.hide)}`
      ),
      payerShare: expWith.includes(expPayer)
        ? `${payerName} covers their own share of ${fmt(shares[expPayer] || 0, state.hide)}.`
        : null,
    };
  }, [currentGroup, expAmt, expPayer, expWith, state.hide]);

  // Group share WhatsApp summary link
  const getWhatsAppShareUrl = () => {
    if (!currentGroup) return '';
    const pending = dues.filter((d) => !d.done);
    const summaryMap: Record<string, number> = {};

    pending.forEach((d) => {
      const key = `${d.from}-${d.to}`;
      summaryMap[key] = (summaryMap[key] || 0) + d.amt;
    });

    const lines = Object.keys(summaryMap).map((key) => {
      const [from, to] = key.split('-').map(Number);
      return `${currentGroup.members[from]} owes ${currentGroup.members[to]} ${fmt(summaryMap[key], state.hide)}`;
    });

    const text = `Hisbo - ${currentGroup.name}\n${lines.join('\n') || 'All settled up'}\nTotal group spend: ${fmt(
      totalGroupSpend,
      state.hide
    )}`;

    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  // WhatsApp reminder message generator
  const handleRemindMember = (memberIdx: number) => {
    if (!currentGroup) return;
    const memberName = currentGroup.members[memberIdx];
    const memberPhone = currentGroup.phones?.[memberIdx];

    if (!memberPhone) {
      setEditingPhoneMember({ index: memberIdx, name: memberName });
      setPhoneInput('');
      return;
    }

    const memberDues = dues.filter((d) => !d.done && d.from === memberIdx && d.to === 0);
    if (!memberDues.length) return;

    const myName = currentGroup.members[0] || 'Me';
    const lines = memberDues.map((d) => `- ${d.desc} (${d.date}): ${fmt(d.amt, state.hide)}`);
    const totalDue = memberDues.reduce((sum, d) => sum + d.amt, 0);

    const message = `Hi ${memberName}, a quick reminder from ${myName} (${currentGroup.name}):\n${lines.join(
      '\n'
    )}\nTotal: ${fmt(totalDue, state.hide)}\nPlease send it when you can. Thanks!`;

    window.open(`https://wa.me/${memberPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Create group handler
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newGroupName.trim();
    if (!trimmedName) {
      showToast('Enter a group name.', 'err');
      return;
    }
    const rawMembers = newGroupMembers
      .split(',')
      .map((x) => x.trim().replace(/\s+/g, ' '))
      .filter(Boolean);

    if (!rawMembers.length) {
      showToast('Add at least one other member.', 'err');
      return;
    }
    if (rawMembers.length > 9) {
      showToast('A group can have up to 10 members, including you.', 'err');
      return;
    }

    const PN = /^\p{L}[\p{L} .'-]*$/u;
    const myName = state.name || 'You';
    const seen = new Set([myName.toLowerCase()]);

    for (const m of rawMembers) {
      if (m.length > 24 || !PN.test(m)) {
        showToast(`"${m.slice(0, 24)}" is not a valid name. Use letters only.`, 'err');
        return;
      }
      if (seen.has(m.toLowerCase())) {
        showToast(`Each member needs a different name ("${m}" is repeated).`, 'err');
        return;
      }
      seen.add(m.toLowerCase());
    }

    addGroup(trimmedName, [myName, ...rawMembers]);
    setNewGroupName('');
    setNewGroupMembers('');
    setShowNewGroupModal(false);
  };

  // Add shared expense handler
  const handleAddSharedExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGroup) return;

    const trimmedDesc = expDesc.trim();
    if (!trimmedDesc) {
      showToast('Enter what the expense was for.', 'err');
      return;
    }
    const amtPaise = paise(expAmt);
    if (amtPaise <= 0) {
      showToast('Enter an amount greater than ₹0.', 'err');
      return;
    }
    if (!expWith.length) {
      showToast('Select at least one person to split with.', 'err');
      return;
    }

    addSharedExpense(currentGroup.id, {
      desc: trimmedDesc,
      amt: amtPaise,
      payer: expPayer,
      with: expWith,
    });

    setExpDesc('');
    setExpAmt('');
  };

  const handleSavePhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGroup || !editingPhoneMember) return;

    const raw = phoneInput.trim();
    let digits = raw.replace(/\D/g, '');
    if (digits.length === 10) digits = '91' + digits;

    if (!raw || digits.length < 11 || digits.length > 15) {
      showToast('Enter a valid phone number: 10 digits, or include country code.', 'err');
      return;
    }

    saveMemberPhone(currentGroup.id, editingPhoneMember.index, digits);
    setEditingPhoneMember(null);
    setPhoneInput('');
  };

  // Debtor groups for "To collect from others"
  const collectByMember = useMemo(() => {
    const debtors = Array.from(new Set(collectDues.map((d) => d.from)));
    return debtors.map((m) => {
      const items = collectDues.filter((d) => d.from === m);
      const total = items.reduce((sum, d) => sum + d.amt, 0);
      return { memberIdx: m, items, total };
    });
  }, [collectDues]);

  // Creditor groups for "You need to pay"
  const payByMember = useMemo(() => {
    const creditors = Array.from(new Set(payDues.map((d) => d.to)));
    return creditors.map((m) => {
      const items = payDues.filter((d) => d.to === m);
      const total = items.reduce((sum, d) => sum + d.amt, 0);
      return { memberIdx: m, items, total };
    });
  }, [payDues]);

  return (
    <div>
      {/* Group Selector Header Card */}
      <div className="card" style={{ marginBottom: '14px' }}>
        <h2>Groups</h2>
        <div className="row">
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              className={currentGroup && currentGroup.id === g.id ? 'b' : 'chip'}
              style={{ flex: 'none', padding: '9px 14px' }}
              onClick={() => setActiveGroup(g.id)}
            >
              {g.name}
            </button>
          ))}
          <button
            type="button"
            className="chip"
            style={{ fontWeight: 600 }}
            onClick={() => setShowNewGroupModal(true)}
          >
            + New group
          </button>
        </div>
      </div>

      {!currentGroup ? (
        <div className="card empty">
          Split costs with roommates, hostel mates or travel friends. Create your first group to begin.
        </div>
      ) : (
        <>
          {/* Group Overview Card */}
          <div className="card" style={{ marginBottom: '14px' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>{currentGroup.name}</h2>
              <span className="mut">
                {currentGroup.members.length} members &middot; {fmt(totalGroupSpend, state.hide)} total spend
              </span>
            </div>

            <div className="tl" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '12px 0' }}>
              <div style={{ padding: '12px', borderRadius: '14px', background: 'var(--bg)' }}>
                <span className="mut" style={{ fontSize: '0.85rem' }}>You will collect</span>
                <b style={{ display: 'block', fontSize: '1.3rem', color: 'var(--ok)' }}>
                  {fmt(totalCollect, state.hide)}
                </b>
              </div>
              <div style={{ padding: '12px', borderRadius: '14px', background: 'var(--bg)' }}>
                <span className="mut" style={{ fontSize: '0.85rem' }}>You need to pay</span>
                <b style={{ display: 'block', fontSize: '1.3rem', color: 'var(--bad)' }}>
                  {fmt(totalPay, state.hide)}
                </b>
              </div>
            </div>

            <div>
              {currentGroup.members.map((m, i) => {
                const net = netBalances[i] || 0;
                const phone = currentGroup.phones?.[i];

                return (
                  <div key={i} className="li">
                    <div>
                      <b>{m}</b>
                      <div className="mut">Paid {fmt(memberPaidTotals[i] || 0, state.hide)} so far</div>
                      {i !== 0 && (
                        <button
                          type="button"
                          className="g"
                          style={{ marginTop: '6px' }}
                          onClick={() => {
                            setEditingPhoneMember({ index: i, name: m });
                            setPhoneInput(phone || '');
                          }}
                        >
                          {phone ? `WhatsApp: +${phone} (edit)` : 'Add WhatsApp number'}
                        </button>
                      )}
                    </div>

                    <span
                      className="amt"
                      style={{
                        color: net > 0 ? 'var(--ok)' : net < 0 ? 'var(--bad)' : 'var(--mut)',
                      }}
                    >
                      {net > 0 ? `gets back ${fmt(net, state.hide)}` : net < 0 ? `owes ${fmt(-net, state.hide)}` : 'settled'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="row" style={{ marginTop: '12px' }}>
              <a
                className="g"
                target="_blank"
                rel="noopener noreferrer"
                href={getWhatsAppShareUrl()}
              >
                Share summary on WhatsApp
              </a>
            </div>
          </div>

          {/* To Collect From Others Card */}
          <div className="card" style={{ marginBottom: '14px' }}>
            <h2>To collect from others</h2>
            {collectByMember.length ? (
              collectByMember.map((grp) => (
                <div key={grp.memberIdx} className="dg" style={{ border: '1px solid var(--line)', borderRadius: '14px', padding: '4px 12px', margin: '8px 0' }}>
                  <div className="li" style={{ border: 0 }}>
                    <b>{currentGroup.members[grp.memberIdx]}</b>
                    <div className="row">
                      <span className="amt">{fmt(grp.total, state.hide)}</span>
                      <button
                        type="button"
                        className="g"
                        onClick={() => handleRemindMember(grp.memberIdx)}
                      >
                        Remind on WhatsApp
                      </button>
                      {grp.items.length > 1 && (
                        <button
                          type="button"
                          className="g"
                          onClick={() => markAllGroupDuesSettled(currentGroup.id, grp.memberIdx, 0)}
                        >
                          Mark received all
                        </button>
                      )}
                    </div>
                  </div>

                  {grp.items.map((d) => (
                    <div key={d.id} className="li sub" style={{ padding: '8px 0 8px 10px', borderTop: '1px dashed var(--line)' }}>
                      <div>
                        {d.desc}
                        <div className="mut">{d.date}</div>
                      </div>
                      <div className="row" style={{ flexWrap: 'nowrap' }}>
                        <span className="amt">{fmt(d.amt, state.hide)}</span>
                        <button
                          type="button"
                          className="g"
                          onClick={() => toggleGroupExpensePaid(currentGroup.id, d.id, d.from)}
                        >
                          Mark received
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <div className="empty">Nobody owes you anything right now.</div>
            )}
          </div>

          {/* You Need to Pay Card */}
          {payByMember.length > 0 && (
            <div className="card" style={{ marginBottom: '14px' }}>
              <h2>You need to pay</h2>
              {payByMember.map((grp) => (
                <div key={grp.memberIdx} className="dg" style={{ border: '1px solid var(--line)', borderRadius: '14px', padding: '4px 12px', margin: '8px 0' }}>
                  <div className="li" style={{ border: 0 }}>
                    <b>{currentGroup.members[grp.memberIdx]}</b>
                    <div className="row">
                      <span className="amt">{fmt(grp.total, state.hide)}</span>
                      {grp.items.length > 1 && (
                        <button
                          type="button"
                          className="g"
                          onClick={() => markAllGroupDuesSettled(currentGroup.id, 0, grp.memberIdx)}
                        >
                          Mark paid all
                        </button>
                      )}
                    </div>
                  </div>

                  {grp.items.map((d) => (
                    <div key={d.id} className="li sub" style={{ padding: '8px 0 8px 10px', borderTop: '1px dashed var(--line)' }}>
                      <div>
                        {d.desc}
                        <div className="mut">{d.date}</div>
                      </div>
                      <div className="row" style={{ flexWrap: 'nowrap' }}>
                        <span className="amt">{fmt(d.amt, state.hide)}</span>
                        <button
                          type="button"
                          className="g"
                          onClick={() => toggleGroupExpensePaid(currentGroup.id, d.id, d.from)}
                        >
                          Mark paid
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Add Shared Expense Form Card */}
          <div className="card" style={{ marginBottom: '14px' }}>
            <h2>Add shared expense</h2>
            <form onSubmit={handleAddSharedExpense}>
              <div className="row">
                <input
                  id="gd"
                  type="text"
                  placeholder="What was it for? (e.g. Dinner order)"
                  maxLength={40}
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  required
                />
                <input
                  id="ga"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount ₹"
                  inputMode="decimal"
                  value={expAmt}
                  onChange={(e) => setExpAmt(e.target.value)}
                  required
                />
                <select
                  id="gp"
                  value={expPayer}
                  onChange={(e) => setExpPayer(parseInt(e.target.value, 10))}
                  aria-label="Who paid"
                >
                  {currentGroup.members.map((m, i) => (
                    <option key={i} value={i}>
                      {m} paid
                    </option>
                  ))}
                </select>
              </div>

              <div className="row" style={{ marginTop: '10px' }}>
                <span className="mut" style={{ fontSize: '0.85rem' }}>
                  Split between:
                </span>
                {currentGroup.members.map((m, i) => {
                  const isChecked = expWith.includes(i);
                  return (
                    <label
                      key={i}
                      className="chip"
                      style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExpWith([...expWith, i]);
                          } else {
                            setExpWith(expWith.filter((x) => x !== i));
                          }
                        }}
                        style={{ width: '16px', height: '16px', flex: 'none', padding: 0 }}
                      />
                      {m}
                    </label>
                  );
                })}
              </div>

              {splitPreview && (
                <div
                  className="pv"
                  style={{
                    display: 'block',
                    marginTop: '10px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'color-mix(in srgb, var(--acc) 10%, transparent)',
                    fontSize: '0.88rem',
                    lineHeight: '1.6',
                  }}
                >
                  <b>
                    {fmt(splitPreview.amtPaise, state.hide)} split between {splitPreview.count}{' '}
                    {splitPreview.count > 1 ? 'people' : 'person'}
                  </b>
                  <br />
                  {splitPreview.debtorsText.length ? (
                    splitPreview.debtorsText.map((t, idx) => (
                      <React.Fragment key={idx}>
                        {t}
                        <br />
                      </React.Fragment>
                    ))
                  ) : (
                    <span>No one owes anything.</span>
                  )}
                  {splitPreview.payerShare && (
                    <span className="mut">{splitPreview.payerShare}</span>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="b"
                style={{ marginTop: '12px', width: '100%' }}
              >
                Add expense
              </button>
            </form>
          </div>

          {/* All Group Expenses List Card */}
          <div className="card">
            <h2>All expenses</h2>
            {currentGroup.exps.length ? (
              [...currentGroup.exps].reverse().map((e) => {
                const shares = gShares(e);
                const payerName = currentGroup.members[e.payer] || 'Payer';

                return (
                  <div key={e.id} className="li" style={{ alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <b>{e.desc}</b>
                      <div className="mut">
                        {e.date} &middot; {payerName} paid &middot; {e.with.length} people
                      </div>

                      <div className="row" style={{ marginTop: '6px' }}>
                        {e.with
                          .filter((m) => m !== e.payer)
                          .map((m) => {
                            const isPaid = !!(e.paid && e.paid[m]);
                            const memberName = currentGroup.members[m];
                            const shareAmt = shares[m] || 0;

                            return (
                              <button
                                key={m}
                                type="button"
                                className={`chip st ${isPaid ? 'ok' : ''}`}
                                onClick={() => toggleGroupExpensePaid(currentGroup.id, e.id, m)}
                              >
                                {memberName} {fmt(shareAmt, state.hide)} &middot;{' '}
                                {isPaid ? 'Received ✓' : 'Pending'}
                              </button>
                            );
                          })}
                      </div>
                    </div>

                    <div className="row" style={{ flexWrap: 'nowrap' }}>
                      <span className="amt">{fmt(e.amt, state.hide)}</span>
                      <button
                        type="button"
                        className="g"
                        onClick={() => setExpenseToDelete(e)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty">No shared expenses yet.</div>
            )}

            {currentGroup.exps.length > 0 && (
              <div className="note" style={{ marginTop: '8px' }}>
                Tap a name to switch between pending and received.
              </div>
            )}

            <div className="row" style={{ marginTop: '14px' }}>
              <button
                type="button"
                className="g"
                style={{ color: 'var(--bad)' }}
                onClick={() => setShowDeleteGroupModal(true)}
              >
                Delete group
              </button>
            </div>
          </div>
        </>
      )}

      {/* New Group Modal */}
      {showNewGroupModal && (
        <div
          className="mod"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowNewGroupModal(false);
          }}
        >
          <div className="box" role="dialog" aria-modal="true" aria-label="Create a group">
            <div className="nm">
              <h2>Create a group</h2>
              <p className="mut" style={{ textAlign: 'center' }}>
                For roommates, hostel mates, trips or any shared expenses.
              </p>
              <form onSubmit={handleCreateGroup} style={{ width: '100%' }}>
                <label className="lbl" htmlFor="gnm">
                  Group name
                </label>
                <input
                  id="gnm"
                  type="text"
                  placeholder="e.g. Flat 302"
                  maxLength={30}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                />

                <label className="lbl" htmlFor="gmm">
                  Other members (separate with commas)
                </label>
                <input
                  id="gmm"
                  type="text"
                  placeholder="e.g. Aman, Karan, Riya"
                  value={newGroupMembers}
                  onChange={(e) => setNewGroupMembers(e.target.value)}
                  required
                />

                <button type="submit" className="b">
                  Create group
                </button>
                <button
                  type="button"
                  className="g"
                  onClick={() => setShowNewGroupModal(false)}
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit WhatsApp Number Modal */}
      {editingPhoneMember && (
        <div
          className="mod"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingPhoneMember(null);
          }}
        >
          <div className="box" role="dialog" aria-modal="true" aria-label="WhatsApp Number">
            <div className="nm">
              <h2>{editingPhoneMember.name}&apos;s WhatsApp number</h2>
              <p className="mut" style={{ textAlign: 'center' }}>
                Used only to open a WhatsApp chat with a payment reminder. It stays on this device.
              </p>
              <form onSubmit={handleSavePhone} style={{ width: '100%' }}>
                <label className="lbl" htmlFor="pn">
                  WhatsApp number
                </label>
                <input
                  id="pn"
                  type="tel"
                  inputMode="tel"
                  placeholder="e.g. 9876543210"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  required
                />
                <button type="submit" className="b">
                  Save number
                </button>
                <button
                  type="button"
                  className="g"
                  onClick={() => setEditingPhoneMember(null)}
                >
                  Cancel
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Modal */}
      {showDeleteGroupModal && currentGroup && (
        <div
          className="mod"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeleteGroupModal(false);
          }}
        >
          <div className="box" role="dialog" aria-modal="true" aria-label="Delete group">
            <div className="nm">
              <div className="av bad">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
              </div>
              <h2>Delete group &quot;{currentGroup.name}&quot;?</h2>
              <p className="mut" style={{ textAlign: 'center' }}>
                This will delete the group and all its shared expenses.
                <br />
                This cannot be undone.
              </p>
              <button
                type="button"
                className="b dng"
                onClick={() => {
                  deleteGroup(currentGroup.id);
                  setShowDeleteGroupModal(false);
                }}
              >
                Delete group
              </button>
              <button
                type="button"
                className="g"
                onClick={() => setShowDeleteGroupModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Shared Expense Modal */}
      {expenseToDelete && currentGroup && (
        <div
          className="mod"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExpenseToDelete(null);
          }}
        >
          <div className="box" role="dialog" aria-modal="true" aria-label="Delete shared expense">
            <div className="nm">
              <div className="av bad">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                </svg>
              </div>
              <h2>Delete this shared expense?</h2>
              <p className="mut" style={{ textAlign: 'center' }}>
                <b>{expenseToDelete.desc}</b> &middot; {fmt(expenseToDelete.amt, state.hide)}
                <br />
                This cannot be undone.
              </p>
              <button
                type="button"
                className="b dng"
                onClick={() => {
                  deleteSharedExpense(currentGroup.id, expenseToDelete.id);
                  setExpenseToDelete(null);
                }}
              >
                Delete
              </button>
              <button
                type="button"
                className="g"
                onClick={() => setExpenseToDelete(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
