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
        fastify.register(require("fastify-bcrypt"))
        fastify.register(require("@fastify/websocket"), {
            handle: (conn, req) => conn.pipe(conn),
            options: { maxPayload: 1048576 },
        })
        fastify.register(require("./services/jwt"))

        // custom plug-ins
        fastify.register(require("./services/plugins"))
        fastify.register(require("./services/request-handlers"))
        fastify.register(require("./services/emailing"))

        // public routes
        fastify.register(require("@fastify/static"), {
            root: require("node:path").join(__dirname, "public"),
        })

        // web routes
        fastify.register(require("./web/offline"))
        fastify.register(require("./web/online"))

        // api routes
        fastify.register(require("./api"), { prefix: "/api" })

        await fastify.register(require("@fastify/swagger"), {
            mode: "static",
            specification: {
                path: "./files/swagger-api-v1.yaml",
            },
        })
        await fastify.register(require("@fastify/swagger-ui"))

        // connect to DB
        fastify.register(require("@fastify/postgres"), {
            connectionString: fastify.config.DATABASE_URL,
        })
        fastify.register(require("./services/build-db"))
        fastify.ready((err) => {
            if (err) {
                console.error(err)
            }
            fastify.swagger()
        })

        fastify.setErrorHandler(require("./services/error-handler"))

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
