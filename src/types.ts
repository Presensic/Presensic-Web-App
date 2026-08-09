export interface Industry {
  id: string;
  name: string;
  description: string;
  iconName: string; // Resolves to a Lucide icon
}

export interface Step {
  number: number;
  title: string;
  description: string;
  iconName: string;
}

export interface PricingPlan {
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  details: string;
  isPopular?: boolean;
  features: string[];
}

export interface LeaveRequest {
  id: string | number;
  company_id: number;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  leave_type: string;
  reason: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}
