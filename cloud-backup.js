/**
 * Google Drive Backup Integration
 * هذا الملف يحتوي على وظائف الربط مع Google Drive للنسخ الاحتياطي
 */

// متغيرات عالمية
const CLIENT_ID = '130066451884-uaka7mfj9fjntfgogp4bntlumr4e5f8m.apps.googleusercontent.com';
// لا تستخدم CLIENT_SECRET في كود الواجهة الأمامية - قد يسبب مشاكل أمنية
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata';
// javascript_origins هي المواقع المصرح لها باستخدام واجهة برمجة التطبيقات
const JAVASCRIPT_ORIGINS = [
    'http://127.0.0.1:3000',  // بيئة محلية
    'http://127.0.0.1:5500',  // بيئة محلية
    'http://localhost:3000',  // بيئة محلية
    'http://127.0.0.1:5000',  // بيئة محلية
    'http://localhost:5000',  // بيئة محلية
    'https://financial-dashboard.replit.app',  // بيئة Replit
    'https://*.replit.app'    // أي تطبيق في بيئة Replit
];

let tokenClient;
let accessToken = null;
let pickerInited = false;
let driveAPILoaded = false;
let backupFolderId = null;
let gapiInited = false;
let gisInited = false;

// فحص فوري للتوكن المحفوظ في التخزين المحلي
const savedToken = localStorage.getItem('gDriveToken');
const tokenExpiry = localStorage.getItem('gDriveTokenExpiry');
if (savedToken && tokenExpiry && parseInt(tokenExpiry) > Date.now()) {
    console.log('تم العثور على توكن صالح في التخزين المحلي');
    accessToken = savedToken;
}

/**
 * تهيئة مكتبات Google API
 */
function initializeGoogleAPI() {
    console.log('جاري محاولة تهيئة Google API...');
    
    // متغير لتتبع حالة التهيئة
    let apiInitTimeout;
    
    // استخدام مكتبات Google API المحمّلة مسبقًا من index.html
    try {
        if (typeof gapi !== 'undefined') {
            console.log('GAPI محمّل بالفعل، يتم تهيئة العميل...');
            gapi.load('client', initGapiClient);
        } else {
            console.log('GAPI غير محمّل، جاري محاولة التحميل...');
            loadScript('https://apis.google.com/js/api.js')
                .then(() => {
                    console.log('تم تحميل GAPI بنجاح');
                    gapi.load('client', initGapiClient);
                })
                .catch(err => {
                    console.error('فشل في تحميل مكتبة GAPI:', err);
                    const driveAuthMessage = document.getElementById('driveAuthMessage');
                    if (driveAuthMessage) {
                        driveAuthMessage.textContent = 'فشل في تحميل مكتبة Google API';
                        driveAuthMessage.style.color = 'red';
                    }
                    
                    // ضمان إمكانية الاستمرار مع الحفظ المحلي
                    window.checkGoogleApiSupport();
                });
        }
    } catch (e) {
        console.error('خطأ في تهيئة GAPI:', e);
    }

    try {
        if (typeof google !== 'undefined' && google.accounts) {
            console.log('GSI محمّل بالفعل، يتم تهيئة tokenClient...');
            initializeTokenClient();
        } else {
            console.log('GSI غير محمّل، جاري محاولة التحميل...');
            
            // محاولة تحميل GSI من عدة مصادر مختلفة
            const scriptUrlOptions = [
                'https://accounts.google.com/gsi/client',
                'https://apis.google.com/js/platform.js',
                'https://apis.google.com/js/api.js'
            ];
            
            // محاولة تحميل GSI من أول URL
            loadScript(scriptUrlOptions[0])
                .then(() => {
                    console.log('تم تحميل GSI بنجاح');
                    
                    // إعادة المحاولة بعد فترة قصيرة للتأكد من تحميل جميع وحدات GSI
                    setTimeout(() => {
                        if (typeof google !== 'undefined' && google.accounts) {
                            initializeTokenClient();
                        } else {
                            console.warn('فشل في تهيئة مكتبة GSI - استمرار في وضع التخزين المحلي');
                            window.checkGoogleApiSupport();
                        }
                    }, 1000);
                })
                .catch(err => {
                    console.error('فشل في تحميل مكتبة GSI:', err);
                    
                    // محاولة استخدام URLs بديلة
                    loadScript(scriptUrlOptions[1])
                        .then(() => {
                            console.log('تم تحميل GSI (المصدر البديل) بنجاح');
                            
                            // محاولة تهيئة العميل
                            setTimeout(initializeTokenClient, 1000);
                        })
                        .catch(err2 => {
                            console.error('فشل في تحميل GSI من المصدر البديل:', err2);
                            window.checkGoogleApiSupport();
                        });
                });
        }
    } catch (e) {
        console.error('خطأ في تهيئة GSI:', e);
        
        // ضمان استمرار التطبيق
        window.checkGoogleApiSupport();
    }
    
    // مؤقت للتأكد من اكتمال التهيئة خلال مدة زمنية
    apiInitTimeout = setTimeout(() => {
        console.warn('انتهاء مهلة تهيئة API - التحويل إلى الوضع المحلي');
        
        // تمكين استخدام التطبيق مع التخزين المحلي فقط
        window.checkGoogleApiSupport();
    }, 10000); // 10 ثوانٍ كحد أقصى للانتظار
}

// دالة منفصلة لتهيئة tokenClient
function initializeTokenClient() {
    try {
        // التأكد من توفر API
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
            throw new Error('مكتبة Google Identity Service غير متوفرة');
        }
        
        // محاولة تهيئة tokenClient
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    accessToken = tokenResponse.access_token;
                    // حفظ توكن في التخزين المحلي مع وقت انتهاء الصلاحية
                    localStorage.setItem('gDriveToken', accessToken);
                    localStorage.setItem('gDriveTokenExpiry', Date.now() + (tokenResponse.expires_in * 1000));
                    googleDriveAuth.checkAuthStatus();
                    console.log('تم الحصول على توكن بنجاح');
                    
                    // إظهار رسالة نجاح للمستخدم
                    const authMessage = document.getElementById('driveAuthMessage');
                    if (authMessage) {
                        authMessage.textContent = 'تم تسجيل الدخول بنجاح';
                        authMessage.style.color = 'green';
                    }
                }
            },
            error_callback: (err) => {
                console.error('حدث خطأ أثناء تسجيل الدخول:', err);
                const authMessage = document.getElementById('driveAuthMessage');
                if (authMessage) {
                    authMessage.textContent = 'فشل تسجيل الدخول: ' + (err.error || 'خطأ غير معروف');
                    authMessage.style.color = 'red';
                }
                googleDriveAuth.resetAuthStatus();
            }
        });
        
        gisInited = true;
        maybeEnableButtons();
        console.log('تم تهيئة tokenClient بنجاح');
        
        // تحقق من صحة التوكن المخزن مسبقًا
        if (accessToken) {
            googleDriveAuth.checkAuthStatus();
        }
    } catch (e) {
        console.error('خطأ في تهيئة tokenClient:', e);
        
        // تفعيل وضع الطوارئ - استخدام التخزين المحلي فقط
        gisInited = true; // نعتبرها مهيأة لتمكين الأزرار
        maybeEnableButtons();
        
        // تحديث واجهة المستخدم
        const authMessage = document.getElementById('driveAuthMessage');
        if (authMessage) {
            authMessage.textContent = 'خدمة Google غير متاحة - استخدام التخزين المحلي فقط';
            authMessage.style.color = 'orange';
        }
        
        // تنفيذ فحص الدعم
        if (typeof window.checkGoogleApiSupport === 'function') {
            window.checkGoogleApiSupport();
        }
    }
}

/**
 * تهيئة GAPI Client
 */
async function initGapiClient() {
    try {
        await gapi.client.init({
            discoveryDocs: DISCOVERY_DOCS,
        });
        gapiInited = true;
        maybeEnableButtons();
    } catch (err) {
        console.error('فشل تهيئة GAPI client:', err);
        document.getElementById('driveAuthMessage').textContent = 'فشل في تهيئة خدمة Google Drive';
    }
}

/**
 * تفعيل الأزرار إذا تم تهيئة المكتبات
 */
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('googleDriveAuthBtn').disabled = false;
        
        // التحقق من حالة المصادقة
        googleDriveAuth.checkAuthStatus();
    }
}

