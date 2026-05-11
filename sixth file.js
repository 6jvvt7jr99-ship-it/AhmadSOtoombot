const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8601010853:AAG2NdP5HyogrysY16wso-AoF5pBvfBZdwA';
const bot = new TelegramBot(TOKEN, { polling: true });

// Store user answers
const userSessions = {};

// =================== START ===================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || 'صديقي';

  userSessions[chatId] = {};

  bot.sendMessage(chatId,
    `👋 أرحب بـ ${firstName}!\n\nأنا البوت الرسمي الخاص بأحمد العتوم 🤖\n\nسواء كنت بدك تتعلم التداول، تطور نفسك مالياً، أو تنضم لمجتمع الناجحين — أنت وصلت للمكان الصح! 🚀\n\nشو بتحب تعمل؟ 👇`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📱 صفحاتنا على السوشيال ميديا', callback_data: 'social' }],
          [{ text: '📈 أريد أتعلم التداول', callback_data: 'trading_q1' }]
        ]
      }
    }
  );
});

// =================== SOCIAL MEDIA ===================
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // --- Social Media ---
  if (data === 'social') {
    await bot.editMessageText(
      '📱 *تابعنا على منصاتنا:*\n\nاختار المنصة اللي تريدها 👇',
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📸 إنستغرام - أحمد العتوم', url: 'https://www.instagram.com/ahmad.sotoom?igsh=MXA2ZHFxMXBleW1jbw==' }],
            [{ text: '💼 إنستغرام - أعمال وتداول', url: 'https://www.instagram.com/ahmad.sotoommarketing?igsh=MXM3cDM5dXRscjkydg%3D%3D&utm_source=qr' }],
            [{ text: '🎵 تيك توك', url: 'https://www.tiktok.com/@otoomgamechangers' }],
            [{ text: '▶️ يوتيوب', url: 'https://youtube.com/@ahmad.sotoom?si=yTibamyi9Xad6ihg' }],
            [{ text: '🔙 رجوع', callback_data: 'back_start' }]
          ]
        }
      }
    );
  }

  // --- Back to Start ---
  if (data === 'back_start') {
    const firstName = query.from.first_name || 'صديقي';
    userSessions[chatId] = {};
    await bot.editMessageText(
      `👋 أرحب بـ ${firstName}!\n\nأنا البوت الرسمي الخاص بأحمد العتوم 🤖\n\nسواء كنت بدك تتعلم التداول، تطور نفسك مالياً، أو تنضم لمجتمع الناجحين — أنت وصلت للمكان الصح! 🚀\n\nشو بتحب تعمل؟ 👇`,
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 صفحاتنا على السوشيال ميديا', callback_data: 'social' }],
            [{ text: '📈 أريد أتعلم التداول', callback_data: 'trading_q1' }]
          ]
        }
      }
    );
  }

  // =================== TRADING Q1 ===================
  if (data === 'trading_q1') {
    await bot.editMessageText(
      '📊 *سؤال 1 من 4*\n\nما مستوى خبرتك بالتداول؟',
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔴 مبتدئ — ما جربت قبل', callback_data: 'q1_beginner' }],
            [{ text: '🟡 متوسط — جربت بس ما ثبّتت', callback_data: 'q1_mid' }],
            [{ text: '🟢 متقدم — عندي خبرة بس بدي أطور', callback_data: 'q1_advanced' }]
          ]
        }
      }
    );
  }

  // =================== TRADING Q2 ===================
  if (['q1_beginner', 'q1_mid', 'q1_advanced'].includes(data)) {
    if (!userSessions[chatId]) userSessions[chatId] = {};
    userSessions[chatId].q1 = data;

    await bot.editMessageText(
      '🎯 *سؤال 2 من 4*\n\nشو هدفك الرئيسي؟',
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💰 دخل إضافي جانبي', callback_data: 'q2_extra' }],
            [{ text: '💼 بناء مشروع مالي مستقل', callback_data: 'q2_project' }],
            [{ text: '📈 استثمار وتنمية رأس مال', callback_data: 'q2_invest' }]
          ]
        }
      }
    );
  }

  // =================== TRADING Q3 ===================
  if (['q2_extra', 'q2_project', 'q2_invest'].includes(data)) {
    userSessions[chatId].q2 = data;

    await bot.editMessageText(
      '⏱ *سؤال 3 من 4*\n\nكم وقت عندك يومياً للتعلم؟',
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⏱ أقل من ساعة', callback_data: 'q3_low' }],
            [{ text: '⏱ 1-3 ساعات', callback_data: 'q3_mid' }],
            [{ text: '⏱ أكثر من 3 ساعات', callback_data: 'q3_high' }]
          ]
        }
      }
    );
  }

  // =================== TRADING Q4 ===================
  if (['q3_low', 'q3_mid', 'q3_high'].includes(data)) {
    userSessions[chatId].q3 = data;

    await bot.editMessageText(
      '🤔 *سؤال 4 من 4*\n\nشو أكبر عائق عندك هلق؟',
      {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '😕 ما بعرف من وين أبدأ', callback_data: 'q4_start' }],
            [{ text: '💸 جربت وخسرت', callback_data: 'q4_lost' }],
            [{ text: '🤯 معلومات كثير ومش عارف الصح', callback_data: 'q4_confused' }]
          ]
        }
      }
    );
  }

  // =================== FINAL RESULT ===================
  if (['q4_start', 'q4_lost', 'q4_confused'].includes(data)) {
    userSessions[chatId].q4 = data;

    const session = userSessions[chatId];

    // Build summary for admin notification
    const levelMap = { q1_beginner: '🔴 مبتدئ', q1_mid: '🟡 متوسط', q1_advanced: '🟢 متقدم' };
    const goalMap = { q2_extra: '💰 دخل إضافي', q2_project: '💼 مشروع مالي مستقل', q2_invest: '📈 استثمار' };
    const timeMap = { q3_low: 'أقل من ساعة', q3_mid: '1-3 ساعات', q3_high: 'أكثر من 3 ساعات' };
    const blockMap = { q4_start: 'ما يعرف من وين يبدأ', q4_lost: 'جرب وخسر', q4_confused: 'معلومات كثير ومش عارف الصح' };

    const userName = query.from.first_name + (query.from.last_name ? ' ' + query.from.last_name : '');
    const userUsername = query.from.username ? `@${query.from.username}` : 'ما عنده يوزرنيم';

    // Notify admin
    const adminMsg = `🔔 *لييد جديد!*\n\n👤 الاسم: ${userName}\n📲 يوزرنيم: ${userUsername}\n🆔 ID: ${chatId}\n\n📊 المستوى: ${levelMap[session.q1] || '-'}\n🎯 الهدف: ${goalMap[session.q2] || '-'}\n⏱ الوقت: ${timeMap[session.q3] || '-'}\n🚧 العائق: ${blockMap[session.q4] || '-'}`;

    try {
      await bot.sendMessage('@GCAbd', adminMsg, { parse_mode: 'Markdown' });
    } catch (e) {
      // Admin notification failed silently
    }

    // Custom message based on level
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
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎥 شاهد فيديو أحمد عن GOAI', url: 'https://t.me/startwithotoom' }],
            [{ text: '📲 تواصل مع المساعد مباشرة', url: 'https://t.me/GCAbd' }],
            [{ text: '🔙 رجوع للقائمة الرئيسية', callback_data: 'back_start' }]
          ]
        }
      }
    );
  }

  await bot.answerCallbackQuery(query.id);
});

console.log('✅ GOAI Bot is running...');
