import axios, { AxiosInstance } from 'axios'
import { APIResponse, PullRequestSearchResult, PullRequestResponse, PullRequestReview, CheckRunsResponse, StatusResponse, PRStatus } from './types'

export class GithubAPI {

    private _axios: AxiosInstance

    constructor(apiKey: string) {
        this._axios = axios.create({
            withCredentials: true,
            headers: {
                'Accept': 'application/vnd.github+json',
                'Authorization': `token ${apiKey}`
            }
        })
    }

    async getMyOpenPRs(): Promise<APIResponse<PullRequestSearchResult>> {
        return await this._axios.get('https://api.github.com/search/issues?q=author:@me+is:open+is:pr').then((response) => response.data)
    }

    async getPR(repo: string, prID: string): Promise<PullRequestResponse> {
        return await this._axios.get(`https://api.github.com/repos/${repo}/pulls/${prID}`).then((response) => response.data)
    }

    async getPRByURL(prURL: string): Promise<PullRequestResponse> {
        return await this._axios.get(prURL).then((response) => response.data)
    }

    async getReviews(repo: string, prID: string): Promise<PullRequestReview[]> {
        return await this._axios.get(`https://api.github.com/repos/${repo}/pulls/${prID}/reviews`).then((response) => response.data)
    }

    async getChecks(repo: string, prRef: string): Promise<CheckRunsResponse> {
        return await this._axios.get(`https://api.github.com/repos/${repo}/commits/${prRef}/check-runs?filter=latest`).then((response) => response.data)
    }

    async getPRStatus(pr: PullRequestResponse): Promise<StatusResponse> {
        try {
            if (pr.mergeable && pr.mergeable_state === 'clean') {
                // this state means all checks are set and reviewers are clean
                return {
                    link: pr.html_url,
                    status: PRStatus.READY
                }
            }
            const repo = pr.head.repo.full_name
            // Check checks first for fixable issues
            const checksRes = await this.getChecks(repo, pr.head.ref)
            const checks = checksRes.check_runs
            if (checks.some((c) => ['failure', 'cancelled', 'timed_out', 'action_required'].indexOf(c.conclusion) >= 0)) {
                return {
                    link: pr.html_url,
                    status: PRStatus.ERROR,
                    error: 'Checks have failed'
                }
            }
            if (checks.some((c) => c.status === 'in_progress')) {
                return {
                    link: pr.html_url,
                    status: PRStatus.PENDING,
                }
            }
            // if no checks are failed or in progress, check reviews
            const reviews = await this.getReviews(repo, `${pr.number}`)
            if (reviews.length === 0 || reviews.every((r) => r.state === 'COMMENTED')) {
                return {
                    link: pr.html_url,
                    status: PRStatus.NEEDS_REVIEW
                }
            }
            if (reviews.some((r) => r.state === 'CHANGES_REQUESTED')) {
                return {
                    link: pr.html_url,
                    status: PRStatus.NEEDS_WORK,
                    error: 'Changes requested'
                }
            }
            // if we somehow reach the end, we must need more than one review
            return {
                link: pr.html_url,
                status: PRStatus.NEEDS_REVIEW
            }
        } catch (e) {
            console.error(e)
            return {
                link: '',
                status: PRStatus.ERROR,
                error: 'Error in script'
            }
        } 
    }

    async getMyPRStatuses(limit: number): Promise<StatusResponse[]> {
        const PRs = await this.getMyOpenPRs()
        const statuses = await Promise.all(PRs.items.map((r) => this.getPRByURL(r.pull_request.url).then((pr) => this.getPRStatus(pr))))
        return statuses.slice(0, limit)
    }
}