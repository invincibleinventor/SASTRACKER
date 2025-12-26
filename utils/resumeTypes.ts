export interface Resume {
  id: string;
  created_at: string;
  user_id: string;
  user_email: string;
  user_name: string;
  pdf_url: string;
  resume_url?: string;
  thumbnail_url?: string;
  achievement_type: 'internship' | 'job' | 'both' | 'freelance' | 'project';
  company_name: string;
  role_title: string;
  year_graduated?: string;
  tips?: string;
  remarks?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  views_count: number;
  fork_count: number;
  votes_count: number;
  comments_count: number;
  forked_from?: string;
  is_flagship?: boolean;
  html_content?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  added_at: string;
}

export interface ResumeVote {
  id: string;
  resume_id: string;
  user_id: string;
  vote_type: 1 | -1;
  created_at: string;
}

export interface ResumeComment {
  id: string;
  resume_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  created_at: string;
  is_deleted: boolean;
}

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  is_sastra_student: boolean;
  is_alumni: boolean;
  department?: string;
  semester?: number;
  section?: string;
  batch_year?: string;
  graduation_year?: string;
  current_company?: string;
  job_title?: string;
  created_at: string;
  updated_at: string;
}

export interface ResumeAchievement {
  id: string;
  resume_id: string;
  achievement_type: 'internship' | 'job' | 'freelance' | 'project';
  company_name: string;
  role_title: string;
  start_date?: string;
  end_date?: string;
  is_converted: boolean;
  created_at: string;
}

export interface BlockedUser {
  id: string;
  user_id?: string;
  user_email: string;
  blocked_by?: string;
  blocked_at: string;
  reason?: string;
  expires_at?: string;
}
