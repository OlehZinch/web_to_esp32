// Copy to docs/config.js and set real values.
// WARNING: If this page is public (e.g. GitHub Pages), MQTT credentials are visible in browser devtools.
window.PROJECTX_WEB_CONFIG = {
  mqtt: {
    protocol: "wss",
    host: "b760ab07919a47a287cb0d3136ec388f.s1.eu.hivemq.cloud",
    port: 8884,
    path: "/mqtt",
    username: "",
    password: "",
    clientIdPrefix: "projectx-web-"
  },
  topics: {
    cmd: "projectx/device001/cmd",
    status: "projectx/device001/status",
    telemetry: "projectx/device001/telemetry"
  },
  stream: {
    url: "http://134.98.129.171:8000/stream",
    alt: "XIAO cloud stream"
  }
};
