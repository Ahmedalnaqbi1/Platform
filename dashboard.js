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
    
    // تحديث الجداول
    try {
        renderInvoicesTable();
        renderInvoiceAuditLogTable();
        renderReservationsTable();
        renderReports();
    } catch (e) {
        console.error("خطأ في تهيئة الجداول:", e);
    }
    
    // حفظ الحالة الأولية
    saveState();
    
    // للاختبار السريع يمكنك إلغاء تعليق هذا السطر
    skipLogin();
    
    // إعداد الحفظ التلقائي (إذا كان متوفراً)
    if (typeof setupAutoSave === 'function') {
        setupAutoSave();
    }
    
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
        script.src = 'cloud-backup.js';
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
            script.src = 'cloud-backup.js';
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
        
        // إذا لم تكن المزامنة جارية بالفعل، قم بتنفيذها
        if (!isSyncing) {
            // إظهار مؤشر المزامنة
            showSyncIndicator("جارِ التحقق من وجود نسخ احتياطية...");
            
            // بدء المزامنة بعد تسجيل الدخول
            performSync();
        }
    } else {
        alert("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
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
        updateCharts('day');
    }, 100);
    
    // تحقق من الحالة الحالية للمزامنة
    const syncIndicator = document.getElementById('syncIndicator');
    const isSyncing = syncIndicator && syncIndicator.style.visibility === 'visible';
    
    // إذا لم تكن المزامنة جارية بالفعل، قم بتنفيذها
    if (!isSyncing) {
        // إظهار مؤشر المزامنة
        showSyncIndicator("جارِ التحقق من وجود نسخ احتياطية...");
        
        // بدء المزامنة بعد تسجيل الدخول
        performSync();
    }
}

// إضافة مودال لتعديل المعلق
function createEditVoiceModal() {
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
            <div style="display:flex; gap:8px; margin-bottom:8px;">
                <input type="text" id="editTempActorName" class="input" style="flex:1; margin: 0;">
                <input type="number" id="editTempActorFee" class="input" style="max-width:100px; margin: 0;">
                <button class="btn btn-sm" style="margin: 0;" onclick="addTempActorToEdit()">أضف</button>
            </div>
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

// وظائف تعديل المعلق
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
    const voicesTable = document.getElementById("voicesTable");
    const row = voicesTable.rows[index + 1]; // +1 للعنوان
    row.cells[0].textContent = name;
    row.cells[1].textContent = `${rate} ريال`;
    
    closeModal('editVoiceModal');
}

// وظائف تعديل العميل
function editClient(index) {
    const client = clients[index];
    if (!client) return;
    
    document.getElementById('editClientIndex').value = index;
    document.getElementById('editClientName').value = client.name;
    
    document.getElementById('editClientModal').classList.add('active');
}

function saveClientEdit() {
    const index = parseInt(document.getElementById('editClientIndex').value);
    const name = document.getElementById('editClientName').value.trim();
    
    if (!name) {
        alert("يرجى إدخال اسم العميل");
        return;
    }
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    clients[index].name = name;
    
    // تحديث الجدول
    const clientsTable = document.getElementById("clientsTable");
    const row = clientsTable.rows[index + 1]; // +1 للعنوان
    row.cells[0].textContent = name;
    
    // تحديث القوائم المنسدلة
    populateDatalists();
    
    closeModal('editClientModal');
}

// وظائف تعديل الحجز
function editReservation(index) {
    // التحقق من وجود المودال وإنشاؤه إذا لم يكن موجودا
    if (!document.getElementById('editReservationModal')) {
        createEditReservationModal();
    }
    
    const reservation = reservations[index];
    if (!reservation) return;
    
    document.getElementById('editReservationIndex').value = index;
    document.getElementById('editResClient').value = reservation.client;
    document.getElementById('editResTime').value = reservation.recordTime;
    document.getElementById('editResWorkPrice').value = reservation.workPrice;
    document.getElementById('editResInvoiceNumber').value = reservation.invoiceNumber;
    document.getElementById('editResDueDate').value = reservation.actorDueDate;
    document.getElementById('editResPaid').checked = reservation.actorPaid;
    document.getElementById('editResNotes').value = reservation.notes;
    
    // عرض المعلقين
    const actorsList = document.getElementById('editActorsList');
    actorsList.innerHTML = '';
    reservation.voiceActors.forEach((actor, actorIndex) => {
        const actorElement = document.createElement('div');
        actorElement.style = "margin:5px 0;background:#fff;padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;display:flex;justify-content:space-between;align-items:center;";
        actorElement.innerHTML = `
            <div><strong>${actor.name}</strong> - ${actor.fee} ريال</div>
            <button class="btn btn-sm btn-danger" style="margin: 0;" onclick="removeActorFromEdit(${actorIndex})">
                <i class='bx bx-x'></i>
            </button>
        `;
        actorsList.appendChild(actorElement);
    });
    
    document.getElementById('editReservationModal').classList.add('active');
}

function addTempActorToEdit() {
    const name = document.getElementById('editTempActorName').value.trim();
    const fee = parseFloat(document.getElementById('editTempActorFee').value) || 0;
    
    if (!name) {
        alert("يرجى إدخال اسم المعلق");
        return;
    }
    
    const index = parseInt(document.getElementById('editReservationIndex').value);
    const reservation = reservations[index];
    
    if (!reservation.voiceActors) {
        reservation.voiceActors = [];
    }
    
    reservation.voiceActors.push({ name, fee });
    
    // تحديث القائمة
    const actorsList = document.getElementById('editActorsList');
    const actorIndex = reservation.voiceActors.length - 1;
    
    const actorElement = document.createElement('div');
    actorElement.style = "margin:5px 0;background:#fff;padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;display:flex;justify-content:space-between;align-items:center;";
    actorElement.innerHTML = `
        <div><strong>${name}</strong> - ${fee} ريال</div>
        <button class="btn btn-sm btn-danger" style="margin: 0;" onclick="removeActorFromEdit(${actorIndex})">
            <i class='bx bx-x'></i>
        </button>
    `;
    actorsList.appendChild(actorElement);
    
    document.getElementById('editTempActorName').value = '';
    document.getElementById('editTempActorFee').value = '';
}

function removeActorFromEdit(actorIndex) {
    const resIndex = parseInt(document.getElementById('editReservationIndex').value);
    const reservation = reservations[resIndex];
    
    reservation.voiceActors.splice(actorIndex, 1);
    
    // إعادة عرض القائمة
    const actorsList = document.getElementById('editActorsList');
    actorsList.innerHTML = '';
    reservation.voiceActors.forEach((actor, idx) => {
        const actorElement = document.createElement('div');
        actorElement.style = "margin:5px 0;background:#fff;padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;display:flex;justify-content:space-between;align-items:center;";
        actorElement.innerHTML = `
            <div><strong>${actor.name}</strong> - ${actor.fee} ريال</div>
            <button class="btn btn-sm btn-danger" style="margin: 0;" onclick="removeActorFromEdit(${idx})">
                <i class='bx bx-x'></i>
            </button>
        `;
        actorsList.appendChild(actorElement);
    });
}

function saveReservationEdit() {
    const index = parseInt(document.getElementById('editReservationIndex').value);
    const client = document.getElementById('editResClient').value.trim();
    const recordTime = document.getElementById('editResTime').value;
    const workPrice = parseFloat(document.getElementById('editResWorkPrice').value) || 0;
    const invoiceNumber = document.getElementById('editResInvoiceNumber').value;
    const actorDueDate = document.getElementById('editResDueDate').value;
    const actorPaid = document.getElementById('editResPaid').checked;
    const notes = document.getElementById('editResNotes').value;
    
    if (!client || !recordTime || !workPrice) {
        alert("يرجى تعبئة الحقول المطلوبة");
        return;
    }
    
    // حفظ حالة النظام قبل التغيير
    saveState();
    
    reservations[index].client = client;
    reservations[index].recordTime = recordTime;
    reservations[index].workPrice = workPrice;
    reservations[index].invoiceNumber = invoiceNumber;
    reservations[index].actorDueDate = actorDueDate;
    reservations[index].actorPaid = actorPaid;
    reservations[index].notes = notes;
    
    // تحديث الإحصائيات
    updateAllStatistics();
    
    closeModal('editReservationModal');
    
    // تحديث جدول الحجوزات
    renderReservationsTable();
    
    // تحديث التقارير بعد تعديل الحجز - إضافة هذا السطر لضمان تحديث التقارير
    renderReports();
}

// إضافة وظيفة لعرض جدول الحجوزات
function renderReservationsTable() {
    const reservationsTable = document.querySelector('#reservations table tbody');
    if (!reservationsTable) return;
    
    reservationsTable.innerHTML = '';
    
    reservations.forEach((res, index) => {
        const row = document.createElement('tr');
        
        const totalActorFees = res.voiceActors.reduce((sum, actor) => sum + actor.fee, 0);
        const studioRevenue = res.workPrice - totalActorFees;
        
        // التحقق من وجود ربط بالفاتورة
        const linkedInvoice = invoices.find(inv => inv.invoiceNumber === res.invoiceNumber);
        const hasValidInvoice = linkedInvoice !== undefined;
        
        // إضافة صف ملون إذا لم يكن الحجز مرتبطًا بفاتورة صالحة
        if (res.invoiceNumber && !hasValidInvoice) {
            row.classList.add('unlinked');
        }
        
        row.innerHTML = `
            <td>${res.id}</td>
            <td>${res.client}</td>
            <td>${res.recordTime.replace('T', ' ')}</td>
            <td>${res.workPrice} ريال</td>
            <td>${totalActorFees} ريال</td>
            <td>${studioRevenue} ريال</td>
            <td>${res.invoiceNumber ? 
                `<span style="color:${hasValidInvoice ? 'inherit' : 'var(--danger-color)'}">${res.invoiceNumber}</span>` : 
                '<button class="btn btn-sm btn-outline" onclick="showLinkInvoiceOptions(${index})"><i class="bx bx-link"></i> ربط</button>'}</td>
            <td>${res.invoicePaid ? 'نعم' : 'لا'}</td>
            <td>
                <button class="btn btn-sm" onclick="editReservation(${index})">
                    <i class='bx bx-edit'></i> تعديل
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteReservation(${index})">
                    <i class='bx bx-trash'></i> حذف
                </button>
            </td>
        `;
        
        reservationsTable.appendChild(row);
    });
}

// إضافة وظيفة لحذف الحجز
function deleteReservation(index) {
    if (!confirm('هل أنت متأكد من حذف هذا الحجز؟')) return;
    
    saveState();
    reservations.splice(index, 1);
    renderReservationsTable();
    updateAllStatistics();
    
    // تحديث التقارير بعد حذف الحجز - إضافة هذا السطر لضمان تحديث التقارير
    renderReports();
}

// إضافة وظيفة إضافة معلق مؤقت لحجز جديد
function addTempActorToNew() {
    const name = document.getElementById('tempActorName').value.trim();
    const fee = parseFloat(document.getElementById('tempActorFee').value) || 0;
    
    if (!name) {
        alert("يرجى إدخال اسم المعلق");
        return;
    }
    
    const actorsList = document.querySelector('#newReservationModal .modal-content div[style*="background:var(--primary-light)"]');
    const actorCount = actorsList.children.length;
    
    const actorElement = document.createElement('div');
    actorElement.style = "margin:5px 0;background:#fff;padding:8px 12px;border:1px solid var(--border-color);border-radius:6px;display:flex;justify-content:space-between;align-items:center;";
    actorElement.innerHTML = `
        <div><strong>${name}</strong> - ${fee} ريال</div>
        <button class="btn btn-sm btn-danger" style="margin: 0;" onclick="removeNewActor(${actorCount})">
            <i class='bx bx-x'></i>
        </button>
    `;
    actorsList.appendChild(actorElement);
    
    document.getElementById('tempActorName').value = '';
    document.getElementById('tempActorFee').value = '';
}

function removeNewActor(index) {
    const actorsList = document.querySelector('#newReservationModal .modal-content div[style*="background:var(--primary-light)"]');
    if (actorsList.children[index]) {
        actorsList.removeChild(actorsList.children[index]);
    }
}

