import { IonContent, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonMenu, IonMenuToggle, IonNote } from '@ionic/react';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { homeOutline, homeSharp, personOutline, personSharp, cubeOutline, cubeSharp, constructOutline, constructSharp } from 'ionicons/icons';

interface AppPage {
  url: string;
  iosIcon: string;
  mdIcon: string;
  title: string;
}

const appPages: AppPage[] = [
  {
    title: 'Home',
    url: '/app/home',
    iosIcon: homeOutline,
    mdIcon: homeSharp
  },
  {
    title: 'Profile',
    url: '/app/profile',
    iosIcon: personOutline,
    mdIcon: personSharp
  },
  {
    title: 'WMS',
    url: '/app/wms',
    iosIcon: cubeOutline,
    mdIcon: cubeSharp
  },
  {
    title: 'ASRS',
    url: '/app/asrs',
    iosIcon: constructOutline,
    mdIcon: constructSharp
  }
];

const Menu: React.FC = () => {
  const location = useLocation();

  return (
    <IonMenu contentId="main" type="overlay">
      <IonContent>
        <IonList id="inbox-list">
          <IonListHeader>Core App</IonListHeader>
          <IonNote>hi@ionicframework.com</IonNote>
          {appPages.map((appPage, index) => {
            return (
              <IonMenuToggle key={index} autoHide={false}>
                <IonItem className={location.pathname === appPage.url ? 'selected' : ''} routerLink={appPage.url} routerDirection="none" lines="none" detail={false}>
                  <IonIcon slot="start" ios={appPage.iosIcon} md={appPage.mdIcon} />
                  <IonLabel>{appPage.title}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            );
          })}
        </IonList>
      </IonContent>
    </IonMenu>
  );
};

export default Menu;
