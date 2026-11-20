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
  const hourLength = 60 * 60 * 1000;
  const dayLength = 24 * hourLength;
  const shanghaiOffset = 8 * hourLength;
  const dayAt = time => new Date(time).toISOString().slice(0, 10);
  const timeAt = time => new Date(time).toISOString().slice(11, 16);
  const shortDate = date => `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日`;
  const cityName = value => label(value, '').replace(/\s+/g, ' ').slice(0, 48);
  const adcode = value => /^\d{6}$/u.test(value ?? '') ? String(value) : '';
  const placeKey = place => place.adcode ? `adcode:${place.adcode}` : place.name.toLowerCase();

  function place(value) {
    if (!value || typeof value !== 'object') return null;
    const name = cityName(value.name);
    if (!name) return null;
    return { name, area: label(value.area, ''), adcode: adcode(value.adcode), query: cityName(value.query) };
  }

  function located(selected, data) {
    return {
      name: selected.adcode ? selected.name : cityName(data.city).replace(/市$/u, ''),
      area: selected.area || label(data.province, ''),
      adcode: adcode(data.adcode) || selected.adcode,
      query: selected.adcode ? selected.query : adcode(data.adcode) ? '' : selected.query
    };
  }

  function probability(value) {
    const result = number(value);
    return result !== null && result >= 0 && result <= 100 ? result : null;
  }

  const percent = value => Number.isFinite(value) ? `${Math.round(value)}%` : '—';

  function windForce(value) {
    const text = label(value, measure(value));
    const range = text.match(/^(\d+)\s*[-–—~～至]\s*(\d+)\s*级?$/u);
    if (range) return `${range[1]}–${range[2]} 级`;
    const single = text.match(/^(\d+(?:\.\d+)?)\s*级?$/u);
    return single ? `${single[1]} 级` : text;
  }

  function kindFor(text) {
    if (/雪|冰粒|冰雹|snow|sleet|hail/i.test(text)) return 'snow';
    if (/小雨|毛毛雨|drizzle|light rain/i.test(text)) return 'drizzle';
    if (/雨|雷|rain|thunder|showers/i.test(text)) return 'rain';
    if (/多云|partly cloudy|mostly cloudy|broken clouds/i.test(text)) return 'cloudy';
    if (/阴|云|雾|霾|沙|尘|overcast|cloud|fog|mist|haze|dust/i.test(text)) return 'overcast';
    if (/晴|sunny|clear/i.test(text)) return 'clear';
    return 'cloudy';
  }

  function parseTimestamp(value) {
    const text = label(value, '');
    const match = text.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(:\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/iu);
    if (!match) return null;
    const iso = `${match[1]}T${match[2]}${match[3] ?? ':00'}`;
    const wall = Date.parse(`${iso}Z`);
    if (!Number.isFinite(wall)) return null;
    return { wall, absolute: match[4] ? Date.parse(iso + match[4]) : null };
  }

  function clockOffset(data, report, hours, receivedAt) {
    if (adcode(data.adcode) || /省$|自治区$|特别行政区$|^(北京|天津|上海|重庆)市$/u.test(data.province ?? '')) {
      return shanghaiOffset;
    }
    const zoned = [report, ...hours.map(hour => hour.timestamp)].find(time => Number.isFinite(time?.absolute));
    if (zoned) return zoned.wall - zoned.absolute;
    // International responses can provide local time without an offset.
    return report ? report.wall - receivedAt : shanghaiOffset;
  }

  function inCityTime(timestamp, offset) {
    return Number.isFinite(timestamp.absolute) ? timestamp.absolute + offset : timestamp.wall;
  }

  function reportLabel(value, timestamp, offset, receivedAt, today) {
    let local = timestamp ? inCityTime(timestamp, offset) : null;
    let approximate = false;
    const relative = label(value, '').match(/^(?:约\s*)?(\d+)\s*(秒钟?|分钟?|小时|天)前(?:发布|更新)?$/u);
    if (relative) {
      const unit = relative[2][0];
      const duration = { 秒: 1000, 分: 60000, 小: hourLength, 天: dayLength }[unit];
      local = receivedAt + offset - Number(relative[1]) * duration;
      approximate = true;
    } else if (/^刚刚(?:发布|更新)?$/u.test(value ?? '')) {
      local = receivedAt + offset;
      approximate = true;
    }
    if (!Number.isFinite(local) || Math.abs(local) > 8.64e15) return '';
    const date = dayAt(local);
    return `${approximate ? '约 ' : ''}${date === today ? '' : shortDate(date) + ' '}${timeAt(local)}`;
  }

  function nextHours(rows, offset, receivedAt, localNow) {
    const upcoming = new Map();
    const receivedDay = Date.parse(`${dayAt(receivedAt + offset)}T00:00:00Z`);
    let last = null;
    for (const { data, timestamp } of rows) {
      let time = timestamp ? inCityTime(timestamp, offset) : null;
      if (time === null && /^\d{2}:\d{2}(?::\d{2})?$/u.test(data.time ?? '')) {
        const day = last === null ? receivedDay : Math.floor(last / dayLength) * dayLength;
        time = day + Date.parse(`1970-01-01T${data.time}Z`);
        if (time < (last ?? receivedAt + offset - 12 * hourLength)) time += dayLength;
      }
      if (!Number.isFinite(time)) continue;
      last = time;
      if (time <= localNow || upcoming.has(time)) continue;
      upcoming.set(time, data);
    }
    return Array.from(upcoming).sort(([first], [second]) => first - second).slice(0, 24);
  }

  function dailyDetails(day) {
    const wind = (direction, force, speed) => {
      const strength = windForce(force);
      return [label(direction, ''), strength === '—' ? measure(speed, ' km/h') : strength]
        .filter(value => value && value !== '—').join(' ');
    };
    return [
      ['白天', label(day.weather_day, '')],
      ['夜间', label(day.weather_night, '')],
      ['降水概率', percent(probability(day.pop))],
      ['日出', label(day.sunrise, '')],
      ['日落', label(day.sunset, '')],
      ['白天风力', wind(day.wind_dir_day, day.wind_scale_day, day.wind_speed_day)],
      ['夜间风力', wind(day.wind_dir_night, day.wind_scale_night, day.wind_speed_night)]
    ].filter(([, value]) => value && value !== '—');
  }

  function forecast(entry, now = Date.now()) {
    const data = entry?.data ?? {};
    const receivedAt = entry?.at ?? now;
    const current = number(data.temperature);
    const condition = label(data.weather, '天气待更新');
    const kind = kindFor(condition);
    const sky = ({ drizzle: 'rain', overcast: 'cloudy' })[kind] ?? kind;
    const report = parseTimestamp(data.report_time);
    const rawHours = forecastRows(data.hourly_forecast).map(data => ({ data, timestamp: parseTimestamp(data.time) }));
    const offset = clockOffset(data, report, rawHours, receivedAt);
    const localNow = now + offset;
    const today = dayAt(localNow);
    const tomorrow = dayAt(localNow + dayLength);
    const days = forecastRows(data.forecast).filter(day => !day.date || day.date >= today).slice(0, 7);
    const todayForecast = days.find(day => day.date === today) ?? days.find(day => !day.date);
    const hours = current === null ? [] : [{ value: current, kind, time: '现在', condition, current: true }];
    let previousDate = today;
    for (const [time, hour] of nextHours(rawHours, offset, receivedAt, localNow)) {
      const date = dayAt(time);
      const day = date === today ? '' : date === tomorrow ? '明天' : shortDate(date);
      const weather = label(hour.weather, '天气待更新');
      hours.push({
        value: number(hour.temperature), kind: kindFor(weather), time: timeAt(time), condition: weather,
        day, dateLabel: date === previousDate ? '' : day, pop: probability(hour.pop)
      });
      previousDate = date;
    }
    const week = days.map(day => {
      const condition = label(day.weather_day, '天气待更新');
      const isToday = day.date === today;
      return {
        date: label(day.date, ''), dayLabel: isToday ? '今天' : label(day.week, label(day.date)).replace(/^星期/u, '周'),
        isToday, kind: kindFor(condition), low: number(day.temp_min), high: number(day.temp_max),
        condition, details: dailyDetails(day)
      };
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
    const aqi = number(data.aqi);
    const grade = label(data.aqi_category, '') || measure(data.aqi_level, ' 级');
    const air = aqi !== null && aqi >= 0 ? `AQI ${Math.round(aqi)}${grade === '—' ? '' : ' · ' + grade}` : '';
    return {
      sky, kind, condition, current, feels: number(data.feels_like),
      low: number(data.temp_min) ?? number(todayForecast?.temp_min),
      high: number(data.temp_max) ?? number(todayForecast?.temp_max),
      detail: number(detail[1]) === null ? '' : `${detail[0]} ${measure(detail[1], detail[2])}`,
      humidity: measure(data.humidity, '%'), windDirection: label(data.wind_direction, '风力'),
      wind: windForce(data.wind_power), uv: measure(data.uv),
      sunset: label(todayForecast?.sunset), note: current === null ? '天气更新后，豚豚会来记一笔。' : note,
      air, reported: reportLabel(data.report_time, report, offset, receivedAt, today),
      hours, week
    };
  }

  function cached(selected) {
    const keys = new Set([placeKey(selected), selected.query, selected.name, selected.name.replace(/市$/u, '')]);
    for (const key of keys) {
      if (!key) continue;
      try {
        const entry = JSON.parse(prefs.get('wx-' + key));
        if (Number.isFinite(entry?.at) && valid(entry.data)
          && (!selected.adcode || adcode(entry.data.adcode) === selected.adcode)) return entry;
      } catch {}
    }
    return null;
  }

  async function getData(endpoint, params, signal) {
    const url = new URL('/api/v1/misc/' + endpoint, 'https://uapis.cn');
    url.search = new URLSearchParams(params);
    const response = await fetch(url, { signal, credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw Object.assign(new Error('UAPI request failed'), { status: response.status });
    return response.json();
  }

  async function get(selected, signal) {
    const location = selected.query || !selected.adcode ? { city: selected.query || selected.name } : { adcode: selected.adcode };
    const data = await getData('weather', { ...location, forecast: 'true', hourly: 'true', extended: 'true' }, signal);
    if (!valid(data)) throw new Error('Invalid weather response');
    if (selected.adcode && adcode(data.adcode) && selected.adcode !== adcode(data.adcode)) {
      throw Object.assign(new Error('Weather returned another location'), { status: 404 });
    }
    return { data, at: Date.now() };
  }

  async function search(keywords, signal) {
    const result = await getData('district', { keywords, country: 'CN', limit: '50' }, signal);
    const matches = new Map();
    for (const item of forecastRows(result?.results)) {
      if (!['city', 'district', 'province'].includes(item.level) || !adcode(item.adcode)) continue;
      const name = cityName(item.name);
      if (!name || (item.level === 'city' && /^(北京|天津|上海|重庆)城区$/u.test(name))) continue;
      const province = label(item.province, '') || (item.level === 'province' ? name : '');
      const city = item.level === 'district' && !/城区$/u.test(item.city ?? '') ? label(item.city, '') : '';
      const area = [province, city].filter(Boolean).join(' · ');
      const candidate = place({ name, area, adcode: item.adcode });
      matches.set(placeKey(candidate), candidate);
    }
    const bare = value => value.replace(/[市区县]$/u, '').toLowerCase();
    const exact = candidate => Number(bare(candidate.name) === bare(keywords));
    return Array.from(matches.values()).sort((first, second) => exact(second) - exact(first)).slice(0, 8);
  }

  return {
    prefs, cityName, place, placeKey, located, cached, forecast, get, search, percent,
    stamp: at => isoDate.format(at) === isoDate.format(Date.now())
      ? labelTime.format(at) : `${labelDate.format(at)} ${labelTime.format(at)}`
  };
})();