// تهيئة الرسوم البيانية
function initCharts() {
    // إعداد الرسم البياني الخطي للحجوزات
    const reservationCtx = document.getElementById('reservationChart').getContext('2d');
    
    // معالجة بيانات الحجوزات حسب التاريخ
    const reservationsByDate = processReservationsByDate(reservations);
    const reservationLabels = Object.keys(reservationsByDate).sort();
    const reservationData = reservationLabels.map(date => reservationsByDate[date]);

    reservationChart = new Chart(reservationCtx, {
        type: 'line',
        data: {
            labels: reservationLabels,
            datasets: [{
                label: 'عدد الحجوزات',
                data: reservationData,
                borderColor: '#12846e',
                backgroundColor: 'rgba(18, 132, 110, 0.1)',
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointBackgroundColor: '#12846e',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: { 
                    mode: "index", 
                    intersect: false,
                    callbacks: {
                        title: function(tooltipItems) {
                            return 'التاريخ: ' + tooltipItems[0].label;
                        },
                        label: function(context) {
                            return 'عدد الحجوزات: ' + context.raw;
                        }
                    }
                }
            },
            scales: { 
                y: { 
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'عدد الحجوزات'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'التاريخ'
                    }
                }
            }
        }
    });
    
    // إعداد الرسم البياني العمودي للحجوزات
    const reservationBarCtx = document.getElementById('reservationBarChart').getContext('2d');
    
    // معالجة بيانات الحجوزات حسب العميل
    const reservationsByClient = processReservationsByClient(reservations);
    const clientLabels = Object.keys(reservationsByClient).slice(0, 6); // تحديد أول 6 عملاء
    const clientData = clientLabels.map(client => reservationsByClient[client]);
    
    reservationBarChart = new Chart(reservationBarCtx, {
        type: 'bar',
        data: {
            labels: clientLabels,
            datasets: [{
                label: 'عدد الحجوزات',
                data: clientData,
                backgroundColor: [
                    '#12846e',
                    '#2ecc71',
                    '#3498db',
                    '#9b59b6',
                    '#f1c40f',
                    '#e67e22'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            return 'العميل: ' + tooltipItems[0].label;
                        },
                        label: function(context) {
                            return 'عدد الحجوزات: ' + context.raw;
                        }
                    }
                }
            },
            scales: { 
                y: { 
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'عدد الحجوزات'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'العميل'
                    }
                }
            }
        }
    });
    
    // إعداد مخطط الإيرادات والمصروفات
    const revenueExpenseCtx = document.getElementById('revenueExpenseChart').getContext('2d');
    
    // معالجة البيانات المالية حسب الشهر
    const financialData = processFinancialData(reservations, invoices);
    const financialLabels = Object.keys(financialData).sort();
    const revenueData = financialLabels.map(month => financialData[month].revenue);
    const expenseData = financialLabels.map(month => financialData[month].expense);
    
    revenueExpenseChart = new Chart(revenueExpenseCtx, {
        type: 'line',
        data: {
            labels: financialLabels,
            datasets: [
                {
                    label: 'الإيرادات',
                    data: revenueData,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.05)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'المصروفات',
                    data: expenseData,
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.05)',
                    fill: true,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: { 
                    mode: "index", 
                    intersect: false,
                    callbacks: {
                        title: function(tooltipItems) {
                            return 'الشهر: ' + tooltipItems[0].label;
                        },
                        label: function(context) {
                            return context.dataset.label + ': ' + context.raw + ' ريال';
                        }
                    }
                }
            },
            scales: { 
                y: { 
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'المبلغ (ريال)'
                    }
                }
            }
        }
    });
    
    // إعداد مخطط إيرادات الفواتير
    const invoiceRevenueCtx = document.getElementById('invoiceRevenueChart').getContext('2d');
    
    // معالجة بيانات الفواتير حسب الشهر
    const invoiceRevenue = processInvoiceRevenue(invoices);
    const invoiceLabels = Object.keys(invoiceRevenue).sort();
    const invoiceData = invoiceLabels.map(month => invoiceRevenue[month]);

    invoiceRevenueChart = new Chart(invoiceRevenueCtx, {
        type: 'line',
        data: {
            labels: invoiceLabels,
            datasets: [{
                label: 'إيرادات الفواتير',
                data: invoiceData,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.3,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: { 
                    mode: "index", 
                    intersect: false,
                    callbacks: {
                        title: function(tooltipItems) {
                            return 'الشهر: ' + tooltipItems[0].label;
                        },
                        label: function(context) {
                            return 'الإيرادات: ' + context.raw + ' ريال';
                        }
                    }
                }
            },
            scales: { 
                y: { 
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'الإيرادات (ريال)'
                    }
                }
            }
        }
    });
}

// Helper functions for chart data processing

// Process reservations by date
function processReservationsByDate(reservationData) {
    const reservationsByDate = {};
    
    reservationData.forEach(reservation => {
        // Extract date part only from recordTime
        const date = reservation.recordTime.split('T')[0];
        
        if (!reservationsByDate[date]) {
            reservationsByDate[date] = 0;
        }
        
        reservationsByDate[date]++;
    });
    
    return reservationsByDate;
}

// Process reservations by client
function processReservationsByClient(reservationData) {
    const reservationsByClient = {};
    
    reservationData.forEach(reservation => {
        const client = reservation.client;
        
        if (!reservationsByClient[client]) {
            reservationsByClient[client] = 0;
        }
        
        reservationsByClient[client]++;
    });
    
    // Sort by count descending and return
    return Object.fromEntries(
        Object.entries(reservationsByClient)
            .sort(([,a], [,b]) => b - a)
    );
}

// Process financial data by month
function processFinancialData(reservationData, invoiceData) {
    const financialByMonth = {};
    
    // Process revenue from reservations
    reservationData.forEach(reservation => {
        const date = new Date(reservation.recordTime);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        
        if (!financialByMonth[monthYear]) {
            financialByMonth[monthYear] = { revenue: 0, expense: 0 };
        }
        
        financialByMonth[monthYear].revenue += reservation.workPrice;
        
        // Add actor fees as expenses
        const actorFees = reservation.voiceActors.reduce((sum, actor) => sum + actor.fee, 0);
        financialByMonth[monthYear].expense += actorFees;
    });
    
    // Add monthly expenses to each month
    Object.keys(financialByMonth).forEach(month => {
        financialByMonth[month].expense += monthlyExpense;
    });
    
    return financialByMonth;
}

// Process invoice revenue by month
function processInvoiceRevenue(invoiceData) {
    const revenueByMonth = {};
    
    invoiceData.forEach(invoice => {
        if (!invoice.date) return;
        
        const date = new Date(invoice.date);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        
        if (!revenueByMonth[monthYear]) {
            revenueByMonth[monthYear] = 0;
        }
        
        revenueByMonth[monthYear] += invoice.isPaid ? invoice.receivedAmount : 0;
    });
    
    return revenueByMonth;
}

// Function to update charts when data changes
function updateCharts(groupBy = 'day') {
    // Update reservation charts
    if (reservationChart && reservationBarChart) {
        let labels, data;
        
        if (groupBy === 'day') {
            const reservationsByDate = processReservationsByDate(reservations);
            labels = Object.keys(reservationsByDate).sort();
            data = labels.map(date => reservationsByDate[date]);
            
            // Update line chart
            reservationChart.data.labels = labels;
            reservationChart.data.datasets[0].data = data;
            reservationChart.update();
            
            // Keep bar chart with client data
        } else if (groupBy === 'month') {
            // Group by month
            const reservationsByMonth = {};
            
            reservations.forEach(reservation => {
                const date = new Date(reservation.recordTime);
                const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
                
                if (!reservationsByMonth[monthYear]) {
                    reservationsByMonth[monthYear] = 0;
                }
                
                reservationsByMonth[monthYear]++;
            });
            
            labels = Object.keys(reservationsByMonth).sort();
            data = labels.map(month => reservationsByMonth[month]);
            
            // Update line chart
            reservationChart.data.labels = labels;
            reservationChart.data.datasets[0].data = data;
            reservationChart.update();
            
            // Update financial charts too
            updateFinancialCharts('month');
        } else if (groupBy === 'year') {
            // Group by year
            const reservationsByYear = {};
            
            reservations.forEach(reservation => {
                const date = new Date(reservation.recordTime);
                const year = date.getFullYear();
                
                if (!reservationsByYear[year]) {
                    reservationsByYear[year] = 0;
                }
                
                reservationsByYear[year]++;
            });
            
            labels = Object.keys(reservationsByYear).sort();
            data = labels.map(year => reservationsByYear[year]);
            
            // Update line chart
            reservationChart.data.labels = labels;
            reservationChart.data.datasets[0].data = data;
            reservationChart.update();
            
            // Update financial charts too
            updateFinancialCharts('year');
        }
    }
}

// Update financial charts based on grouping
function updateFinancialCharts(groupBy) {
    if (revenueExpenseChart && invoiceRevenueChart) {
        let financialData, invoiceData;
        
        if (groupBy === 'month') {
            financialData = processFinancialData(reservations, invoices);
            invoiceData = processInvoiceRevenue(invoices);
        } else if (groupBy === 'year') {
            // Group financial data by year
            financialData = {};
            invoiceData = {};
            
            reservations.forEach(reservation => {
                const date = new Date(reservation.recordTime);
                const year = date.getFullYear().toString();
                
                if (!financialData[year]) {
                    financialData[year] = { revenue: 0, expense: monthlyExpense * 12 };
                }
                
                financialData[year].revenue += reservation.workPrice;
                
                // Add actor fees as expenses
                const actorFees = reservation.voiceActors.reduce((sum, actor) => sum + actor.fee, 0);
                financialData[year].expense += actorFees;
            });
            
            invoices.forEach(invoice => {
                if (!invoice.date) return;
                
                const date = new Date(invoice.date);
                const year = date.getFullYear().toString();
                
                if (!invoiceData[year]) {
                    invoiceData[year] = 0;
                }
                
                invoiceData[year] += invoice.isPaid ? invoice.receivedAmount : 0;
            });
        }
        
        // Update revenue expense chart
        const financialLabels = Object.keys(financialData).sort();
        const revenueData = financialLabels.map(period => financialData[period].revenue);
        const expenseData = financialLabels.map(period => financialData[period].expense);
        
        revenueExpenseChart.data.labels = financialLabels;
        revenueExpenseChart.data.datasets[0].data = revenueData;
        revenueExpenseChart.data.datasets[1].data = expenseData;
        revenueExpenseChart.update();
        
        // Update invoice chart
        const invoiceLabels = Object.keys(invoiceData).sort();
        const invoiceValues = invoiceLabels.map(period => invoiceData[period]);
        
        invoiceRevenueChart.data.labels = invoiceLabels;
        invoiceRevenueChart.data.datasets[0].data = invoiceValues;
        invoiceRevenueChart.update();
    }
}

// وظائف القوائم المنسدلة
function populateDatalists() {
    // تعبئة قائمة العملاء
    const clientList = document.getElementById("clientList");
    clientList.innerHTML = clients.map(c => `<option value="${c.name}">`).join("");
    
    // تعبئة قائمة الفواتير
    const invoiceList = document.getElementById("invoiceList");
    invoiceList.innerHTML = '<option value="INV2025-01"></option><option value="INV2025-02"></option>';
}

// وظائف تحديث الإحصائيات
function updateBalance() {
    const newBalanceInput = document.getElementById("newBalance");
    const newBalance = parseFloat(newBalanceInput.value);
    
    if (isNaN(newBalance)) {
        alert("الرجاء إدخال رقم صالح للرصيد");
        return;
    }
    
    balance = newBalance;
    document.getElementById("balanceSpan").textContent = newBalance.toLocaleString();
    
    const available = balance > minBalance ? (balance - minBalance) : 0;
    document.getElementById("availableFunds").textContent = available.toLocaleString();
    
    newBalanceInput.value = "";
    saveState();
}

// وظائف المعلقين
function addVoiceActor() {
    const nameInput = document.getElementById("voiceName");
    const rateInput = document.getElementById("voiceRate");
    const name = nameInput.value.trim();
    const rate = parseFloat(rateInput.value) || 0;
    
    if (!name) {
        alert("يرجى إدخال اسم المعلق");
        return;
    }
    
    saveState();
    
    voices.push({ name, rate });
    
    // تحديث الجدول
    const voicesTable = document.getElementById("voicesTable");
    const newRow = voicesTable.insertRow(-1);
    const nameCell = newRow.insertCell(0);
    const rateCell = newRow.insertCell(1);
    const actionsCell = newRow.insertCell(2);
    
    nameCell.textContent = name;
    rateCell.textContent = `${rate} ريال`;
    const index = voices.length - 1;
    actionsCell.innerHTML = `
        <button class="btn btn-sm" onclick="editVoiceActor(${index})">
            <i class='bx bx-edit'></i> تعديل
        </button>
    `;
    
    // تفريغ الحقول
    nameInput.value = "";
    rateInput.value = "";
}

// وظائف العملاء
function addClient() {
    const nameInput = document.getElementById("clientName");
    const name = nameInput.value.trim();
    
    if (!name) {
        alert("يرجى إدخال اسم العميل");
        return;
    }
    
    saveState();
    
    clients.push({ name, addedTime: Date.now() });
    
    // تحديث القوائم المنسدلة
    populateDatalists();
    
    // تفريغ الحقل
    nameInput.value = "";
    
    alert("تم إضافة العميل بنجاح");
}

function sortClientsAsc() {
    alert("تم ترتيب العملاء من الأقدم للأحدث");
}

function sortClientsDesc() {
    alert("تم ترتيب العملاء من الأحدث للأقدم");
}

function loadCSVClients() {
    const fileInput = document.getElementById('csvInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert("يرجى اختيار ملف CSV أولاً");
        return;
    }
    
    // تحقق من نوع الملف
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert("يرجى اختيار ملف بصيغة CSV صالحة");
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(event) {
        try {
            // حفظ الحالة قبل التغيير للتراجع
            saveState();
            
            const csvData = event.target.result;
            const clientsData = parseCSVData(csvData);
            
            if (clientsData.length === 0) {
                alert("لم يتم العثور على بيانات عملاء في الملف");
                return;
            }
            
            // إضافة العملاء الجدد
            for (const clientData of clientsData) {
                // التحقق من وجود اسم العميل على الأقل
                if (!clientData.Name || clientData.Name.trim() === '') continue;
                
                // تحقق ما إذا كان العميل موجود بالفعل لتجنب التكرار
                const existingClient = clients.find(c => c.name.toLowerCase() === clientData.Name.trim().toLowerCase());
                if (existingClient) continue;
                
                // إضافة عميل جديد مع بيانات إضافية
                clients.push({
                    name: clientData.Name.trim(),
                    email: clientData.Email || '',
                    phone: clientData.Phone || '',
                    tax: clientData.Tax || '',
                    address1: clientData.Address1 || '',
                    address2: clientData.Address2 || '',
                    address3: clientData.Address3 || '',
                    shippingAddress1: clientData.ShippingAddress1 || '',
                    shippingAddress2: clientData.ShippingAddress2 || '',
                    shippingAddress3: clientData.ShippingAddress3 || '',
                    addedTime: Date.now()
                });
            }
            
            // تحديث القوائم المنسدلة
            populateDatalists();
            
            // تحديث جدول العملاء
            updateClientsTable();
            
            // تنبيه المستخدم
            alert(`تم استيراد ${clientsData.length} عميل بنجاح`);
            
            // مسح الملف المختار للسماح باختيار نفس الملف مرة أخرى
            fileInput.value = '';
            
        } catch (error) {
            console.error("خطأ في معالجة ملف CSV:", error);
            alert("حدث خطأ أثناء معالجة الملف. يرجى التأكد من صحة تنسيق الملف.");
        }
    };
    
    reader.onerror = function() {
        alert("حدث خطأ في قراءة الملف");
    };
    
    reader.readAsText(file);
}

