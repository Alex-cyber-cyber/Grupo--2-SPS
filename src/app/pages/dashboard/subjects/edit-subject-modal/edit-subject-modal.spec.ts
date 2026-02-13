import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditSubjectModal } from './edit-subject-modal';

describe('EditSubjectModal', () => {
  let component: EditSubjectModal;
  let fixture: ComponentFixture<EditSubjectModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditSubjectModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditSubjectModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
