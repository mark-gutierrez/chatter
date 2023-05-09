function entityBuild(model) {
    let obj = {}
    Object.keys(model).forEach((key) => {
        obj[key] = model[key]()
    })
    return obj
}

class Query {
    #model
    #fields
    #entities

    constructor() {
        this.query = ""
        this.#model = ""
        this.#fields = ""
        this.#entities = entityBuild(require("../schemas/models"))
    }

    model(model) {
        this.query = ""
        const fields = this.#entities[model]
        if (!fields) throw new Error("Invalid model")
        this.#model = model
        this.#fields = fields
        return this
    }

    find(obj = {}) {
        this.#isValidFields(obj, "find")
        this.query = `SELECT * FROM ${this.#model}`
        if (Object.keys(obj).length > 0) {
            this.where(obj)
        }
        return this
    }

    insert(obj = {}) {
        this.#isValidFields(obj, "insert")
        const init = `INSERT INTO ${this.#model}`
        this.query =
            Object.keys(obj).length === 0
                ? `${init} DEFAULT VALUES`
                : `${init} ${this.#genInsert(obj)}`
        return this
    }

    update(obj = {}) {
        this.#isValidFields(obj, "update")
        if (Object.keys(obj).length === 0)
            throw new Error("Empty object to update")
        this.query = `UPDATE ${this.#model} SET ${this.#filter(obj)}`
        return this
    }

    delete(obj = {}) {
        this.#isValidFields(obj, "delete")
        this.query = `DELETE FROM ${this.#model}`
        this.where(obj)
        return this
    }

    where(obj = {}) {
        this.#isValidFields(obj, "where")
        const whereQuery =
            Object.keys(obj).length > 0
                ? `WHERE ${this.#filter(obj, " AND ")}`
                : ""
        this.query = `${this.query} ${whereQuery}`
        return this
    }

    select(list = []) {
        if (list.length === 0) return this
        this.#isValidFields(list, "select")
        this.query = this.query.replace(" * ", ` ${this.#listToString(list)} `)
        return this
    }

    returning(list = []) {
        this.#isValidFields(list, "returning")
        let init = `${this.query} RETURNING`
        this.query =
            list.length === 0
                ? `${init} *`
                : `${init} ${this.#listToString(list)}`
        return this
    }

    sort(list = []) {
        this.#isValidFields(
            list.map((e) => e.replace("-", "")),
            "sort"
        )
        this.query = `${this.query} ${
            list.length > 0
                ? `ORDER BY${list.map((e) =>
                      Array.from(e)[0] === "-"
                          ? ` ${e.substring(1)} DESC`
                          : ` ${e} ASC`
                  )}`
                : ""
        }`
        return this
    }

    limit(limit = 10) {
        this.query = `${this.query} LIMIT ${limit}`
        return this
    }

    offset(skip = 0) {
        this.query = `${this.query} OFFEST ${skip}`
        return this
    }

    #genInsert(obj = {}) {
        let fields = []
        let values = []
        for (const [key, value] of Object.entries(obj)) {
            fields.push(key)
            values.push(`"${value}"`)
        }

        return `(${this.#listToString(fields)}) VALUES (${this.#listToString(
            values
        )})`
    }

    #listToString(list = []) {
        return list.join(", ")
    }

    #isValidFields(args, method) {
        if (typeof args === "object" && !Array.isArray(args) && args !== null) {
            if (!this.#isValidObjFields(args))
                throw new Error(`Invalid field in object to ${method}`)
        } else {
            if (!this.#isValidListFields(args))
                throw new Error(`Invalid field in list to ${method}`)
        }
    }

    #isValidListFields(list = []) {
        for (let i = 0; i < list.length; i++) {
            if (!Object.keys(this.#fields).includes(list[i])) return false
        }
        return true
    }

    #isValidObjFields(obj = {}) {
        for (const [key, value] of Object.entries(obj)) {
            if (!Object.keys(this.#fields).includes(key)) return false
        }
        return true
    }

    #filter(obj, delimiter = ", ") {
        let { datetime, ...rest } = obj
        let query = []
        for (const [key, value] of Object.entries(rest)) {
            query.push(`${key} = '${value}'`)
        }

        if (datetime) {
            let dateTimeQuery = []
            const dateTimeFilters = {
                gt: ">",
                gte: ">=",
                lt: "<",
                lte: "<=",
                eq: "=",
            }
            datetime = JSON.parse(datetime)
            for (const [key, value] of Object.entries(datetime)) {
                dateTimeQuery.push(
                    `datetime ${dateTimeFilters[key]} '${value}'`
                )
            }
            query = [...query, ...dateTimeQuery]
        }

        return query.join(delimiter)
    }

    eval() {
        return this.query + ";"
    }
}

module.exports = Query
