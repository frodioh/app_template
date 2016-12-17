module.exports = function() {
  var menu = document.querySelector('#hamburgerMenu');
  var menuBtn = document.querySelector('.menu__btn');
  menuBtn.addEventListener('click', function() {
    menu.classList.toggle('menu--active');
  });
};