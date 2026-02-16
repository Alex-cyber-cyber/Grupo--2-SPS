import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Topbar } from './topbar';
import { AuthService } from '../../../auth/services/auth.service';

describe('Topbar', () => {

  let component: Topbar;
  let fixture: ComponentFixture<Topbar>;

  // ✅ Mock de AuthService
  const mockAuthService = {
    user$: of({
      uid: '123',
      displayName: 'Oscar Guifarro',
      email: 'oscar@test.com',
      photoURL: null
    })
  };

  beforeEach(async () => {

    await TestBed.configureTestingModule({

      imports: [Topbar],

      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService
        }
      ]

    }).compileComponents();

    fixture = TestBed.createComponent(Topbar);

    component = fixture.componentInstance;

    fixture.detectChanges();

  });

  it('should create', () => {

    expect(component).toBeTruthy();

  });

});
