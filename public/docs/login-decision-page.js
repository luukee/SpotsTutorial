/**
 * Loads login-decision.mmd and renders it with the local Mermaid build.
 * Edit the .mmd file to change the chart; refresh the page to see it.
 */
(function () {
  const wrap = document.getElementById('diagram-wrap');
  const diagram = document.getElementById('diagram');
  const errorEl = document.getElementById('diagram-error');

  function showError(message) {
    if (wrap) {
      wrap.hidden = true;
      wrap.setAttribute('aria-busy', 'false');
    }
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
  }

  if (!window.mermaid || !diagram || !wrap) {
    showError('Could not load the chart library.');
    return;
  }

  window.mermaid.initialize({
    startOnLoad: false,
    // antiscript: allow .step-where heading markup in node labels
    securityLevel: 'antiscript',
    theme: 'base',
    themeVariables: {
      primaryColor: '#e8eef8',
      primaryTextColor: '#12304f',
      primaryBorderColor: '#065395',
      lineColor: '#4a627a',
      secondaryColor: '#f8eaea',
      tertiaryColor: '#fff',
      fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
    },
    flowchart: {
      htmlLabels: true,
      curve: 'basis',
    },
  });

  fetch('/docs/login-decision.mmd')
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Could not load login-decision.mmd');
      }
      return response.text();
    })
    .then(function (source) {
      diagram.hidden = false;
      diagram.textContent = source;
      wrap.setAttribute('aria-busy', 'false');
      return window.mermaid.run({ nodes: [diagram] });
    })
    .catch(function () {
      showError(
        'Could not load or draw the chart. Check login-decision.mmd and refresh.'
      );
    });
})();
