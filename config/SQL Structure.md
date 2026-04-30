# 🗄️ Supabase SQL Structure

กรุณาคัดลอกคำสั่ง SQL ด้านล่างนี้ไปรันใน **SQL Editor** ของโปรเจกต์ Supabase ของคุณ เพื่อสร้างตารางข้อมูลที่จำเป็น

## 1. Table: `schedules` (รายการธุรกรรมล่วงหน้า)

```sql
-- สร้างตาราง schedules
CREATE TABLE public.schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    next_run_date DATE NOT NULL,
    end_date DATE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    note TEXT,
    from_or_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- เปิดใช้งาน RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- สร้าง Policy สำหรับเข้าถึงข้อมูลส่วนตัว
CREATE POLICY "Users can manage their own schedules" ON public.schedules
    FOR ALL USING (auth.uid() = user_id);
```

## 2. โครงสร้างตารางอื่นๆ (สรุป)
หากคุณยังไม่ได้สร้างตารางหลักอื่นๆ สามารถดูโครงสร้างได้จากไฟล์นี้:

*   `profiles`: id, full_name, avatar_url, currency
*   `accounts`: id, user_id, name, type, balance, initial_balance, color
*   `categories`: id, user_id, name, type, icon, color, is_default, parent_id
*   `transactions`: id, user_id, account_id, category_id, amount, type, date, note, from_or_to, is_scheduled
*   `budgets`: id, user_id, category_id, amount, period, start_date
*   `credit_cards`: id, account_id, bank_name, credit_limit, statement_date, due_date
*   `investments`: id, account_id, principal_amount, current_value, dividend_schedule
