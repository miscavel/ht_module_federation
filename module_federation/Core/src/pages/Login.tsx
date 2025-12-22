import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonItem, IonLabel, IonInput, IonCard, IonCardContent } from '@ionic/react';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';

const Login: React.FC = () => {
  const history = useHistory();
  const [username, setUsername] = useState('');

  const handleLogin = () => {
    // Mock login
    if (username) {
      localStorage.setItem('user', username);
      history.push('/app/home');
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Login</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <IonCard style={{ width: '100%', maxWidth: '400px' }}>
            <IonCardContent>
              <IonItem>
                <IonLabel position="stacked">Username</IonLabel>
                <IonInput value={username} onIonChange={e => setUsername(e.detail.value!)} placeholder="Enter username" />
              </IonItem>
              <IonButton expand="block" className="ion-margin-top" onClick={handleLogin}>
                Login
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Login;