/**
 * تحميل سكريبت خارجي مع معالجة خاصة لـ Google APIs
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // التحقق إذا كان السكريبت محمّل بالفعل
        const existingScripts = document.querySelectorAll(`script[src="${src}"]`);
        if (existingScripts.length > 0) {
            console.log(`السكريبت ${src} محمّل بالفعل، نتخطى التحميل المتكرر`);
            
            // للتأكد من اكتمال تحميل GSI
            if (src.includes('gsi/client')) {
                if (typeof google !== 'undefined' && google.accounts) {
                    console.log('مكتبة GSI متاحة بالفعل');
                    resolve();
                } else {
                    console.log('في انتظار تحميل GSI...');
                    // محاولة التحقق مرة أخرى بعد فترة قصيرة
                    const checkGSI = setInterval(() => {
                        if (typeof google !== 'undefined' && google.accounts) {
                            console.log('اكتمل تحميل GSI');
                            clearInterval(checkGSI);
                            resolve();
                        }
                    }, 200);
                    
                    // التوقف بعد 5 ثوانٍ كحد أقصى
                    setTimeout(() => {
                        clearInterval(checkGSI);
                        console.warn('انتهت مهلة تحميل GSI، نستمر على أي حال');
                        resolve();
                    }, 5000);
                }
                return;
            }
            
            // للتأكد من اكتمال تحميل GAPI
            if (src.includes('apis.google.com/js/api.js')) {
                if (typeof gapi !== 'undefined') {
                    console.log('مكتبة GAPI متاحة بالفعل');
                    resolve();
                } else {
                    console.log('في انتظار تحميل GAPI...');
                    const checkGAPI = setInterval(() => {
                        if (typeof gapi !== 'undefined') {
                            console.log('اكتمل تحميل GAPI');
                            clearInterval(checkGAPI);
                            resolve();
                        }
                    }, 200);
                    
                    setTimeout(() => {
                        clearInterval(checkGAPI);
                        console.warn('انتهت مهلة تحميل GAPI، نستمر على أي حال');
                        resolve();
                    }, 5000);
                }
                return;
            }
            
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = src;
        
        // معالجة خاصة لمكتبة GSI
        if (src.includes('gsi/client')) {
            console.log('بدء تحميل GSI...');
            script.crossOrigin = "anonymous";
            script.id = "google-gsi-script";
        }
        
        // معالجة خاصة لمكتبة GAPI
        if (src.includes('apis.google.com/js/api.js')) {
            console.log('بدء تحميل GAPI...');
            script.crossOrigin = "anonymous";
            script.id = "google-api-script";
        }
        
        script.onload = () => {
            console.log(`تم تحميل ${src} بنجاح`);
            resolve();
        };
        
        script.onerror = (e) => {
            console.error(`فشل في تحميل السكريبت: ${src}`, e);
            reject(new Error(`فشل في تحميل السكريبت: ${src}`));
        };
        
        document.head.appendChild(script);
    });
}

// كائن لإدارة المصادقة والتخزين في Google Drive
const googleDriveAuth = {
    // التحقق من حالة المصادقة
    checkAuthStatus: function() {
        const message = document.getElementById('driveAuthMessage');
        const authBtn = document.getElementById('googleDriveAuthBtn');
        const settingsSection = document.getElementById('driveBackupSettings');
        const restoreOptions = document.getElementById('driveRestoreOptions');
        const restoreMessage = document.getElementById('driveRestoreMessage');
        
        // تحقق إذا كان هناك توكن موجود في التخزين المحلي
        const savedToken = localStorage.getItem('gDriveToken');
        const tokenExpiry = localStorage.getItem('gDriveTokenExpiry');
        
        if (savedToken && tokenExpiry && parseInt(tokenExpiry) > Date.now()) {
            try {
                // استخدام التوكن المحفوظ
                accessToken = savedToken;
                message.textContent = 'تم تسجيل الدخول بنجاح';
                authBtn.textContent = 'تسجيل الخروج';
                authBtn.onclick = this.signOut;
                
                // إظهار إعدادات النسخ الاحتياطي
                if (settingsSection) settingsSection.style.display = 'block';
                if (restoreOptions) restoreOptions.style.display = 'block';
                if (restoreMessage) restoreMessage.style.display = 'none';
                
                // محاولة الحصول على معرف مجلد النسخ الاحتياطي
                this.findOrCreateBackupFolder();
            } catch (e) {
                console.error('خطأ في التحقق من صلاحية التوكن:', e);
                this.resetAuthStatus();
            }
        } else {
            this.resetAuthStatus();
        }
        
        // إعداد التبديل للنسخ الاحتياطي التلقائي
        const autoBackupCheckbox = document.getElementById('enableAutoBackup');
        const autoBackupOptions = document.getElementById('autoBackupOptions');
        
        if (autoBackupCheckbox && autoBackupOptions) {
            // حالة النسخ الاحتياطي التلقائي من التخزين المحلي
            autoBackupCheckbox.checked = localStorage.getItem('autoBackupEnabled') === 'true';
            
            // إظهار خيارات النسخ الاحتياطي التلقائي إذا كان مفعلاً
            if (autoBackupCheckbox.checked) {
                autoBackupOptions.style.display = 'block';
            } else {
                autoBackupOptions.style.display = 'none';
            }
            
            // تعيين تكرار النسخ الاحتياطي
            const frequency = localStorage.getItem('backupFrequency') || 'weekly';
            document.getElementById('backupFrequency').value = frequency;
            
            // إضافة مستمع لحدث التبديل
            autoBackupCheckbox.addEventListener('change', function() {
                if (this.checked) {
                    autoBackupOptions.style.display = 'block';
                    localStorage.setItem('autoBackupEnabled', 'true');
                    setupAutoBackup();
                } else {
                    autoBackupOptions.style.display = 'none';
                    localStorage.setItem('autoBackupEnabled', 'false');
                    clearAutoBackup();
                }
            });
            
            // إضافة مستمع لتغيير التكرار
            document.getElementById('backupFrequency').addEventListener('change', function() {
                localStorage.setItem('backupFrequency', this.value);
                if (autoBackupCheckbox.checked) {
                    setupAutoBackup(); // إعادة ضبط التوقيت
                }
            });
        }
    },
    
    // إعادة ضبط حالة المصادقة
    resetAuthStatus: function() {
        const message = document.getElementById('driveAuthMessage');
        const authBtn = document.getElementById('googleDriveAuthBtn');
        const settingsSection = document.getElementById('driveBackupSettings');
        const restoreOptions = document.getElementById('driveRestoreOptions');
        const restoreMessage = document.getElementById('driveRestoreMessage');
        
        accessToken = null;
        localStorage.removeItem('gDriveToken');
        localStorage.removeItem('gDriveTokenExpiry');
        
        if (message) message.textContent = 'لم يتم تسجيل الدخول بعد.';
        if (authBtn) {
            authBtn.textContent = 'تسجيل الدخول مع Google';
            authBtn.onclick = this.authenticate;
        }
        
        if (settingsSection) settingsSection.style.display = 'none';
        if (restoreOptions) restoreOptions.style.display = 'none';
        if (restoreMessage) restoreMessage.style.display = 'block';
        
        // إلغاء النسخ الاحتياطي التلقائي
        clearAutoBackup();
    },
    
    // تسجيل الدخول باستخدام Google
    authenticate: function() {
        if (!gapiInited || !gisInited) {
            alert('جاري تحميل خدمات Google... الرجاء المحاولة مرة أخرى بعد قليل.');
            initializeGoogleAPI();
            return;
        }
        
        // تعديل: إضافة خاصية إضافية لتجاوز مشكلة المصادقة في وضع الاختبار
        tokenClient.requestAccessToken({ 
            prompt: 'consent',
            // إضافة هذه الخاصية لعرض جميع النطاقات المطلوبة
            include_granted_scopes: true 
        });
    },
    
    // تسجيل الخروج
    signOut: function() {
        if (accessToken) {
            // إبطال التوكن الحالي (اختياري)
            google.accounts.oauth2.revoke(accessToken, () => {
                console.log('تم إبطال صلاحية التوكن');
            });
            
            googleDriveAuth.resetAuthStatus();
        }
    },
    
    // البحث عن مجلد النسخ الاحتياطي أو إنشاؤه
    findOrCreateBackupFolder: function() {
        const folderName = document.getElementById('backupFolderName').value || 'Dashboard_Backups';
        
        if (!accessToken) return Promise.reject('لم يتم المصادقة بعد.');
        
        return new Promise((resolve, reject) => {
            fetch('https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.folder" and name="' + folderName + '" and trashed=false', {
                headers: {
                    'Authorization': 'Bearer ' + accessToken
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`خطأ في البحث عن المجلد: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.files && data.files.length > 0) {
                    // تم العثور على المجلد
                    backupFolderId = data.files[0].id;
                    resolve(backupFolderId);
                } else {
                    // إنشاء مجلد جديد
                    fetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + accessToken,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: folderName,
                            mimeType: 'application/vnd.google-apps.folder'
                        })
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`خطأ في إنشاء المجلد: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(folder => {
                        backupFolderId = folder.id;
                        resolve(backupFolderId);
                    })
                    .catch(reject);
                }
            })
            .catch(reject);
        });
    }
};

// تصدير الدوال للاستخدام العالمي
// تهيئة الدوال في النافذة العالمية لتكون متاحة في dashboard-fix.js
window.backupToDriveOriginal = null; // سيتم تحديثه بعد تعريف الدالة
window.restoreFromDriveOriginal = null; // سيتم تحديثه بعد تعريف الدالة
window.listDriveBackups = null; // سيتم تحديثه بعد تعريف الدالة
window.deleteFromDrive = null; // سيتم تحديثه بعد تعريف الدالة
window.setupAutoBackup = null; // سيتم تحديثه بعد تعريف الدالة
window.clearAutoBackup = null; // سيتم تحديثه بعد تعريف الدالة
window.googleDriveAuth = null; // سيتم تحديثه بعد تعريف الكائن

// دالة النسخ الاحتياطي إلى Google Drive
function backupToDrive(isManualSave = false) {
    if (!accessToken) {
        if (isManualSave) {
            // إذا كانت عملية حفظ يدوية وليس هناك توكن وصول، اطلب من المستخدم تسجيل الدخول
            openCloudSettings();
            showSyncError("تعذر المزامنة", "يرجى تسجيل الدخول إلى Google Drive أولاً للحفظ السحابي");
            return;
        } else {
            // للنسخ التلقائي، عرض إشعار غير مقاطع
            showSyncError("تعذر إتمام المزامنة التلقائية", "يرجى تسجيل الدخول إلى Google Drive لتمكين المزامنة");
            return;
        }
    }
    
    // عرض مؤشر التحميل
    let backupButton;
    const saveIndicator = document.createElement('div');
    
    if (isManualSave) {
        // استخدام زر الحفظ من الشريط العلوي
        backupButton = document.querySelector('.topbar-right button[onclick*="backupToDrive"]');
        if (backupButton) {
            const originalButtonText = backupButton.innerHTML;
            backupButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> جاري الحفظ...';
            backupButton.disabled = true;
            
            // إعادة ضبط الزر بعد إكمال العملية أو فشلها
            setTimeout(() => {
                backupButton.innerHTML = originalButtonText;
                backupButton.disabled = false;
            }, 20000); // حد أقصى 20 ثانية
        } else {
            // إنشاء مؤشر متحرك لعملية الحفظ إذا لم يُعثر على الزر
            saveIndicator.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--card-bg);
                color: var(--text);
                padding: 10px 20px;
                border-radius: var(--border-radius);
                box-shadow: var(--shadow);
                z-index: 9999;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            saveIndicator.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> جاري الحفظ السحابي...';
            document.body.appendChild(saveIndicator);
        }
    } else {
        console.log('جاري تنفيذ النسخ الاحتياطي التلقائي...');
    }
    
    // تحضير البيانات للنسخ الاحتياطي
    const dataToBackup = {
        balance: balance,
        voices: voices,
        clients: clients,
        reservations: reservations,
        invoices: invoices,
        invoiceAuditLog: invoiceAuditLog,
        savedAt: new Date().toISOString()
    };
    
    // تحويل البيانات إلى JSON
    const jsonData = JSON.stringify(dataToBackup);
    
    // إنشاء اسم الملف
    let fileName;
    
    if (isManualSave) {
        // للحفظ اليدوي: استخدم اسم أكثر وضوحًا يتضمن تاريخ وساعة الحفظ
        const now = new Date();
        fileName = `dashboard_manual_${now.toISOString().split('T')[0]}_${
            now.toTimeString().split(' ')[0].replace(/:/g, '-')}.json`;
    } else {
        // للحفظ التلقائي: استخدم اسم أبسط مع علامة "auto"
        const now = new Date();
        const fileFormat = document.getElementById('backupFileFormat')?.value || 'dashboard_auto_%DATE%';
        fileName = fileFormat
            .replace('%DATE%', now.toISOString().split('T')[0])
            .replace('%TIME%', now.toTimeString().split(' ')[0].replace(/:/g, '-')) + '.json';
    }
    
    // البحث عن مجلد النسخ الاحتياطية أو إنشائه
    googleDriveAuth.findOrCreateBackupFolder()
        .then(folderId => {
            // إنشاء الملف
            const metadata = {
                name: fileName,
                mimeType: 'application/json',
                parents: [folderId]
            };
            
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([jsonData], { type: 'application/json' }));
            
            return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + accessToken },
                body: form
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`خطأ في رفع الملف: ${response.status}`);
            }
            return response.json();
        })
        .then(file => {
            console.log('Backup created successfully:', file);
            
            // حذف النسخ القديمة للحفاظ على 5 نسخ فقط
            manageBackupCount(5);
            
            if (isManualSave) {
                if (backupButton) {
                    backupButton.innerHTML = '<i class="bx bx-save"></i> حفظ';
                    backupButton.disabled = false;
                }
                
                // إظهار رسالة نجاح الحفظ
                showSaveSuccess();
                
                // إزالة المؤشر المتحرك إذا كان موجودًا
                if (document.body.contains(saveIndicator)) {
                    document.body.removeChild(saveIndicator);
                }
            }
            
            // تحديث وقت آخر حفظ وتعيين متغير التغييرات غير المحفوظة
            localStorage.setItem('lastAutoBackup', new Date().toISOString());
            if (typeof hasUnsavedChanges !== 'undefined') {
                hasUnsavedChanges = false;
            }
            
        })
        .catch(error => {
            console.error('Error creating backup:', error);
            if (isManualSave) {
                if (backupButton) {
                    backupButton.innerHTML = '<i class="bx bx-save"></i> حفظ';
                    backupButton.disabled = false;
                }
                alert('حدث خطأ أثناء إنشاء النسخة الاحتياطية: ' + error.message);
                
                // إزالة المؤشر المتحرك إذا كان موجودًا
                if (document.body.contains(saveIndicator)) {
                    document.body.removeChild(saveIndicator);
                }
            }
        });
}

// وظيفة جديدة لإظهار إشعار خطأ المزامنة
function showSyncError(title, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--card-bg);
        border-left: 4px solid var(--danger-color);
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: var(--shadow);
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 12px;
        animation: fadeIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <i class='bx bx-cloud-error' style="font-size: 24px; color: var(--danger-color);"></i>
        <div>
            <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
            <div style="font-size: 13px;">${message}</div>
        </div>
        <button onclick="this.parentNode.remove()" style="position: absolute; top: 8px; right: 8px; background: none; border: none; cursor: pointer; font-size: 18px; color: var(--text-light);">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // إزالة الإشعار بعد 5 ثوانِ
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

/**
 * إدارة عدد النسخ الاحتياطية والاحتفاظ بالعدد المحدد فقط
 * @param {number} maxBackups - العدد الأقصى للنسخ الاحتياطية للاحتفاظ بها
 */
