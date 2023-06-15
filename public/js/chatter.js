const { useState, useEffect, useRef, Component } = React
const socket = new WebSocket(
    (window.location.protocol === "https:" ? "wss://" : "ws://") +
        window.location.host
)
const seenStorage = JSON.parse(localStorage.getItem("seen")) || {}

function Online() {
    const [username, setUsername] = useState("")
    const [userConvos, setUserConvos] = useState({})
    const [convoData, setConvoData] = useState({})
    const [convoWith, setConvoWith] = useState({
        username: "",
        conversation_uid: "",
    })
    const [messages, setMessages] = useState([])
    const [text, setText] = useState("")
    const [searchedUsers, setSearchedUsers] = useState([])
    const [seen, setSeen] = useState({})

    socket.onopen = function (event) {
        socket.send(JSON.stringify({ type: "init" }))
    }

    socket.onmessage = function (message) {
        const data = JSON.parse(message.data)

        if (data.type === "init") {
            setUsername(data.username)
            const { userConvos, userMessages } = data
            let obj = {}
            let obj1 = {}
            let obj2 = {}

            for (let { conversation_uid, username } of userConvos) {
                obj[conversation_uid] = obj[conversation_uid] || username
                obj1[conversation_uid] = obj1[conversation_uid] || []
                obj2[conversation_uid] = obj2[conversation_uid] || 0
            }

            for (let message of userMessages) {
                obj1[message.conversation_uid].push(message)
            }

            for (let [key, value] of Object.entries(seenStorage)) {
                obj2[key] = value
            }

            setUserConvos(obj)
            setConvoData(obj1)
            setSeen(obj2)
        }

        if (data.type === "sendMessage") {
            updateMessages(data.message)
        }

        if (data.type === "searchUser") {
            setSearchedUsers(data.users)
        }

        if (data.type === "addNewChatter") {
            updateConvos(data.newConvo[0])
        }
    }

    function updateConvos(newConvo) {
        const { username, conversation_uid } = newConvo
        const newConvoData = JSON.parse(JSON.stringify(convoData))
        newConvoData[conversation_uid] = []
        setConvoData(newConvoData)
        const newUserConvo = JSON.parse(JSON.stringify(userConvos))
        newUserConvo[conversation_uid] = username
        setUserConvos(newUserConvo)
        const obj = { ...seen }
        obj[conversation_uid] = 0
        setSeen(obj)
        localStorage.setItem("seen", JSON.stringify(obj))
        socket.send(
            JSON.stringify({
                type: "addNewConvo",
                data: conversation_uid,
            })
        )
    }

    function updateMessages(data) {
        const { conversation_uid } = data
        const conversations = JSON.parse(JSON.stringify(convoData))
        conversations[conversation_uid].push(data)
        setConvoData(conversations)
        if (conversation_uid === convoWith.conversation_uid) {
            setMessages([...messages, data])
            const obj = { ...seen }
            obj[conversation_uid] = convoData[conversation_uid].length + 1
            setSeen(obj)
            localStorage.setItem("seen", JSON.stringify(obj))
        }
    }

    function handleClickConversation(e) {
        e.preventDefault()

        const { innerText: username, value: conversation_uid } = e.target
        if (
            convoWith.username === username &&
            convoWith.conversation_uid === conversation_uid
        ) {
            setConvoWith({
                username: "",
                conversation_uid: "",
            })
            setMessages([])
        } else {
            setConvoWith({
                username,
                conversation_uid,
            })
            setMessages(convoData[conversation_uid])
        }

        const obj = { ...seen }
        obj[conversation_uid] = convoData[conversation_uid].length
        setSeen(obj)
        localStorage.setItem("seen", JSON.stringify(obj))
    }

    function handleSubmitMessage(e) {
        e.preventDefault()

        if (text.length === 0) return

        socket.send(
            JSON.stringify({
                type: "sendMessage",
                data: {
                    conversation_uid: convoWith.conversation_uid,
                    text,
                },
            })
        )
        setText("")
    }

    return (
        <div>
            <nav>
                <h1>Hi {username}</h1>
                <Navbar />
            </nav>
            <main>
                <section>
                    <SearchUser
                        searchedUsers={searchedUsers}
                        setSearchedUsers={setSearchedUsers}
                    />
                    <h2>Chatters</h2>
                    <ul>
                        {Object.keys(userConvos).length > 0 &&
                            Object.entries(userConvos).map(
                                ([conversation_uid, username]) => (
                                    <li key={conversation_uid}>
                                        <button
                                            onClick={handleClickConversation}
                                            value={conversation_uid}
                                        >
                                            {username}
                                            {convoData[conversation_uid]
                                                .length !==
                                                seen[conversation_uid] &&
                                                " new"}
                                        </button>
                                    </li>
                                )
                            )}
                    </ul>
                </section>
                <section>
                    <div>
                        {convoWith.username !== "" && (
                            <h2>{convoWith.username}</h2>
                        )}
                    </div>
                    <div className="messages">
                        <div className="messages-1">
                            <ul>
                                {messages.length > 0 &&
                                    messages.map(
                                        ({ message_uid, text, username }) => (
                                            <li key={message_uid}>
                                                {username}: {text}
                                            </li>
                                        )
                                    )}
                            </ul>
                        </div>
                    </div>
                    <div className="input-container">
                        {convoWith.username !== "" && (
                            <form onSubmit={handleSubmitMessage}>
                                <input
                                    className="input"
                                    type="text"
                                    name="text"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                ></input>
                            </form>
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}

function SearchUser({ searchedUsers, setSearchedUsers }) {
    const [searchUsersButton, setSearchUsersButton] = useState(false)
    const [searchUsers, setSearchUsers] = useState("")

    function handleClickNewChatter(e) {
        e.preventDefault()
        setSearchUsersButton(!searchUsersButton)
        setSearchUsers("")
        setSearchedUsers([])
    }

    function handleSubmitSearchUsers(e) {
        e.preventDefault()

        socket.send(
            JSON.stringify({
                type: "searchUser",
                data: searchUsers,
            })
        )
    }

    function addNewChatter(e) {
        e.preventDefault()

        socket.send(
            JSON.stringify({
                type: "addNewChatter",
                data: { user_uid: e.target.value },
            })
        )

        setSearchUsersButton(!searchUsersButton)
        setSearchUsers("")
        setSearchedUsers([])
    }

    return (
        <div className="full-width">
            <button type="button" onClick={handleClickNewChatter}>
                {searchUsersButton ? "-" : "+"} New Chatter
            </button>
            {searchUsersButton && (
                <form onSubmit={handleSubmitSearchUsers}>
                    <input
                        type="text"
                        name="text"
                        value={searchUsers}
                        onChange={(e) => setSearchUsers(e.target.value)}
                    ></input>
                </form>
            )}
            {searchUsersButton && (
                <div className="searchUsers">
                    <ul>
                        {searchedUsers.length > 0 &&
                            searchedUsers.map(({ user_uid, username }) => {
                                return (
                                    <li key={user_uid}>
                                        <button
                                            onClick={addNewChatter}
                                            value={user_uid}
                                        >
                                            + {username}
                                        </button>
                                    </li>
                                )
                            })}
                    </ul>
                </div>
            )}
        </div>
    )
}

function Navbar() {
    async function logout(e) {
        e.preventDefault()
        const { loggedOut } = await fetch("/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
        }).then((data) => data.json())
        if (loggedOut === true) {
            window.location.replace("/")
        }
    }
    return (
        <ol>
            <li>
                <button type="button" onClick={logout}>
                    Logout
                </button>
            </li>
        </ol>
    )
}

class App extends Component {
    render() {
        return (
            <div>
                <Online />
            </div>
        )
    }
}

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(<App />)
