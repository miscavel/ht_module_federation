import React from 'react';
import { IonButton, useIonAlert } from '@ionic/react';

export const SharedNotification: React.FC<{ message: string }> = ({ message }) => {
  const [presentAlert] = useIonAlert();

  return (
    <IonButton
      onClick={() =>
        presentAlert({
          header: 'Notification',
          message: message,
          buttons: ['OK'],
        })
      }
    >
      Show Notification
    </IonButton>
  );
};