function manageBackupCount(maxBackups = 5) {
    if (!accessToken) return Promise.reject('غير مصرح بالوصول');
    
    // البحث عن مجلد النسخ الاحتياطية
    return googleDriveAuth.findOrCreateBackupFolder()
        .then(folderId => {
            // الحصول على جميع ملفات النسخ الاحتياطية مرتبة حسب تاريخ الإنشاء
            return fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&orderBy=createdTime&fields=files(id,name,createdTime)`, {
                headers: { 'Authorization': 'Bearer ' + accessToken }
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`خطأ في الحصول على قائمة النسخ الاحتياطية: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // إذا كان عدد الملفات أكثر من الحد الأقصى
            if (data.files && data.files.length > maxBackups) {
                // ترتيب الملفات من الأقدم للأحدث
                const sortedFiles = data.files.sort((a, b) => 
                    new Date(a.createdTime) - new Date(b.createdTime)
                );
                
                // تحديد الملفات التي سيتم حذفها (أقدم الملفات)
                const filesToDelete = sortedFiles.slice(0, sortedFiles.length - maxBackups);
                
                // حذف الملفات القديمة
                return Promise.all(filesToDelete.map(file => {
                    console.log(`حذف نسخة احتياطية قديمة: ${file.name}`);
                    return fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': 'Bearer ' + accessToken }
                    });
                }));
            }
            return Promise.resolve();
        })
        .then(() => {
            console.log(`تم الاحتفاظ بـ ${maxBackups} نسخ احتياطية فقط`);
        })
        .catch(error => {
            console.error('Error managing backup files:', error);
        });
}