// وظائف تعديل أو استيراد الفواتير
function triggerInvoiceImport() {
    document.getElementById("invoiceImportFile").click();
}

function importInvoices(fileInput) {
    const file = fileInput.files[0];
    
    if (!file) {
        alert("يرجى اختيار ملف للاستيراد");
        return;
    }
    
    // التحقق من نوع الملف
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
        alert("يرجى اختيار ملف Excel أو CSV");
        return;
    }
    
    saveState(); // حفظ الحالة قبل التغيير
    
    // قراءة الملف باستخدام SheetJS
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = e.target.result;
            
            // استخراج البيانات من الملف
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });
            
            if (jsonData.length === 0) {
                alert("لم يتم العثور على بيانات في الملف");
                return;
            }
            
            // طباعة البيانات المستخرجة للتصحيح
            console.log("بيانات الفواتير المستوردة:", jsonData);
            
            const currentDate = new Date().toLocaleString();
            let importedCount = 0;
            
            jsonData.forEach(row => {
                // نحدد الحقول المتوقعة بالضبط كما في الملف
                // Invoice #    Date    Customer        Customer Email  Additional Info.        Subtotal        Tax1    Tax2    Invoice Amount  Received Amount Date of Payment Received
                const invoiceNumber = String(row['Invoice #'] || '').trim();
                const date = row['Date'] || '';
                const customer = row['Customer'] || '';
                const email = row['Customer Email'] || '';
                const additionalInfo = row['Additional Info.'] || '';
                const subtotal = isNaN(parseFloat(row['Subtotal'])) ? 0 : parseFloat(row['Subtotal']);
                const tax1 = isNaN(parseFloat(row['Tax1'])) ? 0 : parseFloat(row['Tax1']);
                const tax2 = isNaN(parseFloat(row['Tax2'])) ? 0 : parseFloat(row['Tax2']);
                const invoiceAmount = isNaN(parseFloat(row['Invoice Amount'])) ? 0 : parseFloat(row['Invoice Amount']);
                const receivedAmount = isNaN(parseFloat(row['Received Amount'])) ? 0 : parseFloat(row['Received Amount']);
                const paymentDate = row['Date of Payment Received'] || '';
                
                // تخطي الصفوف بدون رقم فاتورة
                if (!invoiceNumber) {
                    console.log("تم تخطي صف بدون رقم فاتورة:", row);
                    return;
                }
                
                // التحقق مما إذا كانت الفاتورة موجودة بالفعل
                const existingInvoiceIndex = invoices.findIndex(inv => inv.invoiceNumber === invoiceNumber);
                
                // معلومات الفاتورة من الملف المستورد
                const newInvoice = {
                    invoiceNumber: invoiceNumber,
                    date: formatExcelDate(date),
                    customer: customer || 'غير محدد',
                    email: email,
                    additionalInfo: additionalInfo,
                    subtotal: subtotal,
                    tax1: tax1,
                    tax2: tax2,
                    invoiceAmount: invoiceAmount || (subtotal + tax1 + tax2),
                    receivedAmount: receivedAmount,
                    paymentDate: formatExcelDate(paymentDate),
                    isPaid: receivedAmount > 0
                };
                
                console.log("تمت معالجة الفاتورة:", newInvoice);
                
                if (existingInvoiceIndex !== -1) {
                    // تحديث الفاتورة الموجودة
                    invoices[existingInvoiceIndex] = newInvoice;
                } else {
                    // إضافة فاتورة جديدة
                    invoices.push(newInvoice);
                }
                
                // تسجيل العملية في سجل الفواتير
                invoiceAuditLog.push({
                    operation: "Import",
                    invoiceNumber: invoiceNumber,
                    date: currentDate
                });
                
                // تحديث حالة الفاتورة في الحجوزات المرتبطة
                updateReservationsWithInvoice(newInvoice);
                
                importedCount++;
            });
            
            // تحديث جدول الفواتير
            renderInvoicesTable();
            
            // تحديث جدول سجل الفواتير
            renderInvoiceAuditLogTable();
            
            // تحديث القوائم المنسدلة للفواتير
            populateInvoiceDatalist();
            
            // محاولة الربط التلقائي للحجوزات بالفواتير الجديدة
            const matchCount = autoMatchReservationsWithInvoices();
            
            // تنبيه المستخدم
            alert(`تم استيراد ${importedCount} فاتورة بنجاح وربط ${matchCount} حجز تلقائياً`);
            
            // إعادة تعيين حقل الملف للسماح بتحديد نفس الملف مرة أخرى
            fileInput.value = '';
            
        } catch (error) {
            console.error("خطأ في استيراد الفواتير:", error);
            alert("حدث خطأ أثناء استيراد الفواتير: " + error.message);
        }
    };
    
    reader.onerror = function() {
        alert("حدث خطأ أثناء قراءة الملف");
        fileInput.value = '';
    };
    
    reader.readAsBinaryString(file);
}

// معالجة تنسيقات التاريخ المختلفة من Excel
function formatExcelDate(dateValue) {
    if (!dateValue) return '';
    
    // محاولة معالجة التاريخ كرقم تسلسلي من Excel
    if (!isNaN(dateValue) && dateValue > 0) {
        // تحويل الرقم التسلسلي من Excel إلى تاريخ JavaScript
        // Excel يبدأ من 1/1/1900
        const excelEpoch = new Date(1899, 11, 30);
        const msPerDay = 24 * 60 * 60 * 1000;
        const date = new Date(excelEpoch.getTime() + (parseInt(dateValue) * msPerDay));
        
        // تنسيق إلى صيغة YYYY-MM-DD
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    
    // محاولة تفسير التاريخ كنص
    try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }
    } catch (e) {
        // في حالة الخطأ، إرجاع النص الأصلي
        return dateValue;
    }
    
    return dateValue;
}

// تحديث الحجوزات المرتبطة بفاتورة
function updateReservationsWithInvoice(invoice) {
    reservations.forEach(reservation => {
        if (reservation.invoiceNumber === invoice.invoiceNumber) {
            reservation.invoicePaid = invoice.isPaid;
            if (invoice.isPaid && invoice.paymentDate) {
                reservation.paidDate = invoice.paymentDate;
            }
        }
    });
}

// عرض جدول الفواتير
function renderInvoicesTable() {
    const invoicesTable = document.querySelector('#invoices table tbody');
    if (!invoicesTable) return;
    
    invoicesTable.innerHTML = '';
    
    // طباعة البيانات للتصحيح
    console.log("عدد الفواتير للعرض:", invoices.length);
    
    if (invoices.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="8" style="text-align:center">لا توجد فواتير للعرض. قم باستيراد الفواتير لبدء العمل.</td>';
        invoicesTable.appendChild(emptyRow);
        return;
    }
    
    invoices.forEach((invoice, index) => {
        const row = document.createElement('tr');
        
        // طباعة تفاصيل الفاتورة للتصحيح
        console.log(`فاتورة #${index}:`, invoice);
        
        row.innerHTML = `
            <td>${invoice.invoiceNumber || '-'}</td>
            <td>${invoice.date || '-'}</td>
            <td>${invoice.customer || '-'}</td>
            <td>${formatCurrency(invoice.invoiceAmount)}</td>
            <td>${formatCurrency(invoice.receivedAmount)}</td>
            <td>${invoice.paymentDate || '-'}</td>
            <td>${invoice.isPaid ? 
                '<span style="color:var(--success-color)">مدفوعة</span>' : 
                '<span style="color:var(--warning-color)">غير مدفوعة</span>'}</td>
            <td>
                <button class="btn btn-sm" onclick="editInvoice(${index})">
                    <i class='bx bx-edit'></i> تعديل
                </button>
                ${!invoice.isPaid ? 
                    `<button class="btn btn-sm" style="background-color:var(--success-color)" onclick="markInvoiceAsPaid(${index})">
                        <i class='bx bx-check'></i> تعليم كمدفوعة
                    </button>` : ''
                }
                <button class="btn btn-sm btn-danger" onclick="deleteInvoice(${index})">
                    <i class='bx bx-trash'></i> حذف
                </button>
            </td>
        `;
        
        // إضافة لون خلفية مختلف للفواتير غير المدفوعة المتأخرة
        if (!invoice.isPaid && isOverdue(invoice.date)) {
            row.style.backgroundColor = "#fff0f0";
        }
        
        invoicesTable.appendChild(row);
    });
}

// تنسيق المبالغ بإضافة الفواصل للآلاف
function formatCurrency(amount) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '0 ريال';
    return `${numAmount.toLocaleString()} ريال`;
}

// التحقق ما إذا كان التاريخ متأخراً (أكثر من 30 يوم)
function isOverdue(dateString) {
    if (!dateString) return false;
    
    const invoiceDate = new Date(dateString);
    if (isNaN(invoiceDate.getTime())) return false;
    
    const today = new Date();
    const differenceInTime = today - invoiceDate;
    const differenceInDays = differenceInTime / (1000 * 3600 * 24);
    
    return differenceInDays > 30;
}

// حذف النسخة المكررة من renderInvoicesTable هنا إذا وجدت

// إنشاء مودال تعديل الفاتورة
function createEditInvoiceModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editInvoiceModal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="closeModal('editInvoiceModal')">×</button>
            <h3>تعديل بيانات الفاتورة</h3>
            <input type="hidden" id="editInvoiceIndex">
            <label>رقم الفاتورة</label>
            <input type="text" id="editInvoiceNumber" class="input" placeholder="رقم الفاتورة">
            <label>العميل</label>
            <input type="text" id="editInvoiceCustomer" class="input" placeholder="اسم العميل">
            <label>تاريخ الفاتورة</label>
            <input type="date" id="editInvoiceDate" class="input">
            <label>المبلغ الفرعي</label>
            <input type="number" id="editInvoiceSubtotal" class="input" placeholder="المبلغ الفرعي">
            <label>الضريبة</label>
            <input type="number" id="editInvoiceTax1" class="input" placeholder="قيمة الضريبة">
            <label>مبلغ الفاتورة الإجمالي</label>
            <input type="number" id="editInvoiceAmount" class="input" placeholder="المبلغ الإجمالي">
            <label>المبلغ المستلم</label>
            <input type="number" id="editInvoiceReceived" class="input" placeholder="المبلغ المستلم">
            <label>تاريخ الاستلام</label>
            <input type="date" id="editInvoicePaymentDate" class="input">
            <div style="margin: 12px 0;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin: 0;">
                    <input type="checkbox" id="editInvoicePaid" style="width: 18px; height: 18px;">
                    <span>تم الدفع؟</span>
                </label>
            </div>
            <button class="btn" onclick="saveInvoiceEdit()">
                <i class='bx bx-save'></i> حفظ التغييرات
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}

// تحرير بيانات الفاتورة
function editInvoice(index) {
    const invoice = invoices[index];
    if (!invoice) return;
    
    // إنشاء مودال تعديل الفاتورة إذا لم يكن موجودا
    if (!document.getElementById('editInvoiceModal')) {
        createEditInvoiceModal();
    }
    
    // تعبئة المودال بالبيانات
    document.getElementById('editInvoiceIndex').value = index;
    document.getElementById('editInvoiceNumber').value = invoice.invoiceNumber;
    document.getElementById('editInvoiceCustomer').value = invoice.customer;
    document.getElementById('editInvoiceDate').value = invoice.date;
    document.getElementById('editInvoiceSubtotal').value = invoice.subtotal;
    document.getElementById('editInvoiceTax1').value = invoice.tax1;
    document.getElementById('editInvoiceAmount').value = invoice.invoiceAmount;
    document.getElementById('editInvoiceReceived').value = invoice.receivedAmount;
    document.getElementById('editInvoicePaymentDate').value = invoice.paymentDate;
    document.getElementById('editInvoicePaid').checked = invoice.isPaid;
    
    // عرض المودال
    document.getElementById('editInvoiceModal').classList.add('active');
}

// حفظ تغييرات الفاتورة
function saveInvoiceEdit() {
    const index = parseInt(document.getElementById('editInvoiceIndex').value);
    const invoice = invoices[index];
    if (!invoice) return;
    
    const newInvoiceNumber = document.getElementById('editInvoiceNumber').value.trim();
    const customerName = document.getElementById('editInvoiceCustomer').value.trim();
    const invoiceDate = document.getElementById('editInvoiceDate').value;
    const subtotal = parseFloat(document.getElementById('editInvoiceSubtotal').value) || 0;
    const tax1 = parseFloat(document.getElementById('editInvoiceTax1').value) || 0;
    const invoiceAmount = parseFloat(document.getElementById('editInvoiceAmount').value) || 0;
    const receivedAmount = parseFloat(document.getElementById('editInvoiceReceived').value) || 0;
    const paymentDate = document.getElementById('editInvoicePaymentDate').value;
    const isPaid = document.getElementById('editInvoicePaid').checked;
    
    if (!newInvoiceNumber || !customerName) {
        alert('يرجى تعبئة الحقول المطلوبة');
        return;
    }
    
    saveState();
    
    // تخزين رقم الفاتورة القديم للتحديث في الحجوزات
    const oldInvoiceNumber = invoice.invoiceNumber;
    
    // تحديث بيانات الفاتورة
    invoice.invoiceNumber = newInvoiceNumber;
    invoice.customer = customerName;
    invoice.date = invoiceDate;
    invoice.subtotal = subtotal;
    invoice.tax1 = tax1;
    invoice.invoiceAmount = invoiceAmount;
    invoice.receivedAmount = receivedAmount;
    invoice.paymentDate = paymentDate;
    invoice.isPaid = isPaid;
    
    // تحديث الحجوزات المرتبطة إذا تغير رقم الفاتورة
    if (oldInvoiceNumber !== newInvoiceNumber) {
        reservations.forEach(reservation => {
            if (reservation.invoiceNumber === oldInvoiceNumber) {
                reservation.invoiceNumber = newInvoiceNumber;
            }
        });
    }
    
    // تحديث حالة الدفع في الحجوزات المرتبطة
    reservations.forEach(reservation => {
        if (reservation.invoiceNumber === newInvoiceNumber) {
            reservation.invoicePaid = isPaid;
            if (isPaid && paymentDate) {
                reservation.paidDate = paymentDate;
            }
        }
    });
    
    // تحديث العرض
    renderInvoicesTable();
    renderReservationsTable();
    populateInvoiceDatalist();
    
    // تحديث الإحصائيات
    updateAllStatistics();
    
    // إضافة سجل العملية
    invoiceAuditLog.push({
        operation: "Edit",
        invoiceNumber: newInvoiceNumber,
        date: new Date().toLocaleString()
    });
    
    renderInvoiceAuditLogTable();
    
    closeModal('editInvoiceModal');
    
    alert('تم تحديث بيانات الفاتورة بنجاح');
}

