import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PlanningCenterService {
  private readonly baseUrl = 'https://api.planningcenteronline.com';
  private readonly appId = process.env.PLANNING_CENTER_APP_ID;
  private readonly secret = process.env.PLANNING_CENTER_SECRET;

  private readonly YA3_TAG_ID = '13786588';
  private readonly YA4_TAG_ID = '13786589';
  private readonly SUNDAY_SERVICE_ID = '726211';
  private readonly NORTH_SUNDAY_SERVICE_ID = '1793098';

  constructor(private readonly httpService: HttpService) {
  let requestCount = 0;

  this.httpService.axiosRef.interceptors.request.use((config) => {
    requestCount++;
    console.log(`[PCO] #${requestCount} → ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  });

  this.httpService.axiosRef.interceptors.response.use((response) => {
    const used = response.headers['x-pco-api-request-rate-count'];
    const limit = response.headers['x-pco-api-request-rate-limit'];
    console.log(`[PCO] rate limit: ${used}/${limit}`);
    return response;
  });
}


  private getAuthHeader() {
    const token = Buffer.from(`${this.appId}:${this.secret}`).toString('base64');
    return {
      Authorization: `Basic ${token}`,
      'User-Agent': 'YA34 App (ya34@church.com)',
    };
  }

  private isBlockedOutOn(blockouts: { startDate: string; endDate: string }[], dateStr: string): boolean {
  return blockouts.some((b) => {
    const start = b.startDate.slice(0, 10);
    const end = b.endDate.slice(0, 10);
    return dateStr >= start && dateStr <= end;
    });
  }
  private cache = new Map<string, { promise: Promise<any>; expiresAt: number }>();

  private getCached<T>(key: string, ttlMs: number, fetchFn: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.promise;
    }
    const promise = fetchFn().catch((err) => {
      this.cache.delete(key);
      throw err;
    });

    this.cache.set(key, { promise, expiresAt: Date.now() + ttlMs });
    return promise;
  }

  private async cachedGet(url: string, ttlMs = 30000): Promise<any> {
  return this.getCached(url, ttlMs, async () => {
    const res = await firstValueFrom(this.httpService.get(url, { headers: this.getAuthHeader() }));
    return res.data;
  });
}
  
  private async mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

private async getYA34Members(): Promise<any[]> {
  return this.getCached('ya34-members', 6 * 60 * 60 * 1000, async () => {
    const res = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/services/v2/people?where[tag_ids][]=${this.YA3_TAG_ID}&where[tag_ids][]=${this.YA4_TAG_ID}&per_page=100`,
        { headers: this.getAuthHeader() },
      ),
    );
    return res.data.data;
  });
}

