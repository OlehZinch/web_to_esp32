// Copy to docs/config.js and set real values.
// WARNING: If this page is public (e.g. GitHub Pages), MQTT credentials are visible in browser devtools.
window.PROJECTX_WEB_CONFIG = {
  mqtt: {
    protocol: "wss",
    host: "YOUR_CLUSTER.s1.eu.hivemq.cloud",
    port: 8884,
    path: "/mqtt",
    username: "YOUR_MQTT_USERNAME",
    password: "YOUR_MQTT_PASSWORD",
    clientIdPrefix: "projectx-web-"
  },
  topics: {
    cmd: "projectx/device001/cmd",
    status: "projectx/device001/status",
    telemetry: "projectx/device001/telemetry"
  }
};
