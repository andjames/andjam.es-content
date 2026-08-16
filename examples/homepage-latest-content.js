fetch('/content/latest.json')
  .then((response) => response.ok ? response.json() : Promise.reject(response))
  .then((entries) => {
    const target = document.querySelector('[data-latest-content]');
    if (!target) return;
    target.replaceChildren(...entries.map((entry) => {
      const item = document.createElement('article');
      item.innerHTML = `<p>${entry.type.toUpperCase()}</p><h3><a href="${entry.url}">${entry.title}</a></h3><p>${entry.description}</p>`;
      return item;
    }));
  })
  .catch(() => {});
