const q = require('daskeyboard-applet');
const axios = require('axios')

const logger = q.logger;

class GitHubPRStatus extends q.DesktopApp {

    constructor() {
        super();
        this.pollingInterval = 30000;
    }

    async fetch(url) {
        return await axios.get(url, {
            withCredentials: true,
            headers: {
                'Accept': 'application/vnd.github+json',
                'User-agent': 'daskeyboard-q',
                'Authorization': `token ${this.authorization.apiKey}`
            }
        }).then((response) => response.data)
    }

    getMyOpenPRs() {
        return this.fetch('https://api.github.com/search/issues?q=author:@me+is:open+is:pr')
    }
    getPR(repo, prID) {
        return this.fetch(`https://api.github.com/repos/${repo}/pulls/${prID}`)
    }
    getPRByURL(prURL) {
        return this.fetch(prURL)
    }
    getReviews(repo, prID) {
        return this.fetch(`https://api.github.com/repos/${repo}/pulls/${prID}/reviews`)
    }
    getChecks(repo, prRef) {
        return this.fetch(`https://api.github.com/repos/${repo}/commits/${prRef}/check-runs?filter=latest`)
    }
    async getPRStatus(pr) {
        if (pr.mergeable && pr.mergeable_state === 'clean') {
            return {
                link: pr.html_url,
                status: 'READY'
            };
        }
        const repo = pr.head.repo.full_name;
        const checksRes = await this.getChecks(repo, pr.head.ref);
        const checks = checksRes.check_runs;
        if (checks.some((c) => ['failure', 'cancelled', 'timed_out', 'action_required'].indexOf(c.conclusion) >= 0)) {
            return {
                link: pr.html_url,
                status: 'ERROR',
                error: 'Checks have failed'
            };
        }
        if (checks.some((c) => c.status === 'in_progress')) {
            return {
                link: pr.html_url,
                status: 'PENDING',
            };
        }
        const reviews = await this.getReviews(repo, `${pr.number}`);
        if (reviews.length === 0 || reviews.every((r) => r.state === 'COMMENTED')) {
            return {
                link: pr.html_url,
                status: 'NEEDS_REVIEW'
            };
        }
        if (reviews.some((r) => r.state === 'CHANGES_REQUESTED')) {
            return {
                link: pr.html_url,
                status: 'NEEDS_WORK',
                error: 'Changes requested'
            };
        }
        return {
            link: pr.html_url,
            status: 'NEEDS_REVIEW'
        };
    }

    async getMyPRStatuses(limit) {
        const PRs = await this.getMyOpenPRs();
        const statuses = await Promise.all(PRs.items.map((r) => this.getPRByURL(r.pull_request.url).then((pr) => this.getPRStatus(pr))));
        return statuses.slice(0, limit);
    }

    getColorEffectByStatus(status) {
        switch (status) {
            case 'ERROR': {
                return {
                    color: '#FF0000',
                    effect: q.Effects.SET_COLOR
                };
            }
            case 'NEEDS_WORK': {
                return {
                    color: '#DE4816',
                    effect: q.Effects.SET_COLOR
                };
            }
            case 'NEEDS_REVIEW': {
                return {
                    color: '#FFFF00',
                    effect: q.Effects.SET_COLOR
                };
            }
            case 'PENDING': {
                return {
                    color: '#FFFF00',
                    effect: q.Effects.BREATHE
                };
            }
            case 'READY': {
                return {
                    color: '#00FF00',
                    effect: q.Effects.SET_COLOR
                };
            }
            default: {
                return {
                    color: '#FFFFFF',
                    effect: q.Effects.SET_COLOR
                };
            }
        }
    }
    async run() {
        logger.info("GitHub PR Status running.");
        return this.getMyPRStatuses(5).then(prStatuses => {
            logger.info(`Tracking PRs: ${JSON.stringify(prStatuses, null, 2)}`);
            const qpoints = new Array(5).fill(new q.Point('#FFFFFF', q.Effects.SET_COLOR));
            prStatuses.forEach((prStatus, i) => {
                const  info = this.getColorEffectByStatus(prStatus?.status);
                qpoints[i] = new q.Point(info.color, info.effect);
            })
            return new q.Signal({
                points: [qpoints],
                name: 'GitHub PRs',
                message: 'PR statuses',
                link: {
                    url: 'https://github.com',
                    label: 'See on GitHub',
                },
                isMuted: true,
            });
        }).catch((error) => {
            logger.error(`Got error sending request to service: ${error}`);
            return new q.Signal({
                points: [new Array(5).fill(new q.Point({ color: '#FF0000', effect: q.Effects.BLINK }))],
                name: 'Github PRs',
                message: 'Error getting PRs',
                action: 'ERROR',
                errors: [error && error.message]
            });
        });
    }
}
module.exports = {
    GitHubPRStatus: GitHubPRStatus
};
const applet = new GitHubPRStatus();
