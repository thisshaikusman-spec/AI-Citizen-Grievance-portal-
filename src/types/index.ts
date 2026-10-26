export type DepartmentType =
  | 'Electricity / Streetlight'
  | 'Road Maintenance'
  | 'Water Department'
  | 'Election Department'
  | 'Election Officer'
  | 'General Admin';

export type GrievanceStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Needs Review';

export type PriorityLevel = 'High' | 'Medium' | 'Low';

export type CategoryType =
  | 'Streetlight'
  | 'Roads'
  | 'Water Supply'
  | 'Election'
  | 'Election Monitoring'
  | 'Other';

export interface Note {
  id: number;
  complaint_id: number;
  author_id: number;
  note: string;
  created_at: string;
  author?: string;
}

export interface StatusHistory {
  id: number;
  complaint_id: number;
  old_status: string; // "None" = "Submitted"
  new_status: string;
  changed_by: string; // Name of person who changed status
  changed_at: string;
}

export interface UserSummary {
  id?: number;
  name?: string;
  email?: string;
  phone?: string | null;
  role?: string;
}

export interface Complaint {
  id: number;
  tracking_number: string; // Format: GRV-2026-123456
  user_id: number;
  text: string;
  location?: string | null;
  evidence_url?: string | null;
  category: CategoryType | string;
  department: DepartmentType | string;
  priority: PriorityLevel | string;
  confidence: number; // 0 to 1
  status: GrievanceStatus | string;
  assigned_to?: number | null;
  created_at: string;
  updated_at?: string;
  user?: UserSummary | null;
  assigned_user?: UserSummary | null;
  notes?: Note[];
  status_history?: StatusHistory[];
}

export interface TrackComplaintPublic {
  tracking_number: string;
  category: string;
  department: string;
  status: string;
  created_at: string;
}

export interface AuthMe {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  created_at: string;
}

export interface AdminDashboardData {
  total?: number;
  total_complaints?: number;
  by_status?: Record<string, number>;
  by_department?: Record<string, number>;
  by_priority?: Record<string, number>;
}

export interface AdminComplaintsResponse {
  total: number;
  page: number;
  limit: number;
  items: Complaint[];
}

export interface DepartmentSummary {
  name: DepartmentType;
  icon: string;
  description: string;
  sampleIssues: string[];
}
