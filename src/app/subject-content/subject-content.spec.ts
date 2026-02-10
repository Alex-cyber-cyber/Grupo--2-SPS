import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubjectContentComponent } from './subject-content';

describe('SubjectContentComponent', () => {
  let component: SubjectContentComponent;
  let fixture: ComponentFixture<SubjectContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubjectContentComponent] // ✅ standalone
    }).compileComponents();

    fixture = TestBed.createComponent(SubjectContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
