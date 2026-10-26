import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { DepartmentSummary, DepartmentType, Complaint, AuthMe } from '../types/index.ts';
import { apiFetch } from '../lib/api.ts';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  rawDate: number;
  complaintId?: string;
  status?: string;
  read: boolean;
  type: 'update' | 'alert' | 'success';
}

export const DEPARTMENTS_DATA: DepartmentSummary[] = [
  {
    name: 'Electricity / Streetlight',
    icon: 'lightbulb',
    description: 'Streetlight failures, dangling wires, transformer issues, power surges, and hazardous exposed junction poles.',
    sampleIssues: [
      'Streetlight pole flickering or dark for consecutive nights',
      'Exposed electrical wire hanging near pedestrian footpath',
      'Transformer oil leak or low voltage phase fluctuations',
      'Fallen junction box after high winds',
    ],
  },
  {
    name: 'Road Maintenance',
    icon: 'add_road',
    description: 'Potholes, broken footpaths, drainage caving, resurfacing demands, and unauthorized road excavation hazards.',
    sampleIssues: [
      'Deep pothole crater causing vehicle damage',
      'Uncovered trench left open by utility contractor',
      'Broken concrete slab on pedestrian sidewalk',
      'Waterlogging due to unaligned road camber',
    ],
  },
  {
    name: 'Water Department',
    icon: 'water_drop',
    description: 'Water supply disruption, contaminated water, pipeline leaks, low water pressure, and municipal booster failures.',
    sampleIssues: [
      'Muddy, discolored, or foul-smelling tap water',
      'Underground main pipe burst gushing onto public road',
      'Zero municipal supply in residential sector',
      'Booster pump station breakdown in reservoir',
    ],
  },
  {
    name: 'Election Department',
    icon: 'how_to_vote',
    description: 'Voter ID registration, name missing in voter list, polling booth queries, EPIC corrections, and BLO verification.',
    sampleIssues: [
      'Name deleted or missing from the current published electoral roll',
      'Form 8 correction of spelling mistake in EPIC card',
      'Polling booth relocated without prior citizen intimations',
      'Booth Level Officer (BLO) physical address verification pending',
    ],
  },
  {
    name: 'Election Officer',
    icon: 'shield',
    description: 'Model code of conduct violations, illicit campaign financing, voter bribery, hate speech flyers, and polling station disruption.',
    sampleIssues: [
      'Distribution of cash, liquor, or gift vouchers outside ward boundary',
      'Unpermitted loudspeakers and road rallies during silent period',
      'Defacement of public boundary walls with campaign stencil paint',
      'Voter intimidation or paid partisan booth mobilization',
    ],
  },
  {
    name: 'General Admin',
    icon: 'apartment',
    description: 'Sanitation, public property encroachment, noise pollution & municipal issues, garbage dumps, and animal control.',
    sampleIssues: [
      'Overflowing community garbage container attracting stray animals',
      'Construction debris dumped on public park perimeter',
      'Illegal commercial vehicle parking choking narrow residential alley',
      'Stagnant water cesspool generating mosquito breeding grounds',
    ],
  },
];

interface GrievanceContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  trackQuery: string;
  setTrackQuery: (query: string) => void;
  selectedGrievanceId: string | null;
  setSelectedGrievanceId: (id: string | null) => void;
  selectedDepartment: DepartmentType | null;
  setSelectedDepartment: (dept: DepartmentType | null) => void;
  currentUser: AuthMe | null;
  setCurrentUser: (user: AuthMe | null) => void;
  logout: () => void;
  myComplaints: Complaint[];
  setMyComplaints: React.Dispatch<React.SetStateAction<Complaint[]>>;
  isComplaintsLoading: boolean;
  complaintsError: string | null;
  refreshMyComplaints: () => Promise<void>;
  notifications: NotificationItem[];
  unreadCount: number;
  markAllNotificationsRead: () => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  departments: DepartmentSummary[];
}

const GrievanceContext = createContext<GrievanceContextType | undefined>(undefined);