// إضافة وظيفة لعرض رسالة نجاح الحفظ
function showSaveSuccess() {
    const alert = document.createElement('div');
    alert.style.cssText = `
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
        animation: slideDown 0.5s ease;
    `;
    
    alert.innerHTML = `
        <i class="bx bx-check-circle" style="font-size: 24px;"></i>
        <span>تم حفظ البيانات بنجاح!</span>
    `;
    
    document.body.appendChild(alert);
    
    // إخفاء التنبيه بعد 3 ثوانٍ
    setTimeout(() => {
        alert.style.animation = 'slideUp 0.5s ease';
        setTimeout(() => {
            document.body.removeChild(alert);
        }, 500);
    }, 3000);
}

// وظيفة لعرض النسخ الاحتياطية المتاحة
function listDriveBackups() {
    if (!accessToken) {
        showSyncError("تعذر عرض النسخ الاحتياطية", "يرجى تسجيل الدخول إلى Google Drive أولاً");
        return;
    }
    
    // عرض مؤشر التحميل
    const listButton = document.querySelector('#driveRestoreOptions button');
    const originalButtonText = listButton.innerHTML;
    listButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> جاري التحميل...';
    listButton.disabled = true;
    
    // البحث عن مجلد النسخ الاحتياطية
    googleDriveAuth.findOrCreateBackupFolder()
        .then(folderId => {
            // البحث عن الملفات في المجلد
            return fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&orderBy=createdTime desc&fields=files(id,name,createdTime,size)`, {
                headers: { 'Authorization': 'Bearer ' + accessToken }
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`خطأ في جلب قائمة الملفات: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const backupsList = document.getElementById('backupsList');
            
            if (!data.files || data.files.length === 0) {
                backupsList.innerHTML = '<div style="text-align:center;padding:15px;">لا توجد نسخ احتياطية متاحة</div>';
            } else {
                backupsList.innerHTML = '';
                
                // إظهار عدد النسخ الاحتياطية
                const backupsCount = document.createElement('div');
                backupsCount.style.cssText = `
                    padding: 8px 12px;
                    margin-bottom: 10px;
                    background: var(--primary-light);
                    border-radius: 6px;
                    font-weight: bold;
                `;
                backupsCount.innerHTML = `عدد النسخ الاحتياطية: <span style="color:var(--primary-color)">${data.files.length}</span>`;
                if (data.files.length > 5) {
                    backupsCount.innerHTML += ` <span style="color:var(--text-light);font-size:12px;">(سيتم الاحتفاظ بآخر 5 نسخ فقط)</span>`;
                }
                backupsList.appendChild(backupsCount);
                
                data.files.forEach(file => {
                    const createdDate = new Date(file.createdTime);
                    const formattedDate = createdDate.toLocaleString();
                    const fileSizeKB = file.size ? Math.round(file.size / 1024) : 'غير معروف';
                    
                    const backupItem = document.createElement('div');
                    backupItem.style.cssText = `
                        padding: 10px;
                        margin-bottom: 8px;
                        background: var(--card-bg);
                        border-radius: 8px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border: 1px solid var(--border-color);
                    `;
                    
                    backupItem.innerHTML = `
                        <div>
                            <div>${file.name}</div>
                            <small style="color:var(--text-light)">${formattedDate} - ${fileSizeKB} KB</small>
                        </div>
                        <div>
                            <button class="btn btn-sm" onclick="restoreFromDrive('${file.id}', '${file.name}')">استرجاع</button>
                            <button class="btn btn-sm btn-danger" onclick="deleteFromDrive('${file.id}', '${file.name}')">حذف</button>
                        </div>
                    `;
                    
                    backupsList.appendChild(backupItem);
                });
            }
            
            listButton.innerHTML = originalButtonText;
            listButton.disabled = false;
        })
        .catch(error => {
            console.error('Error listing backups:', error);
            const backupsList = document.getElementById('backupsList');
            backupsList.innerHTML = '<div style="text-align:center;padding:15px;color:red;">حدث خطأ أثناء تحميل النسخ الاحتياطية: ' + error.message + '</div>';
            
            listButton.innerHTML = originalButtonText;
            listButton.disabled = false;
        });
}

// وظيفة استرجاع البيانات من نسخة احتياطية
// حفظ الدالة الأصلية لاستعادة النسخ الاحتياطية
const restoreFromDriveOriginal = restoreFromDrive;
window.restoreFromDriveOriginal = restoreFromDriveOriginal;

