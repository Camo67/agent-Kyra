import { workflow, node, trigger } from "@n8n/workflow-sdk";

const receiveTask = trigger({
  type: "n8n-nodes-base.webhook",
  version: 2.1,
  config: {
    name: "Kyra Task Webhook",
    parameters: {
      httpMethod: "POST",
      path: "kyra-task",
      responseMode: "responseNode"
    },
    position: [240, 300]
  },
  output: [{
    body: {
      message: "Kyra, confirm the bridge is awake.",
      speak: true
    }
  }]
});

const callKyra = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Call Local Kyra Bridge",
    parameters: {
      method: "POST",
      url: "http://172.17.0.1:8790/kyra/chat",
      sendHeaders: true,
      specifyHeaders: "keypair",
      headerParameters: {
        parameters: [
          {
            name: "Content-Type",
            value: "application/json"
          }
        ]
      },
      sendBody: true,
      contentType: "json",
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify({ message: $json.body?.message ?? $json.body?.userText ?? $json.body?.text ?? '', speak: $json.body?.speak ?? true }) }}",
      options: {
        response: {
          response: {
            responseFormat: "json"
          }
        },
        timeout: 120000
      }
    },
    position: [560, 300]
  },
  output: [{
    reply: "Kyra is connected.",
    voice: {
      status: "queued"
    }
  }]
});

const respond = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Return Kyra Reply",
    parameters: {
      respondWith: "firstIncomingItem",
      options: {
        responseCode: 200
      }
    },
    position: [880, 300]
  }
});

export default workflow("kyra-obsidian-voice-bridge", "Kyra Obsidian Voice Bridge")
  .add(receiveTask)
  .to(callKyra)
  .to(respond);
