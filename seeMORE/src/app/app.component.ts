import { Component } from '@angular/core';

import { Platform } from '@ionic/angular';
import { AlertController } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import {  NavController } from '@ionic/angular' ;
import { MenuController } from '@ionic/angular';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    public alertController: AlertController,
    public navCtrl: NavController,
    private menu: MenuController,
) {
    this.initializeApp();
    }
  
  

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }
  async presentAlertConfirm() {
    const alert = await this.alertController.create({
      header: 'Alert!!',
      message: 'Are you sure you want to sign out ?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
            console.log('Confirm Cancel'); }
         }
        , {
          text: 'Yes',
          handler: () => {
            this.navCtrl.navigateForward('/home') ;
            this.menu.enable(false);
          }
        }
      ]
    });

    await alert.present();
  }
  


  
}
