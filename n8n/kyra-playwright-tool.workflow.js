import { workflow, node, trigger } from "@n8n/workflow-sdk";

const receiveBrowserTask = trigger({
  type: "n8n-nodes-base.webhook",
  version: 2.1,
  config: {
    name: "Kyra Playwright Webhook",
    parameters: {
      httpMethod: "POST",
      path: "kyra-playwright",
      responseMode: "responseNode"
    },
    position: [240, 300]
  },
  output: [{
    body: {
      url: "https://example.com",
      selector: "body",
      screenshot: true
    }
  }]
});

const runBrowserTask = node({
  type: "n8n-nodes-base.httpRequest",
  version: 4.4,
  config: {
    name: "Run Playwright Tool",
    parameters: {
      method: "POST",
      url: "http://172.17.0.1:8790/kyra/tools/playwright",
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
      jsonBody: "={{ JSON.stringify({ url: $json.body?.url ?? '', selector: $json.body?.selector, extractSelector: $json.body?.extractSelector, screenshot: $json.body?.screenshot ?? true, screenshotPath: $json.body?.screenshotPath, fullPage: $json.body?.fullPage ?? true, waitUntil: $json.body?.waitUntil, timeoutMs: $json.body?.timeoutMs ?? 30000, afterLoadWaitMs: $json.body?.afterLoadWaitMs ?? 1000, viewportWidth: $json.body?.viewportWidth, viewportHeight: $json.body?.viewportHeight, maxTextLength: $json.body?.maxTextLength ?? 4000, headers: $json.body?.headers }) }}",
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
    ok: true,
    title: "Example Domain",
    screenshotPath: "/abs/path/output/playwright/example.png"
  }]
});

const respond = node({
  type: "n8n-nodes-base.respondToWebhook",
  version: 1.5,
  config: {
    name: "Return Playwright Result",
    parameters: {
      respondWith: "firstIncomingItem",
      options: {
        responseCode: 200
      }
    },
    position: [880, 300]
  }
});

export default workflow("kyra-playwright-tool", "Kyra Playwright Tool")
  .add(receiveBrowserTask)
  .to(runBrowserTask)
  .to(respond);
