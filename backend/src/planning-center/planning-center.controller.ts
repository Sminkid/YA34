import { Controller, Get, Param } from '@nestjs/common';
import { PlanningCenterService } from './planning-center.service';

@Controller('planning-center')
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
}