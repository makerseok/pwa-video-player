const BASE_URL =
  'https://g575dfbc1dbf538-cms.adb.ap-seoul-1.oraclecloudapps.com/ords/podo/v1/podo/';
const COMPANY_ID = '5CAE46D0460AFC9035AFE9AE32CD146539EDF83B';
const POSITION_URL = 'devices/position';
const RADS_URL = 'rads';
const EADS_URL = 'eads';

const HS_API_KEY =
  '$2b$12$y4OZHQji3orEPdy2FtQJye:8f3bc93a-3b31-4323-b1a0-fd20584d9de4';

const getApiResponses = deviceId => {
  headers = {
    auth: COMPANY_ID,
    device_id: deviceId,
  };
  endpoint = [BASE_URL + RADS_URL, BASE_URL + POSITION_URL];
  Promise.all(endpoint.map(url => axios.get(url, { headers })))
    .then(([{ data: rad }, { data: position }]) => {
      const screen = rad.device_code;
      const { code, message, device_id, ...pos } = position;

      videoList = rad.items.map(v => {
        return {
          sources: [{ src: v.VIDEO_URL, type: 'video/mp4' }],
          isHivestack: v.HIVESTACK_YN,
          runningTime: v.RUNNING_TIME,
        };
      });
      player.deviceId = deviceId;
      console.log('pos', pos);
      initPlayerUi(pos);
      initPlayerPlaylist(player, videoList, screen); // response.data.items[]
    })
    .catch(error => {
      console.log(error);
    });
};

const getUrlFromHS = async (screen, retry = 0) => {
  let result = {};

  const HS_URL = `https://uat.hivestack.com/nirvana/api/v1/units/schedulevast/${screen}?apikey=${HS_API_KEY}`;
  if (retry > 9) {
    result.success = false;
    return result;
  }
  const response = await axios.get(HS_URL);

  const $xml = $.parseXML(response.data);
  const media = $xml.getElementsByTagName('MediaFile').item(0);
  const report = $xml.getElementsByTagName('Impression').item(0);
  if (!media) {
    result = await getUrlFromHS(screen, retry + 1);
  } else if (media.getAttribute('type') !== 'video/mp4') {
    result = await getUrlFromHS(screen, retry + 1);
  } else {
    result.success = true;
    result.videoUrl = media.textContent.trim();
    result.reportUrl = report.textContent.trim();
  }
  console.log(result);
  return result;
};

const postPlayerUi = (deviceId, position) => {
  headers = {
    auth: COMPANY_ID,
    device_id: deviceId,
  };

  axios
    .post(BASE_URL + POSITION_URL, position, { headers })
    .then(console.log('position posted!', position));
};
