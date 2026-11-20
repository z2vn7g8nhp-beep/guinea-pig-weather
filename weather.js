const weatherService = (() => {
  const prefs = {
    get(key) {
      try { return localStorage.getItem('cavy2-' + key); } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem('cavy2-' + key, value); } catch {}
    }
  };
  const labelTime = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const labelDate = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', month: 'short', day: 'numeric'
  });
  const isoDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const number = value => {
    if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return null;
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  };
  const valid = data => data && number(data.temperature) !== null
    && typeof data.city === 'string' && data.city.trim()
    && typeof data.weather === 'string' && data.weather.trim();
  const forecastRows = values => Array.isArray(values) ? values.filter(item => item && typeof item === 'object') : [];
  const label = (value, fallback = '—') => typeof value === 'string' && value.trim() ? value.trim() : fallback;
  const measure = (value, suffix = '') => number(value) === null ? '—' : `${number(value)}${suffix}`;

  function kindFor(text) {
    if (/雪|冰粒|冰雹|snow|sleet|hail/i.test(text)) return 'snow';
    if (/小雨|毛毛雨|drizzle|light rain/i.test(text)) return 'drizzle';
    if (/雨|雷|rain|thunder|showers/i.test(text)) return 'rain';
    if (/多云|partly cloudy|mostly cloudy|broken clouds/i.test(text)) return 'cloudy';
    if (/阴|云|雾|霾|沙|尘|overcast|cloud|fog|mist|haze|dust/i.test(text)) return 'overcast';
    if (/晴|sunny|clear/i.test(text)) return 'clear';
    return 'cloudy';
  }

  function forecast(data) {
    const current = number(data.temperature);
    const condition = label(data.weather, '天气待更新');
    const kind = kindFor(condition);
    const sky = ({ drizzle: 'rain', overcast: 'cloudy' })[kind] ?? kind;
    const days = forecastRows(data.forecast).slice(0, 7);
    const hours = valid(data) ? [[current, kind, '现在', condition]] : [];
    for (const hour of forecastRows(data.hourly_forecast).slice(0, 24)) {
      const time = String(hour.time ?? '').match(/\b(\d{2}:\d{2})(?::\d{2})?\b/)?.[1]
        ?? String(hour.time ?? '').match(/T(\d{2}:\d{2})/)?.[1];
      if (!time) continue;
      const weather = label(hour.weather, '天气待更新');
      hours.push([number(hour.temperature), kindFor(weather), time, weather]);
    }
    const week = days.map(day => {
      const weather = label(day.weather_day, '天气待更新');
      const date = day.date === isoDate.format(Date.now())
        ? '今天' : label(day.week, label(day.date)).replace(/^星期/, '周');
      return [kindFor(weather), number(day.temp_min), number(day.temp_max), weather, date];
    });
    const detail = {
      clear: ['能见度', data.visibility, ' km'],
      cloudy: ['云量', data.cloud, '%'],
      rain: ['降水', data.precipitation, ' mm'],
      snow: ['能见度', data.visibility, ' km']
    }[sky];
    const note = {
      clear: '阳光正好，豚豚想出去走走。',
      cloudy: '今天的天空，适合慢慢看。',
      rain: '雨打石阶，出门带伞。',
      snow: '雪落得轻，出门慢些。'
    }[sky];
    return {
      sky, kind, condition, current, feels: number(data.feels_like),
      low: number(data.temp_min) ?? week[0]?.[1] ?? null,
      high: number(data.temp_max) ?? week[0]?.[2] ?? null,
      detail: number(detail[1]) === null ? '' : `${detail[0]} ${measure(detail[1], detail[2])}`,
      humidity: measure(data.humidity, '%'), windDirection: label(data.wind_direction, '风力'),
      wind: label(data.wind_power, measure(data.wind_power)), uv: measure(data.uv),
      sunset: label(days[0]?.sunset), note: current === null ? '天气更新后，豚豚会来记一笔。' : note,
      hours, week
    };
  }

  function cached(city) {
    try {
      const entry = JSON.parse(prefs.get('wx-' + city));
      return Number.isFinite(entry?.at) && valid(entry.data) ? entry : null;
    } catch { return null; }
  }

  async function get(city, signal) {
    const url = new URL('/api/v1/misc/weather', 'https://uapis.cn');
    url.search = new URLSearchParams({ city, forecast: 'true', hourly: 'true', extended: 'true' });
    const response = await fetch(url, { signal, credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error('Weather request failed');
    const data = await response.json();
    if (!valid(data)) throw new Error('Invalid weather response');
    return { data, at: Date.now() };
  }

  return {
    prefs, cached, forecast, get,
    time: at => labelTime.format(at),
    stamp: at => isoDate.format(at) === isoDate.format(Date.now())
      ? labelTime.format(at) : `${labelDate.format(at)} ${labelTime.format(at)}`
  };
})();