// وظيفة تحليل بيانات CSV
function parseCSVData(csvText) {
    // تقسيم النص إلى سطور
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    
    // استخراج أسماء الأعمدة من السطر الأول
    const headers = lines[0].split(',').map(header => header.trim());
    
    // معالجة باقي السطور
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        // تخطي السطور الفارغة
        if (!lines[i].trim()) continue;
        
        // تقسيم السطر إلى قيم
        const values = lines[i].split(',');
        
        // إنشاء كائن بالقيم
        const rowData = {};
        headers.forEach((header, index) => {
            rowData[header] = index < values.length ? values[index].trim() : '';
        });
        
        result.push(rowData);
    }
    
    return result;
}

// وظيفة تحديث جدول العملاء
function updateClientsTable() {
    const table = document.getElementById('clientsTable');
    if (!table) return;
    
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    
    clients.forEach((client, index) => {
        const row = document.createElement('tr');
        
        // تنسيق الوقت
        const date = new Date(client.addedTime);
        const formattedDate = date.toISOString().replace('T', ' ').substring(0, 19);
        
        row.innerHTML = `
            <td>${client.name}</td>
            <td>${formattedDate}</td>
            <td>
                <button class="btn btn-sm" onclick="editClient(${index})">
                    <i class='bx bx-edit'></i> تعديل
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteClient(${index})">
                    <i class='bx bx-trash'></i> حذف
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// وظيفة حذف عميل
function deleteClient(index) {
    if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
    
    // حفظ الحالة قبل التغيير
    saveState();
    
    const clientName = clients[index].name;
    
    // حذف العميل
    clients.splice(index, 1);
    
    // تحديث جدول العملاء
    updateClientsTable();
    
    // تحديث القوائم المنسدلة
    populateDatalists();
    
    alert(`تم حذف العميل "${clientName}" بنجاح`);
}

// وظائف ترتيب العملاء
function sortClientsAsc() {
    // حفظ الحالة قبل التغيير
    saveState();
    
    // ترتيب العملاء من الأقدم للأحدث (تصاعديًا حسب وقت الإضافة)
    clients.sort((a, b) => a.addedTime - b.addedTime);
    
    // تحديث جدول العملاء
    updateClientsTable();
    
    alert("تم ترتيب العملاء من الأقدم للأحدث");
}

function sortClientsDesc() {
    // حفظ الحالة قبل التغيير
    saveState();
    
    // ترتيب العملاء من الأحدث للأقدم (تنازليًا حسب وقت الإضافة)
    clients.sort((a, b) => b.addedTime - a.addedTime);
    
    // تحديث جدول العملاء
    updateClientsTable();
    
    alert("تم ترتيب العملاء من الأحدث للأقدم");
}

// وظيفة تراجع عن التغييرات
function undoChange() {
    if (stateHistory.length === 0) {
        alert("لا توجد تغييرات للتراجع عنها");
        return;
    }
    
    const previousState = stateHistory.pop();
    
    // استعادة البيانات
    balance = previousState.balance;
    voices = previousState.voices;
    clients = previousState.clients;
    reservations = previousState.reservations;
    invoices = previousState.invoices;
    
    // تحديث العرض
    updateAllStatistics();
    updateClientsTable();
    renderReservationsTable();
    renderInvoicesTable();
    renderInvoiceAuditLogTable();
    populateDatalists();
    populateInvoiceDatalist();
    
    // تحديث التقارير بعد التراجع - إضافة هذا السطر لضمان تحديث التقارير
    renderReports();
    
    alert("تم التراجع عن آخر تغيير");
}

// حفظ حالة النظام الحالية للتراجع
function saveState() {
    const currentState = {
        balance: balance,
        voices: JSON.parse(JSON.stringify(voices)),
        clients: JSON.parse(JSON.stringify(clients)),
        reservations: JSON.parse(JSON.stringify(reservations)),
        invoices: JSON.parse(JSON.stringify(invoices))
    };
    
    stateHistory.push(currentState);
    
    // الاحتفاظ فقط بآخر 10 حالات
    if (stateHistory.length > 10) {
        stateHistory.shift();
    }
    
    // تعيين متغير وجود تغييرات غير محفوظة
    hasUnsavedChanges = true;
}

// تحديث إحصائيات النظام
function updateAllStatistics() {
    // حساب إجمالي الإيرادات
    const totalRevenue = reservations.reduce((sum, res) => sum + res.workPrice, 0);
    document.getElementById("totalRevenue").textContent = totalRevenue.toLocaleString();
    
    // حساب إجمالي مستحقات المعلقين
    const totalActorFee = reservations.reduce((sum, res) => {
        return sum + res.voiceActors.reduce((actorSum, actor) => actorSum + actor.fee, 0);
    }, 0);
    document.getElementById("totalActorFee").textContent = totalActorFee.toLocaleString();
    
    // حساب صافي الربح (الإيرادات - المستحقات فقط، بدون طرح المصاريف الشهرية)
    const netProfit = totalRevenue - totalActorFee;
    document.getElementById("netProfit").textContent = netProfit.toLocaleString();
    
    // تحديث الأموال المتاحة
    const available = balance > minBalance ? (balance - minBalance) : 0;
    document.getElementById("availableFunds").textContent = available.toLocaleString();
    document.getElementById("balanceSpan").textContent = balance.toLocaleString();
    
    // التحذير إذا كان الرصيد غير كافٍ
    const balanceWarning = document.getElementById("balanceWarning");
    if (available < totalActorFee + monthlyExpense) {
        balanceWarning.classList.remove("hidden");
    } else {
        balanceWarning.classList.add("hidden");
    }

    // البحث عن فواتير غير مرتبطة
    const unlinkedInvoices = getUnlinkedInvoices();
    const unlinkedReservations = getUnlinkedReservations();
    
    // تحديث العداد في واجهة المستخدم إذا كان موجوداً
    const unlinkedCounter = document.getElementById("unlinkedCounter");
    if (unlinkedCounter) {
        unlinkedCounter.textContent = unlinkedReservations.length;
        if (unlinkedReservations.length > 0) {
            unlinkedCounter.classList.add("warning-count");
        } else {
            unlinkedCounter.classList.remove("warning-count");
        }
    }

    // Sync with chart data
    dashboardData.reservations = JSON.parse(JSON.stringify(reservations));
    updateDashboardData('reservations', dashboardData.reservations);
    
    dashboardData.invoices = JSON.parse(JSON.stringify(invoices));
    updateDashboardData('invoices', dashboardData.invoices);
    
    // Use totalRevenue or any logic you prefer for the revenue
    dashboardData.revenue = totalRevenue;
    // Example: monthlyExpense + totalActorFee
    dashboardData.expenses = monthlyExpense + totalActorFee;
    updateDashboardData('revenue-expense', {
        revenue: dashboardData.revenue,
        expenses: dashboardData.expenses
    });
}

// وظيفة للحصول على الفواتير غير المرتبطة بحجوزات
function getUnlinkedInvoices() {
    return invoices.filter(invoice => {
        // البحث عن حجز مرتبط بهذه الفاتورة
        const linkedReservation = reservations.find(res => res.invoiceNumber === invoice.invoiceNumber);
        return !linkedReservation;
    });
}

// وظيفة للحصول على الحجوزات غير المرتبطة بفواتير
function getUnlinkedReservations() {
    return reservations.filter(reservation => {
        // إذا لم يكن هناك رقم فاتورة، فالحجز غير مرتبط
        if (!reservation.invoiceNumber) return true;
        
        // إذا كان هناك رقم فاتورة، تحقق من وجود الفاتورة
        const linkedInvoice = invoices.find(inv => inv.invoiceNumber === reservation.invoiceNumber);
        return !linkedInvoice;
    });
}

// وظيفة لمطابقة الحجوزات بالفواتير تلقائياً
function autoMatchReservationsWithInvoices() {
    let matchCount = 0;
    
    // البحث عن الحجوزات التي ليس لها رقم فاتورة
    const reservationsWithoutInvoice = reservations.filter(res => !res.invoiceNumber);
    
    // البحث عن فواتير لكل حجز
    reservationsWithoutInvoice.forEach(reservation => {
        // بحث عن فاتورة تطابق اسم العميل والمبلغ والتاريخ (مع هامش للتاريخ)
        const matchingInvoice = findMatchingInvoice(reservation);
        
        if (matchingInvoice) {
            // تحديث الحجز برقم الفاتورة
            reservation.invoiceNumber = matchingInvoice.invoiceNumber;
            reservation.invoicePaid = matchingInvoice.isPaid;
            if (matchingInvoice.isPaid) {
                reservation.paidDate = matchingInvoice.paymentDate || '';
            }
            
            matchCount++;
            
            // إضافة سجل في سجل العمليات
            invoiceAuditLog.push({
                operation: "Auto-Link",
                invoiceNumber: matchingInvoice.invoiceNumber,
                date: new Date().toLocaleString()
            });
        }
    });
    
    // تحديث الجداول والإحصائيات
    if (matchCount > 0) {
        renderReservationsTable();
        renderInvoiceAuditLogTable();
        updateAllStatistics();
    }
    
    return matchCount;
}

// وظيفة للبحث عن فاتورة تطابق حجز معين
function findMatchingInvoice(reservation) {
    // استخراج معلومات الحجز
    const clientName = reservation.client;
    const reservationDate = new Date(reservation.recordTime.split('T')[0]);
    const reservationAmount = reservation.workPrice;
    
    // البحث عن فاتورة مطابقة
    return invoices.find(invoice => {
        // تطابق العميل
        const clientMatch = invoice.customer.toLowerCase() === clientName.toLowerCase();
        if (!clientMatch) return false;
        
        // تطابق المبلغ (يسمح بهامش بسيط)
        const amountMatch = Math.abs(invoice.invoiceAmount - reservationAmount) < 0.01;
        if (!amountMatch) return false;
        
        // تطابق التاريخ (مع هامش يومين)
        if (invoice.date) {
            const invoiceDate = new Date(invoice.date);
            const daysDifference = Math.abs((invoiceDate - reservationDate) / (1000 * 60 * 60 * 24));
            return daysDifference <= 2; // هامش يومين
        }
        
        return false;
    });
}

// وظيفة لإظهار مودال لربط الحجوزات بالفواتير يدوياً
function showLinkReservationsModal() {
    // التحقق من وجود المودال وإنشاؤه إذا لم يكن موجوداً
    if (!document.getElementById('linkReservationsModal')) {
        createLinkReservationsModal();
    }
    
    // الحصول على الحجوزات غير المرتبطة
    const unlinkedReservations = getUnlinkedReservations();
    
    // تحديث قائمة الحجوزات في المودال
    const reservationsList = document.getElementById('unlinkedReservationsList');
    reservationsList.innerHTML = '';
    
    if (unlinkedReservations.length === 0) {
        reservationsList.innerHTML = '<div style="text-align:center;padding:15px;">لا توجد حجوزات غير مرتبطة بفواتير</div>';
    } else {
        unlinkedReservations.forEach(res => {
            const listItem = document.createElement('div');
            listItem.className = 'reservation-item';
            
            // صياغة التاريخ بشكل أفضل
            const formattedDate = res.recordTime.replace('T', ' الساعة ');
            
            listItem.innerHTML = `
                <div class="reservation-details">
                    <h4>${res.id}: ${res.client}</h4>
                    <p>التاريخ: ${formattedDate}</p>
                    <p>السعر: ${res.workPrice} ريال</p>
                </div>
                <div class="reservation-actions">
                    <input type="text" list="invoiceList" class="input" placeholder="رقم الفاتورة" style="max-width:150px;margin:0 8px 0 0;">
                    <button class="btn btn-sm" onclick="linkReservationToInvoice('${res.id}', this.previousElementSibling.value)">
                        ربط
                    </button>
                </div>
            `;
            
            reservationsList.appendChild(listItem);
        });
    }
    
    // عرض المودال
    document.getElementById('linkReservationsModal').classList.add('active');
}

// إنشاء مودال ربط الحجوزات بالفواتير
function createLinkReservationsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'linkReservationsModal';
    modal.innerHTML = `
        <div class="modal-content" style="width:600px;">
            <button class="modal-close" onclick="closeModal('linkReservationsModal')">×</button>
            <h3>ربط الحجوزات بالفواتير</h3>
            <div style="margin-bottom:15px;">
                <button class="btn" onclick="autoLinkReservations()">
                    <i class='bx bx-link'></i> ربط تلقائي
                </button>
                <span id="autoLinkResult" style="margin-right:10px;"></span>
            </div>
            <div style="background:var(--primary-light);padding:15px;border-radius:8px;margin-bottom:15px;">
                <h4 style="margin-top:0;">حجوزات غير مرتبطة بفواتير</h4>
                <div id="unlinkedReservationsList" style="max-height:350px;overflow-y:auto;">
                    <!-- ستتم تعبئة هذا القسم عبر JavaScript -->
                </div>
            </div>
            <p style="margin-top:15px;font-size:13px;color:var(--text-light);">
                <i class='bx bx-info-circle'></i> 
                يمكنك ربط الحجوزات بالفواتير بشكل تلقائي أو يدوي. عند ربط حجز بفاتورة، سيتم تحديث حالة الحجز تلقائياً بناءً على حالة الفاتورة.
            </p>
        </div>
    `;
    document.body.appendChild(modal);
}

// وظيفة لربط حجز بفاتورة يدوياً
function linkReservationToInvoice(reservationId, invoiceNumber) {
    if (!invoiceNumber.trim()) {
        alert("يرجى إدخال رقم فاتورة صالح");
        return;
    }
    
    // البحث عن الحجز والفاتورة
    const reservation = reservations.find(res => res.id === reservationId);
    const invoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
    
    if (!reservation) {
        alert("لم يتم العثور على الحجز");
        return;
    }
    
    if (!invoice) {
        if (!confirm("لم يتم العثور على الفاتورة في النظام. هل تريد الاستمرار في الربط على أي حال؟")) {
            return;
        }
    }
    
    // حفظ الحالة قبل التغيير
    saveState();
    
    // تحديث الحجز
    reservation.invoiceNumber = invoiceNumber;
    
    if (invoice) {
        reservation.invoicePaid = invoice.isPaid;
        if (invoice.isPaid) {
            reservation.paidDate = invoice.paymentDate || '';
        }
    }
    
    // إضافة سجل في سجل العمليات
    invoiceAuditLog.push({
        operation: "Manual-Link",
        invoiceNumber: invoiceNumber,
        date: new Date().toLocaleString()
    });
    
    // تحديث الجداول
    renderReservationsTable();
    renderInvoiceAuditLogTable();
    
    // إعادة تحميل مودال الربط لإظهار التغييرات
    showLinkReservationsModal();
    
    alert("تم ربط الحجز بالفاتورة بنجاح");
}

// وظيفة للربط التلقائي بين الحجوزات والفواتير
function autoLinkReservations() {
    const matchCount = autoMatchReservationsWithInvoices();
    
    const resultSpan = document.getElementById('autoLinkResult');
    if (resultSpan) {
        resultSpan.textContent = `تم ربط ${matchCount} حجز بشكل تلقائي`;
        resultSpan.style.color = matchCount > 0 ? "var(--success-color)" : "var(--text-light)";
    }
    
    // تحديث قائمة الحجوزات في المودال
    showLinkReservationsModal();
}

// توسيع وظيفة استيراد الفواتير لتقوم بمحاولة الربط التلقائي بعد الاستيراد
function importInvoices(fileInput) {
    const file = fileInput.files[0];
    
    if (!file) {
        alert("يرجى اختيار ملف للاستيراد");
        return;
    }
    
    // التحقق من نوع الملف
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
        alert("يرجى اختيار ملف Excel أو CSV");
        return;
    }
    
    saveState(); // حفظ الحالة قبل التغيير
    
    // قراءة الملف باستخدام SheetJS
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = e.target.result;
            
            // استخراج البيانات من الملف
            const workbook = XLSX.read(data, { type: 'binary' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false });
            
            if (jsonData.length === 0) {
                alert("لم يتم العثور على بيانات في الملف");
                return;
            }
            
            // طباعة البيانات المستخرجة للتصحيح
            console.log("بيانات الفواتير المستوردة:", jsonData);
            
            const currentDate = new Date().toLocaleString();
            let importedCount = 0;
            
            jsonData.forEach(row => {
                // نحدد الحقول المتوقعة بالضبط كما في الملف
                // Invoice #    Date    Customer        Customer Email  Additional Info.        Subtotal        Tax1    Tax2    Invoice Amount  Received Amount Date of Payment Received
                const invoiceNumber = String(row['Invoice #'] || '').trim();
                const date = row['Date'] || '';
                const customer = row['Customer'] || '';
                const email = row['Customer Email'] || '';
                const additionalInfo = row['Additional Info.'] || '';
                const subtotal = isNaN(parseFloat(row['Subtotal'])) ? 0 : parseFloat(row['Subtotal']);
                const tax1 = isNaN(parseFloat(row['Tax1'])) ? 0 : parseFloat(row['Tax1']);
                const tax2 = isNaN(parseFloat(row['Tax2'])) ? 0 : parseFloat(row['Tax2']);
                const invoiceAmount = isNaN(parseFloat(row['Invoice Amount'])) ? 0 : parseFloat(row['Invoice Amount']);
                const receivedAmount = isNaN(parseFloat(row['Received Amount'])) ? 0 : parseFloat(row['Received Amount']);
                const paymentDate = row['Date of Payment Received'] || '';
                
                // تخطي الصفوف بدون رقم فاتورة
                if (!invoiceNumber) {
                    console.log("تم تخطي صف بدون رقم فاتورة:", row);
                    return;
                }
                
                // التحقق مما إذا كانت الفاتورة موجودة بالفعل
                const existingInvoiceIndex = invoices.findIndex(inv => inv.invoiceNumber === invoiceNumber);
                
                // معلومات الفاتورة من الملف المستورد
                const newInvoice = {
                    invoiceNumber: invoiceNumber,
                    date: formatExcelDate(date),
                    customer: customer || 'غير محدد',
                    email: email,
                    additionalInfo: additionalInfo,
                    subtotal: subtotal,
                    tax1: tax1,
                    tax2: tax2,
                    invoiceAmount: invoiceAmount || (subtotal + tax1 + tax2),
                    receivedAmount: receivedAmount,
                    paymentDate: formatExcelDate(paymentDate),
                    isPaid: receivedAmount > 0
                };
                
                console.log("تمت معالجة الفاتورة:", newInvoice);
                
                if (existingInvoiceIndex !== -1) {
                    // تحديث الفاتورة الموجودة
                    invoices[existingInvoiceIndex] = newInvoice;
                } else {
                    // إضافة فاتورة جديدة
                    invoices.push(newInvoice);
                }
                
                // تسجيل العملية في سجل الفواتير
                invoiceAuditLog.push({
                    operation: "Import",
                    invoiceNumber: invoiceNumber,
                    date: currentDate
                });
                
                // تحديث حالة الفاتورة في الحجوزات المرتبطة
                updateReservationsWithInvoice(newInvoice);
                
                importedCount++;
            });
            
            // تحديث جدول الفواتير
            renderInvoicesTable();
            
            // تحديث جدول سجل الفواتير
            renderInvoiceAuditLogTable();
            
            // تحديث القوائم المنسدلة للفواتير
            populateInvoiceDatalist();
            
            // محاولة الربط التلقائي للحجوزات بالفواتير الجديدة
            const matchCount = autoMatchReservationsWithInvoices();
            
            // تنبيه المستخدم
            alert(`تم استيراد ${importedCount} فاتورة بنجاح وربط ${matchCount} حجز تلقائياً`);
            
            // إعادة تعيين حقل الملف للسماح بتحديد نفس الملف مرة أخرى
            fileInput.value = '';
            
        } catch (error) {
            console.error("خطأ في استيراد الفواتير:", error);
            alert("حدث خطأ أثناء استيراد الفواتير: " + error.message);
        }
    };
    
    reader.onerror = function() {
        alert("حدث خطأ أثناء قراءة الملف");
        fileInput.value = '';
    };
    
    reader.readAsBinaryString(file);
}

// تحديث وظيفة renderReservationsTable لإضافة تمييز للحجوزات غير المرتبطة بفواتير صحيحة
function renderReservationsTable() {
    const reservationsTable = document.querySelector('#reservations table tbody');
    if (!reservationsTable) return;
    
    reservationsTable.innerHTML = '';
    
    reservations.forEach((res, index) => {
        const row = document.createElement('tr');
        
        const totalActorFees = res.voiceActors.reduce((sum, actor) => sum + actor.fee, 0);
        const studioRevenue = res.workPrice - totalActorFees;
        
        // التحقق من وجود ربط بالفاتورة
        const linkedInvoice = invoices.find(inv => inv.invoiceNumber === res.invoiceNumber);
        const hasValidInvoice = linkedInvoice !== undefined;
        
        // إضافة صف ملون إذا لم يكن الحجز مرتبطًا بفاتورة صالحة
        if (res.invoiceNumber && !hasValidInvoice) {
            row.classList.add('unlinked');
        }
        
        row.innerHTML = `
            <td>${res.id}</td>
            <td>${res.client}</td>
            <td>${res.recordTime.replace('T', ' ')}</td>
            <td>${res.workPrice} ريال</td>
            <td>${totalActorFees} ريال</td>
            <td>${studioRevenue} ريال</td>
            <td>${res.invoiceNumber ? 
                `<span style="color:${hasValidInvoice ? 'inherit' : 'var(--danger-color)'}">${res.invoiceNumber}</span>` : 
                '<button class="btn btn-sm btn-outline" onclick="showLinkInvoiceOptions(${index})"><i class="bx bx-link"></i> ربط</button>'}</td>
            <td>${res.invoicePaid ? 'نعم' : 'لا'}</td>
            <td>
                <button class="btn btn-sm" onclick="editReservation(${index})">
                    <i class='bx bx-edit'></i> تعديل
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteReservation(${index})">
                    <i class='bx bx-trash'></i> حذف
                </button>
            </td>
        `;
        
        reservationsTable.appendChild(row);
    });
}

// وظيفة إظهار خيارات ربط الفاتورة مباشرة من الجدول
function showLinkInvoiceOptions(index) {
    const reservation = reservations[index];
    if (!reservation) return;
    
    // إنشاء مودال صغير للربط
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'quickLinkModal';
    modal.innerHTML = `
        <div class="modal-content" style="width:400px;">
            <button class="modal-close" onclick="closeModal('quickLinkModal')">×</button>
            <h3>ربط الحجز بفاتورة</h3>
            <p>ربط الحجز <strong>${reservation.id}</strong> للعميل <strong>${reservation.client}</strong></p>
            <label>اختر أو أدخل رقم الفاتورة</label>
            <input type="text" list="invoiceList" id="quickLinkInvoiceNumber" class="input" placeholder="رقم الفاتورة">
            <div style="margin-top:15px;">
                <button class="btn" onclick="quickLinkReservation(${index})">
                    <i class='bx bx-link'></i> ربط
                </button>
                <button class="btn" onclick="findMatchingInvoiceForReservation(${index})">
                    <i class='bx bx-search'></i> بحث تلقائي
                </button>
            </div>
            <div id="suggestedInvoices" style="margin-top:15px;"></div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // عرض المودال
    modal.classList.add('active');
    
    // محاولة البحث عن فواتير مقترحة
    suggestInvoicesForReservation(index);
}

// وظيفة للبحث عن فواتير مقترحة لحجز معين
function suggestInvoicesForReservation(index) {
    const reservation = reservations[index];
    if (!reservation) return;
    
    const suggestedInvoicesDiv = document.getElementById('suggestedInvoices');
    if (!suggestedInvoicesDiv) return;
    
    // البحث عن الفواتير المطابقة للعميل والمبلغ (مع هامش)
    const suggestions = invoices.filter(invoice => {
        // تطابق العميل
        const clientMatch = invoice.customer.toLowerCase().includes(reservation.client.toLowerCase()) || 
                            reservation.client.toLowerCase().includes(invoice.customer.toLowerCase());
        
        // تطابق المبلغ (مع هامش 10%)
        const priceDifference = Math.abs(invoice.invoiceAmount - reservation.workPrice);
        const priceMatch = priceDifference < (reservation.workPrice * 0.1);
        
        return clientMatch && priceMatch;
    });
    
    if (suggestions.length > 0) {
        suggestedInvoicesDiv.innerHTML = `
            <h4 style="margin:0 0 10px 0;">فواتير مقترحة</h4>
            <div style="max-height:200px;overflow-y:auto;background:var(--primary-light);padding:10px;border-radius:8px;">
                ${suggestions.map(inv => `
                    <div style="padding:8px;margin-bottom:5px;background:#fff;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between;" 
                         onclick="selectSuggestedInvoice('${inv.invoiceNumber}')">
                        <div>
                            <strong>${inv.invoiceNumber}</strong> - ${inv.customer}
                        </div>
                        <div>${inv.invoiceAmount} ريال</div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        suggestedInvoicesDiv.innerHTML = '<p style="color:var(--text-light);font-size:13px;">لا توجد فواتير مقترحة مطابقة للعميل والمبلغ</p>';
    }
}

// وظيفة لاختيار فاتورة مقترحة
function selectSuggestedInvoice(invoiceNumber) {
    const input = document.getElementById('quickLinkInvoiceNumber');
    if (input) {
        input.value = invoiceNumber;
    }
}

// وظيفة للربط السريع بين الحجز والفاتورة
function quickLinkReservation(index) {
    const invoiceNumber = document.getElementById('quickLinkInvoiceNumber').value.trim();
    if (!invoiceNumber) {
        alert("يرجى إدخال رقم فاتورة صالح");
        return;
    }
    
    const reservation = reservations[index];
    if (!reservation) {
        alert("لم يتم العثور على الحجز");
        return;
    }
    
    // البحث عن الفاتورة
    const invoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
    
    if (!invoice) {
        if (!confirm("لم يتم العثور على الفاتورة في النظام. هل تريد الاستمرار في الربط على أي حال؟")) {
            return;
        }
    }
    
    // حفظ الحالة قبل التغيير
    saveState();
    
    // تحديث الحجز
    reservation.invoiceNumber = invoiceNumber;
    
    if (invoice) {
        reservation.invoicePaid = invoice.isPaid;
        if (invoice.isPaid) {
            reservation.paidDate = invoice.paymentDate || '';
        }
    }
    
    // إضافة سجل في سجل العمليات
    invoiceAuditLog.push({
        operation: "Quick-Link",
        invoiceNumber: invoiceNumber,
        date: new Date().toLocaleString()
    });
    
    // تحديث الجداول
    renderReservationsTable();
    renderInvoiceAuditLogTable();
    
    // إغلاق المودال
    closeModal('quickLinkModal');
    
    alert("تم ربط الحجز بالفاتورة بنجاح");
}

// وظيفة للبحث التلقائي عن فاتورة مطابقة لحجز معين
function findMatchingInvoiceForReservation(index) {
    const reservation = reservations[index];
    if (!reservation) {
        alert("لم يتم العثور على الحجز");
        return;
    }
    
    // البحث عن فاتورة مطابقة
    const matchingInvoice = findMatchingInvoice(reservation);
    
    if (matchingInvoice) {
        // تعبئة رقم الفاتورة في الحقل
        const input = document.getElementById('quickLinkInvoiceNumber');
        if (input) {
            input.value = matchingInvoice.invoiceNumber;
        }
        
        // إظهار رسالة نجاح
        alert(`تم العثور على فاتورة مطابقة: ${matchingInvoice.invoiceNumber}`);
    } else {
        alert("لم يتم العثور على فاتورة مطابقة");
    }
}

// تحديث وظيفة تهيئة عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
    // ...existing code...
    
    // إضافة زر لإدارة العلاقة بين الحجوزات والفواتير في قسم الحجوزات
    const reservationsHeader = document.querySelector("#reservations .card h3");
    if (reservationsHeader) {
        const linkButton = document.createElement("button");
        linkButton.className = "btn btn-sm";
        linkButton.style = "margin-right: auto; font-size: 13px; padding: 6px 12px;";
        linkButton.innerHTML = '<i class="bx bx-link"></i> ربط بالفواتير <span id="unlinkedCounter" class="counter">0</span>';
        linkButton.onclick = showLinkReservationsModal;
        
        // إضافة الزر إلى العنوان
        reservationsHeader.style.display = "flex";
        reservationsHeader.style.alignItems = "center";
        reservationsHeader.appendChild(linkButton);
    }
    
    // ...existing code...
});

