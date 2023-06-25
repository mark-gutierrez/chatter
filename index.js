const fastify = require("fastify")({
    logger: {
        transport: {
            target: "pino-pretty",
        },
    },
})
;(async function () {
    try {
        // depndencies plugins
        await fastify.register(require("@fastify/rate-limit"), {
            max: 100,
            timeWindow: "1 minute",
        })
        await fastify.register(require("@fastify/compress"))
        await fastify.register(require("@fastify/cors"))
        fastify
            .register(require("@fastify/helmet"))
            .register(require("@fastify/formbody"))
            .register(require("@fastify/static"), {
                root: require("node:path").join(__dirname, "public"),
            })
            .register(require("@fastify/postgres"), {
                connectionString: process.env.DATABASE_URL,
            })
            .register(require("fastify-bcrypt"), {
                saltWorkFactor: 12,
            })
            .register(require("@fastify/cookie"))
            .register(require("@fastify/session"), {
                secret: process.env.SESSION_SECRET,
                cookie: { secure: "auto" },
                expires: 3600000,
            })
            .register(require("@fastify/jwt"), {
                secret: process.env.JWT_SECRET,
            })
            .register(require("@fastify/websocket"), {
                handle: (conn, req) => conn.pipe(conn),
                options: {
                    maxPayload: 1048576,
                },
            })

        // custom plugins
        fastify
            .register(require("./services/build-db"))
            .register(require("./services/email"))
            .register(require("./services/offline"))
            .register(require("./services/oauth"))
            .register(require("./services/online"))

        await fastify.listen({ port: process.env.PORT })
    } catch (error) {
        fastify.log.error(error)
        process.exit(1)
    }
})()
;["SIGINT", "SIGTERM"].forEach((signal) => {
    process.on(signal, async () => {
        await fastify.close()
        process.exit(0)
    })
})
