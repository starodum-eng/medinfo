// Типы строк БД под схему из supabase/migrations/0001_init.sql.
// Литеральные union'ы совпадают с CHECK-ограничениями в миграции —
// при изменении схемы правим оба места синхронно.

// ---------- Литеральные типы (= CHECK-ограничения) ----------
export type DocType = 'lab_numeric' | 'unknown';
export type DocumentStatus = 'pending' | 'processed' | 'failed';
export type LabFlag =
  | 'normal'
  | 'low'
  | 'high'
  | 'critical_low'
  | 'critical_high'
  | 'unknown';
export type RedFlagSeverity = 'warn' | 'urgent';
export type ReminderKind = 'retest' | 'medication' | 'appointment';

// ---------- profiles ----------
export type Profile = {
  id: string;
  display_name: string | null;
  locale: string;
  created_at: string;
};
export type ProfileInsert = {
  id: string;
  display_name?: string | null;
  locale?: string;
  created_at?: string;
};
export type ProfileUpdate = {
  display_name?: string | null;
  locale?: string;
};

// ---------- documents ----------
export type DocumentRow = {
  id: string;
  user_id: string;
  storage_path: string | null;
  doc_type: DocType;
  taken_at: string | null;
  uploaded_at: string;
  status: DocumentStatus;
  overall_note: string | null;
};
export type DocumentInsert = {
  id?: string;
  user_id: string;
  storage_path?: string | null;
  doc_type?: DocType;
  taken_at?: string | null;
  uploaded_at?: string;
  status?: DocumentStatus;
  overall_note?: string | null;
};
export type DocumentUpdate = {
  storage_path?: string | null;
  doc_type?: DocType;
  taken_at?: string | null;
  status?: DocumentStatus;
  overall_note?: string | null;
};

// ---------- lab_results ----------
export type LabResult = {
  id: string;
  document_id: string;
  user_id: string;
  analyte_name: string;
  analyte_code: string | null;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  ref_low: number | null;
  ref_high: number | null;
  flag: LabFlag;
  explanation: string | null;
  measured_at: string | null;
};
export type LabResultInsert = {
  id?: string;
  document_id: string;
  user_id: string;
  analyte_name: string;
  analyte_code?: string | null;
  value?: number | null;
  value_text?: string | null;
  unit?: string | null;
  ref_low?: number | null;
  ref_high?: number | null;
  flag?: LabFlag;
  explanation?: string | null;
  measured_at?: string | null;
};
export type LabResultUpdate = Partial<Omit<LabResultInsert, 'id'>>;

// ---------- red_flags ----------
export type RedFlag = {
  id: string;
  user_id: string;
  document_id: string | null;
  severity: RedFlagSeverity;
  message: string;
  acknowledged: boolean;
  created_at: string;
};
export type RedFlagInsert = {
  id?: string;
  user_id: string;
  document_id?: string | null;
  severity: RedFlagSeverity;
  message: string;
  acknowledged?: boolean;
  created_at?: string;
};
export type RedFlagUpdate = {
  acknowledged?: boolean;
  message?: string;
  severity?: RedFlagSeverity;
};

// ---------- reminders ----------
export type Reminder = {
  id: string;
  user_id: string;
  kind: ReminderKind;
  title: string;
  notes: string | null;
  due_at: string;
  repeat_rule: string | null;
  notification_id: string | null;
  done: boolean;
};
export type ReminderInsert = {
  id?: string;
  user_id: string;
  kind: ReminderKind;
  title: string;
  notes?: string | null;
  due_at: string;
  repeat_rule?: string | null;
  notification_id?: string | null;
  done?: boolean;
};
export type ReminderUpdate = Partial<Omit<ReminderInsert, 'id' | 'user_id'>>;

// ---------- Схема для типизации клиента Supabase ----------
// Позволяет писать supabase.from('documents') с выводом типов Row/Insert/Update.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      documents: {
        Row: DocumentRow;
        Insert: DocumentInsert;
        Update: DocumentUpdate;
        Relationships: [];
      };
      lab_results: {
        Row: LabResult;
        Insert: LabResultInsert;
        Update: LabResultUpdate;
        Relationships: [];
      };
      red_flags: {
        Row: RedFlag;
        Insert: RedFlagInsert;
        Update: RedFlagUpdate;
        Relationships: [];
      };
      reminders: {
        Row: Reminder;
        Insert: ReminderInsert;
        Update: ReminderUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
