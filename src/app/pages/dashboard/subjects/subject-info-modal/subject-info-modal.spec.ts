import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjectInfoModal } from './subject-info-modal';

describe('SubjectInfoModal', () => {
  let component: SubjectInfoModal;
  let fixture: ComponentFixture<SubjectInfoModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectInfoModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubjectInfoModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