function restoreFromDrive(fileId, fileName) {
    if (!confirm(`هل أنت متأكد من استرجاع النسخة الاحتياطية: ${fileName}؟ سيتم استبدال جميع البيانات الحالية.`)) {
        return;
    }
    
    if (!accessToken) {
        alert('يرجى تسجيل الدخول أولاً.');
        return;
    }
    
    // عرض رسالة التحميل
    const backupsList = document.getElementById('backupsList');
    const originalContent = backupsList.innerHTML;
    backupsList.innerHTML = '<div style="text-align:center;padding:15px;"><i class="bx bx-loader-alt bx-spin" style="font-size:24px;"></i><br>جاري استرجاع النسخة الاحتياطية...</div>';
    
    // تحميل ملف النسخة الاحتياطية
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`فشل في تحميل النسخة الاحتياطية: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        try {
            // حفظ نسخة من البيانات الحالية للتراجع
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
            if (data.balance !== undefined) balance = data.balance;
            if (data.voices) voices = data.voices;
            if (data.clients) clients = data.clients;
            if (data.reservations) reservations = data.reservations;
            if (data.invoices) invoices = data.invoices;
            if (data.invoiceAuditLog) invoiceAuditLog = data.invoiceAuditLog;
            
            // تحديث العرض
            updateAllStatistics();
            updateClientsTable();
            renderReservationsTable();
            renderInvoicesTable();
            renderInvoiceAuditLogTable();
            populateDatalists();
            populateInvoiceDatalist();
            renderReports();
            
            // تحديث المخططات
            if (typeof updateCharts === 'function') {
                try {
                    updateCharts('day');
                } catch (e) {
                    console.error('خطأ في تحديث المخططات:', e);
                }
            }
            
            backupsList.innerHTML = originalContent;
            
            // إغلاق المودال بعد الاستعادة
            closeModal('cloudSettingsModal');
            
            // عرض رسالة نجاح
            setTimeout(() => {
                showRestoreSuccess();
            }, 500);
            
        } catch (e) {
            console.error('خطأ في استعادة البيانات:', e);
            backupsList.innerHTML = originalContent;
            alert('حدث خطأ أثناء استعادة البيانات: ' + e.message);
        }
    })
    .catch(error => {
        console.error('Error restoring backup:', error);
        backupsList.innerHTML = originalContent;
        alert('فشل في استرجاع النسخة الاحتياطية: ' + error.message);
    });
}

// وظيفة حذف نسخة احتياطية من Google Drive
function deleteFromDrive(fileId, fileName) {
    if (!confirm(`هل أنت متأكد من حذف النسخة الاحتياطية: ${fileName}؟`)) {
        return;
    }
    
    if (!accessToken) {
        alert('يرجى تسجيل الدخول أولاً.');
        return;
    }
    
    // حذف الملف
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + accessToken }
    })
    .then(response => {
        if (!response.ok && response.status !== 204) {
            throw new Error(`فشل في حذف النسخة الاحتياطية: ${response.status}`);
        }
        
        // تحديث قائمة النسخ الاحتياطية
        listDriveBackups();
        alert('تم حذف النسخة الاحتياطية بنجاح.');
    })
    .catch(error => {
        console.error('Error deleting backup:', error);
        alert('فشل في حذف النسخة الاحتياطية: ' + error.message);
    });
}

// وظيفة لإظهار رسالة نجاح الاستعادة
function showRestoreSuccess() {
    // إنشاء عنصر التنبيه
    const alert = document.createElement('div');
    alert.style.cssText = `
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
        animation: slideDown 0.5s ease;
    `;
    
    alert.innerHTML = `
        <i class="bx bx-check-circle" style="font-size: 24px;"></i>
        <span>تم استرجاع النسخة الاحتياطية بنجاح!</span>
    `;
    
    document.body.appendChild(alert);
    
    // إخفاء التنبيه بعد 3 ثوانٍ
    setTimeout(() => {
        alert.style.animation = 'slideUp 0.5s ease';
        setTimeout(() => {
            document.body.removeChild(alert);
        }, 500);
    }, 3000);
}

// إعداد النسخ الاحتياطي التلقائي
function setupAutoBackup() {
    clearAutoBackup();
    
    const frequency = document.getElementById('backupFrequency').value;
    let intervalMs;
    
    switch (frequency) {
        case 'daily':
            intervalMs = 24 * 60 * 60 * 1000; // يوم واحد
            break;
        case 'weekly':
            intervalMs = 7 * 24 * 60 * 60 * 1000; // أسبوع
            break;
        case 'monthly':
            intervalMs = 30 * 24 * 60 * 60 * 1000; // شهر (تقريبي)
            break;
        default:
            intervalMs = 7 * 24 * 60 * 60 * 1000; // افتراضي: أسبوعي
    }
    
    // تخزين وقت آخر نسخ احتياطي
    const lastBackup = localStorage.getItem('lastAutoBackup');
    
    // إذا لم يكن هناك نسخ احتياطي سابق أو مر الوقت المحدد
    if (!lastBackup || (Date.now() - new Date(lastBackup).getTime() >= intervalMs)) {
        // تنفيذ نسخ احتياطي الآن
        setTimeout(() => {
            if (accessToken) {
                backupToDrive();
                localStorage.setItem('lastAutoBackup', new Date().toISOString());
            }
        }, 60000); // تأخير دقيقة واحدة بعد التفعيل
    }
    
    // ضبط الفاصل الزمني للنسخ الاحتياطي
    window.autoBackupInterval = setInterval(() => {
        if (accessToken) {
            backupToDrive();
            localStorage.setItem('lastAutoBackup', new Date().toISOString());
        }
    }, intervalMs);

    // تحديث عنصر واجهة المستخدم الخاص بالنسخ الاحتياطي التلقائي
    updateAutoBackupStatus(true, frequency);
}

/**
 * تحديث حالة النسخ الاحتياطي التلقائي في واجهة المستخدم
 * @param {boolean} isEnabled - هل النسخ الاحتياطي التلقائي مفعل
 * @param {string} frequency - تكرار النسخ الاحتياطي
 */
function updateAutoBackupStatus(isEnabled, frequency) {
    const statusElem = document.getElementById('autoBackupStatus');
    if (!statusElem) return;
    
    // تحديث نص حالة النسخ الاحتياطي التلقائي
    let frequencyText;
    switch(frequency) {
        case 'daily': frequencyText = 'يوميًا'; break;
        case 'weekly': frequencyText = 'أسبوعيًا'; break;
        case 'monthly': frequencyText = 'شهريًا'; break;
        default: frequencyText = 'غير محدد';
    }
    
    const lastBackupTime = localStorage.getItem('lastAutoBackup');
    const lastBackupDate = lastBackupTime ? new Date(lastBackupTime).toLocaleString() : 'لا يوجد';
    
    statusElem.innerHTML = isEnabled ? 
        `<span style="color:var(--success-color);">✓ مفعّل</span> (${frequencyText})<br>
         <small style="color:var(--text-light)">آخر نسخ احتياطي: ${lastBackupDate}</small>` :
        '<span style="color:var(--text-light);">غير مفعّل</span>';
}

// إلغاء النسخ الاحتياطي التلقائي
function clearAutoBackup() {
    if (window.autoBackupInterval) {
        clearInterval(window.autoBackupInterval);
        window.autoBackupInterval = null;
    }
}

// إعداد النسخ الاحتياطي التلقائي عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة مكتبات Google API
    initializeGoogleAPI();
    
    // إذا كان النسخ الاحتياطي التلقائي مفعلاً في التخزين المحلي
    if (localStorage.getItem('autoBackupEnabled') === 'true') {
        // التحقق من وجود توكن محفوظ
        const savedToken = localStorage.getItem('gDriveToken');
        if (savedToken) {
            accessToken = savedToken;
            setupAutoBackup();
        }
    }
});

// وظائف إضافية متاحة عالمياً
window.authenticateWithGoogleDrive = function() {
    googleDriveAuth.authenticate();
};

window.backupToDrive = backupToDrive;
window.listDriveBackups = listDriveBackups;
window.restoreFromDrive = restoreFromDrive;
window.deleteFromDrive = deleteFromDrive;

// وظيفة مساعدة لفتح إعدادات التخزين السحابي
function openCloudSettings() {
    const modal = document.getElementById('cloudSettingsModal');
    if (modal) {
        modal.classList.add('active');
        
        // تحديث حالة الاتصال بـ Google Drive
        if (typeof googleDriveAuth !== 'undefined' && typeof googleDriveAuth.checkAuthStatus === 'function') {
            googleDriveAuth.checkAuthStatus();
        }
    } else {
        console.error("لم يتم العثور على مودال إعدادات التخزين السحابي");
    }
}

// جعل الوظيفة متاحة عالميًا
window.openCloudSettings = openCloudSettings;
window.backupToDrive = backupToDrive;

// وظيفة لاسترجاع آخر نسخة احتياطية تلقائيًا
async function autoRestoreLatestBackup(forceRestore = false) {
    return new Promise(async (resolve, reject) => {
        if (!accessToken) {
            // محاولة استخدام التوكن من التخزين المحلي
            const savedToken = localStorage.getItem('gDriveToken');
            const tokenExpiry = localStorage.getItem('gDriveTokenExpiry');
            
            if (savedToken && tokenExpiry && parseInt(tokenExpiry) > Date.now()) {
                accessToken = savedToken;
            } else {
                // عرض إشعار عدم القدرة على المزامنة إذا طلب المستخدم المزامنة
                if (forceRestore && typeof showSyncError === 'function') {
                    showSyncError("تعذر استعادة البيانات", "يرجى تسجيل الدخول إلى Google Drive أولاً");
                }
                
                return resolve({
                    success: false,
                    skipped: true,
                    message: 'لم يتم تسجيل الدخول إلى Google Drive'
                });
            }
        }

        try {
            // التحقق إذا كان الاسترجاع التلقائي مفعل - لا نطبق هذا الشرط عند الطلب الصريح (forceRestore)
            const autoSyncEnabled = localStorage.getItem('autoSyncEnabled') !== 'false'; // افتراضياً مفعل
            if (!autoSyncEnabled && !forceRestore) {
                return resolve({
                    success: false,
                    skipped: true,
                    message: 'المزامنة التلقائية معطلة في الإعدادات'
                });
            }

            // البحث عن مجلد النسخ الاحتياطية
            const folderId = await googleDriveAuth.findOrCreateBackupFolder();

            // البحث عن آخر ملف نسخة احتياطية
            const response = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&orderBy=createdTime desc&pageSize=1&fields=files(id,name,createdTime,size)`, {
                headers: { 'Authorization': 'Bearer ' + accessToken }
            });

            if (!response.ok) {
                throw new Error(`خطأ في جلب النسخ الاحتياطية: ${response.status}`);
            }

            const data = await response.json();

            if (!data.files || data.files.length === 0) {
                return resolve({
                    success: false,
                    skipped: true,
                    message: 'لا توجد نسخ احتياطية متاحة'
                });
            }

            const latestBackup = data.files[0];
            
            // التحقق من تاريخ آخر نسخة احتياطية والتاريخ الحالي للمزامنة الذكية
            const lastAutoRestore = localStorage.getItem('lastAutoRestore');
            const lastRestoredBackupId = localStorage.getItem('lastRestoredBackupId');
            
            // مقارنة معرف النسخة - نستعيد النسخة فقط إذا كانت أحدث أو تم طلب المزامنة صراحة
            if (lastRestoredBackupId === latestBackup.id && !forceRestore) {
                console.log('النسخة الاحتياطية متزامنة بالفعل');
                return resolve({
                    success: false,
                    skipped: true,
                    message: 'النسخة الاحتياطية متزامنة بالفعل'
                });
            }

            console.log('جاري تحميل النسخة الاحتياطية: ' + latestBackup.name);

            // تحميل محتوى آخر نسخة احتياطية
            const backupResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${latestBackup.id}?alt=media`, {
                headers: { 'Authorization': 'Bearer ' + accessToken }
            });

            if (!backupResponse.ok) {
                throw new Error(`فشل في تحميل النسخة الاحتياطية: ${backupResponse.status}`);
            }

            const backupData = await backupResponse.json();
            console.log('تم تحميل النسخة الاحتياطية بنجاح');

            // حفظ نسخة من البيانات الحالية للتراجع قبل الاستعادة
            try {
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
            } catch (backupError) {
                console.warn('تعذر حفظ نسخة من البيانات الحالية للتراجع:', backupError);
            }

            // استرجاع البيانات من النسخة الاحتياطية
            console.log('بدء استعادة البيانات من النسخة الاحتياطية...');
            if (backupData.balance !== undefined) window.balance = backupData.balance;
            if (backupData.voices) window.voices = backupData.voices;
            if (backupData.clients) window.clients = backupData.clients;
            if (backupData.reservations) window.reservations = backupData.reservations;
            if (backupData.invoices) window.invoices = backupData.invoices;
            if (backupData.invoiceAuditLog) window.invoiceAuditLog = backupData.invoiceAuditLog;
            console.log('تم استعادة البيانات بنجاح');

            // تحديث العرض - تأكد من أن الوظائف موجودة قبل استدعائها
            console.log('تحديث واجهة المستخدم...');
            if (typeof window.updateAllStatistics === 'function') window.updateAllStatistics();
            if (typeof window.updateClientsTable === 'function') window.updateClientsTable();
            if (typeof window.renderReservationsTable === 'function') window.renderReservationsTable();
            if (typeof window.renderInvoicesTable === 'function') window.renderInvoicesTable();
            if (typeof window.renderInvoiceAuditLogTable === 'function') window.renderInvoiceAuditLogTable();
            if (typeof window.populateDatalists === 'function') window.populateDatalists();
            
            try {
                if (typeof window.populateInvoiceDatalist === 'function') {
                    window.populateInvoiceDatalist();
                }
            } catch (e) {
                console.error('خطأ في تحديث قائمة الفواتير:', e);
            }
            
            if (typeof window.renderReports === 'function') window.renderReports();
            
            // تحديث المخططات
            console.log('تحديث المخططات...');
            if (typeof window.updateCharts === 'function') {
                try {
                    window.updateCharts('day');
                } catch (e) {
                    console.error('خطأ في تحديث المخططات:', e);
                }
            }

            // تخزين معلومات النسخة المسترجعة
            localStorage.setItem('lastRestoredBackupId', latestBackup.id);
            localStorage.setItem('lastAutoRestore', new Date().toISOString());
            console.log('اكتملت المزامنة بنجاح');

            // إظهار رسالة نجاح إذا كان هناك طلب صريح للمزامنة
            if (forceRestore && typeof window.showRestoreNotification === 'function') {
                window.showRestoreNotification("تم استرجاع النسخة الاحتياطية", 
                    `تم استرجاع آخر نسخة احتياطية بنجاح: ${latestBackup.name}`, "success");
            }

            // إرجاع نتيجة نجاح المزامنة
            resolve({
                success: true,
                backupId: latestBackup.id,
                backupName: latestBackup.name,
                creationTime: latestBackup.creationTime
            });

        } catch (error) {
            console.error('خطأ في المزامنة التلقائية:', error);
            reject(error);
        }
    });
}

// إضافة خيار تفعيل/تعطيل الاسترجاع التلقائي في واجهة المستخدم
function initAutoRestoreSettings() {
    const autoRestoreEnabled = localStorage.getItem('autoRestoreEnabled') !== 'false'; // افتراضياً مفعل
    
    // إضافة الإعدادات إلى مودال إعدادات السحابة إذا لم تكن موجودة
    const settingsSection = document.querySelector('#driveBackupSettings');
    if (settingsSection && !document.getElementById('autoRestoreSection')) {
        const autoRestoreSection = document.createElement('div');
        autoRestoreSection.id = 'autoRestoreSection';
        autoRestoreSection.innerHTML = `
            <div style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="margin: 0;">
                        <input type="checkbox" id="enableAutoRestore" ${autoRestoreEnabled ? 'checked' : ''}> 
                        استرجاع آخر نسخة احتياطية تلقائيًا بعد تسجيل الدخول
                    </label>
                </div>
                <div style="margin-top: 5px; font-size: 13px; color: var(--text-light);">
                    عند تفعيل هذا الخيار، سيتم استرجاع آخر نسخة احتياطية بشكل تلقائي بعد تسجيل الدخول
                </div>
            </div>
        `;
        settingsSection.appendChild(autoRestoreSection);
        
        // إضافة مستمع لحدث تغيير حالة الاسترجاع التلقائي
        const autoRestoreCheckbox = document.getElementById('enableAutoRestore');
        if (autoRestoreCheckbox) {
            autoRestoreCheckbox.addEventListener('change', function() {
                localStorage.setItem('autoRestoreEnabled', this.checked);
            });
        }
    }
}

// وظيفة لإظهار إشعار الاسترجاع
function showRestoreNotification(title, message, type = "info") {
    const alert = document.createElement('div');
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? 'var(--success-color)' : 'var(--primary-color)'};
        color: white;
        padding: 15px 30px;
        border-radius: var(--border-radius);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 300px;
        animation: slideDown 0.5s ease;
    `;
    
    alert.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="bx ${type === 'success' ? 'bx-check-circle' : 'bx-info-circle'}" style="font-size: 24px;"></i>
            <span style="font-weight: bold;">${title}</span>
        </div>
        <div style="font-size: 14px;">${message}</div>
    `;
    
    document.body.appendChild(alert);
    
    // إخفاء التنبيه بعد 5 ثوانٍ
    setTimeout(() => {
        alert.style.animation = 'slideUp 0.5s ease';
        setTimeout(() => {
            document.body.removeChild(alert);
        }, 500);
    }, 5000);
}

// تحديث وظيفة تهيئة إعدادات Google Drive
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة مكتبات Google API
    initializeGoogleAPI();
    
    // تهيئة خيار الاسترجاع التلقائي
    initAutoRestoreSettings();
    
    // تهيئة خيارات المزامنة التلقائية
    initAutoSyncSettings();
    
    // إذا كان النسخ الاحتياطي التلقائي مفعلاً في التخزين المحلي
    if (localStorage.getItem('autoBackupEnabled') === 'true') {
        // التحقق من وجود توكن محفوظ
        const savedToken = localStorage.getItem('gDriveToken');
        if (savedToken) {
            accessToken = savedToken;
            setupAutoBackup();
        }
    }
    
    // التحقق من وجود توكن محفوظ للمزامنة التلقائية عند تحميل الصفحة
    const savedToken = localStorage.getItem('gDriveToken');
    const tokenExpiry = localStorage.getItem('gDriveTokenExpiry');
    
    if (savedToken && tokenExpiry && parseInt(tokenExpiry) > Date.now()) {
        // تعيين التوكن للاستخدام في المزامنة التلقائية
        accessToken = savedToken;
        
        // طلب الإذن من المتصفح للإشعارات إذا كانت المزامنة مفعلة
        if (localStorage.getItem('autoSyncEnabled') !== 'false' && 'Notification' in window) {
            Notification.requestPermission();
        }
    }
});

// جعل وظيفة الاسترجاع التلقائي متاحة عالميًا
window.autoRestoreLatestBackup = autoRestoreLatestBackup;
window.initAutoRestoreSettings = initAutoRestoreSettings;
window.showSyncError = showSyncError;

// تحديث وظيفة autoRestoreLatestBackup للاستخدام في المزامنة التلقائية
async function autoRestoreLatestBackup(forceRestore = false) {
    return new Promise(async (resolve, reject) => {
        if (!accessToken) {
            // محاولة استخدام التوكن من التخزين المحلي
            const savedToken = localStorage.getItem('gDriveToken');
            const tokenExpiry = localStorage.getItem('gDriveTokenExpiry');
            
            if (savedToken && tokenExpiry && parseInt(tokenExpiry) > Date.now()) {
                accessToken = savedToken;
            } else {
                // عرض إشعار عدم القدرة على المزامنة إذا طلب المستخدم المزامنة
                if (forceRestore && typeof showSyncError === 'function') {
                    showSyncError("تعذر استعادة البيانات", "يرجى تسجيل الدخول إلى Google Drive أولاً");
                }
                
                return resolve({
                    success: false,
                    skipped: true,
                    message: 'لم يتم تسجيل الدخول إلى Google Drive'
                });
            }
        }

        try {
            // التحقق إذا كان الاسترجاع التلقائي مفعل - لا نطبق هذا الشرط عند الطلب الصريح (forceRestore)
            const autoSyncEnabled = localStorage.getItem('autoSyncEnabled') !== 'false'; // افتراضياً مفعل
            if (!autoSyncEnabled && !forceRestore) {
                return resolve({
                    success: false,
                    skipped: true,
                    message: 'المزامنة التلقائية معطلة في الإعدادات'
                });
            }

            // البحث عن مجلد النسخ الاحتياطية
            const folderId = await googleDriveAuth.findOrCreateBackupFolder();

            // البحث عن آخر ملف نسخة احتياطية
            const response = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&orderBy=createdTime desc&pageSize=1&fields=files(id,name,createdTime,size)`, {
                headers: { 'Authorization': 'Bearer ' + accessToken }
            });

            if (!response.ok) {
                throw new Error(`خطأ في جلب النسخ الاحتياطية: ${response.status}`);
            }

            const data = await response.json();

            if (!data.files || data.files.length === 0) {
                return resolve({
                    success: false,
                    skipped: true,
                    message: 'لا توجد نسخ احتياطية متاحة'
                });
            }

            const latestBackup = data.files[0];
            
            // التحقق من تاريخ آخر نسخة احتياطية والتاريخ الحالي للمزامنة الذكية
            const lastAutoRestore = localStorage.getItem('lastAutoRestore');
            const lastRestoredBackupId = localStorage.getItem('lastRestoredBackupId');
            const lastBackupCreationTime = new Date(latestBackup.createdTime).getTime();
            const lastRestoreTime = lastAutoRestore ? new Date(lastAutoRestore).getTime() : 0;
            
            // مقارنة تاريخ النسخة الاحتياطية بآخر وقت استرجاع
            // نستعيد النسخة فقط إذا كانت أحدث من آخر استرجاع
            if (lastRestoredBackupId === latestBackup.id && !forceRestore) {
                return resolve({   // Fixed: Added missing 'return' keyword
                    success: false,
                    skipped: true,
                    message: 'النسخة الاحتياطية متزامنة بالفعل'
                });
            }

            // تحميل محتوى آخر نسخة احتياطية
            const backupResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${latestBackup.id}?alt=media`, {
                headers: { 'Authorization': 'Bearer ' + accessToken }
            });

            if (!backupResponse.ok) {
                throw new Error(`فشل في تحميل النسخة الاحتياطية: ${backupResponse.status}`);
            }

            const backupData = await backupResponse.json();

            // حفظ نسخة من البيانات الحالية للتراجع قبل الاستعادة
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

            // استرجاع البيانات من النسخة الاحتياطية
            if (backupData.balance !== undefined) balance = backupData.balance;
            if (backupData.voices) voices = backupData.voices;
            if (backupData.clients) clients = backupData.clients;
            if (backupData.reservations) reservations = backupData.reservations;
            if (backupData.invoices) invoices = backupData.invoices;
            if (backupData.invoiceAuditLog) invoiceAuditLog = backupData.invoiceAuditLog;

            // تحديث العرض
            if (typeof updateAllStatistics === 'function') updateAllStatistics();
            if (typeof updateClientsTable === 'function') updateClientsTable();
            if (typeof renderReservationsTable === 'function') renderReservationsTable();
            if (typeof renderInvoicesTable === 'function') renderInvoicesTable();
            if (typeof renderInvoiceAuditLogTable === 'function') renderInvoiceAuditLogTable();
            if (typeof populateDatalists === 'function') populateDatalists();
            try {
                populateInvoiceDatalist();
            } catch (e) {
                console.error('خطأ في تحديث قائمة الفواتير:', e);
            }
            renderReports();
            
            // تحديث المخططات
            if (typeof updateCharts === 'function') {
                try {
                    updateCharts('day');
                } catch (e) {
                    console.error('خطأ في تحديث المخططات:', e);
                }
            }

            // تخزين معلومات النسخة المسترجعة
            localStorage.setItem('lastRestoredBackupId', latestBackup.id);
            localStorage.setItem('lastAutoRestore', new Date().toISOString());

            // عرض رسالة نجاح
            showRestoreNotification("تم استرجاع النسخة الاحتياطية", 
                `تم استرجاع آخر نسخة احتياطية بنجاح: ${latestBackup.name}`, "success");

            resolve({
                success: true,
                backupId: latestBackup.id,
                backupName: latestBackup.name
            });

        } catch (error) {
            console.error('خطأ في الاسترجاع التلقائي:', error);
            reject(error);
        }
    });
}

// إضافة إعدادات المزامنة التلقائية في مودال إعدادات السحابة
function initAutoSyncSettings() {
    const autoSyncEnabled = localStorage.getItem('autoSyncEnabled') !== 'false'; // افتراضياً مفعل
    
    // إضافة الإعدادات إلى مودال إعدادات السحابة إذا لم تكن موجودة
    const settingsSection = document.querySelector('#driveBackupSettings');
    if (settingsSection && !document.getElementById('autoSyncSection')) {
        const autoSyncSection = document.createElement('div');
        autoSyncSection.id = 'autoSyncSection';
        autoSyncSection.innerHTML = `
            <div style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <label style="margin: 0;">
                        <input type="checkbox" id="enableAutoSync" ${autoSyncEnabled ? 'checked' : ''}> 
                        تمكين المزامنة التلقائية مع آخر نسخة سحابية
                    </label>
                </div>
                <div style="margin-top: 5px; font-size: 13px; color: var(--text-light);">
                    عند تفعيل هذا الخيار، سيتم مزامنة بياناتك تلقائياً مع آخر نسخة احتياطية في السحابة
                </div>
                <div style="margin-top: 15px;">
                    <button class="btn" onclick="forceSync()">
                        <i class='bx bx-sync'></i> مزامنة الآن
                    </button>
                </div>
            </div>
        `;
        settingsSection.appendChild(autoSyncSection);
        
        // إضافة مستمع لحدث تغيير حالة المزامنة التلقائية
        const autoSyncCheckbox = document.getElementById('enableAutoSync');
        if (autoSyncCheckbox) {
            autoSyncCheckbox.addEventListener('change', function() {
                localStorage.setItem('autoSyncEnabled', this.checked);
            });
        }
    }
}

// وظيفة لفرض المزامنة مع آخر نسخة سحابية
function forceSync() {
    if (typeof showSyncIndicator === 'function') {
        showSyncIndicator("جاري المزامنة الآن...");
    }
    
    // إغلاق مودال الإعدادات
    if (document.getElementById('cloudSettingsModal')) {
        document.getElementById('cloudSettingsModal').classList.remove('active');
    }
    
    // استدعاء وظيفة المزامنة مع إجبارها على التنفيذ
    autoRestoreLatestBackup(true)
        .then(result => {
            if (result.success) {
                if (typeof showSyncSuccess === 'function') {
                    showSyncSuccess("تمت المزامنة بنجاح", `تم تحميل أحدث نسخة: ${result.backupName}`);
                } else {
                    alert("تمت المزامنة بنجاح");
                }
            } else {
                alert("لم تتم المزامنة: " + result.message);
            }
            
            if (typeof hideSyncIndicator === 'function') {
                hideSyncIndicator();
            }
        })
        .catch(error => {
            console.error("خطأ في المزامنة:", error);
            if (typeof showSyncError === 'function') {
                showSyncError("فشل في المزامنة", "حدث خطأ أثناء محاولة المزامنة.");
            } else {
                alert("فشل في المزامنة: " + error.message);
            }
            
            if (typeof hideSyncIndicator === 'function') {
                hideSyncIndicator();
            }
        });
}

// تحديث وظيفة تهيئة إعدادات Google Drive
document.addEventListener('DOMContentLoaded', function() {
    // تهيئة مكتبات Google API
    initializeGoogleAPI();
    
    // تهيئة خيار الاسترجاع التلقائي
    initAutoRestoreSettings();
    
    // تهيئة خيارات المزامنة التلقائية
    initAutoSyncSettings();
    
    // إذا كان النسخ الاحتياطي التلقائي مفعلاً في التخزين المحلي
    if (localStorage.getItem('autoBackupEnabled') === 'true') {
        // التحقق من وجود توكن محفوظ
        const savedToken = localStorage.getItem('gDriveToken');
        if (savedToken) {
            accessToken = savedToken;
            setupAutoBackup();
        }
    }
    
    // التحقق من وجود توكن محفوظ للمزامنة التلقائية عند تحميل الصفحة
    const savedToken = localStorage.getItem('gDriveToken');
    const tokenExpiry = localStorage.getItem('gDriveTokenExpiry');
    
    if (savedToken && tokenExpiry && parseInt(tokenExpiry) > Date.now()) {
        // تعيين التوكن للاستخدام في المزامنة التلقائية
        accessToken = savedToken;
        
        // طلب الإذن من المتصفح للإشعارات إذا كانت المزامنة مفعلة
        if (localStorage.getItem('autoSyncEnabled') !== 'false' && 'Notification' in window) {
            Notification.requestPermission();
        }
    }
});

// إتاحة الوظائف الجديدة عالمياً
window.autoRestoreLatestBackup = autoRestoreLatestBackup;
window.initAutoSyncSettings = initAutoSyncSettings;
window.forceSync = forceSync;

// تعريف دالة عرض مؤشر المزامنة بشكل عالمي إذا لم تكن موجودة
// تعريف النسخة الافتراضية من مؤشر المزامنة
window.showSyncIndicator = function(message = "جاري مزامنة البيانات...") {
    console.log('showSyncIndicator (النسخة المحسنة):', message);
    // إنشاء مؤشر مزامنة مؤقت إذا لم يكن موجودًا
    let syncIndicator = document.getElementById('syncIndicator');
    const messageElem = document.getElementById('syncMessage');
    
    if (syncIndicator) {
        if (messageElem) {
            messageElem.textContent = message;
        }
        syncIndicator.style.opacity = "1";
        syncIndicator.style.visibility = "visible";
    } else {
        // إنشاء عنصر جديد إذا لم يكن موجودًا
        syncIndicator = document.createElement('div');
        syncIndicator.id = 'syncIndicator';
        syncIndicator.className = 'sync-indicator';
        syncIndicator.innerHTML = `
            <div class="sync-content">
                <i class='bx bx-sync bx-spin'></i>
                <p id="syncMessage">${message}</p>
            </div>
        `;
        syncIndicator.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            opacity: 1;
            visibility: visible;
        `;
        document.body.appendChild(syncIndicator);
    }
};

