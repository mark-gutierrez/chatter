class QueryProxy {
    static #instance
    #builder
    #query

    static get() {
        if (!QueryProxy.#instance) {
            QueryProxy.#instance = new QueryProxy()
            QueryProxy.#instance.initializeProperties()
        }
        return QueryProxy.#instance
    }

    initializeProperties() {
        this.#builder = require("./query")
        this.#query = ""
    }

    resolve({ query, body, method, routerPath, params: { id } }) {
        this.#query = this.#builder()
        const model = this.#urlParse(routerPath)
        this.#query.model({ model })

        if (method === "GET") this.#get(model, query)
        if (method === "POST") this.#post(model, body)
        if (method === "PATCH") this.#patch(model, id, body)
        if (method === "DELETE") this.#delete(model, id)
        return this.#query.eval()
    }

    #get(model, { select, sort, page, limit, ...query }) {
        this.#query.select(
            select
                ? this.#modelObjectify(model, this.#stringToList(select))
                : {}
        )

        if (Object.keys(query).length > 0) {
            this.#query = this.#query.where(this.#modelObjectify(model, query))
        }

        if (sort)
            this.#query.sort(
                this.#modelObjectify(model, this.#stringToList(sort))
            )

        this.#paginate(page, limit)
    }

    #post(model, body) {
        const items = Object.keys(body).length > 0 ? [body] : []
        this.#query.insert({ items }).returning()
    }

    #patch(model, id, body) {
        this.#query
            .update(body)
            .where(
                this.#modelObjectify(
                    model,
                    this.#modelObjectify(`${this.#singularize(model)}_uid`, id)
                )
            )
            .returning()
    }

    #delete(model, id) {
        this.#query
            .delete()
            .where(
                this.#modelObjectify(
                    model,
                    this.#modelObjectify(`${this.#singularize(model)}_uid`, id)
                )
            )
            .returning()
    }

    #modelObjectify(model, items) {
        const obj = {}
        obj[model] = items
        return obj
    }

    #urlParse(url) {
        const list = this.#stringToList(url, "/")
        const entities = this.#query.getEntities()
        for (const item of list) {
            if (entities[item] !== undefined) return item
        }
    }

    #paginate(page, limit) {
        const depage = Number(page) || 1
        const delimit = Number(limit) || 10
        const skip = (depage - 1) * delimit
        this.#query.limit(delimit).offset(skip)
    }

    #stringToList(list = "", delimiter = ",") {
        return list === "" ? [] : list?.split(delimiter)
    }

    #singularize(entity) {
        return entity.slice(0, -1)
    }
}

module.exports = QueryProxy.get()

if (typeof require !== "undefined" && require.main === module) {
    const q = QueryProxy.get()

    const getQuery = q.resolve({
        query: {
            select: "user_uid,username",
            sort: "email,-datetime",
            page: 3,
            limit: 2,
            email: "mark.gtrez@gmail.com",
            username: "mark.gtrez",
        },
        body: {},
        method: "GET",
        routerPath: "/api/v1/users",
        params: { id: "grhbejkbfgjhb" },
    })

    const postQuery = q.resolve({
        query: {},
        body: {
            username: "user1",
            email: "user@gmail.com",
            password: "User1234!",
        },
        method: "POST",
        routerPath: "/api/v1/users",
        params: { id: "grhbejkbfgjhb" },
    })

    const updateQuery = q.resolve({
        query: {},
        body: {
            username: "user1",
            email: "user@gmail.com",
            password: "User1234!",
        },
        method: "PATCH",
        routerPath: "/api/v1/users/cfghjcgfhxghg",
        params: { id: "grhbejkbfgjhb" },
    })

    const deleteQuery = q.resolve({
        query: {},
        body: {},
        method: "DELETE",
        routerPath: "/api/v1/users/cfghjcjghcgh",
        params: { id: "grhbejkbfgjhb" },
    })

    console.log({ getQuery, postQuery, updateQuery, deleteQuery })
}
