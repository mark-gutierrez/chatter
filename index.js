const fastify = require("fastify")({
    logger: {
        transport: {
            target: "pino-pretty",
        },
    },
})

// plug-ins
fastify.register(require("@fastify/formbody"))
fastify.register(require("@fastify/multipart"))
// fastify.register(require("@fastify/helmet"))
fastify.register(require("@fastify/static"), {
    root: require("node:path").join(__dirname, "public"),
})
fastify.register(require("./api/users"), { prefix: "/v1/users" })

fastify.get("/", async function (request, reply) {
    const home = await require("./services/file-reader")(
        "login-registration.html"
    )

    reply.type("text/html").send(home)
})

async function start() {
    try {
        // async plug-ins
        await fastify.register(require("@fastify/cors"))
        await fastify.register(require("@fastify/compress"))
        await fastify.register(require("@fastify/rate-limit"), {
            max: 100,
            timeWindow: "1 minute",
        })
        await fastify.register(
            require("@fastify/env"),
            require("./schemas/env")
        )
        fastify.register(require("@fastify/postgres"), {
            connectionString: fastify.config.DATABASE_URL,
        })
        await fastify.listen({ port: fastify.config.PORT })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

;["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal, async () => {
        await fastify.close()
        process.exit(0)
    })
})

start()
