// متغيرات عامة للنظام المالي
let voices = [
    { name: "سلطان البلوشي", rate: 50 },
    { name: "الشيماء العبري", rate: 40 }
];
let clients = [
    { name: "مازن المعولي", addedTime: 1680000000000 },
    { name: "أوريدو", addedTime: 1680001000000 }
];
let reservations = [
    {
        id: "#RES-001",
        client: "مازن المعولي",
        recordTime: "2025-01-05T06:00",
        workPrice: 400,
        voiceActors: [{ name: "سلطان البلوشي", fee: 50 }],
        invoiceNumber: "INV2025-01",
        actorDueDate: "2025-01-20",
        actorPaid: false,
        notes: "",
        paidDate: "",
        invoicePaid: false
    },
    {
        id: "#RES-002",
        client: "أوريدو",
        recordTime: "2025-01-10T14:30",
        workPrice: 650,
        voiceActors: [
            { name: "سلطان البلوشي", fee: 80 },
            { name: "الشيماء العبري", fee: 40 }
        ],
        invoiceNumber: "INV2025-02",
        actorDueDate: "2025-01-15",
        actorPaid: true,
        notes: "",
        paidDate: "2025-01-12",
        invoicePaid: true
    }
];

// إضافة مصفوفة للفواتير
let invoices = [
    {
        invoiceNumber: "INV2025-01",
        date: "2025-01-05",
        customer: "مازن المعولي",
        email: "",
        additionalInfo: "",
        subtotal: 400,
        tax1: 0,
        tax2: 0,
        invoiceAmount: 400,
        receivedAmount: 0,
        paymentDate: "",
        isPaid: false
    },
    {
        invoiceNumber: "INV2025-02",
        date: "2025-01-10",
        customer: "أوريدو",
        email: "",
        additionalInfo: "",
        subtotal: 650,
        tax1: 0,
        tax2: 0,
        invoiceAmount: 650,
        receivedAmount: 650,
        paymentDate: "2025-01-12",
        isPaid: true
    }
];

// سجل عمليات الفواتير
let invoiceAuditLog = [
    { operation: "Import", invoiceNumber: "INV2025-01", date: "2025-01-06 10:30:00" },
    { operation: "Import", invoiceNumber: "INV2025-02", date: "2025-01-12 14:15:00" }
];

let stateHistory = []; // لسجل التراجع
let reservationChart, reservationBarChart, revenueExpenseChart, invoiceRevenueChart;
let balance = 10000; // الرصيد الحالي
const monthlyExpense = 2000; // المصروفات الشهرية
const minBalance = 4000; // الحد الأدنى للرصيد

// تنفيذ بعد تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
    // إنشاء مؤشر المزامنة
    createSyncIndicatorIfNeeded();
    
    // إخفاء واجهة المستخدم حتى يتم تسجيل الدخول
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.style.display = 'none';
    }
    
    // تجهيز وظائف النظام
    setupUIFunctions();
    
    // تحديث الجداول والإحصائيات
    initializeTables();
    
    // إعداد التبويبات في صفحة التقارير
    setupReportTabs();
    
    // تخطي تسجيل الدخول للاختبار
    skipLogin();
});

// إنشاء مؤشر المزامنة
function createSyncIndicatorIfNeeded() {
    if (!document.getElementById('syncIndicator')) {
        const syncIndicator = document.createElement('div');
        syncIndicator.id = 'syncIndicator';
        syncIndicator.className = 'sync-indicator';
        syncIndicator.innerHTML = `
            <div class="sync-content">
                <i class='bx bx-sync bx-spin'></i>
                <p id="syncMessage">جاري مزامنة البيانات...</p>
            </div>
        `;
        document.body.appendChild(syncIndicator);
    }
}

// إعداد وظائف واجهة المستخدم
function setupUIFunctions() {
    // تجهيز القوائم المنسدلة
    populateDatalists();
    
    // تجهيز المودالات
    createEditVoiceModal();
    createEditClientModal();
    createEditReservationModal();
    
    // إعداد الرسوم البيانية
    try {
        initCharts();
    } catch (e) {
        console.error("خطأ في تهيئة المخططات البيانية:", e);
    }
    
    // تحديث الإحصائيات
    updateAllStatistics();
}

// تهيئة الجداول وعرضها
function initializeTables() {
    try {
        renderVoicesTable();
        renderClientsTable();
        renderReservationsTable();
        renderInvoicesTable();
        renderInvoiceAuditLogTable();
        renderReports();
    } catch (e) {
        console.error("خطأ في تهيئة الجداول:", e);
    }
}

// تحديث الإحصائيات
function updateAllStatistics() {
    // تحديث إجمالي الإيرادات
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.receivedAmount, 0);
    const totalDue = invoices.reduce((sum, inv) => !inv.isPaid ? sum + inv.invoiceAmount : sum, 0);
    document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString();
    
    // تحديث المستحقات المعلقة
    let totalActorFee = 0;
    reservations.forEach(res => {
        if (!res.actorPaid) {
            res.voiceActors.forEach(actor => {
                totalActorFee += actor.fee;
            });
        }
    });
    document.getElementById('totalActorFee').textContent = totalActorFee.toLocaleString();
    
    // تحديث الأموال المتاحة
    const availableFunds = balance - minBalance;
    document.getElementById('availableFunds').textContent = availableFunds.toLocaleString();
    
    // تحديث الرصيد الحالي
    document.getElementById('balanceSpan').textContent = balance.toLocaleString();
    
    // تحديث صافي الربح
    const netProfit = totalRevenue - totalActorFee;
    document.getElementById('netProfit').textContent = netProfit.toLocaleString();
}

// تحديث الرصيد
function updateBalance() {
    const newBalanceInput = document.getElementById('newBalance');
    if (!newBalanceInput.value) return;
    
    balance = parseFloat(newBalanceInput.value);
    updateAllStatistics();
    newBalanceInput.value = '';
}

// وظيفة تخطي تسجيل الدخول (لاختبار التطبيق فقط)
function skipLogin() {
    document.getElementById('userRoleDisplay').textContent = `الدور: مالك`;
    
    // إزالة نافذة تسجيل الدخول من DOM
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.remove();
    }
    
    // تفعيل واجهة المستخدم
    const appContainer = document.querySelector('.app-container');
    if (appContainer) {
        appContainer.style.display = 'flex';
    }
    
    // تحديث الرسوم البيانية بعد إظهارها
    setTimeout(() => {
        try {
            updateCharts('day');
        } catch (e) {
            console.error("خطأ في تحديث المخططات:", e);
        }
    }, 100);
}

// عرض قسم محدد
function showSection(secId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(secId).classList.add('active');
    
    document.querySelectorAll('.nav-menu button').forEach(b => b.classList.remove('active-btn'));
    document.querySelector(`.nav-menu button[onclick="showSection('${secId}')"]`).classList.add('active-btn');
    
    // إخفاء الشريط الجانبي على الأجهزة المتحركة بعد اختيار القسم
    if(window.innerWidth <= 992) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

// تبديل الشريط الجانبي
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

// تبديل وضع العرض (الوضع المظلم)
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

// إغلاق مودال
function closeModal(modalId) {
    console.log('إغلاق النافذة المنبثقة:', modalId);
    const modal = document.getElementById(modalId);
    if (modal && modal.classList) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    } else if (modal) {
        modal.style.display = 'none';
        modal.className = 'modal'; // تغيير التصنيف إلى الوضع غير النشط
    }
    console.log('تم إغلاق النافذة المنبثقة:', modalId);
}

// ملء القوائم المنسدلة
function populateDatalists() {
    const clientList = document.getElementById('clientList');
    const invoiceList = document.getElementById('invoiceList');
    const voiceList = document.getElementById('voiceList');
    
    // إنشاء قائمة المعلقين إذا لم تكن موجودة
    if (!voiceList) {
        const newVoiceList = document.createElement('datalist');
        newVoiceList.id = 'voiceList';
        document.body.appendChild(newVoiceList);
    }
    
    // ملء قائمة العملاء
    if (clientList) {
        clientList.innerHTML = '';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.name;
            clientList.appendChild(option);
        });
    }
    
    // ملء قائمة الفواتير
    if (invoiceList) {
        invoiceList.innerHTML = '';
        invoices.forEach(invoice => {
            const option = document.createElement('option');
            option.value = invoice.invoiceNumber;
            invoiceList.appendChild(option);
        });
    }
    
    // ملء قائمة المعلقين
    const currentVoiceList = document.getElementById('voiceList');
    if (currentVoiceList) {
        currentVoiceList.innerHTML = '';
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            currentVoiceList.appendChild(option);
        });
    }
}

// ملء جدول المعلقين
function renderVoicesTable() {
    const table = document.getElementById('voicesTable');
    if (!table) return;
    
    // تفريغ الجدول باستثناء الصف الأول (العناوين)
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }
    
    // إضافة الصفوف الجديدة
    voices.forEach((voice, index) => {
        const row = table.insertRow();
        row.innerHTML = `
            <td>${voice.name}</td>
            <td>${voice.rate} ريال</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="editVoiceActor(${index})">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteVoice(${index})">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </td>
        `;
    });
    
    // إذا لم تكن هناك بيانات، أضف صف "لا توجد بيانات"
    if (voices.length === 0) {
        const row = table.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 3;
        cell.style.textAlign = 'center';
        cell.textContent = 'لا توجد بيانات';
    }
}

// ملء جدول العملاء
function renderClientsTable() {
    const table = document.getElementById('clientsTable');
    if (!table) return;
    
    // تفريغ الجدول باستثناء الصف الأول (العناوين)
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }
    
    // إضافة الصفوف الجديدة
    clients.forEach((client, index) => {
        const row = table.insertRow();
        row.innerHTML = `
            <td>${client.name}</td>
            <td>${new Date(client.addedTime).toLocaleDateString()}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="editClient(${index})">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteClient(${index})">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </td>
        `;
    });
    
    // إذا لم تكن هناك بيانات، أضف صف "لا توجد بيانات"
    if (clients.length === 0) {
        const row = table.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 3;
        cell.style.textAlign = 'center';
        cell.textContent = 'لا توجد بيانات';
    }
}

