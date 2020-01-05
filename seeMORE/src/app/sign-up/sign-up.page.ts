import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.page.html',
  styleUrls: ['./sign-up.page.scss'],
})
export class SignUPPage implements OnInit {
  
  constructor(public navCtrl: NavController) { }

  ngOnInit() {
  }
  gotoSIGNIN() { this.navCtrl.navigateForward('/sign-in'); }
  

}
