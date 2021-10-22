import { sign } from "@octokit/webhooks-methods"
import { githubHandler } from "../src"
import { PingEvent, WebhookEventMap } from "@octokit/webhooks-types"
import { RequestInit } from "node-fetch"
import { future } from "fp-future"
import { test } from "./components"
import Sinon from "sinon"
import { EmitterWebhookEvent } from "@octokit/webhooks"

async function ghReq<K extends keyof WebhookEventMap>(eventName: K, payload: WebhookEventMap[K]): Promise<RequestInit> {
  const serialized = JSON.stringify(payload)

  const signature = await sign({ secret: process.env.GITHUB_WEBHOOK_SECRET, algorithm: "sha256" }, serialized)

  return {
    body: serialized,
    method: "post",
    headers: {
      "x-github-delivery": "6afc428e-a2a5-4b6a-9801-bb94b2f47873",
      "x-github-event": eventName,
      "x-hub-signature": signature,
    },
  }
}

test("integration sanity tests using a real server backend", function ({ components, stubComponents }) {
  it("responds /webhooks/github with 404", async () => {
    const { localFetch } = components

    const r = await localFetch.fetch("/webhooks/github", { method: "post", body: "{}" })

    expect(r.status).toEqual(404)
  })

  it("responds /webhooks/github 200", async () => {
    const { localFetch, github } = components
    const { metrics } = stubComponents

    const pingFuture = future<EmitterWebhookEvent<"ping">>()

    github.webhooks.on("ping", (inferedArgument) => {
      pingFuture.resolve(inferedArgument)
    })

    const r = await localFetch.fetch("/webhooks/github", await ghReq("ping", { hook: {} } as PingEvent))

    expect(r.status).toEqual(200)

    expect(await pingFuture).toEqual({
      id: "6afc428e-a2a5-4b6a-9801-bb94b2f47873",
      name: "ping",
      payload: { hook: {} },
    })

    Sinon.assert.calledWithMatch(metrics.increment, "github_received_events_total", {
      event: "ping",
    })
  })
})
