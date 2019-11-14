import React, { Component } from 'react';
import {
  StyleSheet,
  ScrollView,
  TextInput,
  View,
  Text,
  TouchableOpacity
} from 'react-native';
import { WebView } from 'react-native-webview';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      injectedJavaScript: null,
      currentAction: null,
      
      // Can insert email & pass here for quick testing, but be careful not to commit them...
      userEmail: "",
      userPass: ""
    };
  }

  render() {
    return (
      <>
      <View style={styles.rootContainer}>
        <Text>Current Action: {this.state.currentAction || "none"}</Text>
        
        {/* <TextInput
          placeholder="email"
          autoCompleteType="email"
          style={styles.textInput}
          onChangeText={text => this.setState({ userEmail: text })}
          value={this.state.userEmail}
        /> */}
        <TextInput
          placeholder="Facebook Password (for reauth)"
          autoCompleteType="password"
          secureTextEntry={true}
          style={styles.textInput}
          onChangeText={text => this.setState({ userPass: text })}
          value={this.state.userPass}
        />
        <TouchableOpacity 
          style={styles.button}
          onPress={() => this.startAction("requestInfo")}
        >
          <Text style={styles.buttonText}>Create Info File</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => this.startAction("downloadInfo")}
        >
          <Text style={styles.buttonText}>Download Existing Info File</Text>
        </TouchableOpacity>
        <WebView           
          ref={webview => this.webview = webview}
          source={{ uri: 'https://m.facebook.com/settings/'}}
          injectedJavaScript={ this.state.injectedJavaScript }
          onNavigationStateChange={event => this.onNavigationStateChange(event)}
          onMessage={event => this.handleMessageFromWebView(event)}
          style={styles.webView}
        />
        </View>
      </>
    );
  }

  componentDidUpdate(prevProps, prevState) {
    userSimulator.setEmailAndPass(this.state.userEmail, this.state.userPass);
  }

  handleMessageFromWebView({nativeEvent: nativeEvent}) {
    let parsed = JSON.parse(nativeEvent.data);
    switch (parsed.messageType) {
      case 'log':
        console.log(parsed.log);
        break;
      case 'error':
        console.error(parsed.error);
        break;
      case 'actionDone':
        if (parsed.action == this.state.currentAction) {
          this.setState( {currentAction: null } );
          console.log(`Action Done: ${parsed.action}`);
        } else {
          console.warn(`Reported 'Action Done' but isn't current action: ${parsed.action}`);
        }
        break;
    }          
  }

  onNavigationStateChange(event) {
    if (event.loading) {
      if (event.url.includes("bigzipfiles.facebook.com")) {
        if (this.state.currentAction == "downloadInfo") {
          this.setState( { currentAction: null } );
        }
      }

      this.setState({injectedJavaScript: userSimulator.getInjectedJavascriptByActionAndUrl(this.state.currentAction, event.url)});
    } else {
      console.log(`URL Loaded: ${event.url}`);
    }
  }

  startAction(action) {
    this.setState( { currentAction: action } );
    this.webview.reload();
    // this.webview.postMessage(JSON.stringify({action: action}));
  }
}

