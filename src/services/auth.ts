import { initializeApp, deleteApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  getAuth as getSecondaryAuth,
  createUserWithEmailAndPassword as createSecondaryUser,
  signOut as signSecondaryOut
} from 'firebase/auth';
import { getFirestore as getSecondaryFirestore, doc as secondaryDoc, setDoc as secondarySetDoc } from 'firebase/firestore';
import { auth, firebaseConfig } from '../firebase/config';
import {
  getUserProfile,
  createUserProfile,
  createLoginLog,
  getAllUsers,
  seedInitialData,
  createAdminLog,
  isLocalMode
} from './db';
import { UserProfile, UserRole } from '../types';

// Local mode reactive auth state listeners
const localAuthListeners: ((user: User | null, profile: UserProfile | null) => void)[] = [];

export function triggerLocalAuthChange() {
  const currentLocalUserStr = localStorage.getItem('current_local_user');
  if (currentLocalUserStr) {
    const profile = JSON.parse(currentLocalUserStr) as UserProfile;
    const mockUser = {
      uid: profile.uid,
      email: profile.email,
      displayName: profile.name,
      emailVerified: true
    } as unknown as User;
    localAuthListeners.forEach(cb => cb(mockUser, profile));
  } else {
    localAuthListeners.forEach(cb => cb(null, null));
  }
}

// Check if any users exist to auto-assign the first registrant as Super Admin
async function isFirstUser(): Promise<boolean> {
  try {
    const users = await getAllUsers();
    return users.length === 0;
  } catch (e) {
    return true; // Fallback to safe option
  }
}

