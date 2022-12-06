const host = 'cs.raiid.ai';
const port = 9001;

const eventMapping = {
  ead: getEads,
};

let mqtt = new Paho.MQTT.Client(host, port, 'demo');

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
  if (eventMapping.hasOwnProperty(event)) {
    console.log('event is', event);
    eventMapping[ead]();
  }
}

options = {
  useSSL: true,
  timeout: 3,
  onSuccess: onConnect,
  onFailure: onFailure,
  userName: 'spacebank',
  password: 'demo00',
};

mqtt.onMessageArrived = onMessageArrived;
// mqtt.onMessageDelivered = onMessageDelivered;

mqtt.connect(options);
