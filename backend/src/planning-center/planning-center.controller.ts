import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PlanningCenterService } from './planning-center.service';
import { PasswordGuard } from './password.guard';


@Controller('planning-center')
@UseGuards(PasswordGuard)
export class PlanningCenterController {
  constructor(private readonly planningCenterService: PlanningCenterService) {}

  @Get('members-with-service')
  getMembersWithServiceStatus() {
    return this.planningCenterService.getMembersWithServiceStatus();
  }

  @Get('upcoming-events')
  getUpcomingEvents() {
    return this.planningCenterService.getUpcomingEvents();
  }

  @Get('person/:id')
  getPersonDetails(@Param('id') id: string) {
    return this.planningCenterService.getPersonDetails(id);
  }

  @Get('all-plans')
  getAllServicePlans() {
    return this.planningCenterService.getAllServicePlans();
  }

  @Get('ping')
    ping() {
      return { ok: true };
  }

}