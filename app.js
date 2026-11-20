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
  const week = root.querySelector('.cavy-week');
  const emptyHours = root.querySelector('[data-empty-hours]');
  const emptyWeek = root.querySelector('[data-empty-week]');
  const previousHour = root.querySelector('[data-hour-previous]');
  const nextHour = root.querySelector('[data-hour-next]');
  const syncLabel = root.querySelector('[data-weather-status]');
  const refreshButton = root.querySelector('[data-refresh]');
  const demoButton = root.querySelector('[data-demo-toggle]');
  const demoChoices = root.querySelector('#cavy-weather-choices');
  const motionButton = root.querySelector('[data-motion-control]');
  const motionLabel = root.querySelector('[data-motion-label]');
  const motionIcon = root.querySelector('[data-motion-icon]');
  const pet = root.querySelector('.cavy-pet');
  const petResponse = pet.querySelector('.cavy-pet-response');
  const cityButton = root.querySelector('.cavy-city');
  const cityName = root.querySelector('[data-city-name]');
  const landscape = root.querySelector('[data-landscape]');
  const locationDialog = root.querySelector('.cavy-location-dialog');
  const locationInput = root.querySelector('#cavy-other-city');
  const locationButtons = Array.from(root.querySelectorAll('[data-location]'));
  const readout = root.querySelector('[data-readout]');
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
      note: '湖面晒得发亮，适合散步。',
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

  const locations = new Map([
    ['杭州', { landscape: '西湖水岸', backdrop: 'hangzhou', weather: 'rain', offset: 0, water: true }],
    ['上海', { landscape: '浦江天际线', backdrop: 'shanghai', weather: 'cloudy', offset: 1, water: true }],
    ['西安', { landscape: '古城墙', backdrop: 'xian', weather: 'clear', offset: -8, water: false }],
    ['青岛', { landscape: '海湾', backdrop: 'qingdao', weather: 'rain', offset: -7, water: true }],
    ['哈尔滨', { landscape: '北方街景', backdrop: 'harbin', weather: 'snow', offset: -8, water: false }]
  ]);
  const neutralLocation = { landscape: '通用天气场景', backdrop: 'neutral', weather: 'cloudy', offset: 0, water: false };

  let weather = 'cloudy';
  let city = cityLabel(source.prefs.get('city')) || '杭州';
  let entry = source.cached(city) ?? (city === '杭州' ? starter : null);
  let syncState = entry ? 'cached' : 'loading';
  let unit = source.prefs.get('unit') === 'F' ? 'F' : 'C';
  let request;
  let hourlyPage = 0;
  let demo = false;
  let demoWeather = 'rain';
  let motionOverride;
  let inView = true;
  let animationFrame = 0;
  let previousFrame = null;
  let width = 0;
  let height = 0;
  let elapsed = 0;
  let particles = [];
  let ripples = [];
  let chartWidth = 0;
  let chartPositions = [];
  let chartTransition;
  let readoutAnimation;
  let greeting;

  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const weatherIcon = kind => `<span class="cavy-icon" data-icon-weather="${kind}">${icon(weatherTypes[kind].icon)}</span>`;
  const refreshIcons = () => paintWeatherIcons(root);
  const temperature = value => Math.round(unit === 'F' ? value * 9 / 5 + 32 : value);
  const format = value => Number.isFinite(value) ? `${temperature(value)}°` : '—';
  const random = (min, max) => min + Math.random() * (max - min);
  const motionEnabled = () => motionOverride ?? !reducedMotion.matches;
  const displayedCity = () => cityLabel(entry?.data.city) || city;
  const location = () => locations.get(displayedCity()) ?? locations.get(city) ?? neutralLocation;

  function cityLabel(value) {
    if (typeof value !== 'string') return '';
    const clean = value.trim().replace(/\s+/g, ' ').slice(0, 24);
    const withoutSuffix = clean.replace(/市$/u, '');
    return locations.has(withoutSuffix) ? withoutSuffix : clean;
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
      hours: base.hours.map(([value, kind], index) => [value + offset, kind, times[index], weatherTypes[kind].label]),
      week: base.week.map(([kind, low, high], index) => [kind, low + offset, high + offset, weatherTypes[kind].label, weekdays[index]])
    };
  }

  for (const time of times) {
    const item = document.createElement('div');
    item.className = 'cavy-hour';
    item.innerHTML = `<span data-hour-time>${time}</span><span data-hour-weather></span>`;
    hours.append(item);
  }
  for (const day of weekdays) {
    const row = document.createElement('li');
    row.className = 'cavy-day';
    row.innerHTML = `<strong class="cavy-day-name">${day}</strong><span class="cavy-day-weather"><span data-day-icon></span><span class="cavy-day-condition"></span></span><span class="cavy-low"></span><span class="cavy-track" aria-hidden="true"><span></span></span><span class="cavy-high"></span>`;
    week.append(row);
  }

  const svgElement = tag => document.createElementNS('http://www.w3.org/2000/svg', tag);
  const chartLines = Array.from({ length: 3 }, () => grid.appendChild(svgElement('line')));
  const chartPoints = times.map(() => ({
    dot: pointGroup.appendChild(svgElement('circle')),
    label: pointGroup.appendChild(svgElement('text'))
  }));

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
      dot.setAttribute('r', '3.5');
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

  function updateForecast(scene, animate) {
    hourlyPage = Math.min(hourlyPage, Math.max(0, Math.ceil(scene.hours.length / times.length) - 1));
    const first = hourlyPage * times.length;
    const hourGroup = scene.hours.slice(first, first + times.length);
    previousHour.disabled = hourlyPage === 0;
    nextHour.disabled = first + times.length >= scene.hours.length;
    const hourlyTemps = hourGroup.map(([value]) => value).filter(Number.isFinite);
    hours.hidden = hourGroup.length === 0;
    graph.hidden = hourlyTemps.length === 0;
    emptyHours.hidden = hourGroup.length > 0;
    hours.style.gridTemplateColumns = `repeat(${Math.max(1, hourGroup.length)}, minmax(0, 1fr))`;
    const low = Math.min(...hourlyTemps);
    const spread = Math.max(Math.max(...hourlyTemps) - low, 3);
    const targetPositions = hourGroup.map(([value]) => Number.isFinite(value) ? 57 - 29 * (value - low) / spread : null);
    if (animate && targetPositions.length && chartPositions.length === targetPositions.length
      && targetPositions.every(Number.isFinite) && chartPositions.every(Number.isFinite) && motionEnabled() && inView) {
      chartTransition = { from: chartPositions, to: targetPositions, start: performance.now() };
    } else {
      chartTransition = undefined;
      chartPositions = targetPositions;
      drawGraph();
    }
    graph.setAttribute('aria-label', '逐时气温，' + hourGroup.map(([value, , time, condition]) =>
      `${time}${condition}，${format(value)}`
    ).join('；'));
    Array.from(hours.children).forEach((item, index) => {
      const hour = hourGroup[index];
      item.hidden = !hour;
      if (!hour) return;
      const [value, kind, time, condition] = hour;
      item.querySelector('[data-hour-time]').textContent = time;
      item.querySelector('[data-hour-weather]').innerHTML = weatherIcon(kind);
      item.title = condition;
      chartPoints[index].label.textContent = format(value);
    });

    emptyWeek.hidden = scene.week.length > 0;
    week.hidden = scene.week.length === 0;
    const weekValues = scene.week.flatMap(([, low, high]) => [low, high]).filter(Number.isFinite);
    const weekLow = Math.min(...weekValues);
    const scale = 100 / Math.max(1, Math.max(...weekValues) - weekLow);
    Array.from(week.children).forEach((row, index) => {
      const day = scene.week[index];
      row.hidden = !day;
      if (!day) return;
      const [kind, low, high, condition, date] = day;
      row.querySelector('.cavy-day-name').textContent = date;
      row.querySelector('[data-day-icon]').innerHTML = weatherIcon(kind);
      row.querySelector('.cavy-day-condition').textContent = condition;
      row.title = `${date} ${condition}`;
      row.querySelector('.cavy-low').textContent = format(low);
      row.querySelector('.cavy-high').textContent = format(high);
      const hasRange = Number.isFinite(low) && Number.isFinite(high) && high >= low;
      row.style.setProperty('--cavy-start', hasRange ? `${(low - weekLow) * scale}%` : '0%');
      row.style.setProperty('--cavy-length', hasRange ? `${(high - low) * scale}%` : '0%');
    });
  }

  function render(animate = false) {
    const scene = demo ? demoForecast() : source.forecast(entry?.data ?? {});
    const type = weatherTypes[scene.kind];
    const place = location();
    const placeName = displayedCity();
    weather = scene.sky;
    hero.dataset.condition = weather;
    cityName.textContent = placeName;
    cityButton.setAttribute('aria-label', `切换城市，当前${placeName}`);
    cityButton.title = `切换城市，当前${placeName}`;
    landscape.textContent = place.landscape;
    for (const [key, image] of Object.entries(images)) image.classList.toggle('is-visible', key === place.backdrop);
    for (const button of locationButtons) button.setAttribute('aria-pressed', button.dataset.location === placeName);
    for (const button of choices) button.setAttribute('aria-pressed', button.dataset.weather === weather);
    for (const button of unitButtons) button.setAttribute('aria-pressed', button.dataset.unit === unit);

    readings.current.textContent = Number.isFinite(scene.current) ? temperature(scene.current) : '—';
    readout.querySelector('sup').hidden = !Number.isFinite(scene.current);
    readings.condition.textContent = scene.condition;
    readings.feels.textContent = `体感 ${format(scene.feels)}`;
    readings.range.textContent = `最高 ${format(scene.high)} · 最低 ${format(scene.low)}`;
    for (const key of ['detail', 'note', 'humidity', 'wind', 'uv', 'sunset']) readings[key].textContent = scene[key];
    readings.windDirection.textContent = scene.windDirection ?? '风力';
    readings.detail.hidden = !scene.detail;
    currentIcon.innerHTML = icon(type.icon);
    updateForecast(scene, animate);
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
    const rippleLimit = location().water ? 20 : 11;
    context.lineCap = 'round';
    context.strokeStyle = '#c6e3f7';
    for (const drop of particles) {
      const speed = 225 + drop.depth * 470;
      const length = 6 + 21 * drop.depth;
      drop.x -= speed * slant * step;
      drop.y += speed * step;
      if (drop.y > drop.ground) {
        if (drop.x > width * 0.39 && drop.x < width * 0.64 && drop.depth > 0.5 && ripples.length < rippleLimit) {
          ripples.push({ x: drop.x, y: drop.ground, age: 0 });
        }
        drop.x = random(0, width + width * 0.22);
        drop.y = random(-48, -12);
      }
      if (drop.x < -18) drop.x = width + 14;
      const inFrontOfPet = drop.x > width * 0.59 && drop.y > height * 0.52;
      context.globalAlpha = (0.22 + 0.42 * drop.depth) * (inFrontOfPet ? 0.58 : 1);
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
    if (!location().water) return;
    context.fillStyle = '#ffe09b';
    for (const light of particles) {
      const glint = Math.pow(Math.max(0, Math.sin(elapsed * (1.7 + light.depth) + light.phase)), 3);
      context.globalAlpha = glint * (0.22 + light.depth * 0.38);
      const x = width * (0.48 + 0.128 * light.x / width) + Math.sin(elapsed + light.phase) * 3;
      const y = height * (0.69 + 0.135 * light.y / height);
      context.fillRect(x, y, 2 + light.depth * 7, 0.7 + light.depth * 0.5);
    }
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
    demoButton.textContent = demo ? '回到实况' : '动效演示';
    demoChoices.hidden = !demo;
    if (demo) syncLabel.textContent = '演示数据';
    else if (syncState === 'loading') syncLabel.textContent = '正在查询';
    else if (syncState === 'updated') syncLabel.textContent = `${source.time(entry.at)} 已更新`;
    else if (entry) syncLabel.textContent = `缓存 · ${source.stamp(entry.at)}`;
    else syncLabel.textContent = '天气获取失败';
  }

  function redraw(animate, resetWeather = false) {
    const previousWeather = weather;
    render(animate);
    if (resetWeather || previousWeather !== weather) startParticles();
    scheduleFrame();
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
      entry = next;
      source.prefs.set('wx-' + selected, JSON.stringify(next));
      source.prefs.set('city', selected);
      syncState = 'updated';
      redraw(!demo);
    } catch {
      if (request !== controller) return;
      syncState = entry ? 'cached' : 'error';
    } finally {
      clearTimeout(timer);
      if (request === controller) {
        request = undefined;
        showSyncStatus();
      }
    }
  }

  function chooseCity(value) {
    const selected = cityLabel(value);
    if (!selected) return;
    locationDialog.close();
    cityButton.focus();
    if (selected === city) {
      if (syncState === 'error') refreshWeather();
      return;
    }
    city = selected;
    entry = source.cached(city) ?? (city === '杭州' ? starter : null);
    if (entry) source.prefs.set('city', city);
    hourlyPage = 0;
    demoWeather = location().weather;
    redraw(true, true);
    refreshWeather();
  }

  cityButton.addEventListener('click', () => {
    locationInput.value = '';
    locationInput.setCustomValidity('');
    locationDialog.showModal();
    (locationButtons.find(button => button.dataset.location === displayedCity()) ?? locationInput).focus();
  });
  root.querySelector('[data-close-location]').addEventListener('click', () => locationDialog.close());
  for (const button of locationButtons) button.addEventListener('click', () => chooseCity(button.dataset.location));
  locationInput.addEventListener('input', () => locationInput.setCustomValidity(''));
  function chooseCustomCity() {
    if (!cityLabel(locationInput.value)) {
      locationInput.setCustomValidity('请输入城市名');
      locationInput.reportValidity();
      return;
    }
    chooseCity(locationInput.value);
  }
  root.querySelector('[data-custom-location]').addEventListener('click', chooseCustomCity);
  locationInput.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      chooseCustomCity();
    }
  });
  pet.addEventListener('click', () => {
    announcement.textContent = '豚豚向你打招呼。';
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
      announcement.textContent = `${displayedCity()}，${readings.condition.textContent}演示`;
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
    syncMotion();
  });
  refreshButton.addEventListener('click', refreshWeather);
  demoButton.addEventListener('click', () => {
    demo = !demo;
    hourlyPage = 0;
    if (demo) demoWeather = weather;
    redraw(true);
    showSyncStatus();
  });
  for (const [button, direction] of [[previousHour, -1], [nextHour, 1]]) {
    button.addEventListener('click', () => {
      hourlyPage += direction;
      redraw(true);
    });
  }
  reducedMotion.addEventListener('change', () => {
    motionOverride = undefined;
    syncMotion();
  });
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('online', () => { if (!request) refreshWeather(); });

  render();
  showSyncStatus();
  resizeGraph();
  resizeWeather();
  syncMotion();
  const sizeObserver = new ResizeObserver(entries => {
    for (const { target } of entries) {
      if (target === hero) resizeWeather();
      if (target === graph) resizeGraph();
    }
  });
  sizeObserver.observe(hero);
  sizeObserver.observe(graph);
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