// تحميل الصفحة وتهيئة الدوال
document.addEventListener("DOMContentLoaded", function() {
    // إنشاء المودالات في بداية تحميل الصفحة
    if (!document.getElementById('editVoiceModal')) createEditVoiceModal();
    if (!document.getElementById('editClientModal')) createEditClientModal();
    if (!document.getElementById('editReservationModal')) createEditReservationModal();
    
    // تهيئة البيانات
    populateDatalists();
    
    try {
        populateInvoiceDatalist();
    } catch (e) {
        console.error("خطأ في تحميل قوائم الفواتير:", e);
    }
    
    try {
        initCharts();
    } catch (e) {
        console.error("خطأ في تهيئة المخططات البيانية:", e);
    }
    
    updateAllStatistics();
    updateClientsTable();
    
    // تحديث الجداول
    try {
        renderInvoicesTable();
    } catch (e) {
        console.error("خطأ في عرض جدول الفواتير:", e);
    }
    
    try {
        renderInvoiceAuditLogTable();
    } catch (e) {
        console.error("خطأ في عرض سجل الفواتير:", e);
    }
    
    try {
        renderReservationsTable();
    } catch (e) {
        console.error("خطأ في عرض جدول الحجوزات:", e);
    }
    
    try {
        renderReports();
    } catch (e) {
        console.error("خطأ في عرض التقارير:", e);
    }
    
    // حفظ الحالة الأولية
    saveState();
});

