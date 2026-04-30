// ===================================================
// Database Helper — ฟังก์ชัน CRUD ทั้งหมดรวมไว้ที่นี่
// ทุก feature เรียกใช้ผ่าน DB object
// ===================================================

const DB = {

  // =========================
  // PROFILES
  // =========================

  async getProfile(userId) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) console.error('getProfile:', error);
    return data;
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabaseClient
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) console.error('updateProfile:', error);
    return { data, error };
  },

  // =========================
  // ACCOUNTS
  // =========================

  async getAccounts(userId) {
    const { data, error } = await supabaseClient
      .from('accounts')
      .select('*, investments (*)') // ดึงข้อมูลการลงทุนพ่วงมาด้วย
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) console.error('getAccounts:', error);
    return data || [];
  },

  async createAccount(account) {
    const { data, error } = await supabaseClient
      .from('accounts')
      .insert(account)
      .select()
      .single();
    if (error) console.error('createAccount:', error);
    return { data, error };
  },

  async updateAccount(id, updates) {
    const { data, error } = await supabaseClient
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) console.error('updateAccount:', error);
    return { data, error };
  },

  async deleteAccount(id) {
    // Soft delete — แค่ปิดการใช้งาน ไม่ลบจริง
    const { error } = await supabaseClient
      .from('accounts')
      .update({ is_active: false })
      .eq('id', id);
    if (error) console.error('deleteAccount:', error);
    return { error };
  },

  // จัดการข้อมูลการลงทุนเพิ่มเติม
  async saveInvestment(investmentData) {
    const { data, error } = await supabaseClient
      .from('investments')
      .upsert(investmentData, { onConflict: 'account_id' })
      .select()
      .single();
    if (error) console.error('saveInvestment:', error);
    return { data, error };
  },

  // =========================
  // CATEGORIES
  // =========================

  async getCategories(userId) {
    const { data, error } = await supabaseClient
      .from('categories')
      .select('*, parent:parent_id (id, name, type, icon, color)')
      .or(`is_default.eq.true,user_id.eq.${userId}`)
      .order('is_default', { ascending: true }) // เอาที่ User สร้างเอง (is_default=false) ขึ้นก่อน
      .order('position', { ascending: true })
      .order('name');
    if (error) console.error('getCategories:', error);
    return data || [];
  },

  async getCategoriesByType(userId, type) {
    const { data, error } = await supabaseClient
      .from('categories')
      .select('*, parent:parent_id (id, name, type, icon, color)')
      .or(`is_default.eq.true,user_id.eq.${userId}`)
      .eq('type', type)
      .order('position', { ascending: true })
      .order('name');
    if (error) console.error('getCategoriesByType:', error);
    return data || [];
  },

  buildCategoryTree(categories) {
    const roots = categories.filter(c => !c.parent_id);
    const subs = categories.filter(c => c.parent_id);
    return roots.map(root => ({
      ...root,
      children: subs
        .filter(s => s.parent_id === root.id)
        .sort((a, b) => (a.position || 0) - (b.position || 0) || a.name.localeCompare(b.name))
    })).sort((a, b) => {
      // เรียงลำดับ: Custom (is_default:false) มาก่อน Default (is_default:true)
      if (a.is_default !== b.is_default) {
        return a.is_default ? 1 : -1;
      }
      return (a.position || 0) - (b.position || 0) || a.name.localeCompare(b.name);
    });
  },

  async createCategory(category) {
    const { data, error } = await supabaseClient
      .from('categories')
      .insert(category)
      .select()
      .single();
    if (error) console.error('createCategory:', error);
    return { data, error };
  },

  async checkCategoryUsage(categoryId) {
    const { count, error } = await supabaseClient
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId);
    return { count: count || 0, error };
  },

  async updateCategory(id, updates) {
    const { data, error } = await supabaseClient
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) console.error('updateCategory:', error);
    return { data: data ? data[0] : null, error };
  },

  async deleteCategory(id, replacementId = null) {
    if (replacementId) {
      await supabaseClient
        .from('transactions')
        .update({ category_id: replacementId })
        .eq('category_id', id);
    }
    const { error } = await supabaseClient
      .from('categories')
      .delete()
      .eq('id', id);
    return { error };
  },

  // =========================
  // TRANSACTIONS
  // =========================

  async getTransactions(userId, options = {}) {
    const {
      limit = 10,
      offset = 0,
      accountId = null,
      categoryId = null,
      type = null,
      dateFrom = null,
      dateTo = null,
      accountType = null,
      search = null,
      sortBy = options.sortBy !== undefined ? options.sortBy : 'amount', // Default to 'amount' if not provided
      ascending = options.ascending !== undefined ? options.ascending : (options.type === 'expense'), // Default based on type if not provided
      onProgress = null // Callback สำหรับรายงานความคืบหน้า (loaded, total)
    } = options;

    const buildQuery = (start, end) => {
      let query = supabaseClient
        .from('transactions')
        .select(`
            *,
            accounts:account_id (name, color, type),
            categories:category_id (id, name, icon, color)
          `, { count: 'exact' })
        .eq('user_id', userId);

      // Apply primary sorting
      if (sortBy === 'account_name') {
        query = query.order('name', { foreignTable: 'accounts', ascending: ascending });
      } else if (sortBy === 'category_name') {
        query = query.order('name', { foreignTable: 'categories', ascending: ascending });
      } else {
        query = query.order(sortBy, { ascending: ascending }); // sortBy is now guaranteed to have a value
      }

      // secondary sort for consistency
      if (sortBy !== 'date') {
        query = query.order('date', { ascending: false });
      }
      query = query.order('created_at', { ascending: false });

      if (accountId) {
        if (Array.isArray(accountId)) query = query.in('account_id', accountId);
        else query = query.eq('account_id', accountId);
      }
      if (accountType) query = query.eq('accounts.type', accountType);
      if (categoryId) query = query.eq('category_id', categoryId);
      if (type) query = query.eq('type', type);
      if (dateFrom) query = query.gte('date', dateFrom);
      if (dateTo) query = query.lte('date', dateTo);
      if (search) {
        query = query.or(`note.ilike.%${search}%,from_or_to.ilike.%${search}%`);
      }
      
      return query.range(start, end);
    };

    // หาก Limit > 1000 ให้ทำการดึงข้อมูลหลายรอบ (Auto-Pagination)
    if (limit > 1000) {
      let allData = [];
      let currentOffset = offset;
      let totalToFetch = limit;
      let hasMore = true;
      let serverCount = 0;

      while (hasMore && allData.length < totalToFetch) {
        const batchSize = Math.min(1000, totalToFetch - allData.length);
        const { data, error, count } = await buildQuery(currentOffset, currentOffset + batchSize - 1);
        
        if (error) {
          console.error('getTransactions Loop Error:', error);
          break;
        }

        serverCount = count || 0;
        allData = allData.concat(data || []);
        currentOffset += (data?.length || 0);

        // รายงานความคืบหน้า
        if (onProgress) {
          const actualTotal = Math.min(totalToFetch, serverCount);
          onProgress(allData.length, actualTotal);
        }
        
        if (!data || data.length < batchSize || currentOffset >= serverCount) {
          hasMore = false;
        }
      }
      return { data: allData, count: allData.length };
    }

    // กรณีปกติ (Limit <= 1000)
    const { data, error, count } = await buildQuery(offset, offset + limit - 1);
    if (error) console.error('getTransactions:', error);
    return { data: data || [], count: count || 0 };
  },

  async createTransaction(transaction) {
    const { data, error } = await supabaseClient
      .from('transactions')
      .insert(transaction)
      .select()
      .single();
    if (error) {
      console.error('createTransaction:', error);
      Toast.show('ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่', 'error');
      return { data: null, error };
    }

    const balanceResult = await this._updateAccountBalance(
      transaction.account_id,
      transaction.type,
      transaction.amount,
      'add'
    );
    if (balanceResult?.error) {
      await supabaseClient.from('transactions').delete().eq('id', data.id);
      return { data: null, error: balanceResult.error };
    }
    return { data, error: null };
  },

  async updateTransaction(id, oldTx, newTx) {
    const reverseResult = await this._updateAccountBalance(
      oldTx.account_id, oldTx.type, oldTx.amount, 'reverse'
    );
    if (reverseResult?.error) return { data: null, error: reverseResult.error };

    const { data, error } = await supabaseClient
      .from('transactions')
      .update(newTx)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('updateTransaction Error Details:', error);
      await this._updateAccountBalance(oldTx.account_id, oldTx.type, oldTx.amount, 'add');
      return { data: null, error };
    }

    const addResult = await this._updateAccountBalance(
      newTx.account_id, newTx.type, newTx.amount, 'add'
    );
    if (addResult?.error) {
      await supabaseClient.from('transactions').update(oldTx).eq('id', id);
      await this._updateAccountBalance(oldTx.account_id, oldTx.type, oldTx.amount, 'add');
      return { data: null, error: addResult.error };
    }

    return { data, error: null };
  },

  async deleteTransaction(transaction) {
    const { error } = await supabaseClient
      .from('transactions')
      .delete()
      .eq('id', transaction.id);
    if (error) return { error };

    const reverseResult = await this._updateAccountBalance(
      transaction.account_id,
      transaction.type,
      transaction.amount,
      'reverse'
    );
    return { error: reverseResult?.error || null };
  },

  async bulkUpdateTransactions(updates) {
    // ใช้ Promise.all เพื่ออัปเดตแต่ละรายการแยกกัน
    // การใช้ update() จะอนุญาตให้ส่งเฉพาะฟิลด์ที่ต้องการเปลี่ยนได้โดยไม่ติด Not-Null constraint ของฟิลด์อื่น
    const promises = updates.map(item => 
      supabaseClient
        .from('transactions')
        .update({ is_checked: item.is_checked })
        .eq('id', item.id)
    );

    const results = await Promise.all(promises);
    const firstError = results.find(r => r.error);
    
    if (firstError) console.error('bulkUpdateTransactions error:', firstError.error);
    return { data: results.map(r => r.data), error: firstError?.error };
  },

  async _updateAccountBalance(accountId, type, amount, action) {
    try {
      const { data: account, error: fetchError } = await supabaseClient
        .from('accounts')
        .select('id, balance')
        .eq('id', accountId)
        .single();

      if (fetchError || !account) return { error: fetchError || new Error('ACCOUNT_NOT_FOUND') };

      const oldBalance = Number(account.balance || 0);
      let newBalance = oldBalance;

      if (action === 'add') {
        newBalance += (type === 'income') ? amount : -amount;
      } else if (action === 'reverse') {
        newBalance += (type === 'income') ? -amount : amount;
      }

      const { error: updateError } = await supabaseClient
        .from('accounts')
        .update({ balance: newBalance })
        .eq('id', accountId);

      return { error: updateError };
    } catch (err) {
      return { error: err };
    }
  },

  // =========================
  // BUDGETS
  // =========================

  async getBudgets(userId) {
    const { data, error } = await supabaseClient
      .from('budgets')
      .select(`*, categories:category_id (name, icon, color)`)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async getBudgetSpent(userId, categoryId, period, startDate) {
    const range = this._getDateRange(period, startDate);
    const { data: subCats } = await supabaseClient.from('categories').select('id').eq('parent_id', categoryId);
    const allCategoryIds = [categoryId, ...(subCats || []).map(c => c.id)];

    const { data, error } = await supabaseClient
      .from('transactions')
      .select('amount')
      .eq('user_id', userId)
      .in('category_id', allCategoryIds)
      .eq('type', 'expense')
      .gte('date', range.from)
      .lte('date', range.to);

    if (error) return 0;
    return data.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  },

  _getDateRange(period, startDate) {
    const now = new Date();
    let from, to;
    if (period === 'monthly') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'weekly') {
      const day = now.getDay();
      from = new Date(now);
      from.setDate(now.getDate() - day);
      to = new Date(from);
      to.setDate(from.getDate() + 6);
    } else {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
    }
    return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
  },

  async createBudget(budget) {
    const { data, error } = await supabaseClient.from('budgets').insert(budget).select().single();
    return { data, error };
  },

  async updateBudget(id, updates) {
    const { data, error } = await supabaseClient.from('budgets').update(updates).eq('id', id).select().single();
    return { data, error };
  },

  async deleteBudget(id) {
    const { error } = await supabaseClient.from('budgets').update({ is_active: false }).eq('id', id);
    return { error };
  },

  // Server-side aggregation ด้วย RPC — คืนแค่ ~20-50 rows แทนที่จะดึง raw transactions ทั้งหมด
  async getSpendingByCategory(userId, dateFrom, dateTo) {
    const { data, error } = await supabaseClient
      .rpc('get_spending_by_category', {
        p_user_id: userId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });
    if (error) {
      console.error('getSpendingByCategory RPC:', error);
      return [];
    }
    return (data || []).map(row => ({
      category_id: row.category_id,
      categories: {
        id: row.category_id,
        name: row.cat_name,
        icon: row.cat_icon,
        color: row.cat_color,
        parent_id: row.cat_parent_id,
      },
      total: Number(row.total),
      txCount: Number(row.tx_count),
    }));
  },

  // ดึง min/max ปีของธุรกรรมโดยใช้ RPC (คืน 1 row แทนการดึง 100k records)
  async getTransactionYearRange(userId) {
    const { data, error } = await supabaseClient
      .rpc('get_transaction_year_range', { p_user_id: userId });
    if (error) {
      console.error('getTransactionYearRange RPC:', error);
      return null;
    }
    return data?.[0] || null;
  },

  // รวมค่าใช้จ่ายต่อ category ต่อปี ด้วย RPC — คืน ~100 rows แทนการดึง raw transactions หลายแสน rows
  async getAnnualSpendingByCategory(userId, yearFrom, yearTo) {
    const { data, error } = await supabaseClient
      .rpc('get_annual_spending_by_category', {
        p_user_id: userId,
        p_year_from: yearFrom,
        p_year_to: yearTo,
      });
    if (error) {
      console.error('getAnnualSpendingByCategory RPC:', error);
      return null; // null = RPC ยังไม่ถูก deploy → caller จะ fallback ไปดึง raw transactions
    }
    return data || [];
  },

  async getHistoricalSpendingByCategory(userId, dateFrom, dateTo) {
    return this.getSpendingByCategory(userId, dateFrom, dateTo);
  },

  // =========================
  // CREDIT CARDS
  // =========================

  async getCreditCards(userId) {
    const { data, error } = await supabaseClient
      .from('credit_cards')
      .select(`*, accounts:account_id (name, balance, color)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return data || [];
  },

  async createCreditCard(card) {
    const { data, error } = await supabaseClient.from('credit_cards').insert(card).select().single();
    return { data, error };
  },

  async updateCreditCard(id, updates) {
    const { data, error } = await supabaseClient.from('credit_cards').update(updates).eq('id', id).select().single();
    return { data, error };
  },

  async deleteCreditCard(id) {
    const { error } = await supabaseClient.from('credit_cards').delete().eq('id', id);
    return { error };
  },

  // =========================
  // SCHEDULES (NEW)
  // =========================

  async getSchedules(userId) {
    const { data, error } = await supabaseClient
      .from('schedules')
      .select(`*, accounts:account_id (name, color), categories:category_id (name, icon, color)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        console.warn('Table "schedules" does not exist. Please run the SQL setup.');
        return [];
      }
      console.error('getSchedules:', error);
      return [];
    }
    return data || [];
  },

  async createSchedule(schedule) {
    const { data, error } = await supabaseClient
      .from('schedules')
      .insert({ ...schedule, user_id: schedule.user_id || this.userId })
      .select()
      .single();
    return { data, error };
  },

  async updateSchedule(id, updates) {
    const { data, error } = await supabaseClient
      .from('schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    return { data, error };
  },

  async deleteSchedule(id) {
    const { error } = await supabaseClient
      .from('schedules')
      .delete()
      .eq('id', id);
    return { error };
  },

  /**
   * ระบบตรวจสอบและรัน Schedules อัตโนมัติ
   */
  async processSchedules(userId) {
    console.log('Processing schedules...');
    const schedules = await this.getSchedules(userId);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    let processedCount = 0;
    
    for (const s of schedules) {
      if (!s.is_active) continue;
      
      // ถ้าวันรันครั้งถัดไปมาถึงแล้ว
      if (s.next_run_date && s.next_run_date <= todayStr) {
        console.log(`Running schedule: ${s.note || 'Untitled'}`);
        
        // 1. สร้าง Transaction จริง
        const txData = {
          user_id: userId,
          account_id: s.account_id,
          category_id: s.category_id,
          amount: s.amount,
          type: s.type,
          date: s.next_run_date,
          note: `[Auto] ${s.note || ''}`,
          from_or_to: s.from_or_to,
          is_scheduled: true
        };
        
        const { error: txErr } = await this.createTransaction(txData);
        
        if (!txErr) {
          // 2. คำนวณวันรันครั้งถัดไป
          const nextDate = new Date(s.next_run_date);
          if (s.frequency === 'daily') nextDate.setDate(nextDate.getDate() + 1);
          else if (s.frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          else if (s.frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
          else if (s.frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
          
          const nextDateStr = nextDate.toISOString().split('T')[0];
          
          // ตรวจสอบ End Date
          const isEnd = s.end_date && nextDateStr > s.end_date;
          
          await this.updateSchedule(s.id, {
            last_run_at: new Date().toISOString(),
            next_run_date: isEnd ? null : nextDateStr,
            is_active: !isEnd
          });
          
          processedCount++;
        } else {
          console.error('Error running schedule:', txErr);
        }
      }
    }
    
    return processedCount;
  },

  // =========================
  // DASHBOARD STATS
  // =========================

  async getDashboardStats(userId) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [accountsRes, incomeRes, expenseRes] = await Promise.all([
      supabaseClient.from('accounts').select('id, balance, type').eq('user_id', userId).eq('is_active', true),
      supabaseClient.from('transactions').select('amount, categories:category_id (name)').eq('user_id', userId).eq('type', 'income').gte('date', monthStart).lte('date', monthEnd),
      supabaseClient.from('transactions').select('amount, categories:category_id (name)').eq('user_id', userId).eq('type', 'expense').gte('date', monthStart).lte('date', monthEnd)
    ]);

    const accounts = accountsRes.data || [];
    const totalBalance = accounts.reduce((sum, a) => {
      const prefs = window.AccountPrefs ? window.AccountPrefs.get(a.id) : {};
      return prefs.excludeSum ? sum : sum + parseFloat(a.balance);
    }, 0);

    const creditDebt = accounts
      .filter(a => a.type === 'credit_card')
      .reduce((sum, a) => {
        const prefs = window.AccountPrefs ? window.AccountPrefs.get(a.id) : {};
        return prefs.excludeSum ? sum : sum + Math.abs(parseFloat(a.balance));
      }, 0);

    // Exclude 'Transfer between accounts', 'Transfer+', and 'Transfer-' from stats
    const transferNames = ['transfer between accounts', 'โอนเงินระหว่างบัญชี', 'transfer+', 'transfer-', 'โอน+', 'โอน-'];
    
    const monthIncome = (incomeRes.data || [])
      .filter(tx => {
        const catName = (tx.categories?.name || '').toLowerCase();
        return !transferNames.includes(catName) && !catName.includes('transfer') && !catName.includes('โอน');
      })
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
      
    const monthExpense = (expenseRes.data || [])
      .filter(tx => {
        const catName = (tx.categories?.name || '').toLowerCase();
        return !transferNames.includes(catName) && !catName.includes('transfer') && !catName.includes('โอน');
      })
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

    return { totalBalance, monthIncome, monthExpense, creditDebt };
  },

  async getMonthlyTrend(userId, months = 6) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1).toISOString().split('T')[0];
    const { data, error } = await supabaseClient
      .from('transactions')
      .select('type, amount, date, categories:category_id (name)')
      .eq('user_id', userId)
      .gte('date', startDate)
      .order('date');
      
    if (error) return {};
    const grouped = {};
    const transferNames = ['transfer between accounts', 'โอนเงินระหว่างบัญชี', 'transfer+', 'transfer-', 'โอน+', 'โอน-'];
    
    (data || []).forEach(tx => {
      // Exclude transfers from trend
      const catName = (tx.categories?.name || '').toLowerCase();
      if (transferNames.includes(catName) || catName.includes('transfer') || catName.includes('โอน')) return;
      
      const monthKey = tx.date.substring(0, 7);
      if (!grouped[monthKey]) grouped[monthKey] = { income: 0, expense: 0 };
      grouped[monthKey][tx.type] += parseFloat(tx.amount);
    });
    return grouped;
  },

  async getExpenseByCategory(userId, dateFrom, dateTo) {
    const { data, error } = await supabaseClient.from('transactions').select(`amount, categories:category_id (name, color)`).eq('user_id', userId).eq('type', 'expense').gte('date', dateFrom).lte('date', dateTo);
    if (error) return [];
    const grouped = {};
    const transferNames = ['transfer between accounts', 'โอนเงินระหว่างบัญชี', 'transfer+', 'transfer-', 'โอน+', 'โอน-'];
    
    (data || []).forEach(tx => {
      const name = tx.categories?.name || 'อื่นๆ';
      const catNameLower = name.toLowerCase();
      
      // Exclude transfers from category breakdown
      if (transferNames.includes(catNameLower) || catNameLower.includes('transfer') || catNameLower.includes('โอน')) return;
      
      const color = tx.categories?.color || '#cbd5e1';
      if (!grouped[name]) grouped[name] = { name, color, total: 0 };
      grouped[name].total += parseFloat(tx.amount);
    });
    return Object.values(grouped).sort((a, b) => b.total - a.total);
  },

  // =========================
  // DATA MANAGEMENT & BACKUP
  // =========================

  async backupAllData(userId) {
    try {
      const [profile, accounts, creditCards, categories, transactions, budgets, schedules] = await Promise.all([
        this.getProfile(userId),
        this.getAccounts(userId),
        this.getCreditCards(userId),
        this.getCategories(userId),
        this.getTransactions(userId, { limit: 100000 }), // ดึงข้อมูลธุรกรรมทั้งหมด
        this.getBudgets(userId),
        this.getSchedules(userId)
      ]);

      return {
        backup_info: {
          version: "3.5",
          app: "Expense Tracker",
          backup_date: new Date().toISOString(),
          user_id: userId
        },
        profile,
        accounts,
        creditCards,
        categories: categories.filter(c => !c.is_default), // เก็บเฉพาะที่สร้างเอง
        transactions: transactions.data,
        budgets,
        schedules
      };
    } catch (err) {
      console.error('backupAllData:', err);
      return null;
    }
  },

  async restoreAllData(userId, data) {
    try {
      // 1. ล้างข้อมูลเดิม (Danger Zone)
      await Promise.all([
        supabaseClient.from('transactions').delete().eq('user_id', userId),
        supabaseClient.from('budgets').delete().eq('user_id', userId),
        supabaseClient.from('schedules').delete().eq('user_id', userId),
        supabaseClient.from('credit_cards').delete().eq('user_id', userId),
        supabaseClient.from('accounts').delete().eq('user_id', userId),
        supabaseClient.from('categories').delete().eq('user_id', userId).eq('is_default', false)
      ]);

      // 2. ทยอยนำเข้าข้อมูลใหม่
      if (data.categories?.length > 0) {
        await supabaseClient.from('categories').insert(data.categories.map(c => {
          const { parent, ...clean } = c; // ตัดข้อมูล relation ออก
          return { ...clean, user_id: userId };
        }));
      }

      if (data.accounts?.length > 0) {
        await supabaseClient.from('accounts').insert(data.accounts.map(a => {
          const { investments, ...acc } = a;
          return { ...acc, user_id: userId };
        }));
      }

      if (data.creditCards?.length > 0) {
        await supabaseClient.from('credit_cards').insert(data.creditCards.map(c => {
          const { accounts, ...card } = c;
          return { ...card, user_id: userId };
        }));
      }

      if (data.transactions?.length > 0) {
        // แบ่ง Chunk สำหรับธุรกรรมจำนวนมาก
        const txs = data.transactions.map(t => {
          const { accounts, categories, ...tx } = t;
          return { ...tx, user_id: userId };
        });
        const CHUNK_SIZE = 500;
        for (let i = 0; i < txs.length; i += CHUNK_SIZE) {
          await supabaseClient.from('transactions').insert(txs.slice(i, i + CHUNK_SIZE));
        }
      }

      if (data.budgets?.length > 0) {
        await supabaseClient.from('budgets').insert(data.budgets.map(b => {
          const { categories, ...budget } = b;
          return { ...budget, user_id: userId };
        }));
      }

      if (data.schedules?.length > 0) {
        await supabaseClient.from('schedules').insert(data.schedules.map(s => {
          const { accounts, categories, ...sched } = s;
          return { ...sched, user_id: userId };
        }));
      }

      // 3. อัปเดต Profile (ถ้ามี)
      if (data.profile) {
        await this.updateProfile(userId, {
          full_name: data.profile.full_name,
          currency: data.profile.currency
        });
      }

      return { error: null };
    } catch (err) {
      console.error('Restore Error:', err);
      return { error: err };
    }
  },

  async deleteTransactionsOnly(userId) {
    const { error } = await supabaseClient.from('transactions').delete().eq('user_id', userId);
    if (!error) {
      const accounts = await this.getAccounts(userId);
      for (const acc of accounts) {
        await supabaseClient.from('accounts').update({ balance: acc.initial_balance || 0 }).eq('id', acc.id);
      }
    }
    return { error };
  },

  async deleteAccountsOnly(userId) {
    await supabaseClient.from('transactions').delete().eq('user_id', userId);
    await supabaseClient.from('credit_cards').delete().eq('user_id', userId);
    const { error } = await supabaseClient.from('accounts').delete().eq('user_id', userId);
    return { error };
  },

  async deleteCategoriesOnly(userId) {
    return await supabaseClient.from('categories').delete().eq('user_id', userId).eq('is_default', false);
  },

  async recalculateAccountBalance(accountId) {
    try {
      const { data: account } = await supabaseClient.from('accounts').select('initial_balance').eq('id', accountId).single();
      // เพิ่ม limit เป็น 20,000 เพื่อรองรับข้อมูลจำนวนมาก (เช่น 11,000 records)
      const { data: transactions } = await supabaseClient.from('transactions')
        .select('type, amount')
        .eq('account_id', accountId)
        .limit(20000);
        
      let balance = parseFloat(account.initial_balance || 0);
      (transactions || []).forEach(tx => { 
        balance += (tx.type === 'income' ? 1 : -1) * parseFloat(tx.amount); 
      });
      
      const { error } = await supabaseClient.from('accounts').update({ balance }).eq('id', accountId);
      return { error, balance };
    } catch (err) {
      console.error('recalculateAccountBalance error:', err);
      return { error: err };
    }
  },

  // Missing functions called by settings.js
  async exportAllData(userId) {
    return this.backupAllData(userId);
  },

  async importAllData(userId, data) {
    return this.restoreAllData(userId, data);
  },

  async exportTransactionsToCSV(userId) {
    const { data: txs } = await this.getTransactions(userId, { limit: 100000 });
    if (!txs || txs.length === 0) return "";
    
    const headers = ["Date", "Type", "Category", "Account", "Amount", "From/To", "Note"];
    const rows = txs.map(t => [
      t.date,
      t.type,
      t.categories?.name || "",
      t.accounts?.name || "",
      t.amount,
      (t.from_or_to || "").replace(/;/g, ',').replace(/\n/g, ' '),
      (t.note || "").replace(/;/g, ',').replace(/\n/g, ' ')
    ]);
    
    return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  },

  async exportToCSV(userId, types) {
    let csvContent = "\uFEFF"; // BOM for Excel
    
    // 1. หมวดหมู่
    if (types.includes('categories')) {
      const cats = await this.getCategories(userId);
      const headers = ["Type", "Name", "Parent", "Icon", "Color", "Position"];
      const rows = cats.filter(c => !c.is_default).map(c => [
        c.type, c.name, c.parent?.name || "", c.icon, c.color, c.position
      ]);
      csvContent += "--- CATEGORIES ---\n" + headers.join(';') + "\n" + rows.map(r => r.join(';')).join('\n') + "\n\n";
    }
    
    // 2. บัญชี (รวมทุกประเภท)
    if (types.includes('accounts')) {
      const accs = await this.getAccounts(userId);
      const headers = ["Name", "Type", "Balance", "Initial_Balance", "Color"];
      const rows = accs.map(a => [
        a.name, a.type, a.balance, a.initial_balance, a.color
      ]);
      csvContent += "--- ACCOUNTS ---\n" + headers.join(';') + "\n" + rows.map(r => r.join(';')).join('\n') + "\n\n";
    }
    
    // 3. ธุรกรรม
    if (types.includes('transactions')) {
      const txs = await this.exportTransactionsToCSV(userId);
      csvContent += "--- TRANSACTIONS ---\n" + txs + "\n\n";
    }

    // 4. งบประมาณ (Budgets)
    if (types.includes('budgets')) {
      const budgets = await this.getBudgets(userId);
      const headers = ["Category", "Amount", "Period", "Start_Date"];
      const rows = budgets.map(b => [
        b.categories?.name || "", b.amount, b.period, b.start_date
      ]);
      csvContent += "--- BUDGETS ---\n" + headers.join(';') + "\n" + rows.map(r => r.join(';')).join('\n') + "\n\n";
    }

    // 5. รายการล่วงหน้า (Schedules)
    if (types.includes('schedules')) {
      const schedules = await this.getSchedules(userId);
      const headers = ["Note", "Type", "Amount", "Category", "Account", "Frequency", "Next_Run", "From_To"];
      const rows = schedules.map(s => [
        s.note || "", s.type, s.amount, s.categories?.name || "", s.accounts?.name || "", s.frequency, s.next_run_date, s.from_or_to || ""
      ]);
      csvContent += "--- SCHEDULES ---\n" + headers.join(';') + "\n" + rows.map(r => r.join(';')).join('\n') + "\n\n";
    }
    
    return csvContent;
  },

  async importFromCSV(userId, csvText, types, deleteExisting, dupMode = 'skip') {
    try {
      let summary = [];
      const sections = csvText.split('--- ');
      const sectionData = {};
      
      // กรณีมี Section (มาจากการ Export ของแอปเอง)
      if (sections.length > 1) {
        sections.forEach(s => {
          if (s.startsWith('CATEGORIES ---')) sectionData.categories = s.replace('CATEGORIES ---\n', '');
          if (s.startsWith('ACCOUNTS ---')) sectionData.accounts = s.replace('ACCOUNTS ---\n', '');
          if (s.startsWith('TRANSACTIONS ---')) sectionData.transactions = s.replace('TRANSACTIONS ---\n', '');
          if (s.startsWith('BUDGETS ---')) sectionData.budgets = s.replace('BUDGETS ---\n', '');
          if (s.startsWith('SCHEDULES ---')) sectionData.schedules = s.replace('SCHEDULES ---\n', '');
        });
      } else {
        // กรณีไม่มี Section (เช่น CSV ทั่วไป) ให้มองเป็นธุรกรรมถ้ามีการเลือกไว้
        if (types.includes('transactions')) {
          sectionData.transactions = csvText;
        }
      }

      let allSkipped = [];
      let allDuplicates = [];
      let allOverwritten = [];

      if (types.includes('categories') && sectionData.categories) {
        const res = await this.importCategoriesFromCSV(userId, sectionData.categories, deleteExisting);
        if (res.error) throw res.error;
        summary.push(`หมวดหมู่: ${res.count}`);
        if (res.duplicates) allDuplicates.push(...res.duplicates);
      }
      if (types.includes('accounts') && sectionData.accounts) {
        const res = await this.importAccountsFromCSV(userId, sectionData.accounts, deleteExisting);
        if (res.error) throw res.error;
        summary.push(`บัญชี: ${res.count}`);
        if (res.duplicates) allDuplicates.push(...res.duplicates);
      }
      if (types.includes('transactions') && sectionData.transactions) {
        const res = await this.importTransactionsFromCSV(userId, sectionData.transactions, deleteExisting, dupMode);
        if (res.error) throw res.error;
        summary.push(`ธุรกรรม: ${res.count} นำเข้า${res.overwritten?.length ? `, ${res.overwritten.length} เขียนทับ` : ''}`);
        if (res.skipped) allSkipped.push(...res.skipped);
        if (res.duplicates) allDuplicates.push(...res.duplicates);
        if (res.overwritten) allOverwritten.push(...res.overwritten);
      }
      if (types.includes('budgets') && sectionData.budgets) {
        const res = await this.importBudgetsFromCSV(userId, sectionData.budgets, deleteExisting);
        if (res.error) throw res.error;
        summary.push(`งบประมาณ: ${res.count}`);
      }
      if (types.includes('schedules') && sectionData.schedules) {
        const res = await this.importSchedulesFromCSV(userId, sectionData.schedules, deleteExisting);
        if (res.error) throw res.error;
        summary.push(`รายการล่วงหน้า: ${res.count}`);
      }
      
      return {
        summary: summary.join(', '),
        success: true,
        skipped: allSkipped,
        duplicates: allDuplicates,
        overwritten: allOverwritten
      };
    } catch (err) {
      console.error('importFromCSV Error:', err);
      return { error: err.message || err };
    }
  },

  async importBudgetsFromCSV(userId, csvText, deleteExisting) {
    try {
      const rows = ExportUtil.parseCSV(csvText);
      if (!rows || rows.length === 0) return { count: 0 };
      if (deleteExisting) await supabaseClient.from('budgets').delete().eq('user_id', userId);
      
      const cats = await this.getCategories(userId);
      const toInsert = rows.map(r => {
        const catName = r.Category || r.category;
        const cat = cats.find(c => c.name === catName) || cats[0];
        return {
          user_id: userId,
          category_id: cat?.id,
          amount: parseFloat(r.Amount || r.amount || 0),
          period: r.Period || r.period || 'monthly',
          start_date: r.Start_Date || r.start_date || new Date().toISOString().split('T')[0],
          is_active: true
        };
      });
      
      const { error } = await supabaseClient.from('budgets').insert(toInsert);
      if (error) throw error;
      return { success: true, count: toInsert.length };
    } catch (err) { return { error: err }; }
  },

  async importSchedulesFromCSV(userId, csvText, deleteExisting) {
    try {
      const rows = ExportUtil.parseCSV(csvText);
      if (!rows || rows.length === 0) return { count: 0 };
      if (deleteExisting) await supabaseClient.from('schedules').delete().eq('user_id', userId);
      
      const [cats, accs] = await Promise.all([this.getCategories(userId), this.getAccounts(userId)]);
      const toInsert = rows.map(r => {
        const cat = cats.find(c => c.name === (r.Category || r.category)) || cats[0];
        const acc = accs.find(a => a.name === (r.Account || r.account)) || accs[0];
        return {
          user_id: userId,
          account_id: acc?.id,
          category_id: cat?.id,
          amount: parseFloat(r.Amount || r.amount || 0),
          type: r.Type || r.type || 'expense',
          frequency: r.Frequency || r.frequency || 'monthly',
          next_run_date: r.Next_Run || r.next_run || new Date().toISOString().split('T')[0],
          note: r.Note || r.note || '',
          from_or_to: r.From_To || r.from_to || '',
          is_active: true
        };
      });
      
      const { error } = await supabaseClient.from('schedules').insert(toInsert);
      if (error) throw error;
      return { success: true, count: toInsert.length };
    } catch (err) { return { error: err }; }
  },

  async dangerDeleteData(userId, types) {
    try {
      if (types.includes('transactions')) {
        await this.deleteTransactionsOnly(userId);
      }
      if (types.includes('accounts')) {
        await this.deleteAccountsOnly(userId);
      }
      if (types.includes('categories')) {
        await this.deleteCategoriesOnly(userId);
      }
      return { success: true };
    } catch (err) {
      return { error: err.message || err };
    }
  },


  async importTransactionsFromCSV(userId, csvText, deleteExisting, dupMode = 'skip') {
    try {
      const rows = ExportUtil.parseCSV(csvText);
      if (!rows || rows.length === 0) throw new Error('ไม่พบข้อมูลในไฟล์ CSV');
      if (deleteExisting) await this.deleteTransactionsOnly(userId);

      // ดึงข้อมูลหมวดหมู่, บัญชี และธุรกรรมเดิม (เพื่อเช็คซ้ำ)
      let [cats, accs, { data: existingTxs }] = await Promise.all([
        this.getCategories(userId),
        this.getAccounts(userId),
        this.getTransactions(userId, { limit: 5000 }) // เช็คย้อนหลัง 5000 รายการล่าสุด
      ]);
      
      // ตรวจสอบและสร้างหมวดหมู่โอนเงินหากยังไม่มี (รองรับทั้งชื่ออังกฤษและไทย)
      const transferNames = ['transfer between accounts', 'โอนเงินระหว่างบัญชี', 'รายการโอนเงิน', 'โอนเงิน', 'transfer', 'credit card bill', 'ชำระบัตรเครดิต'];
      const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, '').trim();
      
      let transferCat = cats.find(c => transferNames.some(tn => normalize(c.name) === normalize(tn)));
      
      if (!transferCat) {
        console.log('Creating new Transfer category...');
        const { data: newCat, error: catErr } = await supabaseClient.from('categories').insert({
          user_id: userId,
          name: 'Transfer between accounts',
          type: 'expense',
          icon: 'arrow-right-left',
          color: '#3b82f6',
          is_default: false
        }).select().single();
        
        if (newCat) {
          cats.push(newCat);
          transferCat = newCat;
        } else if (catErr) {
          console.error('Error creating transfer category:', catErr);
        }
      }
      
      const toInsert = [];
      const toUpdate = [];    // เก็บรายการที่จะ overwrite { id, note, from_or_to }
      const skippedRows = []; // เก็บข้อมูลแถวที่ผิดพลาด
      const duplicates = [];  // เก็บรายการที่ซ้ำ (skip mode)
      const overwritten = []; // เก็บรายการที่เขียนทับ (overwrite mode)
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // คำนวณบรรทัดใน CSV จริง (บวก headerIdx + 1)
        const csvLineNumber = (rows.headerIdx || 2) + i + 2; 

        // 1. ระบุจำนวนเงินและประเภท (Income/Expense/Transfer)
        const valStr = row.Value || row.value || row.Amount || row.amount || row['Modified Bal+/-'] || row['Value (THB)'] || '0';
        let amount = parseFloat(valStr.toString().replace(/,/g, ''));
        const absAmount = Math.abs(amount);
        
        const csvType = (row.Type || row.type || '').toLowerCase();
        const catName = (row.Category || row.category || 'อื่นๆ').trim();
        const normCatName = normalize(catName);
        
        // ตรวจสอบว่าเป็นรายการโอนเงินหรือไม่
        const isTransfer = csvType.includes('transfer') || csvType.includes('โอน') || 
                          catName.toLowerCase().includes('transfer') || catName.includes('โอน') ||
                          transferNames.some(tn => normCatName.includes(normalize(tn)));
        
        let type = amount < 0 ? 'expense' : 'income';
        // ถ้าใน CSV มีระบุ Type ชัดเจน ให้เชื่อตามนั้น (กรณี amount เป็นบวกทั้งคู่)
        if (csvType.includes('income') || csvType.includes('รายรับ')) type = 'income';
        if (csvType.includes('expense') || csvType.includes('รายจ่าย')) type = 'expense';
        
        let dateStr = row.Date || row.date;
        let date = new Date().toISOString().split('T')[0];
        if (dateStr) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            // รองรับ M/D/YY หรือ D/M/YY (ลองทายจากค่า)
            let m = parseInt(parts[0]);
            let d = parseInt(parts[1]);
            let y = parts[2];
            // ถ้า m > 12 แสดงว่าเป็น D/M/YY
            if (m > 12) { [m, d] = [d, m]; }
            const mm = m.toString().padStart(2, '0');
            const dd = d.toString().padStart(2, '0');
            const year = y.length === 2 ? '20' + y : y;
            date = `${year}-${mm}-${dd}`;
          } else if (dateStr.includes('-')) {
             date = dateStr;
          }
        }

        const note = (row.Notes || row.Note || '').trim();
        const fromTo = (row['From/To'] || '').trim();
        const accName = row.Account || row.account || (accs.length > 0 ? accs[0].name : 'เงินสด');
        
        let catId = null;
        let finalNote = note;

        if (isTransfer) {
          // รายการโอนเงิน: รองรับการแยกหมวดหมู่ตาม Transfer+ (รายรับ) และ Transfer- (รายจ่าย)
          let tCat = null;
          
          if (type === 'income') {
            // หา Transfer+ หรือชื่อที่มีคำว่า โอน+ / Transfer+
            tCat = cats.find(c => normalize(c.name) === 'transfer+' || normalize(c.name).includes('โอน+') || (normalize(c.name) === 'transfer' && c.type === 'income'));
          } else {
            // หา Transfer- หรือชื่อที่มีคำว่า โอน- / Transfer-
            tCat = cats.find(c => normalize(c.name) === 'transfer-' || normalize(c.name).includes('โอน-') || (normalize(c.name) === 'transfer' && c.type === 'expense'));
          }

          // ถ้ายังไม่เจอแบบเจาะจง +/- ให้หาแบบทั่วไปตามลำดับ
          if (!tCat) {
             tCat = cats.find(c => transferNames.some(tn => normalize(c.name) === normalize(tn)));
          }
          
          if (!tCat) {
             tCat = cats.find(c => (c.name || '').toLowerCase().includes('โอน') || (c.name || '').toLowerCase().includes('transfer'));
          }
          
          catId = tCat ? tCat.id : (transferCat ? transferCat.id : null);
          
          if (!catId) {
            const fallbackCat = cats.find(c => normalize(c.name) === 'อื่นๆ' || normalize(c.name) === 'others');
            catId = fallbackCat ? fallbackCat.id : (cats[0] ? cats[0].id : null);
          }
          
          // สร้าง Note ให้สื่อความหมายสำหรับโอนเงิน
          if (!finalNote.includes('โอน')) {
             if (fromTo) {
                finalNote = type === 'expense' ? `โอนเงินไป ${fromTo}` : `รับเงินโอนจาก ${fromTo}`;
                if (note) finalNote += ` (${note})`;
             } else {
                finalNote = type === 'expense' ? `โอนเงินออกจาก ${accName}` : `เงินโอนเข้า ${accName}`;
                if (note) finalNote += ` (${note})`;
             }
          }
        } else {
          // รายการปกติ: ค้นหาหมวดหมู่
          // 1. หาแบบตรงชื่อตรงประเภท
          let cat = cats.find(c => normalize(c.name) === normCatName && c.type === type);
          
          // 2. ถ้าไม่เจอ หาแบบตรงชื่อแต่ต่างประเภท (เช่น หมวดหมู่ตั้งเป็น Expense แต่รายการเป็น Income)
          if (!cat) {
             cat = cats.find(c => normalize(c.name) === normCatName);
          }
          
          // 3. ถ้ายังไม่เจอ หาแบบชื่อใกล้เคียง
          if (!cat) {
            cat = cats.find(c => normalize(c.name).includes(normCatName)) || 
                  cats.find(c => c.name === 'อื่นๆ' && c.type === type) ||
                  cats.find(c => c.name === 'อื่นๆ') || 
                  cats[0];
          }
          catId = cat ? cat.id : null;
        }

        let acc = accs.find(a => a.name === accName) || accs[0];
        if (!acc) {
           skippedRows.push({ line: csvLineNumber, reason: 'ไม่พบบัญชี', data: row });
           continue;
        }

        // ตรวจสอบความถูกต้องของข้อมูลก่อนบันทึก (Data Validation)
        // 1. ตรวจสอบว่าจำนวนเงินเป็นตัวเลขที่ถูกต้องและมากกว่า 0 หรือไม่ (Supabase มี Constraint amount > 0)
        if (isNaN(absAmount) || absAmount <= 0) {
          skippedRows.push({ line: csvLineNumber, reason: isNaN(absAmount) ? 'จำนวนเงินไม่ถูกต้อง' : 'จำนวนเงินต้องมากกว่า 0', data: row });
          continue;
        }
        
        // 2. ตรวจสอบว่าวันที่อยู่ในรูปแบบที่ถูกต้องหรือไม่ (YYYY-MM-DD และเป็นวันที่ที่มีอยู่จริง)
        const dateObj = new Date(date);
        if (!date || isNaN(dateObj.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
           skippedRows.push({ line: csvLineNumber, reason: 'วันที่ไม่ถูกต้อง', data: row });
           continue;
        }

        // 3. ตรวจสอบว่ามี Category ID หรือไม่
        if (!catId) {
           skippedRows.push({ line: csvLineNumber, reason: 'ไม่พบหมวดหมู่', data: row });
           continue;
        }

        // 4. ตรวจสอบรายการซ้ำ (Duplicate Detection)
        if (!deleteExisting && existingTxs) {
          if (dupMode === 'overwrite') {
            // Overwrite: match by date + amount + type + account + category (ไม่เช็ค note)
            const existingMatch = existingTxs.find(tx =>
              tx.date === date &&
              parseFloat(tx.amount) === absAmount &&
              tx.type === type &&
              tx.account_id === acc.id &&
              tx.category_id === catId
            );
            if (existingMatch) {
              toUpdate.push({ id: existingMatch.id, note: finalNote, from_or_to: fromTo });
              overwritten.push({ line: csvLineNumber, data: row, reason: 'เขียนทับรายการซ้ำ' });
              continue;
            }
          } else {
            // Skip (default): exact match รวม note
            const isDup = existingTxs.some(tx =>
              tx.date === date &&
              parseFloat(tx.amount) === absAmount &&
              tx.type === type &&
              tx.account_id === acc.id &&
              tx.category_id === catId &&
              (tx.note || '').trim() === finalNote.trim()
            );
            if (isDup) {
              duplicates.push({ line: csvLineNumber, data: row, reason: 'รายการซ้ำซ้อน' });
              continue;
            }
          }
        }

        toInsert.push({ 
          user_id: userId, 
          account_id: acc.id, 
          category_id: catId, 
          amount: absAmount, 
          type, 
          date, 
          note: finalNote,
          from_or_to: fromTo
        });
      }
      
      // อัปเดตรายการที่ overwrite ทีละรายการ
      if (toUpdate.length > 0) {
        for (const upd of toUpdate) {
          await supabaseClient
            .from('transactions')
            .update({ note: upd.note, from_or_to: upd.from_or_to })
            .eq('id', upd.id);
        }
      }

      if (toInsert.length > 0) {
        // แบ่งการนำเข้าเป็นชุดๆ (Chunking) เพื่อป้องกันปัญหา Payload ใหญ่เกินไป หรือ Timeout
        const CHUNK_SIZE = 500;
        const total = toInsert.length;
        
        for (let i = 0; i < total; i += CHUNK_SIZE) {
          const chunk = toInsert.slice(i, i + CHUNK_SIZE);
          
          if (total > CHUNK_SIZE && typeof Toast !== 'undefined') {
            Toast.show(`กำลังนำเข้าข้อมูล... (${i + chunk.length}/${total})`, 'info');
          }
          
          const { error } = await supabaseClient.from('transactions').insert(chunk);
          if (error) {
            console.error(`Error inserting chunk starting at ${i}:`, error);
            // แสดงรายละเอียด error จาก Supabase ให้ชัดเจนขึ้น
            const errorMsg = error.message || JSON.stringify(error);
            throw new Error(`ชุดข้อมูลที่ ${i} มีปัญหา: ${errorMsg}`);
          }
        }
      }

      const uniqueAccIds = [...new Set(toInsert.map(t => t.account_id))];
      for (const id of uniqueAccIds) await this.recalculateAccountBalance(id);
      return { success: true, count: toInsert.length, skipped: skippedRows, duplicates, overwritten };
    } catch (err) {
      console.error('importTransactionsFromCSV error:', err);
      return { error: err };
    }
  },

  async importCategoriesFromCSV(userId, csvText, deleteExisting) {
    try {
      const rows = ExportUtil.parseCSV(csvText);
      if (!rows || rows.length === 0) throw new Error('ไม่พบข้อมูลในไฟล์ CSV');
      
      if (deleteExisting) await this.deleteCategoriesOnly(userId);
      
      // ดึงข้อมูลหมวดหมู่ปัจจุบัน
      const existingCats = await this.getCategories(userId);
      
      // Pass 1: นำเข้าหมวดหมู่ใหม่ทั้งหมด
      const toInsert = [];
      const rowsToProcess = [];

      for (const row of rows) {
        const name = row.Name || row.name;
        const type = (row.Type || row.type || 'expense').toLowerCase();
        const parentName = row.Parent || row.parent;
        
        // ตรวจสอบความซ้ำซ้อน (ต้องเช็คทั้งชื่อ ประเภท และ ParentName เพื่อความแม่นยำสำหรับหมวดย่อย)
        const isDuplicate = !deleteExisting && existingCats.some(c => 
          c.name === name && 
          c.type === type && 
          c.user_id === userId &&
          (parentName ? (c.parent?.name === parentName) : (!c.parent_id))
        );
        
        if (isDuplicate) continue;

        toInsert.push({
          user_id: userId,
          name: name || 'Unnamed',
          type: type,
          icon: row.Icon || row.icon || 'tag',
          color: row.Color || row.color || '#cbd5e1',
          is_default: false,
          position: parseInt(row.Position || row.position || 0),
          parent_id: null
        });
        rowsToProcess.push(row);
      }

      if (toInsert.length > 0) {
        // ใช้ .select() เพื่อเอา ID ที่ถูกสร้างขึ้นมาใหม่
        const { data: insertedData, error } = await supabaseClient.from('categories').insert(toInsert).select();
        if (error) throw error;
        
        // แมป ID ใหม่กลับไปยังแถวที่ประมวลผล เพื่อให้ Pass 2 อัปเดตได้ตรงตัว
        for (let i = 0; i < insertedData.length; i++) {
          rowsToProcess[i].new_id = insertedData[i].id;
        }
      }

      // Pass 2: เชื่อมโยง Parent-Child
      // ดึงข้อมูลใหม่ทั้งหมดอีกครั้ง (เพื่อให้เห็นทั้ง Default และที่เพิ่งเพิ่มเข้ามาใหม่)
      const allCats = await this.getCategories(userId);
      
      for (const row of rowsToProcess) {
        if (!row.new_id) continue; // ถ้าไม่ได้ถูกเพิ่มใน Pass 1 (เช่น เป็นรายการซ้ำ) ให้ข้าม
        
        const parentName = row.Parent || row.parent;
        if (!parentName) continue;

        const name = row.Name || row.name;
        const type = (row.Type || row.type || 'expense').toLowerCase();
        
        // ค้นหาหมวดหมู่แม่ (พยายามหาตัวที่เป็นหมวดหมู่หลักก่อนเพื่อความแม่นยำ)
        let parent = allCats.find(c => c.name === parentName && c.type === type && !c.parent_id);
        if (!parent) {
          parent = allCats.find(c => c.name === parentName && c.type === type);
        }
        
        if (parent) {
          await supabaseClient.from('categories').update({ parent_id: parent.id }).eq('id', row.new_id);
        }
      }

      return { success: true, count: toInsert.length, duplicates: [] };
    } catch (err) {
      return { error: err.message || err };
    }
  },

  async importAccountsFromCSV(userId, csvText, deleteExisting) {
    try {
      const rows = ExportUtil.parseCSV(csvText);
      if (!rows || rows.length === 0) throw new Error('ไม่พบข้อมูลในไฟล์ CSV');

      if (deleteExisting) await this.deleteAccountsOnly(userId);

      const toInsert = rows.map(row => ({
        user_id: userId,
        name: row.Name || row.name || 'Unnamed Account',
        type: (row.Type || row.type || 'cash').toLowerCase(),
        balance: parseFloat((row.Balance || row.balance || '0').toString().replace(/,/g, '')),
        initial_balance: parseFloat((row.Initial_Balance || row.initial_balance || '0').toString().replace(/,/g, '')),
        color: row.Color || row.color || '#cbd5e1',
        is_active: true
      }));

      const existingAccs = await this.getAccounts(userId);
      const duplicates = [];
      const finalToInsert = toInsert.filter(a => {
        const isDup = !deleteExisting && existingAccs.some(ex => ex.name.toLowerCase() === a.name.toLowerCase());
        if (isDup) duplicates.push({ name: a.name, reason: 'ชื่อบัญชีซ้ำ' });
        return !isDup;
      });

      if (finalToInsert.length > 0) {
        const { error } = await supabaseClient.from('accounts').insert(finalToInsert);
        if (error) throw error;
      }
      return { success: true, count: finalToInsert.length, duplicates };
    } catch (err) {
      return { error: err };
    }
  },

  // Helpers
  money(amount) {
    return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount || 0);
  },
  date(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  dateShort(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  }
};

