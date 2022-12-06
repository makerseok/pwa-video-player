const VIDEO_CACHE_NAME = 'site-video-v4';
const did = 1;

const setDeviceId = async deviceId => {
  const headers = {
    auth: COMPANY_ID,
    device_id: deviceId,
  };

  try {
    const response = await axios.get(BASE_URL + DEVICE_URL, { headers });
    if (response.status === 200) {
      console.log(response);
      await db.deviceIds.clear();
      await db.deviceIds.add({ deviceId: response.data.device_id });

      document.querySelector('#device-id').classList.remove('invalid');
      getApiResponses(response.data.device_id);
    }
  } catch (error) {
    document.querySelector('#device-id').classList.add('invalid');
  }
};

const deleteCachedVideo = async urls => {
  const cachedVideo = await caches.open(VIDEO_CACHE_NAME);
  const videoUrls = await cachedVideo.keys();

  videoUrls.forEach(async url => {
    // if (!urls.includes(url)) {
    await cachedVideo.delete(url);
    // }
  });
};

const fetchVideoAll = async urls => {
  const oldCachesCount = await db.caches
    .where('cachedOn')
    .above(getFormattedDate(new Date(new Date().toLocaleDateString())))
    .count();

  if (oldCachesCount === 0) {
    await deleteCachedVideo(urls);
    Promise.all(urls.map(url => axios.get(url))).finally(async () => {
      const reportDB = await db.open();
      await reportDB.caches.add({ cachedOn: getFormattedDate(new Date()) });
    });
  }
};

const addMinutes = (date, min) => {
  date.setMinutes(date.getMinutes() + min);

  return date;
};

const gethhMMss = date => {
  return date.toTimeString().split(' ')[0];
};

const getFormattedDate = date => {
  const yymmdd =
    date.getFullYear().toString() +
    (date.getMonth() + 1 < 9
      ? '0' + (date.getMonth() + 1)
      : date.getMonth() + 1
    ).toString() +
    (date.getDate() < 9 ? '0' + date.getDate() : date.getDate()).toString();
  const time = gethhMMss(date);

  return `${yymmdd} ${time}`;
};

const addHyphen = dateString => {
  const addedDateString = dateString.replace(
    /(\d{4})(\d{2})(\d{2})/g,
    '$1-$2-$3',
  );
  return addedDateString;
};

let totalRT = [];

let player = videojs(document.querySelector('.video-js'), {
  inactivityTimeout: 0,
  autoplay: true,
  enableSourceset: true,
});

player.ready(async function () {
  console.log('player ready');

  const deviceIds = await db.deviceIds.toArray();
  if (deviceIds.length) {
    const deviceId = deviceIds[deviceIds.length - 1].deviceId;

    this.deviceId = deviceId;
    getApiResponses(this.deviceId);
  } else {
    console.log('device id is not defined');
  }

  this.jobs = [];
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

let isFetched = false;

player.on('progress', function () {
  if (this.bufferedPercent() === 1 && !isFetched) {
    const urls = this.playlist()
      .map(v => v.sources[0].src)
      .filter(src => src);

    const deduplicatedUrls = [...new Set(urls)];

    fetchVideoAll(deduplicatedUrls);
    isFetched = true;
  }
});

player.on('ended', async function () {
  const playlist = this.playlist();
  const currentIndex = this.playlist.currentIndex();
  const nextIndex = this.playlist.nextIndex();
  const currentItem = playlist[currentIndex];

  if (playlist[currentIndex].periodYn === 'N') {
    player.playlist(player.primaryPlaylist, 0);
  } else if (playlist[nextIndex].sources[0].src) {
    if (currentIndex === nextIndex) {
      player.play();
    }
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

  addReport(currentItem);
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
  player.playlist.currentItem(idx);
  player.currentTime(sec);
  player.play();
};

async function addReport(currentItem) {
  if (currentItem.reportUrl) {
    axios.get(currentItem.reportUrl);
  }
  let report = currentItem.report;

  console.log('report', report);
  const reportDB = await db.open();
  if (report.PLAY_ON) {
    reportDB.reports.add(report);
  }

  const oldDataCount = await db.reports
    .where('PLAY_ON')
    .below(getFormattedDate(addMinutes(new Date(), -5)))
    .count();

  if (oldDataCount > 0) {
    reportAll();
  }
}

const reportAll = async () => {
  reports = await db.reports.toArray();
  const result = await postReport(player.deviceId, reports);
  if (result.status === 200) {
    console.log('reports posted!', reports);
    M.toast({ html: 'reports posted!' });
    db.reports.clear();
  } else {
    console.log('report post failed!', result);
  }
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
    if (targetTimestamp < totalRT[i]) {
      return [i, targetTimestamp / 1000];
    } else {
      targetTimestamp -= totalRT[i];
    }
  }
  return [0, 0];
}

function cronVideo(date, playlist) {
  // const cronHour = date.getHours();
  // const cronMinute = date.getMinutes();
  // const cronSecond = date.getSeconds();
  const job = Cron(
    // `${cronSecond} ${cronMinute} ${cronHour} * * *`,
    date,
    { maxRuns: 1, context: playlist },
    (_self, context) => {
      console.log('cron context', context);
      player.playlist(context, 0);
    },
  );
  player.jobs.push(job);
  console.log('scheduled on', date);
}

const scheduleVideo = async (startDate, playlist, isPrimary = false) => {
  const hyphenStartDate = new Date(addHyphen(startDate));
  if (isPrimary) {
    cronVideo(hyphenStartDate, playlist);
  } else {
    const urls = playlist.map(v => v.sources[0].src).filter(src => src);

    const deduplicatedUrls = [...new Set(urls)];
    Promise.all(
      deduplicatedUrls.map(url => axios.get(url, { mode: 'no-cors' })),
    )
      .catch(error => {
        console.log('error!');
      })
      .finally(() => {
        cronVideo(hyphenStartDate, playlist);
      });
  }
};
