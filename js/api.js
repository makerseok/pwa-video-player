const BASE_URL =
  'https://g575dfbc1dbf538-cms.adb.ap-seoul-1.oraclecloudapps.com/ords/podo/v1/podo/';
const DEVICE_URL = 'devices';
const POSITION_URL = 'devices/position';
const POSITION_LOCKED_URL = 'devices/position/locked';
const RADS_URL = 'rads';
const EADS_URL = 'eads';
const REPORT_URL = 'report';
const WEBSOCKET_URL = 'websocket';

const HS_API_KEY =
  '$2b$12$y4OZHQji3orEPdy2FtQJye:8f3bc93a-3b31-4323-b1a0-fd20584d9de4';

/* 폴리필 코드 */
if (!Promise.allSettled) {
  Promise.allSettled = function (promises) {
    return Promise.all(
      promises.map(p =>
        Promise.resolve(p).then(
          value => ({
            status: 'fulfilled',
            value,
          }),
          reason => ({
            status: 'rejected',
            reason,
          }),
        ),
      ),
    );
  };
}

/**
 * 일반재생목록과 device 정보를 api로 받아온 뒤 ui 및 player를 초기화
 *
 * @param { boolean } [sudo=false] true일 시 cached 여부에 상관없이 캐싱되지 않은 비디오 fetch
 */
const getApiResponses = async (sudo = false) => {
  const headers = {
    auth: player.companyId,
    device_id: player.deviceId,
  };
  const endpoint = [BASE_URL + RADS_URL, BASE_URL + DEVICE_URL];
  await Promise.all(endpoint.map(url => axios.get(url, { headers })))
    .then(([{ data: rad }, { data: device }]) => {
      initPlayer(rad, device, sudo); // response.data.items[]
    })
    .catch(error => {
      console.log(error);
    });
};

/**
 * hivestack url에 광고 정보를 요청
 * retry 횟수 내에서 성공할 때까지 재귀적으로 실행
 * 실패시 { success: false } 반환
 *
 * @param {string} hivestackUrl 요청 대상 url
 * @param {number} [retry=0] 현재 재시도 횟수
 * @return { Promise<{ Object }> } hivestack 광고 정보
 */
const getUrlFromHS = async (hivestackUrl, retry = 0) => {
  let hivestackInfo = {};

  const HS_URL = hivestackUrl;
  if (retry > 2) {
    hivestackInfo.success = false;
    return hivestackInfo;
  }
  const response = await axios.get(HS_URL);

  const $xml = $.parseXML(response.data);
  const media = $xml.getElementsByTagName('MediaFile').item(0);
  const report = $xml.getElementsByTagName('Impression').item(0);
  if (!media) {
    hivestackInfo = await getUrlFromHS(hivestackUrl, retry + 1);
  } else if (media.getAttribute('type') !== 'video/mp4') {
    hivestackInfo = await getUrlFromHS(hivestackUrl, retry + 1);
  } else {
    hivestackInfo.success = true;
    hivestackInfo.videoUrl = media.textContent.trim();
    hivestackInfo.reportUrl = report.textContent.trim();
  }

  return hivestackInfo;
};

/**
 * 서버에서 device의 player 위치 정보를 받아 ui를 갱신
 */
const getPlayerUi = async () => {
  const headers = {
    auth: player.companyId,
    device_id: player.deviceId,
  };

  const response = await axios.get(BASE_URL + DEVICE_URL, { headers });
  const position = {
    top: response.data.top,
    left: response.data.left,
    width: response.data.width,
    height: response.data.height,
  };
  initPlayerUi(position);
};

/**
 * 파라미터로 받은 player 위치, 크기 정보를 서버로 전송
 *
 * @param { Object } position player 위치 정보
 */
const postPlayerUi = async position => {
  const headers = {
    auth: player.companyId,
    device_id: player.deviceId,
  };

  axios
    .post(BASE_URL + POSITION_URL, position, { headers })
    .then(console.log('position posted!', position))
    .catch(error => console.log(error));
};

/**
 * 비디오 실행 결과를 서버로 post
 *
 * @param { Object[] } data 비디오 실행 결과
 * @return { any | Error } axios response 또는 Error
 */
const postReport = async data => {
  const headers = {
    auth: player.companyId,
    device_id: player.deviceId,
  };
  try {
    return await axios.post(BASE_URL + REPORT_URL, data, { headers });
  } catch (error) {
    return error;
  }
};

/**
 * 웹소켓 message에 대한 응답을 post
 *
 * @param {{ event:string, uuid:string }} data 이벤트, UUII 정보
 */
const postWebsocketResult = async data => {
  const headers = {
    auth: player.companyId,
    device_id: player.deviceId,
  };
  try {
    await axios.post(BASE_URL + WEBSOCKET_URL, data, { headers });
  } catch (error) {
    console.log('error on postWebsocketResult', error);
  }
};

/**
 * 긴급재생목록을 받아온 뒤 cron으로 schedule
 */
const getEads = async () => {
  const headers = {
    auth: player.companyId,
    device_id: player.deviceId,
  };
  const response = await axios.get(BASE_URL + EADS_URL, { headers });
  scheduleEads(response.data);
};

/**
 * 긴급재생목록 schedule 함수
 *
 * @param {{ code: string, message:string, items: Object[] }} eadData 서버에서 api를 통해 전달받은 긴급재생목록 정보
 */
