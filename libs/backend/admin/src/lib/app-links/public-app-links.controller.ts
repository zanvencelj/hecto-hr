import { Controller, Get } from '@nestjs/common';
import { Public } from '@hecto/auth';
import { AdminAppLinksService } from './admin-app-links.service';

/** Unauthenticated — read by the landing page to render mobile download buttons. */
@Controller('app-links')
export class PublicAppLinksController {
  constructor(private readonly appLinksService: AdminAppLinksService) {}

  @Public()
  @Get()
  get() {
    return this.appLinksService.get();
  }
}
