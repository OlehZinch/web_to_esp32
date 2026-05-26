let client = null;

const STORAGE_KEY = "projectx-mqtt-control-settings-v1";
const MAX_LOG_LINES = 120;

const statusText = document.getElementById("status");
const lastCmdLabel = document.getElementById("lastCmdLabel");
const lastRespLabel = document.getElementById("lastRespLabel");
const sentLog = document.getElementById("sentLog");
const recvLog = document.getElementById("recvLog");

const connectModal = document.getElementById("connectModal");
const openConnectModalBtn = document.getElementById("openConnectModalBtn");
const closeConnectModalBtn = document.getElementById("closeConnectModalBtn");
const saveConnectBtn = document.getElementById("saveConnectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");

const mqttProtocolInput = document.getElementById("mqttProtocol");
const mqttHostInput = document.getElementById("mqttHost");
const mqttPortInput = document.getElementById("mqttPort");
const mqttPathInput = document.getElementById("mqttPath");
const mqttUserInput = document.getElementById("mqttUser");
const mqttPassInput = document.getElementById("mqttPass");
const mqttCmdTopicInput = document.getElementById("mqttCmdTopic");
const mqttStatusTopicInput = document.getElementById("mqttStatusTopic");
const mqttTelemetryTopicInput = document.getElementById("mqttTelemetryTopic");

const ledOnBtn = document.getElementById("ledOnBtn");
const ledOffBtn = document.getElementById("ledOffBtn");

const servo0Btn = document.getElementById("servo0Btn");
const servo37Btn = document.getElementById("servo37Btn");
const servo90Btn = document.getElementById("servo90Btn");
const servo180Btn = document.getElementById("servo180Btn");
const servoAngleInput = document.getElementById("servoAngleInput");
const servoCustomBtn = document.getElementById("servoCustomBtn");

const stepperP128Btn = document.getElementById("stepperP128Btn");
const stepperP512Btn = document.getElementById("stepperP512Btn");
const stepperM128Btn = document.getElementById("stepperM128Btn");
const stepperM512Btn = document.getElementById("stepperM512Btn");
const stepperStepsInput = document.getElementById("stepperStepsInput");
const stepperCustomBtn = document.getElementById("stepperCustomBtn");

const testBtn = document.getElementById("testBtn");
const sendJsonServoBtn = document.getElementById("sendJsonServoBtn");
const sendJsonStepperBtn = document.getElementById("sendJsonStepperBtn");
const sendJsonLedBtn = document.getElementById("sendJsonLedBtn");

const globalCfg = window.PROJECTX_WEB_CONFIG || {};
const globalMqtt = globalCfg.mqtt || {};
const globalTopics = globalCfg.topics || {};

hydrateSettings();
bindEvents();
updateConnectionState("disconnected", "Disconnected");
appendLog(sentLog, "Ready");
appendLog(recvLog, "Waiting for MQTT messages");

