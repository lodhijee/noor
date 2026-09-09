/* =============================================================
   native-alarms.js — پس منظر میں اذان کے الارم (Capacitor)
   -------------------------------------------------------------
   index.html کے آخر میں، مرکزی <script> کے بعد لگائیں:
       <script src="native-alarms.js"></script>

   یہ فائل index.html کے computeTimes() اور localStorage
   ('lat','lng','method','madhab','alarms') کو استعمال کرتی ہے۔
   ویب پر خاموش رہتی ہے، صرف اینڈرائیڈ/iOS ایپ میں کام کرتی ہے۔
   ============================================================= */
(function () {
  'use strict';

  const Cap = window.Capacitor;
  const LN  = Cap && Cap.Plugins && Cap.Plugins.LocalNotifications;
  const APP = Cap && Cap.Plugins && Cap.Plugins.App;
  const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const platform = (Cap && Cap.getPlatform && Cap.getPlatform()) || 'web';

  const CHANNEL = 'adhan_channel';
  const SOUND   = 'adhan.wav';        // android/app/src/main/res/raw/adhan.wav
  const DAYS    = 7;                  // کتنے دن آگے تک شیڈول کرنا ہے

  const PRAYERS = [
    { key: 'fajr',    ur: 'فجر'    },
    { key: 'dhuhr',   ur: 'ظہر'    },
    { key: 'asr',     ur: 'عصر'    },
    { key: 'maghrib', ur: 'مغرب'   },
    { key: 'isha',    ur: 'عشاء'   }
  ];

  const read = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };

  /* ---------- اجازتیں ---------- */
  async function ensurePermission() {
    const cur = await LN.checkPermissions();
    if (cur.display === 'granted') return true;
    const req = await LN.requestPermissions();
    return req.display === 'granted';
  }

  // اینڈرائیڈ 12+ پر عین وقت پر الارم کے لیے الگ اجازت درکار ہے
  async function ensureExactAlarms() {
    if (platform !== 'android' || !LN.checkExactNotificationSetting) return true;
    try {
      const r = await LN.checkExactNotificationSetting();
      if (r.exact_alarm === 'granted') return true;
      await LN.changeExactNotificationSetting();   // سسٹم اسکرین کھلے گی
      return false;
    } catch { return true; }
  }

  async function ensureChannel() {
    if (platform !== 'android' || !LN.createChannel) return;
    await LN.createChannel({
      id: CHANNEL,
      name: 'اذان کے اوقات',
      description: 'نماز کے وقت پر اذان کی اطلاع',
      importance: 5,          // HIGH — آواز کے ساتھ
      visibility: 1,          // لاک اسکرین پر نظر آئے
      sound: SOUND,
      vibration: true,
      lights: true
    });
  }

  /* ---------- وقت → Date ---------- */
  function toDate(baseDate, hours) {
    const d = new Date(baseDate);
    d.setHours(0, 0, 0, 0);
    return new Date(d.getTime() + Math.round(hours * 3600 * 1000));
  }

  /* ---------- اصل شیڈولنگ ---------- */
  async function scheduleAdhanAlarms(opts = {}) {
    if (!LN || !isNative) return { scheduled: 0, reason: 'web' };
    if (typeof computeTimes !== 'function') return { scheduled: 0, reason: 'no-engine' };

    const lat        = opts.lat        ?? read('lat', null);
    const lng        = opts.lng        ?? read('lng', null);
    const method     = opts.method     ?? read('method', 'karachi');
    const asrFactor  = opts.asrFactor  ?? Number(read('madhab', '1'));
    const alarms     = opts.alarms     ?? read('alarms', { fajr:true, dhuhr:true, asr:true, maghrib:true, isha:true });
    const preMinutes = opts.preMinutes ?? Number(read('preMinutes', 0));   // پہلے سے یاد دہانی
    const days       = opts.days       ?? DAYS;

    if (lat === null || lng === null) return { scheduled: 0, reason: 'no-location' };

    if (!(await ensurePermission())) return { scheduled: 0, reason: 'no-permission' };
    await ensureExactAlarms();
    await ensureChannel();

    // پرانے شیڈول ہٹائیں تاکہ ڈبل نہ بجیں
    try {
      const pending = await LN.getPending();
      if (pending.notifications && pending.notifications.length) {
        await LN.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
      }
    } catch {}

    const list = [];
    const now  = Date.now();

    for (let d = 0; d < days; d++) {
      const date = new Date();
      date.setDate(date.getDate() + d);
      const tz = -date.getTimezoneOffset() / 60;              // اُس دن کا اصل ٹائم زون (DST سمیت)
      const t  = computeTimes(date, lat, lng, tz, method, asrFactor);

      PRAYERS.forEach((p, i) => {
        if (!alarms[p.key]) return;
        const h = t[p.key];
        if (h === null || isNaN(h)) return;

        const at = toDate(date, h - preMinutes / 60);
        if (at.getTime() < now + 20000) return;               // گزرا ہوا وقت چھوڑ دیں

        list.push({
          id: (d + 1) * 10 + i,                               // منفرد اور دوبارہ قابلِ منسوخ
          title: p.ur + ' کا وقت',
          body: preMinutes
            ? `${preMinutes} منٹ بعد ${p.ur} کی اذان ہو گی۔`
            : `اللہ اکبر — ${p.ur} کی نماز کا وقت ہو گیا ہے۔`,
          schedule: { at, allowWhileIdle: true },             // Doze موڈ میں بھی چلے
          channelId: CHANNEL,
          sound: SOUND,
          smallIcon: 'ic_stat_adhan',
          ongoing: false,
          autoCancel: true,
          extra: { prayer: p.key, day: d }
        });
      });
    }

    if (!list.length) return { scheduled: 0, reason: 'nothing-due' };

    await LN.schedule({ notifications: list });
    localStorage.setItem('lastScheduled', String(Date.now()));
    return { scheduled: list.length, until: list[list.length - 1].schedule.at };
  }

  async function cancelAllAlarms() {
    if (!LN) return;
    const pending = await LN.getPending();
    if (pending.notifications && pending.notifications.length) {
      await LN.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
    }
  }

  /* ---------- خودکار ری شیڈول ---------- */
  async function refresh() {
    try {
      const res = await scheduleAdhanAlarms();
      if (res.scheduled && typeof toast === 'function') {
        toast(`${res.scheduled} الارم شیڈول ہو گئے`);
      }
      return res;
    } catch (e) { console.warn('adhan schedule failed', e); }
  }

  if (isNative && LN) {
    // ایپ کھلنے پر
    document.addEventListener('deviceready', refresh, { once: true });
    window.addEventListener('load', refresh, { once: true });

    // ایپ دوبارہ سامنے آنے پر (اگلے دنوں کے الارم بھرنے کے لیے)
    if (APP && APP.addListener) {
      APP.addListener('appStateChange', ({ isActive }) => { if (isActive) refresh(); });
    }

    // اطلاع پر ٹیپ کرنے سے نماز والا ٹیب کھلے
    LN.addListener('localNotificationActionPerformed', () => {
      const tab = document.querySelector('.tabbar button[data-pg="salah"]');
      if (tab) tab.click();
    });
  }

  /* ---------- ترتیبات بدلنے پر خودکار ری شیڈول ----------
     index.html کے ان بٹنوں سے جُڑ جاتا ہے: گھنٹی، مسلک، طریقہ، مقام  */
  document.addEventListener('click', e => {
    if (e.target.closest('.bell') || e.target.closest('#locBtn') || e.target.closest('#manualBtn')) {
      setTimeout(refresh, 700);
    }
  });
  ['#madhab', '#method'].forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.addEventListener('change', () => setTimeout(refresh, 300));
  });

  /* ---------- باہر کے لیے ---------- */
  window.scheduleAdhanAlarms = scheduleAdhanAlarms;
  window.cancelAdhanAlarms   = cancelAllAlarms;
  window.refreshAdhanAlarms  = refresh;
})();