// وظيفة لتطبيق الفلترة على التقارير
function renderReports() {
    const clientFilter = document.getElementById('reportClientFilter').value.trim();
    const fromDate = document.getElementById('reportFromDate').value;
    const toDate = document.getElementById('reportToDate').value;
    
    // تحديث جداول التقارير
    renderDuePaymentsTable(clientFilter, fromDate, toDate);
    renderPaidPaymentsTable(clientFilter, fromDate, toDate);
    
    // حساب وعرض إحصائيات المستحقات
    updateDueAmountStatistics(clientFilter, fromDate, toDate);
}

// وظيفة لعرض جدول المستحقات
function renderDuePaymentsTable(clientFilter = '', fromDate = '', toDate = '') {
    const duePaymentsTable = document.getElementById('duePaymentsTable').querySelector('tbody');
    duePaymentsTable.innerHTML = '';
    
    // تاريخ اليوم للمقارنة
    const today = new Date();
    
    // فلترة الحجوزات بناءً على المعايير
    const filteredReservations = reservations.filter(res => {
        // فقط الحجوزات التي تحتوي على معلقين غير مدفوعين
        if (res.actorPaid) return false;
        
        // فلترة حسب العميل إذا تم تحديده
        if (clientFilter && !res.client.includes(clientFilter)) return false;
        
        // فلترة حسب التاريخ إذا تم تحديده
        if (fromDate) {
            const fromDateObj = new Date(fromDate);
            const resDateObj = new Date(res.actorDueDate);
            if (resDateObj < fromDateObj) return false;
        }
        
        if (toDate) {
            const toDateObj = new Date(toDate);
            const resDateObj = new Date(res.actorDueDate);
            if (resDateObj > toDateObj) return false;
        }
        
        return true;
    });
    
    // عرض الحجوزات المفلترة في الجدول
    filteredReservations.forEach(res => {
        // حساب الأيام المتبقية للدفع
        const dueDate = new Date(res.actorDueDate);
        const timeDiff = dueDate - today;
        const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        // إنشاء صف لكل معلق في الحجز
        res.voiceActors.forEach(actor => {
            const row = document.createElement('tr');
            
            // تحديد لون الصف بناءً على قرب موعد الاستحقاق
            if (daysRemaining < 0) {
                row.style.backgroundColor = '#ffeded'; // متأخر
            } else if (daysRemaining <= 3) {
                row.style.backgroundColor = '#fff8e1'; // قريب
            }
            
            row.innerHTML = `
                <td>${res.client}</td>
                <td>${actor.name}</td>
                <td>${actor.fee} ريال</td>
                <td>${res.actorDueDate}</td>
                <td>${daysRemaining < 0 ? 
                    `<span style="color:red">متأخر بـ ${Math.abs(daysRemaining)} يوم</span>` : 
                    daysRemaining + ' يوم'}</td>
                <td>
                    <button class="btn btn-sm" onclick="markActorPaid('${res.id}')">
                        <i class='bx bx-check-circle'></i> تم الدفع
                    </button>
                </td>
            `;
            
            duePaymentsTable.appendChild(row);
        });
    });
    
    // إذا لم يكن هناك مستحقات، عرض رسالة
    if (duePaymentsTable.children.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" style="text-align:center">لا توجد مستحقات للدفع</td>`;
        duePaymentsTable.appendChild(row);
    }
}

// وظيفة لعرض جدول المدفوعات المكتملة
function renderPaidPaymentsTable(clientFilter = '', fromDate = '', toDate = '') {
    const paidPaymentsTable = document.getElementById('paidPaymentsTable').querySelector('tbody');
    paidPaymentsTable.innerHTML = '';
    
    // فلترة الحجوزات بناءً على المعايير
    const filteredReservations = reservations.filter(res => {
        // فقط الحجوزات المدفوعة للمعلقين
        if (!res.actorPaid) return false;
        
        // فلترة حسب العميل إذا تم تحديده
        if (clientFilter && !res.client.includes(clientFilter)) return false;
        
        // فلترة حسب تاريخ الدفع إذا تم تحديده
        if (fromDate || toDate) {
            if (!res.paidDate) return false;
            
            const paidDateObj = new Date(res.paidDate);
            
            if (fromDate) {
                const fromDateObj = new Date(fromDate);
                if (paidDateObj < fromDateObj) return false;
            }
            
            if (toDate) {
                const toDateObj = new Date(toDate);
                if (paidDateObj > toDateObj) return false;
            }
        }
        
        return true;
    });
    
    // عرض الحجوزات المدفوعة في الجدول
    filteredReservations.forEach(res => {
        const row = document.createElement('tr');
        
        // جمع أسماء المعلقين المشاركين
        const actorNames = res.voiceActors.map(actor => actor.name).join('، ');
        
        // حساب إجمالي المبالغ المدفوعة للمعلقين
        const totalActorFees = res.voiceActors.reduce((sum, actor) => sum + actor.fee, 0);
        
        row.innerHTML = `
            <td>${res.client}</td>
            <td>${actorNames}</td>
            <td>${totalActorFees} ريال</td>
            <td>${res.paidDate || '-'}</td>
        `;
        
        paidPaymentsTable.appendChild(row);
    });
    
    // إذا لم يكن هناك مدفوعات، عرض رسالة
    if (paidPaymentsTable.children.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" style="text-align:center">لا توجد مدفوعات مكتملة</td>`;
        paidPaymentsTable.appendChild(row);
    }
}

// وظيفة تحديث إحصائيات المستحقات
function updateDueAmountStatistics(clientFilter = '', fromDate = '', toDate = '') {
    let totalDue = 0;
    let overdueDue = 0;
    
    // تاريخ اليوم للمقارنة
    const today = new Date();
    
    // حساب المستحقات
    reservations.forEach(res => {
        // تخطي الحجوزات المدفوعة
        if (res.actorPaid) return;
        
        // فلترة حسب العميل إذا تم تحديده
        if (clientFilter && !res.client.includes(clientFilter)) return;
        
        // فلترة حسب التاريخ إذا تم تحديده
        let includeDue = true;
        if (fromDate || toDate) {
            const dueDateObj = new Date(res.actorDueDate);
            
            if (fromDate) {
                const fromDateObj = new Date(fromDate);
                if (dueDateObj < fromDateObj) includeDue = false;
            }
            
            if (toDate) {
                const toDateObj = new Date(toDate);
                if (dueDateObj > toDateObj) includeDue = false;
            }
        }
        
        if (includeDue) {
            // حساب إجمالي أجور المعلقين
            const actorFees = res.voiceActors.reduce((sum, actor) => sum + actor.fee, 0);
            totalDue += actorFees;
            
            // التحقق مما إذا كان الدفع متأخرًا
            const dueDate = new Date(res.actorDueDate);
            if (dueDate < today) {
                overdueDue += actorFees;
            }
        }
    });
    
    // عرض الإحصائيات في الواجهة
    document.getElementById('totalDueAmount').textContent = `${totalDue.toLocaleString()} ريال`;
    document.getElementById('overdueDueAmount').textContent = `${overdueDue.toLocaleString()} ريال`;
}

// إضافة وظيفة تحديث قائمة الفواتير المنسدلة
function populateInvoiceDatalist() {
    const invoiceList = document.getElementById("invoiceList");
    if (!invoiceList) return;
    
    invoiceList.innerHTML = invoices.map(inv => `<option value="${inv.invoiceNumber}">`).join("");
}

