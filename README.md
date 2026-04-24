# 💰 Expense Tracker App — Documentation (ภาษาไทย)

แอปพลิเคชันสำหรับบันทึกและจัดการรายรับ-รายจ่ายส่วนบุคคล ออกแบบมาเพื่อให้ผู้ใช้งานสามารถติดตามสถานะการเงินได้อย่างละเอียด ใช้งานง่าย และรองรับการจัดการบัญชีหลายรูปแบบ

---

## 🌟 ฟีเจอร์หลัก (Key Features)

### 1. **หน้าภาพรวม (Dashboard)**
- สรุปยอดเงินคงเหลือรวม (Current Balance), รายรับ (Income) และรายจ่าย (Expense) ของเดือนปัจจุบัน
- กราฟแสดงแนวโน้มการใช้จ่ายรายวันหรือรายสัปดาห์
- แสดงรายการธุรกรรมล่าสุด (Recent Transactions) เพื่อการเข้าถึงที่รวดเร็ว

### 2. **จัดการธุรกรรม (Transactions)**
- บันทึก รายรับ, รายจ่าย และการโอนเงินระหว่างบัญชี
- กำหนดหมวดหมู่ (Category), วันที่, และหมายเหตุ (Note)
- ระบบ **Tags** สำหรับจัดกลุ่มธุรกรรมเพิ่มเติม
- ค้นหาและคัดกรองรายการย้อนหลัง

- รองรับบัญชีหลายประเภท: **เงินสด (Cash), บัญชีธนาคาร (Bank), บัตรเครดิต (Credit Card), เงินออม (Savings) และการลงทุน (Investment)**
- จัดการพอร์ตการลงทุน: บันทึกเงินต้น (Principal), มูลค่าปัจจุบัน (Current Value), รอบปันผล/ดอกเบี้ย และวันครบกำหนด
- ดูยอดเงินแยกตามรายบัญชี และจัดการยอดเงินคงเหลือ (Sync/Recalculate) จากรายการธุรกรรม
- **ความมั่งคั่งสุทธิ (Net Worth)**: แสดงภาพรวมสินทรัพย์ทั้งหมดลบด้วยหนี้สินบัตรเครดิต

### 4. **การวางแผนงบประมาณ (Budgets)**
- ตั้งงบประมาณรายเดือนแยกตามหมวดหมู่ (เช่น ค่าอาหาร, ค่าเดินทาง)
- ระบบแจ้งเตือน (Alert Threshold) เมื่อใช้จ่ายเกินเปอร์เซ็นต์ที่กำหนด (เช่น 80% ของงบ)
- แถบแสดงสถานะ (Progress Bar) เพื่อดูว่าเหลืองบเท่าไหร่

### 5. **การจัดการบัตรเครดิต (Credit Card Management)**
- ติดตามวงเงินที่ใช้ไปและวงเงินคงเหลือ
- บันทึก **วันตัดรอบบิล (Statement Date)** และ **วันครบกำหนดชำระ (Due Date)**
- ช่วยให้ไม่พลาดการชำระหนี้บัตรเครดิต

### 6. **รายงานและสถิติ (Reports)**
- กราฟวงกลม (Pie Chart) แสดงสัดส่วนรายจ่ายตามหมวดหมู่
- กราฟแท่ง (Bar Chart) เปรียบเทียบรายรับ-รายจ่ายในแต่ละเดือน
- วิเคราะห์พฤติกรรมการเงินเพื่อการวางแผนที่ดีขึ้น

### 7. **ระบบสมาชิกและโปรไฟล์ (Auth & Profile)**
- ระบบสมัครสมาชิกและล็อกอินผ่าน Supabase Auth
- ตั้งค่าโปรไฟล์, ชื่อ, และรูปภาพ (Avatar)
- เลือกสกุลเงินหลักที่ต้องการใช้งาน (เริ่มต้นที่ THB)

### 8. **การสำรองข้อมูล (Backup & Restore)**
- สำรองข้อมูลธุรกรรมและบัญชีทั้งหมดเป็นไฟล์ JSON
- สามารถ Restore ข้อมูลกลับมาได้เมื่อต้องการย้ายเครื่องหรือป้องกันข้อมูลสูญหาย

---

## 🗄️ โครงสร้างฐานข้อมูล (Database Schema)

