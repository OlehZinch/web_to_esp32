let client = null;

const statusText = document.getElementById("status");

const MQTT_TOPIC = "esp32/control";

document.getElementById("connectBtn").addEventListener("click", connectMqtt);

function connectMqtt() {
  const brokerUrl = document.getElementById("brokerUrl").value.trim();
  const username = document.getElementById("mqttUser").value.trim();
  const password = document.getElementById("mqttPass").value.trim();

  if (!brokerUrl || !username || !password) {
    alert("Enter broker URL, username and password");
    return;
  }

  client = mqtt.connect(brokerUrl, {
    username: username,
    password: password,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 3000,
  });

  statusText.textContent = "Connecting...";
  statusText.style.color = "#ffd166";

  client.on("connect", () => {
    statusText.textContent = "Connected";
    statusText.style.color = "#43ff7b";
    console.log("MQTT connected");
  });

  client.on("error", (err) => {
    console.error("MQTT error:", err);
    statusText.textContent = "Error";
    statusText.style.color = "#ff5f5f";
  });

  client.on("close", () => {
    statusText.textContent = "Disconnected";
    statusText.style.color = "#ff5f5f";
  });
}

function sendCommand(command) {
  if (!client || !client.connected) {
    alert("MQTT is not connected");
    return;
  }

  const payload = JSON.stringify({
    command: command,
    time: Date.now()
  });

  client.publish(MQTT_TOPIC, payload);
  console.log("Sent:", payload);
}

function loadVideo() {
  const url = document.getElementById("videoUrl").value.trim();

  if (!url) {
    alert("Enter video stream URL");
    return;
  }

  document.getElementById("videoStream").src = url;
}