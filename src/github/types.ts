export interface APIResponse<T = any> {
    total_count: number
    incomplete_results?: boolean
    items: T[]
}

export interface PullRequestSearchResult { 
    id: number
    node_id: string
    number: number
    title: string
    html_url: string
    repository_url: string
    pull_request: {
        url: string
        html_url: string
        diff_url: string
        patch_url: string
    }
}

export interface PullRequestResponse {
    id: number,
    node_id: string
    number: number
    title: string
    html_url: string
    head: {
        ref: string
        repo: {
            id: number
            node_id: string
            name: string
            full_name: string
        }
    }
    draft: boolean
    merged: boolean
    mergeable:boolean
    rebaseable: boolean
    mergeable_state: 'clean' | 'blocked'
}

export interface PullRequestReview {
    id: number
    node_id: string
    state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED'
}

export interface CheckRun {
    id: number
    name: string
    check_suite: {
        id: number
    }
    status: 'queued' | 'in_progress' | 'completed' 
    conclusion?: 'success' | 'skipped' | 'failure' | 'neutral' | 'cancelled' | 'timed_out' | 'action_required'
}

export interface CheckRunsResponse {
    total_count: number
    check_runs: CheckRun[]
}

export enum PRStatus {
    READY = 'ready',
    PENDING = 'pending',
    NEEDS_REVIEW = 'needs_review',
    NEEDS_WORK = 'needs_work',
    ERROR = 'error'
}

export interface StatusResponse {
    status: PRStatus
    title: string
    link: string
    message: string
    error?: string
}