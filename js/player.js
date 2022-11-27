const VIDEO_CACHE_NAME = 'site-video-v3';
const did = 1;

const deleteCachedVideo = async urls => {
  const cachedVideo = await caches.open(VIDEO_CACHE_NAME);
  const videoUrls = await cachedVideo.keys();

  videoUrls.forEach(async url => {
    if (!urls.includes(url)) {
      await cache.delete(url);
    }
  });
};

const fetchVideoAll = async urls => {
  const oldCachesCount = await db.caches
    .where('cachedOn')
    .above(getFormattedDate(new Date(new Date().toLocaleDateString())))
    .count();

  if (oldCachesCount === 0) {
    await deleteCachedVideo(urls);
    Promise.all(urls.map(url => axios.get(url))).then(async () => {
      const reportDB = await db.open();
      reportDB.caches.add({ cachedOn: getFormattedDate(new Date()) });
    });
  }
};

const addMinutes = (date, min) => {
  date.setMinutes(date.getMinutes() + min);

  return date;
};

const getFormattedDate = date => {
  const d = date.toLocaleString().split('. ').slice(0, 3).join('');
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
  const currentIndex = this.playlist.currentIndex();
  const nextIndex = this.playlist.nextIndex();
  const previousIndex = this.playlist.previousIndex();

  if (playlist[nextIndex].isHivestack === 'Y') {
    const hivestackInfo = await getUrlFromHS(this.screen);
    console.log('hivestackInfo', hivestackInfo);
    if (hivestackInfo.success) {
      playlist[nextIndex].sources[0].src = hivestackInfo.videoUrl;
      playlist[nextIndex].reportUrl = hivestackInfo.reportUrl;
      playlist[nextIndex].report.HIVESTACK_URL = hivestackInfo.videoUrl;
    }
  }
  if (playlist[previousIndex].isHivestack === 'Y') {
    playlist[previousIndex].sources[0].src = null;
    playlist[previousIndex].reportUrl = null;
    playlist[previousIndex].report.HIVESTACK_URL = null;
  }

  playlist[currentIndex].report.PLAY_ON = getFormattedDate(new Date());

  this.playlist(playlist, currentIndex);
});

player.on('ended', async function () {
  const playlist = this.playlist();
  const currentIndex = this.playlist.currentIndex();
  const nextIndex = this.playlist.nextIndex();
  const currentItem = playlist[currentIndex];

  if (playlist[nextIndex].sources[0].src) {
    player.playlist.next();
  } else {
    const distances = playlist.map((e, idx) => {
      return { distance: idx - currentIndex, idx: idx };
    });
    const sortedDistances = distances
      .filter(e => e.distance > 0)
      .concat(distances.filter(e => e.distance < 0));

    for (let i = 0; i < sortedDistances.length; i++) {
      if (playlist[sortedDistances[i].idx].sources[0].src) {
        player.playlist.currentItem(sortedDistances[i].idx);
        console.log('go to', sortedDistances[i].idx);
        break;
      }
    }
  }

  if (currentItem.reportUrl) {
    axios.get(currentItem.reportUrl);
  }
  let report = currentItem.report;

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
  player.primaryPlaylist = playlist;
  player.playlist(playlist);
  player.playlist.repeat(true);

  let [idx, sec] = getTargetInfo();
  console.log(idx, sec);
  player.playlist.currentItem(idx);
  player.currentTime(sec);
  player.play();

  urls = playlist.map(v => v.sources[0].src).filter(src => src);

  fetchVideoAll(urls);
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
