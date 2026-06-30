"""Telemetry — OpenTelemetry + Azure Application Insights.

Initialise once at application startup.  All subsequent OTEL calls (traces,
metrics, logs) are automatically exported to Application Insights when the
``APPLICATIONINSIGHTS_CONNECTION_STRING`` environment variable is set.

When the variable is absent (local dev, unit tests) the setup is a no-op so
there are zero changes to how the app runs locally.
"""
from __future__ import annotations

import logging
import os

import structlog

logger = structlog.get_logger(__name__)


def setup_telemetry() -> None:
    """Configure OpenTelemetry SDK and wire Azure Monitor exporter."""
    cs = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING", "").strip()
    if not cs:
        logger.info("telemetry.skipped", reason="APPLICATIONINSIGHTS_CONNECTION_STRING not set")
        return

    try:
        # azure-monitor-opentelemetry configures the OTEL SDK and exports to
        # Application Insights in a single call.
        from azure.monitor.opentelemetry import configure_azure_monitor  # type: ignore
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor  # type: ignore
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor  # type: ignore
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor  # type: ignore

        configure_azure_monitor(connection_string=cs)

        # Auto-instrument SQLAlchemy (DB query spans)
        SQLAlchemyInstrumentor().instrument()

        # Auto-instrument httpx (outbound HTTP spans — LLM calls, GitHub API)
        HTTPXClientInstrumentor().instrument()

        # FastAPI instrumentation is applied to the app instance after creation;
        # we expose a helper so main.py can call it after `app = FastAPI(...)`.
        logger.info("telemetry.configured", exporter="azure_monitor")

    except ImportError as exc:  # pragma: no cover
        # Packages not installed — log and continue rather than crash
        logger.warning(
            "telemetry.import_error",
            error=str(exc),
            hint="Install azure-monitor-opentelemetry to enable Application Insights",
        )
    except Exception as exc:  # pragma: no cover
        logger.error("telemetry.setup_failed", error=str(exc))


def instrument_fastapi(app) -> None:  # noqa: ANN001
    """Call after FastAPI() is constructed to attach OTEL request tracing."""
    cs = os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING", "").strip()
    if not cs:
        return
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor  # type: ignore

        FastAPIInstrumentor.instrument_app(app)
        logger.info("telemetry.fastapi_instrumented")
    except Exception:  # pragma: no cover
        pass
