from __future__ import annotations

import streamlit as st


def apply_global_styles() -> None:
    st.markdown(
        """
        <style>
        .stApp {
            background:
                radial-gradient(circle at top left, rgba(29,131,72,0.08), transparent 24%),
                linear-gradient(180deg, #F8F9F9 0%, #FDFEFE 100%);
        }
        [data-testid="stSidebar"] {
            background: linear-gradient(180deg, #17202A 0%, #1F2D3A 100%);
        }
        [data-testid="stSidebar"] * {
            color: #F8F9F9;
        }
        .section-title {
            font-size: 2rem;
            font-weight: 700;
            color: #17202A;
            margin-bottom: 0.25rem;
        }
        .section-subtitle {
            font-size: 1rem;
            color: #566573;
            margin-bottom: 1.5rem;
        }
        .kpi-card {
            background: white;
            border: 1px solid #E5E8E8;
            border-radius: 18px;
            padding: 1rem 1.1rem;
            box-shadow: 0 10px 30px rgba(23, 32, 42, 0.06);
            min-height: 110px;
        }
        .kpi-label {
            color: #566573;
            font-size: 0.9rem;
            margin-bottom: 0.55rem;
        }
        .kpi-value {
            color: #17202A;
            font-size: 1.65rem;
            font-weight: 700;
        }
        .message-box {
            background: white;
            border-left: 5px solid #5D6D7E;
            border-radius: 14px;
            padding: 1rem 1.2rem;
            box-shadow: 0 8px 24px rgba(23, 32, 42, 0.05);
        }
        .message-box.warning {
            border-left-color: #C0392B;
        }
        .message-box.success {
            border-left-color: #1D8348;
        }
        .message-box h4 {
            margin: 0 0 0.6rem 0;
            color: #17202A;
        }
        .message-box ul {
            margin: 0;
            padding-left: 1.1rem;
            color: #34495E;
        }
        .slide-cover {
            background:
                radial-gradient(circle at top right, rgba(183,149,11,0.24), transparent 24%),
                linear-gradient(135deg, #17202A 0%, #1D8348 100%);
            border-radius: 28px;
            padding: 2.5rem 2.5rem 2rem 2.5rem;
            color: #FDFEFE;
            box-shadow: 0 20px 50px rgba(23, 32, 42, 0.18);
            margin-bottom: 1rem;
        }
        .slide-cover h1 {
            font-size: 2.7rem;
            line-height: 1.05;
            margin: 0.2rem 0 0.9rem 0;
            color: #FDFEFE;
        }
        .slide-cover p {
            max-width: 900px;
            font-size: 1.05rem;
            color: rgba(253,254,254,0.92);
            margin-bottom: 1rem;
        }
        .slide-cover ul {
            margin: 0;
            padding-left: 1.1rem;
            color: rgba(253,254,254,0.92);
            columns: 2;
        }
        .slide-eyebrow {
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-size: 0.78rem;
            color: #D5F5E3;
            font-weight: 700;
        }
        .slide-block {
            background: white;
            border-radius: 22px;
            padding: 1.25rem 1.35rem;
            border: 1px solid #E5E8E8;
            box-shadow: 0 12px 30px rgba(23, 32, 42, 0.06);
            height: 100%;
        }
        .slide-block h3 {
            margin: 0.15rem 0 0.55rem 0;
            color: #17202A;
        }
        .slide-block p {
            margin: 0;
            color: #566573;
            line-height: 1.5;
        }
        .slide-block-subtitle {
            color: #7B8A8B;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-size: 0.73rem;
            font-weight: 700;
        }
        .slide-block.success {
            border-top: 5px solid #1D8348;
        }
        .slide-block.warning {
            border-top: 5px solid #C0392B;
        }
        .slide-block.neutral {
            border-top: 5px solid #5D6D7E;
        }
        .slide-chip-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0.75rem;
            margin: 1rem 0 0.5rem 0;
        }
        .slide-chip {
            background: white;
            border: 1px solid #E5E8E8;
            border-radius: 18px;
            padding: 0.9rem 1rem;
            box-shadow: 0 10px 22px rgba(23, 32, 42, 0.05);
        }
        .slide-chip-label {
            font-size: 0.78rem;
            color: #7B8A8B;
            text-transform: uppercase;
            letter-spacing: 0.07em;
        }
        .slide-chip-value {
            font-size: 1.2rem;
            font-weight: 700;
            color: #17202A;
            margin-top: 0.25rem;
        }
        .model-preview {
            background: white;
            border: 1px solid #E5E8E8;
            border-radius: 22px;
            padding: 1.15rem 1.2rem;
            box-shadow: 0 12px 28px rgba(23, 32, 42, 0.06);
            min-height: 220px;
        }
        .model-preview-title {
            color: #17202A;
            font-size: 1.1rem;
            font-weight: 700;
            margin-bottom: 0.35rem;
        }
        .model-preview-text {
            color: #566573;
            line-height: 1.5;
            margin-bottom: 0.85rem;
        }
        .team-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.9rem;
            margin: 1rem 0 0.5rem 0;
        }
        .team-card {
            background: rgba(255,255,255,0.95);
            border: 1px solid rgba(255,255,255,0.35);
            border-radius: 18px;
            padding: 1rem 1.1rem;
            backdrop-filter: blur(6px);
            margin-bottom: 0.85rem;
        }
        .team-card-label {
            color: #1D8348;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-size: 0.72rem;
            margin-bottom: 0.45rem;
            font-weight: 700;
        }
        .team-card-value {
            color: #17202A;
            font-weight: 600;
            line-height: 1.35;
            font-size: 0.98rem;
        }
        .team-card-value ul {
            margin: 0;
            padding-left: 1.1rem;
        }
        .team-card-value li {
            margin-bottom: 0.2rem;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )
