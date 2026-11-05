import { POST_FIELDS, REPLY_FIELDS } from "./client.mjs";

export async function collect({ store, runId, client, signal, onProgress = () => {} }) {
  const run = store.run(runId);
  if (run.status === "complete") return store.summary(runId);
  store.setStatus(runId, "running");
  try {
    const processTask = async (task, search) => {
      const endpoint = search ? "keyword_search" : `${task.post_id}/conversation`;
      const params = search
        ? {
            q: task.keyword,
            search_type: run.search_type,
            fields: POST_FIELDS,
            limit: run.page_size,
          }
        : { fields: REPLY_FIELDS, reverse: false, limit: run.page_size };
      try {
        do {
          signal?.throwIfAborted();
          const page = await client.getPage(endpoint, params, task.cursor);
          store.savePage(runId, task, page, search);
          onProgress({ endpoint, items: page.data.length, more: page.next !== null });
          task.cursor = page.next;
        } while (task.cursor !== null);
      } catch (error) {
        if (signal?.aborted) throw error;
        store.failTask(
          search ? "search_queries" : "run_posts",
          runId,
          search ? task.id : task.post_id,
          error,
        );
        // An invalid token or permission must not cause a request for every queued post.
        if (
          [401, 403, 429].includes(error.status) ||
          [10, 190, 200, 4, 17, 32, 613, 80004].includes(error.code) ||
          error.kind === "rate_limit_wait_required"
        )
          throw error;
      }
    };
    for (const query of store.pendingQueries(runId)) await processTask(query, true);
    for (const post of store.pendingPosts(runId)) await processTask(post, false);
    const incomplete = store.pendingQueries(runId).length || store.pendingPosts(runId).length;
    store.setStatus(runId, incomplete ? "partial" : "complete");
  } catch (error) {
    store.setStatus(runId, signal?.aborted ? "interrupted" : "partial");
    throw error;
  }
  return store.summary(runId);
}