const scheduleEads = eadData => {
  player.jobs.forEach(e => {
    e.stop();
  });
  player.jobs = [];

  eadData.items.forEach(v => {
    const data = [
      {
        sources: [{ src: v.VIDEO_URL, type: 'video/mp4' }],
        isHivestack: v.HIVESTACK_YN,
        hivestackUrl: v.API_URL,
        runningTime: v.RUNNING_TIME,
        periodYn: v.PERIOD_YN,
        report: {
          COMPANY_ID: player.companyId,
          DEVICE_ID: player.deviceId,
          FILE_ID: v.FILE_ID,
          HIVESTACK_YN: v.HIVESTACK_YN,
          PLAY_ON: null,
        },
      },
    ];
    console.log('schedule ead', v);
    scheduleVideo(v.START_DT, data)
      .then(isScheduled => {
        if (isScheduled && v.PERIOD_YN === 'Y') {
          scheduleVideo(v.END_DT, player.primaryPlaylist, true);
        }
      })
      .catch(error => {
        console.log('error on scheduleEads', error);
      });
  });
};

/**
 * 일반재생목록과 플레이어 정보를 받아 UI 및 player를 초기화
 *
 * @param { Object[] } rad 서버에서 api를 통해 전달받은 일반재생목록 정보
 * @param { Object } device 서버에서 api를 통해 전달받은 플레이어 정보
 * @param { boolean } [sudo=false] true일 시 cached 여부에 상관없이 캐싱되지 않은 비디오 fetch
 */
function initPlayer(rad, device, sudo = false) {
  const screen = rad.device_code;
  const { code, message, device_id, company_id, ...deviceInfo } = device;
  const {
    device_name,
    location,
    remark,
    on,
    off,
    top,
    left,
    width,
    height,
    locked,
    ...rest
  } = deviceInfo;
  player.locked = locked === 'Y' ? true : false;
  const pos = { top, left, width, height };
  player.position = pos;
  const onDate = sethhMMss(new Date(), on);
  const offDate = sethhMMss(new Date(), off);

  player.runon = Math.floor(onDate.getTime() / 1000);
  player.runoff =
    offDate > onDate
      ? Math.floor(offDate.getTime() / 1000)
      : Math.floor(addMinutes(offDate, 1440).getTime() / 1000);

  player.defaultJobs.forEach(e => {
    e.stop();
  });
  const runon = Cron(hhMMssToCron(on), () => {
    console.log('cron info - play on', hhMMssToCron(on));
    player.playlist.currentItem(0);
    player.play();
  });
  player.defaultJobs.push(runon);
  const runoff = Cron(hhMMssToCron(off), () => {
    console.log('cron info - play off', hhMMssToCron(off));
    player.pause();
  });
  player.defaultJobs.push(runoff);

  const playlist = itemsToPlaylist(rad);
  player.videoList = itemsToVideoList(rad);

  const urls = playlist.map(v => v.sources[0].src).filter(src => src);
  const deduplicatedUrls = [...new Set(urls)];

  fetchVideoAll(deduplicatedUrls, sudo).then(() => {
    console.log('finish fetching');
    renderVideoList(player.videoList);
    setDeviceConfig(deviceInfo);
    initPlayerUi(pos);
    initPlayerPlaylist(playlist, screen);
    if (!mqtt) {
      initWebsocket();
    }
  });
}

/**
 * 일반재생목록 정보를 UI에 표시하기 위해 정제
 *
 * @param { code: string, message:string, items: Object[] } radList 서버에서 api를 통해 전달받은 일반재생목록 정보
 * @return { Object[] } 정제된 Array
 */
function itemsToVideoList(radList) {
  return radList.items.map((v, index) => {
    return {
      index: index + 1,
      runningTime: v.RUNNING_TIME,
      ad: v.D_FILE_NAME,
      type: v.TYP,
      start: new Date(v.START_DT).toLocaleDateString(),
      end: new Date(v.END_DT).toLocaleDateString(),
    };
  });
}

/**
 * 일반재생목록 정보를 playlist로 사용하기 위해 정제
 *
 * @param { code: string, message:string, items: Object[] } radData 서버에서 api를 통해 전달받은 일반재생목록 정보
 * @return { Object[] } 정제된 Array
 */
function itemsToPlaylist(radData) {
  return radData.items.map(v => {
    return {
      sources: [{ src: v.VIDEO_URL, type: 'video/mp4' }],
      isHivestack: v.HIVESTACK_YN,
      hivestackUrl: v.API_URL,
      runningTime: v.RUNNING_TIME,
      report: {
        COMPANY_ID: player.companyId,
        DEVICE_ID: player.deviceId,
        FILE_ID: v.FILE_ID,
        HIVESTACK_YN: v.HIVESTACK_YN,
        // HIVESTACK_URL: v.VIDEO_URL,
        PLAY_ON: null,
      },
    };
  });
}

/**
 * 위치 및 크기 조정 가능 여부를 서버에 전송
 *
 * @param { boolean } locked 위치 및 크기 잠금 여부
 * @return { any } axios response
 */
const postPositionLocked = locked => {
  const headers = {
    auth: player.companyId,
    device_id: player.deviceId,
  };
  const data = { locked: locked ? 'Y' : 'N' };
  return axios.post(BASE_URL + POSITION_LOCKED_URL, data, { headers });
};
