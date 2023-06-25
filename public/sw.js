const version = "v13"

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
    console.log("installed")
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
    console.log("activated")
})

self.addEventListener("message", async (e) => {
    console.log("message received", e.data, e.source.id)
    const { type, data } = e.data
    if (type === "init") {
        const userDB = await db("user")
        const user = await userDB.get("user")

        if (user.length !== 1) {
            await sendClientMessage({ type, data: undefined })
            return
        }
        await sendClientMessage({ type, data: user[0] })
    }
    if (type === "login") {
        const userDB = await db("user")
        const user = await userDB.get("user")

        if (user.length !== 1) {
            await sendClientMessage({ type, data: undefined })
            return
        }

        const { user_uid, username } = user[0]

        const messageDB = await db(user_uid)
        const messages = await messageDB.get("messages")

        const last = messages
            ?.sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
            ?.pop()

        await sendClientMessage({
            type,
            data: last?.datetime,
        })
    }
    if (type === "addUser") {
        const userDB = await db("user")
        await userDB.insert("user", data)
    }
    if (type === "addConvo") {
        const { user_uid, newChatter } = data
        const conversationDB = await db(user_uid)
        await conversationDB.insert("conversations", newChatter)
    }
    if (type === "getMessages") {
        const { conversation_uid, user_uid, username } = data
        const DB = await db(user_uid)
        const messages = await DB.get(
            "messages",
            conversation_uid,
            "conversation_uid_index"
        )

        await DB.update("conversations", {
            conversation_uid,
            username,
            seen: messages.length,
        })
        await sendClientMessage({
            type,
            data: messages,
        })
    }
    if (type === "updateSeen") {
        const { conversation_uid, user_uid, username } = data
        const DB = await db(user_uid)
        const messages = await DB.get(
            "messages",
            conversation_uid,
            "conversation_uid_index"
        )
        await DB.update("conversations", {
            conversation_uid,
            username,
            seen: messages.length,
        })
    }
    if (type === "evalSeen") {
        const { user_uid } = data
        const DB = await db(user_uid)

        const conversations = await DB.get("conversations")

        const obj = {}

        const promises = conversations.map(({ conversation_uid }) =>
            DB.get("messages", conversation_uid, "conversation_uid_index")
        )

        const messages = await Promise.all(promises)

        for (let i = 0; i < conversations.length; i++) {
            if (conversations[i].seen === messages[i].length) {
                obj[conversations[i].conversation_uid] = ""
            } else {
                obj[conversations[i].conversation_uid] = "purple"
            }
        }

        await sendClientMessage({ type, data: obj })
    }
    if (type === "addMessage") {
        const { user_uid, message } = data
        const DB = await db(user_uid)
        await DB.insert("messages", message)
    }
    if (type === "logout") {
        const userDB = await db("user")
        await userDB.delete("user", data)
        await sendClientMessage({ type })
    }
    if (type === "offlineMode") {
        const userDB = await db("user")
        const userId = await userDB.get("user")

        if (userId.length !== 1) return

        const { user_uid, username } = userId[0]
        console.log(user_uid)
        const offlineDB = await db(user_uid)
        const userConvos = await offlineDB.get("conversations")
        await sendClientMessage({
            type,
            data: {
                user_uid,
                username,
                userConvos,
            },
        })
    }
    if (type === "reconnect") {
        const userDB = await db("user")
        const user = await userDB.get("user")
        await sendClientMessage({ type, data: user[0] })
    }
})

// utils
async function sendClientMessage(obj = {}) {
    const users = await clients.matchAll()
    users.forEach((user) => {
        user.postMessage(obj)
    })
}

// indexedDB
async function db(name = "", version = 1) {
    return new Promise((resolve, reject) => {
        let req = indexedDB.open(name, version)

        req.onerror = reject
        req.onsuccess = function (e) {
            resolve(new Query(e.target.result))
        }
        req.onupgradeneeded =
            name === "user" ? schemas[name] : schemas["chatter"]
    })
}

class Query {
    constructor(db) {
        this.db = db
    }

    get(name = "", search = "", index = "") {
        return new Promise((resolve) => {
            let tx = this.db.transaction(name, "readonly").objectStore(name)
            let query
            if (index === "") {
                if (search === "") {
                    query = tx.getAll()
                } else {
                    query = tx.get(search)
                }
            } else {
                query = tx.index(index).getAll(search)
            }
            query.onsuccess = function () {
                resolve(query.result)
            }
            query.onerror = (e) => console.warn(e)
        })
    }

    insert(name = "", obj = {}) {
        return new Promise((resolve) => {
            let tx = this.db.transaction(name, "readwrite").objectStore(name)
            const query = tx.add(obj)
            query.onsuccess = function () {
                resolve(query.result)
            }
            query.onerror = (e) => console.warn(e)
        })
    }

    update(name = "", obj = {}) {
        return new Promise((resolve) => {
            let tx = this.db.transaction(name, "readwrite").objectStore(name)
            const query = tx.put(obj)
            query.onsuccess = function () {
                resolve(query.result)
            }
            query.onerror = (e) => console.warn(e)
        })
    }

    delete(name = "", id = "") {
        return new Promise((resolve) => {
            let tx = this.db.transaction(name, "readwrite").objectStore(name)
            const query = tx.delete(id)
            query.onsuccess = function () {
                resolve(query.result)
            }
            query.onerror = (e) => console.warn(e)
        })
    }
}

const schemas = {
    user: userSchema,
    chatter: chatterSchema,
}

function userSchema(e) {
    let db = e.target.result
    console.log(`DB updated from version ${e.oldVersion} to ${e.newVersion}`)

    if (db.objectStoreNames.contains("user")) {
        db.deleteObjectStore("user")
    }

    db.createObjectStore("user", {
        keyPath: "user_uid",
    })
}

function chatterSchema(e) {
    let db = e.target.result
    console.log(`DB updated from version ${e.oldVersion} to ${e.newVersion}`)

    if (db.objectStoreNames.contains("conversations")) {
        db.deleteObjectStore("conversations")
    }
    if (db.objectStoreNames.contains("messages")) {
        db.deleteObjectStore("messages")
    }

    db.createObjectStore("conversations", {
        keyPath: "conversation_uid",
    })
    let messages = db.createObjectStore("messages", {
        keyPath: "message_uid",
    })

    messages.createIndex("conversation_uid_index", "conversation_uid", {
        unique: false,
    })
}

// caches
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
