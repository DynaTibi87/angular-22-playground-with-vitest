import { Service } from '@angular/core';

@Service()
export class ActivityService {
  static readonly DELAY_MS = 800;

  async loadRecentActivity(owner: string): Promise<string[]> {
    await new Promise((resolve) =>
      setTimeout(resolve, ActivityService.DELAY_MS),
    );

    return [
      `${owner} pushed 3 commits`,
      `${owner} opened a pull request`,
      `${owner} reviewed a design doc`,
    ];
  }
}
