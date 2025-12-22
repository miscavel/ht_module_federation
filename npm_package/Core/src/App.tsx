import React from 'react';
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact, IonSplitPane } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Menu from './components/Menu';
import { WMSApp } from 'npm-wms';
import { ASRSApp } from 'npm-asrs';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

setupIonicReact();

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        <Route exact path="/login">
          <Login />
        </Route>
        <Route path="/app" render={() => (
          <IonSplitPane contentId="main">
            <Menu />
            <IonRouterOutlet id="main">
              <Route exact path="/app/home">
                <Home />
              </Route>
              <Route exact path="/app/profile">
                <Profile />
              </Route>
              <Route path="/app/wms">
                <WMSApp />
              </Route>
              <Route path="/app/asrs">
                <ASRSApp />
              </Route>
              <Route exact path="/app">
                <Redirect to="/app/home" />
              </Route>
            </IonRouterOutlet>
          </IonSplitPane>
        )} />
        <Route exact path="/">
          <Redirect to="/login" />
        </Route>
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);

export default App;