// إضافة وظيفة عرض سجل الفواتير
function renderInvoiceAuditLogTable() {
    const auditLogTable = document.querySelector('#invoices .card:last-child .table-container table tbody');
    if (!auditLogTable) return;
    
    auditLogTable.innerHTML = '';
    
    // عرض سجل العمليات بترتيب تنازلي (الأحدث أولاً)
    const sortedLogs = [...invoiceAuditLog].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedLogs.forEach(log => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.operation}</td>
            <td>${log.invoiceNumber}</td>
            <td>${log.date}</td>
        `;
        auditLogTable.appendChild(row);
    });
}

// إصلاح دالة استيراد البيانات (مفقودة)
function importData(fileInput) {
    alert("وظيفة استيراد البيانات قيد التطوير");
    // يمكن إضافة الكود الخاص بهذه الوظيفة لاحقًا
}

// إصلاح دالة تصدير البيانات (مفقودة)
function exportData() {
    // تحضير البيانات للتصدير
    const dataToExport = {
        balance: balance,
        voices: voices,
        clients: clients,
        reservations: reservations,
        invoices: invoices
    };
    
    // تحويل البيانات إلى نص JSON
    const jsonData = JSON.stringify(dataToExport, null, 2);
    
    // إنشاء رابط للتحميل
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // إنشاء عنصر رابط مؤقت للتحميل
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_data_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // تنظيف الذاكرة
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

// إضافة دوال استيراد الحجوزات (مفقودة)
function importReservations(fileInput) {
    alert("وظيفة استيراد الحجوزات قيد التطوير");
    // يمكن إضافة الكود الخاص بهذه الوظيفة لاحقًا
}

// إضافة تعريف لمتغيرات الـDashboard Data العالمية إذا كانت غير موجودة
const dashboardData = {
    reservations: [],
    invoices: [],
    revenue: 0,
    expenses: 0
};

// إضافة دالة تحديث البيانات
function updateDashboardData(type, data) {
    dashboardData[type] = data;
    
    // تحديث المخططات إذا كانت موجودة
    if (type === 'reservations' && reservationChart && reservationBarChart) {
        const reservationsByDate = processReservationsByDate(data);
        const labels = Object.keys(reservationsByDate).sort();
        const chartData = labels.map(date => reservationsByDate[date]);
        
        reservationChart.data.labels = labels;
        reservationChart.data.datasets[0].data = chartData;
        reservationChart.update();
        
        const reservationsByClient = processReservationsByClient(data);
        const clientLabels = Object.keys(reservationsByClient).slice(0, 6);
        const clientData = clientLabels.map(client => reservationsByClient[client]);
        
        reservationBarChart.data.labels = clientLabels;
        reservationBarChart.data.datasets[0].data = clientData;
        reservationBarChart.update();
    } else if (type === 'invoices' && invoiceRevenueChart) {
        const invoiceRevenue = processInvoiceRevenue(data);
        const labels = Object.keys(invoiceRevenue).sort();
        const chartData = labels.map(month => invoiceRevenue[month]);
        
        invoiceRevenueChart.data.labels = labels;
        invoiceRevenueChart.data.datasets[0].data = chartData;
        invoiceRevenueChart.update();
    } else if (type === 'revenue-expense' && revenueExpenseChart) {
        // تحديث مخطط الإيرادات والمصروفات
        const labels = revenueExpenseChart.data.labels;
        const revenueData = Array(labels.length).fill(data.revenue / labels.length);
        const expenseData = Array(labels.length).fill(data.expenses / labels.length);
        
        revenueExpenseChart.data.datasets[0].data = revenueData;
        revenueExpenseChart.data.datasets[1].data = expenseData;
        revenueExpenseChart.update();
    }
}

// تحميل الصفحة وتهيئة الدوال
document.addEventListener("DOMContentLoaded", function() {
    // إنشاء المودالات في بداية تحميل الصفحة
    if (!document.getElementById('editVoiceModal')) createEditVoiceModal();
    if (!document.getElementById('editClientModal')) createEditClientModal();
    if (!document.getElementById('editReservationModal')) createEditReservationModal();
    
    // تهيئة البيانات
    populateDatalists();
    
    try {
        populateInvoiceDatalist();
    } catch (e) {
        console.error("خطأ في تحميل قوائم الفواتير:", e);
    }
    
    try {
        initCharts();
    } catch (e) {
        console.error("خطأ في تهيئة المخططات البيانية:", e);
    }
    
    updateAllStatistics();
    updateClientsTable();
    
    // تحديث الجداول
    try {
        renderInvoicesTable();
    } catch (e) {
        console.error("خطأ في عرض جدول الفواتير:", e);
    }
    
    try {
        renderInvoiceAuditLogTable();
    } catch (e) {
        console.error("خطأ في عرض سجل الفواتير:", e);
    }
    
    try {
        renderReservationsTable();
    } catch (e) {
        console.error("خطأ في عرض جدول الحجوزات:", e);
    }
    
    try {
        renderReports();
    } catch (e) {
        console.error("خطأ في عرض التقارير:", e);
    }
    
    // حفظ الحالة الأولية
    saveState();
});

// وظيفة لتطبيق الفلترة على التقارير
function renderReports() {
    const clientFilter = document.getElementById('reportClientFilter').value.trim();
    const fromDate = document.getElementById('reportFromDate').value;
    const toDate = document.getElementById('reportToDate').value;
    
    // تحديث جداول التقارير
    renderDuePaymentsTable(clientFilter, fromDate, toDate);
    renderPaidPaymentsTable(clientFilter, fromDate, toDate);
    
    // حساب وعرض إحصائيات المستحقات
    updateDueAmountStatistics(clientFilter, fromDate, toDate);
}

// وظيفة تبديل نوع الرسم البياني
function toggleChartType(chartId, newType) {
    let chartReference;
    
    // تحديد الرسم البياني المستهدف
    switch (chartId) {
        case 'reservationChart':
            chartReference = reservationChart;
            break;
        case 'reservationBarChart':
            chartReference = reservationBarChart;
            break;
        case 'revenueExpenseChart':
            chartReference = revenueExpenseChart;
            break;
        case 'invoiceRevenueChart':
            chartReference = invoiceRevenueChart;
            break;
        default:
            return;
    }
    
    if (!chartReference) return;
    
    // حفظ البيانات الحالية
    const currentData = chartReference.data;
    
    // تعيين النوع الجديد والتكوين المناسب
    switch (newType) {
        case 'line':
            chartReference.config.type = 'line';
            chartReference.data.datasets.forEach(dataset => {
                dataset.tension = 0.3;
                dataset.fill = true;
                dataset.borderWidth = 2;
                dataset.pointRadius = 4;
                dataset.pointHoverRadius = 6;
            });
            break;
        case 'bar':
            chartReference.config.type = 'bar';
            chartReference.data.datasets.forEach(dataset => {
                dataset.tension = 0;
                dataset.fill = false;
                dataset.borderWidth = 1;
            });
            break;
        case 'area':
            chartReference.config.type = 'line';
            chartReference.data.datasets.forEach(dataset => {
                dataset.tension = 0.4;
                dataset.fill = true;
                dataset.borderWidth = 1;
                dataset.pointRadius = 0;
            });
            break;
        case 'pie':
            // تحويل إلى رسم دائري
            chartReference.config.type = 'pie';
            chartReference.data.datasets.forEach(dataset => {
                dataset.backgroundColor = [
                    '#12846e', '#2ecc71', '#3498db', 
                    '#9b59b6', '#f1c40f', '#e67e22',
                    '#e74c3c', '#1abc9c', '#34495e'
                ];
                dataset.borderWidth = 1;
                dataset.borderColor = '#fff';
                dataset.hoverOffset = 10;
            });
            break;
        case 'doughnut':
            // تحويل إلى رسم حلقي
            chartReference.config.type = 'doughnut';
            chartReference.data.datasets.forEach(dataset => {
                dataset.backgroundColor = [
                    '#12846e', '#2ecc71', '#3498db', 
                    '#9b59b6', '#f1c40f', '#e67e22',
                    '#e74c3c', '#1abc9c', '#34495e'
                ];
                dataset.borderWidth = 1;
                dataset.borderColor = '#fff';
                dataset.hoverOffset = 10;
            });
            break;
        default:
            return;
    }
    
    // تحديث الرسم البياني مع الحفاظ على البيانات الحالية
    chartReference.update();
    
    // تنشيط الزر المختار
    const parent = document.querySelector(`#${chartId}`).closest('.chart-area');
    const buttons = parent.querySelectorAll('.chart-controls button');
    buttons.forEach(button => {
        if (button.textContent.includes(getChartTypeName(newType))) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Helper function to get chart type name in Arabic
function getChartTypeName(type) {
    switch (type) {
        case 'line': return 'خطي';
        case 'bar': return 'عمودي';
        case 'area': return 'مساحي';
        case 'pie': return 'دائري';
        case 'doughnut': return 'حلقي';
        default: return '';
    }
}

// وظيفة فتح مودال الحجز الجديد عند النقر على زر حجز جديد
function openNewReservationModal() {
    // عرض المودال
    document.getElementById('newReservationModal').classList.add('active');
    
    // تحضير المودال بقيم افتراضية
    document.getElementById('newResClient').value = '';
    document.getElementById('newResTime').value = '';
    document.getElementById('newResWorkPrice').value = '';
    document.getElementById('newResInvoiceNumber').value = '';
    document.getElementById('newResDueDate').value = '';
    document.getElementById('newResPaid').checked = false;
    document.getElementById('newResNotes').value = '';
    
    // مسح قائمة المعلقين
    const actorsList = document.querySelector('#newReservationModal .modal-content div[style*="background:var(--primary-light)"]');
    actorsList.innerHTML = '';
    
    // مسح حقول إضافة معلق
    document.getElementById('tempActorName').value = '';
    document.getElementById('tempActorFee').value = '';
}

// وظيفة لإضافة حجز جديد
function addNewReservation() {
    const client = document.getElementById('newResClient').value.trim();
    const recordTime = document.getElementById('newResTime').value;
    const workPrice = parseFloat(document.getElementById('newResWorkPrice').value) || 0;
    const invoiceNumber = document.getElementById('newResInvoiceNumber').value.trim();
    const dueDate = document.getElementById('newResDueDate').value;
    const isPaid = document.getElementById('newResPaid').checked;
    const notes = document.getElementById('newResNotes').value.trim();
    
    if (!client || !recordTime || !workPrice) {
        alert("يرجى تعبئة الحقول المطلوبة: العميل، التاريخ والوقت، وسعر العمل");
        return;
    }
    
    // حفظ الحالة قبل التغيير
    saveState();
    
    // استخراج المعلقين وأجورهم من المودال
    const actorsList = document.querySelector('#newReservationModal .modal-content div[style*="background:var(--primary-light)"]');
    const voiceActors = [];
    
    Array.from(actorsList.children).forEach(actorElement => {
        const actorText = actorElement.querySelector('div').textContent;
        const nameMatch = actorText.match(/<strong>(.*?)<\/strong>/);
        const feeMatch = actorText.match(/(\d+) ريال/);
        
        if (!nameMatch || !feeMatch) {
            // إذا لم يتم استخراج الاسم أو الرسوم بشكل صحيح، استخراجها بطريقة أخرى
            const parts = actorText.split(' - ');
            const name = parts[0].replace(/<strong>|<\/strong>/g, '');
            const fee = parseInt(parts[1]) || 0;
            voiceActors.push({ name: name, fee: fee });
        } else {
            const name = nameMatch[1];
            const fee = parseInt(feeMatch[1]) || 0;
            voiceActors.push({ name: name, fee: fee });
        }
    });
    
    // إنشاء معرف فريد للحجز
    const newId = "#RES-" + (reservations.length + 1).toString().padStart(3, '0');
    
    // إضافة الحجز
    reservations.push({
        id: newId,
        client: client,
        recordTime: recordTime,
        workPrice: workPrice,
        voiceActors: voiceActors,
        invoiceNumber: invoiceNumber,
        actorDueDate: dueDate,
        actorPaid: isPaid,
        notes: notes,
        paidDate: isPaid ? new Date().toISOString().split('T')[0] : "",
        invoicePaid: false // يمكن تعديله لاحقًا إذا كان مرتبطا بفاتورة مدفوعة
    });
    
    // إذا كان مرتبطًا بفاتورة، تحديث حالة الدفع
    if (invoiceNumber) {
        const linkedInvoice = invoices.find(inv => inv.invoiceNumber === invoiceNumber);
        if (linkedInvoice) {
            reservations[reservations.length - 1].invoicePaid = linkedInvoice.isPaid;
        }
    }
    
    // تحديث الجدول
    renderReservationsTable();
    
    // تحديث الإحصائيات
    updateAllStatistics();
    
    // تحديث التقارير والمستحقات - إضافة هذا السطر لحل المشكلة
    renderReports();
    
    // إغلاق المودال
    closeModal('newReservationModal');
    
    alert("تم إضافة الحجز بنجاح");
}

// وظيفة تسجيل دفع مستحقات المعلق
function markActorPaid(reservationId) {
    // البحث عن الحجز بالمعرف
    const reservationIndex = reservations.findIndex(res => res.id === reservationId);
    if (reservationIndex === -1) {
        alert("لم يتم العثور على الحجز!");
        return;
    }
    
    // تأكيد العملية
    if (!confirm('هل تريد تأكيد دفع مستحقات المعلقين لهذا الحجز؟')) {
        return;
    }
    
    // حفظ الحالة قبل التغيير
    saveState();
    
    // تعديل حالة الدفع
    reservations[reservationIndex].actorPaid = true;
    reservations[reservationIndex].paidDate = new Date().toISOString().split('T')[0];
    
    // تحديث التقارير
    renderReports();
    
    // تحديث الإحصائيات
    updateAllStatistics();
    
    alert("تم تسجيل الدفع بنجاح");
}

// وظيفة تشغيل استيراد الحجوزات عبر زر
function triggerReservationsImport() {
    document.getElementById("reservationsImportFile").click();
}

// وظيفة تعليم الفاتورة كمدفوعة
function markInvoiceAsPaid(index) {
    const invoice = invoices[index];
    if (!invoice) return;
    
    if (invoice.isPaid) {
        alert("هذه الفاتورة مدفوعة بالفعل");
        return;
    }
    
    // تأكيد العملية
    if (!confirm('هل تريد تعليم هذه الفاتورة كمدفوعة؟')) {
        return;
    }
    
    // حفظ الحالة قبل التغيير
    saveState();
    
    // تعديل حالة الدفع
    invoice.isPaid = true;
    invoice.paymentDate = new Date().toISOString().split('T')[0]; // تاريخ اليوم
    invoice.receivedAmount = invoice.invoiceAmount; // افتراض أن المبلغ المستلم يساوي المبلغ الإجمالي
    
    // تحديث الحجوزات المرتبطة بالفاتورة
    reservations.forEach(reservation => {
        if (reservation.invoiceNumber === invoice.invoiceNumber) {
            reservation.invoicePaid = true;
            reservation.paidDate = invoice.paymentDate;
        }
    });
    
    // إضافة سجل العملية
    invoiceAuditLog.push({
        operation: "Mark Paid",
        invoiceNumber: invoice.invoiceNumber,
        date: new Date().toLocaleString()
    });
    
    // تحديث العرض
    renderInvoicesTable();
    renderInvoiceAuditLogTable();
    renderReservationsTable();
    
    // تحديث الإحصائيات
    updateAllStatistics();
    
    alert("تم تعليم الفاتورة كمدفوعة بنجاح");
}

// متغيرات جديدة للحفظ التلقائي
let hasUnsavedChanges = false;
let autoSaveInterval = null;
let lastSaveTime = null;
let autoSaveDelay = 30000; // حفظ كل 30 ثانية
let isAutoSaving = false;

// إزالة الحفظ التلقائي المحلي واستبداله بالنسخ الاحتياطي السحابي التلقائي
function setupAutoSave() {
    // إذا كان النسخ الاحتياطي التلقائي مفعلًا في التخزين المحلي
    const autoBackupEnabled = localStorage.getItem('autoBackupEnabled') === 'true';
    
    if (autoBackupEnabled && typeof setupAutoBackup === 'function') {
        // محاولة تشغيل الحفظ التلقائي السحابي إذا كان مسجل الدخول
        const savedToken = localStorage.getItem('gDriveToken');
        if (savedToken) {
            setupAutoBackup();
        }
    }
    
    // إضافة حدث استماع للنافذة عند مغادرة الصفحة للتحذير
    window.addEventListener('beforeunload', function(e) {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = 'لديك تغييرات غير محفوظة. هل أنت متأكد من مغادرة الصفحة؟';
            return e.returnValue;
        }
    });
}

// تعديل وظيفة الحفظ التلقائي لتستخدم النسخ السحابي
function autoSave() {
    if (!hasUnsavedChanges) return;
    
    // حفظ سحابي تلقائي فقط إذا كان المستخدم مسجل الدخول
    const savedToken = localStorage.getItem('gDriveToken');
    if (savedToken && typeof backupToDrive === 'function') {
        backupToDrive(false); // false للإشارة إلى أنه حفظ تلقائي وليس يدوي
        hasUnsavedChanges = false;
    }
}

// تعديل وظيفة manualSave لاستخدام الحفظ السحابي
function manualSave() {
    // استدعاء وظيفة حفظ النسخة الاحتياطية مع المعلمة true للإشارة إلى أنها عملية يدوية
    if (typeof backupToDrive === 'function') {
        backupToDrive(true);
    } else {
        console.error('وظيفة backupToDrive غير متاحة. قد يكون هناك خطأ في تحميل ملف cloud-backup.js');
        
        // محاولة تحميل ملف cloud-backup.js ثم تنفيذ الحفظ
        const script = document.createElement('script');
        script.src = 'cloud-backup.js';
        script.onload = function() {
            if (typeof backupToDrive === 'function') {
                backupToDrive(true);
            } else {
                alert('تعذر الوصول إلى خدمة التخزين السحابي. يرجى التأكد من الاتصال بالإنترنت وتحديث الصفحة.');
            }
        };
        script.onerror = function() {
            alert('فشل في تحميل خدمة التخزين السحابي. يرجى التأكد من الاتصال بالإنترنت وتحديث الصفحة.');
        };
        document.head.appendChild(script);
    }
}

// تعديل وظيفة openBackups لفتح إعدادات الحفظ السحابي مباشرة دون وسيط
function openBackups() {
    openCloudSettings();
}

// وظيفة مساعدة لفتح إعدادات التخزين السحابي إذا لم تكن موجودة في ملف cloud-backup.js
function openCloudSettings() {
    const modal = document.getElementById('cloudSettingsModal');
    if (modal) {
        modal.classList.add('active');
        
        // تحديث حالة الاتصال بـ Google Drive إذا كانت الوظيفة متوفرة
        if (typeof googleDriveAuth !== 'undefined' && typeof googleDriveAuth.checkAuthStatus === 'function') {
            googleDriveAuth.checkAuthStatus();
        }
    } else {
        console.error("لم يتم العثور على مودال إعدادات التخزين السحابي");
        alert("تعذر فتح إعدادات التخزين السحابي. يرجى تحديث الصفحة والمحاولة مرة أخرى.");
    }
}

// وظيفة استعادة النسخ الاحتياطية من السحابة
function restoreBackup(backupId) {
    // هذه الدالة معطلة الآن لأننا نستخدم استعادة النسخ من السحابة
    alert('تم نقل وظيفة استعادة النسخ الاحتياطية إلى التخزين السحابي');
    openCloudSettings();
}

// وظيفة حذف النسخ الاحتياطية من السحابة
function deleteBackup(backupId) {
    // هذه الدالة معطلة الآن لأننا نستخدم حذف النسخ من السحابة
    alert('تم نقل وظيفة حذف النسخ الاحتياطية إلى التخزين السحابي');
    openCloudSettings();
}

// إزالة وظيفة saveToLocalStorage واستبدالها بوظيفة مؤقتة
function saveToLocalStorage() {
    console.log("تم تعطيل الحفظ المحلي واستبداله بالتخزين السحابي");
    return false;
}

// محاولة استرجاع البيانات من التخزين المحلي
function tryRestoreFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('dashboardData');
        if (!savedData) return false;
        
        const parsedData = JSON.parse(savedData);
        if (!parsedData || !parsedData.savedAt) return false;
        
        // التحقق من تاريخ الحفظ (لا تسترجع البيانات إذا كانت قديمة جداً، مثلاً أكثر من 7 أيام)
        const savedDate = new Date(parsedData.savedAt);
        const now = new Date();
        const diffDays = (now - savedDate) / (1000 * 60 * 60 * 24);
        
        if (diffDays > 7) {
            console.log("البيانات المحفوظة قديمة جداً (أكثر من 7 أيام). لم يتم استرجاعها.");
            return false;
        }
        
        // استرجاع البيانات
        if (parsedData.balance) balance = parsedData.balance;
        if (parsedData.voices) voices = parsedData.voices;
        if (parsedData.clients) clients = parsedData.clients;
        if (parsedData.reservations) reservations = parsedData.reservations;
        if (parsedData.invoices) invoices = parsedData.invoices;
        if (parsedData.invoiceAuditLog) invoiceAuditLog = parsedData.invoiceAuditLog;
        
        console.log("تم استرجاع البيانات المحفوظة من: " + savedDate.toLocaleString());
        
        // تحديث العرض
        updateAllStatistics();
        updateClientsTable();
        renderReservationsTable();
        renderInvoicesTable();
        renderInvoiceAuditLogTable();
        populateDatalists();
        populateInvoiceDatalist();
        
        // تحديث المخططات
        if (typeof updateCharts === 'function') {
            try {
                updateCharts('day');
            } catch (chartError) {
                console.error("خطأ في تحديث المخططات البيانية:", chartError);
            }
        }
        
        return true;
    } catch (error) {
        console.error("خطأ في استرجاع البيانات من التخزين المحلي:", error);
        return false;
    }
}

