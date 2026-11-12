(() => {
  'use strict';

  const toggle = document.querySelector('[data-password-toggle]');
  if (!toggle) return;

  const input = document.getElementById(toggle.getAttribute('aria-controls'));
  if (!input) return;

  toggle.addEventListener('click', () => {
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', reveal ? 'true' : 'false');
    toggle.textContent = reveal ? 'Hide' : 'Show';

    const length = input.value.length;
    input.focus({ preventScroll: true });
    try {
      input.setSelectionRange(length, length);
    } catch (error) {}
  });
})();
