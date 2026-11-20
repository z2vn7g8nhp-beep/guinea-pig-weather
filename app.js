(() => {
  'use strict';
  const root = document.getElementById('cavy-observatory');
  const screen = root.querySelector('.cavy-screen');
  const hero = root.querySelector('.cavy-hero');
  const canvas = root.querySelector('.cavy-atmosphere');
  const context = canvas.getContext('2d');
  const graph = root.querySelector('.cavy-graph');
  const grid = graph.querySelector('.cavy-grid');
  const curve = graph.querySelector('.cavy-curve');
  const pointGroup = graph.querySelector('.cavy-points');
  const hours = root.querySelector('.cavy-hours');
  const hourScroll = root.querySelector('.cavy-hour-scroll');
  const hourTrack = root.querySelector('.cavy-hour-track');
  const week = root.querySelector('.cavy-week');
  const emptyHours = root.querySelector('[data-empty-hours]');
  const emptyWeek = root.querySelector('[data-empty-week]');
  const hourModeButtons = Array.from(root.querySelectorAll('[data-hour-view]'));
  const rainHint = root.querySelector('[data-rain-hint]');
  const previousHour = root.querySelector('[data-hour-previous]');
  const nextHour = root.querySelector('[data-hour-next]');
  const syncLabel = root.querySelector('[data-weather-status]');
  const refreshButton = root.querySelector('[data-refresh]');
  const settings = root.querySelector('.cavy-settings');
  const settingsButton = settings.querySelector('summary');
  const demoButton = root.querySelector('[data-demo-toggle]');
  const demoLabel = root.querySelector('[data-demo-label]');
  const demoBadge = root.querySelector('[data-demo-badge]');
  const demoChoices = root.querySelector('#cavy-weather-choices');
  const motionButton = root.querySelector('[data-motion-control]');
  const motionLabel = root.querySelector('[data-motion-label]');
  const motionIcon = root.querySelector('[data-motion-icon]');
  const pet = root.querySelector('.cavy-pet');
  const petResponse = pet.querySelector('.cavy-pet-response');
  const petFeedback = pet.querySelector('.cavy-pet-feedback');
  const cityButton = root.querySelector('.cavy-city');
  const cityName = root.querySelector('[data-city-name]');
  const landscape = root.querySelector('[data-landscape]');
  const readout = root.querySelector('[data-readout]');
  const readoutUnit = readout.querySelector('sup');
  const currentIcon = root.querySelector('[data-current-icon]');
  const announcement = root.querySelector('[data-announcement]');
  const readings = Object.fromEntries(Array.from(root.querySelectorAll('[data-value]'), item => [item.dataset.value, item]));
  const images = Object.fromEntries(Array.from(root.querySelectorAll('[data-scene]'), item => [item.dataset.scene, item]));
  const choices = Array.from(root.querySelectorAll('button[data-weather]'));
  const unitButtons = Array.from(root.querySelectorAll('button[data-unit]'));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const source = weatherService;
  const times = ['现在', '15:00', '16:00', '17:00', '18:00'];
  const weekdays = ['今天', '周六', '周日', '周一', '周二', '周三', '周四'];
  const weatherTypes = {
    clear: { label: '晴', icon: 'sun' },
    cloudy: { label: '多云', icon: 'cloud-sun' },
    overcast: { label: '阴', icon: 'cloud' },
    rain: { label: '中雨', icon: 'cloud-rain' },
    drizzle: { label: '小雨', icon: 'cloud-drizzle' },
    snow: { label: '小雪', icon: 'snowflake' }
  };
  const scenes = {
    clear: {
      current: 25, feels: 26, detail: '能见度 24 km', humidity: '48%', wind: '2级', uv: '4', sunset: '17:02',
      note: '阳光正好，豚豚想出去走走。',
      hours: [[25, 'clear'], [26, 'clear'], [24, 'clear'], [22, 'clear'], [20, 'cloudy']],
      week: [['clear', 16, 26], ['clear', 17, 27], ['cloudy', 17, 24], ['drizzle', 16, 22], ['cloudy', 15, 22], ['clear', 16, 24], ['clear', 17, 25]]
    },
    cloudy: {
      current: 24, feels: 25, detail: '云量 76%', humidity: '62%', wind: '2级', uv: '3', sunset: '17:02',
      note: '今天的天空，适合慢慢看。',
      hours: [[24, 'cloudy'], [25, 'cloudy'], [25, 'cloudy'], [23, 'overcast'], [22, 'overcast']],
      week: [['cloudy', 18, 26], ['clear', 17, 25], ['overcast', 18, 24], ['drizzle', 18, 23], ['cloudy', 17, 24], ['clear', 16, 25], ['cloudy', 17, 26]]
    },
    rain: {
      current: 18, feels: 16, detail: '降水 3.2 mm/h', humidity: '92%', wind: '3级', uv: '1', sunset: '17:02',
      note: '雨打石阶，出门带伞。',
      hours: [[18, 'rain'], [18, 'rain'], [17, 'rain'], [17, 'drizzle'], [16, 'drizzle']],
      week: [['rain', 15, 20], ['drizzle', 14, 19], ['overcast', 14, 20], ['cloudy', 15, 22], ['cloudy', 16, 23], ['clear', 17, 24], ['drizzle', 16, 22]]
    },
    snow: {
      current: 0, feels: -3, detail: '积雪 1 cm', humidity: '85%', wind: '2级', uv: '1', sunset: '17:02',
      note: '雪落得轻，出门慢些。',
      hours: [[0, 'snow'], [1, 'snow'], [0, 'snow'], [-1, 'overcast'], [-2, 'overcast']],
      week: [['snow', -3, 2], ['snow', -4, 1], ['overcast', -4, 3], ['cloudy', -2, 5], ['clear', -1, 6], ['clear', 0, 8], ['cloudy', 2, 9]]
    }
  };

  const defaultPlace = { name: '西安', area: '陕西省', adcode: '610100', query: '西安' };
  const cityPreference = 'selected-place';
  const xianLocation = { landscape: '古城墙', backdrop: 'xian', offset: -8 };
  const neutralLocation = { landscape: '', backdrop: 'neutral', offset: 0 };
  const demoProbabilities = { clear: 0, cloudy: 10, overcast: 20, rain: 90, drizzle: 65, snow: 80 };
  const motionPreference = source.prefs.get('motion');

  let weather = 'cloudy';
  let city = restoreCity();
  let entry = source.cached(city);
  if (entry) city = resolvedCity(city, entry.data);
  let syncState = entry ? 'cached' : 'loading';
  let unit = source.prefs.get('unit') === 'F' ? 'F' : 'C';
  let request;
  let demo = false;
  let demoWeather = 'cloudy';
  let motionOverride = motionPreference === 'on' ? true : motionPreference === 'off' ? false : undefined;
  let hourView = 'temperature';
  let renderedForecast;
  let inView = true;
  let animationFrame = 0;
  let previousFrame = null;
  let width = 0;
  let height = 0;
  let elapsed = 0;
  let particles = [];
  let ripples = [];
  let chartWidth = 0;
  let chartPoints = [];
  let chartPositions = [];
  let chartTransition;
  let readoutAnimation;
  let greeting;
  let greetingTimer;

  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const weatherIcon = kind => `<span class="cavy-icon" data-icon-weather="${kind}">${icon(weatherTypes[kind].icon)}</span>`;
  const refreshIcons = () => paintWeatherIcons(root);
  const temperature = value => Math.round(unit === 'F' ? value * 9 / 5 + 32 : value);
  const format = value => Number.isFinite(value) ? `${temperature(value)}°` : '—';
  const random = (min, max) => min + Math.random() * (max - min);
  const motionEnabled = () => motionOverride ?? !reducedMotion.matches;
  const location = () => city.adcode === defaultPlace.adcode ? xianLocation : neutralLocation;

  function defaultOrSelected(selected) {
    return selected.adcode === defaultPlace.adcode
      || (!selected.adcode && selected.name.replace(/市$/u, '') === defaultPlace.name) ? defaultPlace : selected;
  }

  function restoreCity() {
    try {
      const saved = source.place(JSON.parse(source.prefs.get(cityPreference)));
      if (saved) return defaultOrSelected(saved);
    } catch {}
    const legacyPresets = new Set(['杭州', '上海', '西安', '青岛', '哈尔滨']);
    const legacy = source.cityName(source.prefs.get('city'));
    const name = source.cityName(source.prefs.get('selected-city'))
      || (legacyPresets.has(legacy.replace(/市$/u, '')) ? '' : legacy);
    return name ? defaultOrSelected({ name, query: name }) : defaultPlace;
  }

  function resolvedCity(selected, data) {
    return defaultOrSelected(source.located(selected, data));
  }

  function demoForecast() {
    const base = scenes[demoWeather];
    const offset = location().offset;
    return {
      ...base,
      sky: demoWeather,
      kind: demoWeather,
      condition: weatherTypes[demoWeather].label,
      current: base.current + offset,
      feels: base.feels + offset,
      low: base.week[0][1] + offset,
      high: base.week[0][2] + offset,
      hours: base.hours.map(([value, kind], index) => ({
        value: value + offset, kind, time: times[index], condition: weatherTypes[kind].label,
        current: index === 0, pop: demoProbabilities[kind]
      })),
      week: base.week.map(([kind, low, high], index) => ({
        kind, low: low + offset, high: high + offset, condition: weatherTypes[kind].label,
        dayLabel: weekdays[index], isToday: index === 0,
        details: [['白天', weatherTypes[kind].label], ['降水概率', source.percent(demoProbabilities[kind])]]
      }))
    };
  }

  for (let index = 0; index < weekdays.length; index++) {
    const row = document.createElement('li');
    row.className = 'cavy-day';
    row.innerHTML = `<details>
      <summary class="cavy-day-summary">
        <strong class="cavy-day-name"></strong>
        <span class="cavy-day-weather"><span data-day-icon></span><span class="cavy-day-condition"></span></span>
        <span class="cavy-low"></span><span class="cavy-track" aria-hidden="true"><span></span></span><span class="cavy-high"></span>
        ${icon('chevron-down')}
      </summary>
      <dl class="cavy-day-details"></dl>
      <p class="cavy-day-empty" hidden>暂无这一天的详细预报</p>
    </details>`;
    week.append(row);
  }

  const svgElement = tag => document.createElementNS('http://www.w3.org/2000/svg', tag);
  const chartLines = Array.from({ length: 3 }, () => grid.appendChild(svgElement('line')));

  function drawGraph() {
    if (!chartWidth) return;
    const commands = [];
    let connected = false;
    for (const [index, { dot, label }] of chartPoints.entries()) {
      const y = chartPositions[index];
      const visible = Number.isFinite(y);
      dot.style.display = visible ? '' : 'none';
      label.style.display = visible ? '' : 'none';
      if (!visible) { connected = false; continue; }
      const x = (index + 0.5) * chartWidth / chartPositions.length;
      commands.push(`${connected ? 'L' : 'M'}${x} ${y}`);
      connected = true;
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', y);
      label.setAttribute('x', x);
      label.setAttribute('y', y - 9);
    }
    curve.setAttribute('d', commands.join(' '));
  }

  function resizeGraph() {
    chartWidth = graph.getBoundingClientRect().width;
    if (!chartWidth) return;
    graph.setAttribute('viewBox', `0 0 ${chartWidth} 67`);
    chartLines.forEach((line, index) => {
      const y = 25 + index * 16;
      line.setAttribute('x1', '0');
      line.setAttribute('x2', chartWidth);
      line.setAttribute('y1', y);
      line.setAttribute('y2', y);
    });
    drawGraph();
  }

  function updateHourControls() {
    previousHour.disabled = hourScroll.scrollLeft <= 1;
    nextHour.disabled = hourScroll.scrollLeft + hourScroll.clientWidth >= hourScroll.scrollWidth - 1;
  }

  function updateHours(forecast, animate) {
    const precipitation = hourView === 'precipitation';
    const rows = precipitation ? forecast.filter(hour => !hour.current) : forecast;
    const valueFor = hour => precipitation ? hour.pop : hour.value;
    const displayValue = precipitation ? source.percent : format;
    const values = rows.map(valueFor).filter(Number.isFinite);
    const hasValues = values.length > 0;
    const hasRows = precipitation ? hasValues : rows.length > 0;
    const firstRain = forecast.find(hour => !hour.current && (hour.kind === 'rain' || hour.kind === 'drizzle'));
    const rainProbability = firstRain?.pop;
    rainHint.hidden = !firstRain;
    rainHint.textContent = firstRain ? `${firstRain.day ?? ''}${firstRain.time} 起可能降雨${Number.isFinite(rainProbability) ? ' · ' + source.percent(rainProbability) : ''}` : '';

    hourScroll.hidden = !hasRows;
    graph.hidden = !hasValues;
    graph.dataset.view = hourView;
    emptyHours.hidden = hasRows;
    emptyHours.textContent = precipitation ? '暂无逐时降水概率' : '暂无逐时预报';
    hourTrack.style.setProperty('--cavy-hour-count', Math.max(1, rows.length));
    hours.replaceChildren();
    pointGroup.replaceChildren();
    const accessibleHours = [];
    chartPoints = rows.map(hour => {
      const { current, kind, dateLabel = '', condition } = hour;
      const time = current && !demo && syncState === 'cached' ? '上次' : hour.time;
      const formatted = displayValue(valueFor(hour));
      const item = document.createElement('div');
      item.className = 'cavy-hour';
      item.toggleAttribute('data-current', Boolean(current));
      item.innerHTML = '<span class="cavy-hour-date"></span><span class="cavy-hour-time"></span>' + weatherIcon(kind);
      item.querySelector('.cavy-hour-time').textContent = time;
      item.querySelector('.cavy-hour-date').textContent = dateLabel;
      item.title = `${dateLabel}${time} ${condition} · ${formatted}`;
      hours.append(item);
      accessibleHours.push(`${dateLabel}${time}${condition}，${formatted}`);

      const dot = pointGroup.appendChild(svgElement('circle'));
      const label = pointGroup.appendChild(svgElement('text'));
      dot.toggleAttribute('data-current', Boolean(current));
      label.toggleAttribute('data-current', Boolean(current));
      dot.setAttribute('r', current ? '4.5' : '3');
      label.textContent = formatted;
      return { dot, label };
    });
    const chartLabel = precipitation ? '逐时降水概率' : '逐时气温';
    hourScroll.setAttribute('aria-label', chartLabel + '曲线');
    graph.setAttribute('aria-label', chartLabel + '，' + accessibleHours.join('；'));
    const low = precipitation ? 0 : Math.min(...values);
    const spread = precipitation ? 100 : Math.max(Math.max(...values) - low, 3);
    const targetPositions = rows.map(valueFor).map(value => Number.isFinite(value) ? 55 - 28 * (value - low) / spread : null);
    if (animate && targetPositions.length && chartPositions.length === targetPositions.length
      && targetPositions.every(Number.isFinite) && chartPositions.every(Number.isFinite) && motionEnabled() && inView) {
      chartTransition = { from: chartPositions, to: targetPositions, start: performance.now() };
    } else {
      chartTransition = undefined;
      chartPositions = targetPositions;
    }
    resizeGraph();
    updateHourControls();
  }

  function updateWeek(forecast) {
    emptyWeek.hidden = forecast.length > 0;
    week.hidden = forecast.length === 0;
    const weekValues = forecast.flatMap(({ low, high }) => [low, high]).filter(Number.isFinite);
    const weekLow = Math.min(...weekValues);
    const scale = 100 / Math.max(1, Math.max(...weekValues) - weekLow);
    Array.from(week.children).forEach((row, index) => {
      const day = forecast[index];
      row.hidden = !day;
      if (!day) return;
      const { kind, low, high, condition, dayLabel } = day;
      row.toggleAttribute('data-today', day.isToday);
      row.querySelector('.cavy-day-name').textContent = dayLabel;
      row.querySelector('[data-day-icon]').innerHTML = weatherIcon(kind);
      row.querySelector('.cavy-day-condition').textContent = condition;
      const details = row.querySelector('details');
      const dateKey = `${source.placeKey(city)}/${demo ? demoWeather : 'live'}/${day.date || dayLabel}`;
      if (details.dataset.date !== dateKey) {
        details.open = false;
        details.dataset.date = dateKey;
      }
      const fields = day.details.map(([name, value]) => {
        const field = document.createElement('div');
        const term = document.createElement('dt');
        const definition = document.createElement('dd');
        term.textContent = name;
        definition.textContent = value;
        field.append(term, definition);
        return field;
      });
      row.querySelector('.cavy-day-details').replaceChildren(...fields);
      row.querySelector('.cavy-day-empty').hidden = fields.length > 0;
      row.querySelector('.cavy-low').textContent = format(low);
      row.querySelector('.cavy-high').textContent = format(high);
      const hasRange = Number.isFinite(low) && Number.isFinite(high) && high >= low;
      row.style.setProperty('--cavy-start', hasRange ? `${(low - weekLow) * scale}%` : '0%');
      row.style.setProperty('--cavy-length', hasRange ? `${(high - low) * scale}%` : '0%');
    });
  }

  function render(animate = false, scene = demo ? demoForecast() : source.forecast(entry)) {
    renderedForecast = scene;
    const type = weatherTypes[scene.kind];
    const place = location();
    const placeName = city.name;
    weather = scene.sky;
    hero.dataset.condition = weather;
    cityName.textContent = placeName;
    cityButton.setAttribute('aria-label', `切换城市，当前${placeName}`);
    cityButton.title = `切换城市，当前${placeName}`;
    landscape.textContent = place.landscape;
    landscape.hidden = !place.landscape;
    for (const [key, image] of Object.entries(images)) image.classList.toggle('is-visible', key === place.backdrop);
    for (const button of choices) button.setAttribute('aria-pressed', button.dataset.weather === weather);
    for (const button of unitButtons) button.setAttribute('aria-pressed', button.dataset.unit === unit);

    readings.current.textContent = Number.isFinite(scene.current) ? temperature(scene.current) : '—';
    readoutUnit.textContent = `°${unit}`;
    readoutUnit.hidden = !Number.isFinite(scene.current);
    readings.condition.textContent = scene.condition;
    readings.feels.textContent = `体感 ${format(scene.feels)}`;
    readings.feels.hidden = !Number.isFinite(scene.feels);
    readings.range.textContent = `最高 ${format(scene.high)} · 最低 ${format(scene.low)}`;
    readings.range.hidden = !Number.isFinite(scene.high) && !Number.isFinite(scene.low);
    for (const key of ['detail', 'note', 'humidity', 'wind', 'uv', 'sunset']) readings[key].textContent = scene[key];
    readings.windDirection.textContent = scene.windDirection ?? '风力';
    readings.detail.hidden = !scene.detail;
    readings.air.textContent = scene.air ?? '';
    readings.air.hidden = !scene.air;
    readings.reported.textContent = scene.reported ? `气象发布 ${scene.reported}` : '';
    readings.reported.hidden = !scene.reported;
    currentIcon.innerHTML = icon(type.icon);
    updateHours(scene.hours, animate);
    updateWeek(scene.week);
    refreshIcons();

    readoutAnimation?.cancel();
    if (animate && motionEnabled()) {
      readoutAnimation = readout.animate(
        [{ opacity: 0.62, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 320, easing: 'ease-out' }
      );
    }
  }

  function startParticles() {
    elapsed = 0;
    ripples = [];
    const counts = { rain: 130, snow: 91, clear: 27, cloudy: 0 };
    particles = Array.from({ length: counts[weather] }, () => ({
      x: random(0, width),
      y: random(0, height),
      depth: Math.random(),
      phase: random(0, Math.PI * 2),
      ground: height * random(0.87, 0.99)
    }));
    if (weather === 'rain') {
      ripples = Array.from({ length: 7 }, () => ({
        x: width * random(0.44, 0.61), y: height * random(0.90, 0.99), age: random(0, 0.45)
      }));
    }
    drawWeather(0);
  }

  function resizeWeather() {
    const dimensions = canvas.getBoundingClientRect();
    width = dimensions.width;
    height = dimensions.height;
    if (!context || !width || !height) return;
    const density = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * density);
    canvas.height = Math.round(height * density);
    context.setTransform(density, 0, 0, density, 0, 0);
    startParticles();
  }

  function drawRain(step) {
    const slant = 0.22 + Math.sin(elapsed * 1.1) * 0.06;
    context.lineCap = 'round';
    context.strokeStyle = '#c6e3f7';
    for (const drop of particles) {
      const speed = 225 + drop.depth * 470;
      const length = 6 + 21 * drop.depth;
      drop.x -= speed * slant * step;
      drop.y += speed * step;
      if (drop.y > drop.ground) {
        if (drop.x > width * 0.39 && drop.x < width * 0.64 && drop.depth > 0.5 && ripples.length < 11) {
          ripples.push({ x: drop.x, y: drop.ground, age: 0 });
        }
        drop.x = random(0, width + width * 0.22);
        drop.y = random(-48, -12);
      }
      if (drop.x < -18) drop.x = width + 14;
      context.globalAlpha = 0.22 + 0.42 * drop.depth;
      context.lineWidth = 0.48 + drop.depth * 0.68;
      context.beginPath();
      context.moveTo(drop.x + length * slant, drop.y - length);
      context.lineTo(drop.x, drop.y);
      context.stroke();
    }
    context.lineWidth = 0.85;
    context.strokeStyle = '#b7dbf7';
    context.fillStyle = '#d0e8ff';
    for (const ripple of ripples) {
      ripple.age += step;
      const fraction = Math.min(1, ripple.age / 0.58);
      const radius = 1.3 + fraction * 13;
      context.globalAlpha = 0.49 * (1 - fraction);
      context.beginPath();
      context.ellipse(ripple.x, ripple.y, radius, radius * 0.23, 0, 0, Math.PI * 2);
      context.stroke();
      if (fraction < 0.24) context.fillRect(ripple.x, ripple.y - 2 - fraction * 7, 1, 2);
    }
    ripples = ripples.filter(ripple => ripple.age < 0.58);
  }

  function drawSnow(step) {
    context.fillStyle = '#eef8ff';
    for (const flake of particles) {
      const sway = Math.sin(elapsed * (0.7 + flake.depth) + flake.phase);
      flake.x += (7 + sway * (6 + flake.depth * 16)) * step;
      flake.y += (11 + flake.depth * flake.depth * 67) * step;
      if (flake.y > height + 7) {
        flake.y = -7;
        flake.x = random(-6, width);
      }
      if (flake.x > width + 7) flake.x = -7;
      if (flake.x < -7) flake.x = width + 7;
      const radius = 0.55 + flake.depth * flake.depth * 2.9;
      context.globalAlpha = 0.42 + flake.depth * 0.39;
      context.beginPath();
      context.arc(flake.x, flake.y, radius, 0, Math.PI * 2);
      context.fill();
      if (radius > 2) {
        context.globalAlpha = 0.12;
        context.beginPath();
        context.arc(flake.x, flake.y, radius * 1.85, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  function drawSunlight() {
    const brightness = 0.8 + Math.sin(elapsed * 1.15) * 0.2;
    const sunX = width - Math.max(width, height * 1.6) * 0.164;
    const sunY = height * 0.267;
    const glow = context.createRadialGradient(sunX, sunY, 0, sunX, sunY, width * 0.30);
    glow.addColorStop(0, '#ffce7b42');
    glow.addColorStop(0.38, '#ffcf8230');
    glow.addColorStop(1, '#ffcd7d00');
    context.globalAlpha = brightness;
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }

  function drawWeather(step) {
    if (!context || !width || !height) return;
    elapsed += step;
    context.clearRect(0, 0, width, height);
    if (weather === 'rain') drawRain(step);
    if (weather === 'snow') drawSnow(step);
    if (weather === 'clear') drawSunlight();
    context.globalAlpha = 1;
  }

  function advanceGraph(now) {
    if (!chartTransition) return;
    const { from, to, start } = chartTransition;
    const fraction = Math.min(1, (now - start) / 440);
    const eased = 1 - Math.pow(1 - fraction, 3);
    chartPositions = from.map((y, index) => y + (to[index] - y) * eased);
    drawGraph();
    if (fraction === 1) chartTransition = undefined;
  }

  function advance(now) {
    animationFrame = 0;
    const step = previousFrame == null ? 0 : Math.min(0.04, (now - previousFrame) / 1000);
    previousFrame = now;
    if (weather !== 'cloudy') drawWeather(step);
    advanceGraph(now);
    scheduleFrame();
  }

  function scheduleFrame() {
    const needsFrame = (context && weather !== 'cloudy') || chartTransition;
    if (hero.dataset.playing === 'true' && needsFrame && !animationFrame) {
      animationFrame = requestAnimationFrame(advance);
    }
  }

  function syncMotion() {
    const enabled = motionEnabled();
    const playing = enabled && inView && !document.hidden;
    screen.dataset.motion = String(enabled);
    hero.dataset.playing = String(playing);
    const label = enabled ? '暂停动效' : '播放动效';
    if (motionLabel.textContent !== label) {
      motionLabel.textContent = label;
      motionIcon.innerHTML = icon(enabled ? 'pause' : 'play');
      refreshIcons();
    }
    if (playing) {
      scheduleFrame();
    } else {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousFrame = null;
      if (chartTransition) {
        chartPositions = chartTransition.to;
        chartTransition = undefined;
        drawGraph();
      }
    }
    if (!enabled) {
      readoutAnimation?.cancel();
      greeting?.cancel();
    }
  }

  function showSyncStatus() {
    refreshButton.disabled = syncState === 'loading';
    demoButton.setAttribute('aria-expanded', demo);
    demoLabel.textContent = demo ? '回到实况' : '动效演示';
    demoChoices.hidden = !demo;
    demoBadge.hidden = !demo;
    if (syncState === 'loading') syncLabel.textContent = entry ? `更新中 · ${source.stamp(entry.at)}` : '正在查询';
    else if (syncState === 'updated') syncLabel.textContent = `页面刷新 ${source.stamp(entry.at)}`;
    else if (entry) syncLabel.textContent = `缓存 · ${source.stamp(entry.at)}`;
    else syncLabel.textContent = '天气获取失败';
    syncLabel.title = syncLabel.textContent;
  }

  function redraw(animate, resetWeather = false) {
    const previousWeather = weather;
    render(animate);
    if (resetWeather || previousWeather !== weather) startParticles();
    scheduleFrame();
  }

  function useWeather(selected, next, switching = false) {
    city = resolvedCity(selected, next.data);
    entry = next;
    source.prefs.set('wx-' + source.placeKey(city), JSON.stringify(next));
    source.prefs.set(cityPreference, JSON.stringify(city));
    syncState = 'updated';
    if (switching) hourScroll.scrollLeft = 0;
    redraw(!demo, switching);
  }

  async function refreshWeather() {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    const selected = city;
    const timer = setTimeout(() => controller.abort(), 10000);
    syncState = 'loading';
    showSyncStatus();
    try {
      const next = await source.get(selected, controller.signal);
      if (request !== controller) return;
      useWeather(selected, next);
    } catch {
      if (request !== controller) return;
      syncState = entry ? 'cached' : 'error';
      if (!demo) render();
    } finally {
      clearTimeout(timer);
      if (request === controller) {
        request = undefined;
        showSyncStatus();
      }
    }
  }

  async function chooseCity(place, signal) {
    const selected = defaultOrSelected(place);
    const switching = source.placeKey(selected) !== source.placeKey(city);
    if (!switching && entry && syncState === 'updated') return city;
    const next = await source.get(selected, signal);
    signal.throwIfAborted();
    request?.abort();
    request = undefined;
    useWeather(selected, next, switching);
    showSyncStatus();
    return city;
  }

  const cityPicker = createCityPicker(root, { defaultPlace, activePlace: () => city, chooseCity });
  cityButton.addEventListener('click', () => {
    settings.open = false;
    cityPicker.open();
  });
  document.addEventListener('click', event => {
    if (settings.open && !settings.contains(event.target)) settings.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && settings.open) {
      settings.open = false;
      settingsButton.focus();
    }
  });
  pet.addEventListener('click', () => {
    clearTimeout(greetingTimer);
    petFeedback.hidden = false;
    announcement.textContent = '豚豚向你打招呼。';
    greetingTimer = setTimeout(() => {
      petFeedback.hidden = true;
      announcement.textContent = '';
    }, 1650);
    if (!motionEnabled()) return;
    greeting?.cancel();
    greeting = petResponse.animate([
      { transform: 'none', offset: 0, easing: 'ease-out' },
      { transform: 'translate(-6%, -5px) rotate(-5deg) scale(1.06, 1.03)', offset: 0.30, easing: 'ease-in-out' },
      { transform: 'translate(-3%, -1px) rotate(1.3deg) scale(1.025, .98)', offset: 0.56, easing: 'ease-in-out' },
      { transform: 'translate(-1%, -1px) rotate(-1.6deg)', offset: 0.74, easing: 'ease-out' },
      { transform: 'none', offset: 1 }
    ], { duration: 1080 });
  });

  for (const button of choices) {
    button.addEventListener('click', () => {
      if (!demo || demoWeather === button.dataset.weather) return;
      demoWeather = button.dataset.weather;
      redraw(true, true);
      announcement.textContent = `${city.name}，${readings.condition.textContent}演示`;
    });
  }
  for (const button of unitButtons) {
    button.addEventListener('click', () => {
      if (unit === button.dataset.unit) return;
      unit = button.dataset.unit;
      render();
      source.prefs.set('unit', unit);
    });
  }
  motionButton.addEventListener('click', () => {
    motionOverride = !motionEnabled();
    source.prefs.set('motion', motionOverride ? 'on' : 'off');
    syncMotion();
  });
  refreshButton.addEventListener('click', refreshWeather);
  function setDemo(active) {
    demo = active;
    settings.open = false;
    hourScroll.scrollLeft = 0;
    if (demo) demoWeather = weather;
    redraw(true);
    showSyncStatus();
    const focusTarget = demo ? choices.find(button => button.dataset.weather === demoWeather) : settingsButton;
    focusTarget?.focus();
  }
  demoButton.addEventListener('click', () => setDemo(!demo));
  root.querySelector('[data-end-demo]').addEventListener('click', () => setDemo(false));
  for (const button of hourModeButtons) {
    button.addEventListener('click', () => {
      if (hourView === button.dataset.hourView) return;
      hourView = button.dataset.hourView;
      for (const mode of hourModeButtons) mode.setAttribute('aria-pressed', String(mode === button));
      hourScroll.scrollLeft = 0;
      updateHours(renderedForecast.hours, false);
    });
  }
  hourScroll.addEventListener('scroll', updateHourControls, { passive: true });
  for (const [button, direction] of [[previousHour, -1], [nextHour, 1]]) {
    button.addEventListener('click', () => {
      const columnWidth = hourTrack.clientWidth / chartPoints.length;
      const steps = Math.max(1, Math.floor(hourScroll.clientWidth / columnWidth) - 1);
      hourScroll.scrollBy({ left: direction * columnWidth * steps, behavior: motionEnabled() ? 'smooth' : 'auto' });
    });
  }
  function updateForecastTime() {
    if (!entry || demo || document.hidden) return;
    const next = source.forecast(entry);
    if (next.hours.length !== renderedForecast.hours.length
      || next.hours[1]?.dateLabel !== renderedForecast.hours[1]?.dateLabel
      || next.week[0]?.dayLabel !== renderedForecast.week[0]?.dayLabel
      || next.reported !== renderedForecast.reported) {
      render(false, next);
      showSyncStatus();
    }
  }
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', () => {
    syncMotion();
    updateForecastTime();
  });
  setInterval(updateForecastTime, 60000);
  window.addEventListener('online', () => { if (!request) refreshWeather(); });

  render();
  showSyncStatus();
  resizeWeather();
  syncMotion();
  const sizeObserver = new ResizeObserver(entries => {
    for (const { target } of entries) {
      if (target === hero) resizeWeather();
      if (target === graph) resizeGraph();
      if (target === hourScroll) updateHourControls();
    }
  });
  sizeObserver.observe(hero);
  sizeObserver.observe(graph);
  sizeObserver.observe(hourScroll);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncMotion();
  }).observe(hero);

  refreshWeather();
  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    const workers = navigator.serviceWorker;
    if (workers.controller) {
      workers.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    }
    workers.register('./sw.js', { updateViaCache: 'none' })
      .then(registration => registration.update())
      .catch(() => {});
  }
})();
