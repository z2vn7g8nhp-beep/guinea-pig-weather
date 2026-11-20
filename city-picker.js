function createCityPicker(root, { defaultPlace, activePlace, chooseCity }) {
  const source = weatherService;
  const dialog = root.querySelector('.cavy-location-dialog');
  const form = dialog.querySelector('.cavy-location-form');
  const input = form.elements.city;
  const submit = form.querySelector('button[type="submit"]');
  const status = dialog.querySelector('[data-location-status]');
  const matchesSection = dialog.querySelector('[data-location-matches]');
  const shortcuts = dialog.querySelector('[data-location-shortcuts]');
  const favoritesSection = dialog.querySelector('[data-location-favorites]');
  const recentSection = dialog.querySelector('[data-location-recent]');
  const defaultButton = dialog.querySelector('[data-location-default]');
  const favorite = dialog.querySelector('[data-favorite-current]');
  const favoriteLabel = favorite.querySelector('span');
  const samePlace = (first, second) => source.placeKey(first) === source.placeKey(second);
  let favorites = storedPlaces('favorite-places');
  let recent = storedPlaces('recent-places');
  let candidates = [];
  let suggestionTimer;
  let suggestionRequest;
  let weatherRequest;

  function storedPlaces(key) {
    try {
      const values = JSON.parse(source.prefs.get(key));
      return Array.isArray(values) ? values.map(source.place).filter(Boolean) : [];
    } catch { return []; }
  }

  function message(text, error = false) {
    status.textContent = text;
    status.toggleAttribute('data-error', error);
  }

  function renderList(section, entries, removable = false) {
    const list = section.querySelector('ul');
    const selected = activePlace();
    const rows = entries.map(place => {
      const row = document.createElement('li');
      row.innerHTML = `<button type="button" class="cavy-place-choice">
        <i data-lucide="map-pin" aria-hidden="true"></i>
        <span class="cavy-location-name"><span></span><small></small></span>
        <i data-lucide="check" aria-hidden="true"></i>
      </button>`;
      const choice = row.firstElementChild;
      const name = choice.querySelector('.cavy-location-name');
      name.firstElementChild.textContent = place.name;
      name.lastElementChild.textContent = place.area;
      name.lastElementChild.hidden = !place.area || place.name === place.area;
      choice.setAttribute('aria-current', String(samePlace(place, selected)));
      choice.addEventListener('click', () => select(place));
      if (removable) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'cavy-icon-button cavy-favorite-remove';
        remove.setAttribute('aria-label', `取消收藏${place.name}`);
        remove.title = `取消收藏${place.name}`;
        remove.innerHTML = '<i data-lucide="star" aria-hidden="true"></i>';
        remove.addEventListener('click', () => {
          toggleFavorite(place);
          favorite.focus();
        });
        row.append(remove);
      }
      return row;
    });
    list.replaceChildren(...rows);
    section.hidden = !rows.length;
    paintWeatherIcons(list);
  }

  function renderShortcuts() {
    const selected = activePlace();
    const saved = favorites.some(place => samePlace(place, selected));
    favorite.setAttribute('aria-pressed', String(saved));
    favoriteLabel.textContent = saved ? '已收藏当前城市' : '收藏当前城市';
    favorite.title = saved ? `取消收藏${selected.name}` : `收藏${selected.name}`;
    defaultButton.setAttribute('aria-current', String(samePlace(defaultPlace, selected)));
    renderList(favoritesSection, favorites, true);
    renderList(recentSection, recent.filter(place => !samePlace(place, defaultPlace)
      && !favorites.some(saved => samePlace(saved, place))));
  }

  function toggleFavorite(place) {
    const saved = favorites.some(item => samePlace(item, place));
    favorites = saved ? favorites.filter(item => !samePlace(item, place)) : [place, ...favorites];
    source.prefs.set('favorite-places', JSON.stringify(favorites));
    renderShortcuts();
  }

  function stopSuggestions() {
    clearTimeout(suggestionTimer);
    suggestionRequest?.abort();
    suggestionRequest = undefined;
  }

  function stopWeatherQuery() {
    weatherRequest?.abort();
    weatherRequest = undefined;
    submit.disabled = false;
  }

  function search() {
    stopSuggestions();
    stopWeatherQuery();
    input.removeAttribute('aria-invalid');
    message('');
    candidates = [];
    renderList(matchesSection, candidates);
    shortcuts.hidden = false;
    const query = source.cityName(input.value);
    if (Array.from(query).length < 2) return;
    const controller = new AbortController();
    suggestionRequest = controller;
    suggestionTimer = setTimeout(async () => {
      try {
        const result = await source.search(query, controller.signal);
        if (controller.signal.aborted || !dialog.open) return;
        candidates = result;
        renderList(matchesSection, result);
        shortcuts.hidden = result.length > 0;
      } catch {
        // Direct weather lookup remains available.
      }
    }, 280);
  }

  async function select(place) {
    stopSuggestions();
    stopWeatherQuery();
    const controller = new AbortController();
    weatherRequest = controller;
    const timer = setTimeout(() => controller.abort(), 10000);
    submit.disabled = true;
    input.removeAttribute('aria-invalid');
    message(`正在查询${place.name}…`);
    try {
      const selected = await chooseCity(place, controller.signal);
      if (controller.signal.aborted || !dialog.open) return;
      recent = [selected, ...recent.filter(item => !samePlace(item, selected))].slice(0, 6);
      source.prefs.set('recent-places', JSON.stringify(recent));
      dialog.close();
    } catch (error) {
      if (weatherRequest !== controller || !dialog.open) return;
      if (error.status === 404 || error.status === 400) {
        if (place.query) input.setAttribute('aria-invalid', 'true');
        message(`未找到「${place.name}」的天气，请检查名称或选择候选地点。`, true);
      } else if (controller.signal.aborted) {
        message('天气查询超时，请重试。', true);
      } else if (error instanceof TypeError) {
        message('网络连接失败，请重试。', true);
      } else {
        message('天气服务暂时不可用，请稍后重试。', true);
      }
    } finally {
      clearTimeout(timer);
      if (weatherRequest === controller) {
        weatherRequest = undefined;
        submit.disabled = false;
      }
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const name = source.cityName(input.value);
    if (!name) {
      input.setAttribute('aria-invalid', 'true');
      message('请输入城市或区县名。', true);
      return;
    }
    const bareName = value => value.replace(/[市区县]$/u, '');
    const fullNameMatches = candidates.filter(item => item.name === name);
    const exact = fullNameMatches.length ? fullNameMatches : candidates.filter(item => bareName(item.name) === bareName(name));
    if (exact.length > 1) {
      message('找到多个同名地点，请从候选列表选择。');
      return;
    }
    select(exact[0] ?? { name, query: name });
  });
  input.addEventListener('input', event => { if (!event.isComposing) search(); });
  input.addEventListener('compositionend', search);
  favorite.addEventListener('click', () => toggleFavorite(activePlace()));
  defaultButton.addEventListener('click', () => select(defaultPlace));
  dialog.querySelector('[data-close-location]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    stopSuggestions();
    stopWeatherQuery();
  });

  return {
    open() {
      input.value = '';
      input.removeAttribute('aria-invalid');
      message('');
      candidates = [];
      renderList(matchesSection, candidates);
      shortcuts.hidden = false;
      renderShortcuts();
      dialog.showModal();
      if (matchMedia('(pointer: fine)').matches) input.focus();
    }
  };
}
