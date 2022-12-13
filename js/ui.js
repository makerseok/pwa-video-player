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
        const position = {
          width: ui.helper.width(),
          height: ui.helper.height(),
          top: Math.max(ui.offset.top, 0),
          left: Math.max(ui.offset.left, 0),
        };
        postPlayerUi(position).then(() => {
          updateDevicePositionUi(position);
        });
      },
    })
    .resizable({
      stop: function (event, ui) {
        const position = {
          ...ui.size,
          top: Math.max(ui.position.top, 0),
          left: Math.max(ui.position.left, 0),
        };
        postPlayerUi(position).then(() => {
          updateDevicePositionUi(position);
        });
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

const appendVideoList = videoList => {
  const parentNode = document.querySelector('#video-body');
  removeAllChildNodes(parentNode);

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
  removeAllChildNodes(parentNode);

  for (const prop in deviceConfig) {
    const tr = document.createElement('tr');
    const th = createElementWithInnerText('th', deviceConfigMapping[prop]);
    const td = createElementWithInnerText('td', deviceConfig[prop]);
    td.setAttribute('name', deviceConfigMapping[prop]);
    tr.appendChild(th);
    tr.appendChild(td);
    parentNode.appendChild(tr);
  }
};

const updateDevicePositionUi = position => {
  for (key in position) {
    document.querySelector(`td[name="${key}"]`).innerText = position[key];
  }
};
