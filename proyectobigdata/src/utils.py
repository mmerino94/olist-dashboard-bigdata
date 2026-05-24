from __future__ import annotations

import streamlit as st


def format_currency(value: float) -> str:
    return f"R$ {value:,.2f}"


def format_number(value: float | int) -> str:
    return f"{value:,.0f}"


def format_pct(value: float) -> str:
    return f"{value:.1%}"


def render_section_header(title: str, subtitle: str) -> None:
    st.markdown(f"<div class='section-title'>{title}</div>", unsafe_allow_html=True)
    st.markdown(f"<div class='section-subtitle'>{subtitle}</div>", unsafe_allow_html=True)


def render_kpi_cards(metrics: list[dict]) -> None:
    cols = st.columns(len(metrics))
    for col, metric in zip(cols, metrics):
        raw_value = metric["value"]
        kind = metric["kind"]
        if kind == "currency":
            value = format_currency(raw_value)
        elif kind == "pct":
            value = format_pct(raw_value)
        elif kind == "days":
            value = f"{raw_value:.1f} días"
        else:
            value = format_number(raw_value)

        col.markdown(
            f"""
            <div class="kpi-card">
                <div class="kpi-label">{metric['label']}</div>
                <div class="kpi-value">{value}</div>
            </div>
            """,
            unsafe_allow_html=True,
        )


def render_status_message(title: str, lines: list[str], tone: str = "neutral") -> None:
    css_class = {
        "neutral": "message-box",
        "warning": "message-box warning",
        "success": "message-box success",
    }.get(tone, "message-box")
    items = "".join(f"<li>{line}</li>" for line in lines)
    st.markdown(
        f"<div class='{css_class}'><h4>{title}</h4><ul>{items}</ul></div>",
        unsafe_allow_html=True,
    )


def render_recommendation_box(title: str, lines: list[str]) -> None:
    render_status_message(title, lines, tone="success")


def render_slide_cover(title: str, subtitle: str, eyebrow: str, bullets: list[str]) -> None:
    bullet_html = "".join(f"<li>{item}</li>" for item in bullets)
    st.markdown(
        f"""
        <section class="slide-cover">
            <div class="slide-eyebrow">{eyebrow}</div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
            <ul>{bullet_html}</ul>
        </section>
        """,
        unsafe_allow_html=True,
    )


def render_team_members(members: list[str]) -> None:
    items = "".join(f"<li>{member}</li>" for member in members)
    st.markdown(
        f"""
        <div class="team-card">
            <div class="team-card-label">Integrantes</div>
            <div class="team-card-value">
                <ul>{items}</ul>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_slide_block(title: str, subtitle: str, body: str, tone: str = "neutral") -> None:
    css_class = f"slide-block {tone}"
    st.markdown(
        f"""
        <div class="{css_class}">
            <div class="slide-block-subtitle">{subtitle}</div>
            <h3>{title}</h3>
            <p>{body}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_speaker_notes(lines: list[str]) -> None:
    notes = "".join(f"<li>{line}</li>" for line in lines)
    st.markdown(
        f"""
        <div class="speaker-notes">
            <div class="speaker-notes-title">Guion para exposición</div>
            <ul>{notes}</ul>
        </div>
        """,
        unsafe_allow_html=True,
    )
