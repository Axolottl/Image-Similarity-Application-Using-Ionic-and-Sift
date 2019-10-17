import { Component } from '@angular/core';
import {  NavController } from '@ionic/angular' ;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  constructor(public navCtrl: NavController) { }
  gotoSIGNIN(){this.navCtrl.navigateForward('/sign-in') ;}
  gotoSIGNUP(){this.navCtrl.navigateForward('/sign-up') ;} 
  gotoCAM(){this.navCtrl.navigateForward('/cam') ;} 


  
  
  
    
}
