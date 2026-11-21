import { fromFirestoreValue, readFirebaseConfig, toFirestoreValue } from './_config';

function sanitizeId(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
}

function getBaseFirestoreDocUrl(): string {
  const { projectId, databaseId } = readFirebaseConfig();
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(databaseId)}/documents`;
}

function decodeDoc(docJson: any): Record<string, any> | null {
  if (!docJson?.fields) return null;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(docJson.fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}

async function getDoc(col: string, docId: string): Promise<Record<string, any> | null> {
  const cleanId = sanitizeId(docId);
  if (!cleanId) return null;
  try {
    const res = await fetch(`${getBaseFirestoreDocUrl()}/${col}/${encodeURIComponent(cleanId)}`);
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    return decodeDoc(json);
  } catch {
    return null;
  }
}

async function findDocInCollection(
  col: string,
  candidates: string[],
  matcher: (d: Record<string, any>) => boolean
): Promise<{ docId: string; data: Record<string, any> } | null> {
  for (const cand of candidates) {
    const clean = sanitizeId(cand);
    if (!clean) continue;
    const found = await getDoc(col, clean);
    if (found) return { docId: clean, data: found };
  }
  try {
    const res = await fetch(`${getBaseFirestoreDocUrl()}/${col}?pageSize=120`);
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const docs = Array.isArray(json?.documents) ? json.documents : [];
    for (const d of docs) {
      const decoded = decodeDoc(d);
      if (decoded && matcher(decoded)) {
        const docId = String(d.name || '').split('/').pop() || String(decoded.id || '');
        if (docId) return { docId, data: decoded };
      }
    }
  } catch {}
  return null;
}

async function patchDoc(col: string, docId: string, fullObj: Record<string, any>): Promise<boolean> {
  const cleanId = sanitizeId(docId);
  if (!cleanId) return false;
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(fullObj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }
  try {
    const res = await fetch(`${getBaseFirestoreDocUrl()}/${col}/${encodeURIComponent(cleanId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function createTransactionDocOnce(txId: string, txObj: Record<string, any>): Promise<void> {
  const cleanId = sanitizeId(txId);
  if (!cleanId) return;
  const existing = await getDoc('transactions', cleanId);
  if (existing) return;
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries({ ...txObj, id: cleanId })) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }
  try {
    await fetch(`${getBaseFirestoreDocUrl()}/transactions?documentId=${encodeURIComponent(cleanId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
  } catch {}
}

export async function processEwiPayWebhookPayload(payload: any): Promise<{
  eventType: string;
  targetId: string;
  actionTaken: string;
}> {
  const eventType = String(payload?.event || payload?.type || '').trim().toLowerCase();
  const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload || {};

  const orderId = String(data?.orderId || data?.order_id || payload?.orderId || '').trim();
  const depId = String(data?.depositId || data?.deposit_id || data?.sessionId || '').trim();
  const wdId = String(data?.withdrawalId || data?.withdrawal_id || '').trim();
  const genericId = String(data?.id || '').trim();
  const siteUserId = String(data?.siteUserId || data?.user_id || data?.userId || '').trim();
  const payoutTrxId = String(data?.payoutTrxId || data?.payout_trx_id || data?.trxId || data?.trx_id || '').trim();
  const rejectionReason = String(
    data?.rejectionReason || data?.reason || data?.note || data?.message || ''
  ).trim();
  const userMessage = String(
    data?.userMessage || data?.user_message || 'কিছুক্ষণ পর আবার চেষ্টা করুন'
  ).trim();

  const statusLower = String(data?.status || payload?.status || '').trim().toLowerCase();
  const displayLower = String(data?.displayStatus || payload?.displayStatus || '').trim().toLowerCase();

  const isDepositApproved =
    eventType === 'deposit.approved' ||
    eventType === 'deposit.completed' ||
    ((eventType.includes('deposit') || Boolean(depId)) &&
      (statusLower === 'approved' || statusLower === 'completed' || data?.completed === true || displayLower === 'completed'));

  const isDepositRejected =
    eventType === 'deposit.rejected' ||
    ((eventType.includes('deposit') || Boolean(depId)) && (statusLower === 'rejected' || data?.rejected === true));

  const isWithdrawCompleted =
    eventType === 'withdrawal.completed' ||
    eventType === 'withdraw.completed' ||
    ((eventType.includes('withdraw') || Boolean(wdId)) &&
      (statusLower === 'completed' || statusLower === 'paid' || data?.completed === true || displayLower.includes('completed')));

  const isWithdrawRejected =
    eventType === 'withdrawal.rejected' ||
    eventType === 'withdraw.rejected' ||
    ((eventType.includes('withdraw') || Boolean(wdId)) &&
      (statusLower === 'rejected' || statusLower === 'failed' || data?.rejected === true || data?.refundRequired === true));

  const isWithdrawProcessing =
    eventType === 'withdrawal.processing' ||
    eventType === 'withdraw.processing' ||
    ((eventType.includes('withdraw') || Boolean(wdId)) && statusLower === 'processing');

  // 1. DEPOSIT APPROVED -> Idempotently credit wallet + mark deposit "approved" (Completed)
  if (isDepositApproved) {
    const depFound = await findDocInCollection(
      'deposits',
      [orderId, depId, genericId].filter(Boolean),
      (d) =>
        (Boolean(orderId) && (d.id === orderId || d.orderId === orderId || d.trxId === orderId.toUpperCase())) ||
        (Boolean(depId) && (d.id === depId || d.sessionId === depId)) ||
        (Boolean(genericId) && (d.id === genericId || d.sessionId === genericId))
    );
    if (depFound && depFound.data.status !== 'approved') {
      const dep = depFound.data;
      const depAmt = Number(dep.amount || data?.amount || 0);
      const isUsdt = String(dep.method || dep.provider || '').toUpperCase() === 'USDT';
      const bonusCredit = isUsdt ? +(depAmt * 0.02).toFixed(2) : 0;
      const totalCredit = +(depAmt + bonusCredit).toFixed(2);
      const nextDep = {
        ...dep,
        status: 'approved',
        ...(payoutTrxId ? { trxId: payoutTrxId.toUpperCase() } : {})
      };
      // Keep deposit fields <= 20 to satisfy firestore.rules isValidDeposit
      await patchDoc('deposits', depFound.docId, nextDep);

      const uTarget = String(dep.userId || siteUserId || '').trim();
      if (uTarget && totalCredit > 0) {
        const userFound = await findDocInCollection(
          'users',
          [uTarget],
          (u) => u.id === uTarget || u.uid === uTarget
        );
        if (userFound) {
          const curBal = Number(userFound.data.balance || 0);
          const nextBal = +(curBal + totalCredit).toFixed(2);
          const nextUser = {
            ...userFound.data,
            balance: nextBal,
            exp: Number(userFound.data.exp || 0) + depAmt,
            totalDeposited: +(Number(userFound.data.totalDeposited || 0) + depAmt).toFixed(2),
            turnoverRequired: +(Number(userFound.data.turnoverRequired || 0) + depAmt * 1).toFixed(2),
            updatedAt: Date.now()
          };
          await patchDoc('users', userFound.docId, nextUser);
          await createTransactionDocOnce(`tx_wh_dep_${depFound.docId}`, {
            id: `tx_wh_dep_${depFound.docId}`,
            userId: userFound.data.id || userFound.docId,
            type: 'deposit',
            title: `Deposit Completed (${dep.method || 'EWI PAY'})`,
            detail: `Order: ${dep.trxId || depFound.docId}`,
            amount: totalCredit,
            balanceAfter: nextBal,
            time: new Date().toLocaleString(),
            status: 'success',
            method: String(dep.method || 'bKash'),
            trxId: String(dep.trxId || depFound.docId)
          });
        }
      }
      return { eventType: eventType || 'deposit.approved', targetId: depFound.docId, actionTaken: 'deposit_credited_completed' };
    }
    return { eventType: eventType || 'deposit.approved', targetId: orderId || depId || genericId, actionTaken: 'already_processed_or_not_found' };
  }

  // 2. DEPOSIT REJECTED
  if (isDepositRejected) {
    const depFound = await findDocInCollection(
      'deposits',
      [orderId, depId, genericId].filter(Boolean),
      (d) =>
        (Boolean(orderId) && (d.id === orderId || d.orderId === orderId)) ||
        (Boolean(depId) && (d.id === depId || d.sessionId === depId))
    );
    if (depFound && depFound.data.status !== 'approved' && depFound.data.status !== 'rejected') {
      await patchDoc('deposits', depFound.docId, {
        ...depFound.data,
        status: 'rejected',
        adminNote: rejectionReason || 'Rejected by EWI PAY Gateway',
        ...(rejectionReason ? { rejectionReason } : {})
      });
      return { eventType: eventType || 'deposit.rejected', targetId: depFound.docId, actionTaken: 'deposit_rejected' };
    }
    return { eventType: eventType || 'deposit.rejected', targetId: orderId || depId || genericId, actionTaken: 'ignored' };
  }

  // 3. WITHDRAWAL COMPLETED -> Mark Completed & save payoutTrxId
  if (isWithdrawCompleted) {
    const wdFound = await findDocInCollection(
      'withdraws',
      [orderId, wdId, genericId].filter(Boolean),
      (w) =>
        (Boolean(orderId) && (w.id === orderId || w.orderId === orderId)) ||
        (Boolean(wdId) && (w.ewiPayWithdrawId === wdId || w.id === wdId)) ||
        (Boolean(genericId) && (w.ewiPayWithdrawId === genericId || w.id === genericId))
    );
    if (wdFound && wdFound.data.status !== 'completed') {
      const wd = wdFound.data;
      const wdAmt = Number(wd.amount || data?.amount || 0);
      await patchDoc('withdraws', wdFound.docId, {
        ...wd,
        status: 'completed',
        ...(wdId ? { ewiPayWithdrawId: wdId } : {}),
        ...(payoutTrxId ? { payoutTrxId } : {})
      });
      const uTarget = String(wd.userId || siteUserId || '').trim();
      if (uTarget && wdAmt > 0) {
        const userFound = await findDocInCollection(
          'users',
          [uTarget],
          (u) => u.id === uTarget || u.uid === uTarget
        );
        if (userFound) {
          await patchDoc('users', userFound.docId, {
            ...userFound.data,
            totalWithdrawn: +(Number(userFound.data.totalWithdrawn || 0) + wdAmt).toFixed(2),
            updatedAt: Date.now()
          });
        }
      }
      return { eventType: eventType || 'withdrawal.completed', targetId: wdFound.docId, actionTaken: 'withdrawal_completed' };
    }
    return { eventType: eventType || 'withdrawal.completed', targetId: orderId || wdId || genericId, actionTaken: 'already_completed_or_not_found' };
  }

  // 4. WITHDRAWAL REJECTED -> Refund locked amount once & store userMessage + rejectionReason
  if (isWithdrawRejected) {
    const wdFound = await findDocInCollection(
      'withdraws',
      [orderId, wdId, genericId].filter(Boolean),
      (w) =>
        (Boolean(orderId) && (w.id === orderId || w.orderId === orderId)) ||
        (Boolean(wdId) && (w.ewiPayWithdrawId === wdId || w.id === wdId)) ||
        (Boolean(genericId) && (w.ewiPayWithdrawId === genericId || w.id === genericId))
    );
    if (wdFound && wdFound.data.status !== 'rejected' && wdFound.data.status !== 'completed') {
      const wd = wdFound.data;
      const wdAmt = Number(wd.amount || data?.amount || 0);
      await patchDoc('withdraws', wdFound.docId, {
        ...wd,
        status: 'rejected',
        userMessage,
        ...(rejectionReason ? { rejectionReason } : {}),
        adminNote: rejectionReason || userMessage
      });
      const uTarget = String(wd.userId || siteUserId || '').trim();
      if (uTarget && wdAmt > 0) {
        const userFound = await findDocInCollection(
          'users',
          [uTarget],
          (u) => u.id === uTarget || u.uid === uTarget
        );
        if (userFound) {
          const nextBal = +(Number(userFound.data.balance || 0) + wdAmt).toFixed(2);
          await patchDoc('users', userFound.docId, {
            ...userFound.data,
            balance: nextBal,
            updatedAt: Date.now()
          });
          await createTransactionDocOnce(`tx_wh_wdr_${wdFound.docId}`, {
            id: `tx_wh_wdr_${wdFound.docId}`,
            userId: userFound.data.id || userFound.docId,
            type: 'withdraw',
            title: `Withdraw Rejected & Refunded (${wd.method || 'EWI PAY'})`,
            detail: rejectionReason || userMessage,
            amount: wdAmt,
            balanceAfter: nextBal,
            time: new Date().toLocaleString(),
            status: 'success',
            method: String(wd.method || 'bKash'),
            trxId: String(wd.id || wdFound.docId)
          });
        }
      }
      return { eventType: eventType || 'withdrawal.rejected', targetId: wdFound.docId, actionTaken: 'withdrawal_refunded' };
    }
    return { eventType: eventType || 'withdrawal.rejected', targetId: orderId || wdId || genericId, actionTaken: 'already_rejected_or_not_found' };
  }

  // 5. WITHDRAWAL PROCESSING
  if (isWithdrawProcessing) {
    const wdFound = await findDocInCollection(
      'withdraws',
      [orderId, wdId, genericId].filter(Boolean),
      (w) =>
        (Boolean(orderId) && (w.id === orderId || w.orderId === orderId)) ||
        (Boolean(wdId) && (w.ewiPayWithdrawId === wdId || w.id === wdId))
    );
    if (wdFound && wdFound.data.status === 'pending') {
      await patchDoc('withdraws', wdFound.docId, {
        ...wdFound.data,
        status: 'processing',
        ...(wdId ? { ewiPayWithdrawId: wdId } : {})
      });
      return { eventType: eventType || 'withdrawal.processing', targetId: wdFound.docId, actionTaken: 'withdrawal_processing' };
    }
  }

  return { eventType: eventType || 'unknown', targetId: orderId || depId || wdId || genericId, actionTaken: 'acknowledged' };
}
