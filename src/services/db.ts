import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

import {
  UserProfile,
  ServiceRequest,
  AdminLog,
  UserLog,
  LoginLog,
  AuditTrail,
  Notification,
  Department,
  Machine,
  SystemSettings
} from '../types';
import { getBrowserInfo, getDeviceInfo, getOSInfo } from '../utils/browser';

// Constants
const USERS_COLL = 'users';
const REQUESTS_COLL = 'requests';
const DEPARTMENTS_COLL = 'departments';
const MACHINES_COLL = 'machines';
const NOTIFICATIONS_COLL = 'notifications';
const ADMIN_LOGS_COLL = 'admin_logs';
const USER_LOGS_COLL = 'user_logs';
const LOGIN_LOGS_COLL = 'login_logs';
const AUDIT_TRAIL_COLL = 'audit_trail';
const SETTINGS_COLL = 'settings';

export function isLocalMode(): boolean {
  return localStorage.getItem('firebase_auth_disabled') === 'true';
}

// Local Reactive Event Listeners
const localRequestsListeners: ((requests: ServiceRequest[]) => void)[] = [];
const localUsersListeners: ((users: UserProfile[]) => void)[] = [];
const localAdminLogsListeners: ((logs: AdminLog[]) => void)[] = [];
const localUserLogsListeners: ((logs: UserLog[]) => void)[] = [];
const localNotificationsListeners: { [uid: string]: ((notifications: Notification[]) => void)[] } = {};

export function triggerLocalRequestsListeners() {
  const reqs = JSON.parse(localStorage.getItem('local_requests') || '[]');
  localRequestsListeners.forEach(cb => cb(reqs));
}

export function triggerLocalUsersListeners() {
  const users = JSON.parse(localStorage.getItem('local_users') || '[]');
  localUsersListeners.forEach(cb => cb(users));
}

export function triggerLocalAdminLogsListeners() {
  const logs = JSON.parse(localStorage.getItem('local_admin_logs') || '[]');
  localAdminLogsListeners.forEach(cb => cb(logs));
}

export function triggerLocalUserLogsListeners() {
  const logs = JSON.parse(localStorage.getItem('local_user_logs') || '[]');
  localUserLogsListeners.forEach(cb => cb(logs));
}

export function triggerLocalNotificationsListeners(uid: string) {
  const allNotifs = JSON.parse(localStorage.getItem('local_notifications') || '[]');
  const userNotifs = allNotifs.filter((n: any) => n.uid === uid);
  const listeners = localNotificationsListeners[uid];
  if (listeners) {
    listeners.forEach(cb => cb(userNotifs));
  }
}

// Helper to get client info for logs
async function getClientMetadata() {
  const browser = getBrowserInfo();
  const device = getDeviceInfo();
  const os = getOSInfo();
  
  // We can fetch user IP from public API or default
  let ip = '127.0.0.1';
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    ip = data.ip;
  } catch (e) {
    // ignore
  }

  return {
    browser: `${browser.name} ${browser.version}`,
    device,
    os,
    ipAddress: ip
  };
}

// ---------------- USER SERVICES ----------------

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (isLocalMode()) {
    const users = JSON.parse(localStorage.getItem('local_users') || '[]');
    const found = users.find((u: any) => u.uid === uid);
    return found || null;
  }
  const userRef = doc(db, USERS_COLL, uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${USERS_COLL}/${uid}`);
  }
}

export async function createUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  const now = new Date().toISOString();
  const newProfile: UserProfile = {
    uid,
    name: profile.name || 'New User',
    email: profile.email || '',
    phone: profile.phone || '',
    department: profile.department || 'Production',
    role: profile.role || 'Department User',
    status: profile.status || 'Active',
    createdAt: now,
    updatedAt: now,
  };

  if (isLocalMode()) {
    const users = JSON.parse(localStorage.getItem('local_users') || '[]');
    // Filter existing duplicates just in case
    const filtered = users.filter((u: any) => u.uid !== uid);
    filtered.push(newProfile);
    localStorage.setItem('local_users', JSON.stringify(filtered));
    triggerLocalUsersListeners();
    return;
  }

  const userRef = doc(db, USERS_COLL, uid);
  try {
    await setDoc(userRef, newProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${USERS_COLL}/${uid}`);
  }
}

