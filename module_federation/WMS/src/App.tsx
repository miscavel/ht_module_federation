import React, { Suspense } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';

// Lazy load shared component from Core
const SharedNotification = React.lazy(() => import('coreApp/SharedNotification').catch(() => ({ default: () => <div>Shared Component Not Available</div> })));

const App: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>WMS Module</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Warehouse Management System</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>This is the WMS module loaded via Module Federation.</p>
            <p>It uses Ionic components but relies on Core for native interactions.</p>
            
            <div style={{ marginTop: '20px' }}>
              <h3>Interaction with Core:</h3>
              <Suspense fallback={<div>Loading Shared Component...</div>}>
                <SharedNotification message="Hello from WMS!" />
              </Suspense>
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default App;
