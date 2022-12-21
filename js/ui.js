const PAGE_SIZE = 10;
const deviceConfigMapping = {
  device_name: '디바이스명',
  location: '장소',
  remark: 'Remark',
  top: 'top',
  left: 'left',
  height: 'height',
  width: 'width',
  on: '시작시간',
  off: '종료시간',
};

const playerDOM = document.querySelector('#modal-player');

const resizeObserver = new ResizeObserver(entries => {
  for (let entry of entries) {
    const { width, height } = entry.contentRect;
    $('.video-js').width(width).height(height);
  }
});
resizeObserver.observe(playerDOM);

var intersectionObserver = new IntersectionObserver(function (entries) {
  console.log(entries[0]);
  if (entries[0].isIntersecting) {
    console.log('player is visible!');
    player.isVisible = true;
    player.play();
  } else {
    console.log('player is not visible!');
    player.isVisible = false;
    player.pause();
  }
});
intersectionObserver.observe(playerDOM);

const applyPosition = position => {
  if (player.locked) return;
  for (key in position) {
    position[key] = Math.round(position[key]);
  }
  player.position = position;
  postPlayerUi(position).then(() => {
    updateDevicePositionUi(position);
  });
};

// popup 노출
const initPlayerUi = position => {
  const { width, height, ...offset } = position;

  $(playerDOM)
    .offset(offset)
    .width(width)
    .height(height)
    .draggable({
      disabled: player.locked,
      cursor: 'crosshair',
      stop: function (event, ui) {
        const position = {
          width: ui.helper.width(),
          height: ui.helper.height(),
          top: Math.max(ui.offset.top, 0),
          left: Math.max(ui.offset.left, 0),
        };
        applyPosition(position);
      },
    })
    .resizable({
      disabled: player.locked,
      stop: function (event, ui) {
        const position = {
          ...ui.size,
          top: Math.max(ui.position.top, 0),
          left: Math.max(ui.position.left, 0),
        };
        applyPosition(position);
      },
    });
};
const createElementWithInnerText = (tag, text) => {
  const element = document.createElement(tag);
  element.innerText = text;

  return element;
};

const removeAllChildNodes = parent => {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
};

const displaySpinner = node => {
  node.innerHTML = `
<td class="center" colspan="6">
  <div class="preloader-wrapper big active">
    <div class="spinner-layer">
      <div class="circle-clipper left">
        <div class="circle"></div>
      </div><div class="gap-patch">
        <div class="circle"></div>
      </div><div class="circle-clipper right">
        <div class="circle"></div>
      </div>
    </div>
  </div>
</td>
`;
};

const displaySpinnerOnTable = () => {
  const videoListNode = document.querySelector('#video-body');
  const deviceConfigNode = document.querySelector('#device-config');
  displaySpinner(videoListNode);
  displaySpinner(deviceConfigNode);
};

const createPagination = (length, currentPage) => {
  const videoPagination = document.querySelector('#video-pagination');
  const pages = parseInt(length / PAGE_SIZE);
  const leftArrowClass = currentPage === 1 ? 'disabled' : 'waves-effect';
  const rightArrowClass =
    currentPage === pages + 1 ? 'disabled' : 'waves-effect';
  const leftAnchorAttribute =
    currentPage === 1
      ? 'disabled'
      : `onclick="renderVideoList(player.videoList, ${currentPage - 1})"`;
  const rightAnchorAttribute =
    currentPage === pages + 1
      ? 'disabled'
      : `onclick="renderVideoList(player.videoList, ${currentPage + 1})"`;

  let paginationInnerHTML = `<li class="${leftArrowClass}"><a ${leftAnchorAttribute}><i class="material-icons">chevron_left</i></a></li>`;
  for (let i = 1; i <= pages + 1; i++) {
    const pageClass = currentPage === i ? 'active' : 'waves-effect';
    paginationInnerHTML += `<li id="page-${i}" class="${pageClass}"><a onclick="renderVideoList(player.videoList, ${i})">${i}</a></li>`;
  }
  paginationInnerHTML += `<li class="${rightArrowClass}"><a ${rightAnchorAttribute}><i class="material-icons">chevron_right</i></a></li>`;

  videoPagination.innerHTML = paginationInnerHTML;
};

