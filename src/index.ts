import { GithubAPI } from './github/githubAPI'
import { PRStatus } from './github/types'

import * as q from 'ts-daskeyboard-applet'

const logger = q.logger

export class GitHubPRStatus extends q.DesktopApp {

  private _github: GithubAPI
  pollingInterval: number = 30000
  prIndex: number = 1

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
    if (this.config && 'PRIndex' in this.config) {
      this.prIndex = +((this.config as any).PRIndex)
    }
    return true
  }

  async run() {
    logger.info("GitHub PR Status running.")
    if (!this._github) {
      return null
    }
    if (isNaN(this.prIndex) || this.prIndex < 1) {
      return new q.Signal({
        points: [[new q.Point('#FF0000', q.Effects.BLINK)]],
        action: q.Actions.ERROR,
        errors: ['Invalid PR Index']
    })
    }
    return this._github.getPRStatusByIndex(this.prIndex)
    .then((prStatus) => {
      const defaultPoint = new q.Point('#FFFFFF', q.Effects.SET_COLOR)
      if (prStatus && prStatus.status) {
        const info = this.getColorEffectByStatus(prStatus.status)
        return new q.Signal({
          points: [[new q.Point(info.color, info.effect)]],
          name: prStatus.message,
          message: prStatus.title,
          link: {
              url: prStatus.link,
              label: 'See on GitHub',
          },
          isMuted: true,
        })
      }
      return new q.Signal({
        points: [[defaultPoint]],
        name: 'No PR tracked',
        message: 'No PR tracked',
        isMuted: true,
      })

    }).catch((error) => {
      logger.error(`Got error sending request to service: ${error}`)
      return new q.Signal({
          points: [[new q.Point('#FF0000', q.Effects.BLINK)]],
          action: q.Actions.ERROR,
          errors: [error && error.message]
      })
    })
  }
}

export const applet = new GitHubPRStatus()
