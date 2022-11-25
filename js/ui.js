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

const did = 1;

const playerDOM = document.querySelector('#modal-player');

const observer = new ResizeObserver(entries => {
  for (let entry of entries) {
    const { width, height } = entry.contentRect;
    $('.video-js').width(width).height(height);
    console.log('observer', width, height);
  }
});

observer.observe(playerDOM);

// popup 노출
const initPlayerUi = position => {
  const { width, height, ...offset } = position;
  console.log(position);
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

const addMinutes = (date, min) => {
  date.setMinutes(date.getMinutes() + min);

  return date;
};

const getFormattedDate = date => {
  const d = date.toISOString().split('T')[0].replaceAll('-', '');
  const time = date.toTimeString().split(' ')[0];

  return `${d} ${time}`;
};

let totalRT = [];

let player = videojs(document.querySelector('.video-js'), {
  inactivityTimeout: 0,
  autoplay: true,
});

player.ready(function () {
  console.log('player ready');
  this.deviceId = did;
  getApiResponses(this.deviceId);
  this.volume(0);
});

player.on('loadeddata', async function () {
  const playlist = this.playlist();
  const currentIdx = this.playlist.currentIndex();
  const targetIdx = (currentIdx + 1) % playlist.length;

  if (playlist[targetIdx].isHivestack === 'Y') {
    const hivestackInfo = await getUrlFromHS(this.screen);
    if (hivestackInfo.success) {
      playlist[targetIdx].sources[0].src = hivestackInfo.videoUrl;
      playlist[targetIdx].reportUrl = hivestackInfo.reportUrl;
      playlist[targetIdx].report.HIVESTACK_URL = hivestackInfo.videoUrl;
    } else {
      playlist.splice(targetIdx, 1);
    }
  }

  this.playlist(playlist, currentIdx);
});

player.on('ended', async function () {
  const playlist = this.playlist();
  const currentIdx = this.playlist.currentIndex();

  if (playlist[currentIdx].reportUrl) {
    axios.get(playlist[currentIdx].reportUrl);
  }
  let report = playlist[currentIdx].report;

  report.PLAY_ON = getFormattedDate(new Date());

  // const currentTenUnitMinute = Math.floor(new Date().getMinutes() / 10) * 10;

  const reportDB = await db.open();
  reportDB.reports.add(report);

  const oldDataCount = await db.reports
    .where('PLAY_ON')
    .below(getFormattedDate(addMinutes(new Date(), -10)))
    .count();

  if (oldDataCount > 0) {
    reportAll();
  }
});

const initPlayerPlaylist = (player, playlist, screen) => {
  console.log('initPlayerPlaylist');
  totalRT = playlist.map(v => {
    return parseInt(v.runningTime) * 1000;
  });
  player.screen = screen;
  player.playlist(playlist);
  player.playlist.repeat(true);
  player.playlist.autoadvance(0);

  let [idx, sec] = getTargetInfo();
  console.log(idx, sec);
  player.playlist.currentItem(idx);
  player.currentTime(sec);
  player.play();
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
  postReport(player.deviceId, reports);
  db.reports.clear();
};

function getTargetInfo() {
  let _refTimestamp =
    new Date(new Date().toDateString()).getTime() + 6 * 60 * 60 * 1000; // 06시 시작 기준
  let curTimestamp = new Date().getTime();
  let refTimestamp =
    _refTimestamp > curTimestamp
      ? _refTimestamp - 24 * 60 * 60 * 1000
      : _refTimestamp;

  let totalTimestamp = totalRT.reduce((acc, cur, idx) => (acc += cur), 0);
  let targetTimestamp = (curTimestamp - refTimestamp) % totalTimestamp;

  for (let i = 0; i < totalRT.length; i++) {
    console.log([i, targetTimestamp / 1000]);
    if (targetTimestamp < totalRT[i]) {
      return [i, targetTimestamp / 1000];
    } else {
      targetTimestamp -= totalRT[i];
    }
  }
  return [0, 0];
}
