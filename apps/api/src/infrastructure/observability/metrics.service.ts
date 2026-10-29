import { Injectable } from '@nestjs/common';

const BUCKETS = [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

type RouteStats = {
  method: string;
  route: string;
  count: number;
  errors: number;
  durationSum: number;
  buckets: number[];
  byStatus: Map<number, number>;
};

/**
 * Minimal in-process metrics registry exposed in Prometheus text format. It
 * avoids a new dependency for the demo; swap it for prom-client or
 * OpenTelemetry when running several instances.
 */
@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private readonly routes = new Map<string, RouteStats>();
  private readonly counters = new Map<string, number>();

  recordRequest(
    method: string,
    route: string,
    statusCode: number,
    seconds: number,
  ) {
    const key = `${method} ${route}`;
    let stats = this.routes.get(key);
    if (!stats) {
      stats = {
        method,
        route,
        count: 0,
        errors: 0,
        durationSum: 0,
        buckets: BUCKETS.map(() => 0),
        byStatus: new Map(),
      };
      this.routes.set(key, stats);
    }
    stats.count += 1;
    stats.durationSum += seconds;
    if (statusCode >= 500) stats.errors += 1;
    stats.byStatus.set(statusCode, (stats.byStatus.get(statusCode) ?? 0) + 1);
    BUCKETS.forEach((bound, index) => {
      if (seconds <= bound) stats.buckets[index] += 1;
    });
  }

  increment(name: string, by = 1) {
    this.counters.set(name, (this.counters.get(name) ?? 0) + by);
  }

  snapshot() {
    const routes = [...this.routes.values()]
      .map((stats) => ({
        method: stats.method,
        route: stats.route,
        count: stats.count,
        errors: stats.errors,
        averageMs: stats.count
          ? Math.round((stats.durationSum / stats.count) * 1000)
          : 0,
        p95Ms: this.percentile(stats, 0.95),
      }))
      .sort((a, b) => b.count - a.count);
    const memory = process.memoryUsage();
    return {
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
      totalRequests: routes.reduce((total, item) => total + item.count, 0),
      totalErrors: routes.reduce((total, item) => total + item.errors, 0),
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      },
      counters: Object.fromEntries(this.counters),
      routes,
    };
  }

  prometheus() {
    const lines: string[] = [
      '# HELP http_requests_total HTTP requests by route and status.',
      '# TYPE http_requests_total counter',
    ];
    for (const stats of this.routes.values())
      for (const [status, count] of stats.byStatus)
        lines.push(
          `http_requests_total{method="${stats.method}",route="${this.escape(stats.route)}",status="${status}"} ${count}`,
        );
    lines.push(
      '# HELP http_request_duration_seconds Request latency.',
      '# TYPE http_request_duration_seconds histogram',
    );
    for (const stats of this.routes.values()) {
      const labels = `method="${stats.method}",route="${this.escape(stats.route)}"`;
      BUCKETS.forEach((bound, index) =>
        lines.push(
          `http_request_duration_seconds_bucket{${labels},le="${bound}"} ${stats.buckets[index]}`,
        ),
      );
      lines.push(
        `http_request_duration_seconds_bucket{${labels},le="+Inf"} ${stats.count}`,
        `http_request_duration_seconds_sum{${labels}} ${stats.durationSum.toFixed(6)}`,
        `http_request_duration_seconds_count{${labels}} ${stats.count}`,
      );
    }
    for (const [name, value] of this.counters)
      lines.push(`# TYPE ${name} counter`, `${name} ${value}`);
    const memory = process.memoryUsage();
    lines.push(
      '# TYPE process_resident_memory_bytes gauge',
      `process_resident_memory_bytes ${memory.rss}`,
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds ${Math.round((Date.now() - this.startedAt) / 1000)}`,
    );
    return `${lines.join('\n')}\n`;
  }

  private percentile(stats: RouteStats, quantile: number) {
    const target = stats.count * quantile;
    const index = stats.buckets.findIndex((count) => count >= target);
    return index === -1 ? 5000 : Math.round(BUCKETS[index] * 1000);
  }

  private escape(value: string) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
}
