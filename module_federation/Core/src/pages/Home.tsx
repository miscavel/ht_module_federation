import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton } from '@ionic/react';
import React from 'react';
import { useHistory } from 'react-router-dom';

const Home: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Core Application</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Core</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <h2>Welcome to Core App</h2>
        <p>This is the host application with Capacitor integration.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <IonButton onClick={() => history.push('/wms')}>Go to WMS Module</IonButton>
            <IonButton onClick={() => history.push('/asrs')}>Go to ASRS Module</IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
