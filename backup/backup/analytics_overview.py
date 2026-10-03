# app/routers/analytics_overview.py
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.db import get_db
from app.services.tenancy_resolver import resolve_tenant_env

router = APIRouter(tags=["analytics"], prefix="/overview")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _default_range(
    from_ts: Optional[datetime],
    to_ts: Optional[datetime],
    default_minutes: int = 120,
) -> tuple[datetime, datetime]:
    now = _utc_now()
    to_ts = to_ts or now
    from_ts = from_ts or (to_ts - timedelta(minutes=default_minutes))

    if from_ts.tzinfo is None:
        from_ts = from_ts.replace(tzinfo=timezone.utc)
    else:
        from_ts = from_ts.astimezone(timezone.utc)

    if to_ts.tzinfo is None:
        to_ts = to_ts.replace(tzinfo=timezone.utc)
    else:
        to_ts = to_ts.astimezone(timezone.utc)

    if from_ts > to_ts:
        from_ts, to_ts = to_ts, from_ts

    return from_ts, to_ts


import logging
log = logging.getLogger(__name__)

async def _fetch_one(db: AsyncSession, sql: str, params: dict):
    """Execute a query and return a single row mapping (or None).

    Uses SAVEPOINT (begin_nested) so a failed query doesn't close the surrounding
    transaction, allowing subsequent overview queries to continue.
    """
    try:
        async with db.begin_nested():
            r = await db.execute(text(sql), params)
            row = r.mappings().first()
            return dict(row) if row else None
    except Exception:
        log.exception("enterprise_overview: query failed (fetch_one)")
        return None

async def _fetch_all(db: AsyncSession, sql: str, params: dict):
    """Execute a query and return list of row mappings (possibly empty)."""
    try:
        async with db.begin_nested():
            r = await db.execute(text(sql), params)
            return [dict(x) for x in r.mappings().all()]
    except Exception:
        log.exception("enterprise_overview: query failed (fetch_all)")
        return []

async def _noop(value):
    return value

async def _coro_or_default(coro, default):
    result = await coro
    return result if result is not None else default

def _clamp_int(v: int, lo: int, hi: int) -> int:
    try:
        v = int(v)
    except Exception:
        return lo
    return max(lo, min(hi, v))


