import React, { Suspense } from 'react';
import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import Home from './pages/Home';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

setupIonicReact();

// Lazy load remotes
const WMSApp = React.lazy(() => import('wmsApp/App').catch(() => ({ default: () => <div>WMS Module Not Available</div> })));
const ASRSApp = React.lazy(() => import('asrsApp/App').catch(() => ({ default: () => <div>ASRS Module Not Available</div> })));

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        <Route exact path="/home">
          <Home />
        </Route>
        <Route path="/wms">
          <Suspense fallback={<div>Loading WMS...</div>}>
            <WMSApp />
          </Suspense>
        </Route>
        <Route path="/asrs">
          <Suspense fallback={<div>Loading ASRS...</div>}>
            <ASRSApp />
          </Suspense>
        </Route>
        <Route exact path="/">
          <Redirect to="/home" />
        </Route>
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);

export default App;
