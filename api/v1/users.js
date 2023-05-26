module.exports = function (fastify, opts, done) {
    fastify.addHook("onRequest", fastify.authenticate)

    // Users route
    fastify.get(
        "/",
        {
            schema: fastify.s.build({
                model: "users",
                method: "GET",
                response: ["user_uid", "username", "email", "datetime"],
            }),
        },
        fastify.callback
    )
    fastify.patch(
        "/:id",
        {
            schema: fastify.s.build({
                model: "users",
                method: "PATCH",
                request: ["email", "username"],
                response: ["user_uid", "username", "email", "datetime"],
            }),
        },
        fastify.callback
    )
    fastify.delete(
        "/:id",
        {
            schema: fastify.s.build({
                model: "users",
                method: "DELETE",
                response: ["user_uid", "email", "username"],
            }),
        },
        fastify.callback
    )

    done()
}
