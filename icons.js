const weatherIcons = {
  'map-pin': '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-left': '<path d="m15 6-6 6 6 6"/>',
  'chevron-right': '<path d="m9 6 6 6-6 6"/>',
  'refresh-cw': '<path d="M20 9a8 8 0 1 0 0 6M20 3v6h-6"/>',
  'sliders-horizontal': '<path d="M3 7h7m4 0h7M3 17h11m4 0h3"/><circle cx="12" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  play: '<path d="m8 5 12 7-12 7Z"/>',
  pause: '<path d="M9 5H6v14h3ZM18 5h-3v14h3Z"/>',
  x: '<path d="m6 6 12 12M6 18 18 6"/>',
  'notebook-pen': '<rect x="4" y="3" width="13" height="18" rx="2"/><path d="M2 7h4M2 12h4M2 17h4m5-3 1-4 6-6a2 2 0 0 1 3 3l-6 6Z"/>',
  wind: '<path d="M2 8h12c4 0 4-6 0-6M2 12h17c4 0 4-6 1-6M2 16h11c4 0 4 6 0 6"/>',
  droplet: '<path d="M12 2c-2 4-8 10-8 14a8 8 0 0 0 16 0c0-4-6-10-8-14Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  sunset: '<path d="M2 18h20M4 21h16M6 16a6 6 0 0 1 12 0M12 3v4m-9 3 3 2m12 0 3-2"/>',
  cloud: '<path d="M6 18a4 4 0 0 1-1-8 6 6 0 0 1 11-2 5 5 0 1 1 1 10Z"/>',
  'cloud-sun': '<path d="M7 9a4 4 0 1 1 7-3m-5-4V1M4 3 2 2m14 1 2-2M2 9H1m5 10a3.5 3.5 0 0 1-1-7 5.5 5.5 0 0 1 10.6-1A4 4 0 1 1 17 19Z"/>',
  'cloud-rain': '<path d="M5 15a3.5 3.5 0 0 1 0-7 6 6 0 0 1 11-2 4.5 4.5 0 1 1 3 9M8 17l-2 4m7-4-2 4m7-4-2 4"/>',
  'cloud-drizzle': '<path d="M5 15a3.5 3.5 0 0 1 0-7 6 6 0 0 1 11-2 4.5 4.5 0 1 1 3 9M7 18v.5m5 1v.5m5-2v.5"/>',
  snowflake: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M5 9l4-1-1-4m11 11-4 1 1 4M5 15l4 1-1 4m11-11-4-1 1-4"/>'
};

function paintWeatherIcons(root) {
  for (const item of root.querySelectorAll('i[data-lucide]')) {
    const name = item.dataset.lucide;
    const shape = weatherIcons[name];
    if (!shape) continue;
    item.outerHTML = `<svg class="lucide lucide-${name}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${shape}</svg>`;
  }
}
