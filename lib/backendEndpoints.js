const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

const stripTrailingSlash = (value) => value.replace(/\/$/, '')

const isLocalHost = (host) => LOCAL_HOSTS.has(host)

const rewriteLocalHostUrlForRemoteClients = ({ rawUrl, browserHost, browserProtocol, wsProtocol }) => {
  if (!rawUrl || !browserHost || isLocalHost(browserHost)) {
    return rawUrl
  }

  try {
    const parsed = new URL(rawUrl)
    const isWsUrl = parsed.protocol === 'ws:' || parsed.protocol === 'wss:'

    if (!isLocalHost(parsed.hostname)) {
      return rawUrl
    }

    parsed.hostname = browserHost
    parsed.protocol = isWsUrl ? `${wsProtocol}:` : browserProtocol
    return parsed.toString()
  } catch {
    return rawUrl
  }
}

const resolveBackendEndpoints = () => {
  const browserHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const browserProtocol = typeof window !== 'undefined' ? window.location.protocol : 'http:'
  const wsProtocol = browserProtocol === 'https:' ? 'wss' : 'ws'
  const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || '4000'

  const defaultGraphqlHttpUri = `${browserProtocol}//${browserHost}:${backendPort}/graphql`
  const defaultGraphqlWsUri = `${wsProtocol}://${browserHost}:${backendPort}/subscriptions`

  const explicitGraphqlHttpUri = rewriteLocalHostUrlForRemoteClients({
    rawUrl: process.env.NEXT_PUBLIC_GRAPHQL_URL,
    browserHost,
    browserProtocol,
    wsProtocol,
  })

  const explicitGraphqlWsUri = rewriteLocalHostUrlForRemoteClients({
    rawUrl: process.env.NEXT_PUBLIC_WS_URL,
    browserHost,
    browserProtocol,
    wsProtocol,
  })

  const graphqlHttpUri = explicitGraphqlHttpUri || defaultGraphqlHttpUri
  const graphqlWsUri = explicitGraphqlWsUri || defaultGraphqlWsUri
  const backendBaseUri = stripTrailingSlash(graphqlHttpUri.replace(/\/graphql\/?$/, ''))

  return {
    graphqlHttpUri,
    graphqlWsUri,
    backendBaseUri,
  }
}

const endpoints = resolveBackendEndpoints()

export const graphqlHttpUri = endpoints.graphqlHttpUri
export const graphqlWsUri = endpoints.graphqlWsUri

export const getBackendApiUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${endpoints.backendBaseUri}${normalizedPath}`
}
