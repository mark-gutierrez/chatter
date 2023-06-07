class SchemaSingleton {
    static #instance
    #models
    #getquery

    static get() {
        if (!SchemaSingleton.#instance) {
            SchemaSingleton.#instance = new SchemaSingleton()
            SchemaSingleton.#instance.initializeProperties()
        }
        return SchemaSingleton.#instance
    }

    initializeProperties() {
        this.#models = {
            users: {
                user_uid: { type: "string", format: "uuid" },
                email: { type: "string", format: "email" },
                password: {
                    type: "string",
                    pattern:
                        "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$",
                },
                datetime: { type: "string" },
                username: { type: "string", minLength: 1 },
            },
            conversations: {
                conversation_uid: { type: "string", format: "uuid" },
                datetime: { type: "string" },
            },
            user_conversation: {
                user_uid: { type: "string", format: "uuid" },
                conversation_uid: { type: "string", format: "uuid" },
            },
            messages: {
                message_uid: { type: "string", format: "uuid" },
                text: { type: "string", minLength: 1 },
                datetime: { type: "string" },
                user_uid: { type: "string", format: "uuid" },
                conversation_uid: { type: "string", format: "uuid" },
            },
            forgot_password: {
                forgot_password_uid: { type: "string", format: "uuid" },
                user_uid: { type: "string", format: "uuid" },
                datetime: { type: "string" },
            },
            registrations: {
                registration_uid: { type: "string", format: "uuid" },
                email: { type: "string", format: "email" },
                password: {
                    type: "string",
                    pattern:
                        "^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$",
                },
                datetime: { type: "string" },
                username: { type: "string", minLength: 1 },
            },
        }
        this.#getquery = {
            select: { type: "string" },
            sort: { type: "string" },
            page: { type: "number" },
            limit: { type: "number" },
        }
    }

    build({
        model = "",
        method = "",
        request = [],
        required = [],
        response = [],
        secure = true,
    }) {
        let obj = {}

        // headers
        if (secure)
            obj = {
                ...this.#schemaBuilder({
                    key: "headers",
                    required: ["Authorization"],
                    properties: {
                        Authorization: { type: "string" },
                    },
                    strict: false,
                }),
            }

        let key = ["POST", "PATCH"].includes(method) ? "body" : "querystring"

        // body or querystring
        if (method !== "DELETE")
            obj = {
                ...obj,
                ...this.#modelResolve({
                    model,
                    method,
                    key,
                    properties: request,
                    required,
                }),
            }

        // params
        if (["DELETE", "PATCH"].includes(method))
            obj = {
                ...obj,
                ...this.#schemaBuilder({
                    key: "params",
                    required: ["id"],
                    properties: { id: { type: "string" } },
                    strict: false,
                }),
            }

        // generate response
        obj["response"] = this.#modelResolve({
            model,
            method,
            key: "2xx",
            properties: response,
            secure,
        })

        // refromat response for get requests
        if (method === "GET") {
            obj["response"]["2xx"]["properties"] = {
                data: {
                    type: "array",
                    items: {
                        type: "object",
                        additionalProperties: false,
                        properties: obj["response"]["2xx"]["properties"],
                    },
                },
            }
        }

        return obj
    }

    #modelResolve({
        model,
        method = "",
        key,
        properties = [],
        required = [],
        secure = true,
    }) {
        model = this.#model(model)

        if (properties.length > 0) {
            for (const [field, value] of Object.entries(model)) {
                if (!properties.includes(field)) delete model[field]
            }
        }

        return this.#schemaBuilder({
            key,
            properties:
                method === "GET" && key !== 200
                    ? { ...model, ...this.#getquery }
                    : secure === false
                    ? { ...model, ...{ token: { type: "string" } } }
                    : model,
            required,
        })
    }

    #schemaBuilder({ key, required = [], properties = {}, strict = true }) {
        const obj = {}
        obj[key] = {
            type: "object",
            properties,
        }

        if (key.length > 0)
            obj[key] = {
                ...obj[key],
                required,
            }

        if (strict) {
            obj[key]["additionalProperties"] = false
        }

        return obj
    }

    #model(name) {
        return { ...this.#models[name] }
    }

    getModels() {
        return JSON.parse(JSON.stringify(this.#models))
    }
}

module.exports = SchemaSingleton.get()