export const GrievanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [trackQuery, setTrackQuery] = useState<string>('');
  const [selectedGrievanceId, setSelectedGrievanceId] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentType | null>(null);

  const [currentUser, setCurrentUser] = useState<AuthMe | null>(null);
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [isComplaintsLoading, setIsComplaintsLoading] = useState<boolean>(false);
  const [complaintsError, setComplaintsError] = useState<string | null>(null);

  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(() => new Set());
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Fetch current user from /auth/me if token exists
  const fetchCurrentUser = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setCurrentUser(null);
      return;
    }
    try {
      const data = await apiFetch<AuthMe>('/auth/me', { auth: true });
      setCurrentUser(data);
      if (data?.role) localStorage.setItem('role', data.role);
      if (data?.name) localStorage.setItem('name', data.name);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  // Fetch user's complaints from /complaints
  const refreshMyComplaints = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setMyComplaints([]);
      return;
    }

    setIsComplaintsLoading(true);
    setComplaintsError(null);
    try {
      const res = await apiFetch<Complaint[]>('/complaints?limit=50&offset=0', { auth: true });
      setMyComplaints(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setComplaintsError(err?.message || 'Failed to load complaints');
    } finally {
      setIsComplaintsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchCurrentUser();
      refreshMyComplaints();
    }
  }, [fetchCurrentUser, refreshMyComplaints]);

  // Logout handler
  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    setCurrentUser(null);
    setMyComplaints([]);
    setActiveTab('login');
    try {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch { }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Build notifications dynamically from real status_history of my complaints (newest 10)
  const notifications: NotificationItem[] = useMemo(() => {
    const items: NotificationItem[] = [];

    for (const complaint of myComplaints) {
      if (Array.isArray(complaint.status_history)) {
        for (const sh of complaint.status_history) {
          const rawDate = new Date(sh.changed_at).getTime();
          const localTime = !isNaN(rawDate)
            ? new Date(sh.changed_at).toLocaleString()
            : sh.changed_at;

          const oldStatusLabel = sh.old_status === 'None' ? 'Submitted' : sh.old_status;
          const isResolved = sh.new_status === 'Resolved';
          const isNeedsReview = sh.new_status === 'Needs Review';

          items.push({
            id: `sh-${sh.id}-${complaint.id}`,
            title: `Status update: ${complaint.tracking_number}`,
            message: `${sh.changed_by || 'Officer'} updated status from "${oldStatusLabel}" to "${sh.new_status}"`,
            time: localTime,
            rawDate: isNaN(rawDate) ? 0 : rawDate,
            complaintId: complaint.tracking_number,
            status: sh.new_status,
            read: readNotifIds.has(`sh-${sh.id}-${complaint.id}`),
            type: isResolved ? 'success' : isNeedsReview ? 'alert' : 'update',
          });
        }
      }
    }

    // Sort newest first and take up to 10
    items.sort((a, b) => b.rawDate - a.rawDate);
    return items.slice(0, 10);
  }, [myComplaints, readNotifIds]);

  const markAllNotificationsRead = useCallback(() => {
    setReadNotifIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      return next;
    });
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  return (
    <GrievanceContext.Provider
      value={{
        activeTab,
        setActiveTab,
        trackQuery,
        setTrackQuery,
        selectedGrievanceId,
        setSelectedGrievanceId,
        selectedDepartment,
        setSelectedDepartment,
        currentUser,
        setCurrentUser,
        logout,
        myComplaints,
        setMyComplaints,
        isComplaintsLoading,
        complaintsError,
        refreshMyComplaints,
        notifications,
        unreadCount,
        markAllNotificationsRead,
        isNotificationsOpen,
        setIsNotificationsOpen,
        departments: DEPARTMENTS_DATA,
      }}
    >
      {children}
    </GrievanceContext.Provider>
  );
};

export const useGrievance = () => {
  const context = useContext(GrievanceContext);
  if (!context) {
    throw new Error('useGrievance must be used within a GrievanceProvider');
  }
  return context;
};
