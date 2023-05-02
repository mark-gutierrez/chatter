const fastify = require("fastify")({
    logger: {
        transport: {
            target: "pino-pretty",
        },
    },
})

// fastify.register(require("@fastify/helmet"))

async function start() {
    try {
        // plug-ins
        fastify.register(require("@fastify/formbody"))
        fastify.register(require("@fastify/multipart"))
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
        fastify.register(require("@fastify/cookie"))
        fastify.register(require("@fastify/session"), {
            secret: fastify.config.SESSION_SECRET,
            cookie: { secure: false },
            expires: 3600000,
        })

        // public routes
        fastify.register(require("@fastify/static"), {
            root: require("node:path").join(__dirname, "public"),
        })

        // web routes
        fastify.register(require("./web/offline"))

        // api routes
        await fastify.register(
            require("@fastify/swagger"),
            require("./schemas/swagger")
        )
        await fastify.register(require("@fastify/swagger-ui"))
        fastify.register(require("./api"), { prefix: "/v1" })

        // connect to DB
        fastify.register(require("@fastify/postgres"), {
            connectionString: fastify.config.DATABASE_URL,
        })

        fastify.ready((err) => {
            if (err) {
                console.error(err)
            }
            fastify.swagger()
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