อ้างอิงจากไฟล์ `config/SQL Structure.md` ฐานข้อมูลถูกออกแบบบน Supabase (PostgreSQL) โดยมีการใช้งาน **Row Level Security (RLS)** เพื่อความปลอดภัยของข้อมูล

| Table | คำอธิบาย | Key Columns |
| :--- | :--- | :--- |
| **`profiles`** | ข้อมูลส่วนตัวผู้ใช้ | `id`, `full_name`, `avatar_url`, `currency` |
| **`accounts`** | บัญชีเงินต่างๆ | `id`, `user_id`, `name`, `type`, `balance`, `initial_balance`, `color` |
| **`categories`** | หมวดหมู่รายรับ/รายจ่าย | `id`, `user_id`, `name`, `type`, `icon`, `color`, `is_default` |
| **`transactions`** | บันทึกธุรกรรมเงิน | `id`, `user_id`, `account_id`, `category_id`, `type`, `amount`, `date`, `tags` |
| **`budgets`** | การตั้งงบประมาณ | `id`, `user_id`, `category_id`, `amount`, `period`, `alert_threshold` |
| **`credit_cards`** | รายละเอียดบัตรเครดิต | `id`, `account_id`, `bank_name`, `credit_limit`, `statement_date`, `due_date` |
| **`investments`** | พอร์ตการลงทุน | `id`, `account_id`, `principal_amount`, `current_value`, `dividend_schedule` |

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend:**
  - HTML5 & Vanilla JavaScript (ES6+ Module)
  - **TailwindCSS**: สำหรับการออกแบบ UI ที่สวยงามและ Responsive
  - **Lucide Icons**: ชุดไอคอนที่ทันสมัย
  - **Chart.js**: สำหรับการแสดงผลกราฟและรายงาน
- **Backend & Database:**
  - **Supabase**: จัดการฐานข้อมูล (PostgreSQL), การยืนยันตัวตน (Auth), และการเก็บไฟล์ (Storage)
  - **RLS (Row Level Security)**: ป้องกันไม่ให้ผู้ใช้แอบดูข้อมูลของกันและกัน

---

## 🚀 การเริ่มต้นใช้งาน (Setup Guide)

1. **ตั้งค่าฐานข้อมูล:**
   - คัดลอกคำสั่ง SQL จากไฟล์ `config/SQL Structure.md` ไปรันใน **SQL Editor** ของ Supabase Project ของคุณ
2. **การเชื่อมต่อ API:**
   - แก้ไขไฟล์ `js/config.js` โดยใส่ `SUPABASE_URL` และ `SUPABASE_ANON_KEY` ที่ได้จากหน้า Dashboard ของ Supabase
3. **การรันโปรเจกต์:**
   - เปิดไฟล์ `index.html` ผ่าน Live Server หรือรันบน Web Server ทั่วไป

### One-time SQLite Migration

ถ้าคุณมีข้อมูลเก่าใน SQLite และต้องการย้าย `credit_cards` ไป Supabase ให้ใช้สคริปต์นี้:

```bash
npm install
npm run migrate:sqlite -- --sqlite "C:\path\to\old.db" --supabase-url "https://YOUR_PROJECT.supabase.co" --service-role-key "YOUR_SERVICE_ROLE_KEY" --user-id "YOUR_AUTH_USER_UUID"
```

- ต้องใช้ Node.js 18 ขึ้นไป
- ใช้ `service role key` สำหรับงานย้ายข้อมูลเท่านั้น และอย่าใส่ไว้ในโค้ดฝั่ง client
- ถ้าต้องการลบข้อมูลที่ย้ายไปแล้วและรันใหม่ ให้เพิ่ม `--replace-existing`
- ถ้าต้องการตรวจสอบข้อมูลก่อนเขียนจริง ให้เพิ่ม `--dry-run`

---

## 📝 บันทึกสำหรับการพัฒนาต่อ (Developer Notes)
- หากต้องการเพิ่มฟีเจอร์ใหม่ ให้ดูโครงสร้างใน `js/components/` ซึ่งมีการแยก Logic ของแต่ละหน้าไว้ชัดเจน
- การติดต่อฐานข้อมูลหลักอยู่ที่ `js/db.js` ซึ่งรวบรวมฟังก์ชัน CRUD ทั้งหมดไว้
- ธีมสีหลักถูกควบคุมผ่าน Tailwind Config และ CSS ใน `css/styles.css`
