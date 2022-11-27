const deviceConfigMapping = {
  device_name: '디바이스명',
  location: '장소',
  remark: 'Remark',
  top: 'top',
  left: 'left',
  height: 'height',
  width: 'width',
};

document.addEventListener('DOMContentLoaded', () => {
  // nav menu
  const menus = document.querySelectorAll('.side-menu');
  M.Sidenav.init(menus, { edge: 'right' });
});

const playerDOM = document.querySelector('#modal-player');

const observer = new ResizeObserver(entries => {
  for (let entry of entries) {
    const { width, height } = entry.contentRect;
    $('.video-js').width(width).height(height);
  }
});

observer.observe(playerDOM);

// popup 노출
const initPlayerUi = position => {
  const { width, height, ...offset } = position;

  $(playerDOM)
    .offset(offset)
    .width(width)
    .height(height)
    .draggable({
      cursor: 'crosshair',
      stop: function (event, ui) {
        position = {
          width: ui.helper.width(),
          height: ui.helper.height(),
          ...ui.offset,
        };
        postPlayerUi(player.deviceId, position);
      },
    })
    .resizable({
      stop: function (event, ui) {
        position = {
          ...ui.size,
          ...ui.position,
        };
        postPlayerUi(player.deviceId, position);
      },
    });
};
const createElementWithInnerText = (tag, text) => {
  const element = document.createElement(tag);
  element.innerText = text;

  return element;
};

const appendVideoList = videoList => {
  const parentNode = document.querySelector('#video-body');
  videoList.forEach(row => {
    const tr = document.createElement('tr');
    Object.values(row).forEach(value => {
      td = createElementWithInnerText('td', value);
      tr.appendChild(td);
    });
    parentNode.appendChild(tr);
  });
};

const setDeviceConfig = deviceConfig => {
  const parentNode = document.querySelector('#device-config');
  for (const prop in deviceConfig) {
    const tr = document.createElement('tr');
    th = createElementWithInnerText('th', deviceConfigMapping[prop]);
    td = createElementWithInnerText('td', deviceConfig[prop]);
    tr.appendChild(th);
    tr.appendChild(td);
    parentNode.appendChild(tr);
  }
};

const reportAll = async () => {
  reports = await db.reports.toArray();
  const result = await postReport(player.deviceId, reports);
  if (result?.status === 200) {
    console.log('reports posted!', reports);
    db.reports.clear();
  } else {
    console.log('report post failed!', result);
  }
};
