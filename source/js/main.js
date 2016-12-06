'use strict';

import Menu from './menu/index.js';

new Menu({
  elem: document.querySelector('.menu')
});

document.querySelector('.page__header').onclick = function() {
  console.log('he-he');
};