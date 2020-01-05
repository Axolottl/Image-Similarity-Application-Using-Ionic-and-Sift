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
 pswd(){
  var x = <HTMLInputElement>document.getElementById("pwd");
  if (x.type == "password") {
    x.type = "text";
  } else {
    x.type = "password";
  }
 }
  
}
