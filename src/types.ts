import { EmitterWebhookEventName, EmitterWebhookEvent } from "@octokit/webhooks"
import { Emitter } from "mitt"

/**
 * @public
 */
export type ReceiveGithubWebhookArgs = { id: string; name: string; payload: any; signature: string }

/**
 * @public
 */
export type GithubWebhookEvents = {
  [key in EmitterWebhookEventName]: EmitterWebhookEvent<key>
}

/**
 * @public
 */
export interface IGithubWebhookComponent {
  webhooks: Emitter<GithubWebhookEvents>
  receiveWebhook(opt: ReceiveGithubWebhookArgs): Promise<{}>
}

/**
 * @public
 */
export namespace IGithubWebhookComponent {
  /**
   * @public
   */
  export type Composable = {
    github: IGithubWebhookComponent
  }
}
