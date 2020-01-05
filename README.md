# Image Similarity Application Using Ionic, SIFT & KNN
<br />
<blockquote>
  <b>SeeMORE is an Ionic Similarity detection application based on K Nearest Neighbor and Scale Invariant Feature Transform as an Image Feature Extractor.</b>
</blockquote>
<hr>

### Table Of Contents
* [Team Members](#Team-Members)
* [Installation](#Installation)
* [Requirements](#Requirements)
* [Login Page](#Login-Page)
* [Register Page](#Register-Page)
* [Camera Page](#Camera-Page)
* [SIFT Feature Extractor](#SIFT-Feature-Extraction)
* [KNN Algorithm](#K-Nearest-Neighbor-Page)

## Team Members

* "Mohammed Salim Khallouki" Sanilogia@gmail.com
* "Anas Ouardini"            ouardini14@gmail.com
* "Marwane El Faroki"        Elfaroki.m.i@gmail.com

## Installation 

### Requirements

* Ionic CLI 5.4.13 
* Cordova 
* NodeJS v10.15.2
* npm 6.13.4
* JDK 1.8.10
* SDK
* Gradle

## Login Page
The First Page of the Application requiring the user to input valid credentials to connect.

![alt text](https://i.imgur.com/0MJFTAu.jpg)

## Register Page
Represents the Registeration phase of the app making , allowing new users to create valid accounts and connect.

![alt text](https://i.imgur.com/VOsGHhN.jpg)

## Camera Page
* Shows the main page of the Application , with features allowing to take pictures , upload pictures and crop and modify pictures , in order for them to be processed.

![alt text](https://i.imgur.com/2ifAHpZ.jpg)

* You can always pick gallery Photos to upload and process.

![alt text](https://i.imgur.com/pneMmOf.jpg)

* Pictures can be edited and croped , allowing for better processing.

![alt text](https://i.imgur.com/4LwMs2s.jpg)

## SIFT Feature Extraction

* The scale-invariant feature transform (SIFT) is a feature detection algorithm in computer vision to detect and describe local features in images.It locates certain key points and then furnishes them with quantitative information (so-called descriptors) which can for example be used for object recognition. The descriptors are supposed to be invariant against various transformations which might make images look different although they represent the same object, 
#### We will take the following image as an example
![alt text](https://i.imgur.com/AChs2aC.jpg)

By grey scaling the given image and blurring it using A Gaussian convolution , aswell as subjecting it to a sequence of further convolutions with increasing standard diviation , we end up creating a scale space, 


By extracting constant features that do no change through the diviations, we can gather a number of invariatiant descriptors.
At last , these will be represented as a vector of features that can be compared and worked on further.

## K Neareast Neighbor
