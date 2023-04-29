class Query {
    static #instance
    #method
    #entity
    #query

    static get() {
        if (!Query.#instance) {
            Query.#instance = new Query()
            Query.#instance.initializeProperties()
        }
        return Query.#instance
    }
    async initializeProperties() {
        this.#method = {
            GET: this.#get,
            POST: this.#post,
            PATCH: this.#patch,
            DELETE: this.#delete,
        }
        this.#entity = {
            users: ["user_uid", "email", "password", "username", "datetime"],
            user_conversation: ["user_uid", "conversation_uid"],
            conversations: ["conversation_uid", "dateTime"],
            messages: [
                "message_uid",
                "text",
                "dateTime",
                "user_uid",
                "conversation_uid",
            ],
        }
        this.#query = ""
    }

    build({ query, body, method, routerPath }) {
        this.#query = ""
        const entity = this.#urlParse(routerPath)
        const builder = this.#method[method]
        builder(entity, query, body)
        return this.#query + ";"
    }

    #get(entity, query, body) {
        console.log("get")
        this.#query = `SELECT`
        this.#select(this.#entity[entity], query)
        this.#query.concat(" ", `from ${entity}`)
        this.#where(this.#entity[entity], query)
        this.#sort(query)
        this.#paginate(query)
    }

    #post(entity, query, body) {
        console.log("post")
        this.#query = `INSERT INTO ${entity}`

        const insert = this.#genInsertHashMap(
            entity,
            this.#entity[entity],
            body
        )
        this.#genInsertString(insert)
    }

    #patch(entity, query, body) {
        console.log("patch")
        this.#query = `UPDATE ${entity} SET`
        this.#genUpdateString(entity, body)
    }

    #delete(entity, query, body) {
        console.log("delete")
        this.#query = `DELETE  FROM ${entity} WHERE ${entity}_uid = ${
            body[`${entity}_uid`]
        }`
    }

    #genUpdateString(entity, body) {
        const target = body[`${entity}_uid`]
        list = []
        for (const [key, value] of Object.entries(body)) {
            if (key === `${entity}_uid`) continue
            list.push(`${key}=${value}`)
        }
        this.#query =
            this.#query + `${list.join(", ")} WHERE ${entity}_uid = ${target}`
    }

    #genInsertHashMap(entity, fields, body) {
        const notIncluded = fields.filter(
            (element) => !Object.keys(body).includes(element)
        )

        let query = {}

        if (notIncluded.includes("dateTime")) {
            query.dateTime = "now()"
        }
        if (notIncluded.includes(`${entity}_uid`)) {
            query[`${entity}_uid`] = "uuid_generate_v4()"
        }

        return {
            ...query,
            ...body,
        }
    }

    #genInsertString(insert) {
        this.#query.concat(" ", `(${Object.keys(insert).join(",")})`)
        this.#query.concat(" ", "values")
        this.#query.concat(" ", `(${Object.values(insert).join(",")})`)
    }

    #urlParse(url) {
        let list = url.split("/")
        return list[list.length - 1]
    }

    #where(fields, query) {
        const intersection = Object.keys(query).filter((element) =>
            fields.includes(element)
        )
        if (intersection.length === 0) return

        let list = []
        for (const [key, value] of Object.entries(query)) {
            if (!fields.includes(key)) continue
            list.push(`${key}=${value}`)
        }

        this.#query = this.#query + " WHERE " + list.join(" AND ")
    }

    #sort({ sort }) {
        if (!sort) return

        const sortList = sort.split(",").map((element) => {
            if (Array.from(element)[0] === "-") return `${element} DESC`
            return `${element} ASC`
        })

        this.#query = this.#query + " ORDER BY " + sortList.join(", ")
    }

    #select(list, { select }) {
        if (!select) {
            this.#query = this.#query + " * "
            return
        }
        const selectList = select
            .split(",")
            .filter((element) => list.includes(element))

        this.#query.concat(" ", selectList.join(", "))
    }

    #paginate({ page, limit }) {
        const page = Number(page) || 1
        const limit = Number(limit) || 10
        const skip = (page - 1) * limit

        this.#query.concat(" ", `LIMIT ${limit} OFFSET ${skip}`)
    }
}

module.exports = Query
