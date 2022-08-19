
import * as q from 'daskeyboard-applet'
import { GithubAPI } from './githubAPI'
import { PRStatus } from './types'

const logger = q.logger;

export class GitHubPRStatus extends q.DesktopApp {

  private _githubAPI: GithubAPI = new GithubAPI((this as any).authorization.apiKey)

  constructor() {
    super();
    (this as any).pollingInterval = 60000 * 0.25; // every 15 sec
  }
  /**
   * Delete all previous signals
   */
  async deleteOldSignals() {
    // delete the previous signals
    while ((this as any).signalLog && (this as any).signalLog.length) {
      const signal = (this as any).signalLog.pop().signal;
      logger.debug(`Deleting previous signal: ${signal.id}`)
      await q.Signal.delete(signal).catch(error => {
        logger.error(`Error deleting signal ${signal.id}: ${error}`);
      });

      logger.debug(`Deleted the signal: ${signal.id}`);
    }
  }

  /**
   * Gets notifications from github api by making an Oauth request
   * through the Das Keyboard Q Oauth proxy
   */
  async getRecentPRs() {
    return await this._githubAPI.getMyPRStatuses(5)
  }

  getColorEffectByStatus(status?: PRStatus): {color: string, effect: string} {
      switch (status) {
          case PRStatus.ERROR: {
              return {
                  color: '#FF0000',
                  effect: q.Effects.SET_COLOR
              }
          }
          case PRStatus.NEEDS_WORK: {
              return {
                  color: '#DE4816',
                  effect: q.Effects.SET_COLOR
              }
          }
          case PRStatus.NEEDS_REVIEW: {
              return {
                  color: '#FFFF00',
                  effect: q.Effects.SET_COLOR
              }
          }
          case PRStatus.PENDING: {
              return {
                  color: '#FFFF00',
                  effect: q.Effects.BREATHE
              }
          }
          case PRStatus.READY: {
              return {
                  color: '#00FF00',
                  effect: q.Effects.SET_COLOR
              }
          }
          default: {
              return {
                  color: '#FFFFFF',
                  effect: q.Effects.SET_COLOR
              }
          }
      }
  }

  async run() {
    logger.info("GitHub PR Status running.");
    return this.getRecentPRs().then(prStatuses => {
      this.deleteOldSignals();
      logger.info(`Tracking PRs: ${JSON.stringify(prStatuses, null, 2)}`);
      const qpoints: any[] = []
      for (let i = 0; i < 5; i++ ) {
          const info = this.getColorEffectByStatus(prStatuses[i]?.status)
          qpoints[i] = new q.Point(info.color, info.effect)
      }
      return new q.Signal({
        points: [ qpoints ],
        name: 'GitHub PRs',
        message: 'PR statuses',
        link: {
          url: prStatuses[0]?.link ?? '',
          label: 'See on GitHub',
        },
        isMuted: true,
      } as any)
    }).catch((error) => {
      logger.error(`Got error sending request to service: ${error}`);
      return new q.Signal({
          points: [ new Array(5).fill(new q.Point({color: '#FF0000', effect: q.Effects.BLINK}))],
          name: 'Github PRs',
          message: 'Error getting PRs',
          action: 'ERROR',
          errors: [error?.message]
      } as any)
    })
  }
}

export const applet = new GitHubPRStatus();