export async function registerUser(email: string, password: string, name: string, department: string, role: UserRole): Promise<UserProfile> {
  const now = new Date().toISOString();

  if (isLocalMode()) {
    const users = JSON.parse(localStorage.getItem('local_users') || '[]');
    const existing = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const finalRole = users.length === 0 ? 'Super Admin' : role;
    const uid = `local-user-${Date.now()}`;
    const profile: UserProfile = {
      uid,
      name,
      email,
      department,
      role: finalRole,
      status: 'Active',
      phone: '',
      createdAt: now,
      updatedAt: now
    };

    users.push(profile);
    localStorage.setItem('local_users', JSON.stringify(users));
    await createLoginLog(email, finalRole, 'Success');

    // Seed data
    try {
      await seedInitialData();
    } catch (err) {
      console.error('Failed to seed database:', err);
    }

    return profile;
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // If first user ever, force role to Super Admin
  const finalRole = (await isFirstUser()) ? 'Super Admin' : role;

  const profile: Partial<UserProfile> = {
    uid: user.uid,
    name,
    email,
    department,
    role: finalRole,
    status: 'Active',
    phone: ''
  };

  await createUserProfile(user.uid, profile);
  await createLoginLog(email, finalRole, 'Success');

  // Trigger seeding of base settings/departments/machines if user has administrative access
  if (finalRole === 'Super Admin' || finalRole === 'Admin') {
    try {
      await seedInitialData();
    } catch (err) {
      console.error('Failed to seed initial database:', err);
    }
  }

  return {
    uid: user.uid,
    name,
    email,
    department,
    role: finalRole,
    status: 'Active',
    phone: '',
    createdAt: now,
    updatedAt: now
  };
}

export async function loginUser(email: string, password: string): Promise<UserProfile> {
  if (isLocalMode()) {
    const users = JSON.parse(localStorage.getItem('local_users') || '[]');
    const profile = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    
    if (!profile) {
      throw new Error('User profile does not exist. (Sandbox Mode: Create or verify email thilina2003dilruk@gmail.com / 123456)');
    }

    if (profile.status === 'Inactive') {
      await createLoginLog(email, profile.role, 'Failed');
      throw new Error('Your account is currently inactive. Contact your supervisor.');
    }

    // Seed initial sandbox lists
    try {
      await seedInitialData();
    } catch (err) {
      console.error('Failed to seed database:', err);
    }

    await createLoginLog(email, profile.role, 'Success');

    // Persist login in local storage
    localStorage.setItem('current_local_user', JSON.stringify(profile));
    triggerLocalAuthChange();

    return profile as UserProfile;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const profile = await getUserProfile(user.uid);
    if (!profile) {
      throw new Error('User profile does not exist in Firestore. Contact an Admin.');
    }

    if (profile.status === 'Inactive') {
      await createLoginLog(email, profile.role, 'Failed');
      await signOut(auth);
      throw new Error('Your account is currently inactive. Contact your supervisor.');
    }

    // Ensure base DB is seeded if logging in user is Super Admin or Admin
    if (profile.role === 'Super Admin' || profile.role === 'Admin') {
      try {
        await seedInitialData();
      } catch (err) {
        console.error('Failed to seed database:', err);
      }
    }

    await createLoginLog(email, profile.role, 'Success');
    return profile;
  } catch (error: any) {
    // If Email/Password is disabled in Firebase console, fallback gracefully to Sandbox mode
    if (error.code === 'auth/operation-not-allowed') {
      console.warn('Firebase Email/Password provider is disabled. Falling back to interactive Offline Sandbox mode...');
      localStorage.setItem('firebase_auth_disabled', 'true');
      
      // Auto seed first Super Admin in local storage
      const users = JSON.parse(localStorage.getItem('local_users') || '[]');
      const adminEmail = 'thilina2003dilruk@gmail.com';
      let admin = users.find((u: any) => u.email.toLowerCase() === adminEmail.toLowerCase());
      if (!admin) {
        const now = new Date().toISOString();
        admin = {
          uid: 'local-super-admin-uid-12345',
          name: 'Super Admin',
          email: adminEmail,
          department: 'Engineering',
          role: 'Super Admin',
          status: 'Active',
          phone: '',
          createdAt: now,
          updatedAt: now
        };
        users.push(admin);
        localStorage.setItem('local_users', JSON.stringify(users));
      }

      // Retry login as Local Mode
      localStorage.setItem('current_local_user', JSON.stringify(admin));
      triggerLocalAuthChange();
      return admin;
    }
    throw error;
  }
}

export async function logoutUser(email: string, role: string): Promise<void> {
  if (isLocalMode()) {
    localStorage.removeItem('current_local_user');
    triggerLocalAuthChange();
    return;
  }
  await signOut(auth);
}

export function sendPasswordReset(email: string): Promise<void> {
  if (isLocalMode()) {
    return Promise.resolve(); // Mock success
  }
  return sendPasswordResetEmail(auth, email);
}

export function subscribeToAuthChanges(callback: (user: User | null, profile: UserProfile | null) => void) {
  if (isLocalMode()) {
    localAuthListeners.push(callback);
    // Initial call
    const currentLocalUserStr = localStorage.getItem('current_local_user');
    if (currentLocalUserStr) {
      const profile = JSON.parse(currentLocalUserStr) as UserProfile;
      const mockUser = {
        uid: profile.uid,
        email: profile.email,
        displayName: profile.name,
        emailVerified: true
      } as unknown as User;
      callback(mockUser, profile);
    } else {
      callback(null, null);
    }
    return () => {
      const idx = localAuthListeners.indexOf(callback);
      if (idx !== -1) {
        localAuthListeners.splice(idx, 1);
      }
    };
  }

  return onAuthStateChanged(auth, async (user) => {
    // Check if local mode was enabled in the meantime
    if (isLocalMode()) {
      const currentLocalUserStr = localStorage.getItem('current_local_user');
      if (currentLocalUserStr) {
        const profile = JSON.parse(currentLocalUserStr) as UserProfile;
        const mockUser = {
          uid: profile.uid,
          email: profile.email,
          displayName: profile.name,
          emailVerified: true
        } as unknown as User;
        callback(mockUser, profile);
      } else {
        callback(null, null);
      }
      return;
    }

    if (user) {
      const profile = await getUserProfile(user.uid);
      callback(user, profile);
    } else {
      callback(null, null);
    }
  });
}

export async function adminCreateUser(
  email: string,
  password: string,
  name: string,
  department: string,
  role: UserRole,
  phone: string,
  adminEmail: string
): Promise<UserProfile> {
  const now = new Date().toISOString();

  if (isLocalMode()) {
    const users = JSON.parse(localStorage.getItem('local_users') || '[]');
    const existing = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const profile: UserProfile = {
      uid: `local-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      email,
      department,
      role,
      status: 'Active',
      phone: phone || '',
      createdAt: now,
      updatedAt: now
    };

    users.push(profile);
    localStorage.setItem('local_users', JSON.stringify(users));

    await createAdminLog(
      'Admin Create User',
      'N/A',
      'None',
      `Created user: ${name} (${email}) with role: ${role}`,
      adminEmail
    );

    // Refresh listeners
    const triggerLocalUsersListeners = () => {
      const allUsers = JSON.parse(localStorage.getItem('local_users') || '[]');
      const event = new CustomEvent('local_users_updated', { detail: allUsers });
      window.dispatchEvent(event);
    };
    triggerLocalUsersListeners();

    return profile;
  }

  const appName = `SecondaryAdminApp_${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getSecondaryAuth(secondaryApp);

  try {
    const userCredential = await createSecondaryUser(secondaryAuth, email, password);
    const user = userCredential.user;

    const profile: Partial<UserProfile> = {
      uid: user.uid,
      name,
      email,
      department,
      role,
      status: 'Active',
      phone: phone || ''
    };

    await createUserProfile(user.uid, profile);

    await createAdminLog(
      'Admin Create User',
      'N/A',
      'None',
      `Created user: ${name} (${email}) with role: ${role}`,
      adminEmail
    );

    await signSecondaryOut(secondaryAuth);

    return {
      uid: user.uid,
      name,
      email,
      department,
      role,
      status: 'Active',
      phone: phone || '',
      createdAt: now,
      updatedAt: now
    };
  } finally {
    await deleteApp(secondaryApp);
  }
}

export async function ensureFirstSuperAdmin(): Promise<void> {
  const adminEmail = 'thilina2003dilruk@gmail.com';
  const adminPassword = '123456';

  if (sessionStorage.getItem('super_admin_checked') === 'true') {
    return;
  }

  // If local mode is already set, or we proceed to seed local mode anyway
  if (isLocalMode()) {
    const users = JSON.parse(localStorage.getItem('local_users') || '[]');
    let admin = users.find((u: any) => u.email.toLowerCase() === adminEmail.toLowerCase());
    if (!admin) {
      const now = new Date().toISOString();
      admin = {
        uid: 'local-super-admin-uid-12345',
        name: 'Super Admin',
        email: adminEmail,
        department: 'Engineering',
        role: 'Super Admin',
        status: 'Active',
        phone: '',
        createdAt: now,
        updatedAt: now
      };
      users.push(admin);
      localStorage.setItem('local_users', JSON.stringify(users));
    }
    sessionStorage.setItem('super_admin_checked', 'true');
    return;
  }

  const appName = `InitialAdminSeed_${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, appName);
  const secondaryAuth = getSecondaryAuth(secondaryApp);
  const secondaryDb = getSecondaryFirestore(secondaryApp);

  try {
    const userCredential = await createSecondaryUser(secondaryAuth, adminEmail, adminPassword);
    const user = userCredential.user;

    const profile: UserProfile = {
      uid: user.uid,
      name: 'Super Admin',
      email: adminEmail,
      department: 'Engineering',
      role: 'Super Admin',
      status: 'Active',
      phone: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await secondarySetDoc(secondaryDoc(secondaryDb, 'users', user.uid), profile);
    console.log('Successfully created and seeded the first Super Admin account!');
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      console.log('First Super Admin account already exists.');
    } else if (err.code === 'auth/operation-not-allowed') {
      console.warn('Firebase Email/Password provider is disabled. Enabling local Sandbox fallback mode...');
      localStorage.setItem('firebase_auth_disabled', 'true');
      
      // Seed first Super Admin locally
      const users = JSON.parse(localStorage.getItem('local_users') || '[]');
      let admin = users.find((u: any) => u.email.toLowerCase() === adminEmail.toLowerCase());
      if (!admin) {
        const now = new Date().toISOString();
        admin = {
          uid: 'local-super-admin-uid-12345',
          name: 'Super Admin',
          email: adminEmail,
          department: 'Engineering',
          role: 'Super Admin',
          status: 'Active',
          phone: '',
          createdAt: now,
          updatedAt: now
        };
        users.push(admin);
        localStorage.setItem('local_users', JSON.stringify(users));
      }
    } else {
      console.error('Error ensuring first Super Admin exists:', err);
    }
  } finally {
    sessionStorage.setItem('super_admin_checked', 'true');
    await deleteApp(secondaryApp);
  }
}



