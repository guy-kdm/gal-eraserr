import React, { Component } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity
} from 'react-native';
import { WebView } from 'react-native-webview';

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { injectedJavaScript: null };
    this.currentAction = null;
  }

  render() {
    return (
      <>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => this.startAction("requestInfo")}
        >
          <Text>Create Info File</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => this.startAction("downloadInfo")}
        >
          <Text>Download Existing Info File</Text>
        </TouchableOpacity>
        <WebView 
          ref={webview => this.webview = webview}
          source={{ uri: 'https://m.facebook.com/settings/'}}
          injectedJavaScript={ this.state.injectedJavaScript }
          onNavigationStateChange={(event) => this.onNavigationStateChange(event)}
          onMessage={({nativeEvent: nativeEvent}) => {
            let parsed = JSON.parse(nativeEvent.data);
            switch (parsed.state) {
              case 'log':
                console.log(parsed.log);
                break;
              case 'error':
                console.error(parsed.error);
                break;
            }          
          }}
        />
      </>
    );
  }

  onNavigationStateChange(event) {
    if (event.loading) {
      this.setState({injectedJavaScript: getInjectedJavascriptByActionAndUrl(this.currentAction, event.url)});
    } else {
      console.log(`URL: ${event.url}`);
    }
  }

  startAction(action) {
    this.currentAction = action;
    this.webview.reload();
    // this.webview.postMessage(JSON.stringify({action: action}));
  }
}

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

    // // Set media quality
    document.querySelector("[name='media_quality']").value = "VERY_LOW";
    document.querySelector("[name='media_quality']").dispatchEvent(new Event('change', {bubbles: true}));


    // Click create button
    document.querySelector("button[data-testid='dyi/sections/create']").click();
  }

  function simulation_common() {
    console.log = (msg) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ state: 'log', log: msg }));
    }
    console.error = (msg) => {
      window.ReactNativeWebView.postMessage(JSON.stringify({ state: 'error', error: msg }));
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
      } else if (url.includes('.facebook.com/login/')) {

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
      } else if (url.includes('.facebook.com/login/')) {
      
      } else {
        result += getFunctionBody(simulation_anyPage_gotoSettingsPage);
      }
      break;
  } 

  return result;
}

const styles = StyleSheet.create({  
  button: {
    alignItems: 'center',
    backgroundColor: 'greenyellow',
    padding: 10,
    borderWidth: 1,
    borderColor: 'black',
    margin: 4,
  },
});