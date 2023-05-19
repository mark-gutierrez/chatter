const Builder = require("./query-builder")

class RequestToQuerySingleton {
    static #instance
    #builder
    #query

    static get() {
        if (!RequestToQuerySingleton.#instance) {
            RequestToQuerySingleton.#instance = new RequestToQuerySingleton()
            RequestToQuerySingleton.#instance.initializeProperties()
        }
        return RequestToQuerySingleton.#instance
    }

    initializeProperties() {
        this.#builder = Builder
        this.#query = ""
    }

    build({ query, body, method, routerPath, params: { id } }) {
        this.#query = ""
        const entity = this.#urlParse(routerPath)
        if (method === "GET") this.#get(entity, query)
        if (method === "POST") this.#post(entity, body)
        if (method === "PATCH") this.#patch(entity, id, body)
        if (method === "DELETE") this.#delete(entity, id)
        return this.#query.eval()
    }

    #get(entity, { select, sort, page, limit, ...query }) {
        this.#query = this.#builder.model(entity).find(query)

        if (select) {
            this.#query = this.#query.select(this.#stringToList(select))
        }

        if (sort) {
            this.#query = this.#query.sort(this.#stringToList(sort))
        }

        this.#paginate(page, limit)
    }

    #post(entity, body) {
        this.#query = this.#builder.model(entity).insert(body).returning()
    }

    #patch(entity, id, body) {
        this.#query = this.#builder
            .model(entity)
            .update(body)
            .where(this.#getId(entity, id))
            .returning()
    }

    #delete(entity, id) {
        this.#query = this.#builder
            .model(entity)
            .delete(this.#getId(entity, id))
            .returning()
    }

    #getId(entity, id) {
        let obj = {}
        obj[`${this.#singularize(entity)}_uid`] = id
        return obj
    }

    #urlParse(url) {
        let list = this.#stringToList(url, "/")
        return list.filter(
            (element) => this.#builder.getEntities()[element] !== undefined
        )[0]
    }

    #paginate(page, limit) {
        const depage = Number(page) || 1
        const delimit = Number(limit) || 10
        const skip = (depage - 1) * delimit
        this.#query = this.#query.limit(delimit).offset(skip)
    }

    #stringToList(list, delimiter = ",") {
        return list.split(delimiter)
    }

    #singularize(entity) {
        return entity.slice(0, -1)
    }
}

if (typeof require !== "undefined" && require.main === module) {
    const r = RouteResolverSingleton.get()
    console.log(
        r.build({
            query: { username: "mark" },
            method: "GET",
            routerPath: "/users",
            params: {},
        })
    )
}

module.exports = RequestToQuerySingleton.get()
