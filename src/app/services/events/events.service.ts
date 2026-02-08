import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  track(event: string, data?: any) {
    console.log('[EVENT]', event, data ?? {});
  }
}
