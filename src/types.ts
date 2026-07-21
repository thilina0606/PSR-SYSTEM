export type UserRole = 'Admin' | 'User';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export type RequestStatus = 'Pending' | 'Approved' | 'Assigned' | 'In Progress' | 'Completed' | 'Rejected' | 'Cancelled';

export interface ServiceRequest {
  id?: string; // Firestore document ID
  requestNo: string;
  title: string;
  category?: string;
  description: string;
  department: string;
  machine: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: RequestStatus;
  
  // Custom form fields from old App
  requester: string;
  contact: string;
  location: string;
  service: string;
  timeNeeded: string;
  equipment: string;
  tools: string;
  requestedDate: string;
  requestedTime: string;

  // Lifecycle
  createdBy: string; // email or uid of creator
  createdByEmail: string;
  createdByName: string;
  assignedTo: string | null; // uid of technician (can be null)
  assignedToName: string;
  assignedToEmail: string;
  
  // Requirements restoration fields
  requesterUid?: string;
  requesterName?: string;
  requesterEmail?: string;
  currentStage?: string;
  
  // Approval and logs
  hodStatus: 'Pending' | 'Approved' | 'Rejected';
  hodComments: string;
  hodApprovedBy: string;
  hodApprovedAt: string;
  
  prodStatus: 'Pending' | 'Approved' | 'Rejected';
  prodComments: string;
  prodApprovedBy: string;
  prodApprovedAt: string;

  technicianComments?: string;
  attachments: string[]; // URLs or Base64
  
  // Enterprise Workflow Expansion
  stage?: string;
  estimatedCompletionDate?: string;
  completedBy?: string;
  completedByName?: string;
  completionRemark?: string;
  timeline?: { time: string; title: string; description: string; user?: string }[];
  comments?: {
    id: string;
    authorId: string;
    authorName: string;
    authorRole: string;
    text: string;
    time: string;
    replies?: {
      authorName: string;
      text: string;
      time: string;
    }[];
  }[];
  feedbackRating?: number;
  feedbackComment?: string;
  feedbackSatisfied?: boolean;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface AdminLog {
  id?: string;
  time: string;
  adminName: string;
  adminEmail: string;
  role: string;
  action: string;
  requestNo: string;
  oldValue: string;
  newValue: string;
  ipAddress: string;
  browser: string;
  device: string;
}

export interface UserLog {
  id?: string;
  time: string;
  userEmail: string;
  userName: string;
  role: string;
  action: 'Login' | 'Logout' | 'Submit Request' | 'Edit Request' | 'Delete Request' | 'Cancel Request' | 'Download Report' | 'View Request';
  requestNo?: string;
  details?: string;
}

export interface LoginLog {
  id?: string;
  date: string;
  time: string;
  email: string;
  role: string;
  browser: string;
  device: string;
  os: string;
  status: 'Success' | 'Failed';
}

export interface AuditTrail {
  id?: string;
  requestNo: string;
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
}

export interface Notification {
  id?: string;
  uid: string; // recipient uid
  message: string;
  read: boolean;
  createdAt: string;
  requestNo?: string;
}

export interface Department {
  id?: string;
  name: string;
  code: string;
  createdAt: string;
}

export interface Machine {
  id?: string;
  name: string;
  code: string;
  department: string;
  status: 'Active' | 'Maintenance' | 'Inactive';
  createdAt: string;
}

export interface SystemSettings {
  appName: string;
  companyName: string;
  allowSelfRegistration: boolean;
  requireHODApproval: boolean;
  maintenanceEmail: string;
}
