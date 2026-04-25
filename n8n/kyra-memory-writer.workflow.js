import { workflow, node, trigger } from "@n8n/workflow-sdk";

const receiveMemory = trigger({
  type: "n8n-nodes-base.webhook",
  version: 2.1,
  config: {
    name: "Kyra Memory Webhook",
    parameters: {
      httpMethod: "POST",
      path: "kyra-memory",
      responseMode: "responseNode"
    },
    position: [240, 300]
  },
  output: [{
    body: {
      title: "Tone Preference",
      content: "Keep Kyra informal, warm, and clear.",
      tags: ["memory"]
    }
  }]
});

const writeMemory = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Write Kyra Memory",
    parameters: {
      method: "POST",
      url: "http://172.17.0.1:8790/kyra/memory",
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
      jsonBody: "={{ JSON.stringify({ title: $json.body?.title ?? 'Untitled Kyra Memory', content: $json.body?.content ?? $json.body?.memory ?? '', tags: $json.body?.tags ?? ['memory'], source: 'n8n-kyra-memory-webhook' }) }}",
      options: {
        response: {
          response: {
            responseFormat: "json"
          }
        },
        timeout: 30000
      }
    },
    position: [560, 300]
  },
  output: [{
    ok: true,
    memory: {
      relativePath: "Kyra/Memory/tone-preference.md"
    }
  }]
});

const respond = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Return Memory Path",
    parameters: {
      respondWith: "firstIncomingItem",
      options: {
        responseCode: 201
      }
    },
    position: [880, 300]
  }
});

export default workflow("kyra-memory-writer", "Kyra Memory Writer")
  .add(receiveMemory)
  .to(writeMemory)
  .to(respond);
