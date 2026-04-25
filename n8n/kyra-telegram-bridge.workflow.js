import { workflow, node, trigger } from "@n8n/workflow-sdk";

const receiveTelegram = trigger({
  type: "n8n-nodes-base.webhook",
  version: 2.1,
  config: {
    name: "Telegram Kyra Webhook",
    webhookId: "3e5643ba-17cc-4f4a-8f5c-7f88bb0f6590",
    parameters: {
      httpMethod: "POST",
      path: "telegram-kyra",
      responseMode: "responseNode"
    },
    position: [240, 300]
  },
  output: [{
    body: {
      message: "Telegram update received.",
      status: "ok"
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
      jsonBody: `={{ JSON.stringify({
        message: ($json.body?.message?.text ?? $json.body?.edited_message?.text ?? $json.body?.message?.caption ?? ''),
        telegramVoice: $json.body?.message?.voice ? {
          fileId: $json.body?.message?.voice?.file_id,
          mimeType: $json.body?.message?.voice?.mime_type,
          duration: $json.body?.message?.voice?.duration
        } : undefined,
        speak: true
      }) }}`,
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
    reply: "Kyra replied to Telegram.",
    status: "queued"
  }]
});

const sendTelegram = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Send Telegram Message",
    parameters: {
      method: "POST",
      url: "=https://api.telegram.org/bot{{$env.TELEGRAM_BOT_TOKEN}}/sendMessage",
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
      jsonBody: "={{ JSON.stringify({ chat_id: ($node['Telegram Kyra Webhook'].json?.body?.message?.chat?.id ?? $node['Telegram Kyra Webhook'].json?.body?.edited_message?.chat?.id), text: $node['Call Local Kyra Bridge'].json['reply'] || 'Kyra did not return a response yet.' }) }}",
      options: {
        response: {
          response: {
            responseFormat: "json"
          }
        },
        timeout: 120000
      }
    },
    position: [840, 300]
  },
  output: [{
    status: "sent"
  }]
});

const respond = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Respond to Telegram",
    parameters: {
      respondWith: "firstIncomingItem",
      options: {
        responseCode: 200
      }
    },
    position: [1120, 300]
  }
});

export default workflow("kyra-telegram-bridge", "Kyra Telegram Bridge")
  .add(receiveTelegram)
  .to(callKyra)
  .to(sendTelegram)
  .to(respond);
