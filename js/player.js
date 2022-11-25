const videoCacheName = 'site-video-v16';
const did = 1;

const cacheVideo = async url => {
  const cache = await caches.open(videoCacheName);
  fetch(url).then(response => {
    cache.put(url, response);
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
  enableSourceset: true,
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
    console.log('hivestackInfo', hivestackInfo);
    if (hivestackInfo.success) {
      playlist[targetIdx].sources[0].src = hivestackInfo.videoUrl;
      playlist[targetIdx].reportUrl = hivestackInfo.reportUrl;
      playlist[targetIdx].report.HIVESTACK_URL = hivestackInfo.videoUrl;
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

  let [idx, sec] = getTargetInfo();
  console.log(idx, sec);
  player.playlist.currentItem(idx);
  player.currentTime(sec);
  player.play();
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
