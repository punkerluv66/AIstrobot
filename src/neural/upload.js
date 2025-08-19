const axios = require('axios');
const db = require('../db/index');
require('dotenv').config();

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const MAX_MESSAGE_LENGTH = 4000;

async function uploadUserData(userId) {
    try {
        const today = new Date().toLocaleDateString('ru-RU');
        const userData = await db.getUserData(userId);
        if (!userData) {
            throw new Error('User data not found');
        }

        console.log("Полученные данные пользователя:", userData);

        const formattedData = formatDataForUpload(userData);
        
        const name = formattedData.name || 'Пользователь';
        const birthDate = formattedData.birthDate || 'не указана';
        const birthTime = formattedData.birthTime || 'не указано';
        const gender = formattedData.gender === 'M' ? 'мужской' : 'женский';
        
        console.log("Форматированные данные:", { name, birthDate, birthTime, gender });
        
        const prompt = `
        Сгенерируй персональный гороскоп для человека со следующими данными:
        - Имя: ${name}
        - Дата рождения: ${birthDate}
        - Время рождения: ${birthTime}
        - Пол: ${gender}
        
        Гороскоп должен включать:
        1. Общую характеристику личности
        2. Прогноз на сегодня ${today}
        3. Ответ должен быть до 3500 символов, чтобы не превышать лимит Telegram
        Не надо разделять текст на части, просто дай полный ответ
        Также не используй символы *** или ### в начале и конце текста, просто дай текст гороскопа без форматирования.
        `;
        
        console.log("Отправка запроса к API:", API_URL);
        
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            try {
                const data = {
                    "contents": [
                        {
                            "parts": [
                                {
                                    "text": prompt
                                }
                            ]
                        }
                    ]
                };

                const response = await axios.post(
                    API_URL,
                    data,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-goog-api-key': GEMINI_API_KEY
                        },
                        timeout: 60 * 1000 
                    }
                );

                console.log("API RESPONSE:", response.status);
                console.log("TYPE OF RESPONSE:", typeof response.data);
                
                if (typeof response.data === 'object') {
                    console.log("STRUCTURE OF RESPONSE:", JSON.stringify(response.data).substring(0, 500) + "...");
                }
                
                let horoscopeText = "";
                
                if (Array.isArray(response.data)) {
                    console.log("RESPONSE AS ARRAY:", response.data.length);
                    
                    if (response.data.length > 0) {
                        const firstItem = response.data[0];
                        console.log("TYPE OF FIRST ITEM:", typeof firstItem);

                        if (typeof firstItem === 'object' && firstItem !== null) {
                            if (firstItem.generated_text) {
                                horoscopeText = firstItem.generated_text;
                                console.log("TEXT FOUND in generated_text");
                            } else {
                                console.log("FIRST ELEMENT KEYS:", Object.keys(firstItem));
                                const possibleFields = ['text', 'content', 'result', 'output', 'generation'];
                                for (const field of possibleFields) {
                                    if (firstItem[field]) {
                                        horoscopeText = firstItem[field];
                                        console.log(`TEXT FOUND in field ${field}`);
                                        break;
                                    }
                                }
                            }
                        } else if (typeof firstItem === 'string') {
                            horoscopeText = firstItem;
                            console.log("FIRST ELEMENT - STRING");
                        } else if (typeof firstItem === 'number') {
                            console.log("FIRST ELEMENT - NUMBER, ignoring");
                        }
                    }
                }else if (response.data && typeof response.data === 'object') {
                    console.log("RESPONSE IN OBJECT FORMAT");
                    if (Array.isArray(response.data.candidates) && response.data.candidates.length > 0) {
                        for (const cand of response.data.candidates) {
                            if (cand?.content?.parts && Array.isArray(cand.content.parts)) {
                                for (const part of cand.content.parts) {
                                    if (typeof part.text === 'string' && part.text.trim()) {
                                        horoscopeText += part.text.trim() + "\n";
                                    }
                                }
                            }
                            if (!horoscopeText) {
                                if (typeof cand.content?.text === 'string') horoscopeText = cand.content.text;
                                else if (typeof cand.text === 'string') horoscopeText = cand.text;
                            }
                            if (horoscopeText) break;
                        }
                    }
                    if (!horoscopeText) {
                        if (response.data.generated_text) horoscopeText = response.data.generated_text;
                        else if (response.data.text) horoscopeText = response.data.text;
                        else if (response.data.output?.[0]?.content?.[0]?.text) horoscopeText = response.data.output[0].content[0].text;
                        else if (response.data.choices && response.data.choices[0]) {
                            horoscopeText = response.data.choices[0].text || response.data.choices[0].message?.content;
                        } else {
                            console.log("UNKNOWN OBJECT FORMAT, KEYS:", Object.keys(response.data));
                            horoscopeText = "Не удалось сгенерировать гороскоп с текущими настройками API.";
                        }
                    }
                } else if (typeof response.data === 'string') {
                    console.log("RESPONSE IN TEXT FORMAT");
                    horoscopeText = response.data;
                } else {
                    console.log("UNKNOWN RESPONSE FORMAT:", typeof response.data);
                    horoscopeText = "Не удалось получить корректный ответ от сервиса гороскопов.";
                }
                
                if (horoscopeText.length > MAX_MESSAGE_LENGTH) {
                    console.log(`Сообщение слишком длинное (${horoscopeText.length} символов), обрезаем до ${MAX_MESSAGE_LENGTH}`);
                    horoscopeText = horoscopeText.substring(0, MAX_MESSAGE_LENGTH) + "...";
                }
                
                if (!horoscopeText || horoscopeText.trim() === "") {
                    horoscopeText = `Персональный гороскоп для ${name}:
                                            
                        К сожалению, не удалось сформировать подробный гороскоп на основе предоставленных данных (дата: ${birthDate}, время: ${birthTime}).

                        Рекомендуем повторить запрос позже.`;
                }
                
                return horoscopeText;
                
            } catch (error) {
                console.error(`ATTEMPT ${attempts + 1} FAILED:`, error.message);

                if (error.response && error.response.status === 503) {
                    console.log("MODEL IS LOADING, WAITING...");
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                
                attempts++;
                
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
        return `Извините, ${name}, не удалось получить ваш гороскоп в данный момент. Пожалуйста, попробуйте позже.`;
    } catch (error) {
        console.error('Error generating horoscope:', error);
        return "Произошла ошибка при создании гороскопа. Пожалуйста, проверьте введенные данные.";
    }
}

function formatDataForUpload(userData) {
    return {
        birthDate: userData.birth_date,
        birthTime: userData.birth_time,
        gender: userData.gender,
        name: userData.name
    };
}

module.exports = {
    uploadUserData,
};