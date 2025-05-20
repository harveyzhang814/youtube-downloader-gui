// 语言代码到语言名称的映射
const languageNames = {
  'en': 'English',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  'ja': '日本語',
  'ko': '한국어',
  'fr': 'Français',
  'de': 'Deutsch',
  'es': 'Español',
  'it': 'Italiano',
  'ru': 'Русский',
  'pt': 'Português',
  'nl': 'Nederlands',
  'tr': 'Türkçe',
  'ar': 'العربية',
  'hi': 'हिन्दी',
  'th': 'ไทย',
  'vi': 'Tiếng Việt',
  'id': 'Bahasa Indonesia',
  'ms': 'Bahasa Melayu',
  'fil': 'Filipino'
};

// 获取语言名称
const getLanguageName = (langCode) => {
  return languageNames[langCode] || langCode;
};

// 获取所有支持的语言
const getSupportedLanguages = () => {
  return Object.entries(languageNames).map(([code, name]) => ({
    code,
    name
  }));
};

module.exports = {
  languageNames,
  getLanguageName,
  getSupportedLanguages
}; 