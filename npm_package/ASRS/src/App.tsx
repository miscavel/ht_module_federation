import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';

// In NPM approach, we might pass shared components as props or context
interface ASRSAppProps {
    SharedNotification?: React.ComponentType<{ message: string }>;
}

const App: React.FC<ASRSAppProps> = ({ SharedNotification }) => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="secondary">
          <IonTitle>ASRS Module (NPM)</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Robotics Control System (ASRS)</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>This is the ASRS module loaded via NPM Package.</p>
            <p>It interacts with robotic backend and depends on Core and WMS.</p>
            
            <div style={{ marginTop: '20px' }}>
              <h3>Interaction with Core:</h3>
              {SharedNotification ? (
                  <SharedNotification message="Hello from ASRS (NPM)!" />
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
