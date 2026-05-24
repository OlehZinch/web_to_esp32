let client = null;

const STORAGE_KEY = "projectx-command-console-settings";
const SEQ_KEY = "projectx-command-console-seq";

const statusText = document.getElementById("status");
const lastCmdLabel = document.getElementById("lastCmdLabel");
const lastRespLabel = document.getElementById("lastRespLabel");

const connectModal = document.getElementById("connectModal");
const openConnectModalBtn = document.getElementById("openConnectModalBtn");
const closeConnectModalBtn = document.getElementById("closeConnectModalBtn");
const saveConnectBtn = document.getElementById("saveConnectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");

const brokerUrlInput = document.getElementById("brokerUrl");
const mqttUserInput = document.getElementById("mqttUser");
const mqttPassInput = document.getElementById("mqttPass");
const commandTopicInput = document.getElementById("mqttCommandTopic");
const responseTopicInput = document.getElementById("mqttResponseTopic");
const videoUrlInput = document.getElementById("videoUrl");
const vehicleIdInput = document.getElementById("vehicleId");
const sourceIdInput = document.getElementById("sourceId");
const targetIdInput = document.getElementById("targetId");

const videoStream = document.getElementById("videoStream");
const videoPlaceholder = document.getElementById("videoPlaceholder");
const streamHint = document.getElementById("streamHint");
const loadVideoBtn = document.getElementById("loadVideoBtn");

const armBtn = document.getElementById("armBtn");
const disarmBtn = document.getElementById("disarmBtn");
const estopBtn = document.getElementById("estopBtn");
const clearEstopBtn = document.getElementById("clearEstopBtn");

const servoIdInput = document.getElementById("servoIdInput");
const servoAngleInput = document.getElementById("servoAngleInput");
const servoApplyBtn = document.getElementById("servoApplyBtn");
const servoLeftBtn = document.getElementById("servoLeftBtn");
const servoCenterBtn = document.getElementById("servoCenterBtn");
const servoRightBtn = document.getElementById("servoRightBtn");

const stepperIdInput = document.getElementById("stepperIdInput");
const stepperStepsInput = document.getElementById("stepperStepsInput");
const stepperSpeedInput = document.getElementById("stepperSpeedInput");
const stepperLeftBtn = document.getElementById("stepperLeftBtn");
const stepperStopBtn = document.getElementById("stepperStopBtn");
const stepperRightBtn = document.getElementById("stepperRightBtn");

const ledIdInput = document.getElementById("ledIdInput");
const ledOnBtn = document.getElementById("ledOnBtn");
const ledOffBtn = document.getElementById("ledOffBtn");

const sysPingBtn = document.getElementById("sysPingBtn");
const sysStatusBtn = document.getElementById("sysStatusBtn");
const telemBtn = document.getElementById("telemBtn");

const panelTabs = document.querySelectorAll("[data-panel-tab]");
const controlPanels = document.querySelectorAll(".control-panel");

hydrateSettings();
bindEvents();
setActivePanel("streamPanel");
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

  panelTabs.forEach((button) => {
    button.addEventListener("click", () => {
      setActivePanel(button.dataset.panelTab);
    });
  });

  armBtn.addEventListener("click", () => sendProtocolCommand("SAFETY_ARM", { arm: true }));
  disarmBtn.addEventListener("click", () => sendProtocolCommand("SAFETY_DISARM", {}));
  estopBtn.addEventListener("click", () => {
    sendProtocolCommand(
      "SAFETY_ESTOP",
      { reason: "operator_pressed_estop" },
      { target: "all" }
    );
  });
  clearEstopBtn.addEventListener("click", () => {
    sendProtocolCommand("SAFETY_CLEAR_ESTOP", { confirm: true });
  });

  servoApplyBtn.addEventListener("click", () => sendServoAngle());
  servoLeftBtn.addEventListener("click", () => sendServoAngle(0));
  servoCenterBtn.addEventListener("click", () => sendServoAngle(90));
  servoRightBtn.addEventListener("click", () => sendServoAngle(180));

  stepperLeftBtn.addEventListener("click", () => sendStepperMove("ccw"));
  stepperRightBtn.addEventListener("click", () => sendStepperMove("cw"));
  stepperStopBtn.addEventListener("click", () => sendStepperStop());

  ledOnBtn.addEventListener("click", () => sendLedState(true));
  ledOffBtn.addEventListener("click", () => sendLedState(false));

  sysPingBtn.addEventListener("click", () => sendProtocolCommand("SYS_PING", {}));
  sysStatusBtn.addEventListener("click", () => sendProtocolCommand("SYS_GET_STATUS", {}));
  telemBtn.addEventListener("click", () => sendProtocolCommand("TELEM_GET_STATUS", {}));

  [
    brokerUrlInput,
    mqttUserInput,
    mqttPassInput,
    commandTopicInput,
    responseTopicInput,
    videoUrlInput,
    vehicleIdInput,
    sourceIdInput,
    targetIdInput,
    servoIdInput,
    servoAngleInput,
    stepperIdInput,
    stepperStepsInput,
    stepperSpeedInput,
    ledIdInput
  ].forEach((input) => {
    input.addEventListener("change", persistSettings);
  });
}

