// Page behavior for the Newsroom data story. Classic script, loaded with defer after
// vendor/d3.v7.9.0.min.js and data.js. Every number shown on the page comes from window.STUDY.
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');
  // Without d3 the CSS shows the .chart-fallback notes and the text stands on its own.
  if (window.d3) root.classList.add('has-d3');
})();
