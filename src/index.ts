import { GithubAPI } from './github/githubAPI'
import { PRStatus } from './github/types'

// import {DesktopApp, Actions, Effects, Point, Signal, logger} from 'ts-daskeyboard-applet'
// import * as q from 'daskeyboard-applet'
import * as q from 'ts-daskeyboard-applet'

const logger = q.logger

export class GitHubPRStatus extends q.DesktopApp {

  private _github: GithubAPI
  pollingInterval: number = 30000

  constructor() {
    super()
    this.pollingInterval = 30000
  }

  getColorEffectByStatus(status: PRStatus) {
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

  async applyConfig() {
    if (!this._github && (this as any).authorization?.apiKey) {
      this._github = new GithubAPI((this as any).authorization.apiKey)
    }
    return true
  }

  async run() {
    logger.info("GitHub PR Status running.")
    if (!this._github) {
      return null
    }
    return this._github.getMyPRStatuses(5)
    .then((prStatuses) => {
      logger.info(`Tracking PRs: ${JSON.stringify(prStatuses, null, 2)}`)
      const qpoints = new Array(5).fill(new q.Point('#FFFFFF', q.Effects.SET_COLOR))
      prStatuses.forEach((prStatus, i) => {
          const info = this.getColorEffectByStatus(prStatus.status)
          qpoints[i] = new q.Point(info.color, info.effect)
      })
      return new q.Signal({
          points: [qpoints],
          name: 'GitHub PRs',
          message: `Tracking ${prStatuses.length} PRs`,
          link: {
              url: 'https://github.com/pulls',
              label: 'See on GitHub',
          },
          isMuted: true,
      })
    }).catch((error) => {
      logger.error(`Got error sending request to service: ${error}`)
      return new q.Signal({
          points: [new Array(5).fill(new q.Point('#FF0000', q.Effects.BLINK))],
          action: q.Actions.ERROR,
          errors: [error && error.message]
      })
    })
  }
}

export const applet = new GitHubPRStatus()