// تعريف النسخة الافتراضية من إخفاء مؤشر المزامنة
window.hideSyncIndicator = function() {
    console.log('hideSyncIndicator (النسخة المحسنة)');
    const syncIndicator = document.getElementById('syncIndicator');
    if (syncIndicator) {
        syncIndicator.style.opacity = "0";
        syncIndicator.style.visibility = "hidden";
        // إزالة العنصر بعد انتهاء التأثير
        setTimeout(() => {
            try {
                if (syncIndicator.parentNode) {
                    syncIndicator.parentNode.removeChild(syncIndicator);
                }
            } catch (e) {
                console.error('خطأ في إزالة مؤشر المزامنة:', e);
            }
        }, 300);
    }
};

// تصدير دوال API للاستخدام العالمي 
window.initializeGoogleAPI = initializeGoogleAPI;
window.initializeTokenClient = initializeTokenClient;
window.initGapiClient = initGapiClient;
window.maybeEnableButtons = maybeEnableButtons;
window.loadScript = loadScript;
window.googleDriveAuth = googleDriveAuth;

// إضافة تحقق من بيئة التشغيل ودعم API الغير متوفر
window.checkGoogleApiSupport = function() {
    // التحقق من توفر مكتبات Google API
    try {
        const hasGapi = typeof gapi !== 'undefined';
        const hasGSI = typeof google !== 'undefined' && typeof google.accounts !== 'undefined';
        
        if (!hasGapi || !hasGSI) {
            console.warn('مكتبات Google API غير متوفرة بالكامل - استخدام الوضع المحلي فقط');
            
            // تمكين زر المصادقة على أي حال مع تعديل سلوكه
            const authBtn = document.getElementById('googleDriveAuthBtn');
            const driveAuthMessage = document.getElementById('driveAuthMessage');
            
            // تحديث زر المصادقة ورسالة الحالة
            if (authBtn) {
                authBtn.disabled = false;
                authBtn.textContent = 'استخدام التخزين المحلي فقط';
                authBtn.className = 'btn btn-warning'; // تغيير لون الزر للتنبيه

                // تعديل سلوك النقر على الزر
                authBtn.onclick = function() {
                    const localStorageAvailable = typeof localStorage !== 'undefined';
                    
                    if (localStorageAvailable) {
                        window.showSyncIndicator('التخزين السحابي غير متاح. يتم استخدام التخزين المحلي فقط.');
                        
                        // حفظ تفضيل المستخدم لاستخدام التخزين المحلي فقط
                        localStorage.setItem('useLocalStorageOnly', 'true');
                        
                        // إظهار خيارات الحفظ المحلي إذا كانت موجودة
                        const localBackupSection = document.getElementById('localBackupSettings');
                        if (localBackupSection) {
                            localBackupSection.style.display = 'block';
                        }
                        
                        // إخفاء رسالة المزامنة بعد 3 ثوانٍ
                        setTimeout(window.hideSyncIndicator, 3000);
                    } else {
                        alert('التخزين المحلي غير متاح في هذا المتصفح. لن يتم حفظ البيانات.');
                    }
                };
            }
            
            // تحديث رسالة الحالة
            if (driveAuthMessage) {
                driveAuthMessage.textContent = 'خدمة Google Drive غير متاحة. يمكنك استخدام التخزين المحلي.';
                driveAuthMessage.style.color = 'orange';
            }
            
            // إظهار خيارات النسخ الاحتياطي المحلية
            const localBackupSection = document.getElementById('localBackupSettings');
            if (localBackupSection) {
                localBackupSection.style.display = 'block';
            }
            
            // إخفاء خيارات التخزين السحابي
            const cloudSettingsSection = document.getElementById('driveBackupSettings');
            if (cloudSettingsSection) {
                cloudSettingsSection.style.display = 'none';
            }
            
            return false;
        }
        
        return true;
    } catch (e) {
        console.error('خطأ في التحقق من دعم Google API:', e);
        
        // إظهار رسالة خطأ
        const driveAuthMessage = document.getElementById('driveAuthMessage');
        if (driveAuthMessage) {
            driveAuthMessage.textContent = 'حدث خطأ أثناء تهيئة خدمات Google. استخدم التخزين المحلي.';
            driveAuthMessage.style.color = 'red';
        }
        
        return false;
    }
};

// تصدير الدوال الهامة للنسخ الاحتياطي للاستخدام العالمي
window.backupToDriveOriginal = backupToDrive;
window.restoreFromDriveOriginal = restoreFromDrive;
window.deleteFromDriveOriginal = deleteFromDrive;
window.setupAutoBackupOriginal = setupAutoBackup;
window.clearAutoBackupOriginal = clearAutoBackup;

// استخدام النسخة العامة من showSyncIndicator
window.showSyncIndicatorOriginal = window.showSyncIndicator;
window.hideSyncIndicatorOriginal = window.hideSyncIndicator;

console.log('تم تصدير دوال النسخ الاحتياطي للاستخدام العالمي');