// =========================
// UTILITY: Export ไฟล์
// =========================

const ExportUtil = {
  downloadCSV(data, filename = 'transactions.csv') {
    if (!data || data.length === 0) return Toast.show('ไม่มีข้อมูลให้ส่งออก', 'info');
    const headers = Object.keys(data[0]);
    const csvRows = [';;"FAST BUDGET"', '', headers.map(h => `"${h}"`).join(';'), ...data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(';'))];
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    this._download(blob, filename);
  },
  parseCSV(csvText) {
    let lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    if (lines[0].startsWith('\uFEFF')) lines[0] = lines[0].substring(1);
    let headerIdx = lines.findIndex(l => !l.includes('FAST BUDGET') && l.trim() !== '');
    if (headerIdx === -1) return [];
    const headers = this._parseCSVLine(lines[headerIdx]).map(h => h.replace(/"/g, '').trim());
    const rows = [];
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const values = this._parseCSVLine(lines[i]);
      if (values.length >= headers.length) {
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = (values[idx] || '').replace(/"/g, '').trim(); });
        rows.push(obj);
      }
    }
    return rows;
  },
  _parseCSVLine(line) {
    const result = [];
    let current = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (char === ';' && !inQuotes) { result.push(current); current = ''; }
      else current += char;
    }
    result.push(current);
    return result;
  },
  downloadJSON(data, filename = 'backup.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
    this._download(blob, filename);
  },
  _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};