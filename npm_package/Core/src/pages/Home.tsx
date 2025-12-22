import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonButtons, IonMenuButton } from '@ionic/react';
import React from 'react';
import { useHistory } from 'react-router-dom';

const Home: React.FC = () => {
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Core Dashboard (NPM)</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Core</IonTitle>
          </IonToolbar>
        </IonHeader>
        
        <h2>Welcome to Core App (NPM Approach)</h2>
        <p>Select a module from the menu or use the quick links below.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <IonButton onClick={() => history.push('/app/wms')}>Go to WMS Module</IonButton>
            <IonButton onClick={() => history.push('/app/asrs')}>Go to ASRS Module</IonButton>
            <IonButton fill="outline" onClick={() => history.push('/app/profile')}>View Profile</IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
