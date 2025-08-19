const TelegramBot = require('node-telegram-bot-api');
const db = require('./db/index');
require('dotenv').config();
const PROMO_CODES = { 'FREEHOROSCOPE2025': 'free_access' };
const promoAccessUsers = new Set();
const MONTHS = [
    ['Янв', 'Фев', 'Мар', 'Апр'],
    ['Май', 'Июн', 'Июл', 'Авг'],
    ['Сен', 'Окт', 'Ноя', 'Дек']
];
const startKeyboard = {
    reply_markup: {
        keyboard: [
            ['Подписаться', 'Ввести промокод']
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};

const mainKeyboard = {
    reply_markup: {
        keyboard: [
            ['Сгенерировать гороскоп', 'Обновить данные'],
            ['Ввести промокод', 'Отменить подписку']
        ],
        resize_keyboard: true,
        one_time_keyboard: false
    }
};
const userInputState = {};
function startBot() {
    db.initDB();
    const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

    bot.onText(/\/start/, (msg) => {
        bot.sendMessage(msg.chat.id, 'Добро пожаловать! Выберите действие:', startKeyboard);
    });
    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        
        if (text === 'Подписаться') {
            await db.subscribeUser(chatId);
            bot.sendMessage(chatId, 'Вы успешно подписались!');
            userInputState[chatId] = { step: 'year' };
            bot.sendMessage(chatId, 'Введите год рождения (например, 1995):', {
                reply_markup: { remove_keyboard: true }
            });
            return;
        }

        if (text === 'Ввести промокод') {
            bot.sendMessage(chatId, 'Введите промокод:', startKeyboard);
            bot.once('message', (msg) => {
                const code = msg.text.trim();
                if (PROMO_CODES[code] === 'free_access') {
                    promoAccessUsers.add(chatId);
                    bot.sendMessage(chatId, 'Промокод активирован! Теперь введите ваши данные для гороскопа (дата рождения ГГГГ-ММ-ДД, время ЧЧ:ММ, пол M/F, имя):', mainKeyboard);
                } else {
                    bot.sendMessage(chatId, 'Промокод недействителен.', startKeyboard);
                }
            });
        }

        if (
            text === 'Обновить данные'
        ){
            userInputState[chatId] = { step: 'year' };
            bot.sendMessage(chatId, 'Введите год рождения:', {
                reply_markup: { remove_keyboard: true }
            });
            return;
        }

        if (userInputState[chatId]) {
            const state = userInputState[chatId];

            
            if (state.step === 'year') {
                const yearText = text.trim(); 
                const yearNum = Number(yearText);
                const currentYear = new Date().getFullYear();
                if (!/^\d{4}$/.test(yearText) || yearNum < 1900 || yearNum > currentYear) {
                    bot.sendMessage(chatId, `Введите год рождения от 1900 до ${currentYear}:`, {
                        reply_markup: { remove_keyboard: true }
                    });
                    return;
                }
                state.year = yearNum;
                state.step = 'month';
                bot.sendMessage(chatId, `Выберите месяц рождения (${state.year}):`, {
                    reply_markup: {
                        keyboard: MONTHS,
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });
                return;
            }

          
            if (state.step === 'month') {
                const monthNames = [].concat(...MONTHS);
                if (monthNames.includes(text)) {
                    state.month = monthNames.indexOf(text) + 1;
                    state.step = 'day';
                    
                    const daysInMonth = new Date(state.year, state.month, 0).getDate();
                    let calendar = [];
                    let week = [];
                    let firstDay = new Date(state.year, state.month - 1, 1).getDay();
                    firstDay = firstDay === 0 ? 7 : firstDay; 
                    for (let i = 1; i < firstDay; i++) week.push('');
                    for (let d = 1; d <= daysInMonth; d++) {
                        week.push(String(d));
                        if (week.length === 7) {
                            calendar.push(week);
                            week = [];
                        }
                    }
                    if (week.length) calendar.push(week);
                    bot.sendMessage(chatId, `Выберите день рождения (${text} ${state.year}):`, {
                        reply_markup: {
                            keyboard: calendar,
                            resize_keyboard: true,
                            one_time_keyboard: true
                        }
                    });
                    return;
                }
            }
            if (state.step === 'day') {
                if (/^\d{1,2}$/.test(text)) {
                    state.day = text.padStart(2, '0');
                    state.step = 'birthTime';
                    bot.sendMessage(chatId, 'Выберите время рождения:', {
                        reply_markup: {
                            keyboard: [
                                ['00:00', '06:00', '12:00', '18:00'],
                                ['Другое время']
                            ],
                            resize_keyboard: true,
                            one_time_keyboard: true
                        }
                    });
                    return;
                } else {
                    bot.sendMessage(chatId, 'Пожалуйста, выберите день рождения с помощью кнопки.', {
                        reply_markup: {
                            keyboard: calendar, 
                            resize_keyboard: true,
                            one_time_keyboard: true
                        }
                    });
                    return;
                }
            }
            if (state.step === 'birthTime') {
                if (text === 'Другое время') {
                    bot.sendMessage(chatId, 'Введите время рождения в формате ЧЧ:ММ:',{
                        reply_markup: { remove_keyboard: true }
                    });

                    state.step = 'birthTimeManual';
                    return;
                }
                if (/^\d{2}:\d{2}$/.test(text)) {
                    state.birthTime = text;
                    state.step = 'gender';
                    bot.sendMessage(chatId, 'Выберите пол:', {
                        reply_markup: {
                            keyboard: [
                                ['M', 'F']
                            ],
                            resize_keyboard: true,
                            one_time_keyboard: true
                        }
                    });
                    return;
                }
            }

           if (state.step === 'birthTimeManual') {
                if (!text.match(/^\d{2}:\d{2}$/)) {
                    bot.sendMessage(chatId, 'Неверный формат. Введите время в формате ЧЧ:ММ:', {
                        reply_markup: { remove_keyboard: true }
                    });
                    return;
                }
                state.birthTime = text;
                state.step = 'gender';
                bot.sendMessage(chatId, 'Выберите пол:', {
                    reply_markup: {
                        keyboard: [
                            ['M', 'F']
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });
                return;
            }

            if (state.step === 'gender') {
                if (text !== 'M' && text !== 'F') {
                    bot.sendMessage(chatId, 'Выберите пол: M или F', {
                        reply_markup: {
                            keyboard: [
                                ['M', 'F']
                            ],
                            resize_keyboard: true,
                            one_time_keyboard: true
                        }
                    });
                    return;
                }
                state.gender = text;
                state.step = 'name';
                bot.sendMessage(chatId, 'Введите ваше имя:', {
                    reply_markup: { remove_keyboard: true }
                });
                return;
            }

            
            if (state.step === 'name') {
                state.name = text;
                const birthDate = `${state.year}-${String(state.month).padStart(2, '0')}-${state.day}`;
                const existing = await db.getUserData(chatId);
                if (existing) {
                    await db.updateUserData(chatId, birthDate, state.birthTime, state.gender, state.name);
                    bot.sendMessage(chatId, 'Данные обновлены!', mainKeyboard);
                } else {
                    await db.saveUserData(chatId, birthDate, state.birthTime, state.gender, state.name);
                    bot.sendMessage(chatId, 'Данные сохранены!', mainKeyboard);
                }
                delete userInputState[chatId];
                return;
            }
        }

        
        if (text === 'Сгенерировать гороскоп') {
            const userData = await db.getUserData(chatId);
            if (!userData) {
                bot.sendMessage(chatId, 'Сначала введите свои данные.', mainKeyboard);
                return;
            }
            const isSubscribed = await db.isUserSubscribed(chatId);
            const hasPromo = promoAccessUsers.has(chatId);
            if (isSubscribed || hasPromo) {
                bot.sendMessage(chatId, 'Обрабатываю ваш запрос, это может занять несколько минут...', mainKeyboard);
                const result = await require('./neural/upload').uploadUserData(chatId);
                bot.sendMessage(chatId, `Ваш гороскоп:\n\n${result}`, mainKeyboard);
            } else {
                bot.sendMessage(chatId, 'Для получения гороскопа оформите подписку или введите промокод.', startKeyboard);
            }
        }

       
        if (text === 'Отменить подписку') {
            await db.unsubscribeUser(chatId);
            promoAccessUsers.delete(chatId);
            bot.sendMessage(chatId, 'Вы отписались от рассылки. Для доступа оформите подписку или введите промокод.', startKeyboard);
        }
    });

    console.log('Bot is running...');
    return bot;
}

module.exports = startBot;
if (require.main === module) {
    startBot();
}