const renderVideoList = (videoList, currentPage = 1) => {
  const parentNode = document.querySelector('#video-body');
  removeAllChildNodes(parentNode);

  videoList
    .filter((row, index) => {
      const start = (currentPage - 1) * PAGE_SIZE;
      const end = currentPage * PAGE_SIZE;
      if (index >= start && index < end) return true;
    })
    .forEach(row => {
      const tr = document.createElement('tr');
      Object.values(row).forEach(value => {
        td = createElementWithInnerText('td', value);
        tr.appendChild(td);
      });
      parentNode.appendChild(tr);
    });
  createPagination(videoList.length, currentPage);
};

const setDeviceConfig = deviceConfig => {
  const parentNode = document.querySelector('#device-config');
  removeAllChildNodes(parentNode);

  for (const prop in deviceConfig) {
    const tr = document.createElement('tr');
    if (deviceConfigMapping[prop]) {
      const th = createElementWithInnerText('th', deviceConfigMapping[prop]);
      const td = createElementWithInnerText('td', deviceConfig[prop]);
      td.setAttribute('name', deviceConfigMapping[prop]);
      tr.appendChild(th);
      tr.appendChild(td);
      parentNode.appendChild(tr);
    }
  }

  const isLocked = deviceConfig['locked'] === 'Y' ? true : false;
  const lockPositionSwitch = createSwitchElement(isLocked);
  parentNode.appendChild(lockPositionSwitch);
};

const updateDevicePositionUi = position => {
  for (key in position) {
    document.querySelector(`td[name="${key}"]`).innerText = position[key];
  }
};

const disableDeviceIdButton = () => {
  const deviceIdButton = document.querySelector('#btn-device-id');
  deviceIdButton.setAttribute('disabled', '');
};

const enableDeviceIdButton = () => {
  const deviceIdButton = document.querySelector('#btn-device-id');
  deviceIdButton.removeAttribute('disabled');
};

function createSwitchElement(isLocked) {
  const lockPositionSwitch = document.createElement('div');
  lockPositionSwitch.classList.add('switch');
  lockPositionSwitch.id = 'lock-position';
  lockPositionSwitch.innerHTML = `<label>크기 & 위치 고정<input type="checkbox" /><span class="lever"></span></label>`;
  const lockPositionSwitchInput = lockPositionSwitch.querySelector('input');
  lockPositionSwitchInput.checked = isLocked;
  player.locked = isLocked;
  lockPositionSwitchInput.addEventListener('change', () =>
    applyLockPosition(lockPositionSwitchInput),
  );
  return lockPositionSwitch;
}

function applyLockPosition(lockPositionSwitchInput) {
  const isChecked = lockPositionSwitchInput.checked;
  postPositionLocked(isChecked)
    .then(() => {
      console.log('postPositionLocked');
      player.locked = isChecked;
      $(playerDOM).draggable(isChecked ? 'disable' : 'enable');
      $(playerDOM).resizable(isChecked ? 'disable' : 'enable');
    })
    .catch(error => {
      M.toast({ html: '크기 & 위치 고정 여부 연동 실패!', classes: 'red' });
    });
}

const showPlaylistOnly = () => {
  const videoInfo = document.querySelector('.video-info');
  const deviceInfo = document.querySelector('.device-info');

  videoInfo.classList.remove('mobile-hidden');
  deviceInfo.classList.add('mobile-hidden');
};

const showDeviceInfoOnly = () => {
  const videoInfo = document.querySelector('.video-info');
  const deviceInfo = document.querySelector('.device-info');

  videoInfo.classList.add('mobile-hidden');
  deviceInfo.classList.remove('mobile-hidden');
};

const showPlayerMobile = () => {
  playerDOM.classList.remove('mobile-hidden');
};

const hidePlayerMobile = () => {
  playerDOM.classList.add('mobile-hidden');
};
