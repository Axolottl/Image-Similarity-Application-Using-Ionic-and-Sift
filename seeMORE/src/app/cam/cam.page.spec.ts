import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CamPage } from './cam.page';

describe('CamPage', () => {
  let component: CamPage;
  let fixture: ComponentFixture<CamPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CamPage ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CamPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