function bindEvents() {
  openConnectModalBtn.addEventListener("click", openModal);
  closeConnectModalBtn.addEventListener("click", closeModal);
  saveConnectBtn.addEventListener("click", connectMqtt);
  disconnectBtn.addEventListener("click", disconnectMqtt);

  document.querySelectorAll("[data-close-modal='true']").forEach((element) => {
    element.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !connectModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  ledOnBtn.addEventListener("click", () => sendTextCommand("led:on"));
  ledOffBtn.addEventListener("click", () => sendTextCommand("led:off"));

  servo0Btn.addEventListener("click", () => sendServo(0));
  servo37Btn.addEventListener("click", () => sendServo(37));
  servo90Btn.addEventListener("click", () => sendServo(90));
  servo180Btn.addEventListener("click", () => sendServo(180));
  servoCustomBtn.addEventListener("click", () => sendServoFromInput());

  stepperP128Btn.addEventListener("click", () => sendStepper(128));
  stepperP512Btn.addEventListener("click", () => sendStepper(512));
  stepperM128Btn.addEventListener("click", () => sendStepper(-128));
  stepperM512Btn.addEventListener("click", () => sendStepper(-512));
  stepperCustomBtn.addEventListener("click", () => sendStepperFromInput());

  testBtn.addEventListener("click", () => sendTextCommand("test"));

  sendJsonServoBtn.addEventListener("click", () => sendJsonCommand({ cmd: "servo_set", angle: 37 }));
  sendJsonStepperBtn.addEventListener("click", () => sendJsonCommand({ cmd: "stepper_move", steps: 512 }));
  sendJsonLedBtn.addEventListener("click", () => sendJsonCommand({ cmd: "led_set", state: true }));

  [
    mqttProtocolInput,
    mqttHostInput,
    mqttPortInput,
    mqttPathInput,
    mqttUserInput,
    mqttPassInput,
    mqttCmdTopicInput,
    mqttStatusTopicInput,
    mqttTelemetryTopicInput,
    servoAngleInput,
    stepperStepsInput
  ].forEach((input) => input.addEventListener("change", persistSettings));
}

function hydrateSettings() {
  const defaults = {
    protocol: globalMqtt.protocol || "wss",
    host: globalMqtt.host || "YOUR_CLUSTER.s1.eu.hivemq.cloud",
    port: String(globalMqtt.port || 8884),
    path: globalMqtt.path || "/mqtt",
    username: globalMqtt.username || "",
    password: globalMqtt.password || "",
    cmdTopic: globalTopics.cmd || "projectx/device001/cmd",
    statusTopic: globalTopics.status || "projectx/device001/status",
    telemetryTopic: globalTopics.telemetry || "projectx/device001/telemetry",
    servoAngle: "90",
    stepperSteps: "128"
  };

  let saved = {};
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      saved = JSON.parse(raw);
    } catch (error) {
      console.warn("Failed to parse saved settings", error);
    }
  }

  const settings = { ...defaults, ...saved };
  mqttProtocolInput.value = settings.protocol;
  mqttHostInput.value = settings.host;
  mqttPortInput.value = settings.port;
  mqttPathInput.value = settings.path;
  mqttUserInput.value = settings.username;
  mqttPassInput.value = settings.password;
  mqttCmdTopicInput.value = settings.cmdTopic;
  mqttStatusTopicInput.value = settings.statusTopic;
  mqttTelemetryTopicInput.value = settings.telemetryTopic;
  servoAngleInput.value = settings.servoAngle;
  stepperStepsInput.value = settings.stepperSteps;
}

