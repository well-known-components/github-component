import { IHttpServerComponent } from "@well-known-components/interfaces"
import { IGithubWebhookComponent } from "./types"

export type HandlerContext = IHttpServerComponent.DefaultContext<{
  components: IGithubWebhookComponent.Composable
}>

/**
 * Http handler for webhooks.
 * @public
 */
export async function githubHandler(ctx: HandlerContext) {
  const { github } = ctx.components

  const id = ctx.request.headers.get("x-github-delivery")
  const name = ctx.request.headers.get("x-github-event") as any
  const signature = ctx.request.headers.get("x-hub-signature")

  if (!id || !signature || !name) {
    return { status: 404 }
  }

  await github.receiveWebhook({
    id,
    name,
    signature,
    payload: await ctx.request.text(),
  })

  return {
    status: 200,
  }
}
