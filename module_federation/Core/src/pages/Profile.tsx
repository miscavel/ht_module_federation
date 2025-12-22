import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonItem, IonLabel } from '@ionic/react';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { personCircle } from 'ionicons/icons';

const Profile: React.FC = () => {
  const history = useHistory();
  const user = localStorage.getItem('user') || 'Guest';

  const handleLogout = () => {
    localStorage.removeItem('user');
    history.push('/login');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardHeader>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <IonIcon icon={personCircle} size="large" />
                <IonCardTitle>{user}</IonCardTitle>
            </div>
          </IonCardHeader>
          <IonCardContent>
            <p>Role: Administrator</p>
            <p>Department: Operations</p>
            
            <IonButton expand="block" color="danger" className="ion-margin-top" onClick={handleLogout}>
              Logout
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
};

export default Profile;
