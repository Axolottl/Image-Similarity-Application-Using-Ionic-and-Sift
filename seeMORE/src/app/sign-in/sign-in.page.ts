import { Component, OnInit } from '@angular/core';
import {  NavController } from '@ionic/angular' ;
@Component({
  selector: 'app-sign-in',
  templateUrl: './sign-in.page.html',
  styleUrls: ['./sign-in.page.scss'],
})
export class SignINPage implements OnInit {

  constructor(public navCtrl: NavController) { }
  ngOnInit() {
  }
  goback(){this.navCtrl.back();}
  gotoSIGNUP(){this.navCtrl.navigateForward('/sign-up') ;}

}
