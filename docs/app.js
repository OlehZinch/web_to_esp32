let client = null;

const MQTT_TOPIC = "esp32/control";
const STORAGE_KEY = "esp32-cloud-control-settings";

const statusText = document.getElementById("status");
const connectModal = document.getElementById("connectModal");
const openConnectModalBtn = document.getElementById("openConnectModalBtn");
const closeConnectModalBtn = document.getElementById("closeConnectModalBtn");
const saveConnectBtn = document.getElementById("saveConnectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const loadVideoBtn = document.getElementById("loadVideoBtn");
const videoStream = document.getElementById("videoStream");
const videoPlaceholder = document.getElementById("videoPlaceholder");
const streamHint = document.getElementById("streamHint");

const brokerUrlInput = document.getElementById("brokerUrl");
const mqttUserInput = document.getElementById("mqttUser");
const mqttPassInput = document.getElementById("mqttPass");
const videoUrlInput = document.getElementById("videoUrl");
const commandButtons = document.querySelectorAll("[data-command]");

hydrateSettings();
bindEvents();
updateConnectionState("disconnected", "Disconnected");
updateVideoState(Boolean(videoUrlInput.value.trim()));

function bindEvents() {
  openConnectModalBtn.addEventListener("click", openModal);
  closeConnectModalBtn.addEventListener("click", closeModal);
  saveConnectBtn.addEventListener("click", connectMqtt);
  disconnectBtn.addEventListener("click", disconnectMqtt);
  loadVideoBtn.addEventListener("click", loadVideo);
  videoStream.addEventListener("load", () => updateVideoState(true));
  videoStream.addEventListener("error", () => {
    updateVideoState(false);
    alert("Unable to load video stream");
  });

  document.querySelectorAll("[data-close-modal='true']").forEach((element) => {
    element.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !connectModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  commandButtons.forEach((button) => {
    button.addEventListener("click", () => {
      sendCommand(button.dataset.command);
    });
  });
}

function openModal() {
  connectModal.classList.remove("hidden");
  connectModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  connectModal.classList.add("hidden");
  connectModal.setAttribute("aria-hidden", "true");
}

function hydrateSettings() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return;
  }

  try {
    const settings = JSON.parse(raw);
    brokerUrlInput.value = settings.brokerUrl || brokerUrlInput.value;
    mqttUserInput.value = settings.username || "";
    mqttPassInput.value = settings.password || "";
    videoUrlInput.value = settings.videoUrl || "";
  } catch (error) {
    console.warn("Failed to restore saved settings", error);
  }
}

function persistSettings() {
  const settings = {
    brokerUrl: brokerUrlInput.value.trim(),
    username: mqttUserInput.value.trim(),
    password: mqttPassInput.value,
    videoUrl: videoUrlInput.value.trim()
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function updateConnectionState(state, label) {
  statusText.textContent = label;
  statusText.className = `status-chip ${state}`;
}

function updateVideoState(isLoaded) {
  if (isLoaded && videoStream.src) {
    videoStream.style.display = "block";
    videoPlaceholder.style.display = "none";
    streamHint.textContent = "Video stream is ready.";
    return;
  }

  videoStream.style.display = "none";
  videoPlaceholder.style.display = "flex";
  streamHint.textContent = "Set a stream URL in cloud settings to load video.";
}

function connectMqtt() {
  const brokerUrl = brokerUrlInput.value.trim();
  const username = mqttUserInput.value.trim();
  const password = mqttPassInput.value.trim();

  if (!brokerUrl || !username || !password) {
    alert("Enter broker URL, username and password");
    return;
  }

  persistSettings();

  if (client) {
    client.end(true);
  }

  client = mqtt.connect(brokerUrl, {
    username,
    password,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 3000
  });

  updateConnectionState("connecting", "Connecting...");

  client.on("connect", () => {
    updateConnectionState("connected", "Connected");
    closeModal();
    loadVideo();
    console.log("MQTT connected");
  });

  client.on("error", (err) => {
    console.error("MQTT error:", err);
    updateConnectionState("disconnected", "Error");
  });

  client.on("close", () => {
    updateConnectionState("disconnected", "Disconnected");
  });
}

function disconnectMqtt() {
  if (client) {
    client.end(true);
    client = null;
  }

  updateConnectionState("disconnected", "Disconnected");
}

function sendCommand(command) {
  if (!client || !client.connected) {
    alert("MQTT is not connected");
    openModal();
    return;
  }

  const payload = JSON.stringify({
    command,
    time: Date.now()
  });

  client.publish(MQTT_TOPIC, payload);
  console.log("Sent:", payload);
}

function loadVideo() {
  const url = videoUrlInput.value.trim();

  persistSettings();

  if (!url) {
    updateVideoState(false);
    alert("Enter video stream URL in cloud settings");
    openModal();
    return;
  }

  videoStream.src = url;
}
