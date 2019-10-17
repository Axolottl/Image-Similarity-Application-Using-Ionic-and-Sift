import { Component } from '@angular/core';
import { CameraPreview, CameraPreviewOptions } from '@ionic-native/camera-preview/ngx';



@Component({
  selector: 'app-cam',
  templateUrl: './cam.page.html',
  styleUrls: ['./cam.page.scss'],
})
export class CamPage {
  cameraPrev:any;
  public isSearchOpened = false;
  constructor(private cameraPreview: CameraPreview) {
    const cameraPreviewOpts: CameraPreviewOptions = {
      x: 0,
      y: 0,
      width: window.screen.width,
      height: window.screen.height,
      camera: 'rear',
      tapPhoto: true,
      previewDrag: true,
      toBack: true,
      alpha: 1
    }

    // start camera
      this.cameraPreview.startCamera(cameraPreviewOpts).then(
      (res) => {
        console.log(res)
      },
      (err) => {
        console.log(err)
      });
      


  }
  
}