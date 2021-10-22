// This file is the "test-environment" analogous for src/components.ts
// Here we define the test components to be used in the testing environment

import { createRunner } from "@well-known-components/test-helpers"
import { createGithubWebhookComponent, githubHandler, IGithubComponent, metricDeclarations } from "../src"
import { createConfigComponent } from "@well-known-components/env-config-provider"
import { createServerComponent, IFetchComponent, Router } from "@well-known-components/http-server"
import { createLogComponent } from "@well-known-components/logger"
import { createMetricsComponent } from "@well-known-components/metrics"
import nodeFetch, { RequestInfo, RequestInit } from "node-fetch"
import { IHttpServerComponent } from "@well-known-components/interfaces"

// start TCP port for listeners
let lastUsedPort = 19000 + parseInt(process.env.JEST_WORKER_ID || "1") * 1000
function getFreePort() {
  return lastUsedPort + 1
}

export type GlobalContext = { components: IGithubComponent.Composable }

export type TestComponents = {
  localFetch: IFetchComponent
  server: IHttpServerComponent<GlobalContext>
} & createGithubWebhookComponent.NeededComponents &
  IGithubComponent.Composable

/**
 * Behaves like Jest "describe" function, used to describe a test for a
 * use case, it creates a whole new program and components to run an
 * isolated test.
 *
 * State is persistent within the steps of the test.
 */
export const test = createRunner<TestComponents>({
  async main({ startComponents, components }) {
    const router = new Router<GlobalContext>()

    router.post("/webhooks/github", githubHandler)

    components.server.use(router.allowedMethods())
    components.server.use(router.middleware())

    components.server.setContext({ components })

    await startComponents()
  },
  async initComponents(): Promise<TestComponents> {
    const currentPort = getFreePort()

    Object.assign(process.env, {
      HTTP_SERVER_HOST: "0.0.0.0",
      HTTP_SERVER_PORT: (currentPort + 1).toString(),
      GITHUB_WEBHOOK_SECRET: Math.random().toString(36),
    })

    const config = createConfigComponent(process.env)

    const protocolHostAndProtocol = `http://${await config.requireString(
      "HTTP_SERVER_HOST"
    )}:${await config.requireNumber("HTTP_SERVER_PORT")}`

    const logs = createLogComponent()
    const server = await createServerComponent<GlobalContext>({ config, logs }, {})
    const metrics = await createMetricsComponent(metricDeclarations, { server, config })

    // test fetch, to hit our local server
    const localFetch: IFetchComponent = {
      async fetch(url: RequestInfo, initRequest?: RequestInit) {
        if (typeof url == "string" && url.startsWith("/")) {
          return nodeFetch(protocolHostAndProtocol + url, { ...initRequest })
        } else {
          throw new Error("localFetch only works for local testing-URLs")
        }
      },
    }

    const github = await createGithubWebhookComponent({ logs, config, metrics })

    return {
      config,
      localFetch,
      logs,
      metrics,
      server,
      github,
    }
  },
})