function persistSettings() {
  const settings = {
    protocol: mqttProtocolInput.value.trim(),
    host: mqttHostInput.value.trim(),
    port: mqttPortInput.value.trim(),
    path: mqttPathInput.value.trim(),
    username: mqttUserInput.value.trim(),
    password: mqttPassInput.value,
    cmdTopic: mqttCmdTopicInput.value.trim(),
    statusTopic: mqttStatusTopicInput.value.trim(),
    telemetryTopic: mqttTelemetryTopicInput.value.trim(),
    servoAngle: servoAngleInput.value.trim(),
    stepperSteps: stepperStepsInput.value.trim()
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function updateConnectionState(state, label) {
  statusText.textContent = label;
  statusText.className = `status-chip ${state}`;
}

function openModal() {
  connectModal.classList.remove("hidden");
  connectModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  connectModal.classList.add("hidden");
  connectModal.setAttribute("aria-hidden", "true");
}

function buildBrokerUrl() {
  const protocol = mqttProtocolInput.value.trim() || "wss";
  const host = mqttHostInput.value.trim();
  const port = Number(mqttPortInput.value);
  let path = mqttPathInput.value.trim() || "/mqtt";

  if (!host || !Number.isFinite(port)) {
    return "";
  }

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  return `${protocol}://${host}:${port}${path}`;
}

function connectMqtt() {
  const brokerUrl = buildBrokerUrl();
  if (!brokerUrl) {
    alert("Fill MQTT protocol/host/port/path");
    return;
  }

  persistSettings();

  if (client) {
    client.end(true);
    client = null;
  }

  const username = mqttUserInput.value.trim();
  const password = mqttPassInput.value;
  const prefix = globalMqtt.clientIdPrefix || "projectx-web-";

  const options = {
    clean: true,
    connectTimeout: 5000,
    reconnectPeriod: 3000,
    clientId: `${prefix}${Math.random().toString(16).slice(2, 10)}`
  };

  if (username) {
    options.username = username;
  }
  if (password) {
    options.password = password;
  }

  client = mqtt.connect(brokerUrl, options);
  updateConnectionState("connecting", "Connecting");
  appendLog(sentLog, `CONNECT ${brokerUrl}`);

  client.on("connect", () => {
    updateConnectionState("connected", "Connected");
    subscribeTopics();
    closeModal();
  });

  client.on("reconnect", () => {
    updateConnectionState("connecting", "Reconnecting");
  });

  client.on("close", () => {
    updateConnectionState("disconnected", "Disconnected");
  });

  client.on("error", (error) => {
    updateConnectionState("disconnected", "Error");
    appendLog(recvLog, `MQTT error: ${error.message || error}`);
  });

  client.on("message", (topic, payload) => {
    handleIncomingMessage(topic, payload);
  });
}

function disconnectMqtt() {
  if (client) {
    client.end(true);
    client = null;
  }
  updateConnectionState("disconnected", "Disconnected");
  appendLog(sentLog, "DISCONNECT");
}

function subscribeTopics() {
  if (!client || !client.connected) {
    return;
  }

  const topics = [
    mqttStatusTopicInput.value.trim(),
    mqttTelemetryTopicInput.value.trim()
  ].filter(Boolean);

  topics.forEach((topic) => {
    client.subscribe(topic, { qos: 1 }, (error) => {
      if (error) {
        appendLog(recvLog, `SUBSCRIBE ERROR ${topic}: ${error.message || error}`);
        return;
      }
      appendLog(recvLog, `SUBSCRIBED ${topic}`);
    });
  });
}

function sendTextCommand(commandText) {
  if (typeof commandText !== "string" || !commandText.trim()) {
    return;
  }
  publishCommand(commandText.trim());
}

function sendJsonCommand(payloadObject) {
  publishCommand(JSON.stringify(payloadObject));
}

function sendServo(angle) {
  const safe = clampInt(angle, 0, 180);
  servoAngleInput.value = String(safe);
  sendTextCommand(`servo:${safe}`);
}

function sendServoFromInput() {
  const angle = Number(servoAngleInput.value);
  if (!Number.isFinite(angle)) {
    alert("Servo angle must be a number");
    return;
  }
  sendServo(Math.round(angle));
}

function sendStepper(steps) {
  const safe = clampInt(steps, -50000, 50000);
  stepperStepsInput.value = String(safe);
  sendTextCommand(`stepper:${safe}`);
}

function sendStepperFromInput() {
  const steps = Number(stepperStepsInput.value);
  if (!Number.isFinite(steps)) {
    alert("Stepper steps must be a number");
    return;
  }
  sendStepper(Math.round(steps));
}

function publishCommand(payload) {
  if (!client || !client.connected) {
    alert("MQTT is not connected");
    openModal();
    return;
  }

  const topic = mqttCmdTopicInput.value.trim();
  if (!topic) {
    alert("Command topic is empty");
    openModal();
    return;
  }

  client.publish(topic, payload, { qos: 1 }, (error) => {
    if (error) {
      appendLog(recvLog, `PUBLISH ERROR: ${error.message || error}`);
      return;
    }
    const line = `${nowLabel()} TX ${topic} ${payload}`;
    appendLog(sentLog, line);
    lastCmdLabel.textContent = payload;
  });
}

function handleIncomingMessage(topic, payloadBytes) {
  const text = payloadBytes.toString();
  appendLog(recvLog, `${nowLabel()} RX ${topic} ${text}`);

  try {
    const data = JSON.parse(text);
    if (typeof data === "object" && data) {
      const detail = data.detail || data.message || data.result || "status";
      lastRespLabel.textContent = String(detail);
      return;
    }
  } catch (error) {
    // Keep non-JSON as is.
  }

  lastRespLabel.textContent = text.slice(0, 72);
}

function appendLog(target, line) {
  const current = target.textContent ? target.textContent.split("\n") : [];
  current.push(line);
  if (current.length > MAX_LOG_LINES) {
    current.splice(0, current.length - MAX_LOG_LINES);
  }
  target.textContent = current.join("\n");
  target.scrollTop = target.scrollHeight;
}

function nowLabel() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function clampInt(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return min;
  }
  if (n < min) {
    return min;
  }
  if (n > max) {
    return max;
  }
  return Math.trunc(n);
}
