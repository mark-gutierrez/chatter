const version = "v1"

self.addEventListener("install", (event) => {
    event.waitUntil(
        addResourcesToCache([
            "/",
            "index.html",
            "/style.css",
            "/script.js",
            "/favicon.ico",
            "/404.png",
        ])
    )
})

self.addEventListener("fetch", (event) => {
    if (event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            cacheFirst({
                request: event.request,
                fallbackUrl: "/404.png",
            })
        )
    }
})

self.addEventListener("activate", (event) => {
    event.waitUntil(deleteOldCaches())
})

async function addResourcesToCache(resources) {
    const cache = await caches.open(version)
    await cache.addAll(resources)
}

async function putInCache(request, response) {
    const cache = await caches.open(version)
    await cache.put(request, response)
}

async function cacheFirst({ request, fallbackUrl }) {
    const responseFromCache = await caches.match(request)
    if (responseFromCache) {
        return responseFromCache
    }

    try {
        const responseFromNetwork = await fetch(request)
        const content = responseFromNetwork.headers.get("content-type")
        if (
            content &&
            !content.includes("application/json") &&
            !request.url.includes("/login")
        )
            putInCache(request, responseFromNetwork.clone())
        return responseFromNetwork
    } catch (error) {
        const fallbackResponse = await caches.match(fallbackUrl)
        if (fallbackResponse) {
            return fallbackResponse
        }
        return new Response("Network error happened", {
            status: 408,
            headers: { "Content-Type": "text/plain" },
        })
    }
}

async function deleteCache(key) {
    await caches.delete(key)
}

async function deleteOldCaches() {
    const cacheKeepList = [version]
    const keyList = await caches.keys()
    const cachesToDelete = keyList.filter((key) => !cacheKeepList.includes(key))
    await Promise.all(cachesToDelete.map(deleteCache))
}
