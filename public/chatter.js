const { useState, useEffect, useRef, Component } = React

function Online() {
    return <div></div>
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
