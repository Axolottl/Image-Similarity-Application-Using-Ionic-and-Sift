import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SignUPPage } from './sign-up.page';

describe('SignUPPage', () => {
  let component: SignUPPage;
  let fixture: ComponentFixture<SignUPPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SignUPPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SignUPPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
