function authSchema(model, requirements = [], remove = []) {
    return {
        body: {
            type: "object",
            additionalProperties: false,
            required: requirements,
            properties: removeProperty(model(), remove),
        },
        response: {
            "2xx": {
                type: "object",
                additionalProperties: false,
                properties: { ...model(), token: { type: "string" } },
            },
        },
    }
}

function removeProperty(obj, list = []) {
    list.forEach((element) => {
        delete obj[`${element}`]
    })

    return obj
}

function getSchema(model, remove = []) {
    return {
        headers: {
            type: "object",
            properties: {
                Authorization: { type: "string" },
            },
            required: ["Authorization"],
        },
        querystring: {
            type: "object",
            additionalProperties: false,
            properties: {
                ...model(),
                select: { type: "string" },
                sort: { type: "string" },
                page: { type: "number" },
                limit: { type: "number" },
            },
        },
        response: {
            200: {
                type: "object",
                properties: {
                    data: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            properties: removeProperty(model(), remove),
                        },
                    },
                },
            },
        },
    }
}

function postSchema(model, requirements = [], remove = []) {
    return {
        headers: {
            type: "object",
            properties: {
                Authorization: { type: "string" },
            },
            required: ["Authorization"],
        },
        body: {
            type: "object",
            additionalProperties: false,
            required: requirements,
            properties: removeProperty(model(), remove),
        },
        response: {
            201: {
                type: "object",
                additionalProperties: false,
                properties: model(),
            },
        },
    }
}

function patchSchema(model, remove = []) {
    return {
        headers: {
            type: "object",
            properties: {
                Authorization: { type: "string" },
            },
            required: ["Authorization"],
        },
        params: {
            type: "object",
            required: ["id"],
            properties: {
                id: { type: "string" },
            },
        },
        body: {
            type: "object",
            additionalProperties: false,
            properties: removeProperty(model(), remove),
        },
        response: {
            200: {
                type: "object",
                additionalProperties: false,
                properties: model(),
            },
        },
    }
}

function deleteSchema(model) {
    return {
        headers: {
            type: "object",
            properties: {
                Authorization: { type: "string" },
            },
            required: ["Authorization"],
        },
        params: {
            type: "object",
            required: ["id"],
            properties: {
                id: { type: "string" },
            },
        },
        response: {
            200: {
                type: "object",
                additionalProperties: false,
                properties: model(),
            },
        },
    }
}

module.exports = {
    authSchema,
    getSchema,
    postSchema,
    patchSchema,
    deleteSchema,
}
