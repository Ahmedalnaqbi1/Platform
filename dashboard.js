// متغيرات عامة
let balance = 10000;
const monthlyExpense = 2000;
const minBalance = 4000;
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

// تنفيذ بعد تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
    // إخفاء واجهة المستخدم حتى يتم تسجيل الدخول
    document.querySelector('.app-container').style.display = 'none';
    
    // إنشاء عنصر مؤشر المزامنة إذا لم يكن موجوداً
    createSyncIndicatorIfNeeded();
    
    populateDatalists();
    initCharts();
    updateAllStatistics();
    
    // تجهيز المودالات
    createEditVoiceModal();
    createEditClientModal();
    createEditReservationModal();
    createAddInvoiceModal();
    
    // تحديث الجداول
    try {
        renderInvoicesTable();
        renderInvoiceAuditLogTable();
        renderReservationsTable();
        renderVoicesTable();
        renderClientsTable();
        renderReports();
    } catch (e) {
        console.error("خطأ في تهيئة الجداول:", e);
    }
    
    // إضافة مستمعي أحداث للبحث
    setupSearchListeners();

    // إضافة مستمعي أحداث للتقارير
    setupReportTabs();
    
    // تفعيل زر اكتشف المزيد في الصفحة الرئيسية
    setupFeatureShowcase();
    
    // حفظ الحالة الأولية
    saveState();
    
    // للاختبار السريع يمكنك إلغاء تعليق هذا السطر
    // skipLogin();
    
    // إعداد الحفظ التلقائي
    setupAutoSave();
    
    // التحقق من وجود توكن صالح لـ Google Drive والبدء بالمزامنة على الفور
    checkTokenAndStartSync();
});

// وظيفة جديدة للتحقق من التوكن وبدء المزامنة
function checkTokenAndStartSync() {
    // التحقق من وجود توكن صالح لـ Google Drive
    const savedToken = localStorage.getItem('gDriveToken');
    const tokenExpiry = localStorage.getItem('gDriveTokenExpiry');
    
    if (savedToken && tokenExpiry && parseInt(tokenExpiry) > Date.now()) {
        console.log('تم العثور على توكن صالح، بدء المزامنة...');
        showSyncIndicator("جاري المزامنة مع آخر نسخة احتياطية...");
        
        // تأخير قصير للسماح بتحميل كل شيء
        setTimeout(() => {
            performSync();
        }, 300);
    } else {
        console.log('لم يتم العثور على توكن صالح، تخطي المزامنة التلقائية');
        hideSyncIndicator();
        
        // إضافة زر المزامنة إلى شاشة تسجيل الدخول
        addSyncButtonToLogin();
    }
}

// وظيفة جديدة للمزامنة تستخدم نفس منطق زر المزامنة
function performSync() {
    // المزامنة التلقائية مفعلة افتراضياً ما لم يتم تعطيلها صراحةً
    const autoSyncEnabled = localStorage.getItem('autoSyncEnabled') !== 'false';
    
    if (!autoSyncEnabled) {
        console.log('المزامنة التلقائية معطلة في الإعدادات');
        hideSyncIndicator();
        return;
    }

    if (typeof window.autoRestoreLatestBackup === 'function') {
        // استخدام نفس منطق زر المزامنة (forceSync) مباشرة
        window.autoRestoreLatestBackup(true)
            .then(result => {
                if (result.success) {
                    showSyncSuccess("تمت المزامنة بنجاح", 
                        `تم تحميل أحدث نسخة بتاريخ: ${new Date(result.creationTime).toLocaleString()}`);
                } else {
                    console.log('لم تتم المزامنة:', result.message);
                }
                hideSyncIndicator();
            })
            .catch(error => {
                console.error('خطأ في المزامنة التلقائية:', error);
                if (typeof window.showSyncError === 'function') {
                    window.showSyncError("فشل في المزامنة", "تعذر تحميل آخر نسخة احتياطية");
                }
                hideSyncIndicator();
            });
    } else {
        console.error('وظيفة autoRestoreLatestBackup غير متاحة');
        hideSyncIndicator();
        
        // محاولة تحميل ملف cloud-backup.js ثم إعادة المحاولة
        const script = document.createElement('script');
        script.src = 'js/cloud-backup.js';
        script.onload = function() {
            if (typeof window.autoRestoreLatestBackup === 'function') {
                performSync();
            }
        };
        document.head.appendChild(script);
    }
}

// إضافة زر المزامنة إلى شاشة تسجيل الدخول
function addSyncButtonToLogin() {
    const loginContent = document.querySelector('.login-content');
    if (!loginContent) return;
    
    // التحقق من عدم وجود الزر بالفعل
    if (document.getElementById('loginSyncBtn')) return;
    
    // إنشاء قسم للزر مع تعليمات المزامنة
    const syncSection = document.createElement('div');
    syncSection.style.cssText = 'margin-top: 20px; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 15px;';
    syncSection.innerHTML = `
        <p style="text-align: center; margin-bottom: 10px; font-size: 14px; color: #555;">
            يمكنك تسجيل الدخول باستخدام حساب Google للمزامنة مع آخر نسخة احتياطية
        </p>
        <button id="loginSyncBtn" class="btn" style="background-color: #4285F4; margin-top: 5px; display: flex; align-items: center; justify-content: center; gap: 10px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" style="width: 18px; height: 18px;">
            <span>مزامنة مع Google Drive</span>
        </button>
    `;
    
    // إضافة الزر إلى نهاية محتوى تسجيل الدخول
    loginContent.appendChild(syncSection);
    
    // إضافة مستمع حدث للزر
    document.getElementById('loginSyncBtn').addEventListener('click', function() {
        // تغيير حالة الزر
        this.disabled = true;
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> جاري المزامنة...';
        
        // محاولة المصادقة مع Google Drive
        if (typeof window.authenticateWithGoogleDrive === 'function') {
            window.authenticateWithGoogleDrive();
            
            // مراقبة حالة التوكن وبدء المزامنة عند توفره
            const tokenCheckInterval = setInterval(() => {
                const token = localStorage.getItem('gDriveToken');
                if (token) {
                    clearInterval(tokenCheckInterval);
                    performSync();
                    
                    // إعادة زر المزامنة إلى حالته الأصلية
                    setTimeout(() => {
                        this.disabled = false;
                        this.innerHTML = originalText;
                    }, 2000);
                }
            }, 1000);
            
            // مهلة للتوقف عن المحاولة بعد 30 ثانية
            setTimeout(() => {
                clearInterval(tokenCheckInterval);
                this.disabled = false;
                this.innerHTML = originalText;
            }, 30000);
        } else {
            console.error('وظيفة authenticateWithGoogleDrive غير متاحة');
            this.disabled = false;
            this.innerHTML = originalText;
            
            // محاولة تحميل ملف cloud-backup.js ثم إعادة المحاولة
            const script = document.createElement('script');
            script.src = 'js/cloud-backup.js';
            script.onload = function() {
                if (typeof window.authenticateWithGoogleDrive === 'function') {
                    document.getElementById('loginSyncBtn').click();
                }
            };
            document.head.appendChild(script);
        }
    });
}

// وظائف واجهة المستخدم
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

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = document.getElementById('userRole').value;
    
    if (!username || !password) {
        alert("يرجى إدخال اسم المستخدم وكلمة المرور");
        return;
    }

    // تحقق بسيط من صحة بيانات الدخول (يمكنك تعديل هذا حسب متطلباتك)
    if (username === "admin" && password === "123456") {
        document.getElementById('userRoleDisplay').textContent = `الدور: ${role === 'owner' ? 'مالك' : role === 'manager' ? 'مدير مالي' : 'موظف إداري'}`;
        
        // إزالة نافذة تسجيل الدخول من DOM
        const loginModal = document.getElementById('loginModal');
        if (loginModal) { 
            loginModal.remove();
        }
        
        // تفعيل واجهة المستخدم بعد تسجيل الدخول
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.style.display = 'flex';
        }
        
        // تحديث الرسوم البيانية بعد إظهارها
        setTimeout(() => {
            updateCharts('day');
        }, 100);
        
        // تحقق من الحالة الحالية للمزامنة
        const syncIndicator = document.getElementById('syncIndicator');
        const isSyncing = syncIndicator && syncIndicator.style.visibility === 'visible';
        
        if (!isSyncing) {
            // عرض رسالة ترحيب
            showNotification("مرحباً بك", "تم تسجيل الدخول بنجاح", "success");
        }
    } else {
        alert("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
}

// وظيفة للتخطي السريع لشاشة تسجيل الدخول (للتطوير فقط)
function skipLogin() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.remove();
    }
    
    document.querySelector('.app-container').style.display = 'flex';
    
    setTimeout(() => {
        updateCharts('day');
    }, 100);
}

