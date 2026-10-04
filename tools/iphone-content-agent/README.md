# WickSpend iPhone Content Agent

Runs on the Mac physically connected to the iPhone.

## Current flow

1. n8n sends a capture request.
2. The Mac worker verifies a physical iPhone is connected.
3. Safari on the iPhone opens the requested WickSpend page.
4. The worker captures real-device screenshots.
5. n8n generates the caption and requests Telegram approval.
6. Approved content is handed to the publishing connector.

## Requirements

- macOS + Xcode
- Node.js 20+
- Appium with the XCUITest driver
- A trusted iPhone with Developer Mode enabled
- Safari Web Inspector / Remote Automation enabled
- Signed WebDriverAgent for the iPhone

## n8n variables

- WICKSPEND_IPHONE_AGENT_URL
- WICKSPEND_IPHONE_AGENT_TOKEN

## Local environment

Copy .env.example to .env and set the real iPhone UDID and the worker's HTTPS public URL.

The worker must expose:

- GET /health
- POST /capture
- POST /publish

Never expose Appium itself publicly. Only expose the small worker service through HTTPS.
