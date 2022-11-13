document.addEventListener('DOMContentLoaded', () => {
  // nav menu
  const menus = document.querySelectorAll('.side-menu');
  M.Sidenav.init(menus, { edge: 'right' });
});

document.addEventListener('DOMContentLoaded', () => {
  const player = document.querySelector('#modal-player');
  const instances = M.Modal.init(player);
  instances.open();
  console.log('loaded!');
  console.log(instances);
});
