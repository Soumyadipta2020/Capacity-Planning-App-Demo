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

