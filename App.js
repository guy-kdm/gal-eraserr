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
import {run} from './deleteBackupItems'



export default class App extends React.Component {
  actionsOrdered = ["login", "requestInfo", "waitForInfo", "downloadInfo"];

  constructor(props) {
    super(props);
    this.state = { 
      injectedJavaScript: null,
      currentAction: null,
      
      // Can insert email & pass here for quick testing, but be careful not to commit them...
      userEmail: "",
      userPass: "",
      isRunningFullCycle: false,
      dateRange: null
    };
  }

  componentDidMount(){
    run()
  }
  render() {
    return (
      <>
      <View style={styles.rootContainer}>
        <Text>Current Action: {this.state.currentAction || "none"}</Text>
        
        <TextInput
          placeholder="Facebook User (mobile number or email)"
          autoCompleteType="email"
          style={styles.textInput}
          onChangeText={text => this.setState({ userEmail: text })}
          value={this.state.userEmail}
        />
        <TextInput
          placeholder="Facebook Password"
          autoCompleteType="password"
          secureTextEntry={true}
          style={styles.textInput}
          onChangeText={text => this.setState({ userPass: text })}
          value={this.state.userPass}
        />
        <TextInput
          placeholder="Number of days back"
          style={styles.textInput}
          onChangeText={daysBack => this.setDateRangeByDaysBack(daysBack)}
          keyboardType="numeric"
        />
        <Text>Date Range: {
          (this.state.dateRange && this.state.dateRange.length >= 2) ?
          this.state.dateRange
            .map(date => date.toDateString())
            .join(' to ') :
          "unset"
        }</Text>
        {/* <TouchableOpacity 
          style={styles.button}
          onPress={() => this.startAction("requestInfo")}
        >
          <Text style={styles.buttonText}>Request Info File</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => this.startAction("waitForInfo")}
        >
          <Text style={styles.buttonText}>Wait for Info File</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => this.startAction("downloadInfo")}
        >
          <Text style={styles.buttonText}>Download Available Info File</Text>
        </TouchableOpacity> */}
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => this.startFullCycle()}
          disabled={!this.state.dateRange || !this.state.userPass}
        >
          <Text style={styles.buttonText}>Start</Text>
        </TouchableOpacity>
        
        <WebView
          ref={webview => this.webview = webview}
          source={{ uri: 'https://m.facebook.com/login/?fl'}}
          injectedJavaScript={ this.state.injectedJavaScript }
          onNavigationStateChange={event => this.onNavigationStateChange(event)}
          onMessage={event => this.handleMessageFromWebView(event)}
          style={styles.webView}
          onLoadProgress={event => this.onLoadProgress(event)}
        />
        </View>
      </>
    );
  }

  onLoadProgress(event) {
    console.log(`onLoadProgress: ${JSON.stringify(event.nativeEvent)}`);
    if (event.nativeEvent.progress == 1) {
      this.onUrlLoadedCheckDownloadInfoDone(this.loadingUrl);
    }
  }

  onUrlLoadedCheckDownloadInfoDone(url) {
    if (url && url.includes("://bigzipfiles.facebook.com")) {
      if (this.state.currentAction == "downloadInfo") {
        this.onActionDone({
          action: "downloadInfo"
        });
      }
    }
  }

  setDateRangeByDaysBack(daysBack) {
    let dateRange;
    if (daysBack === '' || isNaN(daysBack) || daysBack < 0) {
      dateRange = null;
    } else {
      dateRange = [
        new Date(Date.now() - 864e5 * daysBack),
        new Date(Date.now())
      ];
    }

    this.setState({
      dateRange: dateRange
    })
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
          this.onActionDone(parsed);
        } else {
          console.warn(`Reported 'Action Done' but isn't current action: ${parsed.action}`);
        }
        break;
    }          
  }

  startNextFullCycleAction() {
    let currentIndex = 0;
    if (this.state.currentAction) { 
      currentIndex = this.actionsOrdered.indexOf(this.state.currentAction);
      currentIndex++;
    }
    
    if (currentIndex < this.actionsOrdered.length) {
      this.startAction(this.actionsOrdered[currentIndex]);
    } else {
      console.log('Full cycle done');
      this.setState({
        currentAction: null,
        isRunningFullCycle: false
      });
    }
  }

  startFullCycle() {
    this.setState( {
      currentAction: null, 
      isRunningFullCycle: true
    } );
    this.startNextFullCycleAction();
  }

  onActionDone(data) {
    console.log(`Action Done: ${data.action}`);

    if (!this.state.isRunningFullCycle) {
      this.setState( { currentAction: null } );
    } else {
      this.startNextFullCycleAction();
    }
  }

  onNavigationStateChange(event) {
    if (event.loading) {
      console.log(`URL Loading: ${event.url}`);
      this.loadingUrl = event.url;
      this.setState({
        injectedJavaScript: userSimulator.getInjectedJavascriptByActionAndUrl(event.url, this.state.currentAction, {
          dateRange: this.state.dateRange
        })
      });
    } else {
      console.log(`URL Loaded: ${event.url}`);
      this.onUrlLoadedCheckDownloadInfoDone(event.url);
      this.loadingUrl = null;
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
  
  function getInjectedJavascriptByActionAndUrl(url, action, params) {
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

    function simulation_anyPage_checkIsLoggedIn() {
      if (document.cookie.includes("; c_user=")) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ 
          messageType: 'actionDone',
          action: "login",
        }));

        return;      
      }
    }
      
    function simulation_anyPage_gotoLoginPage() {
      window.location.href = "https://m.facebook.com/login/?fl";
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
      document.querySelector("select[name='date']").value = "custom";
      document.querySelector("select[name='date']").dispatchEvent(new Event('change', {bubbles: true}));
      modifyDateInput(document.querySelectorAll("input[type='date']")[0], "{{dateRangeStart}}");
      modifyDateInput(document.querySelectorAll("input[type='date']")[1], "{{dateRangeEnd}}");
  
      // Set media quality
      document.querySelector("[name='media_quality']").value = "VERY_LOW";
      document.querySelector("[name='media_quality']").dispatchEvent(new Event('change', {bubbles: true}));
  
      // Click create button
      document.querySelector("button[data-testid='dyi/sections/create']").click();

      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        messageType: 'actionDone', 
        action: "requestInfo",
      }));
    }

    function simulation_dyiPage_waitForPendingInfo() {
      let isLatestRequestStillBeingCreated = 
        document.querySelector("[data-testid='dyi/archives'] > div:first-child").children.length == 0;

      if (isLatestRequestStillBeingCreated) {
        setTimeout(() => {
          window.location.reload();
        }, 10000);
      } else {
        window.ReactNativeWebView.postMessage(JSON.stringify({ 
          messageType: 'actionDone', 
          action: "waitForInfo",
        }));
      }
    }

    function simulation_loginPage_login() {
      document.querySelector("#login_form input[name='email']").value = "{{email}}";
      document.querySelector("#login_form input[name='pass']").value = "{{password}}";
      document.querySelector("#login_form button[name='login']").click();
    }
  
    function simulation_reauthPage_login() {
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

      // source: https://github.com/facebook/react/issues/11488
      function modifyDateInput(input, newValue) {
        let lastValue = input.value;
        input.value = newValue;
        let event = new Event('input', { bubbles: true });
        // hack React15
        event.simulated = true;
        // hack React16
        let tracker = input._valueTracker;
        if (tracker) {
          tracker.setValue(lastValue);
        }
        input.dispatchEvent(event);
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

    const dateToStringFormat = date => date.toISOString().slice(0, 10);
  
    let result = "";
  
    result += getFunctionBody(simulation_common);
  
    switch (action) {
      case "login":
        result += getFunctionBody(simulation_anyPage_checkIsLoggedIn);

        if (url.includes('.facebook.com/login/?fl')) {
          result += getFunctionBody(simulation_loginPage_login)
            .replace("{{email}}", email)
            .replace("{{password}}", pass);
        } else {
          result += getFunctionBody(simulation_anyPage_gotoLoginPage);
        }
        break;
      case "downloadInfo":
        if (url.includes('.facebook.com/settings/')) {
          result += getFunctionBody(simulation_settingsPage_gotoDyiPage);
        } else if (url.includes('.facebook.com/dyi/')) {
          result += getFunctionBody(simulation_dyiPage_downloadInfo);
        } else if (url.includes('.facebook.com/login/reauth.php')) {
          result += getFunctionBody(simulation_reauthPage_login).replace("{{password}}", pass);
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
            .replace("{{dateRangeStart}}", dateToStringFormat(params.dateRange[0]))
            .replace("{{dateRangeEnd}}", dateToStringFormat(params.dateRange[1]));
        } else if (url.includes('.facebook.com/login/reauth.php')) {
          result += getFunctionBody(simulation_reauthPage_login).replace("{{password}}", pass);
        } else {
          result += getFunctionBody(simulation_anyPage_gotoSettingsPage);
        }
        break;
      case "waitForInfo":
        if (url.includes('.facebook.com/settings/')) {
          result += getFunctionBody(simulation_settingsPage_gotoDyiPage);
        } else if (url.includes('.facebook.com/dyi/')) {
          result += getFunctionBody(simulation_dyiPage_waitForPendingInfo)
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