// إنشاء عنصر مؤشر المزامنة
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

// عرض إشعار نجاح المزامنة
function showSyncSuccess(title, message) {
    showNotification(title, message, 'success');
}

// عرض خطأ المزامنة
function showSyncError(title, message) {
    showNotification(title, message, 'error');
}

// عرض إشعار عام
function showNotification(title, message, type = 'info') {
    // يمكن استبدال هذا بمكتبة إشعارات إذا كنت تستخدم واحدة
    alert(`${title}\n${message}`);
}

// تهيئة الرسوم البيانية
function initCharts() {
    const reservationChartCtx = document.getElementById('reservationChart').getContext('2d');
    const reservationBarChartCtx = document.getElementById('reservationBarChart').getContext('2d');
    const revenueExpenseChartCtx = document.getElementById('revenueExpenseChart').getContext('2d');
    const invoiceRevenueChartCtx = document.getElementById('invoiceRevenueChart').getContext('2d');
    
    // إعداد الرسم البياني للحجوزات
    reservationChart = new Chart(reservationChartCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'عدد الحجوزات',
                data: [],
                borderColor: 'rgba(18, 132, 110, 1)',
                backgroundColor: 'rgba(18, 132, 110, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
    
    // إعداد الرسم البياني للحجوزات حسب العميل
    reservationBarChart = new Chart(reservationBarChartCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'عدد الحجوزات',
                data: [],
                backgroundColor: 'rgba(18, 132, 110, 0.6)',
                borderColor: 'rgba(18, 132, 110, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
    
    // إعداد الرسم البياني للإيرادات والمصروفات
    revenueExpenseChart = new Chart(revenueExpenseChartCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'الإيرادات',
                    data: [],
                    backgroundColor: 'rgba(46, 204, 113, 0.6)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                },
                {
                    label: 'المصروفات',
                    data: [],
                    backgroundColor: 'rgba(231, 76, 60, 0.6)',
                    borderColor: 'rgba(231, 76, 60, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            }
        }
    });
    
    // إعداد الرسم البياني لحالة الفواتير
    invoiceRevenueChart = new Chart(invoiceRevenueChartCtx, {
        type: 'pie',
        data: {
            labels: ['مدفوعة', 'معلقة'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['rgba(46, 204, 113, 0.6)', 'rgba(241, 196, 15, 0.6)'],
                borderColor: ['rgba(46, 204, 113, 1)', 'rgba(241, 196, 15, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// تحديث الرسوم البيانية
function updateCharts(grouping = 'day') {
    // تنظيف البيانات
    const cleanData = (period) => {
        const now = new Date();
        let data = [];
        
        if (period === 'day') {
            // بيانات يومية (آخر 7 أيام)
            for (let i = 6; i >= 0; i--) {
                const day = new Date(now);
                day.setDate(now.getDate() - i);
                data.push({
                    date: day,
                    label: day.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' }),
                    reservations: Math.floor(Math.random() * 5),
                    revenue: Math.floor(Math.random() * 1000) + 500,
                    expense: Math.floor(Math.random() * 400) + 100
                });
            }
        } else if (period === 'month') {
            // بيانات شهرية (آخر 6 أشهر)
            for (let i = 5; i >= 0; i--) {
                const month = new Date(now);
                month.setMonth(now.getMonth() - i);
                data.push({
                    date: month,
                    label: month.toLocaleDateString('ar-SA', { month: 'short', year: 'numeric' }),
                    reservations: Math.floor(Math.random() * 20) + 5,
                    revenue: Math.floor(Math.random() * 5000) + 2000,
                    expense: Math.floor(Math.random() * 2000) + 500
                });
            }
        } else {
            // بيانات سنوية (آخر 5 سنوات)
            for (let i = 4; i >= 0; i--) {
                const year = new Date(now);
                year.setFullYear(now.getFullYear() - i);
                data.push({
                    date: year,
                    label: year.getFullYear().toString(),
                    reservations: Math.floor(Math.random() * 100) + 20,
                    revenue: Math.floor(Math.random() * 20000) + 10000,
                    expense: Math.floor(Math.random() * 8000) + 2000
                });
            }
        }
        
        return data;
    };
    
    const data = cleanData(grouping);
    
    // تحديث رسم الحجوزات
    reservationChart.data.labels = data.map(item => item.label);
    reservationChart.data.datasets[0].data = data.map(item => item.reservations);
    reservationChart.update();
    
    // تحديث رسم الحجوزات حسب العميل
    const clientData = clients.map(client => {
        const count = reservations.filter(res => res.client === client.name).length;
        return { client: client.name, count };
    }).sort((a, b) => b.count - a.count);
    
    reservationBarChart.data.labels = clientData.map(item => item.client);
    reservationBarChart.data.datasets[0].data = clientData.map(item => item.count);
    reservationBarChart.update();
    
    // تحديث رسم الإيرادات والمصروفات
    revenueExpenseChart.data.labels = data.map(item => item.label);
    revenueExpenseChart.data.datasets[0].data = data.map(item => item.revenue);
    revenueExpenseChart.data.datasets[1].data = data.map(item => item.expense);
    revenueExpenseChart.update();
    
    // تحديث رسم حالة الفواتير
    const paidInvoices = invoices.filter(inv => inv.isPaid).length;
    const pendingInvoices = invoices.filter(inv => !inv.isPaid).length;
    
    invoiceRevenueChart.data.datasets[0].data = [paidInvoices, pendingInvoices];
    invoiceRevenueChart.update();
}

// تحديث الإحصائيات
function updateAllStatistics() {
    // حساب الإيرادات الإجمالية
    const totalRevenue = reservations.reduce((sum, res) => sum + res.workPrice, 0);
    document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString();
    
    // حساب مستحقات المعلقين
    const totalActorFee = reservations.reduce((sum, res) => {
        const actorFees = res.voiceActors.reduce((sum, actor) => sum + actor.fee, 0);
        return sum + (res.actorPaid ? 0 : actorFees);
    }, 0);
    document.getElementById('totalActorFee').textContent = totalActorFee.toLocaleString();
    
    // تحديث الرصيد المتاح
    const availableFunds = balance - monthlyExpense;
    document.getElementById('availableFunds').textContent = availableFunds.toLocaleString();
    
    // تحديث الرصيد الحالي
    document.getElementById('balanceSpan').textContent = balance.toLocaleString();
    
    // حساب صافي الربح
    const netProfit = totalRevenue - totalActorFee;
    document.getElementById('netProfit').textContent = netProfit.toLocaleString();
}

// تحديث الرصيد
function updateBalance() {
    const newBalanceInput = document.getElementById('newBalance');
    const newBalanceValue = parseFloat(newBalanceInput.value);
    
    if (isNaN(newBalanceValue) || newBalanceValue <= 0) {
        alert("يرجى إدخال قيمة صحيحة للرصيد");
        return;
    }
    
    // حفظ الحالة قبل التغيير
    saveState();
    
    // تحديث الرصيد
    balance = newBalanceValue;
    document.getElementById('balanceSpan').textContent = balance.toLocaleString();
    
    // تحديث الأموال المتاحة
    const availableFunds = balance - monthlyExpense;
    document.getElementById('availableFunds').textContent = availableFunds.toLocaleString();
    
    // عرض إشعار بالنجاح
    showNotification("تم التحديث", "تم تحديث الرصيد بنجاح", "success");
    
    // مسح حقل الإدخال
    newBalanceInput.value = "";
}

// ملء قوائم البيانات المنسدلة
function populateDatalists() {
    // قائمة العملاء
    const clientList = document.getElementById('clientList');
    if (clientList) {
        clientList.innerHTML = '';
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.name;
            clientList.appendChild(option);
        });
    }
    
    // قائمة الفواتير
    const invoiceList = document.getElementById('invoiceList');
    if (invoiceList) {
        invoiceList.innerHTML = '';
        invoices.forEach(invoice => {
            const option = document.createElement('option');
            option.value = invoice.invoiceNumber;
            invoiceList.appendChild(option);
        });
    }
}

// إنشاء مودال تعديل المعلق
function createEditVoiceModal() {
    if (document.getElementById('editVoiceModal')) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editVoiceModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>تعديل معلق</h3>
                <button class="close-btn" onclick="closeModal('editVoiceModal')">×</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="editVoiceIndex">
                <div class="form-group">
                    <label for="editVoiceName">اسم المعلق:</label>
                    <input type="text" id="editVoiceName" class="input" required>
                </div>
                <div class="form-group">
                    <label for="editVoiceRate">أجر الساعة:</label>
                    <input type="number" id="editVoiceRate" class="input" min="0" step="1" required>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal('editVoiceModal')">إلغاء</button>
                <button class="btn" onclick="saveVoiceChanges()">حفظ</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// إنشاء مودال تعديل العميل
function createEditClientModal() {
    if (document.getElementById('editClientModal')) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editClientModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>تعديل عميل</h3>
                <button class="close-btn" onclick="closeModal('editClientModal')">×</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="editClientIndex">
                <div class="form-group">
                    <label for="editClientName">اسم العميل:</label>
                    <input type="text" id="editClientName" class="input" required>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal('editClientModal')">إلغاء</button>
                <button class="btn" onclick="saveClientChanges()">حفظ</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// إنشاء مودال تعديل الحجز
function createEditReservationModal() {
    if (document.getElementById('editReservationModal')) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editReservationModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="reservationModalTitle">تعديل حجز</h3>
                <button class="close-btn" onclick="closeModal('editReservationModal')">×</button>
            </div>
            <div class="modal-body">
                <input type="hidden" id="editReservationIndex">
                <div class="form-group">
                    <label for="reservationId">رقم الحجز:</label>
                    <input type="text" id="reservationId" class="input" required>
                </div>
                <div class="form-group">
                    <label for="reservationClient">العميل:</label>
                    <input type="text" id="reservationClient" class="input" list="clientList" required>
                </div>
                <div class="form-group">
                    <label for="reservationTime">موعد التسجيل:</label>
                    <input type="datetime-local" id="reservationTime" class="input" required>
                </div>
                <div class="form-group">
                    <label for="reservationPrice">سعر العمل:</label>
                    <input type="number" id="reservationPrice" class="input" min="0" step="1" required>
                </div>
                <div class="form-group">
                    <label>المعلقون:</label>
                    <div id="voiceActorsContainer">
                        <!-- سيتم إضافة المعلقين هنا ديناميكياً -->
                    </div>
                    <button type="button" class="btn btn-outline btn-sm" onclick="addVoiceActorField()">
                        <i class='bx bx-plus'></i> إضافة معلق
                    </button>
                </div>
                <div class="form-group">
                    <label for="reservationInvoice">رقم الفاتورة:</label>
                    <input type="text" id="reservationInvoice" class="input" list="invoiceList">
                </div>
                <div class="form-group">
                    <label for="actorDueDate">موعد استحقاق المعلق:</label>
                    <input type="date" id="actorDueDate" class="input">
                </div>
                <div class="form-group">
                    <div class="toggle-switch">
                        <input type="checkbox" id="actorPaidStatus">
                        <label for="actorPaidStatus">تم دفع مستحقات المعلقين</label>
                    </div>
                </div>
                <div class="form-group">
                    <div class="toggle-switch">
                        <input type="checkbox" id="invoicePaidStatus">
                        <label for="invoicePaidStatus">تم دفع الفاتورة</label>
                    </div>
                </div>
                <div id="paidDateContainer" class="form-group" style="display: none;">
                    <label for="paidDate">تاريخ الدفع:</label>
                    <input type="date" id="paidDate" class="input">
                </div>
                <div class="form-group">
                    <label for="reservationNotes">ملاحظات:</label>
                    <textarea id="reservationNotes" class="input" rows="3"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal('editReservationModal')">إلغاء</button>
                <button class="btn" onclick="saveReservationChanges()">حفظ</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // إضافة مستمع أحداث لحالة دفع الفاتورة
    document.getElementById('invoicePaidStatus').addEventListener('change', function() {
        const paidDateContainer = document.getElementById('paidDateContainer');
        if (this.checked) {
            paidDateContainer.style.display = 'block';
        } else {
            paidDateContainer.style.display = 'none';
        }
    });
}

// إنشاء مودال إضافة فاتورة
function createAddInvoiceModal() {
    if (document.getElementById('addInvoiceModal')) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'addInvoiceModal';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>إضافة فاتورة</h3>
                <button class="close-btn" onclick="closeModal('addInvoiceModal')">×</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="invoiceNumber">رقم الفاتورة:</label>
                    <input type="text" id="invoiceNumber" class="input" required>
                </div>
                <div class="form-group">
                    <label for="invoiceDate">تاريخ الفاتورة:</label>
                    <input type="date" id="invoiceDate" class="input" required>
                </div>
                <div class="form-group">
                    <label for="invoiceCustomer">العميل:</label>
                    <input type="text" id="invoiceCustomer" class="input" list="clientList" required>
                </div>
                <div class="form-group">
                    <label for="invoiceEmail">البريد الإلكتروني:</label>
                    <input type="email" id="invoiceEmail" class="input">
                </div>
                <div class="form-group">
                    <label for="invoiceAdditionalInfo">معلومات إضافية:</label>
                    <textarea id="invoiceAdditionalInfo" class="input" rows="2"></textarea>
                </div>
                <div class="form-group">
                    <label for="invoiceSubtotal">المجموع الفرعي:</label>
                    <input type="number" id="invoiceSubtotal" class="input" min="0" step="1" required>
                </div>
                <div class="form-group">
                    <label for="invoiceTax1">ضريبة 1 (%):</label>
                    <input type="number" id="invoiceTax1" class="input" min="0" step="0.1" value="0">
                </div>
                <div class="form-group">
                    <label for="invoiceTax2">ضريبة 2 (%):</label>
                    <input type="number" id="invoiceTax2" class="input" min="0" step="0.1" value="0">
                </div>
                <div class="form-group">
                    <label for="invoiceAmount">إجمالي الفاتورة:</label>
                    <input type="number" id="invoiceAmount" class="input" min="0" step="1" readonly>
                </div>
                <div class="form-group">
                    <div class="toggle-switch">
                        <input type="checkbox" id="invoiceIsPaid">
                        <label for="invoiceIsPaid">تم دفع الفاتورة</label>
                    </div>
                </div>
                <div id="invoicePaymentContainer" class="form-group" style="display: none;">
                    <label for="invoiceReceivedAmount">المبلغ المستلم:</label>
                    <input type="number" id="invoiceReceivedAmount" class="input" min="0" step="1">
                    
                    <label for="invoicePaymentDate">تاريخ الدفع:</label>
                    <input type="date" id="invoicePaymentDate" class="input">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal('addInvoiceModal')">إلغاء</button>
                <button class="btn" onclick="saveNewInvoice()">حفظ</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // إضافة مستمعي أحداث
    document.getElementById('invoiceIsPaid').addEventListener('change', function() {
        const container = document.getElementById('invoicePaymentContainer');
        if (this.checked) {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    });
    
    // حساب إجمالي الفاتورة تلقائياً
    const subtotalInput = document.getElementById('invoiceSubtotal');
    const tax1Input = document.getElementById('invoiceTax1');
    const tax2Input = document.getElementById('invoiceTax2');
    const totalInput = document.getElementById('invoiceAmount');
    
    const calculateTotal = () => {
        const subtotal = parseFloat(subtotalInput.value) || 0;
        const tax1 = parseFloat(tax1Input.value) || 0;
        const tax2 = parseFloat(tax2Input.value) || 0;
        
        const tax1Amount = subtotal * (tax1 / 100);
        const tax2Amount = subtotal * (tax2 / 100);
        const total = subtotal + tax1Amount + tax2Amount;
        
        totalInput.value = total.toFixed(2);
    };
    
    subtotalInput.addEventListener('input', calculateTotal);
    tax1Input.addEventListener('input', calculateTotal);
    tax2Input.addEventListener('input', calculateTotal);
}

// إضافة حقل معلق جديد
function addVoiceActorField(name = '', fee = '') {
    const container = document.getElementById('voiceActorsContainer');
    const index = container.children.length;
    
    const actorRow = document.createElement('div');
    actorRow.className = 'voice-actor-row';
    actorRow.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
    
    actorRow.innerHTML = `
        <select class="input actor-name" style="flex: 2;">
            <option value="">اختر معلق</option>
            ${voices.map(voice => `<option value="${voice.name}" ${voice.name === name ? 'selected' : ''}>${voice.name}</option>`).join('')}
        </select>
        <input type="number" class="input actor-fee" value="${fee}" min="0" step="1" placeholder="الأجر" style="flex: 1;">
        <button type="button" class="btn-icon delete" onclick="removeVoiceActorField(this)" title="حذف المعلق">
            <i class='bx bx-trash'></i>
        </button>
    `;
    
    container.appendChild(actorRow);
}

// حذف حقل معلق
function removeVoiceActorField(button) {
    const row = button.closest('.voice-actor-row');
    if (row) {
        row.remove();
    }
}

// عرض مودال إضافة معلق
function showAddVoiceModal() {
    createEditVoiceModal();
    document.getElementById('editVoiceIndex').value = -1;
    document.getElementById('editVoiceName').value = '';
    document.getElementById('editVoiceRate').value = '';
    document.querySelector('#editVoiceModal .modal-header h3').textContent = 'إضافة معلق';
    document.getElementById('editVoiceModal').classList.add('active');
}

// عرض مودال تعديل معلق
function showEditVoiceModal(index) {
    createEditVoiceModal();
    const voice = voices[index];
    document.getElementById('editVoiceIndex').value = index;
    document.getElementById('editVoiceName').value = voice.name;
    document.getElementById('editVoiceRate').value = voice.rate;
    document.querySelector('#editVoiceModal .modal-header h3').textContent = 'تعديل معلق';
    document.getElementById('editVoiceModal').classList.add('active');
}

// حفظ تغييرات المعلق
function saveVoiceChanges() {
    const index = parseInt(document.getElementById('editVoiceIndex').value);
    const name = document.getElementById('editVoiceName').value.trim();
    const rate = parseInt(document.getElementById('editVoiceRate').value);
    
    if (!name || isNaN(rate) || rate < 0) {
        alert("يرجى ملء جميع الحقول بشكل صحيح");
        return;
    }
    
    // حفظ الحالة قبل التغيير
    saveState();
    
    if (index === -1) {
        // إضافة معلق جديد
        voices.push({ name, rate });
        showNotification("تمت الإضافة", "تم إضافة المعلق بنجاح", "success");
    } else {
        // تعديل معلق موجود
        voices[index] = { name, rate };
        showNotification("تم التحديث", "تم تحديث بيانات المعلق بنجاح", "success");
    }
    
    // تحديث الجدول
    renderVoicesTable();
    
    // إعادة ملء قوائم البيانات
    populateDatalists();
    
    // إغلاق المودال
    closeModal('editVoiceModal');
}

// حذف معلق
function deleteVoice(index) {
    if (confirm("هل أنت متأكد من حذف هذا المعلق؟")) {
        // حفظ الحالة قبل التغيير
        saveState();
        
        voices.splice(index, 1);
        renderVoicesTable();
        showNotification("تم الحذف", "تم حذف المعلق بنجاح", "success");
    }
}

// عرض مودال إضافة عميل
function showAddClientModal() {
    createEditClientModal();
    document.getElementById('editClientIndex').value = -1;
    document.getElementById('editClientName').value = '';
    document.querySelector('#editClientModal .modal-header h3').textContent = 'إضافة عميل';
    document.getElementById('editClientModal').classList.add('active');
}

// عرض مودال تعديل عميل
function showEditClientModal(index) {
    createEditClientModal();
    const client = clients[index];
    document.getElementById('editClientIndex').value = index;
    document.getElementById('editClientName').value = client.name;
    document.querySelector('#editClientModal .modal-header h3').textContent = 'تعديل عميل';
    document.getElementById('editClientModal').classList.add('active');
}

// حفظ تغييرات العميل
function saveClientChanges() {
    const index = parseInt(document.getElementById('editClientIndex').value);
    const name = document.getElementById('editClientName').value.trim();
    
    if (!name) {
        alert("يرجى إدخال اسم العميل");
        return;
    }
    
    // حفظ الحالة قبل التغيير
    saveState();
    
    if (index === -1) {
        // إضافة عميل جديد
        clients.push({ name, addedTime: Date.now() });
        showNotification("تمت الإضافة", "تم إضافة العميل بنجاح", "success");
    } else {
        // تعديل عميل موجود
        const oldClient = clients[index];
        clients[index] = { name, addedTime: oldClient.addedTime };
        showNotification("تم التحديث", "تم تحديث بيانات العميل بنجاح", "success");
    }
    
    // تحديث الجدول
    renderClientsTable();
    
    // إعادة ملء قوائم البيانات
    populateDatalists();
    
    // إغلاق المودال
    closeModal('editClientModal');
}

// حذف عميل
function deleteClient(index) {
    if (confirm("هل أنت متأكد من حذف هذا العميل؟")) {
        // حفظ الحالة قبل التغيير
        saveState();
        
        clients.splice(index, 1);
        renderClientsTable();
        showNotification("تم الحذف", "تم حذف العميل بنجاح", "success");
    }
}

// عرض مودال إضافة حجز
function showAddReservationModal() {
    createEditReservationModal();
    document.getElementById('editReservationIndex').value = -1;
    document.getElementById('reservationId').value = `#RES-${reservations.length + 1}`.padStart(6, '0');
    document.getElementById('reservationClient').value = '';
    document.getElementById('reservationTime').value = '';
    document.getElementById('reservationPrice').value = '';
    document.getElementById('reservationInvoice').value = '';
    document.getElementById('actorDueDate').value = '';
    document.getElementById('actorPaidStatus').checked = false;
    document.getElementById('invoicePaidStatus').checked = false;
    document.getElementById('paidDateContainer').style.display = 'none';
    document.getElementById('paidDate').value = '';
    document.getElementById('reservationNotes').value = '';
    
    // مسح حقول المعلقين
    const container = document.getElementById('voiceActorsContainer');
    container.innerHTML = '';
    addVoiceActorField();
    
    document.querySelector('#editReservationModal .modal-header h3').textContent = 'إضافة حجز';
    document.getElementById('editReservationModal').classList.add('active');
}

// عرض مودال تعديل حجز
function showEditReservationModal(index) {
    createEditReservationModal();
    const reservation = reservations[index];
    
    document.getElementById('editReservationIndex').value = index;
    document.getElementById('reservationId').value = reservation.id;
    document.getElementById('reservationClient').value = reservation.client;
    document.getElementById('reservationTime').value = reservation.recordTime;
    document.getElementById('reservationPrice').value = reservation.workPrice;
    document.getElementById('reservationInvoice').value = reservation.invoiceNumber;
    document.getElementById('actorDueDate').value = reservation.actorDueDate || '';
    document.getElementById('actorPaidStatus').checked = reservation.actorPaid;
    document.getElementById('invoicePaidStatus').checked = reservation.invoicePaid;
    document.getElementById('paidDate').value = reservation.paidDate || '';
    document.getElementById('reservationNotes').value = reservation.notes || '';
    
    // عرض/إخفاء حقل تاريخ الدفع
    document.getElementById('paidDateContainer').style.display = reservation.invoicePaid ? 'block' : 'none';
    
    // ملء حقول المعلقين
    const container = document.getElementById('voiceActorsContainer');
    container.innerHTML = '';
    
    if (reservation.voiceActors && reservation.voiceActors.length > 0) {
        reservation.voiceActors.forEach(actor => {
            addVoiceActorField(actor.name, actor.fee);
        });
    } else {
        addVoiceActorField();
    }
    
    document.querySelector('#editReservationModal .modal-header h3').textContent = 'تعديل حجز';
    document.getElementById('editReservationModal').classList.add('active');
}

// حفظ تغييرات الحجز
function saveReservationChanges() {
    const index = parseInt(document.getElementById('editReservationIndex').value);
    const id = document.getElementById('reservationId').value.trim();
    const client = document.getElementById('reservationClient').value.trim();
    const recordTime = document.getElementById('reservationTime').value;
    const workPrice = parseFloat(document.getElementById('reservationPrice').value);
    const invoiceNumber = document.getElementById('reservationInvoice').value.trim();
    const actorDueDate = document.getElementById('actorDueDate').value;
    const actorPaid = document.getElementById('actorPaidStatus').checked;
    const invoicePaid = document.getElementById('invoicePaidStatus').checked;
    const paidDate = document.getElementById('paidDate').value;
    const notes = document.getElementById('reservationNotes').value.trim();
    
    // جمع بيانات المعلقين
    const voiceActors = [];
    const actorRows = document.querySelectorAll('.voice-actor-row');
    
    for (const row of actorRows) {
        const name = row.querySelector('.actor-name').value;
        const fee = parseFloat(row.querySelector('.actor-fee').value);
        
        if (name && !isNaN(fee)) {
            voiceActors.push({ name, fee });
        }
    }
    
    if (!id || !client || !recordTime || isNaN(workPrice) || workPrice <= 0 || voiceActors.length === 0) {
        alert("يرجى ملء جميع الحقول الإلزامية بشكل صحيح");
        return;
    }
    
    // حفظ الحالة قبل التغيير
    saveState();
    
    const reservationData = {
        id,
        client,
        recordTime,
        workPrice,
        voiceActors,
        invoiceNumber,
        actorDueDate,
        actorPaid,
        notes,
        paidDate: invoicePaid ? paidDate : '',
        invoicePaid
    };
    
    if (index === -1) {
        // إضافة حجز جديد
        reservations.push(reservationData);
        showNotification("تمت الإضافة", "تم إضافة الحجز بنجاح", "success");
    } else {
        // تعديل حجز موجود
        reservations[index] = reservationData;
        showNotification("تم التحديث", "تم تحديث بيانات الحجز بنجاح", "success");
    }
    
    // تحديث الجدول
    renderReservationsTable();
    
    // تحديث الإحصائيات
    updateAllStatistics();
    
    // تحديث الرسوم البيانية
    updateCharts(document.querySelector('input[name="chartGrouping"]:checked').value);
    
    // إغلاق المودال
    closeModal('editReservationModal');
}

// حذف حجز
function deleteReservation(index) {
    if (confirm("هل أنت متأكد من حذف هذا الحجز؟")) {
        // حفظ الحالة قبل التغيير
        saveState();
        
        reservations.splice(index, 1);
        renderReservationsTable();
        updateAllStatistics();
        updateCharts(document.querySelector('input[name="chartGrouping"]:checked').value);
        showNotification("تم الحذف", "تم حذف الحجز بنجاح", "success");
    }
}

// عرض مودال إضافة فاتورة
function showAddInvoiceModal() {
    document.getElementById('addInvoiceModal').classList.add('active');
    
    // تعيين التاريخ الحالي
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    
    // مسح الحقول الأخرى
    document.getElementById('invoiceNumber').value = `INV${new Date().getFullYear()}-${(invoices.length + 1).toString().padStart(2, '0')}`;
    document.getElementById('invoiceCustomer').value = '';
    document.getElementById('invoiceEmail').value = '';
    document.getElementById('invoiceAdditionalInfo').value = '';
    document.getElementById('invoiceSubtotal').value = '';
    document.getElementById('invoiceTax1').value = '0';
    document.getElementById('invoiceTax2').value = '0';
    document.getElementById('invoiceAmount').value = '';
    document.getElementById('invoiceIsPaid').checked = false;
    document.getElementById('invoicePaymentContainer').style.display = 'none';
    document.getElementById('invoiceReceivedAmount').value = '';
    document.getElementById('invoicePaymentDate').value = today;
}

// حفظ فاتورة جديدة
function saveNewInvoice() {
    const invoiceNumber = document.getElementById('invoiceNumber').value.trim();
    const date = document.getElementById('invoiceDate').value;
    const customer = document.getElementById('invoiceCustomer').value.trim();
    const email = document.getElementById('invoiceEmail').value.trim();
    const additionalInfo = document.getElementById('invoiceAdditionalInfo').value.trim();
    const subtotal = parseFloat(document.getElementById('invoiceSubtotal').value);
    const tax1 = parseFloat(document.getElementById('invoiceTax1').value) || 0;
    const tax2 = parseFloat(document.getElementById('invoiceTax2').value) || 0;
    const invoiceAmount = parseFloat(document.getElementById('invoiceAmount').value);
    const isPaid = document.getElementById('invoiceIsPaid').checked;
    
    let receivedAmount = 0;
    let paymentDate = '';
    
    if (isPaid) {
        receivedAmount = parseFloat(document.getElementById('invoiceReceivedAmount').value) || invoiceAmount;
        paymentDate = document.getElementById('invoicePaymentDate').value;
    }
    
    if (!invoiceNumber || !date || !customer || isNaN(subtotal) || subtotal <= 0) {
        alert("يرجى ملء جميع الحقول الإلزامية بشكل صحيح");
        return;
    }
    
    // حفظ الحالة قبل التغيير
    saveState();
    
    // إضافة الفاتورة الجديدة
    const newInvoice = {
        invoiceNumber,
        date,
        customer,
        email,
        additionalInfo,
        subtotal,
        tax1,
        tax2,
        invoiceAmount,
        receivedAmount,
        paymentDate,
        isPaid
    };
    
    invoices.push(newInvoice);
    
    // إضافة سجل للعملية
    invoiceAuditLog.push({
        operation: "Create",
        invoiceNumber,
        date: new Date().toLocaleString()
    });
    
    // تحديث الجداول
    renderInvoicesTable();
    renderInvoiceAuditLogTable();
    
    // إعادة ملء قوائم البيانات
    populateDatalists();
    
    // تحديث الرسوم البيانية
    updateCharts(document.querySelector('input[name="chartGrouping"]:checked').value);
    
    // إغلاق المودال
    closeModal('addInvoiceModal');
    
    showNotification("تمت الإضافة", "تم إضافة الفاتورة بنجاح", "success");
}

// حذف فاتورة
function deleteInvoice(index) {
    if (confirm("هل أنت متأكد من حذف هذه الفاتورة؟")) {
        // حفظ الحالة قبل التغيير
        saveState();
        
        const invoice = invoices[index];
        
        // إضافة سجل للعملية
        invoiceAuditLog.push({
            operation: "Delete",
            invoiceNumber: invoice.invoiceNumber,
            date: new Date().toLocaleString()
        });
        
        // حذف الفاتورة
        invoices.splice(index, 1);
        
        // تحديث الجداول
        renderInvoicesTable();
        renderInvoiceAuditLogTable();
        
        // تحديث الرسوم البيانية
        updateCharts(document.querySelector('input[name="chartGrouping"]:checked').value);
        
        showNotification("تم الحذف", "تم حذف الفاتورة بنجاح", "success");
    }
}

// مسح سجل عمليات الفواتير
function clearInvoiceAuditLog() {
    if (confirm("هل أنت متأكد من مسح سجل العمليات بالكامل؟")) {
        // حفظ الحالة قبل التغيير
        saveState();
        
        invoiceAuditLog = [];
        renderInvoiceAuditLogTable();
        showNotification("تم المسح", "تم مسح سجل العمليات بنجاح", "success");
    }
}

// عرض جداول البيانات
function renderVoicesTable() {
    const table = document.getElementById('voicesTable');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (voices.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="3" class="text-center">لا توجد بيانات متاحة</td>';
        tbody.appendChild(row);
        return;
    }
    
    voices.forEach((voice, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${voice.name}</td>
            <td>${voice.rate} ريال</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="showEditVoiceModal(${index})" title="تعديل">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteVoice(${index})" title="حذف">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderClientsTable() {
    const table = document.getElementById('clientsTable');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (clients.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="3" class="text-center">لا توجد بيانات متاحة</td>';
        tbody.appendChild(row);
        return;
    }
    
    clients.forEach((client, index) => {
        const row = document.createElement('tr');
        const date = new Date(client.addedTime);
        row.innerHTML = `
            <td>${client.name}</td>
            <td>${date.toLocaleDateString()}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="showEditClientModal(${index})" title="تعديل">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteClient(${index})" title="حذف">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderReservationsTable() {
    const table = document.getElementById('reservationsTable');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (reservations.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="8" class="text-center">لا توجد بيانات متاحة</td>';
        tbody.appendChild(row);
        return;
    }
    
    reservations.forEach((reservation, index) => {
        const row = document.createElement('tr');
        
        // تنسيق وقت التسجيل بشكل أفضل
        const recordTime = new Date(reservation.recordTime);
        const formattedTime = `${recordTime.toLocaleDateString()} ${recordTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        
        // إعداد قائمة المعلقين
        const voiceActorsList = reservation.voiceActors.map(actor => `${actor.name} (${actor.fee} ريال)`).join('<br>');
        
        // حالة الدفع
        const paymentStatus = reservation.invoicePaid
            ? `<span class="status-badge success">مدفوعة</span>`
            : `<span class="status-badge warning">معلقة</span>`;
        
        row.innerHTML = `
            <td>${reservation.id}</td>
            <td>${reservation.client}</td>
            <td>${formattedTime}</td>
            <td>${reservation.workPrice} ريال</td>
            <td>${voiceActorsList}</td>
            <td>${reservation.invoiceNumber || '-'}</td>
            <td>${paymentStatus}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="showEditReservationModal(${index})" title="تعديل">
                        <i class='bx bx-edit'></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteReservation(${index})" title="حذف">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderInvoicesTable() {
    const table = document.getElementById('invoicesTable');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (invoices.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7" class="text-center">لا توجد بيانات متاحة</td>';
        tbody.appendChild(row);
        return;
    }
    
    invoices.forEach((invoice, index) => {
        const row = document.createElement('tr');
        
        // حالة الدفع
        const paymentStatus = invoice.isPaid
            ? `<span class="status-badge success">مدفوعة</span>`
            : `<span class="status-badge warning">معلقة</span>`;
        
        row.innerHTML = `
            <td>${invoice.invoiceNumber}</td>
            <td>${invoice.date}</td>
            <td>${invoice.customer}</td>
            <td>${invoice.invoiceAmount} ريال</td>
            <td>${invoice.receivedAmount} ريال</td>
            <td>${paymentStatus}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon edit" onclick="showInvoiceDetails(${index})" title="عرض التفاصيل">
                        <i class='bx bx-show'></i>
                    </button>
                    <button class="btn-icon delete" onclick="deleteInvoice(${index})" title="حذف">
                        <i class='bx bx-trash'></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function showInvoiceDetails(index) {
    const invoice = invoices[index];
    alert(`تفاصيل الفاتورة ${invoice.invoiceNumber}:\n` +
          `العميل: ${invoice.customer}\n` +
          `التاريخ: ${invoice.date}\n` +
          `المبلغ: ${invoice.invoiceAmount} ريال\n` +
          `حالة الدفع: ${invoice.isPaid ? 'مدفوعة' : 'معلقة'}`);
}

function renderInvoiceAuditLogTable() {
    const table = document.getElementById('invoiceAuditLogTable');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    if (invoiceAuditLog.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="3" class="text-center">لا توجد بيانات متاحة</td>';
        tbody.appendChild(row);
        return;
    }
    
    // عرض أحدث السجلات أولاً
    [...invoiceAuditLog].reverse().forEach((log) => {
        const row = document.createElement('tr');
        
        // ترجمة نوع العملية
        let operation;
        switch (log.operation) {
            case 'Import': operation = 'استيراد'; break;
            case 'Create': operation = 'إنشاء'; break;
            case 'Update': operation = 'تحديث'; break;
            case 'Delete': operation = 'حذف'; break;
            default: operation = log.operation;
        }
        
        row.innerHTML = `
            <td>${operation}</td>
            <td>${log.invoiceNumber}</td>
            <td>${log.date}</td>
        `;
        tbody.appendChild(row);
    });
}

// تنفيذ البحث في الجداول
function setupSearchListeners() {
    // البحث في جدول المعلقين
    const voiceSearchInput = document.getElementById('voiceSearchInput');
    if (voiceSearchInput) {
        voiceSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('#voicesTable tbody tr');
            
            rows.forEach(row => {
                const name = row.cells[0].textContent.toLowerCase();
                if (name.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    // البحث في جدول العملاء
    const clientSearchInput = document.getElementById('clientSearchInput');
    if (clientSearchInput) {
        clientSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('#clientsTable tbody tr');
            
            rows.forEach(row => {
                const name = row.cells[0].textContent.toLowerCase();
                if (name.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    // البحث في جدول الحجوزات
    const reservationSearchInput = document.getElementById('reservationSearchInput');
    if (reservationSearchInput) {
        reservationSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('#reservationsTable tbody tr');
            
            rows.forEach(row => {
                const id = row.cells[0].textContent.toLowerCase();
                const client = row.cells[1].textContent.toLowerCase();
                const invoice = row.cells[5].textContent.toLowerCase();
                
                if (id.includes(searchTerm) || client.includes(searchTerm) || invoice.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
    
    // البحث في جدول الفواتير
    const invoiceSearchInput = document.getElementById('invoiceSearchInput');
    if (invoiceSearchInput) {
        invoiceSearchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('#invoicesTable tbody tr');
            
            rows.forEach(row => {
                const id = row.cells[0].textContent.toLowerCase();
                const client = row.cells[2].textContent.toLowerCase();
                
                if (id.includes(searchTerm) || client.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }
}

// إعداد تبويبات التقارير
function setupReportTabs() {
    const reportTabs = document.querySelectorAll('.report-tab');
    const reportCards = document.querySelectorAll('#reports .card');
    
    reportTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const reportType = this.getAttribute('data-report');
            
            // تحديث التبويبات النشطة
            reportTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // عرض التقرير المناسب
            reportCards.forEach(card => {
                card.classList.add('hidden');
            });
            
            document.getElementById(`${reportType}Report`).classList.remove('hidden');
        });
    });
}

// إعداد زر عرض الميزات
function setupFeatureShowcase() {
    const heroBtn = document.querySelector('.hero-btn');
    const showcase = document.getElementById('featuresShowcase');
    const closeBtn = document.getElementById('closeShowcaseBtn');
    
    if (heroBtn && showcase && closeBtn) {
        heroBtn.addEventListener('click', function() {
            showcase.style.display = 'block';
            showcase.scrollIntoView({ behavior: 'smooth' });
        });
        
        closeBtn.addEventListener('click', function() {
            showcase.style.display = 'none';
        });
    }
}

// عرض بيانات التقارير
function renderReports() {
    // تقرير ملخص
    updateReportSummary();
    
    // تقرير مستحقات المعلقين
    renderActorsReport();
    
    // تقرير أرصدة العملاء
    renderClientsReport();
}

// تحديث ملخص التقرير
function updateReportSummary() {
    const totalRevenue = reservations.reduce((sum, res) => sum + res.workPrice, 0);
    const totalExpense = monthlyExpense;
    const totalActorFees = reservations.reduce((sum, res) => {
        const actorFees = res.voiceActors.reduce((sum, actor) => sum + actor.fee, 0);
        return sum + actorFees;
    }, 0);
    const netRevenue = totalRevenue - totalActorFees - totalExpense;
    
    document.getElementById('reportTotalRevenue').textContent = totalRevenue.toLocaleString();
    document.getElementById('reportTotalExpense').textContent = totalExpense.toLocaleString();
    document.getElementById('reportTotalActorFees').textContent = totalActorFees.toLocaleString();
    document.getElementById('reportNetRevenue').textContent = netRevenue.toLocaleString();
    
    // إنشاء رسم بياني للملخص المالي
    const summaryChartCanvas = document.getElementById('summaryChartCanvas');
    if (summaryChartCanvas) {
        if (window.summaryChart) {
            window.summaryChart.destroy();
        }
        
        window.summaryChart = new Chart(summaryChartCanvas, {
            type: 'bar',
            data: {
                labels: ['الإيرادات', 'المصروفات', 'مستحقات المعلقين', 'الصافي'],
                datasets: [{
                    label: 'القيمة (ريال)',
                    data: [totalRevenue, totalExpense, totalActorFees, netRevenue],
                    backgroundColor: [
                        'rgba(46, 204, 113, 0.6)',
                        'rgba(231, 76, 60, 0.6)',
                        'rgba(241, 196, 15, 0.6)',
                        'rgba(52, 152, 219, 0.6)'
                    ],
                    borderColor: [
                        'rgba(46, 204, 113, 1)',
                        'rgba(231, 76, 60, 1)',
                        'rgba(241, 196, 15, 1)',
                        'rgba(52, 152, 219, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }
}

// عرض تقرير المعلقين
function renderActorsReport() {
    const table = document.getElementById('actorsReportTable');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    // تجميع البيانات لكل معلق
    const actorStats = {};
    
    voices.forEach(voice => {
        actorStats[voice.name] = {
            name: voice.name,
            reservationCount: 0,
            totalFees: 0,
            paidAmount: 0,
            remainingAmount: 0
        };
    });
    
    reservations.forEach(reservation => {
        reservation.voiceActors.forEach(actor => {
            if (actorStats[actor.name]) {
                actorStats[actor.name].reservationCount++;
                actorStats[actor.name].totalFees += actor.fee;
                
                if (reservation.actorPaid) {
                    actorStats[actor.name].paidAmount += actor.fee;
                } else {
                    actorStats[actor.name].remainingAmount += actor.fee;
                }
            }
        });
    });
    
    // تحويل إلى مصفوفة وترتيب حسب المستحقات المتبقية
    const actorsData = Object.values(actorStats).sort((a, b) => b.remainingAmount - a.remainingAmount);
    
    if (actorsData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" class="text-center">لا توجد بيانات متاحة</td>';
        tbody.appendChild(row);
        return;
    }
    
    actorsData.forEach(actor => {
        const row = document.createElement('tr');
        
        // حالة الدفع
        let paymentStatus;
        if (actor.remainingAmount === 0) {
            paymentStatus = '<span class="status-badge success">مدفوع بالكامل</span>';
        } else if (actor.paidAmount > 0) {
            paymentStatus = '<span class="status-badge warning">مدفوع جزئياً</span>';
        } else {
            paymentStatus = '<span class="status-badge danger">غير مدفوع</span>';
        }
        
        row.innerHTML = `
            <td>${actor.name}</td>
            <td>${actor.reservationCount}</td>
            <td>${actor.totalFees} ريال</td>
            <td>${actor.paidAmount} ريال</td>
            <td>${actor.remainingAmount} ريال</td>
            <td>${paymentStatus}</td>
        `;
        tbody.appendChild(row);
    });
}

// عرض تقرير العملاء
function renderClientsReport() {
    const table = document.getElementById('clientsReportTable');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    // تجميع البيانات لكل عميل
    const clientStats = {};
    
    clients.forEach(client => {
        clientStats[client.name] = {
            name: client.name,
            reservationCount: 0,
            totalInvoiced: 0,
            paidAmount: 0,
            remainingAmount: 0
        };
    });
    
    reservations.forEach(reservation => {
        if (clientStats[reservation.client]) {
            clientStats[reservation.client].reservationCount++;
            clientStats[reservation.client].totalInvoiced += reservation.workPrice;
            
            if (reservation.invoicePaid) {
                clientStats[reservation.client].paidAmount += reservation.workPrice;
            } else {
                clientStats[reservation.client].remainingAmount += reservation.workPrice;
            }
        }
    });
    
    // تحويل إلى مصفوفة وترتيب حسب المبالغ المتبقية
    const clientsData = Object.values(clientStats).sort((a, b) => b.remainingAmount - a.remainingAmount);
    
    if (clientsData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" class="text-center">لا توجد بيانات متاحة</td>';
        tbody.appendChild(row);
        return;
    }
    
    clientsData.forEach(client => {
        const row = document.createElement('tr');
        
        // حالة الدفع
        let paymentStatus;
        if (client.remainingAmount === 0) {
            paymentStatus = '<span class="status-badge success">مدفوع بالكامل</span>';
        } else if (client.paidAmount > 0) {
            paymentStatus = '<span class="status-badge warning">مدفوع جزئياً</span>';
        } else {
            paymentStatus = '<span class="status-badge danger">غير مدفوع</span>';
        }
        
        row.innerHTML = `
            <td>${client.name}</td>
            <td>${client.reservationCount}</td>
            <td>${client.totalInvoiced} ريال</td>
            <td>${client.paidAmount} ريال</td>
            <td>${client.remainingAmount} ريال</td>
            <td>${paymentStatus}</td>
        `;
        tbody.appendChild(row);
    });
}

// طباعة التقرير
function printReport(reportType) {
    let title, content;
    
    switch (reportType) {
        case 'summary':
            title = 'الملخص المالي';
            content = document.getElementById('summaryReport').innerHTML;
            break;
        case 'actors':
            title = 'مستحقات المعلقين';
            content = document.getElementById('actorsReport').innerHTML;
            break;
        case 'clients':
            title = 'أرصدة العملاء';
            content = document.getElementById('clientsReport').innerHTML;
            break;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>تقرير ${title}</title>
            <style>
                body {
                    font-family: 'Tajawal', sans-serif;
                    padding: 20px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: right;
                }
                th {
                    background-color: #f2f2f2;
                }
                h2 {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .print-header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .print-date {
                    text-align: left;
                    margin-bottom: 20px;
                }
                .card-actions, .btn, .btn-icon {
                    display: none;
                }
                .table-container {
                    overflow: visible;
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <h1>تقرير ${title}</h1>
            </div>
            <div class="print-date">
                تاريخ الطباعة: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}
            </div>
            ${content}
            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// تصدير إلى Excel
function exportToExcel(type) {
    let data, filename;
    
    switch (type) {
        case 'reservations':
            data = reservations.map(res => ({
                'رقم الحجز': res.id,
                'العميل': res.client,
                'موعد التسجيل': res.recordTime,
                'سعر العمل': res.workPrice,
                'المعلقون': res.voiceActors.map(va => `${va.name} (${va.fee})`).join(', '),
                'رقم الفاتورة': res.invoiceNumber || '-',
                'حالة الدفع': res.invoicePaid ? 'مدفوعة' : 'معلقة'
            }));
            filename = 'الحجوزات.xlsx';
            break;
    }
    
    if (!data) return;
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, filename);
}

// استيراد من CSV
function importCSVModal(type) {
    alert('ميزة استيراد ملفات CSV قيد التطوير');
}

// استيراد الفواتير من Excel
function importInvoicesFromExcel() {
    alert('ميزة استيراد الفواتير من Excel قيد التطوير');
}

// فتح إعدادات السحابة
function openCloudSettings() {
    // إعداد نصوص واجهة المستخدم
    const driveAuthMessage = document.getElementById('driveAuthMessage');
    const settingsSection = document.getElementById('driveBackupSettings');
    const restoreOptions = document.getElementById('driveRestoreOptions');
    const restoreMessage = document.getElementById('driveRestoreMessage');
    
    // التحقق من حالة المصادقة
    const savedToken = localStorage.getItem('gDriveToken');
    const tokenExpiry = localStorage.getItem('gDriveTokenExpiry');
    
    if (savedToken && tokenExpiry && parseInt(tokenExpiry) > Date.now()) {
        if (driveAuthMessage) driveAuthMessage.textContent = 'تم تسجيل الدخول بنجاح';
        if (settingsSection) settingsSection.style.display = 'block';
        if (restoreOptions) restoreOptions.style.display = 'block';
        if (restoreMessage) restoreMessage.style.display = 'none';
    } else {
        if (driveAuthMessage) driveAuthMessage.textContent = 'لم يتم تسجيل الدخول بعد.';
        if (settingsSection) settingsSection.style.display = 'none';
        if (restoreOptions) restoreOptions.style.display = 'none';
        if (restoreMessage) restoreMessage.style.display = 'block';
    }
    
    // إعداد الخيارات الأخرى
    const autoBackupCheckbox = document.getElementById('enableAutoBackup');
    const autoBackupOptions = document.getElementById('autoBackupOptions');
    const autoSyncCheckbox = document.getElementById('enableAutoSync');
    
    if (autoBackupCheckbox && autoBackupOptions) {
        autoBackupCheckbox.checked = localStorage.getItem('autoBackupEnabled') === 'true';
        autoBackupOptions.style.display = autoBackupCheckbox.checked ? 'block' : 'none';
    }
    
    if (autoSyncCheckbox) {
        autoSyncCheckbox.checked = localStorage.getItem('autoSyncEnabled') !== 'false';
    }
    
    // عرض المودال
    document.getElementById('cloudSettingsModal').classList.add('active');
}

// حفظ إعدادات السحابة
function saveCloudSettings() {
    // حفظ اسم مجلد النسخ الاحتياطي
    const folderName = document.getElementById('backupFolderName').value.trim();
    localStorage.setItem('backupFolderName', folderName);
    
    // حفظ إعدادات النسخ الاحتياطي التلقائي
    const autoBackupEnabled = document.getElementById('enableAutoBackup').checked;
    localStorage.setItem('autoBackupEnabled', autoBackupEnabled);
    
    // حفظ تكرار النسخ الاحتياطي
    const backupFrequency = document.getElementById('backupFrequency').value;
    localStorage.setItem('backupFrequency', backupFrequency);
    
    // حفظ إعدادات المزامنة التلقائية
    const autoSyncEnabled = document.getElementById('enableAutoSync').checked;
    localStorage.setItem('autoSyncEnabled', autoSyncEnabled);
    
    // تحديث الجدولة
    if (autoBackupEnabled) {
        setupAutoBackup();
    } else {
        clearAutoBackup();
    }
    
    showNotification("تم الحفظ", "تم حفظ الإعدادات بنجاح", "success");
    closeModal('cloudSettingsModal');
}

// إعداد النسخ الاحتياطي التلقائي
function setupAutoBackup() {
    // إلغاء أي جدولة سابقة
    clearAutoBackup();
    
    const isEnabled = localStorage.getItem('autoBackupEnabled') === 'true';
    if (!isEnabled) return;
    
    const frequency = localStorage.getItem('backupFrequency') || 'weekly';
    let intervalMs;
    
    switch (frequency) {
        case 'daily':
            intervalMs = 24 * 60 * 60 * 1000; // يوم واحد
            break;
        case 'weekly':
            intervalMs = 7 * 24 * 60 * 60 * 1000; // أسبوع
            break;
        case 'monthly':
            intervalMs = 30 * 24 * 60 * 60 * 1000; // شهر تقريبي
            break;
        default:
            intervalMs = 7 * 24 * 60 * 60 * 1000; // أسبوع افتراضي
    }
    
    // حفظ معرف المؤقت لإمكانية إلغائه لاحقاً
    const timerId = setInterval(() => {
        if (typeof window.backupToDrive === 'function') {
            window.backupToDrive(false);
        }
    }, intervalMs);
    
    localStorage.setItem('autoBackupTimerId', timerId);
    
    // عمل نسخة احتياطية عند بدء التشغيل (بعد دقيقة واحدة)
    setTimeout(() => {
        if (typeof window.backupToDrive === 'function') {
            window.backupToDrive(false);
        }
    }, 60000);
}

// إلغاء النسخ الاحتياطي التلقائي
function clearAutoBackup() {
    const timerId = localStorage.getItem('autoBackupTimerId');
    if (timerId) {
        clearInterval(parseInt(timerId));
        localStorage.removeItem('autoBackupTimerId');
    }
}

// حفظ حالة التطبيق للتراجع
function saveState() {
    const state = {
        balance,
        voices: JSON.parse(JSON.stringify(voices)),
        clients: JSON.parse(JSON.stringify(clients)),
        reservations: JSON.parse(JSON.stringify(reservations)),
        invoices: JSON.parse(JSON.stringify(invoices)),
        invoiceAuditLog: JSON.parse(JSON.stringify(invoiceAuditLog))
    };
    
    stateHistory.push(state);
    
    // الاحتفاظ بآخر 10 حالات فقط
    if (stateHistory.length > 10) {
        stateHistory.shift();
    }
}

// التراجع عن آخر تغيير
function undoChange() {
    if (stateHistory.length === 0) {
        alert("لا يوجد تغييرات يمكن التراجع عنها");
        return;
    }
    
    const lastState = stateHistory.pop();
    
    balance = lastState.balance;
    voices = lastState.voices;
    clients = lastState.clients;
    reservations = lastState.reservations;
    invoices = lastState.invoices;
    invoiceAuditLog = lastState.invoiceAuditLog;
    
    // تحديث واجهة المستخدم
    updateAllStatistics();
    renderVoicesTable();
    renderClientsTable();
    renderReservationsTable();
    renderInvoicesTable();
    renderInvoiceAuditLogTable();
    renderReports();
    updateCharts(document.querySelector('input[name="chartGrouping"]:checked').value);
    
    showNotification("تم التراجع", "تم التراجع عن آخر تغيير بنجاح", "success");
}

// التصدير التلقائي
window.backupToDrive = function(isManualSave = false) {
    const data = {
        balance,
        voices,
        clients,
        reservations,
        invoices,
        invoiceAuditLog
    };
    
    if (isManualSave) {
        showSyncIndicator("جاري حفظ البيانات...");
    }
    
    if (typeof authenticateWithGoogleDrive === 'function') {
        // الحفظ باستخدام وظيفة cloud-backup.js
        const savedToken = localStorage.getItem('gDriveToken');
        const tokenExpiry = localStorage.getItem('gDriveTokenExpiry');
        
        if (savedToken && tokenExpiry && parseInt(tokenExpiry) > Date.now()) {
            // التوكن صالح، يمكن المتابعة مع الحفظ
            const folderName = localStorage.getItem('backupFolderName') || 'Dashboard_Backups';
            
            // إرسال البيانات إلى Google Drive
            // (هذه الوظيفة ستكون في ملف cloud-backup.js)
            if (typeof saveDataToDrive === 'function') {
                saveDataToDrive(JSON.stringify(data), folderName)
                    .then(result => {
                        if (isManualSave) {
                            hideSyncIndicator();
                            showSyncSuccess("تم الحفظ", "تم حفظ البيانات بنجاح على Google Drive");
                        }
                    })
                    .catch(error => {
                        if (isManualSave) {
                            hideSyncIndicator();
                            showSyncError("خطأ في الحفظ", "تعذر حفظ البيانات: " + error.message);
                        }
                    });
            } else {
                if (isManualSave) {
                    hideSyncIndicator();
                    showSyncError("خطأ في الحفظ", "وظيفة الحفظ غير متاحة");
                }
            }
        } else {
            // التوكن غير صالح، يجب إعادة المصادقة
            if (isManualSave) {
                hideSyncIndicator();
                openCloudSettings();
            }
        }
    } else {
        // محاولة تحميل ملف cloud-backup.js
        if (isManualSave) {
            const script = document.createElement('script');
            script.src = 'js/cloud-backup.js';
            script.onload = function() {
                backupToDrive(isManualSave);
            };
            document.head.appendChild(script);
        }
    }
};

// استعادة من Google Drive
function restoreFromDrive() {
    showSyncIndicator("جاري استعادة البيانات...");
    
    if (typeof autoRestoreLatestBackup === 'function') {
        autoRestoreLatestBackup(true)
            .then(result => {
                if (result.success) {
                    try {
                        // محاولة تحليل البيانات المستردة
                        const data = JSON.parse(result.data);
                        
                        // حفظ الحالة الحالية قبل الاستعادة
                        saveState();
                        
                        // استعادة البيانات
                        balance = data.balance;
                        voices = data.voices;
                        clients = data.clients;
                        reservations = data.reservations;
                        invoices = data.invoices;
                        invoiceAuditLog = data.invoiceAuditLog;
                        
                        // تحديث واجهة المستخدم
                        updateAllStatistics();
                        renderVoicesTable();
                        renderClientsTable();
                        renderReservationsTable();
                        renderInvoicesTable();
                        renderInvoiceAuditLogTable();
                        renderReports();
                        updateCharts(document.querySelector('input[name="chartGrouping"]:checked').value);
                        
                        hideSyncIndicator();
                        showSyncSuccess("تمت الاستعادة", `تم استعادة البيانات بنجاح (${new Date(result.creationTime).toLocaleString()})`);
                    } catch (error) {
                        hideSyncIndicator();
                        showSyncError("خطأ في الاستعادة", "تعذر تحليل البيانات المستردة");
                    }
                } else {
                    hideSyncIndicator();
                    showSyncError("خطأ في الاستعادة", result.message || "تعذر استعادة البيانات");
                }
            })
            .catch(error => {
                hideSyncIndicator();
                showSyncError("خطأ في الاستعادة", "تعذر الاتصال بخدمة Google Drive");
            });
    } else {
        // محاولة تحميل ملف cloud-backup.js
        const script = document.createElement('script');
        script.src = 'js/cloud-backup.js';
        script.onload = function() {
            restoreFromDrive();
        };
        document.head.appendChild(script);
    }
}
