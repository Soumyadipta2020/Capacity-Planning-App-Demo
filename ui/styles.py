"""
Custom CSS styles and UI brand components matching the British Gas / Centrica Capacity Planning interface.
"""

CUSTOM_CSS = """
/* Centrica / British Gas Capacity Planning Theme */
:root {
    --bg-primary-blue: #002D62;
    --bg-secondary-blue: #004b87;
    --bg-light-blue: #e8f1f8;
    --bg-accent-blue: #0072ce;
    --bg-card-header: #0d3b66;
    --bg-border: #d0d7de;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background-color: #f4f6f9;
    color: #212529;
}

/* Navbar Custom Styling */
.navbar {
    background-color: #00254d !important;
    border-bottom: 2px solid #001733;
    padding-top: 0.35rem;
    padding-bottom: 0.35rem;
}

.navbar-brand {
    font-weight: 700;
    font-size: 1.15rem;
    color: #ffffff !important;
    display: flex;
    align-items: center;
    gap: 10px;
}

.nav-link {
    color: #d1d9e6 !important;
    font-weight: 500;
    font-size: 0.9rem;
    padding: 0.5rem 0.85rem !important;
    border-radius: 4px;
    transition: all 0.2s ease-in-out;
}

.nav-link:hover {
    color: #ffffff !important;
    background-color: rgba(255, 255, 255, 0.1);
}

.nav-link.active {
    color: #ffffff !important;
    background-color: #004b87 !important;
    font-weight: 600;
}

/* Environment Badge */
.env-badge-container {
    display: inline-flex;
    align-items: center;
    margin-right: 12px;
}

.env-badge-dev {
    background-color: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.35);
    color: #ffffff;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 12px;
    letter-spacing: 0.5px;
}

.env-badge-databricks {
    background-color: #e34a26;
    color: white;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 12px;
}

.env-badge-vscode {
    background-color: #007acc;
    color: white;
    font-size: 0.78rem;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 12px;
}

/* Card Headers like screenshots (Deep blue ribbon) */
.section-banner-header {
    background-color: #0d3b66;
    color: #ffffff;
    padding: 9px 16px;
    font-size: 0.95rem;
    font-weight: 600;
    border-radius: 4px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.sub-section-header {
    background-color: #174a7e;
    color: #ffffff;
    padding: 7px 14px;
    font-size: 0.88rem;
    font-weight: 600;
    border-radius: 3px;
    margin-top: 8px;
    margin-bottom: 8px;
}

/* Buttons */
.btn-primary, .btn-action-custom {
    background-color: #0d3b66 !important;
    border-color: #0d3b66 !important;
    color: #ffffff !important;
    font-weight: 600;
    font-size: 0.88rem;
    padding: 6px 18px;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.btn-primary:hover, .btn-action-custom:hover {
    background-color: #00254d !important;
    border-color: #00254d !important;
}

.btn-danger-custom {
    background-color: #b02a37 !important;
    border-color: #b02a37 !important;
    color: #ffffff !important;
    font-weight: 600;
    font-size: 0.88rem;
    padding: 6px 18px;
    border-radius: 4px;
}

/* Form Controls */
.form-label {
    font-weight: 600;
    font-size: 0.85rem;
    color: #333333;
    margin-bottom: 4px;
}

.form-select, .form-control {
    font-size: 0.88rem;
    border-radius: 4px;
    border: 1px solid #ced4da;
    padding: 5px 10px;
}

.form-select:focus, .form-control:focus {
    border-color: #004b87;
    box-shadow: 0 0 0 0.2rem rgba(0, 75, 135, 0.25);
}

/* Grid & Tables */
.card-metric-container {
    background: #ffffff;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

/* Accordion Customization */
.accordion-button {
    background-color: #0d3b66 !important;
    color: #ffffff !important;
    font-weight: 600;
    font-size: 0.92rem;
    padding: 10px 16px;
}

.accordion-button:not(.collapsed) {
    background-color: #092c4e !important;
    color: #ffffff !important;
    box-shadow: none;
}

.accordion-button::after {
    filter: invert(1);
}

.accordion-item {
    border: 1px solid #0d3b66;
    margin-bottom: 10px;
    border-radius: 4px !important;
    overflow: hidden;
}

/* Brand Logo Box on Top Right */
.brand-logo-container {
    background-color: #ffffff;
    border-radius: 4px;
    padding: 4px 12px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    color: #002D62;
    font-size: 0.92rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.brand-flame-icon {
    width: 18px;
    height: 18px;
    fill: #00a3e0;
}

/* Cluster Status Banner & Modals */
.health-banner {
    align-items: center;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    display: flex;
    gap: 12px;
    margin: 8px 16px;
    min-height: 46px;
    padding: 10px 16px;
    font-size: 0.88rem;
}

.health-banner.ok {
    background: rgba(223, 247, 251, 0.82);
    border-color: rgba(0, 174, 239, 0.4);
}

.health-banner.warn {
    background: #fff8df;
    border-color: #f4d36c;
}

.health-state {
    color: #005eb8;
    font-weight: 800;
    white-space: nowrap;
}

.status-modal-wrapper {
    position: relative;
    width: 100%;
}

.status-modal-content {
    text-align: center;
    padding: 28px 24px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.status-modal-spinner {
    width: 52px;
    height: 52px;
    border: 4px solid rgba(0, 94, 184, 0.18);
    border-top-color: #005eb8;
    border-right-color: #00a3e0;
    border-radius: 50%;
    animation: modal-spin 0.75s linear infinite;
    margin-bottom: 20px;
}

@keyframes modal-spin {
    to {
        transform: rotate(360deg);
    }
}

.status-modal-icon-circle {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 18px;
}

.status-modal-icon-circle.cluster-offline {
    background-color: rgba(244, 162, 97, 0.18);
    color: #d97706;
    border: 2px solid rgba(244, 162, 97, 0.45);
}

.status-modal-icon-circle.error {
    background-color: rgba(255, 138, 138, 0.16);
    color: #dc3545;
    border: 2px solid rgba(255, 138, 138, 0.4);
}

.status-modal-title {
    font-size: 1.3rem;
    font-weight: 800;
    color: #1e293b;
    margin-bottom: 8px;
    line-height: 1.25;
}

.status-modal-subtitle {
    font-size: 0.92rem;
    color: #64748b;
    margin-bottom: 20px;
    line-height: 1.45;
    max-width: 420px;
}

.status-modal-badge-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px 22px;
    margin-bottom: 24px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 2px 8px rgba(0, 94, 184, 0.04);
    text-align: center;
}

.status-modal-id-label {
    font-size: 0.74rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #64748b;
    margin-bottom: 4px;
}

.status-modal-id-value {
    font-family: monospace;
    font-size: 1.4rem;
    font-weight: 800;
    color: #005eb8;
    letter-spacing: 0.04em;
}

.status-modal-icon-circle.inactive {
    background-color: rgba(100, 116, 139, 0.16);
    color: #475569;
    border: 2px solid rgba(100, 116, 139, 0.35);
}

.status-modal-icon-circle.logout-icon {
    background-color: rgba(239, 68, 68, 0.12);
    color: #dc2626;
    border: 2px solid rgba(239, 68, 68, 0.35);
}

.session-options-row {
    display: flex;
    gap: 14px;
    width: 100%;
}

.session-option-box {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px 14px;
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: all 0.15s ease;
}

.session-option-box:hover {
    border-color: #cbd5e1;
    background: #f1f5f9;
}

@media (max-width: 600px) {
    .session-options-row {
        flex-direction: column;
    }
}
"""

def get_british_gas_logo_html() -> str:
    """Returns SVG and stylized British Gas badge for the navbar."""
    return """
    <div class="brand-logo-container">
        <svg class="brand-flame-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C10.5 4.5 9 7.5 9 10.5c0 2.5 1.5 4.5 3 4.5s3-2 3-4.5C15 7.5 13.5 4.5 12 2zm0 13c-2.8 0-5 2.2-5 5 0 2.2 1.8 4 4 4 1.5 0 2.8-.8 3.5-2 .7 1.2 2 2 3.5 2 2.2 0 4-1.8 4-4 0-2.8-2.2-5-5-5-1.1 0-2.1.4-2.8 1-.2-.6-.7-1-1.2-1z" fill="#0072ce"/>
        </svg>
        <span>British Gas</span>
    </div>
    """

def get_env_badge_html(env_name: str, is_databricks: bool) -> str:
    """Returns environment status badge."""
    badge_class = "env-badge-databricks" if is_databricks else "env-badge-vscode"
    return f"""
    <div class="env-badge-container">
        <span class="env-badge-dev">ES Dev</span>
        <span class="{badge_class}" style="margin-left: 6px;">{env_name}</span>
    </div>
    """

