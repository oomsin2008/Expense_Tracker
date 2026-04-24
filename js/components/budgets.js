// ===================================================
// Budgets Component — ตั้งงบประมาณ + ติดตาม progress
// ===================================================

const BudgetsPage = {
    _safeIcon(icon) {
      if (!icon || icon === 'interest') return 'badge-percent';
      return icon;
    },

    budgets: [],
    categories: [],
    userId: null,
  
    // ===== RENDER หน้าหลัก =====
  
    async render(userId) {
      this.userId = userId;
  
      const [budgets, categories] = await Promise.all([
        DB.getBudgets(userId),
        DB.getCategoriesByType(userId, 'expense')
      ]);
  
      this.categories = categories;
  
      // คำนวณยอดใช้ไปของแต่ละ budget
      this.budgets = await Promise.all(
        budgets.map(async (b) => {
          const spent = await DB.getBudgetSpent(userId, b.category_id, b.period, b.start_date);
          const limit = parseFloat(b.amount);
          const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
          return { ...b, spent, percentage };
        })
      );
  
      // สรุปยอด
      const totalBudget = this.budgets.reduce((s, b) => s + parseFloat(b.amount), 0);
      const totalSpent  = this.budgets.reduce((s, b) => s + b.spent, 0);
  
      return `
        <div class="page-transition">
          <!-- Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 class="text-2xl font-bold text-slate-800">Budgets</h1>
              <p class="text-sm text-slate-500 mt-1">ติดตามงบประมาณรายหมวดหมู่</p>
            </div>
            <button onclick="BudgetsPage.openModal()"
              class="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600
                     text-white px-4 py-2.5 rounded-lg font-medium text-sm
                     transition-colors active:scale-[0.98]">
              <i data-lucide="plus" class="w-4 h-4"></i>
              ตั้งงบประมาณ
            </button>
          </div>
  
          <!-- Summary -->
          ${this._renderSummary(totalBudget, totalSpent)}
  
          <!-- Budget List -->
          <div id="budgets-list" class="space-y-3">
            ${this.budgets.length > 0
              ? this.budgets.map((b, i) => this._renderBudgetCard(b, i)).join('')
              : this._renderEmpty()
            }
          </div>
        </div>
  
        </div>
      `;
    },
  
    // ===== SUMMARY =====
  
    _renderSummary(totalBudget, totalSpent) {
      const totalRemaining = totalBudget - totalSpent;
      const overallPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  
      return `
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div class="bg-white rounded-xl shadow-sm p-4 card-hover animate-fade-in-up stagger-1">
            <div class="flex items-center gap-2 mb-1">
              <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <i data-lucide="target" class="w-4 h-4 text-blue-500"></i>
              </div>
              <span class="text-xs font-medium text-slate-500">งบรวมทั้งหมด</span>
            </div>
            <p class="text-lg font-bold font-number text-slate-800">${Format.money(totalBudget)}</p>
          </div>
  
          <div class="bg-white rounded-xl shadow-sm p-4 card-hover animate-fade-in-up stagger-2">
            <div class="flex items-center gap-2 mb-1">
              <div class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <i data-lucide="trending-down" class="w-4 h-4 text-red-500"></i>
              </div>
              <span class="text-xs font-medium text-slate-500">ใช้ไปแล้ว</span>
            </div>
            <p class="text-lg font-bold font-number text-red-500">${Format.money(totalSpent)}</p>
          </div>
  
          <div class="bg-white rounded-xl shadow-sm p-4 card-hover animate-fade-in-up stagger-3">
            <div class="flex items-center gap-2 mb-1">
              <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <i data-lucide="piggy-bank" class="w-4 h-4 text-emerald-500"></i>
              </div>
              <span class="text-xs font-medium text-slate-500">เหลือ (${overallPercent}% ใช้แล้ว)</span>
            </div>
            <p class="text-lg font-bold font-number ${totalRemaining < 0 ? 'text-red-500' : 'text-emerald-600'}">
              ${Format.money(totalRemaining)}
            </p>
          </div>
        </div>
      `;
    },
  
    // ===== BUDGET CARD (progress bar) =====
  
    _renderBudgetCard(budget, index = 0) {
      const catName  = budget.categories?.name || 'ไม่ระบุ';
      const catIcon  = this._safeIcon(budget.categories?.icon || 'help-circle');
      const catColor = budget.categories?.color || Theme.palette().slate;
      const limit    = parseFloat(budget.amount);
      const spent    = budget.spent;
      const remaining = limit - spent;
      const pct      = budget.percentage;
  
      // สีตามระดับ
      const barColor = this._getBarColor(pct);
      const barWidth = Math.min(pct, 100);
  
      const periodLabels = { weekly: 'รายสัปดาห์', monthly: 'รายเดือน', yearly: 'รายปี' };
  
      return `
        <div class="bg-white rounded-xl shadow-sm p-5 card-hover group animate-fade-in-up stagger-${Math.min(index + 1, 4)}">
          <div class="flex items-start justify-between mb-3">
            <!-- Category info -->
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                   style="background-color: ${catColor}15">
                <i data-lucide="${catIcon}" class="w-5 h-5" style="color: ${catColor}"></i>
              </div>
              <div>
                <h3 class="font-semibold text-slate-800">${catName}</h3>
                <span class="text-xs text-slate-400">${periodLabels[budget.period] || budget.period}</span>
              </div>
            </div>
  
            <!-- Actions -->
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onclick="BudgetsPage.openModal('${budget.id}')"
                class="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" title="แก้ไข">
                <i data-lucide="pencil" class="w-4 h-4 text-slate-400"></i>
              </button>
              <button onclick="BudgetsPage.confirmDelete('${budget.id}', '${catName}')"
                class="p-1.5 hover:bg-red-50 rounded-lg transition-colors" title="ลบ">
                <i data-lucide="trash-2" class="w-4 h-4 text-slate-400 hover:text-red-500"></i>
              </button>
            </div>
          </div>
  
          <!-- Progress Bar -->
          <div class="mb-2">
            <div class="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500 ease-out"
                   style="width: ${barWidth}%; background-color: ${barColor}">
              </div>
            </div>
          </div>
  
          <!-- Stats row -->
          <div class="flex items-center justify-between text-sm">
            <span class="font-number">
              <span class="font-semibold" style="color: ${barColor}">${Format.money(spent)}</span>
              <span class="text-slate-400"> / ${Format.money(limit)}</span>
            </span>
            <span class="font-medium font-number ${remaining < 0 ? 'text-red-500' : 'text-slate-500'}">
              ${remaining < 0 ? 'เกิน ' + Format.money(Math.abs(remaining)) : 'เหลือ ' + Format.money(remaining)}
            </span>
          </div>
  
          <!-- Alert ถ้าเกิน threshold -->
          ${pct >= budget.alert_threshold && pct < 100 ? `
            <div class="flex items-center gap-2 mt-3 px-3 py-2 bg-amber-50 rounded-lg">
              <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-500 shrink-0"></i>
              <span class="text-xs text-amber-700">ใช้ไป ${pct}% แล้ว — ใกล้ถึงงบที่ตั้งไว้</span>
            </div>
          ` : ''}
  
          ${pct >= 100 ? `
            <div class="flex items-center gap-2 mt-3 px-3 py-2 bg-red-50 rounded-lg">
              <i data-lucide="alert-circle" class="w-4 h-4 text-red-500 shrink-0"></i>
              <span class="text-xs text-red-700">เกินงบแล้ว! (${pct}%)</span>
            </div>
          ` : ''}
        </div>
      `;
    },
  
    // สีตามเปอร์เซ็นต์
    _getBarColor(pct) {
      const p = Theme.palette();
      if (pct < 50) return p.success; // เขียว
      if (pct < 80) return p.warning; // เหลือง
      if (pct < 100) return p.warningStrong; // ส้ม
      return p.danger; // แดง
    },
  
    // ===== EMPTY STATE =====
  
    _renderEmpty() {
      return `
        <div class="bg-white rounded-xl shadow-sm p-12 min-h-[50vh] animate-fade-in-up flex flex-col items-center justify-center text-center">
          <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <i data-lucide="target" class="w-8 h-8 text-slate-300"></i>
          </div>
          <h3 class="font-semibold text-slate-600 mb-2">ยังไม่ได้ตั้งงบประมาณ</h3>
          <p class="text-sm text-slate-400 mb-4">ตั้งงบประมาณเพื่อควบคุมการใช้จ่าย</p>
          <button onclick="BudgetsPage.openModal()"
            class="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600
                   text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <i data-lucide="plus" class="w-4 h-4"></i> ตั้งงบประมาณ
          </button>
        </div>
      `;
    },
  
    // ===== MODAL (เพิ่ม / แก้ไข) =====
  
    async openModal(editId = null) {
      if (!this.userId) {
        const session = await Auth.getSession();
        this.userId = session?.user?.id;
      }
      const modal = document.getElementById('budget-modal');
      let budget = null;
  
      if (editId) {
        budget = this.budgets.find(b => b.id === editId);
      }
  
      const isEdit = !!budget;
  
      // หา categories ที่ยังไม่มี budget (ป้องกันตั้งซ้ำ)
      const usedCatIds = this.budgets
        .filter(b => !editId || b.id !== editId)
        .map(b => b.category_id);
      const availableCats = this.categories.filter(c => !usedCatIds.includes(c.id));
  
      // ถ้าแก้ไข → เพิ่ม category ปัจจุบันกลับเข้าไปด้วย
      const catOptions = isEdit
        ? [this.categories.find(c => c.id === budget.category_id), ...availableCats]
          .filter(Boolean)
        : availableCats;
  
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="absolute inset-0 bg-black/40 modal-backdrop" onclick="BudgetsPage.closeModal()"></div>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-md modal-content">
  
          <!-- Header -->
          <div class="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 class="text-lg font-semibold text-slate-800">
              ${isEdit ? 'แก้ไขงบประมาณ' : 'ตั้งงบประมาณใหม่'}
            </h2>
            <button onclick="BudgetsPage.closeModal()"
              class="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <i data-lucide="x" class="w-5 h-5 text-slate-400"></i>
            </button>
          </div>
  
          <div class="p-5 space-y-4">
  
            <!-- Category -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">หมวดหมู่รายจ่าย</label>
              ${catOptions.length > 0 ? `
                <select id="bgt-category" ${isEdit ? 'disabled' : ''}
                  class="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm
                         ${isEdit ? 'opacity-60' : ''}">
                  <option value="">เลือกหมวดหมู่</option>
                  ${(() => {
                    const tree = DB.buildCategoryTree(catOptions);
                    return tree.map(root => {
                      if (root.children && root.children.length > 0) {
                        return `<optgroup label="📁 ${root.name}">
                          <option value="${root.id}" ${budget?.category_id === root.id ? 'selected' : ''}>📁 ${root.name} (ทั้งหมวด)</option>
                          ${root.children.map(sub =>
                            `<option value="${sub.id}" ${budget?.category_id === sub.id ? 'selected' : ''}>  └ ${sub.name}</option>`
                          ).join('')}
                        </optgroup>`;
                      }
                      return `<option value="${root.id}" ${budget?.category_id === root.id ? 'selected' : ''}>${root.name}</option>`;
                    }).join('');
                  })()}
                </select>
              ` : `
                <div class="px-3 py-2.5 bg-slate-50 rounded-lg text-sm text-slate-500">
                  ทุกหมวดหมู่ถูกตั้งงบแล้ว
                </div>
              `}
            </div>
  
            <!-- Amount -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">วงเงิน</label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">฿</span>
                <input type="number" id="bgt-amount" step="100" min="1"
                  value="${budget?.amount || ''}"
                  placeholder="5000"
                  class="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm
                         font-number focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
              </div>
            </div>
  
            <!-- Period -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">ช่วงเวลา</label>
              <div class="grid grid-cols-3 gap-2">
                ${['weekly', 'monthly', 'yearly'].map(p => {
                  const labels = { weekly: 'รายสัปดาห์', monthly: 'รายเดือน', yearly: 'รายปี' };
                  const icons  = { weekly: '7d', monthly: '1m', yearly: '1y' };
                  const isSelected = (budget?.period || 'monthly') === p;
                  return `
                    <button type="button" onclick="BudgetsPage.selectPeriod('${p}')"
                      data-period="${p}"
                      class="bgt-period-btn px-3 py-2.5 rounded-lg text-sm font-medium
                             border-2 transition-all text-center
                             ${isSelected
                               ? 'border-blue-500 bg-blue-50 text-blue-700'
                               : 'border-slate-200 text-slate-600 hover:border-slate-300'}">
                      <span class="block text-xs text-slate-400 mb-0.5">${icons[p]}</span>
                      ${labels[p]}
                    </button>
                  `;
                }).join('')}
              </div>
              <input type="hidden" id="bgt-period" value="${budget?.period || 'monthly'}">
            </div>
  
            <!-- Alert Threshold -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                แจ้งเตือนเมื่อใช้ถึง (%)
              </label>
              <div class="flex items-center gap-3">
                <input type="range" id="bgt-threshold" min="50" max="100" step="5"
                  value="${budget?.alert_threshold || 80}"
                  oninput="document.getElementById('bgt-threshold-val').textContent = this.value + '%'"
                  class="flex-1 accent-blue-500">
                <span id="bgt-threshold-val" class="text-sm font-medium text-slate-700 w-10 text-right">
                  ${budget?.alert_threshold || 80}%
                </span>
              </div>
            </div>
          </div>
  
          <!-- Footer -->
          <div class="flex gap-3 p-5 border-t border-slate-100">
            <button onclick="BudgetsPage.closeModal()"
              class="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm
                     font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              ยกเลิก
            </button>
            <button onclick="BudgetsPage.save('${editId || ''}')"
              class="flex-1 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm
                     font-medium text-white transition-colors active:scale-[0.98]">
              ${isEdit ? 'บันทึก' : 'ตั้งงบประมาณ'}
            </button>
          </div>
        </div>
      `;
      lucide.createIcons();
    },
  
    selectPeriod(period) {
      document.getElementById('bgt-period').value = period;
      document.querySelectorAll('.bgt-period-btn').forEach(btn => {
        const isSelected = btn.dataset.period === period;
        btn.classList.toggle('border-blue-500', isSelected);
        btn.classList.toggle('bg-blue-50', isSelected);
        btn.classList.toggle('text-blue-700', isSelected);
        btn.classList.toggle('border-slate-200', !isSelected);
        btn.classList.toggle('text-slate-600', !isSelected);
      });
    },
  
    closeModal() {
      const modal = document.getElementById('budget-modal');
      modal.className = 'hidden fixed inset-0 z-50';
      modal.innerHTML = '';
    },
  
    // ===== SAVE =====
  
    async save(editId) {
      const categoryId = document.getElementById('bgt-category')?.value;
      const amount     = parseFloat(document.getElementById('bgt-amount').value);
      const period     = document.getElementById('bgt-period').value;
      const threshold  = parseInt(document.getElementById('bgt-threshold').value);
  
      if (!editId && !categoryId) {
        Toast.show('กรุณาเลือกหมวดหมู่', 'error');
        return;
      }
      if (!amount || amount <= 0) {
        Toast.show('กรุณาใส่วงเงิน', 'error');
        return;
      }
  
      let result;
      if (editId) {
        result = await DB.updateBudget(editId, {
          amount,
          period,
          alert_threshold: threshold
        });
      } else {
        result = await DB.createBudget({
          user_id: this.userId,
          category_id: categoryId,
          amount,
          period,
          alert_threshold: threshold
        });
      }
  
      if (result.error) {
        Toast.show('บันทึกไม่สำเร็จ: ' + result.error.message, 'error');
        return;
      }
  
      Toast.show(editId ? 'แก้ไขงบสำเร็จ' : 'ตั้งงบสำเร็จ', 'success');
      this.closeModal();
      await this.refresh();
    },
  
    // ===== DELETE =====
  
    confirmDelete(id, name) {
      const modal = document.getElementById('budget-modal');
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
      modal.innerHTML = `
        <div class="absolute inset-0 bg-black/40 modal-backdrop" onclick="BudgetsPage.closeModal()"></div>
        <div class="relative bg-white rounded-xl shadow-2xl w-full max-w-sm modal-content p-6 text-center">
          <div class="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i data-lucide="alert-triangle" class="w-6 h-6 text-red-500"></i>
          </div>
          <h3 class="text-lg font-semibold text-slate-800 mb-2">ลบงบ "${name}"?</h3>
          <p class="text-sm text-slate-500 mb-6">ธุรกรรมที่เกี่ยวข้องจะไม่ถูกลบ</p>
          <div class="flex gap-3">
            <button onclick="BudgetsPage.closeModal()"
              class="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm
                     font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              ยกเลิก
            </button>
            <button onclick="BudgetsPage.deleteBudget('${id}')"
              class="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm
                     font-medium text-white transition-colors">
              ลบ
            </button>
          </div>
        </div>
      `;
      lucide.createIcons();
    },
  
    async deleteBudget(id) {
      const { error } = await DB.deleteBudget(id);
      if (error) {
        Toast.show('ลบไม่สำเร็จ', 'error');
        return;
      }
      Toast.show('ลบงบประมาณแล้ว', 'success');
      this.closeModal();
      await this.refresh();
    },
  
    // ===== REFRESH =====
  
    async refresh() {
      const container = document.getElementById('page-content');
      container.innerHTML = await this.render(this.userId);
      lucide.createIcons();
    }
  };