@router.get("/enterprise", summary="Enterprise tenant overview payload")
async def enterprise_overview(
    from_ts: Optional[datetime] = Query(None, description="Start time (ISO 8601). Default: now-2h"),
    to_ts: Optional[datetime] = Query(None, description="End time (ISO 8601). Default: now"),

    # Optional enrichments for TenantOverview UI
    include_sparklines: bool = Query(False, description="If true, include sparkline series for key signals"),
    bucket_minutes: int = Query(5, description="Sparkline bucket size in minutes (1..60)"),
    include_service_last_seen: bool = Query(False, description="If true, include last_seen for each service in services_top"),

    db: AsyncSession = Depends(get_db),
    x_edge_tenant_id: Optional[str] = Header(None, alias="X-Edge-Tenant-Id"),
    x_edge_environment_id: Optional[str] = Header(None, alias="X-Edge-Environment-Id"),
) -> Dict[str, Any]:
    tenant_id, environment_id = await resolve_tenant_env(
        db,
        tenant_hint=None,
        env_hint=None,
        header_tenant_id=x_edge_tenant_id,
        header_environment_id=x_edge_environment_id,
        allow_default=True,
    )

    from_ts, to_ts = _default_range(from_ts, to_ts, default_minutes=120)
    bucket_minutes = _clamp_int(bucket_minutes, 1, 60)

    # NOTE: alerts.problems in your DDL is NOT environment-scoped.
    # So we must NOT filter on environment_id, or it will fail.
    env_filter_sql = ""
    params_base = {"tenant_id": tenant_id}

    # -------------------------------------------------------------------------
    # 1) HEALTH / PROBLEMS  ✅ matches your alerts.problems columns
    # Columns available: status, severity, first_seen_at, last_seen_at, resolved_at, incident_count
    # -------------------------------------------------------------------------
    health_sql = """
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'OPEN'
        ) AS open_count,

        COUNT(*) FILTER (
          WHERE status = 'OPEN'
            AND severity::text IN ('CRITICAL','HIGH')
        ) AS critical_open,

        COUNT(*) FILTER (
          WHERE status = 'OPEN'
            AND severity::text IN ('MEDIUM','LOW')
        ) AS warning_open,

        COUNT(*) FILTER (
          WHERE status = 'OPEN'
            AND last_seen_at BETWEEN :from_ts AND :to_ts
        ) AS open_touched_in_range
      FROM alerts.problems
      WHERE tenant_id = :tenant_id;
    """
    # -------------------------------------------------------------------------
    # 2) GOLDEN SIGNALS (traces.spans) - keep env filtering where it exists
    # (spans ARE environment-scoped in your stack)
    # -------------------------------------------------------------------------
    spans_env_filter_sql = ""
    spans_params = {"tenant_id": tenant_id, "from_ts": from_ts, "to_ts": to_ts}
    if environment_id:
        spans_env_filter_sql = " AND environment_id = CAST(:env_id AS uuid) "
        spans_params["env_id"] = str(environment_id)

    golden_sql = f"""
      WITH base AS (
        SELECT *
        FROM traces.spans
        WHERE tenant_id = :tenant_id
          {spans_env_filter_sql}
          AND start_time BETWEEN :from_ts AND :to_ts
      ),
      srv AS (
        SELECT * FROM base WHERE kind = 'SERVER'
      ),
      pick AS (
        SELECT * FROM srv
        UNION ALL
        SELECT * FROM base
        WHERE NOT EXISTS (SELECT 1 FROM srv)
      )
      SELECT
        COUNT(*)::float / GREATEST(EXTRACT(EPOCH FROM (:to_ts - :from_ts)), 1) AS traffic_rps,
        (COUNT(*) FILTER (WHERE status = 'ERROR')::float / NULLIF(COUNT(*),0)) * 100.0 AS error_rate_pct,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::float AS latency_p95_ms
      FROM pick;
    """

    # -------------------------------------------------------------------------
    # 3) INFRA HOSTS (env-scoped in your stack)
    # -------------------------------------------------------------------------
    hosts_env_filter_sql = ""
    hosts_params = {"tenant_id": tenant_id, "from_ts": from_ts}
    if environment_id:
        hosts_env_filter_sql = " AND environment_id = CAST(:env_id AS uuid) "
        hosts_params["env_id"] = str(environment_id)

    infra_hosts_sql = f"""
      SELECT
        COUNT(*) FILTER (WHERE last_seen_at >= :from_ts) AS hosts_total,
        COUNT(*) FILTER (WHERE last_seen_at >= (now() - interval '5 minutes')) AS hosts_alive
      FROM core.hosts
      WHERE tenant_id = :tenant_id
        {hosts_env_filter_sql};
    """

    # -------------------------------------------------------------------------
    # 4) INFRA METRICS (env-scoped)
    # -------------------------------------------------------------------------
    metrics_env_filter_sql = ""
    metrics_params = {"tenant_id": tenant_id, "from_ts": from_ts, "to_ts": to_ts}
    if environment_id:
        metrics_env_filter_sql = " AND environment_id = CAST(:env_id AS uuid) "
        metrics_params["env_id"] = str(environment_id)

    infra_metrics_sql = f"""
      WITH all_metrics AS (
        SELECT name,
               CASE WHEN value <= 1 THEN value * 100 ELSE value END AS value
        FROM metrics.metrics
        WHERE tenant_id = :tenant_id
          {metrics_env_filter_sql}
          AND ts BETWEEN :from_ts AND :to_ts
          AND value IS NOT NULL
      ),
      win AS (
        SELECT name, value
        FROM all_metrics
        WHERE name IN (
          'system.cpu.utilization','system.cpu.usage','system.cpu.pct',
          'system.memory.utilization','system.mem.utilization','system.memory.pct',
          'system.disk.usage.percent','system.disk.utilization','system.disk.pct',
          'system.network.utilization','system.network.pct','system.net.utilization'
        )
      )
      SELECT
        AVG(CASE WHEN name ILIKE '%cpu%' THEN value END) AS cpu_avg,
        AVG(CASE WHEN name ILIKE '%mem%' OR name ILIKE '%memory%' THEN value END) AS mem_avg,
        AVG(CASE WHEN name ILIKE '%disk%' THEN value END) AS disk_avg,
        AVG(CASE WHEN name ILIKE '%network%' OR name ILIKE '%net.%' OR name ILIKE '%net_%' THEN value END) AS network_avg,
        (SELECT COUNT(*) FROM all_metrics) AS metric_points
      FROM win;
    """
    # -------------------------------------------------------------------------
    # 5) TOP SERVICES (+ optional last_seen) (env-scoped)
    # -------------------------------------------------------------------------
    services_last_seen_sql = ", MAX(start_time) AS last_seen" if include_service_last_seen else ""
    services_top_sql = f"""
      WITH base AS (
        SELECT
          COALESCE(
            NULLIF(attributes->>'service.name',''),
            NULLIF(attributes->>'service',''),
            NULLIF(attributes->>'peer.service',''),
            'unknown'
          ) AS svc,
          duration_ms,
          status,
          start_time
        FROM traces.spans
        WHERE tenant_id = :tenant_id
          {spans_env_filter_sql}
          AND start_time BETWEEN :from_ts AND :to_ts
      )
      SELECT
        svc AS service_name,
        COUNT(*) AS requests,
        (COUNT(*) FILTER (WHERE status='ERROR')::float / NULLIF(COUNT(*),0)) * 100.0 AS error_rate_pct,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::float AS latency_p95_ms
        {services_last_seen_sql}
      FROM base
      GROUP BY svc
      ORDER BY requests DESC
      LIMIT 10;
    """

    # -------------------------------------------------------------------------
    # 6) HOTSPOTS
    # 6a) logs.entries (env-scoped)
    # 6b) alerts.problems (NOT env-scoped per your DDL)
    # -------------------------------------------------------------------------
    logs_env_filter_sql = ""
    logs_params = {"tenant_id": tenant_id, "from_ts": from_ts, "to_ts": to_ts}
    if environment_id:
        logs_env_filter_sql = " AND environment_id = CAST(:env_id AS uuid) "
        logs_params["env_id"] = str(environment_id)

    hotspots_logs_sql = f"""
      SELECT
        COALESCE(NULLIF(service_name,''), NULLIF(component,''), 'unknown') AS source,
        LEFT(message, 160) AS signature,
        COUNT(*) AS occurrences,
        MAX(ts) AS last_seen
      FROM logs.entries
      WHERE tenant_id = :tenant_id
        {logs_env_filter_sql}
        AND ts BETWEEN :from_ts AND :to_ts
        AND (
          level ILIKE 'error%'
          OR http_status >= 500
          OR message ILIKE '%exception%'
          OR message ILIKE '%error%'
        )
      GROUP BY 1,2
      ORDER BY occurrences DESC
      LIMIT 8;
    """

    hotspots_alerts_sql = """
      SELECT
        title,
        severity::text AS severity,
        incident_count,
        last_seen_at AS last_seen
      FROM alerts.problems
      WHERE tenant_id = :tenant_id
        AND status = 'OPEN'
      ORDER BY incident_count DESC, last_seen_at DESC
      LIMIT 8;
    """

    # -------------------------------------------------------------------------
    # 7) SYNTHETIC SUMMARY (env-scoped)
    # -------------------------------------------------------------------------
    synthetic_sql = None
    if environment_id:
        synthetic_sql = """
          WITH m AS (
            SELECT id, name, enabled
            FROM synthetic.monitors
            WHERE tenant_id = :tenant_id
              AND environment_id = CAST(:env_id AS uuid)
          ),
          r AS (
            SELECT monitor_id, status, ts, latency_ms
            FROM synthetic.results
            WHERE tenant_id = :tenant_id
              AND environment_id = CAST(:env_id AS uuid)
              AND ts BETWEEN :from_ts AND :to_ts
          )
          SELECT
            (SELECT COUNT(*) FROM m WHERE enabled = true) AS monitors_enabled,
            (SELECT COUNT(*) FROM m) AS monitors_total,
            (SELECT COUNT(*) FROM r) AS checks_total,
            (SELECT COUNT(*) FROM r WHERE COALESCE(status, '') = 'OK' OR status ILIKE 'up%') AS up_count,
            (SELECT COUNT(*) FROM r WHERE (COALESCE(status, '') <> 'OK' AND COALESCE(status, '') <> '') OR status ILIKE 'down%' OR status ILIKE 'fail%') AS down_count;
        """

    # -------------------------------------------------------------------------
    # 8) RUM SUMMARY (tenant-scoped in your stack)
    # -------------------------------------------------------------------------
    rum_sql = """
      SELECT
        (SELECT COUNT(*) FROM rum.sessions s
          WHERE s.tenant_id = :tenant_id
            AND s.started_at BETWEEN :from_ts AND :to_ts) AS sessions,

        (SELECT COUNT(*) FROM rum.pageviews p
          WHERE p.tenant_id = :tenant_id
            AND p.ts BETWEEN :from_ts AND :to_ts) AS pageviews,

        (SELECT COUNT(*) FROM rum.errors e
          WHERE e.tenant_id = :tenant_id
            AND e.ts BETWEEN :from_ts AND :to_ts) AS rum_errors;
    """

    # -------------------------------------------------------------------------
    # Execute queries 1-8 sequentially on the shared AsyncSession.
    # (AsyncSession uses a single connection; concurrent gather() calls on the
    # same session interfere and cause silent empty results.)
    # -------------------------------------------------------------------------
    health = await _fetch_one(db, health_sql, {**params_base, "from_ts": from_ts, "to_ts": to_ts}) \
        or {"open_count": 0, "critical_open": 0, "warning_open": 0, "open_touched_in_range": 0}
    golden = await _fetch_one(db, golden_sql, spans_params) \
        or {"traffic_rps": 0.0, "error_rate_pct": None, "latency_p95_ms": None}
    infra_hosts = await _fetch_one(db, infra_hosts_sql, hosts_params) \
        or {"hosts_total": 0, "hosts_alive": 0}
    infra_metrics = await _fetch_one(db, infra_metrics_sql, metrics_params) \
        or {"cpu_avg": None, "mem_avg": None, "metric_points": 0}
    services_top = await _fetch_all(db, services_top_sql, spans_params)
    hotspots_logs = await _fetch_all(db, hotspots_logs_sql, logs_params)
    hotspots_alerts = await _fetch_all(db, hotspots_alerts_sql, params_base)
    synthetic_row = (await _fetch_one(db, synthetic_sql, {**metrics_params}) if synthetic_sql else None)
    rum = await _fetch_one(db, rum_sql, {**params_base, "from_ts": from_ts, "to_ts": to_ts}) \
        or {"sessions": 0, "pageviews": 0, "rum_errors": 0}

    if (health.get("critical_open") or 0) > 0:
        health_status = "CRITICAL"
    elif (health.get("open_count") or 0) > 0:
        health_status = "DEGRADED"
    else:
        health_status = "HEALTHY"

    synthetic_default = {"monitors_total": 0, "monitors_enabled": 0, "checks_total": 0, "up_count": 0, "down_count": 0}
    synthetic = synthetic_row or synthetic_default
    uptime = None
    if environment_id and synthetic_row:
        total = float(synthetic.get("checks_total") or 0)
        up = float(synthetic.get("up_count") or 0)
        uptime = (up / total) * 100.0 if total > 0 else None

    # -------------------------------------------------------------------------
    # 9) OPTIONAL SPARKLINES (env-scoped for traces/metrics)
    # -------------------------------------------------------------------------
    sparklines = None
    if include_sparklines:
        golden_series_sql = f"""
          WITH base AS (
            SELECT *
            FROM traces.spans
            WHERE tenant_id = :tenant_id
              {spans_env_filter_sql}
              AND start_time BETWEEN :from_ts AND :to_ts
          ),
          srv AS (
            SELECT * FROM base WHERE kind = 'SERVER'
          ),
          pick AS (
            SELECT * FROM srv
            UNION ALL
            SELECT * FROM base
            WHERE NOT EXISTS (SELECT 1 FROM srv)
          ),
          b AS (
            SELECT date_bin(make_interval(mins => :bucket_minutes), start_time, :from_ts) AS bucket,
                   COUNT(*) AS reqs,
                   COUNT(*) FILTER (WHERE status='ERROR') AS errs,
                   percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::float AS p95
            FROM pick
            GROUP BY 1
          )
          SELECT
            bucket AS ts,
            (reqs::float / GREATEST(:bucket_minutes*60, 1)) AS traffic_rps,
            (errs::float / NULLIF(reqs,0)) * 100.0 AS error_rate_pct,
            p95 AS latency_p95_ms
          FROM b
          ORDER BY ts ASC;
        """
        infra_series_sql = f"""
          WITH win AS (
            SELECT
              date_bin(make_interval(mins => :bucket_minutes), ts, :from_ts) AS bucket,
              name,
              value
            FROM metrics.metrics
            WHERE tenant_id = :tenant_id
              {metrics_env_filter_sql}
              AND ts BETWEEN :from_ts AND :to_ts
              AND name IN (
                'system.cpu.utilization','system.cpu.usage','system.cpu.pct',
                'system.memory.utilization','system.mem.utilization','system.memory.pct'
              )
              AND value IS NOT NULL
          )
          SELECT
            bucket AS ts,
            AVG(CASE WHEN name ILIKE '%cpu%' THEN value END)::float AS cpu_avg,
            AVG(CASE WHEN name ILIKE '%mem%' OR name ILIKE '%memory%' THEN value END)::float AS mem_avg
          FROM win
          GROUP BY 1
          ORDER BY ts ASC;
        """
        golden_series = await _fetch_all(db, golden_series_sql, {**spans_params, "bucket_minutes": bucket_minutes})
        infra_series = await _fetch_all(db, infra_series_sql, {**metrics_params, "bucket_minutes": bucket_minutes})

        sparklines = {
            "bucket_minutes": bucket_minutes,
            "traffic_rps": [{"ts": r["ts"].isoformat(), "value": float(r["traffic_rps"] or 0.0)} for r in golden_series],
            "error_rate_pct": [{"ts": r["ts"].isoformat(), "value": float(r["error_rate_pct"] or 0.0)} for r in golden_series],
            "latency_p95_ms": [{"ts": r["ts"].isoformat(), "value": float(r["latency_p95_ms"] or 0.0)} for r in golden_series],
            "cpu_avg": [{"ts": r["ts"].isoformat(), "value": float(r["cpu_avg"] or 0.0)} for r in infra_series],
            "mem_avg": [{"ts": r["ts"].isoformat(), "value": float(r["mem_avg"] or 0.0)} for r in infra_series],
        }

    # -------------------------------------------------------------------------
    # 9) LIVE WIDGET ENRICHMENTS FOR TENANT OVERVIEW
    # -------------------------------------------------------------------------
    infra_hosts_rows: list[dict] = []
    synthetic_monitors: list[dict] = []
    synthetic_latency_trend: list[float] = []

    if environment_id:
        infra_hosts_rows_sql = """
          SELECT
            h.id AS host_id,
            COALESCE(NULLIF(h.hostname, ''), CAST(h.id AS text)) AS hostname,
            COALESCE(MAX(h.ip_address::text), '') AS ip_address,
            MAX(h.last_seen_at) AS last_seen_at,
            AVG(CASE WHEN m.name ILIKE '%cpu%' THEN CASE WHEN m.value <= 1 THEN m.value * 100 ELSE m.value END END) AS cpu_avg,
            AVG(CASE WHEN m.name ILIKE '%mem%' OR m.name ILIKE '%memory%' THEN CASE WHEN m.value <= 1 THEN m.value * 100 ELSE m.value END END) AS mem_avg,
            AVG(CASE WHEN m.name ILIKE '%disk%' THEN CASE WHEN m.value <= 1 THEN m.value * 100 ELSE m.value END END) AS disk_avg
          FROM core.hosts h
          LEFT JOIN metrics.metrics m
            ON m.tenant_id = h.tenant_id
           AND m.host_id = h.id
           AND m.environment_id = CAST(:env_id AS uuid)
           AND m.ts BETWEEN :from_ts AND :to_ts
           AND m.name IN (
             'system.cpu.utilization','system.cpu.usage','system.cpu.pct',
             'system.memory.utilization','system.mem.utilization','system.memory.pct',
             'system.disk.usage.percent','system.disk.utilization','system.disk.pct'
           )
          WHERE h.tenant_id = :tenant_id
            AND h.environment_id = CAST(:env_id AS uuid)
          GROUP BY h.id, h.hostname
          ORDER BY MAX(h.last_seen_at) DESC NULLS LAST, h.hostname ASC
          LIMIT 4;
        """

        synthetic_monitors_sql = """
          WITH recent AS (
            SELECT
              r.monitor_id,
              MAX(r.ts) AS last_ts,
              AVG(r.latency_ms)::float AS latency_ms,
              COUNT(*) AS checks_total,
              COUNT(*) FILTER (WHERE r.status ILIKE 'up%' OR r.status = 'OK') AS up_count,
              COUNT(*) FILTER (WHERE r.status ILIKE 'down%' OR r.status ILIKE 'fail%' OR r.status <> 'OK' AND r.status NOT ILIKE 'up%') AS down_count
            FROM synthetic.results r
            WHERE r.tenant_id = :tenant_id
              AND r.environment_id = CAST(:env_id AS uuid)
              AND r.ts BETWEEN :from_ts AND :to_ts
            GROUP BY r.monitor_id
          )
          SELECT
            m.id AS monitor_id,
            COALESCE(NULLIF(m.name, ''), 'Synthetic Monitor') AS name,
            COALESCE(NULLIF(m.location, ''), 'Global') AS location,
            recent.latency_ms,
            CASE
              WHEN COALESCE(recent.checks_total, 0) > 0 THEN (COALESCE(recent.up_count, 0)::float / NULLIF(recent.checks_total, 0)) * 100.0
              ELSE NULL
            END AS uptime_pct,
            CASE WHEN COALESCE(recent.down_count, 0) > 0 THEN 'down' ELSE 'up' END AS status,
            recent.last_ts
          FROM synthetic.monitors m
          LEFT JOIN recent ON recent.monitor_id = m.id
          WHERE m.tenant_id = :tenant_id
            AND m.environment_id = CAST(:env_id AS uuid)
          ORDER BY COALESCE(recent.down_count, 0) DESC, COALESCE(recent.last_ts, m.created_at) DESC NULLS LAST, m.name ASC
          LIMIT 4;
        """

        synthetic_trend_sql = """
          SELECT
            date_bin(make_interval(mins => :bucket_minutes), r.ts, :from_ts) AS bucket,
            AVG(r.latency_ms)::float AS latency_ms
          FROM synthetic.results r
          WHERE r.tenant_id = :tenant_id
            AND r.environment_id = CAST(:env_id AS uuid)
            AND r.ts BETWEEN :from_ts AND :to_ts
            AND r.latency_ms IS NOT NULL
          GROUP BY 1
          ORDER BY bucket ASC;
        """

        infra_hosts_rows = await _fetch_all(db, infra_hosts_rows_sql, {**metrics_params})
        synthetic_monitors = await _fetch_all(db, synthetic_monitors_sql, {**metrics_params})
        synthetic_trend_rows = await _fetch_all(db, synthetic_trend_sql, {**metrics_params, "bucket_minutes": bucket_minutes})
        synthetic_latency_trend = [float(r.get("latency_ms") or 0.0) for r in synthetic_trend_rows]

    payload: Dict[str, Any] = {
        "time_range": {"from": from_ts.isoformat(), "to": to_ts.isoformat()},
        "tenant_id": str(tenant_id),
        "environment_id": str(environment_id) if environment_id else None,

        "health": {
            "open_count": int(health.get("open_count") or 0),
            "critical_open": int(health.get("critical_open") or 0),
            "warning_open": int(health.get("warning_open") or 0),
            "open_touched_in_range": int(health.get("open_touched_in_range") or 0),
            "status": health_status,
        },

        "golden_signals": {
            "traffic_rps": float(golden.get("traffic_rps") or 0.0),
            "error_rate_pct": None if golden.get("error_rate_pct") is None else float(golden.get("error_rate_pct")),
            "latency_p95_ms": None if golden.get("latency_p95_ms") is None else float(golden.get("latency_p95_ms")),
        },

        "infra": {
            "hosts_total": int(infra_hosts.get("hosts_total") or 0),
            "hosts_alive": int(infra_hosts.get("hosts_alive") or 0),
            "cpu_avg": None if infra_metrics.get("cpu_avg") is None else float(infra_metrics.get("cpu_avg")),
            "mem_avg": None if infra_metrics.get("mem_avg") is None else float(infra_metrics.get("mem_avg")),
            "disk_avg": None if infra_metrics.get("disk_avg") is None else float(infra_metrics.get("disk_avg")),
            "network_avg": None if infra_metrics.get("network_avg") is None else float(infra_metrics.get("network_avg")),
            "metric_points": int(infra_metrics.get("metric_points") or 0),
            "metric_ingestion": int(infra_metrics.get("metric_points") or 0),
            "hosts": infra_hosts_rows,
        },

        "services_top": services_top,

        "error_hotspots": {
            "logs": hotspots_logs,
            "alerts": hotspots_alerts,
        },

        "synthetic": {
            **synthetic,
            "uptime_pct": uptime,
            "monitors": synthetic_monitors,
            "latency_trend": synthetic_latency_trend,
            "sparkline": synthetic_latency_trend,
        },

        "rum": rum,
        "customer_experience": {"web": {}, "mobile": {}},
    }

    if include_sparklines:
        payload["sparklines"] = sparklines

    # --- Customer Experience (RUM & UX) ---
    # Uses live RUM tables first, with raw_events as a fallback for performance metrics
    # and app names so the Tenant Overview widget does not appear empty when only
    # raw browser events have been ingested.
    async def _cx_for_platforms(platforms: list[str], *, mode: str = "web"):
        # LCP is the canonical Web RUM measure closest to perceived response.
        # Keep legacy pageview/raw-event measurements as compatibility fallbacks.
        t_satisfied = 2500.0
        t_tolerating = 4000.0
        is_web = mode == "web"
        raw_platform_match = "LOWER(COALESCE(re.payload->>'platform', 'browser')) IN ('browser','web')" if is_web else "LOWER(COALESCE(re.payload->>'platform', '')) IN ('android','ios','mobile')"

        app_filters = [p.lower() for p in platforms]
        app_where = [
            "a.tenant_id = :tenant_id",
            "LOWER(COALESCE(a.platform, '')) = ANY(CAST(:platforms AS text[]))",
            "COALESCE(a.name, '') <> ''",
        ]
        app_params = {"tenant_id": tenant_id, "platforms": app_filters}
        if environment_id:
            app_where.append("a.environment_id = CAST(:env_id AS uuid)")
            app_params["env_id"] = str(environment_id)

        apps_rows = await _fetch_all(
            db,
            f"""
            SELECT a.id, COALESCE(a.display_name, a.name) AS name,
                   a.name AS source_name, a.platform, a.environment_id
            FROM rum.apps a
            WHERE {' AND '.join(app_where)}
            ORDER BY a.updated_at DESC NULLS LAST, a.created_at DESC NULLS LAST,
                     COALESCE(a.display_name, a.name) ASC
            """,
            app_params,
        )
        app_ids = [str(r.get("id")) for r in apps_rows if r.get("id")]
        # Raw events retain the immutable SDK-reported name. Use source_name for
        # correlation while exposing the tenant-editable display name in cards.
        app_names = [str(r.get("source_name") or r.get("name")) for r in apps_rows if r.get("source_name") or r.get("name")]

        # Raw events fallback app names, useful when events arrive before rum.apps is populated.
        raw_where = [
            "re.tenant_id = :tenant_id",
            "re.received_at BETWEEN :from_ts AND :to_ts",
            "COALESCE(re.app_name, '') <> ''",
            raw_platform_match,
        ]
        raw_params = {"tenant_id": tenant_id, "from_ts": from_ts, "to_ts": to_ts}
        if environment_id:
            raw_where.append("re.environment_id = CAST(:env_id AS uuid)")
            raw_params["env_id"] = str(environment_id)

        raw_name_rows = await _fetch_all(
            db,
            f"""
            SELECT re.app_name AS name, COUNT(*) AS event_count
            FROM rum.raw_events re
            WHERE {' AND '.join(raw_where)}
            GROUP BY re.app_name
            ORDER BY event_count DESC, re.app_name ASC
            LIMIT 10
            """,
            raw_params,
        )
        raw_names = [str(r.get("name")) for r in raw_name_rows if r.get("name")]

        app_name_filter = list(dict.fromkeys([*app_names, *raw_names]))

        empty = {
            "satisfaction_pct": None,
            "churn_pct": None,
            "crash_pct": None,
            "avg_response_ms": None,
            "avg_response_time_ms": None,
            "app_count": len(app_name_filter),
            "pageviews": 0,
            "sessions": 0,
            "rum_errors": 0,
            "apps": [],
            "hourly": {"labels": [], "series": []},
            "weekly": {"labels": [], "series": []},
        }
         
        if not app_ids and not app_name_filter:
            return empty

        params = {
            "tenant_id": tenant_id,
            "from_ts": from_ts,
            "to_ts": to_ts,
            "app_ids": app_ids,
            "app_names": app_name_filter,
            "platforms": app_filters,
            "env_id": str(environment_id) if environment_id else None,
            "t_satisfied": t_satisfied,
            "t_tolerating": t_tolerating,
        }


        counts_row = await _fetch_one(
            db,
            f"""
            WITH x AS (
              SELECT
                a.id AS app_id,
                a.name AS app_name,
                a.environment_id
              FROM rum.apps a
              WHERE a.tenant_id = :tenant_id
                AND LOWER(COALESCE(a.platform, '')) = ANY(CAST(:platforms AS text[]))
                {"AND a.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
            )
            SELECT
              (
                SELECT COUNT(*)
                FROM rum.pageviews p
                JOIN x ON x.app_id = p.app_id
                WHERE p.tenant_id = :tenant_id
                  AND p.ts BETWEEN :from_ts AND :to_ts
              ) AS pageviews,
              (
                SELECT COUNT(*)
                FROM rum.sessions s
                JOIN x ON x.app_id = s.app_id
                WHERE s.tenant_id = :tenant_id
                  AND s.started_at BETWEEN :from_ts AND :to_ts
              ) AS sessions,
              (
                SELECT COUNT(*)
                FROM rum.errors e
                JOIN x ON x.app_id = e.app_id
                WHERE e.tenant_id = :tenant_id
                  AND e.ts BETWEEN :from_ts AND :to_ts
              ) AS rum_errors
            """,
            params,
        ) or {}

        pageviews_total = int(counts_row.get("pageviews") or 0)
        sessions_total = int(counts_row.get("sessions") or 0)
        rum_errors_total = int(counts_row.get("rum_errors") or 0)

        perf_row = await _fetch_one(
            db,
            f"""
            WITH perf AS (
              SELECT
                w.app_id,
                a.name AS app_name,
                w.ts,
                w.metric_value::float AS resp_ms
              FROM rum.web_vitals w
              JOIN rum.apps a ON a.id = w.app_id
              WHERE w.tenant_id = :tenant_id
                AND w.ts BETWEEN :from_ts AND :to_ts
                AND LOWER(COALESCE(a.platform, '')) = ANY(CAST(:platforms AS text[]))
                {"AND w.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
                AND LOWER(w.metric_name) IN ('lcp', 'largest_contentful_paint')
                AND w.metric_value > 0

              UNION ALL

              SELECT
                p.app_id,
                a.name AS app_name,
                p.ts,
                COALESCE(
                  NULLIF(p.lcp_ms, 0),
                  NULLIF(p.fcp_ms, 0),
                  NULLIF(p.dom_load_ms, 0),
                  NULLIF(p.ttfb_ms, 0)
                )::float AS resp_ms
              FROM rum.pageviews p
              JOIN rum.apps a ON a.id = p.app_id
              WHERE p.tenant_id = :tenant_id
                AND p.ts BETWEEN :from_ts AND :to_ts
                AND NOT EXISTS (
                  SELECT 1 FROM rum.web_vitals wv
                  WHERE wv.tenant_id = p.tenant_id
                    AND wv.app_id = p.app_id
                    AND wv.ts BETWEEN :from_ts AND :to_ts
                    AND LOWER(wv.metric_name) IN ('lcp', 'largest_contentful_paint')
                )
                AND LOWER(COALESCE(a.platform, '')) = ANY(CAST(:platforms AS text[]))
                {"AND a.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
                AND COALESCE(
                  NULLIF(p.lcp_ms, 0),
                  NULLIF(p.fcp_ms, 0),
                  NULLIF(p.dom_load_ms, 0),
                  NULLIF(p.ttfb_ms, 0)
                ) IS NOT NULL

              UNION ALL

              SELECT
                NULL::uuid AS app_id,
                re.app_name,
                re.received_at AS ts,
                NULLIF((re.payload->>'value')::float, 0) AS resp_ms
              FROM rum.raw_events re
              WHERE re.tenant_id = :tenant_id
                AND re.received_at BETWEEN :from_ts AND :to_ts
                {"AND re.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
                AND re.event_type = 'performance_metric'
                AND COALESCE(re.app_name, '') <> ''
                AND {raw_platform_match}
                AND LOWER(COALESCE(re.payload->>'metric_name', '')) IN ('response_time','interaction_latency','page_load','page_load_time','load_time')
                AND NULLIF((re.payload->>'value')::float, 0) IS NOT NULL
                AND (COALESCE(cardinality(CAST(:app_names AS text[])), 0) = 0 OR re.app_name = ANY(CAST(:app_names AS text[])))
            )
            SELECT
              COUNT(*) AS n,
              COUNT(*) FILTER (WHERE resp_ms <= :t_satisfied) AS satisfied,
              COUNT(*) FILTER (WHERE resp_ms > :t_satisfied AND resp_ms <= :t_tolerating) AS tolerating,
              AVG(resp_ms)::float AS avg_response_ms
            FROM perf
            """,
            params,
        ) or {}

        n = float(perf_row.get("n") or 0)
        satisfied = float(perf_row.get("satisfied") or 0)
        tolerating = float(perf_row.get("tolerating") or 0)
        satisfaction_pct = ((satisfied + tolerating / 2.0) / n) * 100.0 if n > 0 else None
        avg_response_ms = perf_row.get("avg_response_ms")

        if is_web:
            bounce_row = await _fetch_one(
                db,
                f"""
                WITH scoped_sessions AS (
                  SELECT s.id
                  FROM rum.sessions s
                  JOIN rum.apps a ON a.id = s.app_id
                  WHERE s.tenant_id = :tenant_id
                    AND s.started_at BETWEEN :from_ts AND :to_ts
                    AND LOWER(COALESCE(a.platform, '')) = ANY(CAST(:platforms AS text[]))
                    {"AND a.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
                ),
                pv AS (
                  SELECT p.session_id, COUNT(*) AS pv_count
                  FROM rum.pageviews p
                  JOIN rum.apps a ON a.id = p.app_id
                  WHERE p.tenant_id = :tenant_id
                    AND p.ts BETWEEN :from_ts AND :to_ts
                    AND p.session_id IS NOT NULL
                    AND LOWER(COALESCE(a.platform, '')) = ANY(CAST(:platforms AS text[]))
                    {"AND a.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
                  GROUP BY p.session_id
                )
                SELECT
                  COUNT(*) AS sessions_total,
                  COUNT(*) FILTER (WHERE COALESCE(pv.pv_count, 0) <= 1) AS bounced
                FROM scoped_sessions ss
                LEFT JOIN pv ON pv.session_id = ss.id
                """,
                params,
            ) or {}
            sess = float(bounce_row.get("sessions_total") or 0)
            bounced = float(bounce_row.get("bounced") or 0)
            secondary_pct = (bounced / sess) * 100.0 if sess > 0 else None
        else:
            crash_row = await _fetch_one(
                db,
                f"""
                SELECT
                  COUNT(*) AS sessions_total,
                  (
                    SELECT COUNT(*)
                    FROM rum.errors e
                    JOIN rum.apps a ON a.id = e.app_id
                    WHERE e.tenant_id = :tenant_id
                      AND e.ts BETWEEN :from_ts AND :to_ts
                      AND LOWER(COALESCE(a.platform, '')) = ANY(CAST(:platforms AS text[]))
                      {"AND a.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
                  ) AS crash_events
                FROM rum.sessions s
                JOIN rum.apps a ON a.id = s.app_id
                WHERE s.tenant_id = :tenant_id
                  AND s.started_at BETWEEN :from_ts AND :to_ts
                  AND LOWER(COALESCE(a.platform, '')) = ANY(CAST(:platforms AS text[]))
                  {"AND a.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
                """,
                params,
            ) or {}
            sess = float(crash_row.get("sessions_total") or 0)
            crash_events = float(crash_row.get("crash_events") or 0)
            secondary_pct = (crash_events / sess) * 100.0 if sess > 0 else None

        top_apps = await _fetch_all(
            db,
            f"""
            WITH perf AS (
              SELECT
                a.id AS app_id,
                COALESCE(a.display_name, a.name) AS name,
                w.metric_value::float AS resp_ms,
                1::bigint AS hits
              FROM rum.web_vitals w
              JOIN rum.apps a ON a.id = w.app_id
              WHERE w.tenant_id = :tenant_id
                AND w.ts BETWEEN :from_ts AND :to_ts
                AND LOWER(COALESCE(a.platform, '')) = ANY(CAST(:platforms AS text[]))
                {"AND w.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
                AND LOWER(w.metric_name) IN ('lcp', 'largest_contentful_paint')
                AND w.metric_value > 0

              UNION ALL

              SELECT
                a.id AS app_id,
                COALESCE(a.display_name, a.name) AS name,
                COALESCE(NULLIF(p.lcp_ms, 0), NULLIF(p.fcp_ms, 0), NULLIF(p.dom_load_ms, 0), NULLIF(p.ttfb_ms, 0))::float AS resp_ms,
                1::bigint AS hits
              FROM rum.pageviews p
              JOIN rum.apps a ON a.id = p.app_id
              WHERE p.tenant_id = :tenant_id
                AND p.ts BETWEEN :from_ts AND :to_ts
                AND NOT EXISTS (
                  SELECT 1 FROM rum.web_vitals wv
                  WHERE wv.tenant_id = p.tenant_id
                    AND wv.app_id = p.app_id
                    AND wv.ts BETWEEN :from_ts AND :to_ts
                    AND LOWER(wv.metric_name) IN ('lcp', 'largest_contentful_paint')
                )
                AND LOWER(COALESCE(a.platform, '')) = ANY(CAST(:platforms AS text[]))
                {"AND a.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}

              UNION ALL

              SELECT
                NULL::uuid AS app_id,
                COALESCE(raw_app.display_name, re.app_name) AS name,
                NULLIF((re.payload->>'value')::float, 0) AS resp_ms,
                1::bigint AS hits
              FROM rum.raw_events re
              LEFT JOIN rum.apps raw_app
                ON raw_app.tenant_id = re.tenant_id
               AND raw_app.environment_id IS NOT DISTINCT FROM re.environment_id
               AND raw_app.name = re.app_name
              WHERE re.tenant_id = :tenant_id
                AND re.received_at BETWEEN :from_ts AND :to_ts
                {"AND re.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
                AND COALESCE(re.app_name, '') <> ''
                AND {raw_platform_match}
                AND re.event_type = 'performance_metric'
            )
            SELECT
              MIN(app_id::text) AS app_id,
              name,
              COUNT(*) AS sample_count,
              AVG(resp_ms)::float AS avg_response_ms
            FROM perf
            GROUP BY name
            ORDER BY sample_count DESC, name ASC
            LIMIT 4
            """,
            params,
        )

        apps = []
        for row in top_apps or []:
            apps.append({
                "app_id": row.get("app_id"),
                "name": row.get("name"),
                "avg_resp_ms": row.get("avg_response_ms"),
                "avg_response_ms": row.get("avg_response_ms"),
            })

        # If performance data is absent, still show up to 4 known apps.
        if not apps:
            for row in apps_rows:
                apps.append({
                    "app_id": str(row.get("id")) if row.get("id") else None,
                    "name": row.get("name"),
                    "avg_resp_ms": None,
                    "avg_response_ms": None,
                })
            for name in raw_names:
                if len(apps) >= 4:
                    break
                if name not in {a["name"] for a in apps}:
                    apps.append({"app_id": None, "name": name, "avg_resp_ms": None, "avg_response_ms": None})

        # Trend buckets for widget chart: Healthy vs Churn/Crashes
        try:
            span_hours = max(1.0, (to_ts - from_ts).total_seconds() / 3600.0)
        except Exception:
            span_hours = 24.0
        if span_hours <= 48:
            step_hours = 1
        elif span_hours <= 168:
            step_hours = 6
        else:
            step_hours = 24

        trend_rows = await _fetch_all(
            db,
            f"""
            WITH perf AS (
              SELECT
                date_bin(make_interval(hours => CAST(:step_hours AS integer)), w.ts, CAST(:from_ts AS timestamptz)) AS bucket,
                w.metric_value::float AS resp_ms
              FROM rum.web_vitals w
              JOIN rum.apps a ON a.id = w.app_id
              WHERE w.tenant_id = :tenant_id
                AND w.ts BETWEEN :from_ts AND :to_ts
                AND LOWER(COALESCE(a.platform, '')) = ANY(CAST(:platforms AS text[]))
                {"AND w.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
                AND LOWER(w.metric_name) IN ('lcp', 'largest_contentful_paint')
                AND w.metric_value > 0

              UNION ALL

              SELECT
                date_bin(make_interval(hours => CAST(:step_hours AS integer)), p.ts, CAST(:from_ts AS timestamptz)) AS bucket,
                COALESCE(NULLIF(p.lcp_ms, 0), NULLIF(p.fcp_ms, 0), NULLIF(p.dom_load_ms, 0), NULLIF(p.ttfb_ms, 0))::float AS resp_ms
              FROM rum.pageviews p
              JOIN rum.apps a ON a.id = p.app_id
              WHERE p.tenant_id = :tenant_id
                AND p.ts BETWEEN :from_ts AND :to_ts
                AND NOT EXISTS (
                  SELECT 1 FROM rum.web_vitals wv
                  WHERE wv.tenant_id = p.tenant_id
                    AND wv.app_id = p.app_id
                    AND wv.ts BETWEEN :from_ts AND :to_ts
                    AND LOWER(wv.metric_name) IN ('lcp', 'largest_contentful_paint')
                )
                AND LOWER(COALESCE(a.platform, '')) = ANY(CAST(:platforms AS text[]))
                {"AND a.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
                AND COALESCE(NULLIF(p.lcp_ms, 0), NULLIF(p.fcp_ms, 0), NULLIF(p.dom_load_ms, 0), NULLIF(p.ttfb_ms, 0)) IS NOT NULL

              UNION ALL

              SELECT
                date_bin(make_interval(hours => CAST(:step_hours AS integer)), re.received_at, CAST(:from_ts AS timestamptz)) AS bucket,
                NULLIF((re.payload->>'value')::float, 0) AS resp_ms
              FROM rum.raw_events re
              WHERE re.tenant_id = :tenant_id
                AND re.received_at BETWEEN :from_ts AND :to_ts
                {"AND re.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
                AND re.event_type = 'performance_metric'
                AND COALESCE(re.app_name, '') <> ''
                AND {raw_platform_match}
                AND LOWER(COALESCE(re.payload->>'metric_name', '')) IN ('response_time','interaction_latency','page_load','page_load_time','load_time')
                AND NULLIF((re.payload->>'value')::float, 0) IS NOT NULL
            ),
            perf_agg AS (
              SELECT
                bucket,
                COUNT(*) AS perf_n,
                COUNT(*) FILTER (WHERE resp_ms <= :t_satisfied) AS perf_satisfied,
                COUNT(*) FILTER (WHERE resp_ms > :t_satisfied AND resp_ms <= :t_tolerating) AS perf_tolerating
              FROM perf
              GROUP BY bucket
            ),
            secondary AS (
              SELECT
                date_bin(make_interval(hours => CAST(:step_hours AS integer)), s.started_at, CAST(:from_ts AS timestamptz)) AS bucket,
                COUNT(*) AS sessions_total,
                COUNT(*) FILTER (WHERE COALESCE(pv.pv_count, 0) <= 1) AS secondary_total
              FROM rum.sessions s
              JOIN rum.apps a ON a.id = s.app_id
              LEFT JOIN (
                SELECT p.session_id, COUNT(*) AS pv_count
                FROM rum.pageviews p
                JOIN rum.apps ap ON ap.id = p.app_id
                WHERE p.tenant_id = :tenant_id
                  AND p.ts BETWEEN :from_ts AND :to_ts
                  AND LOWER(COALESCE(ap.platform, '')) = ANY(CAST(:platforms AS text[]))
                  {"AND ap.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
                GROUP BY p.session_id
              ) pv ON pv.session_id = s.id
              WHERE s.tenant_id = :tenant_id
                AND s.started_at BETWEEN :from_ts AND :to_ts
                AND LOWER(COALESCE(a.platform, '')) = ANY(CAST(:platforms AS text[]))
                {"AND a.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
              GROUP BY bucket
            ),
            crash_secondary AS (
              SELECT
                date_bin(make_interval(hours => CAST(:step_hours AS integer)), s.started_at, CAST(:from_ts AS timestamptz)) AS bucket,
                COUNT(DISTINCT s.id) AS sessions_total,
                COUNT(e.*) AS secondary_total
              FROM rum.sessions s
              JOIN rum.apps a ON a.id = s.app_id
              LEFT JOIN rum.errors e
                ON e.tenant_id = s.tenant_id
               AND e.app_id = s.app_id
               AND e.session_id = s.id
               AND e.ts BETWEEN :from_ts AND :to_ts
              WHERE s.tenant_id = :tenant_id
                AND s.started_at BETWEEN :from_ts AND :to_ts
                AND LOWER(COALESCE(a.platform, '')) = ANY(CAST(:platforms AS text[]))
                {"AND a.environment_id = CAST(:env_id AS uuid)" if environment_id else ""}
              GROUP BY bucket
            )
            SELECT
              COALESCE(p.bucket, s.bucket, c.bucket) AS bucket,
              p.perf_n,
              p.perf_satisfied,
              p.perf_tolerating,
              CASE WHEN :is_web = 1 THEN s.sessions_total ELSE c.sessions_total END AS sessions_total,
              CASE WHEN :is_web = 1 THEN s.secondary_total ELSE c.secondary_total END AS secondary_total
            FROM perf_agg p
            FULL OUTER JOIN secondary s ON s.bucket = p.bucket
            FULL OUTER JOIN crash_secondary c ON c.bucket = COALESCE(p.bucket, s.bucket)
            ORDER BY bucket ASC
            """,
            {**params, "step_hours": step_hours, "is_web": 1 if is_web else 0},
        )

        labels = []
        healthy_vals = []
        secondary_vals = []
        for row in trend_rows or []:
            bucket = row.get("bucket")
            if not bucket:
                continue
            labels.append(bucket.isoformat() if hasattr(bucket, 'isoformat') else str(bucket))
            perf_n = float(row.get("perf_n") or 0)
            perf_s = float(row.get("perf_satisfied") or 0)
            perf_t = float(row.get("perf_tolerating") or 0)
            healthy_vals.append((((perf_s + perf_t / 2.0) / perf_n) * 100.0) if perf_n > 0 else None)
            s_total = float(row.get("sessions_total") or 0)
            sec_total = float(row.get("secondary_total") or 0)
            secondary_vals.append(((sec_total / s_total) * 100.0) if s_total > 0 else None)

        trend = {
            "labels": labels,
            "series": [
                {"name": "Healthy", "values": healthy_vals},
                {"name": "Churn" if is_web else "Crashes", "values": secondary_vals},
            ],
        }

         

        return {
            "satisfaction_pct": satisfaction_pct,
            "churn_pct": secondary_pct if is_web else None,
            "crash_pct": secondary_pct if not is_web else secondary_pct,
            "avg_response_ms": avg_response_ms,
            "avg_response_time_ms": avg_response_ms,
            "app_count": len({a.get('name') for a in apps if a.get('name')}) or len(app_name_filter),
            "pageviews": pageviews_total,
            "sessions": sessions_total,
            "rum_errors": rum_errors_total,
            "apps": apps,
            "hourly": trend,
            "weekly": trend,
        }
    async def _mobile_cx():
        """
        Mobile Customer Experience — pulls from the public.rum_* mobile RUM
        pipeline (rum_apps / rum_sessions / rum_session_summaries / rum_http_requests),
        entirely separate from the `rum` schema (web-only RUM).

        Two different time windows are used, and callers/consumers of this
        payload should not assume every field describes the same period:

        - Sessions, avg response time, and the "running apps" list use the
          exact window the user selected on the dashboard (from_ts/to_ts).
          "Running apps" is further restricted to apps with session activity
          in the last real-time 2 hours, regardless of the selected window,
          so it reflects genuinely live usage rather than historical volume.

        - Satisfaction, crash rate, RUM error count, and the weekly/hourly
          trend chart all depend on rum_session_summaries, an async job that
          can lag well behind live sessions (observed gap: ~31 days as of
          writing). Rather than guess a fixed lookback that may still miss
          real data, we find the actual most recent summarized session
          tenant-wide (the job's "watermark") and use a 7-day window ending
          there. This self-corrects automatically as soon as the summarization
          job catches up — no code change needed — since the watermark is
          recomputed fresh on every request. `summary_window_used` reports
          the exact window applied, so the frontend can label these fields
          accordingly instead of implying they reflect the dashboard's
          selected range.
        """
        params = {"tenant_id": tenant_id, "from_ts": from_ts, "to_ts": to_ts}

        apps_rows = await _fetch_all(
            db,
            """
            SELECT id, name, package_name
            FROM public.rum_apps
            WHERE tenant_id = :tenant_id
            """,
            {"tenant_id": tenant_id},
        )

        empty = {
            "satisfaction_pct": None,
            "churn_pct": None,
            "crash_pct": None,
            "avg_response_ms": None,
            "avg_response_time_ms": None,
            "app_count": len(apps_rows),
            "pageviews": 0,
            "sessions": 0,
            "rum_errors": 0,
            "apps": [],
            "hourly": {"labels": [], "series": []},
            "weekly": {"labels": [], "series": []},
            "summary_window_used": None,
        }

        if not apps_rows:
            return empty

        # Sessions count — scoped to the user's exact selected window.
        sessions_row = await _fetch_one(
            db,
            """
            SELECT COUNT(DISTINCT s.id) AS sessions_total
            FROM public.rum_sessions s
            JOIN public.rum_apps a ON a.id = s.app_id
            WHERE a.tenant_id = :tenant_id
              AND s.start_time BETWEEN :from_ts AND :to_ts
            """,
            params,
        ) or {}
        sessions_total = int(sessions_row.get("sessions_total") or 0)

        # Response time — from rum_http_requests, scoped to the user's exact window.
        http_row = await _fetch_one(
            db,
            """
            SELECT AVG(h.duration_ms)::float AS avg_latency_ms
            FROM public.rum_http_requests h
            JOIN public.rum_apps a ON a.id = h.app_id
            WHERE a.tenant_id = :tenant_id
              AND h.request_timestamp BETWEEN :from_ts AND :to_ts
            """,
            params,
        ) or {}
        avg_latency_ms = http_row.get("avg_latency_ms")

        # Find the actual watermark of the summarization job for this tenant,
        # rather than guessing a fixed lookback window. Tenant-wide: if any
        # app's summaries are current, the window reflects that recency.
        watermark_row = await _fetch_one(
            db,
            """
            SELECT MAX(s.start_time) AS latest_summarized_at
            FROM public.rum_sessions s
            JOIN public.rum_apps a ON a.id = s.app_id
            JOIN public.rum_session_summaries ss ON ss.session_id = s.id
            WHERE a.tenant_id = :tenant_id
            """,
            {"tenant_id": tenant_id},
        ) or {}
        latest_summarized_at = watermark_row.get("latest_summarized_at")

        crashes_total = 0.0
        crash_pct = None
        satisfaction_pct = None
        summary_window_used = None
        trend = {"labels": [], "series": [{"name": "Healthy", "values": []}, {"name": "Crashes", "values": []}]}

        if latest_summarized_at:
            # Look back a generous window ending at the watermark, so we
            # capture a real batch of summarized sessions regardless of how
            # far behind the job has fallen.
            summary_from_ts = latest_summarized_at - timedelta(days=7)
            summary_to_ts = latest_summarized_at
            summary_window_used = {"from": summary_from_ts.isoformat(), "to": summary_to_ts.isoformat()}
            summary_params = {"tenant_id": tenant_id, "from_ts": summary_from_ts, "to_ts": summary_to_ts}

            summary_row = await _fetch_one(
                db,
                """
                SELECT
                  SUM(COALESCE(ss.crashes_total, 0)) AS crashes_total,
                  SUM(COALESCE(ss.fatal_crashes, 0)) AS fatal_crashes,
                  AVG(ss.success_rate)::float AS avg_success_rate,
                  COUNT(ss.session_id) AS summaries_found,
                  COUNT(DISTINCT s.id) AS sessions_in_summary_window
                FROM public.rum_sessions s
                JOIN public.rum_apps a ON a.id = s.app_id
                LEFT JOIN public.rum_session_summaries ss ON ss.session_id = s.id
                WHERE a.tenant_id = :tenant_id
                  AND s.start_time BETWEEN :from_ts AND :to_ts
                """,
                summary_params,
            ) or {}

            crashes_total = float(summary_row.get("crashes_total") or 0)
            sessions_in_summary_window = int(summary_row.get("sessions_in_summary_window") or 0)
            summaries_found = int(summary_row.get("summaries_found") or 0)
            raw_success_rate = summary_row.get("avg_success_rate")

            # Only compute crash_pct/satisfaction if we actually found summary
            # data; otherwise honestly report None rather than a misleading 0%.
            if summaries_found > 0:
                crash_pct = (crashes_total / sessions_in_summary_window) * 100.0 if sessions_in_summary_window > 0 else None
                if raw_success_rate is not None:
                    satisfaction_pct = float(raw_success_rate) * 100.0 if raw_success_rate <= 1 else float(raw_success_rate)

            # Weekly/hourly trend buckets: Healthy (success rate) vs Crashes.
            # Uses the same watermark-anchored window as satisfaction/crash rate,
            # since it depends on the same lagging rum_session_summaries data.
            try:
                span_hours = max(1.0, (summary_to_ts - summary_from_ts).total_seconds() / 3600.0)
            except Exception:
                span_hours = 168.0
            step_hours = 1 if span_hours <= 48 else (6 if span_hours <= 168 else 24)

            trend_rows = await _fetch_all(
                db,
                """
                SELECT
                  date_bin(make_interval(hours => CAST(:step_hours AS integer)), s.start_time, CAST(:from_ts AS timestamptz)) AS bucket,
                  COUNT(DISTINCT s.id) AS sessions_total,
                  SUM(COALESCE(ss.crashes_total, 0)) AS crashes_total,
                  AVG(ss.success_rate)::float AS avg_success_rate
                FROM public.rum_sessions s
                JOIN public.rum_apps a ON a.id = s.app_id
                LEFT JOIN public.rum_session_summaries ss ON ss.session_id = s.id
                WHERE a.tenant_id = :tenant_id
                  AND s.start_time BETWEEN :from_ts AND :to_ts
                GROUP BY bucket
                ORDER BY bucket ASC
                """,
                {**summary_params, "step_hours": step_hours},
            )

            labels, healthy_vals, crash_vals = [], [], []
            for row in trend_rows or []:
                bucket = row.get("bucket")
                if not bucket:
                    continue
                labels.append(bucket.isoformat() if hasattr(bucket, "isoformat") else str(bucket))
                s_total = float(row.get("sessions_total") or 0)
                c_total = float(row.get("crashes_total") or 0)
                raw_sr = row.get("avg_success_rate")
                if raw_sr is not None:
                    healthy_vals.append(float(raw_sr) * 100.0 if raw_sr <= 1 else float(raw_sr))
                else:
                    healthy_vals.append(None)
                crash_vals.append((c_total / s_total) * 100.0 if s_total > 0 else None)

            trend = {
                "labels": labels,
                "series": [
                    {"name": "Healthy", "values": healthy_vals},
                    {"name": "Crashes", "values": crash_vals},
                ],
            }

        # "Running apps": apps with genuinely live/recent activity — always
        # anchored to a real-time 2h cutoff, independent of the user's
        # selected dashboard window, so this list means "running right now"
        # even if the dashboard is showing "Last 30 Days" or similar.
        top_apps_rows = await _fetch_all(
            db,
            """
            SELECT
              a.id AS app_id,
              a.name AS name,
              COUNT(DISTINCT s.id) AS session_count,
              AVG(h.duration_ms)::float AS avg_resp_ms
            FROM public.rum_apps a
            JOIN public.rum_sessions s ON s.app_id = a.id
            LEFT JOIN public.rum_http_requests h
              ON h.app_id = a.id
             AND h.request_timestamp BETWEEN :from_ts AND :to_ts
            WHERE a.tenant_id = :tenant_id
              AND s.start_time BETWEEN :from_ts AND :to_ts
              AND COALESCE(s.last_activity_at, s.start_time) >= (now() - interval '2 hours')
            GROUP BY a.id, a.name
            ORDER BY session_count DESC
            LIMIT 100
            """,
            params,
        )

        apps = []
        for row in top_apps_rows or []:
            apps.append({
                "app_id": str(row.get("app_id")) if row.get("app_id") is not None else None,
                "name": row.get("name"),
                "avg_resp_ms": row.get("avg_resp_ms"),
                "avg_response_ms": row.get("avg_resp_ms"),
            })
        # Fallback: if no apps are currently "running", still list known apps
        # so the card doesn't render fully empty.
        if not apps:
            for row in apps_rows:
                apps.append({
                    "app_id": str(row.get("id")) if row.get("id") is not None else None,
                    "name": row.get("name"),
                    "avg_resp_ms": None,
                    "avg_response_ms": None,
                })

        return {
            "satisfaction_pct": satisfaction_pct,
            "churn_pct": None,
            "crash_pct": crash_pct,
            "avg_response_ms": avg_latency_ms,
            "avg_response_time_ms": avg_latency_ms,
            "app_count": len(apps_rows),
            "pageviews": 0,
            "sessions": sessions_total,
            "rum_errors": int(crashes_total),
            "apps": apps,
            "hourly": trend,
            "weekly": trend,
            "summary_window_used": summary_window_used,
        }

    try:
        cx_web = await _cx_for_platforms(["browser", "web"], mode="web")
        cx_mobile = await _mobile_cx()
        customer_experience = {
            "web_app": cx_web,
            "mobile_app": cx_mobile,
            "web": cx_web,
            "mobile": cx_mobile,
        }
    except Exception:
        log.exception("enterprise_overview: customer experience build failed")
        customer_experience = {"web_app": {}, "mobile_app": {}, "web": {}, "mobile": {}}
    payload["customer_experience"] = customer_experience

    return payload