// إضافة وظيفة جديدة لحفظ البيانات يدوياً
function manualSave() {
    isAutoSaving = true;
    showSaveIndicator();
    
    try {
        // حفظ البيانات في التخزين المحلي
        if (saveToLocalStorage()) {
            lastSaveTime = new Date();
            hasUnsavedChanges = false;
            alert("تم حفظ البيانات بنجاح في: " + lastSaveTime.toLocaleTimeString());
        } else {
            alert("حدث خطأ أثناء محاولة حفظ البيانات");
        }
    } catch (error) {
        console.error("خطأ في الحفظ اليدوي:", error);
        alert("خطأ في الحفظ: " + error.message);
    } finally {
        // إخفاء مؤشر الحفظ بعد ثانية
        setTimeout(() => {
            hideSaveIndicator();
            isAutoSaving = false;
        }, 1000);
    }
}

// وظيفة فتح النسخ الاحتياطية
function openBackups() {
    // التحقق إذا كان المستخدم مسجل الدخول إلى Google Drive
    const savedToken = localStorage.getItem('gDriveToken');
    
    if (savedToken) {
        // فتح نافذة النسخ الاحتياطية السحابية
        if (typeof listDriveBackups === 'function') {
            openCloudSettings();
        } else {
            alert('خدمة التخزين السحابي غير متاحة حالياً.');
        }
    } else {
        // إذا لم يكن مسجل الدخول، فتح نافذة إعدادات الحفظ السحابي للتسجيل
        openCloudSettings();
        alert('يرجى تسجيل الدخول إلى Google Drive أولاً لعرض النسخ الاحتياطية');
    }
}

// تجنب تحميل XLSX ودعم SheetJS إذا كان غير متوفر
window.onerror = function(message, source, lineno, colno, error) {
    if (message.includes('XLSX is not defined') || message.includes('sheet_js')) {
        console.warn("SheetJS (XLSX) غير متوفر. سيتم تعطيل وظائف استيراد/تصدير Excel.");
        
        // إنشاء رسالة تنبيه في واجهة المستخدم
        let xlsxWarning = document.createElement('div');
        xlsxWarning.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #fff3cd;
            color: #856404;
            border-left: 4px solid #ffeeba;
            padding: 10px 15px;
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            z-index: 9999;
            font-size: 14px;
        `;
        xlsxWarning.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
                <i class='bx bx-error-circle' style="font-size:20px;"></i>
                <div>
                    <strong>تنبيه:</strong> مكتبة SheetJS (XLSX) غير متوفرة.
                    <br>بعض وظائف الاستيراد والتصدير قد لا تعمل.
                </div>
                <button onclick="this.parentNode.parentNode.remove()" style="background:none;border:none;cursor:pointer;font-size:18px;margin-right:5px;">×</button>
            </div>
        `;
        
        document.body.appendChild(xlsxWarning);
        setTimeout(() => { xlsxWarning.remove(); }, 8000);
        
        return true;  // منع ظهور الخطأ في وحدة تحكم المتصفح
    }
    return false;  // السماح بمعالجة الخطأ بشكل طبيعي
};

// وظيفة لفتح إعدادات التخزين السحابي
function openCloudSettings() {
    // التحقق من وجود الملف المطلوب للمصادقة
    if (typeof googleDriveAuth === 'undefined') {
        // محاولة تحميل ملف cloud-backup.js إذا لم يكن محملاً
        const script = document.createElement('script');
        script.src = 'cloud-backup.js';
        script.onload = function() {
            showCloudSettingsModal();
        };
        script.onerror = function() {
            alert('لم يتم العثور على ملف cloud-backup.js. الرجاء التأكد من وجود الملف في المجلد.');
        };
        document.head.appendChild(script);
    } else {
        showCloudSettingsModal();
    }
}

// وظيفة لإظهار مودال إعدادات التخزين السحابي
function showCloudSettingsModal() {
    const modal = document.getElementById('cloudSettingsModal');
    if (modal) {
        modal.classList.add('active');
        
        // تحديث حالة الاتصال بـ Google Drive إذا كان متاحاً
        if (typeof googleDriveAuth !== 'undefined' && typeof googleDriveAuth.checkAuthStatus === 'function') {
            googleDriveAuth.checkAuthStatus();
        }
    } else {
        console.error("لم يتم العثور على مودال إعدادات التخزين السحابي");
    }
}

// إضافة وظائف للصفحة الرئيسية وقسم الميزات
document.addEventListener("DOMContentLoaded", function() {
    // الوظائف الحالية
    // ...existing code...
    
    // إضافة مستمع للأحداث لزر اكتشف المزيد
    const discoverMoreBtn = document.querySelector('.hero-btn');
    if (discoverMoreBtn) {
        discoverMoreBtn.addEventListener('click', toggleFeaturesShowcase);
    }
    
    // إضافة مستمع للأحداث لزر إغلاق قسم الميزات
    const closeShowcaseBtn = document.getElementById('closeShowcaseBtn');
    if (closeShowcaseBtn) {
        closeShowcaseBtn.addEventListener('click', toggleFeaturesShowcase);
    }
});

// وظيفة لإظهار/إخفاء قسم عرض الميزات
function toggleFeaturesShowcase() {
    const featuresShowcase = document.getElementById('featuresShowcase');
    if (featuresShowcase) {
        featuresShowcase.classList.toggle('active');
        
        // التمرير إلى قسم الميزات عند إظهاره
        if (featuresShowcase.classList.contains('active')) {
            featuresShowcase.scrollIntoView({ behavior: 'smooth' });
            
            // تغيير نص الزر إذا تم الضغط عليه
            const heroBtn = document.querySelector('.hero-btn');
            if (heroBtn && heroBtn.textContent.trim() === 'اكتشف المزيد') {
                heroBtn.textContent = 'إخفاء التفاصيل';
            }
        } else {
            // إعادة نص الزر إلى الأصل
            const heroBtn = document.querySelector('.hero-btn');
            if (heroBtn && heroBtn.textContent.trim() === 'إخفاء التفاصيل') {
                heroBtn.textContent = 'اكتشف المزيد';
            }
        }
    }
}

// ...existing code...

// وظيفة جديدة للمزامنة التلقائية مع السحابة
function autoSyncWithCloud() {
    // التحقق مما إذا كان الوضع هو وضع تسجيل الدخول أم لا
    const isLoggedIn = !document.getElementById('loginModal') || 
                       document.getElementById('loginModal').style.display === 'none';
    
    if (!isLoggedIn) {
        // إذا لم يتم تسجيل الدخول بعد، انتظر حتى يتم تسجيل الدخول
        console.log("سيتم المزامنة بعد تسجيل الدخول");
        hideSyncIndicator();
        return;
    }
    
    // التحقق إذا كانت ميزة المزامنة التلقائية مفعلة
    const autoSyncEnabled = localStorage.getItem('autoSyncEnabled') !== 'false'; // افتراضيًا مفعلة
    
    if (!autoSyncEnabled) {
        console.log("المزامنة التلقائية معطلة في الإعدادات");
        hideSyncIndicator();
        return;
    }
    
    // التحقق من وجود توكن وصول لـ Google Drive
    const savedToken = localStorage.getItem('gDriveToken');
    const tokenExpiry = localStorage.getItem('gDriveTokenExpiry');
    
    if (savedToken && tokenExpiry && parseInt(tokenExpiry) > Date.now()) {
        showSyncIndicator("جاري المزامنة مع آخر نسخة احتياطية...");
        
        // استدعاء وظيفة استعادة آخر نسخة احتياطية من الملف cloud-backup.js
        if (typeof autoRestoreLatestBackup === 'function') {
            autoRestoreLatestBackup()
                .then(result => {
                    if (result.success) {
                        showSyncSuccess("تمت المزامنة", `تم تحميل آخر نسخة: ${result.backupName}`);
                    } else if (result.skipped) {
                        // لا نظهر أي إشعار إذا تم تخطي المزامنة
                        console.log("تم تخطي المزامنة: " + result.message);
                    }
                    hideSyncIndicator();
                })
                .catch(error => {
                    console.error("فشل في المزامنة التلقائية:", error);
                    showSyncError("فشل في المزامنة", "حدث خطأ أثناء محاولة المزامنة.");
                    hideSyncIndicator();
                });
        } else {
            console.error("وظيفة autoRestoreLatestBackup غير متوفرة");
            hideSyncIndicator();
        }
    } else {
        console.log("لم يتم العثور على جلسة مصادقة لـ Google Drive");
        hideSyncIndicator();
    }
}

// إضافة مؤشر المزامنة
function showSyncIndicator(message) {
    let syncIndicator = document.getElementById('syncIndicator');
    
    if (!syncIndicator) {
        syncIndicator = document.createElement('div');
        syncIndicator.id = 'syncIndicator';
        syncIndicator.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--card-bg);
            border-right: 4px solid var(--primary-color);
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 9000;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: var(--shadow);
            transition: all 0.3s ease;
        `;
        document.body.appendChild(syncIndicator);
    }
    
    syncIndicator.innerHTML = `
        <i class='bx bx-sync bx-spin' style="color: var(--primary-color); font-size: 20px;"></i>
        <span>${message}</span>
    `;
    
    syncIndicator.style.opacity = '1';
    syncIndicator.style.visibility = 'visible';
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

// إظهار رسالة نجاح المزامنة
function showSyncSuccess(title, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--success-color);
        color: white;
        padding: 15px 30px;
        border-radius: var(--border-radius);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: fadeIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <i class='bx bx-check-circle' style="font-size: 24px;"></i>
        <div>
            <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
            <div style="font-size: 13px;">${message}</div>
        </div>
        <button onclick="this.parentNode.remove()" style="position: absolute; top: 8px; right: 8px; background: none; border: none; cursor: pointer; font-size: 18px; color: white;">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // إزالة الإشعار بعد 4 ثوانِ
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 4000);
}

// محاولة استرجاع البيانات من التخزين المحلي - إلغاء لتفادي التعارض مع المزامنة السحابية
function tryRestoreFromLocalStorage() {
    // تم إلغاء هذه الوظيفة لتفادي التعارض مع المزامنة السحابية التلقائية
    console.log("تم تعطيل الاسترجاع من التخزين المحلي لصالح المزامنة السحابية");
    return false;
}