export async function updateUserProfile(uid: string, profile: Partial<UserProfile>, changedByEmail?: string): Promise<void> {
  const now = new Date().toISOString();

  if (isLocalMode()) {
    const users = JSON.parse(localStorage.getItem('local_users') || '[]');
    const idx = users.findIndex((u: any) => u.uid === uid);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...profile, updatedAt: now };
      localStorage.setItem('local_users', JSON.stringify(users));
      triggerLocalUsersListeners();
    }
    if (changedByEmail) {
      await createAdminLog(
        'Update User Profile',
        'N/A',
        `UID: ${uid}`,
        JSON.stringify(profile),
        changedByEmail
      );
    }
    return;
  }

  const userRef = doc(db, USERS_COLL, uid);
  try {
    await updateDoc(userRef, {
      ...profile,
      updatedAt: now
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLL}/${uid}`);
  }

  if (changedByEmail) {
    await createAdminLog(
      'Update User Profile',
      'N/A',
      `UID: ${uid}`,
      JSON.stringify(profile),
      changedByEmail
    );
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  if (isLocalMode()) {
    return JSON.parse(localStorage.getItem('local_users') || '[]');
  }
  try {
    const snap = await getDocs(query(collection(db, USERS_COLL), orderBy('createdAt', 'desc')));
    return snap.docs.map(d => d.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, USERS_COLL);
  }
}

export async function getTechnicians(): Promise<UserProfile[]> {
  if (isLocalMode()) {
    const users = JSON.parse(localStorage.getItem('local_users') || '[]');
    return users.filter((u: any) => u.role === 'Technician' && u.status === 'Active');
  }
  const q = query(
    collection(db, USERS_COLL),
    where('role', '==', 'Technician'),
    where('status', '==', 'Active')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as UserProfile);
}

export async function deleteUser(uid: string, adminEmail: string): Promise<void> {
  if (isLocalMode()) {
    const users = JSON.parse(localStorage.getItem('local_users') || '[]');
    const filtered = users.filter((u: any) => u.uid !== uid);
    localStorage.setItem('local_users', JSON.stringify(filtered));
    triggerLocalUsersListeners();
    await createAdminLog('Delete User', 'N/A', `UID: ${uid}`, 'Deleted', adminEmail);
    return;
  }
  await deleteDoc(doc(db, USERS_COLL, uid));
  await createAdminLog('Delete User', 'N/A', `UID: ${uid}`, 'Deleted', adminEmail);
}

// ---------------- REQUEST SERVICES ----------------

export async function generateRequestNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;

  if (isLocalMode()) {
    const reqs = JSON.parse(localStorage.getItem('local_requests') || '[]');
    const filtered = reqs.filter((r: any) => r.requestNo.startsWith(prefix));
    if (filtered.length === 0) {
      return `${prefix}0001`;
    }
    filtered.sort((a: any, b: any) => b.requestNo.localeCompare(a.requestNo));
    const lastNo = filtered[0].requestNo;
    const lastSeqStr = lastNo.split('-')[2];
    const nextSeq = parseInt(lastSeqStr, 10) + 1;
    const nextSeqStr = String(nextSeq).padStart(4, '0');
    return `${prefix}${nextSeqStr}`;
  }
  
  const q = query(
    collection(db, REQUESTS_COLL),
    where('requestNo', '>=', prefix),
    where('requestNo', '<=', prefix + '\uf8ff'),
    orderBy('requestNo', 'desc'),
    limit(1)
  );
  
  const snap = await getDocs(q);
  if (snap.empty) {
    return `${prefix}0001`;
  }
  
  const lastNo = snap.docs[0].data().requestNo as string;
  const lastSeqStr = lastNo.split('-')[2];
  const nextSeq = parseInt(lastSeqStr, 10) + 1;
  const nextSeqStr = String(nextSeq).padStart(4, '0');
  
  return `${prefix}${nextSeqStr}`;
}

export async function submitRequest(request: Partial<ServiceRequest>, user: UserProfile): Promise<string> {
  const requestNo = await generateRequestNumber();
  const now = new Date().toISOString();
  
  const fullRequest: ServiceRequest = {
    requestNo,
    title: request.title || request.service || 'Service Request',
    description: request.description || '',
    department: request.department || user.department,
    machine: request.machine || 'General',
    priority: request.priority || 'Medium',
    status: 'Pending',
    
    requester: request.requester || user.name,
    contact: request.contact || user.phone || '',
    location: request.location || 'General',
    service: request.service || request.title || '',
    timeNeeded: request.timeNeeded || '2 hours',
    equipment: request.equipment || '',
    tools: request.tools || '',
    requestedDate: request.requestedDate || now.split('T')[0],
    requestedTime: request.requestedTime || now.split('T')[1].substring(0, 5),

    createdBy: user.uid,
    createdByEmail: user.email,
    createdByName: user.name,
    assignedTo: '',
    assignedToName: '',
    assignedToEmail: '',
    
    hodStatus: 'Pending',
    hodComments: '',
    hodApprovedBy: '',
    hodApprovedAt: '',
    
    prodStatus: 'Pending',
    prodComments: '',
    prodApprovedBy: '',
    prodApprovedAt: '',
    
    attachments: request.attachments || [],
    createdAt: now,
    updatedAt: now,
  };

  if (isLocalMode()) {
    const localId = `local-req-${Date.now()}`;
    const fullLocalRequest = { id: localId, ...fullRequest };
    const reqs = JSON.parse(localStorage.getItem('local_requests') || '[]');
    reqs.unshift(fullLocalRequest);
    localStorage.setItem('local_requests', JSON.stringify(reqs));

    // Log user activity
    await createUserLog(
      user.email,
      user.name,
      user.role,
      'Submit Request',
      requestNo,
      `Submitted request titled: ${fullRequest.service}`
    );

    // Notify HOD and Admins
    await createNotificationForRole(
      'Admin',
      `New request ${requestNo} submitted by ${user.name}`,
      requestNo
    );
    await createNotificationForRole(
      'Production Manager',
      `New request ${requestNo} pending HOD approval`,
      requestNo
    );

    triggerLocalRequestsListeners();
    return requestNo;
  }
  
  const docRef = await addDoc(collection(db, REQUESTS_COLL), fullRequest);
  
  // Log user activity
  await createUserLog(
    user.email,
    user.name,
    user.role,
    'Submit Request',
    requestNo,
    `Submitted request titled: ${fullRequest.service}`
  );

  // Notify HOD and Admins
  await createNotificationForRole(
    'Admin',
    `New request ${requestNo} submitted by ${user.name}`,
    requestNo
  );
  await createNotificationForRole(
    'Production Manager',
    `New request ${requestNo} pending HOD approval`,
    requestNo
  );

  return requestNo;
}

export async function updateRequestStatus(
  requestId: string,
  updates: Partial<ServiceRequest>,
  changedBy: UserProfile,
  oldRequest: ServiceRequest
): Promise<void> {
  const now = new Date().toISOString();

  if (isLocalMode()) {
    const reqs = JSON.parse(localStorage.getItem('local_requests') || '[]');
    const idx = reqs.findIndex((r: any) => r.id === requestId);
    if (idx !== -1) {
      reqs[idx] = { ...reqs[idx], ...updates, updatedAt: now };
      localStorage.setItem('local_requests', JSON.stringify(reqs));
    }

    // Create audit trail and logs for modified fields
    const fieldsToCheck: (keyof ServiceRequest)[] = [
      'status', 'priority', 'assignedTo', 'assignedToName', 
      'hodStatus', 'prodStatus', 'description', 'service'
    ];

    for (const field of fieldsToCheck) {
      if (updates[field] !== undefined && updates[field] !== oldRequest[field]) {
        await createAuditTrail(
          oldRequest.requestNo,
          String(field),
          String(oldRequest[field] || 'None'),
          String(updates[field] || 'None'),
          changedBy.name
        );
      }
    }

    // Create general log
    if (changedBy.role === 'Admin' || changedBy.role === 'Super Admin') {
      await createAdminLog(
        'Update Request',
        oldRequest.requestNo,
        oldRequest.status,
        updates.status || oldRequest.status,
        changedBy.email
      );
    } else {
      await createUserLog(
        changedBy.email,
        changedBy.name,
        changedBy.role,
        'Edit Request',
        oldRequest.requestNo,
        `Updated request details. Status is now: ${updates.status || oldRequest.status}`
      );
    }

    // Handle specific notification triggers
    if (updates.status === 'Completed') {
      await createNotification(
        oldRequest.createdBy,
        `Your request ${oldRequest.requestNo} has been Completed!`,
        oldRequest.requestNo
      );
    } else if (updates.assignedTo) {
      await createNotification(
        updates.assignedTo,
        `You have been assigned job ${oldRequest.requestNo}`,
        oldRequest.requestNo
      );
    }

    triggerLocalRequestsListeners();
    return;
  }

  const requestRef = doc(db, REQUESTS_COLL, requestId);
  
  await updateDoc(requestRef, {
    ...updates,
    updatedAt: now
  });

  // Create audit trail and logs for modified fields
  const fieldsToCheck: (keyof ServiceRequest)[] = [
    'status', 'priority', 'assignedTo', 'assignedToName', 
    'hodStatus', 'prodStatus', 'description', 'service'
  ];

  for (const field of fieldsToCheck) {
    if (updates[field] !== undefined && updates[field] !== oldRequest[field]) {
      await createAuditTrail(
        oldRequest.requestNo,
        String(field),
        String(oldRequest[field] || 'None'),
        String(updates[field] || 'None'),
        changedBy.name
      );
    }
  }

  // Create general log
  if (changedBy.role === 'Admin' || changedBy.role === 'Super Admin') {
    await createAdminLog(
      'Update Request',
      oldRequest.requestNo,
      oldRequest.status,
      updates.status || oldRequest.status,
      changedBy.email
    );
  } else {
    await createUserLog(
      changedBy.email,
      changedBy.name,
      changedBy.role,
      'Edit Request',
      oldRequest.requestNo,
      `Updated request details. Status is now: ${updates.status || oldRequest.status}`
    );
  }

  // Handle specific notification triggers
  if (updates.status === 'Completed') {
    await createNotification(
      oldRequest.createdBy,
      `Your request ${oldRequest.requestNo} has been Completed!`,
      oldRequest.requestNo
    );
  } else if (updates.assignedTo) {
    await createNotification(
      updates.assignedTo,
      `You have been assigned job ${oldRequest.requestNo}`,
      oldRequest.requestNo
    );
  }
}

// Subscribe to requests in real time
export function subscribeToRequests(callback: (requests: ServiceRequest[]) => void) {
  if (isLocalMode()) {
    localRequestsListeners.push(callback);
    // Push initial local list
    const reqs = JSON.parse(localStorage.getItem('local_requests') || '[]');
    callback(reqs);
    return () => {
      const idx = localRequestsListeners.indexOf(callback);
      if (idx !== -1) localRequestsListeners.splice(idx, 1);
    };
  }

  return onSnapshot(
    query(collection(db, REQUESTS_COLL), orderBy('createdAt', 'desc')),
    (snap) => {
      const requests = snap.docs.map(d => ({ id: d.id, ...d.data() }) as ServiceRequest);
      callback(requests);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, REQUESTS_COLL);
    }
  );
}

// ---------------- LOGGING SERVICES ----------------

export async function createAdminLog(
  action: string,
  requestNo: string,
  oldValue: string,
  newValue: string,
  adminEmail: string
): Promise<void> {
  const metadata = await getClientMetadata();

  if (isLocalMode()) {
    const users = JSON.parse(localStorage.getItem('local_users') || '[]');
    const user = users.find((u: any) => u.email === adminEmail);
    const adminName = user ? user.name : 'System Admin';
    const role = user ? user.role : 'Admin';

    const log: AdminLog = {
      time: new Date().toISOString(),
      adminName,
      adminEmail,
      role,
      action,
      requestNo,
      oldValue,
      newValue,
      ...metadata
    };

    const logs = JSON.parse(localStorage.getItem('local_admin_logs') || '[]');
    logs.unshift(log);
    localStorage.setItem('local_admin_logs', JSON.stringify(logs.slice(0, 500)));
    triggerLocalAdminLogsListeners();
    return;
  }

  const userQuery = query(collection(db, USERS_COLL), where('email', '==', adminEmail));
  const userSnap = await getDocs(userQuery);
  const adminName = !userSnap.empty ? userSnap.docs[0].data().name : 'System Admin';
  const role = !userSnap.empty ? userSnap.docs[0].data().role : 'Admin';

  const log: AdminLog = {
    time: new Date().toISOString(),
    adminName,
    adminEmail,
    role,
    action,
    requestNo,
    oldValue,
    newValue,
    ...metadata
  };

  await addDoc(collection(db, ADMIN_LOGS_COLL), log);
}

export async function createUserLog(
  userEmail: string,
  userName: string,
  role: string,
  action: UserLog['action'],
  requestNo?: string,
  details?: string
): Promise<void> {
  const log: UserLog = {
    time: new Date().toISOString(),
    userEmail,
    userName,
    role,
    action,
    requestNo,
    details
  };

  if (isLocalMode()) {
    const logs = JSON.parse(localStorage.getItem('local_user_logs') || '[]');
    logs.unshift(log);
    localStorage.setItem('local_user_logs', JSON.stringify(logs.slice(0, 500)));
    triggerLocalUserLogsListeners();
    return;
  }

  await addDoc(collection(db, USER_LOGS_COLL), log);
}

export async function createLoginLog(email: string, role: string, status: 'Success' | 'Failed'): Promise<void> {
  const metadata = await getClientMetadata();
  const log: LoginLog = {
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    email,
    role,
    browser: metadata.browser,
    device: metadata.device,
    os: metadata.os,
    status
  };

  if (isLocalMode()) {
    const logs = JSON.parse(localStorage.getItem('local_login_logs') || '[]');
    logs.unshift(log);
    localStorage.setItem('local_login_logs', JSON.stringify(logs.slice(0, 500)));
    return;
  }

  await addDoc(collection(db, LOGIN_LOGS_COLL), log);
}

export async function createAuditTrail(
  requestNo: string,
  fieldChanged: string,
  oldValue: string,
  newValue: string,
  changedBy: string
): Promise<void> {
  const trail: AuditTrail = {
    requestNo,
    fieldChanged,
    oldValue,
    newValue,
    changedBy,
    changedAt: new Date().toISOString()
  };

  if (isLocalMode()) {
    const trails = JSON.parse(localStorage.getItem('local_audit_trails') || '[]');
    trails.unshift(trail);
    localStorage.setItem('local_audit_trails', JSON.stringify(trails.slice(0, 500)));
    return;
  }

  await addDoc(collection(db, AUDIT_TRAIL_COLL), trail);
}

// ---------------- NOTIFICATIONS ----------------

export async function createNotification(uid: string, message: string, requestNo?: string): Promise<void> {
  const notif: Notification = {
    uid,
    message,
    read: false,
    createdAt: new Date().toISOString(),
    requestNo
  };

  if (isLocalMode()) {
    const localNotif = { id: `local-notif-${Date.now()}-${Math.random()}`, ...notif };
    const allNotifs = JSON.parse(localStorage.getItem('local_notifications') || '[]');
    allNotifs.unshift(localNotif);
    localStorage.setItem('local_notifications', JSON.stringify(allNotifs));
    triggerLocalNotificationsListeners(uid);
    return;
  }

  await addDoc(collection(db, NOTIFICATIONS_COLL), notif);
}

export async function createNotificationForRole(role: string, message: string, requestNo?: string): Promise<void> {
  if (isLocalMode()) {
    const users = JSON.parse(localStorage.getItem('local_users') || '[]');
    const activeUsers = users.filter((u: any) => u.role === role && u.status === 'Active');
    const allNotifs = JSON.parse(localStorage.getItem('local_notifications') || '[]');
    
    activeUsers.forEach((u: any) => {
      const notif: Notification = {
        id: `local-notif-${Date.now()}-${Math.random()}`,
        uid: u.uid,
        message,
        read: false,
        createdAt: new Date().toISOString(),
        requestNo
      };
      allNotifs.unshift(notif);
    });
    
    localStorage.setItem('local_notifications', JSON.stringify(allNotifs));
    activeUsers.forEach((u: any) => {
      triggerLocalNotificationsListeners(u.uid);
    });
    return;
  }

  const q = query(collection(db, USERS_COLL), where('role', '==', role), where('status', '==', 'Active'));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  
  snap.docs.forEach(userDoc => {
    const notifRef = doc(collection(db, NOTIFICATIONS_COLL));
    batch.set(notifRef, {
      uid: userDoc.id,
      message,
      read: false,
      createdAt: new Date().toISOString(),
      requestNo
    });
  });
  
  await batch.commit();
}

export function subscribeToNotifications(uid: string, callback: (notifications: Notification[]) => void) {
  if (isLocalMode()) {
    if (!localNotificationsListeners[uid]) {
      localNotificationsListeners[uid] = [];
    }
    localNotificationsListeners[uid].push(callback);
    const allNotifs = JSON.parse(localStorage.getItem('local_notifications') || '[]');
    const userNotifs = allNotifs.filter((n: any) => n.uid === uid);
    callback(userNotifs);
    return () => {
      const listeners = localNotificationsListeners[uid];
      if (listeners) {
        const idx = listeners.indexOf(callback);
        if (idx !== -1) listeners.splice(idx, 1);
      }
    };
  }

  const q = query(
    collection(db, NOTIFICATIONS_COLL),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Notification));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, NOTIFICATIONS_COLL);
  });
}

export async function markNotificationAsRead(id: string): Promise<void> {
  if (isLocalMode()) {
    const allNotifs = JSON.parse(localStorage.getItem('local_notifications') || '[]');
    const idx = allNotifs.findIndex((n: any) => n.id === id);
    if (idx !== -1) {
      allNotifs[idx].read = true;
      localStorage.setItem('local_notifications', JSON.stringify(allNotifs));
      triggerLocalNotificationsListeners(allNotifs[idx].uid);
    }
    return;
  }
  await updateDoc(doc(db, NOTIFICATIONS_COLL, id), { read: true });
}

// ---------------- SETTINGS, DEPARTMENTS & MACHINES ----------------

export async function getSystemSettings(): Promise<SystemSettings> {
  if (isLocalMode()) {
    const settings = localStorage.getItem('local_settings');
    if (settings) {
      return JSON.parse(settings);
    }
    const defaultSettings: SystemSettings = {
      appName: 'Production Service Request System',
      companyName: 'Enterprise Manufacturing Ltd.',
      allowSelfRegistration: true,
      requireHODApproval: true,
      maintenanceEmail: 'maintenance@company.com'
    };
    localStorage.setItem('local_settings', JSON.stringify(defaultSettings));
    return defaultSettings;
  }

  const snap = await getDoc(doc(db, SETTINGS_COLL, 'global'));
  if (snap.exists()) {
    return snap.data() as SystemSettings;
  }
  const defaultSettings: SystemSettings = {
    appName: 'Production Service Request System',
    companyName: 'Enterprise Manufacturing Ltd.',
    allowSelfRegistration: true,
    requireHODApproval: true,
    maintenanceEmail: 'maintenance@company.com'
  };
  await setDoc(doc(db, SETTINGS_COLL, 'global'), defaultSettings);
  return defaultSettings;
}

export async function updateSystemSettings(settings: Partial<SystemSettings>, adminEmail: string): Promise<void> {
  const old = await getSystemSettings();

  if (isLocalMode()) {
    const merged = { ...old, ...settings };
    localStorage.setItem('local_settings', JSON.stringify(merged));
    await createAdminLog(
      'Update System Settings',
      'N/A',
      JSON.stringify(old),
      JSON.stringify(settings),
      adminEmail
    );
    return;
  }

  await updateDoc(doc(db, SETTINGS_COLL, 'global'), settings);
  await createAdminLog(
    'Update System Settings',
    'N/A',
    JSON.stringify(old),
    JSON.stringify(settings),
    adminEmail
  );
}

export async function getDepartments(): Promise<Department[]> {
  if (isLocalMode()) {
    return JSON.parse(localStorage.getItem('local_departments') || '[]');
  }
  const snap = await getDocs(query(collection(db, DEPARTMENTS_COLL), orderBy('name', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Department);
}

export async function addDepartment(dept: Omit<Department, 'id' | 'createdAt'>, adminEmail: string): Promise<void> {
  const fullDept: Department = {
    ...dept,
    createdAt: new Date().toISOString()
  };

  if (isLocalMode()) {
    const depts = JSON.parse(localStorage.getItem('local_departments') || '[]');
    const fullLocalDept = { id: `local-dept-${Date.now()}`, ...fullDept };
    depts.push(fullLocalDept);
    localStorage.setItem('local_departments', JSON.stringify(depts));
    await createAdminLog('Add Department', 'N/A', 'None', dept.name, adminEmail);
    return;
  }

  await addDoc(collection(db, DEPARTMENTS_COLL), fullDept);
  await createAdminLog('Add Department', 'N/A', 'None', dept.name, adminEmail);
}

export async function deleteDepartment(id: string, name: string, adminEmail: string): Promise<void> {
  if (isLocalMode()) {
    const depts = JSON.parse(localStorage.getItem('local_departments') || '[]');
    const filtered = depts.filter((d: any) => d.id !== id);
    localStorage.setItem('local_departments', JSON.stringify(filtered));
    await createAdminLog('Delete Department', 'N/A', name, 'Deleted', adminEmail);
    return;
  }
  await deleteDoc(doc(db, DEPARTMENTS_COLL, id));
  await createAdminLog('Delete Department', 'N/A', name, 'Deleted', adminEmail);
}

export async function getMachines(): Promise<Machine[]> {
  if (isLocalMode()) {
    return JSON.parse(localStorage.getItem('local_machines') || '[]');
  }
  const snap = await getDocs(query(collection(db, MACHINES_COLL), orderBy('name', 'asc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Machine);
}

export async function addMachine(machine: Omit<Machine, 'id' | 'createdAt'>, adminEmail: string): Promise<void> {
  const fullMachine: Machine = {
    ...machine,
    createdAt: new Date().toISOString()
  };

  if (isLocalMode()) {
    const machines = JSON.parse(localStorage.getItem('local_machines') || '[]');
    const fullLocalMachine = { id: `local-mach-${Date.now()}`, ...fullMachine };
    machines.push(fullLocalMachine);
    localStorage.setItem('local_machines', JSON.stringify(machines));
    await createAdminLog('Add Machine', 'N/A', 'None', machine.name, adminEmail);
    return;
  }

  await addDoc(collection(db, MACHINES_COLL), fullMachine);
  await createAdminLog('Add Machine', 'N/A', 'None', machine.name, adminEmail);
}

export async function deleteMachine(id: string, name: string, adminEmail: string): Promise<void> {
  if (isLocalMode()) {
    const machines = JSON.parse(localStorage.getItem('local_machines') || '[]');
    const filtered = machines.filter((m: any) => m.id !== id);
    localStorage.setItem('local_machines', JSON.stringify(filtered));
    await createAdminLog('Delete Machine', 'N/A', name, 'Deleted', adminEmail);
    return;
  }
  await deleteDoc(doc(db, MACHINES_COLL, id));
  await createAdminLog('Delete Machine', 'N/A', name, 'Deleted', adminEmail);
}

// ---------------- RETRIEVING LOGS FOR VIEW ----------------

export async function getAdminLogs(): Promise<AdminLog[]> {
  if (isLocalMode()) {
    return JSON.parse(localStorage.getItem('local_admin_logs') || '[]');
  }
  const snap = await getDocs(query(collection(db, ADMIN_LOGS_COLL), orderBy('time', 'desc'), limit(500)));
  return snap.docs.map(d => d.data() as AdminLog);
}

export async function getUserLogs(): Promise<UserLog[]> {
  if (isLocalMode()) {
    return JSON.parse(localStorage.getItem('local_user_logs') || '[]');
  }
  const snap = await getDocs(query(collection(db, USER_LOGS_COLL), orderBy('time', 'desc'), limit(500)));
  return snap.docs.map(d => d.data() as UserLog);
}

export async function getLoginLogs(): Promise<LoginLog[]> {
  if (isLocalMode()) {
    return JSON.parse(localStorage.getItem('local_login_logs') || '[]');
  }
  const snap = await getDocs(query(collection(db, LOGIN_LOGS_COLL), orderBy('date', 'desc'), orderBy('time', 'desc'), limit(500)));
  return snap.docs.map(d => d.data() as LoginLog);
}

export async function getAuditTrail(): Promise<AuditTrail[]> {
  if (isLocalMode()) {
    return JSON.parse(localStorage.getItem('local_audit_trails') || '[]');
  }
  const snap = await getDocs(query(collection(db, AUDIT_TRAIL_COLL), orderBy('changedAt', 'desc'), limit(500)));
  return snap.docs.map(d => d.data() as AuditTrail);
}

// ---------------- EXPORTED CUSTOM SUBSCRIBERS FOR APP ----------------

export function subscribeToUsers(callback: (users: UserProfile[]) => void) {
  if (isLocalMode()) {
    localUsersListeners.push(callback);
    const users = JSON.parse(localStorage.getItem('local_users') || '[]');
    callback(users);
    return () => {
      const idx = localUsersListeners.indexOf(callback);
      if (idx !== -1) localUsersListeners.splice(idx, 1);
    };
  }
  return onSnapshot(
    query(collection(db, 'users'), orderBy('createdAt', 'desc')),
    (snap) => {
      callback(snap.docs.map(d => d.data() as UserProfile));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }
  );
}

export function subscribeToAdminLogs(callback: (logs: AdminLog[]) => void) {
  if (isLocalMode()) {
    localAdminLogsListeners.push(callback);
    const logs = JSON.parse(localStorage.getItem('local_admin_logs') || '[]');
    callback(logs);
    return () => {
      const idx = localAdminLogsListeners.indexOf(callback);
      if (idx !== -1) localAdminLogsListeners.splice(idx, 1);
    };
  }
  return onSnapshot(
    query(collection(db, 'admin_logs'), orderBy('time', 'desc'), limit(15)),
    (snap) => {
      callback(snap.docs.map(d => d.data() as AdminLog));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'admin_logs');
    }
  );
}

export function subscribeToUserLogs(callback: (logs: UserLog[]) => void) {
  if (isLocalMode()) {
    localUserLogsListeners.push(callback);
    const logs = JSON.parse(localStorage.getItem('local_user_logs') || '[]');
    callback(logs);
    return () => {
      const idx = localUserLogsListeners.indexOf(callback);
      if (idx !== -1) localUserLogsListeners.splice(idx, 1);
    };
  }
  return onSnapshot(
    query(collection(db, 'user_logs'), orderBy('time', 'desc'), limit(15)),
    (snap) => {
      callback(snap.docs.map(d => d.data() as UserLog));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'user_logs');
    }
  );
}

// ---------------- INITIAL SEEDING ----------------

export async function seedInitialData(): Promise<void> {
  if (isLocalMode()) {
    const settingsKey = 'local_settings';
    if (localStorage.getItem(settingsKey)) return; // Already seeded

    localStorage.setItem(settingsKey, JSON.stringify({
      appName: 'Production Service Request System',
      companyName: 'Enterprise Manufacturing Ltd.',
      allowSelfRegistration: true,
      requireHODApproval: true,
      maintenanceEmail: 'maintenance@company.com'
    }));

    const deptsKey = 'local_departments';
    localStorage.setItem(deptsKey, JSON.stringify([
      { id: 'dept-1', name: 'Production', code: 'PROD', createdAt: new Date().toISOString() },
      { id: 'dept-2', name: 'Quality Control', code: 'QC', createdAt: new Date().toISOString() },
      { id: 'dept-3', name: 'Warehouse', code: 'WH', createdAt: new Date().toISOString() },
      { id: 'dept-4', name: 'Engineering', code: 'ENG', createdAt: new Date().toISOString() },
      { id: 'dept-5', name: 'Assembly', code: 'ASSY', createdAt: new Date().toISOString() }
    ]));

    const machinesKey = 'local_machines';
    localStorage.setItem(machinesKey, JSON.stringify([
      { id: 'mach-1', name: 'Injection Molding M1', code: 'IMM-01', department: 'Production', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'mach-2', name: 'CNC Milling C2', code: 'CNC-02', department: 'Engineering', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'mach-3', name: 'Packaging Line P3', code: 'PKG-03', department: 'Warehouse', status: 'Active', createdAt: new Date().toISOString() },
      { id: 'mach-4', name: 'SMT Assembly S4', code: 'SMT-04', department: 'Assembly', status: 'Active', createdAt: new Date().toISOString() }
    ]));
    return;
  }

  const settingsSnap = await getDoc(doc(db, SETTINGS_COLL, 'global'));
  if (settingsSnap.exists()) return; // Already seeded

  console.log('Seeding initial system configurations...');

  // 1. Seed global settings
  await getSystemSettings();

  // 2. Seed departments
  const depts = [
    { name: 'Production', code: 'PROD' },
    { name: 'Quality Control', code: 'QC' },
    { name: 'Warehouse', code: 'WH' },
    { name: 'Engineering', code: 'ENG' },
    { name: 'Assembly', code: 'ASSY' }
  ];
  for (const dept of depts) {
    await addDoc(collection(db, DEPARTMENTS_COLL), {
      ...dept,
      createdAt: new Date().toISOString()
    });
  }

  // 3. Seed machines
  const machines = [
    { name: 'Injection Molding M1', code: 'IMM-01', department: 'Production', status: 'Active' },
    { name: 'CNC Milling C2', code: 'CNC-02', department: 'Engineering', status: 'Active' },
    { name: 'Packaging Line P3', code: 'PKG-03', department: 'Warehouse', status: 'Active' },
    { name: 'SMT Assembly S4', code: 'SMT-04', department: 'Assembly', status: 'Active' }
  ];
  for (const machine of machines) {
    await addDoc(collection(db, MACHINES_COLL), {
      ...machine,
      createdAt: new Date().toISOString()
    });
  }

  console.log('System seeding completed successfully!');
}
