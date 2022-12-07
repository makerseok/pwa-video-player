const host = 'cs.raiid.ai';
const port = 9001;

let mqtt;

function onConnect() {
  console.log('connected!');
  let mainTopic = `/ad/${player.deviceId}/+`;
  mqtt.subscribe(mainTopic);
  console.log(mainTopic + ' subscribed!');
}

function onFailure() {
  console.log('Connection Failed!');
}

function onMessageArrived(res) {
  console.log('message arrived', res);
  const event = res.destinationName.replace(/\/ad\/[a-zA-Z0-9]*\//, '');
  const payload = JSON.parse(res.payloadString);
  const uuid = payload.UUID;
  const result = { event, uuid };
  console.log('event is', result);
  switch (event) {
    case 'ead':
      getEads().then(() => {
        postWebsocketResult(result);
      });
      break;

    default:
      break;
  }
}

const initWebsocket = () => {
  const options = {
    useSSL: true,
    timeout: 3,
    onSuccess: onConnect,
    onFailure: onFailure,
    userName: 'spacebank',
    password: 'demo00',
  };
  mqtt = new Paho.MQTT.Client(host, port, getFormattedDate(new Date()));

  mqtt.onMessageArrived = onMessageArrived;
  mqtt.connect(options);
};
