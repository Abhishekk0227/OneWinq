export interface AnalyticsOverview {
  totalProfileViews: number
  uniqueViewers: number
  identifiableViews: number
  anonymousViews: number
  qrScans: number
  nfcTaps: number
  linkClicks: number
}

export interface AnalyticsTimeSeriesPoint {
  date: string
  views: number
  qrScans?: number
  nfcTaps?: number
  clicks?: number
}

export interface ProfileAnalyticsData {
  overview: AnalyticsOverview
  timeSeries: AnalyticsTimeSeriesPoint[]
  topReferrers: Array<{ referrer: string; count: number }>
  topLinks: Array<{ url: string; label: string; count: number }>
  viewerBreakdown: {
    publicViews: number
    professionalViews: number
    privateViews: number
  }
}
