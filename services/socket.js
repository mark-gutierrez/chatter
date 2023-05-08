class Socket {
    static #instance
    #convo

    static get() {
        if (!Socket.#instance) {
            Socket.#instance = new Socket()
            Socket.#instance.initializeProperties()
        }
        return Socket.#instance
    }

    initializeProperties() {
        this.#convo = {}
    }
}

module.exports = Socket