const userSimulator = (function initUserSimulator() {
  let email = "";
  let pass = "";

  function getFunctionBody(func) {
    let funcStr = func.toString();
    return funcStr.slice(funcStr.indexOf("{") + 1, funcStr.lastIndexOf("}"));
  }
  
  function getInjectedJavascriptByActionAndUrl(action, url) {
    function simulation_settingsPage_gotoDyiPage() {
      let fullAddr = document.querySelector("a[href*='.facebook.com/dyi/']").getAttribute("href");
      if (fullAddr) {
        window.location.href = fullAddr;
      } else {
        console.error("couldn't get info-download url");
      }
    }
  
    function simulation_dyiPage_downloadInfo() {
      let downloadButton = document.querySelector("button[data-testid*='download'][type='submit']");
      if (downloadButton) {
        downloadButton.click();
      } else {
        console.error("couldn't find the download button");
      }
    }
      
    function simulation_anyPage_gotoSettingsPage() {
      window.location.href = "https://m.facebook.com/settings/";
    }
  
    function simulation_dyiPage_requestInfo() {
      // Deselect all sections
      document.querySelector("[data-testid='dyi/sections/selectall']").click();
      // Select posts only
      document.querySelector("[data-testid='dyi/sections/posts']").click();
  
      // Set custom date
      const DAYS_BACK = 3;
      document.querySelector("select[name='date']").value = "custom";
      document.querySelector("select[name='date']").dispatchEvent(new Event('change', {bubbles: true}));
      document.querySelectorAll("input[type='date']")[0].value = new Date(Date.now() - 864e5 * DAYS_BACK).toISOString().slice(0,10);
      document.querySelectorAll("input[type='date']")[1].value = new Date(Date.now()).toISOString().slice(0,10);
  
      // Set media quality
      document.querySelector("[name='media_quality']").value = "VERY_LOW";
      document.querySelector("[name='media_quality']").dispatchEvent(new Event('change', {bubbles: true}));
  
      // Click create button
      document.querySelector("button[data-testid='dyi/sections/create']").click();
  
      window.ReactNativeWebView.postMessage(JSON.stringify({ messageType: 'actionDone', action: "requestInfo" }));
    }
  
    function simulation_login_reauth() {
      document.querySelector("form[action*='reauth'] input[name='pass']").value = "{{password}}";
      document.querySelector("form[action*='reauth'] input[type='submit'][data-testid='sec_ac_button']").click();
    }
  
    function simulation_common() {
      console.log = (msg) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ messageType: 'log', log: msg }));
      }
      console.error = (msg) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ messageType: 'error', error: msg }));
      }
  
      // document.addEventListener("message", function(e) {
      //   let parsed = JSON.parse(e.data);
      //   switch (parsed.action) {
      //     case "downloadInfo":
      //         downloadInfo();
      //       break;
      //   }
      // });
    }
  
    let result = "";
  
    result += getFunctionBody(simulation_common);
  
    switch (action) {
      case "downloadInfo":
        if (url.includes('.facebook.com/settings/')) {
          result += getFunctionBody(simulation_settingsPage_gotoDyiPage);
        } else if (url.includes('.facebook.com/dyi/')) {
          result += getFunctionBody(simulation_dyiPage_downloadInfo);
        } else if (url.includes('.facebook.com/login/reauth.php')) {
          result += getFunctionBody(simulation_login_reauth).replace("{{password}}", pass);;
        } else if (url.includes('bigzipfiles.facebook.com')) {
          
        } else {
          result += getFunctionBody(simulation_anyPage_gotoSettingsPage);
        }
        break;
      case "requestInfo":
        if (url.includes('.facebook.com/settings/')) {
          result += getFunctionBody(simulation_settingsPage_gotoDyiPage);
        } else if (url.includes('.facebook.com/dyi/')) {
          result += getFunctionBody(simulation_dyiPage_requestInfo)
        } else if (url.includes('.facebook.com/login/reauth.php')) {
          result += getFunctionBody(simulation_login_reauth).replace("{{password}}", pass);
        } else {
          result += getFunctionBody(simulation_anyPage_gotoSettingsPage);
        }
        break;
    }

    console.log("Injected Code:");
    console.log(result);
  
    return result;
  }

  function setEmailAndPass(newEmail, newPass) {
    email = newEmail;
    pass = newPass;
  }

  return {
    getInjectedJavascriptByActionAndUrl: getInjectedJavascriptByActionAndUrl,
    setEmailAndPass: setEmailAndPass,
  }
})();


const styles = StyleSheet.create({  
  button: {
    alignItems: 'center',
    backgroundColor: 'greenyellow',
    padding: 10,
    borderWidth: 1,
    borderColor: 'black',
    marginTop: 4,
  },
  buttonText: {
    fontSize: 20,
    // fontWeight: "bold",
  },
  rootContainer: {
    padding: 4,
    height: "100%",
  },
  webView: {
    marginTop: 4,
  },
  textInput: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1
  }
});