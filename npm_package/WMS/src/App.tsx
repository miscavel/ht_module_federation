import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';

// In NPM approach, we might pass shared components as props or context
// For simplicity, we'll assume it's passed as a prop or we just render a placeholder
interface WMSAppProps {
    SharedNotification?: React.ComponentType<{ message: string }>;
}

const App: React.FC<WMSAppProps> = ({ SharedNotification }) => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>WMS Module (NPM)</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Warehouse Management System</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>This is the WMS module loaded via NPM Package.</p>
            <p>It uses Ionic components but relies on Core for native interactions.</p>
            
            <div style={{ marginTop: '20px' }}>
              <h3>Interaction with Core:</h3>
              {SharedNotification ? (
                  <SharedNotification message="Hello from WMS (NPM)!" />
              ) : (
                  <div>Shared Notification Component not provided</div>
              )}
            </div>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default App;
