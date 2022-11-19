const BASE_URL =
  'https://g575dfbc1dbf538-cms.adb.ap-seoul-1.oraclecloudapps.com/ords/podo/v1/podo/';
const RADS_URL = 'rads';
const EADS_URL = 'eads';

const getRADList = deviceID => {
  headers = {
    auth: '5CAE46D0460AFC9035AFE9AE32CD146539EDF83B',
    device_id: deviceID,
  };
  axios
    .get(BASE_URL + RADS_URL, {
      headers,
    })
    .then(response => {
      videoList = response.data.items.map(v => {
        return { sources: [{ src: v.VIDEO_URL, type: 'video/mp4' }] };
      });
      initPlayerPlaylist(player, videoList); // response.data.items[]
    })
    .catch(error => {
      console.log(error);
    });
};