function setActivePanel(panelId) {
  panelTabs.forEach((button) => {
    button.classList.toggle("active", button.dataset.panelTab === panelId);
  });

  controlPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === panelId);
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
    commandTopicInput.value = settings.commandTopic || commandTopicInput.value;
    responseTopicInput.value = settings.responseTopic || responseTopicInput.value;
    videoUrlInput.value = settings.videoUrl || "";
    vehicleIdInput.value = settings.vehicleId || vehicleIdInput.value;
    sourceIdInput.value = settings.sourceId || sourceIdInput.value;
    targetIdInput.value = settings.targetId || targetIdInput.value;
    servoIdInput.value = settings.servoId || servoIdInput.value;
    servoAngleInput.value = settings.servoAngle || servoAngleInput.value;
    stepperIdInput.value = settings.stepperId || stepperIdInput.value;
    stepperStepsInput.value = settings.stepperSteps || stepperStepsInput.value;
    stepperSpeedInput.value = settings.stepperSpeed || stepperSpeedInput.value;
    ledIdInput.value = settings.ledId || ledIdInput.value;
  } catch (error) {
    console.warn("Failed to restore saved settings", error);
  }
}

function persistSettings() {
  const settings = {
    brokerUrl: brokerUrlInput.value.trim(),
    username: mqttUserInput.value.trim(),
    password: mqttPassInput.value,
    commandTopic: commandTopicInput.value.trim(),
    responseTopic: responseTopicInput.value.trim(),
    videoUrl: videoUrlInput.value.trim(),
    vehicleId: vehicleIdInput.value.trim(),
    sourceId: sourceIdInput.value.trim(),
    targetId: targetIdInput.value.trim(),
    servoId: servoIdInput.value.trim(),
    servoAngle: servoAngleInput.value.trim(),
    stepperId: stepperIdInput.value.trim(),
    stepperSteps: stepperStepsInput.value.trim(),
    stepperSpeed: stepperSpeedInput.value.trim(),
    ledId: ledIdInput.value.trim()
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function getNextSeq() {
  let seq = Number(localStorage.getItem(SEQ_KEY) || "1");

  if (!Number.isInteger(seq) || seq < 1) {
    seq = 1;
  }

  localStorage.setItem(SEQ_KEY, String(seq + 1));
  return seq;
}

function updateConnectionState(state, label) {
  statusText.textContent = label;
  statusText.className = `status-chip ${state}`;
}

function updateVideoState(isLoaded) {
  if (isLoaded && videoStream.src) {
    videoStream.style.display = "block";
    videoPlaceholder.style.display = "none";
    streamHint.textContent = "Stream ready.";
    return;
  }

  videoStream.style.display = "none";
  videoPlaceholder.style.display = "flex";
  streamHint.textContent = "Set stream URL in Cloud settings.";
}

function connectMqtt() {
  const brokerUrl = brokerUrlInput.value.trim();
  const username = mqttUserInput.value.trim();
  const password = mqttPassInput.value;

  if (!brokerUrl) {
    alert("Enter broker URL");
    return;
  }

  persistSettings();

  if (client) {
    client.end(true);
  }

  const mqttOptions = {
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 3000
  };

  if (username) {
    mqttOptions.username = username;
  }

  if (password) {
    mqttOptions.password = password;
  }

  client = mqtt.connect(brokerUrl, mqttOptions);
  updateConnectionState("connecting", "Connecting");

  client.on("connect", () => {
    updateConnectionState("connected", "Connected");
    subscribeToResponses();
    closeModal();
    loadVideo();
  });

  client.on("reconnect", () => {
    updateConnectionState("connecting", "Reconnecting");
  });

  client.on("message", (topic, payload) => {
    handleIncomingMessage(topic, payload);
  });

  client.on("error", (error) => {
    console.error("MQTT error:", error);
    updateConnectionState("disconnected", "Error");
  });

  client.on("close", () => {
    updateConnectionState("disconnected", "Disconnected");
  });
}

function subscribeToResponses() {
  const topic = responseTopicInput.value.trim();

  if (!client || !client.connected || !topic) {
    return;
  }

  client.subscribe(topic, { qos: 1 }, (error) => {
    if (error) {
      console.warn("Unable to subscribe to response topic", error);
      lastRespLabel.textContent = "response subscribe error";
    }
  });
}

function disconnectMqtt() {
  if (client) {
    client.end(true);
    client = null;
  }

  updateConnectionState("disconnected", "Disconnected");
}

function sendProtocolCommand(cmd, params, options = {}) {
  if (!client || !client.connected) {
    alert("MQTT is not connected");
    openModal();
    return;
  }

  const topic = commandTopicInput.value.trim();
  if (!topic) {
    alert("Enter command topic in Cloud settings");
    openModal();
    return;
  }

  const payload = {
    version: 1,
    vehicle_id: vehicleIdInput.value.trim() || "px_mvp_01",
    source: sourceIdInput.value.trim() || "web",
    target: options.target || targetIdInput.value.trim() || "esp32_1",
    seq: getNextSeq(),
    cmd,
    params,
    timestamp: Math.floor(Date.now() / 1000)
  };

  const encoded = JSON.stringify(payload);

  client.publish(topic, encoded, { qos: 1 }, (error) => {
    if (error) {
      lastRespLabel.textContent = "publish error";
      console.error("Publish error", error);
    }
  });

  lastCmdLabel.textContent = `#${payload.seq} ${cmd}`;
  persistSettings();
  console.log("Sent:", encoded);
}

function handleIncomingMessage(topic, payloadBytes) {
  const text = payloadBytes.toString();

  try {
    const response = JSON.parse(text);
    if (typeof response === "object" && response) {
      const seq = response.seq != null ? `#${response.seq}` : "#?";
      const status = response.status || "RESPONSE";
      const error = response.error ? ` ${String(response.error)}` : "";
      lastRespLabel.textContent = `${seq} ${status}${error}`;
      return;
    }
  } catch (error) {
    console.warn("Non-JSON response on", topic, error);
  }

  lastRespLabel.textContent = text.slice(0, 56);
}

function showInputError(message) {
  lastRespLabel.textContent = message;
}

function sendServoAngle(angleOverride) {
  try {
    const servoId = readInteger(servoIdInput, "Servo ID", 1, 16);
    const angle = angleOverride == null
      ? readNumber(servoAngleInput, "Angle deg", 0, 180)
      : angleOverride;

    if (angleOverride != null) {
      servoAngleInput.value = String(angleOverride);
    }

    sendProtocolCommand("SERVO_SET_ANGLE", {
      servo_id: servoId,
      angle_deg: angle
    });
  } catch (error) {
    showInputError(error.message);
    console.warn(error.message);
  }
}

function sendStepperMove(direction) {
  try {
    const stepperId = readInteger(stepperIdInput, "Stepper ID", 1, 8);
    const steps = readInteger(stepperStepsInput, "Steps", 1, 10000);
    const speedSps = readInteger(stepperSpeedInput, "Speed sps", 1, 5000);

    sendProtocolCommand("STEPPER_MOVE_STEPS", {
      stepper_id: stepperId,
      steps,
      direction,
      speed_sps: speedSps
    });
  } catch (error) {
    showInputError(error.message);
    console.warn(error.message);
  }
}

function sendStepperStop() {
  try {
    const stepperId = readInteger(stepperIdInput, "Stepper ID", 1, 8);
    sendProtocolCommand("STEPPER_STOP", { stepper_id: stepperId });
  } catch (error) {
    showInputError(error.message);
    console.warn(error.message);
  }
}

function sendLedState(state) {
  try {
    const ledId = readInteger(ledIdInput, "LED ID", 1, 16);
    sendProtocolCommand("LED_SET", {
      led_id: ledId,
      state
    });
  } catch (error) {
    showInputError(error.message);
    console.warn(error.message);
  }
}

function readInteger(input, label, min, max) {
  const value = Number(input.value);

  if (!Number.isInteger(value)) {
    input.focus();
    throw new Error(`${label} must be an integer`);
  }

  if (value < min || value > max) {
    input.focus();
    throw new Error(`${label} must be between ${min} and ${max}`);
  }

  return value;
}

function readNumber(input, label, min, max) {
  const value = Number(input.value);

  if (!Number.isFinite(value)) {
    input.focus();
    throw new Error(`${label} must be a number`);
  }

  if (value < min || value > max) {
    input.focus();
    throw new Error(`${label} must be between ${min} and ${max}`);
  }

  return value;
}

function loadVideo() {
  const url = videoUrlInput.value.trim();
  persistSettings();

  if (!url) {
    updateVideoState(false);
    return;
  }

  videoStream.src = url;
}
