const BASE_URL =
  'https://g575dfbc1dbf538-cms.adb.ap-seoul-1.oraclecloudapps.com/ords/podo/v1/podo/';
// const COMPANY_ID = '5CAE46D0460AFC9035AFE9AE32CD146539EDF83B';
const DEVICE_URL = 'devices';
const POSITION_URL = 'devices/position';
const RADS_URL = 'rads';
const EADS_URL = 'eads';
const REPORT_URL = 'report';
const WEBSOCKET_URL = 'websocket';

const HS_API_KEY =
  '$2b$12$y4OZHQji3orEPdy2FtQJye:8f3bc93a-3b31-4323-b1a0-fd20584d9de4';

const getApiResponses = deviceId => {
  const headers = {
    auth: player.companyId,
    device_id: deviceId,
  };
  const endpoint = [BASE_URL + RADS_URL, BASE_URL + DEVICE_URL];
  Promise.all(endpoint.map(url => axios.get(url, { headers })))
    .then(([{ data: rad }, { data: device }]) => {
      const screen = rad.device_code;
      const { code, message, device_id, company_id, ...deviceInfo } = device;
      const { device_name, location, remark, ...pos } = deviceInfo;

      const playlist = rad.items.map(v => {
        return {
          sources: [{ src: v.VIDEO_URL, type: 'video/mp4' }],
          isHivestack: v.HIVESTACK_YN,
          runningTime: v.RUNNING_TIME,
          report: {
            COMPANY_ID: player.companyId,
            DEVICE_ID: deviceId,
            FILE_ID: v.FILE_ID,
            HIVESTACK_YN: v.HIVESTACK_YN,
            // HIVESTACK_URL: v.VIDEO_URL,
            PLAY_ON: null,
          },
        };
      });

      const videoList = rad.items.map((v, index) => {
        return {
          index: index + 1,
          runningTime: v.RUNNING_TIME,
          ad: v.D_FILE_NAME,
          type: v.TYP,
          start: new Date(v.START_DT).toLocaleDateString(),
          end: new Date(v.END_DT).toLocaleDateString(),
        };
      });

      appendVideoList(videoList);
      setDeviceConfig(deviceInfo);
      initPlayerUi(pos);
      initPlayerPlaylist(player, playlist, screen); // response.data.items[]
    })
    .catch(error => {
      console.log(error);
    });
};

const getUrlFromHS = async (screen, retry = 0) => {
  let hivestackInfo = {};

  const HS_URL = `https://uat.hivestack.com/nirvana/api/v1/units/schedulevast/${screen}?apikey=${HS_API_KEY}`;
  if (retry > 2) {
    hivestackInfo.success = false;
    return hivestackInfo;
  }
  const response = await axios.get(HS_URL);

  const $xml = $.parseXML(response.data);
  const media = $xml.getElementsByTagName('MediaFile').item(0);
  const report = $xml.getElementsByTagName('Impression').item(0);
  if (!media) {
    hivestackInfo = await getUrlFromHS(screen, retry + 1);
  } else if (media.getAttribute('type') !== 'video/mp4') {
    hivestackInfo = await getUrlFromHS(screen, retry + 1);
  } else {
    hivestackInfo.success = true;
    hivestackInfo.videoUrl = media.textContent.trim();
    hivestackInfo.reportUrl = report.textContent.trim();
  }

  return hivestackInfo;
};

const postPlayerUi = async (deviceId, position) => {
  const headers = {
    auth: player.companyId,
    device_id: deviceId,
  };

  axios
    .post(BASE_URL + POSITION_URL, position, { headers })
    .then(console.log('position posted!', position))
    .catch(error => console.log(error));
};

const postReport = async (deviceId, data) => {
  const headers = {
    auth: player.companyId,
    device_id: deviceId,
  };
  try {
    return await axios.post(BASE_URL + REPORT_URL, data, { headers });
  } catch (error) {
    return error;
  }
};

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

const getEads = async () => {
  try {
    const headers = {
      auth: player.companyId,
      device_id: player.deviceId,
    };
    const response = await axios.get(BASE_URL + EADS_URL, { headers });
    scheduleEads(response.data);
  } catch (error) {
    console.log('error on getEads', error);
  }
};

const scheduleEads = ead => {
  player.jobs.forEach(e => {
    e.stop();
  });
  player.jobs = [];

  ead.items.forEach(v => {
    const data = [
      {
        sources: [{ src: v.VIDEO_URL, type: 'video/mp4' }],
        isHivestack: v.HIVESTACK_YN,
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
