import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SignINPage } from './sign-in.page';

describe('SignINPage', () => {
  let component: SignINPage;
  let fixture: ComponentFixture<SignINPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SignINPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SignINPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
