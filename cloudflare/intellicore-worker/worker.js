// intellicore-worker · API 网关（Cloudflare Worker）
//
// 职责：把 api.intellicoretech.cn 的请求代理到后端，按路径前缀分流：
//   /dev/* 前缀 → dev 后端（剥离 /dev 后转发，如 /dev/admin → /admin）
//                  https://backend-dev.intellicoretech.cn（Tunnel → 8.156.70.151:8081）
//   其余        → main 后端（原样转发）
//                  https://backend.intellicoretech.cn（Tunnel → 8.156.70.151:8000）
//
// 说明：race-fore-end 前端仅使用 /api/v1/* 接口，无需 /chat 的 Workers AI 功能，
//       因此本网关统一代理到后端；如需恢复 AI 聊天，请在此基础上补充 Workers AI 绑定。
//
// CORS：回显请求 Origin（Allow-Origin: <origin>）并预检放行，允许任意来源调用
//       （含 *.workers.dev 预览部署域名）。竞赛演示项目放宽跨域，生产建议收敛为白名单。
const ALLOWED_METHODS = 'GET,POST,PUT,DELETE,PATCH,OPTIONS'
const ALLOWED_HEADERS = 'Content-Type,Authorization,X-Requested-With,Accept,Origin'
const MAIN_BACKEND = 'https://backend.intellicoretech.cn'
const DEV_BACKEND = 'https://backend-dev.intellicoretech.cn'

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

export default {
  async fetch(request) {
    const start = Date.now()
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || ''

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      })
    }

    // 路径分流：/dev 前缀 → dev 后端（剥离 /dev）；其余 → main 后端
    let targetBase = MAIN_BACKEND
    let path = url.pathname
    if (path === '/dev' || path.startsWith('/dev/')) {
      targetBase = DEV_BACKEND
      path = path === '/dev' ? '/' : path.slice(4)
    }
    const targetUrl = targetBase + path + url.search

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
      // 追加 CORS 头
      const cors = corsHeaders(origin)
      for (const [k, v] of Object.entries(cors)) {
        responseHeaders.set(k, v)
      }
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
            ...corsHeaders(origin),
          },
        },
      )
    }
  },
}