private async getBlockoutsByMember(members: any[]): Promise<Map<string, { startDate: string; endDate: string }[]>> {
  return this.getCached('blockouts-by-member', 6 * 60 * 60 * 1000, async () => {
    const map = new Map<string, { startDate: string; endDate: string }[]>();
    await this.mapWithConcurrency(members, 5, async (m: any) => {
      try {
        const res = await firstValueFrom(
          this.httpService.get(
            `${this.baseUrl}/services/v2/people/${m.id}/blockouts?filter=future`,
            { headers: this.getAuthHeader() },
          ),
        );
        map.set(m.id, res.data.data.map((b: any) => ({
          startDate: b.attributes.starts_at,
          endDate: b.attributes.ends_at,
        })));
      } catch {
        map.set(m.id, []);
      }
    });
    return map;
  });
}




  async getMembersWithServiceStatus() {
  // Step 1: Get all YA3/YA4 tagged members
    const members = await this.getYA34Members();

  // Step 2: Dynamically fetch the next upcoming Sunday plans
  const upcomingPlansData = await this.cachedGet(
    `${this.baseUrl}/services/v2/service_types/${this.SUNDAY_SERVICE_ID}/plans?filter=future&per_page=20`,
    6 * 60 * 60 * 1000,
  );

  const upcomingPlans = upcomingPlansData.data;
  const next930 = upcomingPlans.find((p: any) => p.attributes.title === '9:30am');
  const next1130 = upcomingPlans.find((p: any) => p.attributes.title === '11:30am');

  if (!next930 || !next1130) return [];

  const sundayDate = next930.attributes.sort_date.slice(0, 10); // "YYYY-MM-DD"

  const [plan930Data, plan1130Data] = await Promise.all([
    this.cachedGet(`${this.baseUrl}/services/v2/service_types/${this.SUNDAY_SERVICE_ID}/plans/${next930.id}/team_members?per_page=100`, 3 * 60 * 1000),
    this.cachedGet(`${this.baseUrl}/services/v2/service_types/${this.SUNDAY_SERVICE_ID}/plans/${next1130.id}/team_members?per_page=100`, 3 * 60 * 1000),
  ]);

  const teamMembers930 = plan930Data.data;
  const teamMembers1130 = plan1130Data.data;


  // Step 3: Fetch team names
  const teamsResponse = await this.getCached('teams', 6 * 60 * 60 * 1000, () =>
    firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/services/v2/service_types/${this.SUNDAY_SERVICE_ID}/teams`,
        { headers: this.getAuthHeader() },
      ),
    ),
  );

  const teamMap = new Map(
    teamsResponse.data.data.map((t: any) => [t.id, t.attributes.name])
  );

  // Step 4: Enrich each member
  const enriched = await this.mapWithConcurrency(members, 5, async (member: any) => {
  
      const serving930 = teamMembers930.filter(
        (tm: any) => tm.relationships.person.data.id === member.id,
      );
      const serving1130 = teamMembers1130.filter(
        (tm: any) => tm.relationships.person.data.id === member.id,
      );

      const roles = [
        ...serving930.map((s: any) => ({
          position: s.attributes.team_position_name,
          department: teamMap.get(s.relationships.team.data.id) || 'Unknown',
          service: '9:30am',
          status: s.attributes.status === 'C' ? 'Confirmed' :
                  s.attributes.status === 'D' ? 'Declined' : 'Unconfirmed',
        })),
        ...serving1130.map((s: any) => ({
          position: s.attributes.team_position_name,
          department: teamMap.get(s.relationships.team.data.id) || 'Unknown',
          service: '11:30am',
          status: s.attributes.status === 'C' ? 'Confirmed' :
                  s.attributes.status === 'D' ? 'Declined' : 'Unconfirmed',
        })),
      ];

      const servingThisSunday =
        serving930.some((s: any) => s.attributes.status !== 'D') ||
        serving1130.some((s: any) => s.attributes.status !== 'D');

      try {
        const [profileData, blockoutsData] = await Promise.all([
          this.cachedGet(`${this.baseUrl}/people/v2/people/${member.id}?include=emails,phone_numbers`, 6 * 60 * 60 * 1000),
          this.cachedGet(`${this.baseUrl}/services/v2/people/${member.id}/blockouts?filter=future`, 6 * 60 * 60 * 1000),
        ]);

        const profile = profileData.data;
        const included = profileData.included || [];
        const email = included.find((i: any) => i.type === 'Email')?.attributes?.address || null;
        const phone = included.find((i: any) => i.type === 'PhoneNumber')?.attributes?.national || null;
  
        const blockouts = blockoutsData.data.map((b: any) => ({
          startDate: b.attributes.starts_at,
          endDate: b.attributes.ends_at,
          reason: b.attributes.reason || null,
        }));

        const unavailableThisSunday = this.isBlockedOutOn(blockouts, sundayDate);

        return {
          id: member.id,
          name: profile.attributes.name,
          avatar: profile.attributes.avatar,
          status: profile.attributes.status,
          email,
          phone,
          servingThisSunday,
          roles,
          blockouts,
          unavailableThisSunday,
        };
      } catch {
        return {
          id: member.id,
          name: member.attributes.full_name,
          avatar: member.attributes.photo_thumbnail_url,
          status: member.attributes.status,
          email: null,
          phone: null,
          servingThisSunday,
          roles,
          blockouts: [],
        };
      }
  });

  return enriched;
}

  async getUpcomingEvents() {
    const members = await this.getYA34Members();
    const ya34MemberIds = new Set(members.map((m: any) => m.id));
    const blockoutsByMember = await this.getBlockoutsByMember(members);


    const [mainData, northData] = await Promise.all([
      this.cachedGet(`${this.baseUrl}/services/v2/service_types/${this.SUNDAY_SERVICE_ID}/plans?filter=future&per_page=20`, 6 * 60 * 60 * 1000),
      this.cachedGet(`${this.baseUrl}/services/v2/service_types/${this.NORTH_SUNDAY_SERVICE_ID}/plans?filter=future&per_page=20`, 6 * 60 * 60 * 1000),
    ]);


    const processPlan = async (p: any, serviceType: string) => {
      const serviceTypeId = serviceType === 'Sunday Service' ? this.SUNDAY_SERVICE_ID : this.NORTH_SUNDAY_SERVICE_ID;
      try {
        const teamData = await this.cachedGet(
          `${this.baseUrl}/services/v2/service_types/${serviceTypeId}/plans/${p.id}/team_members?per_page=100`,
          3 * 60 * 1000,
        );
        const ya34Members = teamData.data.filter(
          (tm: any) => ya34MemberIds.has(tm.relationships.person.data.id),
        );
        const planDate = p.attributes.sort_date.slice(0, 10);
        return {
          id: p.id,
          date: p.attributes.dates,
          sortDate: p.attributes.sort_date,
          title: p.attributes.title,
          serviceType,
          peopleCount: ya34Members.length,
          members: ya34Members.map((tm: any) => {
            const personId = tm.relationships.person.data.id;
            const blockouts = blockoutsByMember.get(personId) || [];
            const unavailable = this.isBlockedOutOn(blockouts, planDate);
            return {
              name: tm.attributes.name,
              position: tm.attributes.team_position_name,
              status: unavailable
                ? 'Not Available'
                : tm.attributes.status === 'C' ? 'Confirmed'
                : tm.attributes.status === 'D' ? 'Declined' : 'Unconfirmed',
              photo: tm.attributes.photo_thumbnail,
            };
          }),
        };
      } catch {
        return {
          id: p.id,
          date: p.attributes.dates,
          sortDate: p.attributes.sort_date,
          title: p.attributes.title,
          serviceType,
          peopleCount: 0,
          members: [],
        };
      }
    };

      const plansToProcess = [
        ...mainData.data.map((p: any) => ({ p, serviceType: 'Sunday Service' })),
        ...northData.data.map((p: any) => ({ p, serviceType: 'North Sunday Service' })),
      ];

    const allPlans = await this.mapWithConcurrency(plansToProcess, 5, ({ p, serviceType }) =>
      processPlan(p, serviceType),
    );


    const grouped: Record<string, any[]> = {};
    for (const plan of allPlans) {
      if (!grouped[plan.date]) grouped[plan.date] = [];
      grouped[plan.date].push(plan);
    }

    return Object.entries(grouped)
      .sort(([, a], [, b]) => new Date(a[0].sortDate).getTime() - new Date(b[0].sortDate).getTime())
      .slice(0, 4)
      .map(([date, services]) => ({
        date,
        services: services.sort((a, b) => b.title.localeCompare(a.title)),
      }));
  }

  async getPersonDetails(personId: string) {
    const response = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/people/v2/people/${personId}?include=emails,phone_numbers,addresses`,
        { headers: this.getAuthHeader() },
      ),
    );
    return response.data;
  }

  async getAllServicePlans() {
    const members = await this.getYA34Members();
    const ya34MemberIds = new Set(members.map((m: any) => m.id));
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAhead = new Date(now.getFullYear(), now.getMonth() + 2, 1);

    const shouldFetchMembers = (dateStr: string) => {
      const date = new Date(dateStr);
      return date >= oneMonthAgo && date <= twoMonthsAhead;
    };

    const serviceTypes = [
      { id: this.SUNDAY_SERVICE_ID, name: 'Sunday Service' },
      { id: this.NORTH_SUNDAY_SERVICE_ID, name: 'North Sunday Service' },
      { id: '1781223', name: 'Discipleship' },
      { id: '1781224', name: 'Monday Leaders Discipleship' },
    ];

    const responses = await Promise.all(
      serviceTypes.map(async type => {
        const [futureData, pastData] = await Promise.all([
          this.cachedGet(`${this.baseUrl}/services/v2/service_types/${type.id}/plans?filter=future&per_page=10`, 6 * 60 * 60 * 1000),
          this.cachedGet(`${this.baseUrl}/services/v2/service_types/${type.id}/plans?filter=past&per_page=15&order=-sort_date`, 6 * 60 * 60 * 1000),
        ]);

        const allPlans = [...futureData.data, ...pastData.data];


        return Promise.all(allPlans.map(async (p: any) => {
          if (!shouldFetchMembers(p.attributes.sort_date)) {
            return {
              id: p.id,
              date: p.attributes.sort_date,
              title: p.attributes.title || type.name,
              serviceType: type.name,
              members: [],
            };
          }

          try {
            const teamData = await this.cachedGet(
              `${this.baseUrl}/services/v2/service_types/${type.id}/plans/${p.id}/team_members?per_page=100`,
              3 * 60 * 1000,
            );
            const ya34Members = teamData.data.filter(
              (tm: any) => ya34MemberIds.has(tm.relationships.person.data.id),
            );
            return {
              id: p.id,
              date: p.attributes.sort_date,
              title: p.attributes.title || type.name,
              serviceType: type.name,
              members: ya34Members.map((tm: any) => ({
                name: tm.attributes.name,
                position: tm.attributes.team_position_name,
                status: tm.attributes.status === 'C' ? 'Confirmed' :
                        tm.attributes.status === 'D' ? 'Declined' : 'Unconfirmed',
                photo: tm.attributes.photo_thumbnail,
              })),
            };
          } catch {
            return {
              id: p.id,
              date: p.attributes.sort_date,
              title: p.attributes.title || type.name,
              serviceType: type.name,
              members: [],
            };
          }
        }));
      })
    );

    return responses.flat();
  }
}