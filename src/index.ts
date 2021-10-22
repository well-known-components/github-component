import { Webhooks } from "@octokit/webhooks"
import { IConfigComponent, ILoggerComponent, IMetricsComponent } from "@well-known-components/interfaces"
import mitt from "mitt"

import { IGithubWebhookComponent, GithubWebhookEvents, ReceiveGithubWebhookArgs } from "./types"
import { validateMetricsDeclaration } from "./_utils"
export { IGithubWebhookComponent as IGithubComponent } from "./types"
export { githubHandler } from "./http-handler"

/**
 * Component creator function
 * @public
 */
export async function createGithubWebhookComponent(
  components: createGithubWebhookComponent.NeededComponents
): Promise<IGithubWebhookComponent> {
  const { config, logs, metrics } = components

  const logger = logs.getLogger("github-port")

  const secret = await config.requireString("GITHUB_WEBHOOK_SECRET")

  const gh = new Webhooks({ secret, log: logger })

  const events = mitt<GithubWebhookEvents>()

  gh.onAny((evt) => {
    metrics.increment("github_received_events_total", { event: evt.name })
    events.emit(evt.name, evt)
  })

  gh.onError((event) => {
    metrics.increment("github_errors_total")
    logger.error(event)
  })

  return {
    webhooks: events,
    async receiveWebhook(opt: ReceiveGithubWebhookArgs) {
      await gh.verifyAndReceive(opt as any)
      return {}
    },
  }
}

/**
 * @public
 */
export namespace createGithubWebhookComponent {
  export type NeededComponents = {
    config: IConfigComponent
    logs: ILoggerComponent
    metrics: IMetricsComponent<keyof typeof metricDeclarations>
  }
}

/**
 * Metrics declarations, needed for your IMetricsComponent
 * @public
 */
export const metricDeclarations = validateMetricsDeclaration({
  github_received_events_total: {
    help: "Events received from GitHub webhook",
    type: IMetricsComponent.CounterType,
    labelNames: ["event"],
  },
  github_errors_total: {
    help: "Error counter",
    type: IMetricsComponent.CounterType,
    labelNames: [],
  },
})
