const TelegramBot = require('node-telegram-bot-api');
const { Pool } = require('pg');
const cron = require('node-cron');

const TOKEN = '8601010853:AAG2NdP5HyogrysY16wso-AoF5pBvfBZdwA';
const bot = new TelegramBot(TOKEN, { polling: true });

const pool = new Pool({
  connectionString: 'postgresql://postgres:LaHrISWNalJDgKdpHxKwcrqzQiYzULCm@postgres.railway.internal:5432/railway',
  ssl: false
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        joined_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        user_id BIGINT,
        action TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        user_id BIGINT,
        username TEXT,
        first_name TEXT,
        level TEXT,
        goal TEXT,
        time_available TEXT,
        obstacle TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ DB initialized');
  } catch (e) {
    console.error('DB init error:', e.message);
  }
}

async function trackUser(user) {
  try {
    await pool.query(`
      INSERT INTO users (id, username, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING
    `, [user.id, user.username || null, user.first_name || null, user.last_name || null]);
  } catch (e) {}
}

async function trackEvent(userId, action) {
  try {
    await pool.query(`INSERT INTO events (user_id, action) VALUES ($1, $2)`, [userId, action]);
  } catch (e) {}
}

async function saveLead(userId, username, firstName, session) {
  try {
    const levelMap = { q1_beginner: 'مبتدئ', q1_mid: 'متوسط', q1_advanced: 'متقدم' };
    const goalMap = { q2_extra: 'دخل إضافي', q2_project: 'مشروع مالي مستقل', q2_invest: 'استثمار' };
    const timeMap = { q3_low: 'أقل من ساعة', q3_mid: '1-3 ساعات', q3_high: 'أكثر من 3 ساعات' };
    const blockMap = { q4_start: 'ما يعرف من وين يبدأ', q4_lost: 'جرب وخسر', q4_confused: 'معلومات كثير' };
    await pool.query(`
      INSERT INTO leads (user_id, username, first_name, level, goal, time_available, obstacle)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [userId, username, firstName, levelMap[session.q1] || '-', goalMap[session.q2] || '-', timeMap[session.q3] || '-', blockMap[session.q4] || '-']);
  } catch (e) {}
}

// تقرير يومي الساعة 9 الصبح
cron.schedule('0 9 * * *', async () => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const todayUsers = await pool.query(`SELECT COUNT(*) FROM users WHERE joined_at >= NOW() - INTERVAL '24 hours'`);
    const totalLeads = await pool.query('SELECT COUNT(*) FROM leads');
    const todayLeads = await pool.query(`SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '24 hours'`);
    const channelClicks = await pool.query(`SELECT COUNT(*) FROM events WHERE action = 'gold' AND created_at >= NOW() - INTERVAL '24 hours'`);
    const msg = `📊 *التقرير اليومي*\n\n👥 إجمالي المستخدمين: ${totalUsers.rows[0].count}\n🆕 جدد اليوم: ${todayUsers.rows[0].count}\n\n🎯 إجمالي الليدز: ${totalLeads.rows[0].count}\n📥 ليدز اليوم: ${todayLeads.rows[0].count}\n\n📊 نقرات الذهب اليوم: ${channelClicks.rows[0].count}`;
    await bot.sendMessage('@GCAbd', msg, { parse_mode: 'Markdown' });
  } catch (e) {
    console.error('Daily report error:', e.message);
  }
}, { timezone: 'Asia/Amman' });

// أمر الإحصائيات الفورية
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  if (msg.from.username !== 'GCAbd') return;
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const totalLeads = await pool.query('SELECT COUNT(*) FROM leads');
    const todayUsers = await pool.query(`SELECT COUNT(*) FROM users WHERE joined_at >= NOW() - INTERVAL '24 hours'`);
    const todayLeads = await pool.query(`SELECT COUNT(*) FROM leads WHERE created_at >= NOW() - INTERVAL '24 hours'`);
    const msg2 = `📊 *الإحصائيات الآن*\n\n👥 إجمالي المستخدمين: ${totalUsers.rows[0].count}\n🆕 جدد اليوم: ${todayUsers.rows[0].count}\n\n🎯 إجمالي الليدز: ${totalLeads.rows[0].count}\n📥 ليدز اليوم: ${todayLeads.rows[0].count}`;
    bot.sendMessage(chatId, msg2, { parse_mode: 'Markdown' });
  } catch (e) {
    bot.sendMessage(chatId, '❌ خطأ في الاتصال بالداتابيس');
  }
});

const userSessions = {};
function getSession(chatId) {
  if (!userSessions[chatId]) userSessions[chatId] = {};
  return userSessions[chatId];
}

const mainMenuKeyboard = {
  inline_keyboard: [
    [{ text: '📱 صفحاتنا على السوشيال ميديا', callback_data: 'social' }],
    [{ text: '📈 أريد أتعلم التداول', callback_data: 'trading_q1' }],
    [{ text: '📊 تحليل الذهب المجاني', callback_data: 'gold' }]
  ]
};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'صديقي';
  userSessions[chatId] = {};
  await trackUser(msg.from);
  await trackEvent(chatId, 'start');
  bot.sendMessage(chatId,
    `👋 أرحب بـ ${firstName}!\n\nأنا البوت الرسمي الخاص بأحمد العتوم 🤖\n\nسواء كنت بدك تتعلم التداول، تطور نفسك مالياً، أو تنضم لمجتمع الناجحين — أنت وصلت للمكان الصح! 🚀\n\nشو بتحب تعمل؟ 👇`,
    { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard }
  );
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  const session = getSession(chatId);

  await trackUser(query.from);
  await trackEvent(chatId, data);

  try {
    if (data === 'social') {
      await bot.editMessageText('📱 *تابعنا على منصاتنا:*\n\nاختار المنصة اللي تريدها 👇', {
        chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [
          [{ text: '📸 إنستغرام - أحمد العتوم', url: 'https://www.instagram.com/ahmad.sotoom?igsh=MXA2ZHFxMXBleW1jbw==' }],
          [{ text: '💼 إنستغرام - أعمال وتداول', url: 'https://www.instagram.com/ahmad.sotoommarketing?igsh=MXM3cDM5dXRscjkydg%3D%3D&utm_source=qr' }],
          [{ text: '🎵 تيك توك', url: 'https://www.tiktok.com/@otoomgamechangers' }],
          [{ text: '▶️ يوتيوب', url: 'https://youtube.com/@ahmad.sotoom?si=yTibamyi9Xad6ihg' }],
          [{ text: '🔙 رجوع', callback_data: 'back_start' }]
        ]}
      });
    }

    else if (data === 'back_start') {
      const firstName = query.from.first_name || 'صديقي';
      userSessions[chatId] = {};
      await bot.editMessageText(
        `👋 أرحب بـ ${firstName}!\n\nأنا البوت الرسمي الخاص بأحمد العتوم 🤖\n\nسواء كنت بدك تتعلم التداول، تطور نفسك مالياً، أو تنضم لمجتمع الناجحين — أنت وصلت للمكان الصح! 🚀\n\nشو بتحب تعمل؟ 👇`,
        { chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown', reply_markup: mainMenuKeyboard }
      );
    }

    else if (data === 'gold') {
      await bot.editMessageText('📊 *تحليل الذهب المجاني*\n\nالتحليل اليومي لحركة الذهب في قناة العصامي وبشكل مجاني!', {
        chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [
          [{ text: '👇 انضم للقناة', url: 'https://t.me/ahmadsotoomm' }],
          [{ text: '🔙 رجوع', callback_data: 'back_start' }]
        ]}
      });
    }

    else if (data === 'trading_q1') {
      await bot.editMessageText('📊 *سؤال 1 من 4*\n\nما مستوى خبرتك بالتداول؟', {
        chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [
          [{ text: '🔴 مبتدئ — ما جربت قبل', callback_data: 'q1_beginner' }],
          [{ text: '🟡 متوسط — جربت بس ما ثبّتت', callback_data: 'q1_mid' }],
          [{ text: '🟢 متقدم — عندي خبرة بس بدي أطور', callback_data: 'q1_advanced' }]
        ]}
      });
    }

    else if (['q1_beginner', 'q1_mid', 'q1_advanced'].includes(data)) {
      session.q1 = data;
      await bot.editMessageText('🎯 *سؤال 2 من 4*\n\nشو هدفك الرئيسي؟', {
        chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [
          [{ text: '💰 دخل إضافي جانبي', callback_data: 'q2_extra' }],
          [{ text: '💼 بناء مشروع مالي مستقل', callback_data: 'q2_project' }],
          [{ text: '📈 استثمار وتنمية رأس مال', callback_data: 'q2_invest' }]
        ]}
      });
    }

    else if (['q2_extra', 'q2_project', 'q2_invest'].includes(data)) {
      session.q2 = data;
      await bot.editMessageText('⏱ *سؤال 3 من 4*\n\nكم وقت عندك يومياً للتعلم؟', {
        chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [
          [{ text: '⏱ أقل من ساعة', callback_data: 'q3_low' }],
          [{ text: '⏱ 1-3 ساعات', callback_data: 'q3_mid' }],
          [{ text: '⏱ أكثر من 3 ساعات', callback_data: 'q3_high' }]
        ]}
      });
    }

    else if (['q3_low', 'q3_mid', 'q3_high'].includes(data)) {
      session.q3 = data;
      await bot.editMessageText('🤔 *سؤال 4 من 4*\n\nشو أكبر عائق عندك هلق؟', {
        chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [
          [{ text: '😕 ما بعرف من وين أبدأ', callback_data: 'q4_start' }],
          [{ text: '💸 جربت وخسرت', callback_data: 'q4_lost' }],
          [{ text: '🤯 معلومات كثير ومش عارف الصح', callback_data: 'q4_confused' }]
        ]}
      });
    }

    else if (['q4_start', 'q4_lost', 'q4_confused'].includes(data)) {
      session.q4 = data;
      const userName = query.from.first_name + (query.from.last_name ? ' ' + query.from.last_name : '');
      const userUsername = query.from.username ? '@' + query.from.username : 'ما عنده يوزرنيم';
      const levelMap = { q1_beginner: '🔴 مبتدئ', q1_mid: '🟡 متوسط', q1_advanced: '🟢 متقدم' };
      const goalMap = { q2_extra: '💰 دخل إضافي', q2_project: '💼 مشروع مالي مستقل', q2_invest: '📈 استثمار' };
      const timeMap = { q3_low: 'أقل من ساعة', q3_mid: '1-3 ساعات', q3_high: 'أكثر من 3 ساعات' };
      const blockMap = { q4_start: 'ما يعرف من وين يبدأ', q4_lost: 'جرب وخسر', q4_confused: 'معلومات كثير ومش عارف الصح' };
      await saveLead(chatId, userUsername, userName, session);
      const adminMsg = `🔔 *لييد جديد!*\n\n👤 الاسم: ${userName}\n📲 يوزرنيم: ${userUsername}\n🆔 ID: ${chatId}\n\n📊 المستوى: ${levelMap[session.q1] || '-'}\n🎯 الهدف: ${goalMap[session.q2] || '-'}\n⏱ الوقت: ${timeMap[session.q3] || '-'}\n🚧 العائق: ${blockMap[session.q4] || '-'}`;
      try { await bot.sendMessage('@GCAbd', adminMsg, { parse_mode: 'Markdown' }); } catch (e) {}
      let customMsg = '';
      if (session.q1 === 'q1_beginner') {
        customMsg = 'البداية الصح بتغير كل شي ✅ أحمد بنى مسار خصيصاً للي ما جربوا قبل — خطوة خطوة من الصفر لحد ما تصير عندك نتائج حقيقية.';
      } else if (session.q1 === 'q1_mid') {
        customMsg = 'الثبات هو الفرق بين اللي بينجح واللي بيوقف 💪 عندنا ما بيعلمك تتداول بس — بيعلمك تبني عقلية التاجر الناجح.';
      } else {
        customMsg = 'الخبرة بدونها منهجية صح بتضيع الفرص 🎯 GOAI بتقدملك الأدوات والذكاء الاصطناعي اللي بيرفع نتائجك لمستوى تاني.';
      }
      await bot.editMessageText(
        `✅ *شكراً على إجاباتك!*\n\n${customMsg}\n\n━━━━━━━━━━━━━━━\nشو بتحب تعمل هلق؟ 👇`,
        {
          chat_id: chatId, message_id: query.message.message_id, parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [
            [{ text: '🎥 شاهد فيديو أحمد عن GOAI', url: 'https://t.me/startwithotoom' }],
            [{ text: '📲 تواصل مع المساعد مباشرة', url: 'https://wa.me/441245822927' }],
            [{ text: '🔙 رجوع للقائمة الرئيسية', callback_data: 'back_start' }]
          ]}
        }
      );
    }

  } catch (err) {
    console.error('Error:', err.message);
  }

  try { await bot.answerCallbackQuery(query.id); } catch (e) {}
});

initDB().then(() => console.log('✅ Bot is running...'));
