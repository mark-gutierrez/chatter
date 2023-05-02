const bcrypt = require("bcryptjs")

class Encrypt {
    static #instance

    static get() {
        if (!Encrypt.#instance) {
            Encrypt.#instance = new Encrypt()
        }
        return Encrypt.#instance
    }

    async hash(password, saltworker = 10) {
        const salt = await bcrypt.genSalt(saltworker)
        const hashPassword = await bcrypt.hash(password, salt)
        return hashPassword
    }

    async compare(candidatePassword, comparingPassword) {
        const isMatch = await bcrypt.compare(
            candidatePassword,
            comparingPassword
        )
        return isMatch
    }
}

module.exports = Encrypt
