// إضافة وظائف للصفحة index.html
document.addEventListener("DOMContentLoaded", function() {
    // وظيفة للتحقق من العناصر المطلوبة
    function setupAutoSave() {
        console.log('تم تهيئة الحفظ التلقائي');
        // إضافة وظيفة للحفظ التلقائي كل 5 دقائق
        const autoSaveInterval = 5 * 60 * 1000; // 5 دقائق
        setInterval(function() {
            if (typeof saveState === 'function') {
                saveState();
                console.log('تم حفظ الحالة تلقائياً');
            }
        }, autoSaveInterval);
    }

    // إضافة setupAutoSave للنافذة
    window.setupAutoSave = setupAutoSave;
});