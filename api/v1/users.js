const { users } = require("../../schemas/models")

const { getSchema, patchSchema, deleteSchema } = require("../../schemas/routes")

module.exports = function (fastify, opts, done) {
    fastify.addHook("onRequest", fastify.authenticate)

    // Users route
    fastify.get(
        "/",
        {
            schema: getSchema(users, ["password"]),
        },
        fastify.callback
    )
    fastify.patch(
        "/:id",
        {
            schema: patchSchema(users, ["user_uid", "datetime", "password"]),
        },
        fastify.callback
    )
    fastify.delete("/:id", { schema: deleteSchema(users) }, fastify.callback)

    done()
}
