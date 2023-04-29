class Query {
    static #instance
    #entity
    #query

    static get() {
        if (!Query.#instance) {
            Query.#instance = new Query()
            Query.#instance.initializeProperties()
        }
        return Query.#instance
    }

    initializeProperties() {
        this.#entity = {
            users: ["user_uid", "email", "password", "username", "datetime"],
            user_conversation: ["user_uid", "conversation_uid"],
            conversations: ["conversation_uid", "datetime"],
            messages: [
                "message_uid",
                "text",
                "datetime",
                "user_uid",
                "conversation_uid",
            ],
        }
        this.#query = ""
    }

    build({ query, body, method, routerPath, params: { id } }) {
        this.#query = ""
        const entity = this.#urlParse(method, routerPath)
        if (method === "GET") this.#get(entity, query)
        if (method === "POST") this.#post(entity, body)
        if (method === "PATCH") this.#patch(entity, id, body)
        if (method === "DELETE") this.#delete(entity, id)
        return this.#query + ";"
    }

    #get(entity, query) {
        this.#query = `SELECT`
        this.#select(this.#entity[entity], query)
        this.#push(`from ${entity}`)
        this.#where(this.#entity[entity], query)
        this.#sort(query)
        // this.#paginate(query)
    }

    #post(entity, body) {
        this.#query = `INSERT INTO ${entity}`

        const insert = this.#genInsertHashMap(
            entity,
            this.#entity[entity],
            body
        )
        this.#genInsertString(insert)
        this.#push(` RETURNING * `)
    }

    #patch(entity, id, body) {
        this.#query = `UPDATE ${entity} SET `
        this.#genUpdateString(entity, id, body)
        this.#push(` RETURNING * `)
    }

    #delete(entity, id) {
        this.#query = `DELETE FROM ${entity} WHERE ${this.#singularize(
            entity
        )}_uid = ${id}`
    }

    #genUpdateString(entity, id, body) {
        let list = this.#objToList(Object.entries(body), this.#entity[entity])
        this.#push(
            `${list.join(", ")} WHERE ${this.#singularize(
                entity
            )}_uid = '${id}'`
        )
    }

    #genInsertHashMap(entity, fields, body) {
        const notIncluded = this.#filter(
            fields,
            (element) => !Object.keys(body).includes(element)
        )

        let query = {}
        let id = `${this.#singularize(entity)}_uid`

        if (notIncluded.includes(id)) {
            query[id] = "uuid_generate_v4()"
        }
        if (notIncluded.includes("datetime")) {
            query.dateTime = "now()"
        }

        const objectMap = (obj, fn) =>
            Object.fromEntries(
                Object.entries(obj).map(([k, v], i) => [k, fn(v, k, i)])
            )

        const stringified = objectMap(body, (v) => `'${v}'`)
        return {
            ...query,
            ...stringified,
        }
    }

    #genInsertString(insert) {
        this.#push(
            ` (${this.#listToString(
                Object.keys(insert)
            )}) values (${this.#listToString(Object.values(insert))})`
        )
    }

    #urlParse(method, url) {
        let list = this.#stringToList(url, "/")
        if (method === "GET" || method === "POST") return list[list.length - 1]
        return list[list.length - 2]
    }

    #where(fields, query) {
        const intersection = this.#filter(Object.keys(query), (element) =>
            fields.includes(element)
        )
        if (intersection.length === 0) return

        let list = this.#objToList(Object.entries(query), fields)

        this.#push(` WHERE ${list.join(" AND ")}`)
    }

    #sort({ sort }) {
        if (!sort) return

        const sortList = this.#stringToList(sort, ",").map((element) => {
            if (Array.from(element)[0] === "-")
                return `${element.substring(1)} DESC`
            return `${element} ASC`
        })

        this.#push(` ORDER BY ${sortList.join(", ")}`)
    }

    #select(list, { select }) {
        if (!select) {
            this.#push(" * ")
            return
        }
        const selectList = this.#filter(
            this.#stringToList(select, ","),
            (element) => list.includes(element)
        )
        this.#push(` ${selectList.join(", ")} `)
    }

    #paginate({ page, limit }) {
        const depage = Number(page) || 1
        const delimit = Number(limit) || 10
        const skip = (depage - 1) * delimit

        this.#push(` LIMIT ${delimit} OFFSET ${skip} `)
    }

    #filter(list, callback) {
        return list.filter(callback)
    }

    #push(string) {
        this.#query = this.#query + string
    }

    #objToList(obj, fields) {
        let list = []
        for (const [key, value] of obj) {
            if (!fields.includes(key) || key === "datetime") continue
            list.push(`${key}='${value}'`)
        }
        return list
    }

    #listToString(list) {
        return list.join(", ")
    }

    #stringToList(list, delimiter) {
        return list.split(delimiter)
    }

    #singularize(entity) {
        return entity.slice(0, -1)
    }
}

module.exports = Query
