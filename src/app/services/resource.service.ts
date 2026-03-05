import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ResourceEventsService {

  resourceViewed(resourceId: string) {
    console.log('[EVENT] resource_viewed', { resourceId });
  }

  resourceRemoved(resourceId: string) {
    console.log('[EVENT] resource_removed', { resourceId });
  }

}