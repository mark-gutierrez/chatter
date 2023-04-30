function users() {
    return {
        user_uid: { type: "string" },
        email: { type: "string" },
        password: { type: "string" },
        datetime: { type: "string" },
        username: { type: "string" },
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
        body: {
            type: "object",
            additionalProperties: false,
            required: requirements,
            properties: removeProperty(model(), remove),
        },
        response: {
            201: {
                type: "object",
                properties: {
                    data: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            properties: model(),
                        },
                    },
                },
            },
            409: {
                type: "object",
                properties: {
                    error: { type: "string" },
                },
            },
        },
    }
}

function patchSchema(model, remove = []) {
    return {
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
                properties: {
                    data: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            properties: model(),
                        },
                    },
                },
            },
            409: {
                type: "object",
                properties: {
                    error: { type: "string" },
                },
            },
        },
    }
}

function deleteSchema(model) {
    return {
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
                properties: {
                    data: {
                        type: "array",
                        items: {
                            type: "object",
                            additionalProperties: false,
                            properties: model(),
                        },
                    },
                },
            },
        },
    }
}

module.exports = {
    users,
    getSchema,
    postSchema,
    patchSchema,
    deleteSchema,
}
