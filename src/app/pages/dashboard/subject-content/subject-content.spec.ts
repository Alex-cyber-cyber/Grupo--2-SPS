import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubjectContent } from './subject-content';

describe('SubjectContent', () => {
  let component: SubjectContent;
  let fixture: ComponentFixture<SubjectContent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectContent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubjectContent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
