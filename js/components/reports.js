/**
 * Reports & Analytics Page Component
 * Phase 3.2: Charts & Reports (Pie/Bar/Line/Multi-line + Date Filter)
 */
const ReportsPage = {
    charts: {},
    currentData: {},
    dateRange: {
        start: null,
        end: null
    },
    topTrendCount: 5, // เฉพาะสำหรับกราฟแนวโน้ม
    showTransfers: false,

    /**
     * Initialize the reports page
     */
    init() {
        this.setupDateDefaults();
        this.bindEvents();
    },

    /**
     * Set default date range (current month)
     */
    setupDateDefaults() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        this.dateRange.end = lastDay.toISOString().split('T')[0];
        this.dateRange.start = firstDay.toISOString().split('T')[0];
    },

    /**
     * Render the reports page HTML
     */
    render() {
        return `
            <div class="space-y-6 animate-fade-in">
                <!-- Header with Date Filter -->
                <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div class="space-y-1">
                        <div class="flex items-center gap-3 mb-1">
                            <div class="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                <i data-lucide="bar-chart-2" class="w-6 h-6"></i>
                            </div>
                            <h1 class="text-2xl font-black text-slate-800 tracking-tight">รายงานและวิเคราะห์</h1>
                        </div>
                        <p class="text-slate-400 text-sm font-medium ml-14">วิเคราะห์การเงินย้อนหลังและแนวโน้มเชิงลึก</p>
                    </div>
                    
                    <!-- Filter Toolbar -->
                    <div class="flex flex-wrap items-center gap-3 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                        <!-- Quick Ranges -->
                        <div class="flex items-center gap-1 px-2 py-1 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 ml-1">ย้อนหลัง</span>
                            <button onclick="ReportsPage.setRangeMonths(1)" class="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all">1 เดือน</button>
                            <button onclick="ReportsPage.setRangeMonths(2)" class="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all">2 เดือน</button>
                            <button onclick="ReportsPage.setRangeMonths(3)" class="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all">3 เดือน</button>
                        </div>

                        <!-- Date Range -->
                        <div class="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">จาก</span>
                                <input type="date" id="report-start-date" value="${this.dateRange.start}"
                                    class="bg-transparent border-none text-xs font-bold text-slate-700 outline-none focus:ring-0 w-28">
                            </div>
                            <div class="w-px h-4 bg-slate-200"></div>
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">ถึง</span>
                                <input type="date" id="report-end-date" value="${this.dateRange.end}"
                                    class="bg-transparent border-none text-xs font-bold text-slate-700 outline-none focus:ring-0 w-28">
                            </div>
                        </div>
                        <div class="flex items-center gap-2 ml-auto">
                            <button onclick="ReportsPage.applyFilter()" 
                                class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-100 transition-all flex items-center gap-2">
                                <i data-lucide="filter" class="w-3.5 h-3.5"></i>
                                กรองข้อมูล
                            </button>
                            <button onclick="ReportsPage.resetFilter()" 
                                class="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 transition-all">
                                รีเซ็ต
                            </button>
                        </div>

                        <div class="hidden sm:block w-px h-8 bg-slate-200 mx-1"></div>

                        <!-- Visibility Toggle -->
                        <button onclick="ReportsPage.toggleTransfers()" 
                            id="report-transfer-toggle"
                            class="px-4 py-2 ${this.showTransfers ? 'bg-blue-500 text-white shadow-blue-100' : 'bg-white text-slate-500'} border border-slate-200 rounded-xl text-xs font-bold hover:shadow-md transition-all flex items-center gap-2">
                            <i data-lucide="${this.showTransfers ? 'eye' : 'eye-off'}" class="w-3.5 h-3.5"></i>
                            ${this.showTransfers ? 'แสดงรายการโอน' : 'ซ่อนรายการโอน'}
                        </button>
                    </div>
                </div>

                <!-- Summary Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="reports-summary">
                    <!-- Will be populated by JavaScript -->
                    <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-200 animate-pulse">
                        <div class="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                        <div class="h-8 bg-slate-200 rounded w-32"></div>
                    </div>
                    <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-200 animate-pulse">
                        <div class="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                        <div class="h-8 bg-slate-200 rounded w-32"></div>
                    </div>
                    <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-200 animate-pulse">
                        <div class="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                        <div class="h-8 bg-slate-200 rounded w-32"></div>
                    </div>
                </div>

                <div id="reports-charts-wrap" class="space-y-6">
                <!-- Charts Grid Row 1 -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Pie Chart -->
                    <div class="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-semibold text-slate-800 flex items-center gap-2">
                                <i data-lucide="pie-chart" class="w-5 h-5 text-blue-500"></i>
                                สัดส่วนรายจ่ายตามหมวดหมู่
                            </h3>
                            <span class="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">แสดงทั้งหมด</span>
                        </div>
                        <div class="relative h-64">
                            <canvas id="expensePieChart"></canvas>
                        </div>
                        <div id="pie-legend" class="mt-4 space-y-2 max-h-40 overflow-y-auto"></div>
                    </div>

                    <!-- Bar Chart -->
                    <div class="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-semibold text-slate-800 flex items-center gap-2">
                                <i data-lucide="bar-chart-2" class="w-5 h-5 text-purple-500"></i>
                                รายรับ vs รายจ่ายรายเดือน
                            </h3>
                        </div>
                        <div class="relative h-64">
                            <canvas id="monthlyBarChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Accounts Line Chart -->
                <div class="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold text-slate-800 flex items-center gap-2">
                            <i data-lucide="wallet" class="w-5 h-5 text-emerald-500"></i>
                            แนวโน้มยอดเงินคงเหลือสะสม (Accounts)
                        </h3>
                    </div>
                    <div class="relative h-72">
                        <canvas id="accountsLineChart"></canvas>
                    </div>
                </div>

                <!-- Investments Line Chart -->
                <div class="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold text-slate-800 flex items-center gap-2">
                            <i data-lucide="trending-up" class="w-5 h-5 text-blue-500"></i>
                            แนวโน้มยอดเงินคงเหลือสะสม (Investments)
                        </h3>
                    </div>
                    <div class="relative h-72">
                        <canvas id="investmentsLineChart"></canvas>
                    </div>
                </div>

                <!-- Multi-line Chart -->
                <div class="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="font-semibold text-slate-800 flex items-center gap-2">
                            <i data-lucide="activity" class="w-5 h-5 text-orange-500"></i>
                            แนวโน้มหมวดหมู่รายจ่ายยอดนิยม
                        </h3>
                        <div class="flex items-center gap-3 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                            <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">แสดงสูงสุด:</span>
                            <input type="range" id="top-trend-slider" 
                                min="3" max="15" value="${this.topTrendCount}"
                                oninput="ReportsPage.updateTopTrendCount(this.value)"
                                class="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500">
                            <span id="top-trend-val" class="text-xs font-bold text-orange-600 w-4">${this.topTrendCount}</span>
                        </div>
                    </div>
                    <div class="relative h-72">
                        <canvas id="trendMultiLineChart"></canvas>
                    </div>
                </div>
                </div>
            </div>
        `;
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Events are bound via onclick in HTML for simplicity
        // Re-initialize Lucide icons after render
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    /**
     * Apply date filter
     */
    applyFilter() {
        const startInput = document.getElementById('report-start-date');
        const endInput = document.getElementById('report-end-date');
        
        if (!startInput.value || !endInput.value) {
            Toast.show('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด', 'error');
            return;
        }

        if (new Date(startInput.value) > new Date(endInput.value)) {
            Toast.show('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด', 'error');
            return;
        }

        this.dateRange.start = startInput.value;
        this.dateRange.end = endInput.value;
        
        this.loadData();
    },

    /**
     * Reset filter to current month
     */
    resetFilter() {
        this.setupDateDefaults();
        const startInput = document.getElementById('report-start-date');
        const endInput = document.getElementById('report-end-date');
        if (startInput) startInput.value = this.dateRange.start;
        if (endInput) endInput.value = this.dateRange.end;
        
        this.loadData();
    },

    /**
     * Update top trend count slider
     */
    updateTopTrendCount(val) {
        this.topTrendCount = parseInt(val);
        document.getElementById('top-trend-val').textContent = val;
        if (this.currentData.trendData) {
            this.createMultiLineChart();
        }
    },

    /**
     * Set date range by months
     */
    setRangeMonths(months) {
        const end = new Date();
        const start = new Date();
        start.setMonth(end.getMonth() - (months - 1));
        start.setDate(1); // วันที่ 1
        
        const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0);
        
        this.dateRange.start = start.toISOString().split('T')[0];
        this.dateRange.end = lastDay.toISOString().split('T')[0];
        
        document.getElementById('report-start-date').value = this.dateRange.start;
        document.getElementById('report-end-date').value = this.dateRange.end;
        
        this.applyFilter();
    },

    /**
     * Toggle transfers visibility
     */
    toggleTransfers() {
        this.showTransfers = !this.showTransfers;
        const btn = document.getElementById('report-transfer-toggle');
        if (btn) {
            if (this.showTransfers) {
                btn.innerHTML = '<i data-lucide="eye" class="w-3.5 h-3.5"></i> แสดงรายการโอน';
                btn.classList.add('bg-blue-500', 'text-white', 'border-blue-500');
                btn.classList.remove('bg-white', 'text-slate-600', 'border-slate-200');
            } else {
                btn.innerHTML = '<i data-lucide="eye-off" class="w-3.5 h-3.5"></i> ซ่อนรายการโอน';
                btn.classList.remove('bg-blue-500', 'text-white', 'border-blue-500');
                btn.classList.add('bg-white', 'text-slate-600', 'border-slate-200');
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        this.loadData();
    },

    /**
     * Load all necessary data from Supabase
     */
    async loadData() {
        try {
            const user = await Auth.getCurrentUser();
            if (!user) {
                Toast.show('กรุณาเข้าสู่ระบบก่อน', 'error');
                return;
            }

            // Fetch transactions in date range
            const { data: transactions, error: txError } = await DB.getTransactions(user.id, {
                dateFrom: this.dateRange.start,
                dateTo: this.dateRange.end,
                limit: 50000,
                ascending: true
            });

            if (txError) throw txError;

            // Fetch last 6 months data for trend charts (อิงจากวันที่เลือกเป็นหลัก)
            const sixMonthsAgo = new Date(this.dateRange.start);
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            
            const { data: trendData, error: trendError } = await DB.getTransactions(user.id, {
                dateFrom: sixMonthsAgo.toISOString().split('T')[0],
                dateTo: this.dateRange.end,
                limit: 50000,
                ascending: true
            });

            if (trendError) throw trendError;

            // Fetch accounts and investment details
            const { data: accounts, error: accError } = await supabaseClient
                .from('accounts')
                .select('*, investments (*)')
                .eq('user_id', user.id)
                .eq('is_active', true);

            if (accError) throw accError;

            // Helper: จัดกลุ่มประเภทบัญชี
            const getAccGroup = (type) => {
                const t = (type || '').toLowerCase();
                if (['savings', 'cash', 'digital_wallet', 'current', 'other_asset'].includes(t)) return 'asset';
                if (['investment', 'mutual_fund', 'stock', 'gold'].includes(t)) return 'investment';
                if (['credit_card', 'loan', 'debt'].includes(t)) return 'liability';
                return 'asset';
            };

            // --- คำนวณยอดเงินยกมาแยกประเภท (Opening Balance by Group) ---
            const currentBalances = { asset: 0, investment: 0, liability: 0 };
            (accounts || []).forEach(a => {
                const group = getAccGroup(a.type);
                currentBalances[group] += parseFloat(a.balance || 0);
            });

            const { data: allRecentTx, error: flowError } = await DB.getTransactions(user.id, {
                dateFrom: this.dateRange.start,
                limit: 50000,
                ascending: true
            });

            if (flowError) throw flowError;

            const netFlows = { asset: 0, investment: 0, liability: 0 };
            (allRecentTx || []).forEach(t => {
                const group = getAccGroup(t.accounts?.type);
                const amt = parseFloat(t.amount || 0);
                const type = (t.type || '').toLowerCase();
                if (type === 'income') netFlows[group] += amt;
                else if (type === 'expense') netFlows[group] -= amt;
            });

            this.openingBalance = currentBalances.asset + currentBalances.investment + currentBalances.liability - (netFlows.asset + netFlows.investment + netFlows.liability);
            this.groupOpeningBalances = {
                asset: currentBalances.asset - netFlows.asset,
                investment: currentBalances.investment - netFlows.investment,
                liability: currentBalances.liability - netFlows.liability
            };
            // -----------------------------------------------------

            const txWithAccType = transactions.map(t => ({
                ...t,
                account_group: getAccGroup(t.accounts?.type)
            }));

            // แยกข้อมูลเป็น 2 ชุด: 
            // 1. ชุดเต็ม (รวมรายการโอน) สำหรับใช้คำนวณยอดคงเหลือสะสมในกราฟเส้น
            // 2. ชุดที่กรองรายการโอนออก สำหรับใช้ในกราฟรายรับ-รายจ่าย (Pie/Bar)
            const transferNames = ['transfer between accounts', 'โอนเงินระหว่างบัญชี', 'transfer+', 'transfer-', 'โอน+', 'โอน-'];
            const filterTransfers = (list) => (list || []).filter(t => {
                const catName = (t.categories?.name || '').toLowerCase();
                return !transferNames.includes(catName) && !catName.includes('transfer') && !catName.includes('โอน');
            });

            this.currentData = {
                transactions: txWithAccType, // ชุดเต็มรวมโอน
                filteredTransactions: filterTransfers(txWithAccType), // ชุดกรองโอนออก
                accounts: accounts || [],
                trendData: trendData || []
            };

            const chartsContainer = document.getElementById('reports-charts-wrap');
            if (chartsContainer) chartsContainer.classList.remove('opacity-40', 'pointer-events-none');
            this.updateSummaryCards();
            this.createCharts();
            
        } catch (error) {
            console.error('Error loading report data:', error);
            Toast.show('ไม่สามารถโหลดข้อมูลรายงานได้', 'error');
        }
    },

    /**
     * Update summary cards
     */
    updateSummaryCards() {
        const animateCurrency = (el, target, duration = 1000) => {
            const startTs = performance.now();
            const from = 0;
            const to = Number(target || 0);
            const tick = (now) => {
                const p = Math.min((now - startTs) / duration, 1);
                const eased = 1 - Math.pow(1 - p, 3);
                const val = from + (to - from) * eased;
                el.textContent = Format.currency(val);
                if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        };

        const animateSummaryNumbers = (root) => {
            root.querySelectorAll('[data-countup-currency]').forEach((el) => {
                animateCurrency(el, Number(el.getAttribute('data-countup-currency') || 0), 1000);
            });
        };

        const transactions = this.currentData.filteredTransactions;
        const chartsWrap = document.getElementById('reports-charts-wrap');
        const container = document.getElementById('reports-summary');

        if (transactions.length === 0 && this.currentData.accounts.length === 0) {
            if (container) {
                container.innerHTML = `
                    <div class="col-span-full bg-white rounded-xl shadow-sm p-12 min-h-[50vh] animate-fade-in-up flex flex-col items-center justify-center text-center">
                        <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                            <i data-lucide="bar-chart-2" class="w-8 h-8 text-slate-300"></i>
                        </div>
                        <h3 class="font-semibold text-slate-600 mb-2">ไม่พบข้อมูลในช่วงเวลานี้</h3>
                        <p class="text-sm text-slate-400">ลองเปลี่ยนช่วงวันที่หรือเพิ่มธุรกรรมก่อน</p>
                    </div>
                `;
                lucide.createIcons();
            }
            if (chartsWrap) chartsWrap.classList.add('hidden');
            return;
        }

        if (chartsWrap) chartsWrap.classList.remove('hidden');

        const totalIncome = transactions
            .filter(t => (t.type || '').toLowerCase() === 'income')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
        const totalExpense = transactions
            .filter(t => (t.type || '').toLowerCase() === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        
        const totalInvestment = this.currentData.accounts
            .filter(a => (a.type || '').toLowerCase() === 'investment')
            .reduce((sum, a) => {
                const inv = a.investments?.[0];
                return sum + (inv ? parseFloat(inv.current_value || 0) : parseFloat(a.balance || 0));
            }, 0);

        if (container) {
            container.innerHTML = `
                <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-200 border-l-4 border-l-emerald-500 animate-fade-in-up stagger-1">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-slate-500 font-medium">รายรับรวม</p>
                            <p class="text-2xl font-bold text-emerald-600 mt-1" data-countup-currency="${totalIncome}">${Format.currency(0)}</p>
                        </div>
                        <div class="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                            <i data-lucide="arrow-down-left" class="w-6 h-6 text-emerald-600"></i>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-200 border-l-4 border-l-red-500 animate-fade-in-up stagger-2">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-slate-500 font-medium">รายจ่ายรวม</p>
                            <p class="text-2xl font-bold text-red-600 mt-1" data-countup-currency="${totalExpense}">${Format.currency(0)}</p>
                        </div>
                        <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <i data-lucide="arrow-up-right" class="w-6 h-6 text-red-600"></i>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-200 border-l-4 border-l-indigo-500 animate-fade-in-up stagger-3">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-slate-500 font-medium">มูลค่าการลงทุนรวม</p>
                            <p class="text-2xl font-bold text-indigo-600 mt-1" data-countup-currency="${totalInvestment}">${Format.currency(0)}</p>
                        </div>
                        <div class="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                            <i data-lucide="trending-up" class="w-6 h-6 text-indigo-600"></i>
                        </div>
                    </div>
                </div>
            `;
            lucide.createIcons();
            animateSummaryNumbers(container);
        }
    },

    /**
     * Create all charts
     */
    createCharts() {
        this.createPieChart();
        this.createBarChart();
        this.createAccountsLineChart();
        this.createInvestmentsLineChart();
        this.createMultiLineChart();
    },

    /**
     * Create Pie Chart - Expense by Category
     */
    createPieChart() {
        const ctx = document.getElementById('expensePieChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.charts.pie) {
            this.charts.pie.destroy();
        }

        // Aggregation logic with case-insensitive and empty check
        const expenses = this.currentData.filteredTransactions.filter(t => 
            (t.type || '').toLowerCase() === 'expense'
        );
        const categoryMap = {};
        
        expenses.forEach(t => {
            const catName = t.categories?.name || 'ไม่ระบุหมวดหมู่';
            categoryMap[catName] = (categoryMap[catName] || 0) + parseFloat(t.amount || 0);
        });

        // Sort all
        const sorted = Object.entries(categoryMap)
            .sort((a, b) => b[1] - a[1]);
        
        const legendContainer = document.getElementById('pie-legend');
        if (sorted.length === 0) {
            if (legendContainer) legendContainer.innerHTML = '<p class="text-center text-slate-400 text-sm py-8">ไม่มีข้อมูลรายจ่ายในช่วงเวลานี้</p>';
            return;
        }
        
        const labels = sorted.map(([name]) => name);
        const data = sorted.map(([, amount]) => amount);
        const totalAll = data.reduce((a, b) => a + b, 0);

        // Dynamic Colors for many categories
        const baseColors = [
            '#F43F5E', '#FB923C', '#FBBF24', '#34D399', '#3B82F6', '#8B5CF6', 
            '#EC4899', '#06B6D4', '#6366F1', '#14B8A6', '#F97316', '#A855F7'
        ];
        const colors = sorted.map((_, i) => baseColors[i % baseColors.length]);

        this.charts.pie = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 800,
                },
                plugins: {
                    legend: {
                        display: false // Custom legend below
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = Format.currency(context.raw);
                                const percentage = ((context.raw / totalAll) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                onClick: (evt, activeElements, chart) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const label = chart.data.labels[index];
                        const filtered = this.currentData.transactions.filter(t => 
                            (t.categories?.name || 'ไม่ระบุหมวดหมู่') === label && 
                            (t.type || '').toLowerCase() === 'expense'
                        );
                        this.openDrillDownModal(filtered, `หมวดหมู่: ${label}`);
                    }
                }
            }
        });

        // Custom legend
        if (legendContainer) {
            legendContainer.innerHTML = labels.map((label, index) => `
                <div class="flex items-center justify-between text-sm">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full" style="background-color: ${colors[index]}"></div>
                        <span class="text-slate-700">${label}</span>
                    </div>
                    <span class="font-medium text-slate-900">${Format.currency(data[index])}</span>
                </div>
            `).join('');
        }
    },

    /**
     * Create Bar Chart - Monthly Income vs Expense
     */
    createBarChart() {
        const ctx = document.getElementById('monthlyBarChart');
        if (!ctx) return;

        if (this.charts.bar) {
            this.charts.bar.destroy();
        }

        // Group by month
        const monthlyData = {};
        this.currentData.filteredTransactions.forEach(t => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { label: monthLabel, income: 0, expense: 0 };
            }
            
            const amt = parseFloat(t.amount || 0);
            const typeLower = (t.type || '').toLowerCase();
            if (typeLower === 'income') {
                monthlyData[monthKey].income += amt;
            } else if (typeLower === 'expense') {
                monthlyData[monthKey].expense += amt;
            }
        });

        const sortedMonths = Object.entries(monthlyData).sort((a, b) => a[0].localeCompare(b[0]));
        const labels = sortedMonths.map(([, data]) => data.label);
        const incomeData = sortedMonths.map(([, data]) => data.income);
        const expenseData = sortedMonths.map(([, data]) => data.expense);

        this.charts.bar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'รายรับ',
                        data: incomeData,
                        backgroundColor: Theme.palette().success,
                        borderRadius: 4,
                    },
                    {
                        label: 'รายจ่าย',
                        data: expenseData,
                        backgroundColor: Theme.palette().danger,
                        borderRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    y: {
                        from: 0,
                        duration: 700,
                        easing: 'easeOutQuart',
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => Format.compactNumber(value)
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    }
                },
                onClick: (evt, activeElements, chart) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const datasetIndex = activeElements[0].datasetIndex;
                        const label = chart.data.labels[index]; // e.g. "เม.ย. 67"
                        const type = chart.data.datasets[datasetIndex].label === 'รายรับ' ? 'income' : 'expense';
                        
                        // กรองตามเดือนและปี
                        const filtered = this.currentData.transactions.filter(t => {
                            const date = new Date(t.date);
                            const monthLabel = date.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
                            return monthLabel === label && (t.type || '').toLowerCase() === type;
                        });
                        this.openDrillDownModal(filtered, `รายละเอียด ${chart.data.datasets[datasetIndex].label}: ${label}`);
                    }
                }
            }
        });
    },

    /**
     * Create Line Chart - Accounts (Assets) Trend
     */
    createAccountsLineChart() {
        const ctx = document.getElementById('accountsLineChart');
        if (!ctx) return;
        if (this.charts.accountsLine) this.charts.accountsLine.destroy();

        const dailyBalance = {};
        this.currentData.transactions
            .filter(t => t.account_group === 'asset' || t.account_group === 'liability')
            .forEach(t => {
                const date = t.date;
                if (!dailyBalance[date]) dailyBalance[date] = 0;
                const amt = parseFloat(t.amount || 0);
                if (t.type === 'income') dailyBalance[date] += amt;
                else if (t.type === 'expense') dailyBalance[date] -= amt;
            });

        const sortedDates = Object.keys(dailyBalance).sort();
        // รวม Asset + Liability (สุทธิ)
        let running = (this.groupOpeningBalances?.asset || 0) + (this.groupOpeningBalances?.liability || 0);
        
        const data = [{
            date: new Date(this.dateRange.start).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
            balance: running
        }];

        sortedDates.forEach(date => {
            running += dailyBalance[date];
            data.push({
                date: new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
                balance: running
            });
        });

        this.charts.accountsLine = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date),
                datasets: [{
                    label: 'ยอดเงินคงเหลือสะสม (Accounts)',
                    data: data.map(d => d.balance),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true, tension: 0.4, pointRadius: 2
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    },

    /**
     * Create Line Chart - Investments Trend
     */
    createInvestmentsLineChart() {
        const ctx = document.getElementById('investmentsLineChart');
        if (!ctx) return;
        if (this.charts.investmentsLine) this.charts.investmentsLine.destroy();

        const dailyBalance = {};
        this.currentData.transactions
            .filter(t => t.account_group === 'investment')
            .forEach(t => {
                const date = t.date;
                if (!dailyBalance[date]) dailyBalance[date] = 0;
                const amt = parseFloat(t.amount || 0);
                if (t.type === 'income') dailyBalance[date] += amt;
                else if (t.type === 'expense') dailyBalance[date] -= amt;
            });

        const sortedDates = Object.keys(dailyBalance).sort();
        let running = this.groupOpeningBalances?.investment || 0;
        
        const data = [{
            date: new Date(this.dateRange.start).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
            balance: running
        }];

        sortedDates.forEach(date => {
            running += dailyBalance[date];
            data.push({
                date: new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
                balance: running
            });
        });

        this.charts.investmentsLine = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date),
                datasets: [{
                    label: 'ยอดเงินคงเหลือสะสม (Investments)',
                    data: data.map(d => d.balance),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true, tension: 0.4, pointRadius: 2
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    },

    /**
     * Create Multi-line Chart - Top 3 Categories Trend
     */
    createMultiLineChart() {
        const ctx = document.getElementById('trendMultiLineChart');
        if (!ctx) return;

        if (this.charts.multiLine) {
            this.charts.multiLine.destroy();
        }

        // Find top trend categories from selected range transactions
        const categoryTotals = {};
        this.currentData.filteredTransactions
            .filter(t => (t.type || '').toLowerCase() === 'expense')
            .forEach(t => {
                const catName = t.categories?.name || 'ไม่ระบุ';
                categoryTotals[catName] = (categoryTotals[catName] || 0) + parseFloat(t.amount);
            });

        const topCategoriesCount = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.topTrendCount)
            .map(([name]) => name);

        // Group by month (or day if range is small)
        const dailyData = {};
        const dates = new Set();
        
        this.currentData.filteredTransactions
            .filter(t => (t.type || '').toLowerCase() === 'expense' && topCategoriesCount.includes(t.categories?.name))
            .forEach(t => {
                const date = t.date;
                const catName = t.categories.name;
                
                dates.add(date);
                if (!dailyData[date]) dailyData[date] = { date: new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) };
                if (!dailyData[date][catName]) dailyData[date][catName] = 0;
                
                dailyData[date][catName] += parseFloat(t.amount);
            });

        const sortedDates = Array.from(dates).sort();
        const labels = sortedDates.map(d => dailyData[d].date);

        const colors = [
            '#F43F5E', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', 
            '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#A855F7', '#FBBF24'
        ];

        const datasets = topCategoriesCount.map((cat, index) => ({
            label: cat,
            data: sortedDates.map(d => dailyData[d][cat] || 0),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            tension: 0.4,
            pointRadius: 3,
            fill: false
        }));

        this.charts.multiLine = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 10,
                            boxWidth: 8,
                            font: { size: 10 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.dataset.label || '';
                                const value = Format.currency(context.raw);
                                return `${label}: ${value}`;
                            }
                        }
                    }
                },
                onClick: (evt, activeElements, chart) => {
                    if (activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const datasetIndex = activeElements[0].datasetIndex;
                        const dateLabel = chart.data.labels[index]; 
                        const catName = chart.data.datasets[datasetIndex].label;
                        
                        const filtered = this.currentData.transactions.filter(t => {
                            const date = new Date(t.date);
                            const dLabel = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                            return dLabel === dateLabel && (t.categories?.name || 'ไม่ระบุ') === catName && (t.type || '').toLowerCase() === 'expense';
                        });
                        this.openDrillDownModal(filtered, `หมวดหมู่ ${catName}: วันที่ ${dateLabel}`);
                    }
                }
            }
        });
    },

    /**
     * Open Drill-down Modal
     */
    openDrillDownModal(transactions, title) {
        if (!transactions || transactions.length === 0) {
            Toast.show('ไม่พบข้อมูลรายการ', 'info');
            return;
        }

        let modal = document.getElementById('drilldown-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'drilldown-modal';
            modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6';
            document.body.appendChild(modal);
        }

        this._modalData = {
            transactions: [...transactions],
            title: title,
            sort: { key: 'date', direction: 'desc' }
        };

        this.renderDrillDown();
        modal.classList.remove('hidden');
    },

    renderDrillDown() {
        const modal = document.getElementById('drilldown-modal');
        if (!modal || !this._modalData) return;

        const { transactions, title, sort } = this._modalData;

        // Sort data
        const sortedData = [...transactions].sort((a, b) => {
            let aVal, bVal;
            if (sort.key === 'amount') {
                aVal = parseFloat(a.amount) * (a.type === 'expense' ? -1 : 1);
                bVal = parseFloat(b.amount) * (b.type === 'expense' ? -1 : 1);
            } else if (sort.key === 'category') {
                aVal = a.categories?.name || '';
                bVal = b.categories?.name || '';
            } else {
                aVal = a[sort.key];
                bVal = b[sort.key];
            }

            if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        modal.innerHTML = `
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick="ReportsPage.closeDrillDown()"></div>
            <div class="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden relative animate-fade-in-up flex flex-col max-h-[85vh]">
                <!-- Header -->
                <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 class="text-lg font-bold text-slate-800">${title}</h3>
                        <p class="text-xs text-slate-500 font-medium">พบ ${sortedData.length} รายการ</p>
                    </div>
                    <button onclick="ReportsPage.closeDrillDown()" class="w-10 h-10 rounded-full hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shadow-sm">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <!-- Content -->
                <div class="flex-1 overflow-y-auto p-4 sm:p-6 bg-white">
                    <table class="w-full text-left text-sm border-separate border-spacing-y-2">
                        <thead>
                            <tr class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <th class="px-4 py-2 cursor-pointer hover:text-blue-600" onclick="ReportsPage.sortDrillDown('date')">
                                    Date ${sort.key === 'date' ? (sort.direction === 'asc' ? '↑' : '↓') : ''}
                                </th>
                                <th class="px-4 py-2 cursor-pointer hover:text-blue-600" onclick="ReportsPage.sortDrillDown('category')">
                                    Category ${sort.key === 'category' ? (sort.direction === 'asc' ? '↑' : '↓') : ''}
                                </th>
                                <th class="px-4 py-2 text-right cursor-pointer hover:text-blue-600" onclick="ReportsPage.sortDrillDown('amount')">
                                    Amount ${sort.key === 'amount' ? (sort.direction === 'asc' ? '↑' : '↓') : ''}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedData.map(t => `
                                <tr class="bg-slate-50/50 hover:bg-slate-50 transition-colors rounded-xl overflow-hidden cursor-pointer group" onclick="ReportsPage.editTransaction('${t.id}')">
                                    <td class="px-4 py-3 first:rounded-l-xl">
                                        <span class="font-medium text-slate-600">${new Date(t.date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}</span>
                                    </td>
                                    <td class="px-4 py-3">
                                        <div class="flex flex-col">
                                            <div class="flex items-center gap-2">
                                                <span class="w-2 h-2 rounded-full" style="background-color: ${t.categories?.color || '#cbd5e1'}"></span>
                                                <span class="text-slate-700 font-bold">${t.categories?.name || 'อื่นๆ'}</span>
                                            </div>
                                            ${t.from_or_to ? `<span class="text-[10px] text-blue-500 font-medium ml-4">• ${t.from_or_to}</span>` : ''}
                                        </div>
                                    </td>
                                    <td class="px-4 py-3 text-right last:rounded-r-xl">
                                        <span class="font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}">
                                            ${t.type === 'income' ? '+' : '-'}${Format.money(t.amount)}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    editTransaction(id) {
        if (typeof TransactionsPage !== 'undefined') {
            // ตรวจสอบและเตรียมข้อมูลให้ TransactionsPage หากยังไม่มี
            if (!TransactionsPage.transactions || TransactionsPage.transactions.length === 0) {
                TransactionsPage.transactions = this.currentData.transactions || [];
            }
            if (!TransactionsPage.accounts || TransactionsPage.accounts.length === 0) {
                TransactionsPage.accounts = this.currentData.accounts || [];
            }
            
            // ปิด Modal รายละเอียดก่อน
            this.closeDrillDown();
            
            // เปิด Modal แก้ไข
            TransactionsPage.openModal(id);
        } else {
            console.warn('TransactionsPage is not loaded');
            Toast.show('ไม่สามารถเปิดหน้าแก้ไขได้ในขณะนี้', 'error');
        }
    },

    sortDrillDown(key) {
        if (!this._modalData) return;
        const current = this._modalData.sort;
        const direction = (current.key === key && current.direction === 'desc') ? 'asc' : 'desc';
        this._modalData.sort = { key, direction };
        this.renderDrillDown();
    },

    closeDrillDown() {
        const modal = document.getElementById('drilldown-modal');
        if (modal) modal.classList.add('hidden');
    },

    /**
     * Export chart data as JSON
     */
    exportData() {
        const exportPayload = {
            generatedAt: new Date().toISOString(),
            dateRange: this.dateRange,
            summary: {
                totalTransactions: this.currentData.transactions.length,
                totalIncome: this.currentData.transactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0),
                totalExpense: this.currentData.transactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0)
            },
            transactions: this.currentData.transactions
        };

        const dataStr = JSON.stringify(exportPayload, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `expense-report-${this.dateRange.start}-to-${this.dateRange.end}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        Toast.show('ส่งออกข้อมูลเรียบร้อย', 'success');
    },

    /**
     * Mount the page
     */
    async mount() {
        if (!this.dateRange.start || !this.dateRange.end) {
            this.setupDateDefaults();
        }
        const container = document.getElementById('page-content');
        if (container) {
            // เรนเดอร์โครงหน้าทันทีเพื่อให้ User เห็น UI ทันทีไม่ต้องรอโหลดข้อมูล
            container.innerHTML = this.render();
            if (window.lucide) lucide.createIcons();
            this.bindEvents();
            
            // ค่อยๆ โหลดข้อมูลมาเติมในช่องว่าง
            await this.loadData();
        }
    }
};
