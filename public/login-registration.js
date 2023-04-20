const { useState, useEffect, useRef, Component } = React

function Offline() {
    const [page, setPage] = useState(true)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [testPassword, setTestPassword] = useState("")

    function handleLogin(e) {
        e.preventDefault()
        console.log("login")
        console.log(email)
        console.log(password)
    }

    function handleRegister(e) {
        e.preventDefault()

        if (!isEmail(email)) {
            alert("Invalid Email")
            return
        }
        if (!isValidPassword(password, testPassword)) {
            alert(
                `Password does not match or does not contain at least: 8 characters and at most 20 characters, one digit, one upper case alphabet,one lower case alphabet, one special character which includes !@#$%&*()-+=^. It must not contain any white space.`
            )
            return
        }

        console.log("register")
        console.log(email)
        console.log(password)
    }

    function isEmail(e_mail) {
        const regexp =
            /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        return regexp.test(String(e_mail).toLowerCase())
    }

    function isValidPassword(pass_word, test_password) {
        // It contains at least:
        // - 8 characters and at most 20 characters.
        // - one digit.
        // - one upper case alphabet.
        // - one lower case alphabet.
        // - one special character which includes !@#$%&*()-+=^.
        // It doesn’t contain any white space.
        const regex =
            /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&-+=()])(?=\\S+$).{8, 20}$/
        return regex.test(String(pass_word)) && pass_word === test_password
    }

    return (
        <div>
            <h1>{page ? "Login" : "Register"}</h1>

            <form onSubmit={page ? handleLogin : handleRegister}>
                <input
                    type="email"
                    name="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                {!page && (
                    <input
                        type="password"
                        name="confirm-password"
                        placeholder="Confirm Password"
                        value={testPassword}
                        onChange={(e) => setTestPassword(e.target.value)}
                    />
                )}
                <button
                    type="submit"
                    onClick={page ? handleLogin : handleRegister}
                >
                    {page ? "Log in" : "Register"}
                </button>
            </form>

            <button
                type="button"
                onClick={() => {
                    setPage(!page)
                }}
            >
                {page ? "Don't have an account?" : "Already have an account?"}
            </button>
        </div>
    )
}

class App extends Component {
    render() {
        return (
            <div>
                <Offline />
            </div>
        )
    }
}

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(<App />)
