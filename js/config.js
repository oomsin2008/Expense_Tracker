// ===================================================
// Config — ค่าเชื่อมต่อ Supabase
// เปลี่ยนค่า 2 ตัวนี้เป็นของ project คุณเอง
// ===================================================

const DEFAULT_SUPABASE_URL = 'https://uvqvscadftgyohbbjhct.supabase.co';       // ← เปลี่ยนตรงนี้
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2cXZzY2FkZnRneW9oYmJqaGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTUzMjUsImV4cCI6MjA5MTI5MTMyNX0.ujiWNsQiwymc27btYHNQLoK0ojaG_10YPJRv8hEpkT0';  // ← เปลี่ยนตรงนี้

const isLocalHost = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(window.location.hostname) || window.location.hostname.endsWith('.local');

const safeStorageRead = (key) => {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

window.AppEnv = {
  mode: isLocalHost ? 'local' : 'production',
  isLocalHost,
  hostname: window.location.hostname,
  origin: window.location.origin
};

window.AppConfig = {
  supabaseUrl: isLocalHost
    ? safeStorageRead('expense_tracker_supabase_url') || DEFAULT_SUPABASE_URL
    : DEFAULT_SUPABASE_URL,
  supabaseAnonKey: isLocalHost
    ? safeStorageRead('expense_tracker_supabase_anon_key') || DEFAULT_SUPABASE_ANON_KEY
    : DEFAULT_SUPABASE_ANON_KEY
};

// ใช้ชื่อ supabaseClient แทน supabase เพื่อไม่ให้ชนกับ CDN
const supabaseClient = window.supabase.createClient(window.AppConfig.supabaseUrl, window.AppConfig.supabaseAnonKey);

// Helper สำหรับสร้าง URL ของหน้าในแอป
// ใช้ path แบบ relative เพื่อให้รันได้ทั้ง Live Server, Vercel และโฮสต์ที่อยู่ใน subfolder
window.AppUrl = {
  resolve(path = '') {
    const normalizedPath = String(path).replace(/^\//, '');
    return new URL(normalizedPath, window.location.href).toString();
  },
  currentPage() {
    const page = window.location.pathname.split('/').pop() || 'index.html';
    return page;
  },
  index() {
    return this.resolve('index.html');
  },
  dashboard() {
    return this.resolve('dashboard.html');
  }
};

const Theme = {
  color(varName, fallback = '') {
    try {
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      return value || fallback;
    } catch (_) {
      return fallback;
    }
  },

  alpha(hex, opacity = 1) {
    const clean = String(hex || '').replace('#', '');
    const parsed = clean.length === 3
      ? clean.split('').map(ch => ch + ch).join('')
      : clean;
    const intVal = Number.parseInt(parsed, 16);
    if (Number.isNaN(intVal)) return `rgba(59,130,246,${opacity})`;
    const r = (intVal >> 16) & 255;
    const g = (intVal >> 8) & 255;
    const b = intVal & 255;
    return `rgba(${r},${g},${b},${opacity})`;
  },

  palette() {
    return {
      primary: this.color('--color-primary', '#3B82F6'),
      success: this.color('--color-success', '#10B981'),
      danger: this.color('--color-danger', '#EF4444'),
      warning: this.color('--color-warning', '#F59E0B'),
      warningStrong: this.color('--color-warning-strong', '#F97316'),
      purple: this.color('--color-purple', '#8B5CF6'),
      pink: this.color('--color-pink', '#EC4899'),
      cyan: this.color('--color-cyan', '#06B6D4'),
      slate: this.color('--color-slate', '#6B7280'),
      slateLight: this.color('--color-slate-light', '#94A3B8'),
      white: this.color('--color-white', '#FFFFFF'),
      chart: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6B7280', '#14B8A6'],
    };
  },
};

// ===================================================
// Account Preferences (Local Storage)
// สำหรับเก็บค่าการแสดงผล (Hide, Exclude Sum, Order)
// ===================================================
window.AccountPrefs = {
  getAll() {
    try {
      return JSON.parse(localStorage.getItem('expense_account_prefs') || '{}');
    } catch {
      return {};
    }
  },
  get(id) {
    return this.getAll()[id] || { hidden: false, excludeSum: false, order: 0 };
  },
  set(id, prefs) {
    const all = this.getAll();
    all[id] = { ...this.get(id), ...prefs };
    localStorage.setItem('expense_account_prefs', JSON.stringify(all));
  }
};

// ===================================================
// Format Helpers — สำหรับจัดรูปแบบตัวเลขและวันที่
// ===================================================
window.Format = {
  money(val) {
    const n = parseFloat(val || 0);
    return n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  },
  currency(val) {
    const n = parseFloat(val || 0);
    return '฿' + n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  },
  number(val) {
    return parseFloat(val || 0).toLocaleString('th-TH');
  },
  compactNumber(val) {
    const n = parseFloat(val || 0);
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toLocaleString('th-TH');
  },
  date(val) {
     if (!val) return '-';
     return new Date(val).toLocaleDateString('th-TH');
  }
};
