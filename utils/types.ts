// Types that mirror the Supabase/Postgres schema for use across the app
export type ID = number;

export interface Branch {
  id: ID;
  created_at: string; // ISO timestamp
  name?: string | null;
  subjects?: ID[] | null; // array of subject ids
  syllabus?: string | null;
}

export interface Faculty {
  id: ID;
  created_at: string;
  name?: string | null;
  profile?: string | null;
  qualification?: string | null;
  subjects?: ID[] | null;
  department?: string | null;
  description?: string | null;
}

export interface Subject {
  id: ID;
  created_at: string;
  topics?: ID[] | null;
  branches?: ID[] | null;
  faculty?: ID[] | null;
  sem?: number | null;
}

export interface Topic {
  id: ID;
  created_at: string;
  votes?: number | null;
  subject?: ID | null;
  name?: string | null;
  summary?: string | null;
  faculties?: ID[] | null;
}

export interface TopicWithFaculties extends Topic {
  faculties_full?: Faculty[];
}

export default {};
