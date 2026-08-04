// intellicore-worker · API 网关（Cloudflare Worker）
//
// 职责：把 api.intellicoretech.cn 的所有请求代理到后端
//   https://backend.intellicoretech.cn（Cloudflare Tunnel → 8.156.70.151:8000）
//
// 说明：race-fore-end 前端仅使用 /api/v1/* 接口，无需 /chat 的 Workers AI 功能，
//       因此本网关统一代理到后端；如需恢复 AI 聊天，请在此基础上补充 Workers AI 绑定。
export default {
  async fetch(request) {
    const start = Date.now()
    const url = new URL(request.url)
    const targetUrl = 'https://backend.intellicoretech.cn' + url.pathname + url.search

    const headers = new Headers(request.headers)
    headers.delete('host')

    const init = {
      method: request.method,
      headers,
      redirect: 'follow',
    }
    // GET/HEAD 不携带 body，其余方法透传请求体
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body
    }

    try {
      const resp = await fetch(targetUrl, init)
      const responseHeaders = new Headers(resp.headers)
      responseHeaders.set('cfWorker', 'intellicore-worker')
      responseHeaders.set('dur', String(Date.now() - start))
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: responseHeaders,
      })
    } catch (err) {
      return new Response(
        JSON.stringify({ code: 502, message: '网关无法连接后端: ' + err.message, data: null }),
        {
          status: 502,
          headers: {
            'content-type': 'application/json',
            cfWorker: 'intellicore-worker',
            dur: String(Date.now() - start),
          },
        },
      )
    }
  },
}
