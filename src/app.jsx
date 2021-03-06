import React from "react";
import ReactDOM from "react-dom";
import AppContainer from "./containers/app.container";

import "./styles/global.scss";

class App extends React.Component {
  render() {
    return <AppContainer />;
  }
}

ReactDOM.render(<App />, document.getElementById("root"));