// إضافة مودال لتعديل المعلق
function createEditVoiceModal() {
    if (document.getElementById('editVoiceModal')) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editVoiceModal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="closeModal('editVoiceModal')">×</button>
            <h3>تعديل معلق صوتي</h3>
            <input type="hidden" id="editVoiceIndex">
            <label>اسم المعلق</label>
            <input type="text" id="editVoiceName" class="input" placeholder="اسم المعلق">
            <label>سعر خاص للدقيقة</label>
            <input type="number" id="editVoiceRate" class="input" placeholder="سعر خاص للدقيقة">
            <button class="btn" onclick="saveVoiceEdit()">
                <i class='bx bx-save'></i> حفظ التعديل
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

// إضافة مودال لتعديل العميل
function createEditClientModal() {
    if (document.getElementById('editClientModal')) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editClientModal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="closeModal('editClientModal')">×</button>
            <h3>تعديل بيانات العميل</h3>
            <input type="hidden" id="editClientIndex">
            <label>اسم العميل</label>
            <input type="text" id="editClientName" class="input" placeholder="اسم العميل">
            <button class="btn" onclick="saveClientEdit()">
                <i class='bx bx-save'></i> حفظ التعديل
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

// إضافة مودال لتعديل الحجز
function createEditReservationModal() {
    if (document.getElementById('editReservationModal')) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editReservationModal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="closeModal('editReservationModal')">×</button>
            <h3>تعديل حجز</h3>
            <input type="hidden" id="editReservationIndex">
            <label>اسم العميل</label>
            <input type="text" list="clientList" id="editResClient" class="input" placeholder="اكتب أو اختر">
            <label>التاريخ والوقت</label>
            <input type="datetime-local" id="editResTime" class="input">
            <label>سعر العمل (الإجمالي)</label>
            <input type="number" id="editResWorkPrice" class="input">
            <h4 style="margin-top: 20px; margin-bottom: 10px;">المعلقون وأجورهم</h4>
            <div id="editActorsList" style="background:var(--primary-light);padding:12px;border:1px solid var(--border-color);border-radius:8px;min-height:40px;margin-bottom:16px;">
            </div>
            <label>رقم الفاتورة (اختياري)</label>
            <input type="text" list="invoiceList" id="editResInvoiceNumber" class="input">
            <label>تاريخ استحقاق المعلق</label>
            <input type="date" id="editResDueDate" class="input">
            <div style="margin: 12px 0;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 0;">
                    <input type="checkbox" id="editResPaid" style="width: 18px; height: 18px;">
                    <span>تم الدفع؟</span>
                </label>
            </div>
            <label>تفاصيل الحجز</label>
            <textarea id="editResNotes" class="input" rows="3"></textarea>
            <button class="btn" onclick="saveReservationEdit()">
                <i class='bx bx-save'></i> حفظ التعديلات
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

// تهيئة المخططات البيانية
function initCharts() {
    const reservationChartCtx = document.getElementById('reservationChart');
    const reservationBarChartCtx = document.getElementById('reservationBarChart');
    const revenueExpenseChartCtx = document.getElementById('revenueExpenseChart');
    const invoiceRevenueChartCtx = document.getElementById('invoiceRevenueChart');
    
    if (!reservationChartCtx || !reservationBarChartCtx || !revenueExpenseChartCtx || !invoiceRevenueChartCtx) {
        console.error('لم يتم العثور على عناصر المخططات البيانية');
        return;
    }
    
    // مخطط الحجوزات حسب الفترة
    reservationChart = new Chart(reservationChartCtx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو'],
            datasets: [{
                label: 'عدد الحجوزات',
                data: [12, 19, 8, 15, 10],
                borderColor: 'rgba(18, 132, 110, 1)',
                backgroundColor: 'rgba(18, 132, 110, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    // مخطط الحجوزات حسب العميل
    reservationBarChart = new Chart(reservationBarChartCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['مازن المعولي', 'أوريدو', 'طلال', 'بنك مسقط'],
            datasets: [{
                label: 'عدد الحجوزات',
                data: [4, 7, 2, 5],
                backgroundColor: 'rgba(18, 132, 110, 0.6)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    // مخطط الإيرادات والمصروفات
    revenueExpenseChart = new Chart(revenueExpenseChartCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو'],
            datasets: [
                {
                    label: 'الإيرادات',
                    data: [12000, 19000, 14000, 15000, 22000],
                    backgroundColor: 'rgba(46, 204, 113, 0.6)'
                },
                {
                    label: 'المصروفات',
                    data: [8000, 12000, 9000, 7000, 11000],
                    backgroundColor: 'rgba(231, 76, 60, 0.6)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    // مخطط حالة الفواتير
    invoiceRevenueChart = new Chart(invoiceRevenueChartCtx.getContext('2d'), {
        type: 'pie',
        data: {
            labels: ['مدفوعة', 'معلقة'],
            datasets: [{
                data: [65, 35],
                backgroundColor: [
                    'rgba(46, 204, 113, 0.6)',
                    'rgba(241, 196, 15, 0.6)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// تحديث المخططات البيانية
function updateCharts(grouping = 'day') {
    // هنا يمكن إضافة منطق لتحديث المخططات حسب التجميع المطلوب (يوم/شهر/سنة)
    console.log(`تحديث المخططات حسب: ${grouping}`);
}

// إعداد التبويبات في صفحة التقارير
function setupReportTabs() {
    const reportTabs = document.querySelectorAll('.report-tab');
    if (!reportTabs) return;
    
    reportTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // إزالة الفئة النشطة من جميع التبويبات
            reportTabs.forEach(t => t.classList.remove('active'));
            // إضافة الفئة النشطة للتبويب المحدد
            this.classList.add('active');
            
            // إخفاء جميع أقسام التقارير
            document.getElementById('summaryReport').classList.add('hidden');
            document.getElementById('actorsReport').classList.add('hidden');
            document.getElementById('clientsReport').classList.add('hidden');
            
            // إظهار القسم المطلوب
            const reportType = this.getAttribute('data-report');
            document.getElementById(reportType + 'Report').classList.remove('hidden');
        });
    });
}

// عرض جدول الحجوزات
function renderReservationsTable() {
    const table = document.getElementById('reservationsTable');
    if (!table) return;
    
    // تفريغ الجدول باستثناء الصف الأول (العناوين)
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }
    
    // إضافة الصفوف الجديدة
    reservations.forEach((reservation, index) => {
        // تنسيق التاريخ والوقت
        const recordDate = new Date(reservation.recordTime);
        const formattedDate = recordDate.toLocaleDateString();
        const formattedTime = recordDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // تجميع أسماء المعلقين وحساب إجمالي مستحقاتهم
        let totalActorFees = 0;
        reservation.voiceActors.forEach(actor => {
            totalActorFees += actor.fee;
        });
        const actorNames = reservation.voiceActors.map(actor => actor.name).join(', ');
        
        // حساب صافي الإيراد للاستديو من هذا الحجز
        const studioRevenue = reservation.workPrice - totalActorFees;
        
        // التحقق من وجود الفاتورة المرتبطة
        const linkedInvoice = invoices.find(inv => inv.invoiceNumber === reservation.invoiceNumber);
        const hasValidInvoice = linkedInvoice !== undefined;
        
        // تنسيق تاريخ استحقاق الدفع وعرض الأيام المتبقية
        let dueDateInfo = '-';
        if (reservation.actorDueDate) {
            const dueDate = new Date(reservation.actorDueDate);
            const today = new Date();
            const timeDiff = dueDate - today;
            const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
            
            if (daysRemaining < 0 && !reservation.actorPaid) {
                dueDateInfo = `<span style="color:red">${reservation.actorDueDate} (متأخر ${Math.abs(daysRemaining)} يوم)</span>`;
            } else if (daysRemaining <= 3 && !reservation.actorPaid) {
                dueDateInfo = `<span style="color:orange">${reservation.actorDueDate} (${daysRemaining} يوم)</span>`;
            } else {
                dueDateInfo = reservation.actorDueDate;
            }
        }
        
        // إنشاء الصف
        const row = table.insertRow();
        
        // تلوين الصف اعتمادًا على حالة الدفع
        if (reservation.invoiceNumber && !hasValidInvoice) {
            // فاتورة غير صالحة أو غير موجودة
            row.style.backgroundColor = '#fff0f0';
        } else if (!reservation.actorPaid && hasValidInvoice && linkedInvoice.isPaid) {
            // الفاتورة مدفوعة لكن لم يتم دفع مستحقات المعلقين
            row.style.backgroundColor = '#fffaed';
        }
        
        row.innerHTML = `
            <td>${reservation.id}</td>
            <td>${reservation.client}</td>
            <td>${formattedDate} ${formattedTime}</td>
            <td>${actorNames}</td>
            <td>${reservation.workPrice} ريال</td>
            <td>${totalActorFees} ريال</td>
            <td>${studioRevenue} ريال</td>
            <td>${dueDateInfo}</td>
            <td>${reservation.invoiceNumber ? 
                `<span style="color:${hasValidInvoice ? 'inherit' : 'red'}">
                    ${reservation.invoiceNumber}
                </span>` : '-'}</td>
            <td>
                <span class="status-badge ${reservation.actorPaid ? 'paid' : 'pending'}">
                    ${reservation.actorPaid ? 'تم الدفع' : 'معلق'}
                </span>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="editReservation(${index})">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteReservation(${index})">
                        <i class='bx bx-trash'></i>
                    </button>
                    ${!reservation.actorPaid ? 
                    `<button class="btn-icon pay" onclick="markActorPaid(${index})" title="تسجيل دفع المستحقات">
                        <i class='bx bx-check-circle'></i>
                    </button>` : ''}
                </div>
            </td>
        `;
    });
    
    // إذا لم تكن هناك بيانات، أضف صف "لا توجد بيانات"
    if (reservations.length === 0) {
        const row = table.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 11; // تحديث عدد الأعمدة
        cell.style.textAlign = 'center';
        cell.textContent = 'لا توجد حجوزات';
    }
    
    // تحديث التقارير لتعكس أي تغييرات في الحجوزات
    renderReports();
}

// عرض جدول الفواتير
function renderInvoicesTable() {
    const table = document.getElementById('invoicesTable');
    if (!table) return;
    
    // تفريغ الجدول باستثناء الصف الأول (العناوين)
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }
    
    // إضافة الصفوف الجديدة
    invoices.forEach((invoice, index) => {
        const row = table.insertRow();
        row.innerHTML = `
            <td>${invoice.invoiceNumber}</td>
            <td>${invoice.date}</td>
            <td>${invoice.customer}</td>
            <td>${invoice.invoiceAmount} ريال</td>
            <td>${invoice.receivedAmount} ريال</td>
            <td>${invoice.paymentDate || '-'}</td>
            <td>
                <span class="status-badge ${invoice.isPaid ? 'paid' : 'pending'}">
                    ${invoice.isPaid ? 'مدفوعة' : 'معلقة'}
                </span>
            </td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" onclick="showInvoiceDetails(${index})">
                        <i class='bx bx-show'></i>
                    </button>
                </div>
            </td>
        `;
    });
    
    // إذا لم تكن هناك بيانات، أضف صف "لا توجد بيانات"
    if (invoices.length === 0) {
        const row = table.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 8;
        cell.style.textAlign = 'center';
        cell.textContent = 'لا توجد فواتير';
    }
}

// عرض سجل عمليات الفواتير
function renderInvoiceAuditLogTable() {
    const table = document.getElementById('invoiceAuditTable');
    if (!table) return;
    
    // تفريغ الجدول باستثناء الصف الأول (العناوين)
    while (table.rows.length > 1) {
        table.deleteRow(1);
    }
    
    // إضافة الصفوف الجديدة
    invoiceAuditLog.forEach((log) => {
        const row = table.insertRow();
        row.innerHTML = `
            <td>${log.date}</td>
            <td>${log.operation}</td>
            <td>${log.invoiceNumber}</td>
        `;
    });
    
    // إذا لم تكن هناك بيانات، أضف صف "لا توجد بيانات"
    if (invoiceAuditLog.length === 0) {
        const row = table.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 3;
        cell.style.textAlign = 'center';
        cell.textContent = 'لا توجد سجلات';
    }
}

// عرض التقارير
function renderReports() {
    // تحديث ملخص التقرير المالي
    updateReportSummary();
    
    // تحديث تقرير المعلقين
    renderActorsReport();
    
    console.log('تم تحديث التقارير');
}

// تحديث ملخص التقرير المالي
function updateReportSummary() {
    // حساب إجمالي الإيرادات من الفواتير المدفوعة
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.isPaid ? inv.receivedAmount : 0), 0);
    document.getElementById('reportTotalRevenue').textContent = totalRevenue.toLocaleString();
    
    // حساب إجمالي المصروفات (المصروفات الشهرية × عدد الأشهر)
    // هنا نفترض أن المصروفات تعتمد على الشهور المنقضية منذ بداية السنة
    const currentDate = new Date();
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
    const monthsPassed = currentDate.getMonth() + 1; // +1 لأن الشهور تبدأ من 0
    const totalExpense = monthlyExpense * monthsPassed;
    document.getElementById('reportTotalExpense').textContent = totalExpense.toLocaleString();
    
    // حساب مستحقات المعلقين الإجمالية (المدفوعة وغير المدفوعة)
    let totalActorFees = 0;
    reservations.forEach(res => {
        res.voiceActors.forEach(actor => {
            totalActorFees += actor.fee;
        });
    });
    document.getElementById('reportTotalActorFees').textContent = totalActorFees.toLocaleString();
    
    // حساب الإيرادات الصافية
    const netRevenue = totalRevenue - totalExpense - totalActorFees;
    document.getElementById('reportNetRevenue').textContent = netRevenue.toLocaleString();
    
    // تحديث رسم بياني الملخص
    updateSummaryChart(totalRevenue, totalExpense, totalActorFees);
}

// تحديث الرسم البياني للملخص المالي
function updateSummaryChart(revenue, expense, actorFees) {
    const ctx = document.getElementById('summaryChartCanvas').getContext('2d');
    
    // إذا كان الرسم البياني موجودًا، قم بتدميره
    if (window.summaryChart) {
        window.summaryChart.destroy();
    }
    
    // إنشاء رسم بياني جديد
    window.summaryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['الإيرادات', 'المصروفات', 'أجور المعلقين'],
            datasets: [{
                data: [revenue, expense, actorFees],
                backgroundColor: [
                    '#2ecc71', // أخضر للإيرادات
                    '#e74c3c', // أحمر للمصروفات
                    '#f39c12'  // برتقالي لأجور المعلقين
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.raw.toLocaleString() + ' ريال';
                        }
                    }
                }
            }
        }
    });
}

// عرض تقرير المعلقين
function renderActorsReport() {
    const actorsReportTable = document.getElementById('actorsReportTable');
    if (!actorsReportTable) return;
    
    const tableBody = actorsReportTable.querySelector('tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // تجميع بيانات المعلقين
    const actorsData = {};
    
    reservations.forEach(res => {
        res.voiceActors.forEach(actor => {
            if (!actorsData[actor.name]) {
                actorsData[actor.name] = {
                    totalFees: 0,
                    pendingFees: 0,
                    paidFees: 0,
                    reservationCount: 0
                };
            }
            
            actorsData[actor.name].totalFees += actor.fee;
            actorsData[actor.name].reservationCount++;
            
            if (res.actorPaid) {
                actorsData[actor.name].paidFees += actor.fee;
            } else {
                actorsData[actor.name].pendingFees += actor.fee;
            }
        });
    });
    
    // إضافة صفوف الجدول
    Object.keys(actorsData).forEach(actorName => {
        const data = actorsData[actorName];
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${actorName}</td>
            <td>${data.reservationCount}</td>
            <td>${data.totalFees.toLocaleString()} ريال</td>
            <td>${data.paidFees.toLocaleString()} ريال</td>
            <td>${data.pendingFees.toLocaleString()} ريال</td>
            <td>${data.pendingFees > 0 ? '<span class="status warning">مستحق</span>' : '<span class="status success">مكتمل</span>'}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // إذا لم تكن هناك بيانات، عرض رسالة
    if (tableBody.children.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" style="text-align:center">لا توجد بيانات للمعلقين</td>`;
        tableBody.appendChild(row);
    }
}

// إظهار مؤشر المزامنة
function showSyncIndicator(message = "جاري مزامنة البيانات...") {
    createSyncIndicatorIfNeeded();
    const syncIndicator = document.getElementById('syncIndicator');
    if (syncIndicator) {
        document.getElementById('syncMessage').textContent = message;
        syncIndicator.style.visibility = 'visible';
        syncIndicator.style.opacity = '1';
    }
}

// إخفاء مؤشر المزامنة
function hideSyncIndicator() {
    const syncIndicator = document.getElementById('syncIndicator');
    if (syncIndicator) {
        syncIndicator.style.opacity = '0';
        setTimeout(() => {
            syncIndicator.style.visibility = 'hidden';
        }, 300);
    }
}

// حفظ حالة النظام للتراجع
function saveState() {
    const currentState = {
        balance,
        voices: JSON.parse(JSON.stringify(voices)),
        clients: JSON.parse(JSON.stringify(clients)),
        reservations: JSON.parse(JSON.stringify(reservations)),
        invoices: JSON.parse(JSON.stringify(invoices)),
        invoiceAuditLog: JSON.parse(JSON.stringify(invoiceAuditLog))
    };
    
    stateHistory.push(currentState);
    
    // الاحتفاظ فقط بآخر 10 حالات
    if (stateHistory.length > 10) {
        stateHistory.shift();
    }
}

// التراجع عن آخر تغيير
function undoChange() {
    if (stateHistory.length <= 1) {
        alert('لا يوجد تغييرات للتراجع عنها');
        return;
    }
    
    // إزالة الحالة الحالية
    stateHistory.pop();
    
    // استرجاع الحالة السابقة
    const prevState = stateHistory[stateHistory.length - 1];
    balance = prevState.balance;
    voices = prevState.voices;
    clients = prevState.clients;
    reservations = prevState.reservations;
    invoices = prevState.invoices;
    invoiceAuditLog = prevState.invoiceAuditLog;
    
    // تحديث واجهة المستخدم
    updateAllStatistics();
    renderVoicesTable();
    renderClientsTable();
    renderReservationsTable();
    renderInvoicesTable();
    renderInvoiceAuditLogTable();
    renderReports();
    
    alert('تم التراجع عن آخر تغيير');
}

// تسجيل دفع مستحقات المعلقين في حجز معين
function markActorPaid(index) {
    if (index < 0 || index >= reservations.length) {
        alert('رقم الحجز غير صحيح');
        return;
    }
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    // تحديث حالة الدفع في الحجز
    reservations[index].actorPaid = true;
    reservations[index].paidDate = new Date().toISOString().split('T')[0];
    
    // إضافة سجل في الفواتير إذا كان مرتبط بفاتورة
    if (reservations[index].invoiceNumber) {
        const now = new Date();
        const logEntry = {
            operation: "تسجيل دفع معلقين",
            invoiceNumber: reservations[index].invoiceNumber,
            date: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
        };
        invoiceAuditLog.push(logEntry);
    }
    
    // تحديث واجهة المستخدم
    renderReservationsTable();
    renderInvoiceAuditLogTable();
    updateAllStatistics();
    
    // إظهار رسالة نجاح
    alert(`تم تسجيل دفع مستحقات المعلقين للحجز ${reservations[index].id} بنجاح`);
}

// ======= وظائف إدارة المعلقين =======
// إضافة معلق جديد
function showAddVoiceModal() {
    if (!document.getElementById('addVoiceModal')) {
        const modal = document.createElement('div');
        modal.id = 'addVoiceModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="closeModal('addVoiceModal')">×</button>
                <h3>إضافة معلق جديد</h3>
                <label>اسم المعلق</label>
                <input type="text" id="newVoiceName" class="input" placeholder="اسم المعلق">
                <label>سعر خاص للدقيقة</label>
                <input type="number" id="newVoiceRate" class="input" placeholder="سعر خاص للدقيقة">
                <button class="btn" onclick="addNewVoiceActor()">
                    <i class='bx bx-plus'></i> إضافة المعلق
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // إعادة تعيين القيم
    document.getElementById('newVoiceName').value = '';
    document.getElementById('newVoiceRate').value = '';
    
    // إظهار المودال
    document.getElementById('addVoiceModal').classList.add('active');
}

// إضافة معلق جديد إلى النظام
function addNewVoiceActor() {
    const name = document.getElementById('newVoiceName').value.trim();
    const rate = parseFloat(document.getElementById('newVoiceRate').value) || 0;
    
    if (!name) {
        alert("يرجى إدخال اسم المعلق");
        return;
    }
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    // إضافة المعلق الجديد
    voices.push({ name, rate });
    
    // تحديث الجدول
    renderVoicesTable();
    
    // تحديث القوائم المنسدلة
    populateDatalists();
    
    // إغلاق المودال
    closeModal('addVoiceModal');
    
    // إظهار رسالة نجاح
    alert(`تم إضافة المعلق ${name} بنجاح`);
}

// تعديل معلق موجود
function editVoiceActor(index) {
    // التحقق من وجود المودال وإنشاؤه إذا لم يكن موجودا
    if (!document.getElementById('editVoiceModal')) {
        createEditVoiceModal();
    }
    
    const voice = voices[index];
    if (!voice) return;
    
    document.getElementById('editVoiceIndex').value = index;
    document.getElementById('editVoiceName').value = voice.name;
    document.getElementById('editVoiceRate').value = voice.rate;
    
    document.getElementById('editVoiceModal').classList.add('active');
}

// حفظ تعديلات المعلق
function saveVoiceEdit() {
    const index = parseInt(document.getElementById('editVoiceIndex').value);
    const name = document.getElementById('editVoiceName').value.trim();
    const rate = parseFloat(document.getElementById('editVoiceRate').value) || 0;
    
    if (!name) {
        alert("يرجى إدخال اسم المعلق");
        return;
    }
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    voices[index] = { name, rate };
    
    // تحديث الجدول
    renderVoicesTable();
    
    // تحديث القوائم المنسدلة
    populateDatalists();
    
    closeModal('editVoiceModal');
    
    // إظهار رسالة نجاح
    alert(`تم تحديث بيانات المعلق ${name} بنجاح`);
}

// حذف معلق
function deleteVoice(index) {
    if (!confirm(`هل أنت متأكد من حذف المعلق ${voices[index].name}؟`)) {
        return;
    }
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    // التحقق من وجود حجوزات مرتبطة بهذا المعلق
    const linkedReservations = reservations.filter(r => 
        r.voiceActors.some(a => a.name === voices[index].name)
    );
    
    if (linkedReservations.length > 0) {
        if (!confirm(`هناك ${linkedReservations.length} حجز مرتبط بهذا المعلق. هل تريد الاستمرار في الحذف؟`)) {
            return;
        }
    }
    
    // حذف المعلق
    voices.splice(index, 1);
    
    // تحديث الجدول
    renderVoicesTable();
    
    // تحديث القوائم المنسدلة
    populateDatalists();
    
    // إظهار رسالة نجاح
    alert("تم حذف المعلق بنجاح");
}

// ======= وظائف إدارة العملاء =======
// إضافة عميل جديد
function showAddClientModal() {
    if (!document.getElementById('addClientModal')) {
        const modal = document.createElement('div');
        modal.id = 'addClientModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="closeModal('addClientModal')">×</button>
                <h3>إضافة عميل جديد</h3>
                <label>اسم العميل</label>
                <input type="text" id="newClientName" class="input" placeholder="اسم العميل">
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="btn" onclick="addNewClient()" style="flex: 1;">
                        <i class='bx bx-plus'></i> إضافة العميل
                    </button>
                    <button class="btn btn-outline" onclick="importClientsCSV()" style="flex: 1;">
                        <i class='bx bx-import'></i> استيراد من ملف
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // إعادة تعيين القيم
    document.getElementById('newClientName').value = '';
    
    // إظهار المودال
    document.getElementById('addClientModal').classList.add('active');
}

// إضافة عميل جديد إلى النظام
function addNewClient() {
    const name = document.getElementById('newClientName').value.trim();
    
    if (!name) {
        alert("يرجى إدخال اسم العميل");
        return;
    }
    
    // التحقق من عدم تكرار الاسم
    if (clients.some(c => c.name === name)) {
        alert("هذا الاسم موجود بالفعل، يرجى استخدام اسم آخر");
        return;
    }
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    // إضافة العميل الجديد
    clients.push({ 
        name, 
        addedTime: Date.now() 
    });
    
    // تحديث الجدول
    renderClientsTable();
    
    // تحديث القوائم المنسدلة
    populateDatalists();
    
    // إغلاق المودال
    closeModal('addClientModal');
    
    // إظهار رسالة نجاح
    alert(`تم إضافة العميل ${name} بنجاح`);
}

// تعديل عميل موجود
function editClient(index) {
    const client = clients[index];
    if (!client) return;
    
    document.getElementById('editClientIndex').value = index;
    document.getElementById('editClientName').value = client.name;
    
    document.getElementById('editClientModal').classList.add('active');
}

// حفظ تعديلات العميل
function saveClientEdit() {
    const index = parseInt(document.getElementById('editClientIndex').value);
    const name = document.getElementById('editClientName').value.trim();
    
    if (!name) {
        alert("يرجى إدخال اسم العميل");
        return;
    }
    
    // التحقق من عدم تكرار الاسم (باستثناء العميل الحالي)
    if (clients.some((c, i) => i !== index && c.name === name)) {
        alert("هذا الاسم موجود بالفعل، يرجى استخدام اسم آخر");
        return;
    }
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    // تحديث اسم العميل مع الاحتفاظ بتاريخ الإضافة
    const oldName = clients[index].name;
    clients[index].name = name;
    
    // تحديث اسم العميل في الحجوزات
    reservations.forEach(reservation => {
        if (reservation.client === oldName) {
            reservation.client = name;
        }
    });
    
    // تحديث اسم العميل في الفواتير
    invoices.forEach(invoice => {
        if (invoice.customer === oldName) {
            invoice.customer = name;
        }
    });
    
    // تحديث الجداول
    renderClientsTable();
    renderReservationsTable();
    renderInvoicesTable();
    
    // تحديث القوائم المنسدلة
    populateDatalists();
    
    closeModal('editClientModal');
    
    // إظهار رسالة نجاح
    alert(`تم تحديث بيانات العميل بنجاح`);
}

// حذف عميل
function deleteClient(index) {
    if (!confirm(`هل أنت متأكد من حذف العميل ${clients[index].name}؟`)) {
        return;
    }
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    // التحقق من وجود حجوزات أو فواتير مرتبطة بهذا العميل
    const clientName = clients[index].name;
    const linkedReservations = reservations.filter(r => r.client === clientName);
    const linkedInvoices = invoices.filter(i => i.customer === clientName);
    
    if (linkedReservations.length > 0 || linkedInvoices.length > 0) {
        const message = `هناك ${linkedReservations.length} حجز و ${linkedInvoices.length} فاتورة مرتبطة بهذا العميل. هل تريد الاستمرار في الحذف؟`;
        if (!confirm(message)) {
            return;
        }
    }
    
    // حذف العميل
    clients.splice(index, 1);
    
    // تحديث الجدول
    renderClientsTable();
    
    // تحديث القوائم المنسدلة
    populateDatalists();
    
    // إظهار رسالة نجاح
    alert("تم حذف العميل بنجاح");
}

// استيراد العملاء من ملف
function importClientsCSV() {
    if (!document.getElementById('importClientsModal')) {
        const modal = document.createElement('div');
        modal.id = 'importClientsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="closeModal('importClientsModal')">×</button>
                <h3>استيراد العملاء</h3>
                <p style="margin-bottom: 15px; font-size: 14px; color: var(--text-light);">
                    يمكنك استيراد العملاء من ملفات CSV أو Excel (xlsx, xls)
                </p>
                <div class="import-file-section">
                    <label>اختر ملف</label>
                    <input type="file" id="clientsImportFile" accept=".csv,.xlsx,.xls" class="input">
                </div>
                <div class="import-preview" id="clientsImportPreview" style="margin-top: 15px; display: none;">
                    <h4>معاينة البيانات</h4>
                    <div class="preview-table-container" style="max-height: 200px; overflow-y: auto; margin-bottom: 15px;">
                        <table class="data-table" id="clientsPreviewTable">
                            <thead>
                                <tr>
                                    <th>اسم العميل</th>
                                    <th>الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- سيتم ملؤها ديناميكيًا -->
                            </tbody>
                        </table>
                    </div>
                </div>
                <button class="btn" id="processClientsImportBtn" onclick="processClientsImport()">
                    <i class='bx bx-import'></i> استيراد
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // إظهار المودال
    document.getElementById('importClientsModal').classList.add('active');
    
    // إعادة تعيين عناصر المودال
    document.getElementById('clientsImportFile').value = '';
    document.getElementById('clientsImportPreview').style.display = 'none';
    
    // إضافة مستمع لمعالجة الملف المختار
    document.getElementById('clientsImportFile').addEventListener('change', previewClientsImport);
}

// معاينة ملف استيراد العملاء
function previewClientsImport() {
    const fileInput = document.getElementById('clientsImportFile');
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        return;
    }
    
    const file = fileInput.files[0];
    const fileName = file.name.toLowerCase();
    const reader = new FileReader();
    
    reader.onload = function(e) {
        let clientsData = [];
        
        try {
            if (fileName.endsWith('.csv')) {
                // معالجة ملف CSV
                clientsData = parseCSVClients(e.target.result);
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                // التحقق من وجود مكتبة XLSX
                if (typeof XLSX === 'undefined') {
                    alert("مكتبة Excel غير متوفرة. يرجى التأكد من تحميل المكتبة بشكل صحيح أو استخدام ملف CSV بدلاً من ذلك.");
                    return;
                }
                // معالجة ملف Excel
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                clientsData = parseExcelClients(workbook);
            } else {
                alert("صيغة الملف غير مدعومة. يرجى استخدام CSV أو Excel.");
                return;
            }
            
            if (clientsData.length === 0) {
                alert("لم يتم العثور على بيانات صالحة في الملف");
                return;
            }
            
            // عرض معاينة البيانات
            const previewContainer = document.getElementById('clientsImportPreview');
            const previewTable = document.getElementById('clientsPreviewTable').getElementsByTagName('tbody')[0];
            previewTable.innerHTML = '';
            
            clientsData.forEach(client => {
                const exists = clients.some(c => c.name === client.name);
                const row = previewTable.insertRow();
                const nameCell = row.insertCell(0);
                const statusCell = row.insertCell(1);
                
                nameCell.textContent = client.name;
                
                if (exists) {
                    statusCell.textContent = "موجود مسبقًا";
                    statusCell.style.color = "var(--warning-color)";
                } else {
                    statusCell.textContent = "جديد";
                    statusCell.style.color = "var(--success-color)";
                }
            });
            
            // إظهار قسم المعاينة
            previewContainer.style.display = 'block';
            
            // تخزين البيانات للمعالجة لاحقًا
            document.getElementById('clientsImportFile').dataset.parsedData = JSON.stringify(clientsData);
            
        } catch (error) {
            console.error("خطأ في معالجة الملف:", error);
            alert("حدث خطأ أثناء معالجة الملف. تأكد من تنسيق الملف وحاول مرة أخرى.");
        }
    };
    
    reader.onerror = function() {
        alert("حدث خطأ أثناء قراءة الملف");
    };
    
    if (fileName.endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
}

// تحليل بيانات العملاء من ملف CSV
function parseCSVClients(csvContent) {
    const rows = csvContent.split(/\r?\n/);
    if (rows.length <= 1) return [];
    
    const headers = rows[0].split(',').map(h => h.trim().toLowerCase().replace(/^['"](.*)['"]$/, '$1'));
    
    // البحث عن عمود اسم العميل
    let nameColumnIndex = -1;
    const possibleNameColumns = ['الاسم', 'العميل', 'اسم العميل', 'name', 'client', 'customer', 'fullname'];
    
    for (let i = 0; i < headers.length; i++) {
        if (possibleNameColumns.includes(headers[i])) {
            nameColumnIndex = i;
            break;
        }
    }
    
    if (nameColumnIndex === -1) {
        alert("لم يتم العثور على عمود اسم العميل في الملف");
        return [];
    }
    
    const clientsData = [];
    
    for (let i = 1; i < rows.length; i++) {
        if (!rows[i].trim()) continue;
        
        const columns = rows[i].split(',');
        if (columns.length <= nameColumnIndex) continue;
        
        const name = columns[nameColumnIndex].trim().replace(/^['"](.*)['"]$/, '$1');
        if (!name) continue;
        
        clientsData.push({ name });
    }
    
    return clientsData;
}

// تحليل بيانات العملاء من ملف Excel
function parseExcelClients(workbook) {
    // التحقق من وجود مكتبة XLSX
    if (typeof XLSX === 'undefined') {
        console.error("مكتبة XLSX غير متوفرة");
        alert("مكتبة Excel غير متوفرة. يرجى التأكد من تحميل المكتبة بشكل صحيح أو استخدام ملف CSV بدلاً من ذلك.");
        return [];
    }
    
    // استخدام الورقة الأولى في الملف
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    try {
        // تحويل ورقة العمل إلى مصفوفة
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (data.length <= 1) return [];
        
        // البحث عن عمود اسم العميل
        const headers = data[0].map(h => String(h).trim().toLowerCase());
        let nameColumnIndex = -1;
        const possibleNameColumns = ['الاسم', 'العميل', 'اسم العميل', 'name', 'client', 'customer', 'fullname'];
        
        for (let i = 0; i < headers.length; i++) {
            if (possibleNameColumns.includes(headers[i])) {
                nameColumnIndex = i;
                break;
            }
        }
        
        if (nameColumnIndex === -1) {
            // إذا لم نجد عنوان العمود، نحاول استخدام العمود الأول
            nameColumnIndex = 0;
        }
        
        const clientsData = [];
        
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length <= nameColumnIndex) continue;
            
            const nameValue = row[nameColumnIndex];
            if (!nameValue) continue;
            
            const name = String(nameValue).trim();
            if (!name) continue;
            
            clientsData.push({ name });
        }
        
        return clientsData;
    } catch (error) {
        console.error("خطأ في معالجة ملف Excel:", error);
        alert("حدث خطأ أثناء قراءة ملف Excel. تأكد من صحة تنسيق الملف.");
        return [];
    }
}

// معالجة استيراد العملاء
function processClientsImport() {
    const fileInput = document.getElementById('clientsImportFile');
    const parsedDataStr = fileInput.dataset.parsedData;
    
    if (!parsedDataStr) {
        alert("يرجى اختيار ملف واستعراض البيانات أولاً");
        return;
    }
    
    try {
        const clientsData = JSON.parse(parsedDataStr);
        
        if (clientsData.length === 0) {
            alert("لا توجد بيانات للاستيراد");
            return;
        }
        
        // مصفوفات لتتبع الإضافات والتكرارات
        const newClients = [];
        const existingNames = [];
        
        // حفظ حالة النظام قبل التغيير
        saveState();
        
        // إضافة العملاء الجدد
        clientsData.forEach(client => {
            // التحقق من عدم تكرار الاسم
            if (clients.some(c => c.name === client.name) || existingNames.includes(client.name)) {
                existingNames.push(client.name);
                return;
            }
            
            // إضافة العميل الجديد
            clients.push({
                name: client.name,
                addedTime: Date.now()
            });
            
            newClients.push(client.name);
        });
        
        // تحديث الجدول
        renderClientsTable();
        
        // تحديث القوائم المنسدلة
        populateDatalists();
        
        // إغلاق المودال
        closeModal('importClientsModal');
        
        // إظهار رسالة بنتيجة الاستيراد
        if (newClients.length > 0 || existingNames.length > 0) {
            let message = `تم استيراد ${newClients.length} عميل جديد`;
            if (existingNames.length > 0) {
                message += ` وتجاهل ${existingNames.length} عميل موجود مسبقًا`;
            }
            alert(message);
        } else {
            alert("لم يتم استيراد أي عملاء جدد");
        }
        
    } catch (error) {
        console.error("خطأ في معالجة البيانات:", error);
        alert("حدث خطأ أثناء معالجة البيانات");
    }
}

// ======= وظائف إدارة الحجوزات =======
// إضافة حجز جديد
function showAddReservationModal() {
    if (!document.getElementById('addReservationModal')) {
        const modal = document.createElement('div');
        modal.id = 'addReservationModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="closeModal('addReservationModal')">×</button>
                <h3>إضافة حجز جديد</h3>
                <label>اسم العميل</label>
                <input type="text" list="clientList" id="newResClient" class="input" placeholder="اكتب أو اختر">
                <label>التاريخ والوقت</label>
                <input type="datetime-local" id="newResTime" class="input">
                <label>سعر العمل (الإجمالي)</label>
                <input type="number" id="newResWorkPrice" class="input">
                <h4 style="margin-top: 20px; margin-bottom: 10px;">المعلقون وأجورهم</h4>
                <div style="display:flex; gap:8px; margin-bottom:8px;">
                    <input type="text" list="voiceList" id="newActorName" class="input" style="flex:1; margin: 0;" placeholder="اسم المعلق">
                    <input type="number" id="newActorFee" class="input" style="max-width:100px; margin: 0;" placeholder="الأجر">
                    <button class="btn btn-sm" style="margin: 0;" onclick="addActorToReservation()">أضف</button>
                </div>
                <div id="newActorsList" style="background:var(--primary-light);padding:12px;border:1px solid var(--border-color);border-radius:8px;min-height:40px;margin-bottom:16px;">
                </div>
                <label>رقم الفاتورة (اختياري)</label>
                <input type="text" list="invoiceList" id="newResInvoiceNumber" class="input">
                <label>تاريخ استحقاق المعلق</label>
                <input type="date" id="newResDueDate" class="input">
                <label>تفاصيل الحجز</label>
                <textarea id="newResNotes" class="input" rows="3"></textarea>
                <button class="btn" onclick="addNewReservation()">
                    <i class='bx bx-plus'></i> إضافة الحجز
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // تأكد من تحديث قائمة المعلقين
    populateDatalists();
    
    // إعداد تاريخ اليوم كقيمة افتراضية
    const today = new Date();
    const formattedDate = today.toISOString().slice(0, 16); // تنسيق بصيغة YYYY-MM-DDTHH:MM
    document.getElementById('newResTime').value = formattedDate;
    
    // إعادة تعيين القيم
    document.getElementById('newResClient').value = '';
    document.getElementById('newResWorkPrice').value = '';
    document.getElementById('newActorsList').innerHTML = '';
    document.getElementById('newResInvoiceNumber').value = '';
    document.getElementById('newResDueDate').value = '';
    document.getElementById('newResNotes').value = '';
    
    // إظهار المودال
    document.getElementById('addReservationModal').classList.add('active');
}

// إضافة معلق إلى الحجز الجديد
function addActorToReservation() {
    const actorName = document.getElementById('newActorName').value.trim();
    const actorFee = parseFloat(document.getElementById('newActorFee').value) || 0;
    
    if (!actorName) {
        alert("يرجى إدخال اسم المعلق");
        return;
    }
    
    const actorsList = document.getElementById('newActorsList');
    const actorIndex = actorsList.children.length;
    
    const actorDiv = document.createElement('div');
    actorDiv.className = 'actor-item';
    actorDiv.dataset.name = actorName;
    actorDiv.dataset.fee = actorFee;
    actorDiv.style.cssText = 'display:flex; align-items:center; gap:10px; background:white; padding:10px; border-radius:6px; margin-bottom:8px;';
    actorDiv.innerHTML = `
        <div style="flex:1;">
            <div style="font-weight:bold;">${actorName}</div>
            <div style="font-size:12px;">${actorFee} ريال</div>
        </div>
        <button class="btn-icon delete" onclick="removeActorFromReservation(this.parentNode)" style="width:26px; height:26px;">
            <i class='bx bx-x'></i>
        </button>
    `;
    
    actorsList.appendChild(actorDiv);
    
    // إعادة تعيين حقول الإدخال
    document.getElementById('newActorName').value = '';
    document.getElementById('newActorFee').value = '';
}

// إزالة معلق من الحجز الجديد
function removeActorFromReservation(actorDiv) {
    actorDiv.remove();
}

// إضافة حجز جديد إلى النظام
function addNewReservation() {
    const client = document.getElementById('newResClient').value.trim();
    const recordTime = document.getElementById('newResTime').value;
    const workPrice = parseFloat(document.getElementById('newResWorkPrice').value) || 0;
    const invoiceNumber = document.getElementById('newResInvoiceNumber').value.trim();
    const actorDueDate = document.getElementById('newResDueDate').value;
    const notes = document.getElementById('newResNotes').value.trim();
    
    if (!client) {
        alert("يرجى إدخال اسم العميل");
        return;
    }
    
    if (!recordTime) {
        alert("يرجى تحديد تاريخ ووقت الحجز");
        return;
    }
    
    if (workPrice <= 0) {
        alert("يرجى إدخال سعر العمل");
        return;
    }
    
    // جمع بيانات المعلقين
    const actorsList = document.getElementById('newActorsList');
    const voiceActors = [];
    
    for (const actorDiv of actorsList.children) {
        voiceActors.push({
            name: actorDiv.dataset.name,
            fee: parseFloat(actorDiv.dataset.fee) || 0
        });
    }
    
    if (voiceActors.length === 0) {
        alert("يرجى إضافة معلق واحد على الأقل");
        return;
    }
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    // إنشاء رقم للحجز
    const resId = `#RES-${(reservations.length + 1).toString().padStart(3, '0')}`;
    
    // إضافة الحجز الجديد
    reservations.push({
        id: resId,
        client: client,
        recordTime: recordTime,
        workPrice: workPrice,
        voiceActors: voiceActors,
        invoiceNumber: invoiceNumber,
        actorDueDate: actorDueDate,
        actorPaid: false,
        notes: notes,
        paidDate: "",
        invoicePaid: false
    });
    
    // تحديث الجدول
    renderReservationsTable();
    
    // تحديث الإحصائيات
    updateAllStatistics();
    
    // إغلاق المودال
    closeModal('addReservationModal');
    
    // إظهار رسالة نجاح
    alert(`تم إضافة الحجز ${resId} بنجاح`);
}

// تعديل حجز موجود
function editReservation(index) {
    if (!document.getElementById('editReservationModal')) {
        createEditReservationModal();
    }
    
    const reservation = reservations[index];
    if (!reservation) return;
    
    document.getElementById('editReservationIndex').value = index;
    document.getElementById('editResClient').value = reservation.client;
    document.getElementById('editResTime').value = reservation.recordTime;
    document.getElementById('editResWorkPrice').value = reservation.workPrice;
    document.getElementById('editResInvoiceNumber').value = reservation.invoiceNumber || '';
    document.getElementById('editResDueDate').value = reservation.actorDueDate || '';
    document.getElementById('editResPaid').checked = reservation.actorPaid;
    document.getElementById('editResNotes').value = reservation.notes || '';
    
    // عرض المعلقين
    const actorsList = document.getElementById('editActorsList');
    actorsList.innerHTML = '';
    
    reservation.voiceActors.forEach((actor, actorIndex) => {
        const actorDiv = document.createElement('div');
        actorDiv.className = 'actor-item';
        actorDiv.dataset.name = actor.name;
        actorDiv.dataset.fee = actor.fee;
        actorDiv.style.cssText = 'display:flex; align-items:center; gap:10px; background:white; padding:10px; border-radius:6px; margin-bottom:8px;';
        actorDiv.innerHTML = `
            <div style="flex:1;">
                <div style="font-weight:bold;">${actor.name}</div>
                <div style="font-size:12px;">${actor.fee} ريال</div>
            </div>
            <button class="btn-icon delete" onclick="removeActorFromEdit(this.parentNode)" style="width:26px; height:26px;">
                <i class='bx bx-x'></i>
            </button>
        `;
        
        actorsList.appendChild(actorDiv);
    });
    
    // تأكد من تحديث قائمة المعلقين
    populateDatalists();
    
    document.getElementById('editReservationModal').classList.add('active');
}

// إضافة معلق إلى الحجز المُعدَّل
function addTempActorToEdit() {
    const actorName = document.getElementById('editTempActorName').value.trim();
    const actorFee = parseFloat(document.getElementById('editTempActorFee').value) || 0;
    
    if (!actorName) {
        alert("يرجى إدخال اسم المعلق");
        return;
    }
    
    const actorsList = document.getElementById('editActorsList');
    
    const actorDiv = document.createElement('div');
    actorDiv.className = 'actor-item';
    actorDiv.dataset.name = actorName;
    actorDiv.dataset.fee = actorFee;
    actorDiv.style.cssText = 'display:flex; align-items:center; gap:10px; background:white; padding:10px; border-radius:6px; margin-bottom:8px;';
    actorDiv.innerHTML = `
        <div style="flex:1;">
            <div style="font-weight:bold;">${actorName}</div>
            <div style="font-size:12px;">${actorFee} ريال</div>
        </div>
        <button class="btn-icon delete" onclick="removeActorFromEdit(this.parentNode)" style="width:26px; height:26px;">
            <i class='bx bx-x'></i>
        </button>
    `;
    
    actorsList.appendChild(actorDiv);
    
    // إعادة تعيين حقول الإدخال
    document.getElementById('editTempActorName').value = '';
    document.getElementById('editTempActorFee').value = '';
}

// إزالة معلق من الحجز المُعدَّل
function removeActorFromEdit(actorDiv) {
    actorDiv.remove();
}

// حفظ تعديلات الحجز
function saveReservationEdit() {
    const index = parseInt(document.getElementById('editReservationIndex').value);
    const client = document.getElementById('editResClient').value.trim();
    const recordTime = document.getElementById('editResTime').value;
    const workPrice = parseFloat(document.getElementById('editResWorkPrice').value) || 0;
    const invoiceNumber = document.getElementById('editResInvoiceNumber').value.trim();
    const actorDueDate = document.getElementById('editResDueDate').value;
    const actorPaid = document.getElementById('editResPaid').checked;
    const notes = document.getElementById('editResNotes').value.trim();
    
    if (!client) {
        alert("يرجى إدخال اسم العميل");
        return;
    }
    
    if (!recordTime) {
        alert("يرجى تحديد تاريخ ووقت الحجز");
        return;
    }
    
    if (workPrice <= 0) {
        alert("يرجى إدخال سعر العمل");
        return;
    }
    
    // جمع بيانات المعلقين
    const actorsList = document.getElementById('editActorsList');
    const voiceActors = [];
    
    for (const actorDiv of actorsList.children) {
        voiceActors.push({
            name: actorDiv.dataset.name,
            fee: parseFloat(actorDiv.dataset.fee) || 0
        });
    }
    
    if (voiceActors.length === 0) {
        alert("يرجى إضافة معلق واحد على الأقل");
        return;
    }
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    // تحديث بيانات الحجز
    reservations[index].client = client;
    reservations[index].recordTime = recordTime;
    reservations[index].workPrice = workPrice;
    reservations[index].voiceActors = voiceActors;
    reservations[index].invoiceNumber = invoiceNumber;
    reservations[index].actorDueDate = actorDueDate;
    reservations[index].actorPaid = actorPaid;
    reservations[index].notes = notes;
    
    // تحديث الجدول
    renderReservationsTable();
    
    // تحديث الإحصائيات
    updateAllStatistics();
    
    // إغلاق المودال
    closeModal('editReservationModal');
    
    // إظهار رسالة نجاح
    alert(`تم تحديث بيانات الحجز ${reservations[index].id} بنجاح`);
}

// حذف حجز
function deleteReservation(index) {
    if (!confirm(`هل أنت متأكد من حذف الحجز ${reservations[index].id}؟`)) {
        return;
    }
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    // حذف الحجز
    reservations.splice(index, 1);
    
    // تحديث الجدول
    renderReservationsTable();
    
    // تحديث الإحصائيات
    updateAllStatistics();
    
    // إظهار رسالة نجاح
    alert("تم حذف الحجز بنجاح");
}

// ربط الحجز بالفاتورة
function linkReservationToInvoice(index) {
    if (!document.getElementById('linkInvoiceModal')) {
        const modal = document.createElement('div');
        modal.id = 'linkInvoiceModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="closeModal('linkInvoiceModal')">×</button>
                <h3>ربط الحجز بفاتورة</h3>
                <input type="hidden" id="linkReservationIndex">
                <label>رقم الفاتورة</label>
                <input type="text" list="invoiceList" id="linkInvoiceNumber" class="input" placeholder="اختر فاتورة">
                <div id="suggestedInvoices" style="margin: 15px 0;"></div>
                <button class="btn" onclick="saveLinkToInvoice()">
                    <i class='bx bx-link'></i> ربط الفاتورة
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('linkReservationIndex').value = index;
    document.getElementById('linkInvoiceNumber').value = reservations[index].invoiceNumber || '';
    
    // عرض الفواتير المقترحة
    const suggestedInvoices = document.getElementById('suggestedInvoices');
    suggestedInvoices.innerHTML = '';
    
    const reservation = reservations[index];
    const clientName = reservation.client;
    
    // البحث عن الفواتير المرتبطة بنفس العميل
    const clientInvoices = invoices.filter(inv => inv.customer === clientName);
    
    if (clientInvoices.length > 0) {
        suggestedInvoices.innerHTML = '<h4 style="margin-bottom: 10px;">فواتير مقترحة:</h4>';
        clientInvoices.forEach(invoice => {
            const button = document.createElement('button');
            button.className = 'btn-outline btn-sm';
            button.style.margin = '5px';
            button.innerHTML = `${invoice.invoiceNumber} - ${invoice.invoiceAmount} ريال`;
            button.onclick = function() {
                document.getElementById('linkInvoiceNumber').value = invoice.invoiceNumber;
            };
            suggestedInvoices.appendChild(button);
        });
    } else {
        suggestedInvoices.innerHTML = '<p>لا توجد فواتير مرتبطة بهذا العميل</p>';
    }
    
    document.getElementById('linkInvoiceModal').classList.add('active');
}

// حفظ ربط الحجز بالفاتورة
function saveLinkToInvoice() {
    const index = parseInt(document.getElementById('linkReservationIndex').value);
    const invoiceNumber = document.getElementById('linkInvoiceNumber').value.trim();
    
    if (!invoiceNumber) {
        alert("يرجى إدخال رقم الفاتورة");
        return;
    }
    
    // البحث عن الفاتورة
    const invoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
    if (!invoice) {
        alert("لم يتم العثور على فاتورة بهذا الرقم");
        return;
    }
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    // تحديث رقم الفاتورة وحالة الدفع
    reservations[index].invoiceNumber = invoiceNumber;
    reservations[index].invoicePaid = invoice.isPaid;
    
    // تحديث الجدول
    renderReservationsTable();
    
    // إغلاق المودال
    closeModal('linkInvoiceModal');
    
    // إظهار رسالة نجاح
    alert(`تم ربط الحجز ${reservations[index].id} بالفاتورة ${invoiceNumber} بنجاح`);
}

// ======= وظائف عرض التقارير المالية =======
// عرض تقرير مالي للمعلقين
function generateVoiceActorsReport() {
    // إنشاء مودال التقرير
    if (!document.getElementById('voiceActorsReportModal')) {
        const modal = document.createElement('div');
        modal.id = 'voiceActorsReportModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <button class="modal-close" onclick="closeModal('voiceActorsReportModal')">×</button>
                <h3>تقرير مستحقات المعلقين</h3>
                <div style="margin: 15px 0;">
                    <label style="margin-left: 10px;">من تاريخ:</label>
                    <input type="date" id="voicesReportFromDate" class="input" style="max-width: 150px;">
                    <label style="margin-left: 10px; margin-right: 10px;">إلى تاريخ:</label>
                    <input type="date" id="voicesReportToDate" class="input" style="max-width: 150px;">
                    <button class="btn" onclick="filterVoiceActorsReport()" style="margin-right: 10px;">
                        <i class='bx bx-filter'></i> تصفية
                    </button>
                    <button class="btn btn-outline" onclick="printVoiceActorsReport()">
                        <i class='bx bx-printer'></i> طباعة
                    </button>
                </div>
                <div id="voiceActorsReportContent" style="max-height: 500px; overflow-y: auto;"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // عرض التقرير
    filterVoiceActorsReport();
    
    // إظهار المودال
    document.getElementById('voiceActorsReportModal').classList.add('active');
}

// تصفية تقرير المعلقين حسب التاريخ
function filterVoiceActorsReport() {
    const fromDate = document.getElementById('voicesReportFromDate').value;
    const toDate = document.getElementById('voicesReportToDate').value;
    
    const content = document.getElementById('voiceActorsReportContent');
    
    // تجميع البيانات حسب المعلق
    const voiceActorSummary = {};
    
    // فلترة الحجوزات حسب التاريخ
    let filteredReservations = [...reservations];
    if (fromDate) {
        filteredReservations = filteredReservations.filter(r => {
            const recordDate = new Date(r.recordTime);
            return recordDate >= new Date(fromDate);
        });
    }
    if (toDate) {
        filteredReservations = filteredReservations.filter(r => {
            const recordDate = new Date(r.recordTime);
            return recordDate <= new Date(toDate + 'T23:59:59');
        });
    }
    
    // تجميع البيانات
    filteredReservations.forEach(reservation => {
        reservation.voiceActors.forEach(actor => {
            if (!voiceActorSummary[actor.name]) {
                voiceActorSummary[actor.name] = {
                    totalFee: 0,
                    paidFee: 0,
                    unpaidFee: 0,
                    reservations: []
                };
            }
            
            voiceActorSummary[actor.name].totalFee += actor.fee;
            if (reservation.actorPaid) {
                voiceActorSummary[actor.name].paidFee += actor.fee;
            } else {
                voiceActorSummary[actor.name].unpaidFee += actor.fee;
            }
            
            voiceActorSummary[actor.name].reservations.push({
                id: reservation.id,
                date: reservation.recordTime,
                fee: actor.fee,
                paid: reservation.actorPaid,
                client: reservation.client
            });
        });
    });
    
    // إنشاء التقرير
    let html = `
        <div class="report-summary">
            <h4>ملخص المستحقات</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>المعلق</th>
                        <th>إجمالي المستحقات</th>
                        <th>المدفوع</th>
                        <th>المتبقي</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    let totalAllFees = 0;
    let totalPaidFees = 0;
    let totalUnpaidFees = 0;
    
    for (const [name, data] of Object.entries(voiceActorSummary)) {
        html += `
            <tr>
                <td>${name}</td>
                <td>${data.totalFee} ريال</td>
                <td>${data.paidFee} ريال</td>
                <td>${data.unpaidFee} ريال</td>
            </tr>
        `;
        
        totalAllFees += data.totalFee;
        totalPaidFees += data.paidFee;
        totalUnpaidFees += data.unpaidFee;
    }
    
    html += `
            <tr style="font-weight: bold; background: var(--primary-light);">
                <td>الإجمالي</td>
                <td>${totalAllFees} ريال</td>
                <td>${totalPaidFees} ريال</td>
                <td>${totalUnpaidFees} ريال</td>
            </tr>
        </tbody>
    </table>
    `;
    
    // تفاصيل لكل معلق
    for (const [name, data] of Object.entries(voiceActorSummary)) {
        html += `
            <div class="voice-actor-details" style="margin-top: 30px;">
                <h4>${name} - التفاصيل</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>رقم الحجز</th>
                            <th>التاريخ</th>
                            <th>العميل</th>
                            <th>الأجر</th>
                            <th>الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        data.reservations.forEach(res => {
            const recordDate = new Date(res.date);
            const formattedDate = recordDate.toLocaleDateString();
            
            html += `
                <tr>
                    <td>${res.id}</td>
                    <td>${formattedDate}</td>
                    <td>${res.client}</td>
                    <td>${res.fee} ريال</td>
                    <td>
                        <span class="status-badge ${res.paid ? 'paid' : 'pending'}">
                            ${res.paid ? 'تم الدفع' : 'معلق'}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        </div>
        `;
    }
    
    content.innerHTML = html;
}

// طباعة تقرير المعلقين
function printVoiceActorsReport() {
    const content = document.getElementById('voiceActorsReportContent').innerHTML;
    const fromDate = document.getElementById('voicesReportFromDate').value;
    const toDate = document.getElementById('voicesReportToDate').value;
    
    let dateRange = '';
    if (fromDate && toDate) {
        dateRange = `من ${fromDate} إلى ${toDate}`;
    } else if (fromDate) {
        dateRange = `من ${fromDate}`;
    } else if (toDate) {
        dateRange = `حتى ${toDate}`;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <title>تقرير مستحقات المعلقين</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                th { background-color: #f2f2f2; }
                h1, h2, h4 { text-align: center; }
                .status-badge { padding: 4px 8px; border-radius: 4px; display: inline-block; }
                .paid { background-color: #d5f5e3; color: #27ae60; }
                .pending { background-color: #fdebd0; color: #f39c12; }
                .report-header { margin-bottom: 30px; text-align: center; }
                @media print {
                    button { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="report-header">
                <h1>تقرير مستحقات المعلقين</h1>
                ${dateRange ? `<h3>${dateRange}</h3>` : ''}
                <p>تاريخ الطباعة: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
            </div>
            ${content}
            <button onclick="window.print()" style="display: block; margin: 20px auto; padding: 10px 20px;">طباعة التقرير</button>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ======= وظائف استيراد الفواتير =======
// عرض مودال استيراد الفواتير
function importInvoicesModal(isExcelImport = false) {
    if (!document.getElementById('importInvoicesModal')) {
        const modal = document.createElement('div');
        modal.id = 'importInvoicesModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="closeModal('importInvoicesModal')">×</button>
                <h3>${isExcelImport ? 'استيراد من Excel' : 'استيراد الفواتير'}</h3>
                <p style="margin-bottom: 15px; font-size: 14px; color: var(--text-light);">
                    يمكنك استيراد الفواتير من ملفات CSV أو Excel (xlsx, xls)
                </p>
                <div class="import-file-section">
                    <label>اختر ملف</label>
                    <input type="file" id="invoicesImportFile" accept="${isExcelImport ? '.xlsx,.xls' : '.csv,.xlsx,.xls'}" class="input">
                </div>
                <div class="import-preview" id="invoicesImportPreview" style="margin-top: 15px; display: none;">
                    <h4>معاينة البيانات</h4>
                    <div class="preview-table-container" style="max-height: 200px; overflow-y: auto; margin-bottom: 15px;">
                        <table class="data-table" id="invoicesPreviewTable">
                            <thead>
                                <tr>
                                    <th>رقم الفاتورة</th>
                                    <th>التاريخ</th>
                                    <th>العميل</th>
                                    <th>المبلغ</th>
                                    <th>الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- سيتم ملؤها ديناميكيًا -->
                            </tbody>
                        </table>
                    </div>
                </div>
                <button class="btn" id="processInvoicesImportBtn" onclick="processInvoicesImport()">
                    <i class='bx bx-import'></i> استيراد
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        // تحديث عنوان المودال
        const modalTitle = document.querySelector('#importInvoicesModal h3');
        if (modalTitle) {
            modalTitle.textContent = isExcelImport ? 'استيراد من Excel' : 'استيراد الفواتير';
        }
        
        // تحديث قبول الملفات
        const fileInput = document.getElementById('invoicesImportFile');
        if (fileInput) {
            fileInput.accept = isExcelImport ? '.xlsx,.xls' : '.csv,.xlsx,.xls';
        }
    }
    
    // إظهار المودال
    document.getElementById('importInvoicesModal').classList.add('active');
    
    // إعادة تعيين عناصر المودال
    document.getElementById('invoicesImportFile').value = '';
    document.getElementById('invoicesImportPreview').style.display = 'none';
    
    // إضافة مستمع لمعالجة الملف المختار
    document.getElementById('invoicesImportFile').addEventListener('change', previewInvoicesImport);
}

// استيراد من Excel مباشرة
function importInvoicesFromExcel() {
    importInvoicesModal(true);
}

// معالجة استيراد الفواتير
function processInvoicesImport() {
    const fileInput = document.getElementById('invoicesImportFile');
    if (!fileInput || !fileInput.dataset.parsedData) {
        alert("لم يتم العثور على بيانات للاستيراد. الرجاء تحميل ملف أولاً.");
        return;
    }
    
    // استرجاع البيانات المعالجة مسبقاً
    try {
        const invoicesData = JSON.parse(fileInput.dataset.parsedData);
        if (!invoicesData || invoicesData.length === 0) {
            alert("لا توجد بيانات صالحة للاستيراد");
            return;
        }
        
        // حفظ حالة النظام قبل التغيير
        saveState();
        
        // تتبع أرقام الفواتير الجديدة لاستخدامها في الربط التلقائي
        const newInvoiceNumbers = [];
        
        // استيراد الفواتير
        let importedCount = 0;
        let skippedCount = 0;
        
        invoicesData.forEach(data => {
            // التحقق من عدم وجود فاتورة بنفس الرقم
            const existing = invoices.find(inv => inv.invoiceNumber === data.invoiceNumber);
            if (existing) {
                skippedCount++;
                return;
            }
            
            // حساب ضريبة القيمة المضافة بناءً على القيم المدخلة
            const subtotal = data.invoiceAmount - data.vat;  // المبلغ الفرعي = المبلغ الإجمالي - الضريبة
            
            // إنشاء كائن فاتورة جديد
            const newInvoice = {
                invoiceNumber: data.invoiceNumber,
                date: data.date,
                customer: data.customer,
                email: '', // يمكن تحديثه لاحقاً
                subtotal: subtotal > 0 ? subtotal : data.invoiceAmount,
                tax1: data.vat || 0, // ضريبة القيمة المضافة
                tax2: 0, // ضريبة إضافية
                invoiceAmount: data.invoiceAmount,
                receivedAmount: data.receivedAmount || 0,
                isPaid: data.isPaid || (data.receivedAmount >= data.invoiceAmount),
                paymentDate: data.isPaid ? new Date().toISOString().slice(0, 10) : null,
                additionalInfo: 'تم الاستيراد من ' + (new Date()).toLocaleDateString()
            };
            
            // إضافة الفاتورة للمصفوفة
            invoices.push(newInvoice);
            newInvoiceNumbers.push(data.invoiceNumber);
            importedCount++;
        });
        
        if (importedCount > 0) {
            // تحديث العرض
            renderInvoicesTable();
            updateAllStatistics();
            
            // محاولة ربط الفواتير بالحجوزات تلقائياً
            autoLinkInvoicesToReservations(newInvoiceNumbers);
            
            alert(`تم استيراد ${importedCount} فاتورة بنجاح، وتم تخطي ${skippedCount} فاتورة موجودة مسبقاً`);
        } else {
            alert("لم يتم استيراد أي فواتير جديدة");
        }
        
        // إغلاق المودال
        closeModal('importInvoicesModal');
        
    } catch (error) {
        console.error("خطأ في استيراد الفواتير:", error);
        alert("حدث خطأ أثناء استيراد الفواتير");
    }
}

// معاينة ملف استيراد الفواتير
function previewInvoicesImport() {
    const fileInput = document.getElementById('invoicesImportFile');
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        return;
    }
    
    const file = fileInput.files[0];
    const fileName = file.name.toLowerCase();
    const reader = new FileReader();
    
    reader.onload = function(e) {
        let invoicesData = [];
        
        try {
            if (fileName.endsWith('.csv')) {
                // معالجة ملف CSV
                invoicesData = parseCSVInvoices(e.target.result);
            } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                // معالجة ملف Excel
                const data = new Uint8Array(e.target.result);
                console.log("قراءة ملف Excel...");
                try {
                    const workbook = XLSX.read(data, { type: 'array' });
                    console.log("تم قراءة ملف Excel بنجاح:", workbook.SheetNames);
                    invoicesData = parseExcelInvoices(workbook);
                } catch (error) {
                    console.error("خطأ في قراءة ملف Excel:", error);
                    alert("حدث خطأ أثناء قراءة ملف Excel: " + error.message);
                    return;
                }
            } else {
                alert("صيغة الملف غير مدعومة. يرجى استخدام CSV أو Excel.");
                return;
            }
            
            if (invoicesData.length === 0) {
                alert("لم يتم العثور على بيانات صالحة في الملف");
                return;
            }
            
            // عرض معاينة البيانات
            const previewContainer = document.getElementById('invoicesImportPreview');
            const previewTable = document.getElementById('invoicesPreviewTable').getElementsByTagName('tbody')[0];
            previewTable.innerHTML = '';
            
            invoicesData.forEach(invoice => {
                const exists = invoices.some(i => i.invoiceNumber === invoice.invoiceNumber);
                const row = previewTable.insertRow();
                
                const numberCell = row.insertCell(0);
                const dateCell = row.insertCell(1);
                const customerCell = row.insertCell(2);
                const amountCell = row.insertCell(3);
                const statusCell = row.insertCell(4);
                
                numberCell.textContent = invoice.invoiceNumber || "غير محدد";
                dateCell.textContent = invoice.date || "غير محدد";
                customerCell.textContent = invoice.customer || "غير محدد";
                amountCell.textContent = invoice.invoiceAmount ? `${invoice.invoiceAmount} ريال` : "غير محدد";
                
                if (exists) {
                    statusCell.textContent = "موجود مسبقًا";
                    statusCell.style.color = "var(--warning-color)";
                } else {
                    statusCell.textContent = "جديد";
                    statusCell.style.color = "var(--success-color)";
                }
            });
            
            // إظهار قسم المعاينة
            previewContainer.style.display = 'block';
            
            // تخزين البيانات للمعالجة لاحقًا
            document.getElementById('invoicesImportFile').dataset.parsedData = JSON.stringify(invoicesData);
            
        } catch (error) {
            console.error("خطأ في معالجة الملف:", error);
            alert("حدث خطأ أثناء معالجة الملف. تأكد من تنسيق الملف وحاول مرة أخرى.");
        }
    };
    
    reader.onerror = function() {
        alert("حدث خطأ أثناء قراءة الملف");
    };
    
    if (fileName.endsWith('.csv')) {
        reader.readAsText(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
}

// تحليل بيانات الفواتير من ملف CSV
function parseCSVInvoices(csvContent) {
    // تقسيم المحتوى إلى أسطر
    const lines = csvContent.split(/\r\n|\n/);
    if (lines.length <= 1) return [];
    
    // استخراج رؤوس الأعمدة
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    let numberIndex = -1;
    let dateIndex = -1;
    let customerIndex = -1;
    let invoiceAmountIndex = -1;
    let receivedAmountIndex = -1;
    let vatIndex = -1;
    
    // البحث عن مؤشرات الأعمدة المطلوبة حسب العناوين المذكورة
    console.log("العناوين المتوفرة في ملف CSV:", headers);
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        // فحص الأسماء الإنجليزية والعربية للأعمدة
        if (header === 'number' || header === 'رقم' || header === 'رقم الفاتورة') {
            numberIndex = i;
        } else if (header === 'date' || header === 'تاريخ' || header === 'التاريخ') {
            dateIndex = i;
        } else if (header === 'customer' || header === 'عميل' || header === 'العميل' || header === 'اسم العميل') {
            customerIndex = i;
        } else if (header === 'invoice amount' || header === 'amount' || header === 'مبلغ' || header === 'المبلغ' || header === 'القيمة' || header === 'مبلغ الفاتورة') {
            invoiceAmountIndex = i;
        } else if (header === 'received amount' || header === 'received' || header === 'مبلغ مستلم' || header === 'المبلغ المستلم') {
            receivedAmountIndex = i;
        } else if (header === 'vat' || header === 'tax' || header === 'ضريبة' || header === 'الضريبة' || header === 'ضريبة القيمة المضافة') {
            vatIndex = i;
        }
    }
    
    // إذا لم يتم العثور على الأعمدة الرئيسية
    if (numberIndex === -1 || dateIndex === -1 || customerIndex === -1 || invoiceAmountIndex === -1) {
        console.log("عناوين الأعمدة المتوفرة:", headers);
        alert("لم يتم العثور على جميع الأعمدة المطلوبة في الملف");
        return [];
    }
    
    // استخراج بيانات الفواتير
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const data = lines[i].split(',');
        if (data.length < Math.max(numberIndex, dateIndex, customerIndex, invoiceAmountIndex) + 1) continue;
        
        const invoiceNumber = data[numberIndex].trim();
        const date = data[dateIndex].trim();
        const customer = data[customerIndex].trim();
        const invoiceAmount = parseFloat(data[invoiceAmountIndex]) || 0;
        const receivedAmount = receivedAmountIndex >= 0 ? parseFloat(data[receivedAmountIndex]) || 0 : 0;
        const vat = vatIndex >= 0 ? parseFloat(data[vatIndex]) || 0 : 0;
        
        if (!invoiceNumber || !customer || invoiceAmount <= 0) continue;
        
        result.push({
            invoiceNumber,
            date,
            customer,
            invoiceAmount,
            receivedAmount,
            vat,
            isPaid: receivedAmount >= invoiceAmount
        });
    }
    
    return result;
}

// تحليل بيانات الفواتير من ملف Excel
function parseExcelInvoices(workbook) {
    // استخدام الورقة الأولى في الملف
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // تحويل البيانات إلى مصفوفة كائنات
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (data.length <= 1) return [];
    
    // البحث عن الأعمدة المطابقة حسب العناوين المذكورة
    const headers = data[0].map(h => String(h).trim().toLowerCase());
    
    let numberColumn = -1;
    let dateColumn = -1;
    let customerColumn = -1;
    let invoiceAmountColumn = -1;
    let receivedAmountColumn = -1;
    let vatColumn = -1;
    
    // البحث عن مؤشرات الأعمدة المطلوبة
    console.log("العناوين المتوفرة في الملف:", headers);
    for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        // فحص الأسماء الإنجليزية والعربية للأعمدة
        if (header === 'number' || header === 'رقم' || header === 'رقم الفاتورة') {
            numberColumn = i;
        } else if (header === 'date' || header === 'تاريخ' || header === 'التاريخ') {
            dateColumn = i;
        } else if (header === 'customer' || header === 'عميل' || header === 'العميل' || header === 'اسم العميل') {
            customerColumn = i;
        } else if (header === 'invoice amount' || header === 'amount' || header === 'مبلغ' || header === 'المبلغ' || header === 'القيمة' || header === 'مبلغ الفاتورة') {
            invoiceAmountColumn = i;
        } else if (header === 'received amount' || header === 'received' || header === 'مبلغ مستلم' || header === 'المبلغ المستلم') {
            receivedAmountColumn = i;
        } else if (header === 'vat' || header === 'tax' || header === 'ضريبة' || header === 'الضريبة' || header === 'ضريبة القيمة المضافة') {
            vatColumn = i;
        }
    }
    
    // إذا لم يتم العثور على الأعمدة الرئيسية
    if (numberColumn === -1 || dateColumn === -1 || customerColumn === -1 || invoiceAmountColumn === -1) {
        console.log("عناوين الأعمدة المتوفرة:", headers);
        alert("لم يتم العثور على جميع الأعمدة المطلوبة في الملف");
        return [];
    }
    
    // استخراج بيانات الفواتير
    const result = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        let invoiceNumber = row[numberColumn];
        let date = row[dateColumn];
        let customer = row[customerColumn];
        let invoiceAmount = row[invoiceAmountColumn];
        let receivedAmount = receivedAmountColumn >= 0 ? row[receivedAmountColumn] || 0 : 0;
        let vat = vatColumn >= 0 ? row[vatColumn] || 0 : 0;
        
        if (!invoiceNumber || !customer || !invoiceAmount) continue;
        
        invoiceNumber = String(invoiceNumber).trim();
        customer = String(customer).trim();
        invoiceAmount = parseFloat(invoiceAmount) || 0;
        receivedAmount = parseFloat(receivedAmount) || 0;
        vat = parseFloat(vat) || 0;
        
        if (invoiceNumber === '' || customer === '' || invoiceAmount <= 0) continue;
        
        // تنسيق التاريخ
        let formattedDate = '';
        if (typeof date === 'string') {
            formattedDate = date;
        } else if (typeof date === 'number') {
            // تحويل تاريخ Excel إلى تاريخ JavaScript
            const excelDate = new Date(Math.round((date - 25569) * 86400 * 1000));
            formattedDate = excelDate.toISOString().slice(0, 10); // YYYY-MM-DD
        } else {
            formattedDate = new Date().toISOString().slice(0, 10);
        }
        
        result.push({
            invoiceNumber,
            date: formattedDate,
            customer,
            invoiceAmount,
            receivedAmount,
            vat,
            isPaid: receivedAmount >= invoiceAmount
        });
    }
    
    return result;
}

// الربط التلقائي للفواتير بالحجوزات
function autoLinkInvoicesToReservations(newInvoiceNumbers) {
    let linkedCount = 0;
    
    for (const invoiceNumber of newInvoiceNumbers) {
        const invoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
        if (!invoice) continue;
        
        // البحث عن الحجوزات غير المرتبطة لنفس العميل
        const unlinkedReservations = reservations.filter(r => 
            r.client === invoice.customer && 
            (!r.invoiceNumber || r.invoiceNumber === '')
        );
        
        if (unlinkedReservations.length > 0) {
            // ربط الحجز الأول بالفاتورة
            unlinkedReservations[0].invoiceNumber = invoiceNumber;
            unlinkedReservations[0].invoicePaid = invoice.isPaid;
            linkedCount++;
        }
    }
    
    if (linkedCount > 0) {
        // تحديث جدول الحجوزات
        renderReservationsTable();
        
        console.log(`تم ربط ${linkedCount} حجز بالفواتير تلقائياً`);
    }
}

// عرض تفاصيل الفاتورة
function showInvoiceDetails(index) {
    const invoice = invoices[index];
    if (!invoice) return;
    
    if (!document.getElementById('invoiceDetailsModal')) {
        const modal = document.createElement('div');
        modal.id = 'invoiceDetailsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="closeModal('invoiceDetailsModal')">×</button>
                <h3>تفاصيل الفاتورة</h3>
                <div id="invoiceDetailsContent"></div>
                <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                    <button class="btn" onclick="markInvoiceAsPaid()">
                        <i class='bx bx-check'></i> تعيين كمدفوعة
                    </button>
                    <button class="btn btn-outline" onclick="editInvoice()">
                        <i class='bx bx-edit'></i> تعديل الفاتورة
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // عرض تفاصيل الفاتورة
    const content = document.getElementById('invoiceDetailsContent');
    content.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <p><strong>رقم الفاتورة:</strong> ${invoice.invoiceNumber}</p>
                <p><strong>التاريخ:</strong> ${invoice.date}</p>
                <p><strong>العميل:</strong> ${invoice.customer}</p>
                <p><strong>البريد الإلكتروني:</strong> ${invoice.email || '-'}</p>
            </div>
            <div>
                <p><strong>المبلغ الفرعي:</strong> ${invoice.subtotal} ريال</p>
                <p><strong>الضريبة:</strong> ${invoice.tax1 + invoice.tax2} ريال</p>
                <p><strong>إجمالي المبلغ:</strong> ${invoice.invoiceAmount} ريال</p>
                <p><strong>المبلغ المستلم:</strong> ${invoice.receivedAmount} ريال</p>
            </div>
        </div>
        <div style="margin-top: 15px;">
            <p><strong>حالة الدفع:</strong> 
                <span class="status-badge ${invoice.isPaid ? 'paid' : 'pending'}">
                    ${invoice.isPaid ? 'مدفوعة' : 'معلقة'}
                </span>
            </p>
            ${invoice.isPaid ? `<p><strong>تاريخ الدفع:</strong> ${invoice.paymentDate || '-'}</p>` : ''}
            <p><strong>معلومات إضافية:</strong> ${invoice.additionalInfo || '-'}</p>
        </div>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid var(--border-color);">
        <div>
            <h4>الحجوزات المرتبطة:</h4>
            <div id="linkedReservations"></div>
        </div>
    `;
    
    // عرض الحجوزات المرتبطة بالفاتورة
    const linkedReservations = document.getElementById('linkedReservations');
    const relatedReservations = reservations.filter(r => r.invoiceNumber === invoice.invoiceNumber);
    
    if (relatedReservations.length > 0) {
        let html = `
            <table class="data-table" style="margin-top: 10px;">
                <thead>
                    <tr>
                        <th>رقم الحجز</th>
                        <th>التاريخ</th>
                        <th>المعلقون</th>
                        <th>المبلغ</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        relatedReservations.forEach(res => {
            const recordDate = new Date(res.recordTime);
            const formattedDate = recordDate.toLocaleDateString();
            const actorNames = res.voiceActors.map(a => a.name).join(', ');
            
            html += `
                <tr>
                    <td>${res.id}</td>
                    <td>${formattedDate}</td>
                    <td>${actorNames}</td>
                    <td>${res.workPrice} ريال</td>
                </tr>
            `;
        });
        
        html += `</tbody></table>`;
        linkedReservations.innerHTML = html;
    } else {
        linkedReservations.innerHTML = '<p>لا توجد حجوزات مرتبطة بهذه الفاتورة</p>';
    }
    
    // تخزين معرف الفاتورة الحالية
    document.getElementById('invoiceDetailsModal').dataset.invoiceIndex = index;
    
    // إظهار المودال
    document.getElementById('invoiceDetailsModal').classList.add('active');
}

// تعيين الفاتورة كمدفوعة
function markInvoiceAsPaid() {
    const modal = document.getElementById('invoiceDetailsModal');
    const index = parseInt(modal.dataset.invoiceIndex);
    const invoice = invoices[index];
    
    if (invoice.isPaid) {
        alert("هذه الفاتورة مدفوعة بالفعل");
        return;
    }
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    // تحديث حالة الفاتورة
    invoice.isPaid = true;
    invoice.receivedAmount = invoice.invoiceAmount;
    invoice.paymentDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    // تحديث حالة الحجوزات المرتبطة
    reservations.forEach(res => {
        if (res.invoiceNumber === invoice.invoiceNumber) {
            res.invoicePaid = true;
        }
    });
    
    // إضافة سجل للعملية
    invoiceAuditLog.push({
        operation: "MarkPaid",
        invoiceNumber: invoice.invoiceNumber,
        date: new Date().toLocaleString()
    });
    
    // تحديث الجداول
    renderInvoicesTable();
    renderReservationsTable();
    renderInvoiceAuditLogTable();
    
    // تحديث الإحصائيات
    updateAllStatistics();
    
    // إغلاق المودال
    closeModal('invoiceDetailsModal');
    
    // إظهار رسالة نجاح
    alert(`تم تعيين الفاتورة ${invoice.invoiceNumber} كمدفوعة بنجاح`);
}

// تعديل الفاتورة
function editInvoice() {
    const modal = document.getElementById('invoiceDetailsModal');
    const index = parseInt(modal.dataset.invoiceIndex);
    const invoice = invoices[index];
    
    if (!document.getElementById('editInvoiceModal')) {
        const modal = document.createElement('div');
        modal.id = 'editInvoiceModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close" onclick="closeModal('editInvoiceModal')">×</button>
                <h3>تعديل الفاتورة</h3>
                <input type="hidden" id="editInvoiceIndex">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label>رقم الفاتورة</label>
                        <input type="text" id="editInvoiceNumber" class="input" disabled>
                        <label>التاريخ</label>
                        <input type="date" id="editInvoiceDate" class="input">
                        <label>العميل</label>
                        <input type="text" list="clientList" id="editInvoiceCustomer" class="input">
                        <label>البريد الإلكتروني</label>
                        <input type="email" id="editInvoiceEmail" class="input">
                    </div>
                    <div>
                        <label>المبلغ الفرعي</label>
                        <input type="number" id="editInvoiceSubtotal" class="input">
                        <label>الضريبة 1 (%)</label>
                        <input type="number" id="editInvoiceTax1" class="input">
                        <label>الضريبة 2 (%)</label>
                        <input type="number" id="editInvoiceTax2" class="input">
                        <label>المبلغ المستلم</label>
                        <input type="number" id="editInvoiceReceived" class="input">
                    </div>
                </div>
                <div style="margin: 15px 0;">
                    <label>معلومات إضافية</label>
                    <textarea id="editInvoiceInfo" class="input" rows="3"></textarea>
                </div>
                <div style="margin: 15px 0;">
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 0;">
                        <input type="checkbox" id="editInvoicePaid" style="width: 18px; height: 18px;">
                        <span>مدفوعة</span>
                    </label>
                </div>
                <label>تاريخ الدفع</label>
                <input type="date" id="editInvoicePaymentDate" class="input">
                <button class="btn" onclick="saveInvoiceEdit()">
                    <i class='bx bx-save'></i> حفظ التعديلات
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // ملء البيانات
    document.getElementById('editInvoiceIndex').value = index;
    document.getElementById('editInvoiceNumber').value = invoice.invoiceNumber;
    document.getElementById('editInvoiceDate').value = invoice.date;
    document.getElementById('editInvoiceCustomer').value = invoice.customer;
    document.getElementById('editInvoiceEmail').value = invoice.email || '';
    document.getElementById('editInvoiceSubtotal').value = invoice.subtotal;
    document.getElementById('editInvoiceTax1').value = (invoice.tax1 / invoice.subtotal * 100) || 0;
    document.getElementById('editInvoiceTax2').value = (invoice.tax2 / invoice.subtotal * 100) || 0;
    document.getElementById('editInvoiceReceived').value = invoice.receivedAmount;
    document.getElementById('editInvoiceInfo').value = invoice.additionalInfo || '';
    document.getElementById('editInvoicePaid').checked = invoice.isPaid;
    document.getElementById('editInvoicePaymentDate').value = invoice.paymentDate || '';
    
    // إغلاق مودال التفاصيل
    closeModal('invoiceDetailsModal');
    
    // إظهار مودال التعديل
    document.getElementById('editInvoiceModal').classList.add('active');
}

// حفظ تعديلات الفاتورة
function saveInvoiceEdit() {
    const index = parseInt(document.getElementById('editInvoiceIndex').value);
    const invoiceNumber = document.getElementById('editInvoiceNumber').value.trim();
    const date = document.getElementById('editInvoiceDate').value;
    const customer = document.getElementById('editInvoiceCustomer').value.trim();
    const email = document.getElementById('editInvoiceEmail').value.trim();
    const subtotal = parseFloat(document.getElementById('editInvoiceSubtotal').value) || 0;
    const tax1Percent = parseFloat(document.getElementById('editInvoiceTax1').value) || 0;
    const tax2Percent = parseFloat(document.getElementById('editInvoiceTax2').value) || 0;
    const receivedAmount = parseFloat(document.getElementById('editInvoiceReceived').value) || 0;
    const additionalInfo = document.getElementById('editInvoiceInfo').value.trim();
    const isPaid = document.getElementById('editInvoicePaid').checked;
    const paymentDate = document.getElementById('editInvoicePaymentDate').value;
    
    if (!date) {
        alert("يرجى تحديد تاريخ الفاتورة");
        return;
    }
    
    if (!customer) {
        alert("يرجى إدخال اسم العميل");
        return;
    }
    
    if (subtotal <= 0) {
        alert("يرجى إدخال مبلغ الفاتورة");
        return;
    }
    
    if (isPaid && !paymentDate) {
        alert("يرجى تحديد تاريخ الدفع للفواتير المدفوعة");
        return;
    }
    
    // حساب الضرائب
    const tax1 = (subtotal * tax1Percent / 100);
    const tax2 = (subtotal * tax2Percent / 100);
    const invoiceAmount = subtotal + tax1 + tax2;
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    // تحديث العميل في الحجوزات إذا تغير
    const oldCustomer = invoices[index].customer;
    if (oldCustomer !== customer) {
        reservations.forEach(res => {
            if (res.client === oldCustomer && res.invoiceNumber === invoiceNumber) {
                res.client = customer;
            }
        });
    }
    
    // تحديث حالة الدفع في الحجوزات المرتبطة
    const oldIsPaid = invoices[index].isPaid;
    if (oldIsPaid !== isPaid) {
        reservations.forEach(res => {
            if (res.invoiceNumber === invoiceNumber) {
                res.invoicePaid = isPaid;
            }
        });
    }
    
    // تحديث بيانات الفاتورة
    invoices[index].date = date;
    invoices[index].customer = customer;
    invoices[index].email = email;
    invoices[index].subtotal = subtotal;
    invoices[index].tax1 = tax1;
    invoices[index].tax2 = tax2;
    invoices[index].invoiceAmount = invoiceAmount;
    invoices[index].receivedAmount = receivedAmount;
    invoices[index].additionalInfo = additionalInfo;
    invoices[index].isPaid = isPaid;
    invoices[index].paymentDate = paymentDate;
    
    // إضافة سجل للعملية
    invoiceAuditLog.push({
        operation: "Edit",
        invoiceNumber: invoiceNumber,
        date: new Date().toLocaleString()
    });
    
    // تحديث الجداول
    renderInvoicesTable();
    renderReservationsTable();
    renderInvoiceAuditLogTable();
    
    // تحديث الإحصائيات
    updateAllStatistics();
    
    // إغلاق المودال
    closeModal('editInvoiceModal');
    
    // إظهار رسالة نجاح
    alert(`تم تحديث بيانات الفاتورة ${invoiceNumber} بنجاح`);
}

// دالة لفتح إعدادات الحفظ السحابي
function openCloudSettings() {
    console.log('فتح نافذة إعدادات الحفظ السحابي');
    
    try {
        // البحث عن النافذة في المستند
        let modal = document.getElementById('cloudSettingsModal');
        
        // إنشاء النافذة إذا لم تكن موجودة
        if (!modal) {
            console.log('إنشاء نافذة الإعدادات');
            
            modal = document.createElement('div');
            modal.id = 'cloudSettingsModal';
            modal.className = 'modal active'; // إضافة 'active' لعرضها مباشرة
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>إعدادات النسخ الاحتياطي والمزامنة</h3>
                        <button class="close-btn" onclick="closeModal('cloudSettingsModal')">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="settings-section">
                            <h4>حساب Google Drive</h4>
                            <p id="driveAuthMessage">لم يتم تسجيل الدخول بعد.</p>
                            <button id="googleDriveAuthBtn" class="btn" disabled>
                                <i class='bx bxl-google'></i> تسجيل الدخول مع Google
                            </button>
                        </div>
                        
                        <div id="driveBackupSettings" class="settings-section" style="display: none;">
                            <h4>إعدادات النسخ الاحتياطي</h4>
                            <div class="form-group">
                                <label for="backupFolderName">مجلد النسخ الاحتياطي</label>
                                <input type="text" id="backupFolderName" value="Dashboard_Backups" />
                            </div>
                            
                            <div class="form-group">
                                <label>النسخ الاحتياطي التلقائي</label>
                                <input type="checkbox" id="enableAutoBackup" />
                                <label for="enableAutoBackup">تفعيل</label>
                            </div>
                            
                            <div id="autoBackupOptions" style="display: none;">
                                <div class="form-group">
                                    <label for="backupFrequency">تكرار النسخ الاحتياطي</label>
                                    <select id="backupFrequency">
                                        <option value="daily">يومي</option>
                                        <option value="weekly" selected>أسبوعي</option>
                                        <option value="monthly">شهري</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div id="driveRestoreOptions" class="settings-section" style="display: none;">
                            <h4>استعادة البيانات</h4>
                            <button class="btn" onclick="listDriveBackups()">عرض النسخ الاحتياطية المتاحة</button>
                            <div id="backupsList"></div>
                        </div>
                        
                        <div id="driveRestoreMessage" class="settings-section">
                            <p>يجب تسجيل الدخول أولاً للوصول إلى خيارات النسخ الاحتياطي واستعادة البيانات.</p>
                        </div>
                        
                        <div id="localBackupSettings" class="settings-section">
                            <h4>التخزين المحلي</h4>
                            <button class="btn" onclick="saveToLocalStorage()">حفظ البيانات محلياً</button>
                            <p class="info-text">يتم حفظ البيانات في متصفحك المحلي، وقد تفقد البيانات إذا تم تنظيف ذاكرة التخزين المؤقت.</p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="saveCloudSettings()">حفظ الإعدادات</button>
                        <button class="btn btn-outline" onclick="closeModal('cloudSettingsModal')">إغلاق</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // تعيين معالج النقر لزر المصادقة
            const authBtn = document.getElementById('googleDriveAuthBtn');
            if (authBtn) {
                authBtn.disabled = false;
                authBtn.onclick = function() {
                    if (typeof googleDriveAuth !== 'undefined' && typeof googleDriveAuth.authenticate === 'function') {
                        googleDriveAuth.authenticate();
                    } else {
                        alert('واجهة المصادقة غير متوفرة حالياً، يرجى استخدام خيارات الحفظ المحلي.');
                    }
                };
            }
        } else {
            // تفعيل النافذة إذا كانت موجودة بالفعل
            modal.className = 'modal active';
        }
        
        console.log('تم عرض النافذة المنبثقة:', modal.className);
            
        // تحديث حالة المصادقة
        const authMessage = document.getElementById('driveAuthMessage');
        if (authMessage) {
            if (typeof google === 'undefined' || typeof gapi === 'undefined') {
                authMessage.innerHTML = 'خدمات Google غير متوفرة حالياً. استخدم خيارات الحفظ المحلي.';
                authMessage.style.color = 'orange';
                
                // تفعيل خيارات الحفظ المحلي
                const localBackupSection = document.getElementById('localBackupSettings');
                if (localBackupSection) {
                    localBackupSection.style.display = 'block';
                }
            }
        }
        
        // تحديث حالة خيارات النسخ التلقائي
        const autoBackupEnabled = localStorage.getItem('autoBackupEnabled') === 'true';
        const autoBackupCheckbox = document.getElementById('enableAutoBackup');
        const autoBackupOptions = document.getElementById('autoBackupOptions');
        
        if (autoBackupCheckbox && autoBackupOptions) {
            autoBackupCheckbox.checked = autoBackupEnabled;
            
            if (autoBackupEnabled) {
                autoBackupOptions.style.display = 'block';
            } else {
                autoBackupOptions.style.display = 'none';
            }
        }
        
        // تحديث اسم مجلد النسخ الاحتياطي
        const folderNameInput = document.getElementById('backupFolderName');
        if (folderNameInput) {
            const savedFolderName = localStorage.getItem('backupFolderName');
            if (savedFolderName) {
                folderNameInput.value = savedFolderName;
            }
        }
    } catch (error) {
        console.error('خطأ في فتح نافذة الإعدادات:', error);
        alert('حدث خطأ في فتح نافذة الإعدادات. يرجى المحاولة مرة أخرى.');
    }
}

// دالة النسخ الاحتياطي إلى Google Drive
function backupToDrive(isManualSave = false) {
    try {
        // التأكد من وجود دالة backupToDrive في cloud-backup.js
        if (window.backupToDriveOriginal && typeof window.backupToDriveOriginal === 'function') {
            window.backupToDriveOriginal(isManualSave);
        } else {
            // إذا لم تكن الدالة موجودة، نستخدم تطبيق محلي بسيط
            showSyncIndicator("جاري تهيئة النسخ الاحتياطي...");
            setTimeout(function() {
                const dataToBackup = {
                    balance: balance,
                    voices: voices,
                    clients: clients,
                    reservations: reservations,
                    invoices: invoices,
                    invoiceAuditLog: invoiceAuditLog,
                    savedAt: new Date().toISOString()
                };
                
                if (isManualSave) {
                    localStorage.setItem('dashboardBackup', JSON.stringify(dataToBackup));
                    alert("تم حفظ البيانات بنجاح في التخزين المحلي");
                }
                
                hideSyncIndicator();
            }, 800);
        }
    } catch (error) {
        console.error("خطأ أثناء النسخ الاحتياطي:", error);
        alert("حدث خطأ أثناء عملية النسخ الاحتياطي");
        hideSyncIndicator();
    }
}

// دالة استعادة النسخ الاحتياطي من Google Drive
function restoreFromDrive(fileId, fileName) {
    try {
        // التحقق من وجود دالة restoreFromDrive الأصلية
        if (window.restoreFromDriveOriginal && typeof window.restoreFromDriveOriginal === 'function') {
            window.restoreFromDriveOriginal(fileId, fileName);
        } else {
            showSyncIndicator("جاري محاولة استعادة البيانات...");
            setTimeout(function() {
                // محاولة استعادة من التخزين المحلي
                const localBackup = localStorage.getItem('dashboardBackup');
                if (localBackup) {
                    try {
                        const backupData = JSON.parse(localBackup);
                        
                        // حفظ نسخة احتياطية من البيانات الحالية قبل الاستعادة
                        const currentData = {
                            balance: balance,
                            voices: voices,
                            clients: clients,
                            reservations: reservations,
                            invoices: invoices,
                            invoiceAuditLog: invoiceAuditLog,
                            savedAt: new Date().toISOString()
                        };
                        localStorage.setItem('restoreBackupUndo', JSON.stringify(currentData));
                        
                        // استعادة البيانات
                        if (backupData.balance !== undefined) balance = backupData.balance;
                        if (backupData.voices) voices = backupData.voices;
                        if (backupData.clients) clients = backupData.clients;
                        if (backupData.reservations) reservations = backupData.reservations;
                        if (backupData.invoices) invoices = backupData.invoices;
                        if (backupData.invoiceAuditLog) invoiceAuditLog = backupData.invoiceAuditLog;
                        
                        // تحديث واجهة المستخدم
                        updateAllStatistics();
                        renderVoicesTable();
                        renderClientsTable();
                        renderReservationsTable();
                        renderInvoicesTable();
                        renderInvoiceAuditLogTable();
                        updateCharts();
                        
                        alert("تم استعادة البيانات بنجاح من التخزين المحلي");
                    } catch (e) {
                        console.error("خطأ في استعادة البيانات:", e);
                        alert("حدث خطأ أثناء استعادة البيانات");
                    }
                } else {
                    alert("لم يتم العثور على نسخة احتياطية محلية");
                }
                hideSyncIndicator();
            }, 800);
        }
    } catch (error) {
        console.error("خطأ أثناء استعادة البيانات:", error);
        alert("حدث خطأ أثناء عملية استعادة البيانات");
        hideSyncIndicator();
    }
}

// دالة حفظ إعدادات الحفظ السحابي
function saveCloudSettings() {
    const folderName = document.getElementById('backupFolderName').value;
    localStorage.setItem('backupFolderName', folderName);
    
    const autoBackupEnabled = document.getElementById('enableAutoBackup').checked;
    localStorage.setItem('autoBackupEnabled', autoBackupEnabled);
    
    const frequency = document.getElementById('backupFrequency').value;
    localStorage.setItem('backupFrequency', frequency);
    
    const autoSyncEnabled = document.getElementById('enableAutoSync') ? document.getElementById('enableAutoSync').checked : false;
    localStorage.setItem('autoSyncEnabled', autoSyncEnabled);
    
    // تنفيذ دالة إعداد النسخ الاحتياطي التلقائي إذا كانت موجودة
    if (autoBackupEnabled && typeof window.setupAutoBackup === 'function') {
        window.setupAutoBackup();
    } else if (!autoBackupEnabled && typeof window.clearAutoBackup === 'function') {
        window.clearAutoBackup();
    }
    
    alert('تم حفظ الإعدادات بنجاح');
    closeModal('cloudSettingsModal');
}

// دالة حفظ البيانات في التخزين المحلي
function saveToLocalStorage() {
    try {
        // تجهيز البيانات للحفظ
        const dataToBackup = {
            balance: balance,
            voices: voices,
            clients: clients,
            reservations: reservations,
            invoices: invoices,
            invoiceAuditLog: invoiceAuditLog,
            savedAt: new Date().toISOString()
        };
        
        // حفظ البيانات في التخزين المحلي
        localStorage.setItem('dashboardBackup', JSON.stringify(dataToBackup));
        
        // إظهار رسالة نجاح
        alert("تم حفظ البيانات بنجاح في التخزين المحلي");
        
        // تسجيل النجاح في السجل
        console.log("تم حفظ البيانات في التخزين المحلي بنجاح:", new Date().toLocaleString());
    } catch (error) {
        console.error("خطأ أثناء الحفظ في التخزين المحلي:", error);
        alert("حدث خطأ أثناء حفظ البيانات محلياً");
    }
}

// اعتبار واجهة المستخدم جاهزة
console.log('تم تهيئة النظام بنجاح');