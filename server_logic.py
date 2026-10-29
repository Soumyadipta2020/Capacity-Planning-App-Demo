"""
Server Logic Module
Contains all reactive outputs, event handlers, and data bindings for the Capacity Planning App.
"""

import io
import json
import os
from datetime import datetime
from typing import Dict, Any, List

from shiny import Inputs, Outputs, Session, reactive, render, ui
from shinywidgets import render_widget
import plotly.graph_objects as go
import pandas as pd
import numpy as np

from config import EnvironmentConfig
from data_manager import (
    DEFAULT_INPUT_OPTIONS,
    DEFAULT_REMARKS,
    get_file_remark,
    ScenarioManager,
    SampleDataGenerator,
    DATE_COLS,
    PATCHES,
    SKILLS
)

# Complete list of all 21 input keys and their human-readable labels
INPUT_DEFINITIONS = [
    ("actuals_input", "Actuals input"),
    ("resource_plan", "Resource Plan"),
    ("fte_transfer", "FTE transfer"),
    ("recruitment_grounded", "Recruitment grounded"),
    ("recruitment_ungrounded", "Recruitment ungrounded"),
    ("baseline_assumptions", "Baseline assumptions"),
    ("downtime_overlays_percentage", "Downtime Overlays Percentage"),
    ("downtime_overlays_hours", "Downtime Overlays Hours"),
    ("downtime_overlays_hours_fte", "Downtime Overlays Hours/FTE"),
    ("overtime", "Overtime"),
    ("baseline_productivity", "Baseline productivity"),
    ("training_snm", "Training SNM"),
    ("ctr_capacity", "CTR Capacity"),
    ("attrition", "Attrition"),
    ("recruitment_config", "Recruitment"),
    ("demand_input", "Demand input"),
    ("job_time_assumptions", "Job time assumptions"),
    ("hec_on_kac_demand", "HEC on KAC Demand"),
    ("hec_on_ev_demand", "HEC on EV Demand"),
    ("geography_mapping", "Geography mapping"),
    ("week_to_month", "Week to month"),
]


def register_server_handlers(input: Inputs, output: Outputs, session: Session):
    sm = ScenarioManager()
    
    # Reactive state for active scenario and global undo
    active_scenario_id = reactive.Value("LV JUL V.1 2026-07-07 12:46:46")
    last_deleted_scenario = reactive.Value(None)
    scenario_feedback_msg = reactive.Value(None)
    env_mode_state = reactive.Value(EnvironmentConfig.get_environment_name())
    
    # -------------------------------------------------------------------------
    # 0. INPUT CONTROLLERS (Delete, Undo, and Remarks for EVERY input)
    # -------------------------------------------------------------------------
    input_choices_state = {}
    input_deleted_history = {}

    for input_key, label in INPUT_DEFINITIONS:
        initial_choices = list(DEFAULT_INPUT_OPTIONS.get(input_key, []))
        input_choices_state[input_key] = reactive.Value(initial_choices)
        input_deleted_history[input_key] = reactive.Value([])

        def attach_input_handlers(key: str, lbl: str):
            btn_del_key = f"btn_del_{key}"
            btn_undo_key = f"btn_undo_{key}"
            remarks_key = f"ui_remarks_{key}"

            # Delete handler for this specific input
            @reactive.effect
            @reactive.event(input[btn_del_key])
            def _on_delete():
                try:
                    curr = input[key]()
                except Exception:
                    curr = None
                if not curr:
                    return

                choices = list(input_choices_state[key].get())
                if len(choices) <= 1:
                    ui.notification_show(
                        f"Cannot delete '{curr}'. At least one file version must remain for {lbl}.",
                        type="warning"
                    )
                    return

                # Record in deleted history for Undo
                hist = list(input_deleted_history[key].get())
                hist.append(curr)
                input_deleted_history[key].set(hist)

                # Remove from current choices
                choices.remove(curr)
                input_choices_state[key].set(choices)
                new_sel = choices[0]
                ui.update_select(key, choices=choices, selected=new_sel)
                ui.notification_show(
                    f"Deleted '{curr}' from {lbl}. Click Undo to restore.",
                    type="message"
                )

            # Undo handler for this specific input
            @reactive.effect
            @reactive.event(input[btn_undo_key])
            def _on_undo():
                hist = list(input_deleted_history[key].get())
                if not hist:
                    ui.notification_show(
                        f"No deleted versions to restore for {lbl}.",
                        type="warning"
                    )
                    return

                restored = hist.pop()
                input_deleted_history[key].set(hist)

                choices = list(input_choices_state[key].get())
                if restored not in choices:
                    choices.insert(0, restored)
                input_choices_state[key].set(choices)
                ui.update_select(key, choices=choices, selected=restored)
                ui.notification_show(
                    f"Restored version '{restored}' for {lbl}.",
                    type="message"
                )

            # Dynamic Remarks output for this specific input
            @output(id=remarks_key)
            @render.ui
            def _on_render_remarks():
                try:
                    curr_file = input[key]()
                except Exception:
                    curr_file = ""
                remark_text = get_file_remark(curr_file, lbl)
                return ui.div(
                    {"class": "remarks-text mt-1", "style": "color: #555555; font-size: 0.88rem;"},
                    ui.span("Remarks: ", style="font-weight: 500; color: #333333;"),
                    ui.span(remark_text)
                )

        attach_input_handlers(input_key, label)

    # -------------------------------------------------------------------------
    # 1. HOME TAB: SCENARIO ACTIONS & BULK UPLOAD
    # -------------------------------------------------------------------------
    
    # Save Scenario Handler
    @reactive.effect
    @reactive.event(input.btn_save_scenario)
    def _save_scenario():
        plan_type = input.scenario_plan_type()
        month = input.scenario_month()
        version = input.scenario_version()
        remarks = input.scenario_remarks()
        
        # Collect current state of all input dropdowns
        current_inputs = {k: input[k]() for k, _ in INPUT_DEFINITIONS}
        
        new_id = sm.save_scenario(plan_type, month, version, remarks, current_inputs)
        all_names = sm.get_scenario_names()
        
        # Update dropdowns in Home and Comparison tabs
        ui.update_select("scenario_select", choices=all_names, selected=new_id)
        ui.update_select("cmp_scenario_1", choices=all_names)
        ui.update_select("cmp_scenario_2", choices=all_names)
        
        active_scenario_id.set(new_id)
        scenario_feedback_msg.set({
            "type": "success",
            "text": f"Successfully saved scenario: {new_id}"
        })
        ui.notification_show(f"Scenario '{new_id}' saved successfully!", type="message")

    # Load Scenario Handler
    @reactive.effect
    @reactive.event(input.btn_load_scenario)
    def _load_scenario():
        target_name = input.scenario_select()
        if not target_name:
            return
            
        scen = sm.get_scenario(target_name)
        if not scen:
            return
            
        inputs_map = scen.get("inputs", {})
        
        # Update every single input dropdown to match scenario configuration
        for key, val in inputs_map.items():
            try:
                # Ensure choices include the loaded value
                curr_choices = list(input_choices_state.get(key, reactive.Value([])).get())
                if val not in curr_choices:
                    curr_choices.append(val)
                    input_choices_state[key].set(curr_choices)
                ui.update_select(key, choices=curr_choices, selected=val)
            except Exception:
                pass
                
        # Update scenario metadata inputs
        ui.update_select("scenario_plan_type", selected=scen.get("plan_type", "LV"))
        ui.update_select("scenario_month", selected=scen.get("month", "OCT"))
        ui.update_numeric("scenario_version", value=int(scen.get("version", 0)))
        ui.update_text("scenario_remarks", value=scen.get("remarks", ""))
        
        active_scenario_id.set(target_name)
        scenario_feedback_msg.set({
            "type": "info",
            "text": f"Loaded configuration for scenario: {target_name}"
        })
        ui.notification_show(f"Loaded scenario: {target_name}", type="message")

    # Delete Scenario Handler
    @reactive.effect
    @reactive.event(input.btn_delete_scenario)
    def _delete_scenario():
        target_name = input.scenario_select()
        if not target_name:
            return
            
        scen = sm.get_scenario(target_name)
        if sm.delete_scenario(target_name):
            last_deleted_scenario.set(scen)
            remaining_names = sm.get_scenario_names()
            sel = remaining_names[0] if remaining_names else None
            ui.update_select("scenario_select", choices=remaining_names, selected=sel)
            ui.update_select("cmp_scenario_1", choices=remaining_names)
            ui.update_select("cmp_scenario_2", choices=remaining_names)
            
            scenario_feedback_msg.set({
                "type": "warning",
                "text": f"Deleted scenario '{target_name}'. Click 'Undo' to restore."
            })
            ui.notification_show(f"Deleted scenario: {target_name}", type="warning")

    # Undo Scenario Handler
    @reactive.effect
    @reactive.event(input.btn_undo_scenario)
    def _undo_scenario():
        deleted = last_deleted_scenario.get()
        if deleted:
            new_id = sm.save_scenario(
                deleted.get("plan_type", "LV"),
                deleted.get("month", "OCT"),
                deleted.get("version", "0"),
                deleted.get("remarks", "") + " (Restored)",
                deleted.get("inputs", {})
            )
            last_deleted_scenario.set(None)
            all_names = sm.get_scenario_names()
            ui.update_select("scenario_select", choices=all_names, selected=new_id)
            ui.update_select("cmp_scenario_1", choices=all_names)
            ui.update_select("cmp_scenario_2", choices=all_names)
            
            scenario_feedback_msg.set({
                "type": "success",
                "text": f"Restored scenario: {new_id}"
            })
            ui.notification_show(f"Restored scenario: {new_id}", type="message")
        else:
            scenario_feedback_msg.set({
                "type": "secondary",
                "text": "Nothing to undo."
            })

    # Download Scenario Handler
    @render.download(filename=lambda: f"scenario_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    def btn_download_scenario():
        target_name = input.scenario_select()
        scen = sm.get_scenario(target_name) or {}
        return json.dumps(scen, indent=2)

    # Scenario Feedback Output
    @output
    @render.ui
    def ui_scenario_feedback():
        msg = scenario_feedback_msg.get()
        if not msg:
            return ui.HTML("")
        return ui.div(
            {"class": f"alert alert-{msg['type']} alert-dismissible fade show p-2 mb-0 small"},
            ui.strong("Notice: "),
            ui.span(msg["text"])
        )

    # Bulk Upload Assignment Table
    @output
    @render.data_frame
    def table_file_assignment():
        file_infos = input.bulk_upload_files()
        if not file_infos:
            df = pd.DataFrame([
                {"File Name": "resource_plan_v3.csv", "Auto-Assigned Category": "Resource Plan", "Status": "Ready for Processing"},
                {"File Name": "overlays_pct_q3.csv", "Auto-Assigned Category": "Downtime Overlays Percentage", "Status": "Ready for Processing"},
                {"File Name": "mtp_demand_oct.csv", "Auto-Assigned Category": "Demand Input", "Status": "Ready for Processing"}
            ])
        else:
            rows = []
            for f in file_infos:
                name = f["name"]
                cat = "Unassigned"
                if "resource" in name.lower():
                    cat = "Resource Plan"
                elif "overlay" in name.lower():
                    cat = "Downtime Overlays Percentage"
                elif "demand" in name.lower():
                    cat = "Demand Input"
                elif "attrition" in name.lower():
                    cat = "Attrition"
                elif "actual" in name.lower():
                    cat = "Actuals Input"
                rows.append({"File Name": name, "Auto-Assigned Category": cat, "Status": "Uploaded & Validated"})
            df = pd.DataFrame(rows)
        return render.DataGrid(df, selection_mode="none")

    # File Validation Results
    @output
    @render.ui
    def ui_file_validation_status():
        return ui.div(
            ui.div({"class": "badge bg-success me-2 p-2"}, "100% Schema Compatibility Passed"),
            ui.div({"class": "badge bg-info me-2 p-2"}, "All 32 UK Patches Verified"),
            ui.div({"class": "badge bg-secondary p-2"}, "Zero Missing Headers Detected")
        )

    # -------------------------------------------------------------------------
    # 2. SCENARIO COMPARISON TAB
    # -------------------------------------------------------------------------
    
    @output
    @render.ui
    def ui_cmp_remarks_1():
        scen_id = input.cmp_scenario_1()
        scen = sm.get_scenario(scen_id) if scen_id else None
        remarks = scen.get("remarks", "None") if scen else "test2"
        return ui.div({"class": "mt-2 text-muted small"}, ui.strong("Remarks: "), remarks)

    @output
    @render.ui
    def ui_cmp_remarks_2():
        scen_id = input.cmp_scenario_2()
        scen = sm.get_scenario(scen_id) if scen_id else None
        remarks = scen.get("remarks", "None") if scen else "October Operating Plan baseline"
        return ui.div({"class": "mt-2 text-muted small"}, ui.strong("Remarks: "), remarks)

    @output
    @render_widget
    def plot_cmp_demand():
        s1 = input.cmp_scenario_1() or "Scenario 1"
        s2 = input.cmp_scenario_2() or "Scenario 2"
        weeks = DATE_COLS[:8]
        y1 = [4350, 4420, 4480, 4510, 4600, 4650, 4710, 4680]
        y2 = [4300, 4380, 4420, 4460, 4520, 4590, 4640, 4620]
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(x=weeks, y=y1, mode='lines+markers', name=f"Demand - {s1[:16]}", line=dict(color='#002D62', width=3)))
        fig.add_trace(go.Scatter(x=weeks, y=y2, mode='lines+markers', name=f"Demand - {s2[:16]}", line=dict(color='#00a3e0', width=3, dash='dash')))
        fig.update_layout(
            title="Weekly Demand Forecast Comparison",
            xaxis_title="Week Commencing",
            yaxis_title="Total Demand Hours",
            template="plotly_white",
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            margin=dict(l=40, r=40, t=50, b=40),
            height=340
        )
        return fig

    @output
    @render_widget
    def plot_cmp_capacity():
        s1 = input.cmp_scenario_1() or "Scenario 1"
        s2 = input.cmp_scenario_2() or "Scenario 2"
        weeks = DATE_COLS[:8]
        y1 = [4600, 4580, 4550, 4590, 4620, 4700, 4720, 4750]
        y2 = [4450, 4500, 4520, 4560, 4680, 4710, 4740, 4780]
        
        fig = go.Figure()
        fig.add_trace(go.Bar(x=weeks, y=y1, name=f"Capacity - {s1[:16]}", marker_color='#174a7e'))
        fig.add_trace(go.Bar(x=weeks, y=y2, name=f"Capacity - {s2[:16]}", marker_color='#28a745'))
        fig.update_layout(
            barmode='group',
            title="Weekly Capacity Comparison (Available Hours)",
            xaxis_title="Week Commencing",
            yaxis_title="Available Engineering Hours",
            template="plotly_white",
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            margin=dict(l=40, r=40, t=50, b=40),
            height=340
        )
        return fig

    @output
    @render.data_frame
    def table_cmp_tabular():
        s1 = input.cmp_scenario_1() or "Scenario 1"
        s2 = input.cmp_scenario_2() or "Scenario 2"
        df = SampleDataGenerator.get_scenario_comparison_metrics(s1, s2)
        return render.DataGrid(df, selection_mode="none")

    # -------------------------------------------------------------------------
    # 3. VISUALS TAB
    # -------------------------------------------------------------------------
    
    @output
    @render_widget
    def plot_vis_trend():
        weeks = DATE_COLS[:10]
        demand = [4200, 4320, 4410, 4480, 4550, 4620, 4700, 4750, 4680, 4620]
        capacity = [4500, 4520, 4560, 4600, 4650, 4720, 4780, 4820, 4800, 4760]
        imbalance = [c - d for c, d in zip(capacity, demand)]
        
        fig = go.Figure()
        fig.add_trace(go.Bar(x=weeks, y=capacity, name="Available Capacity", marker_color='#004b87', opacity=0.85))
        fig.add_trace(go.Scatter(x=weeks, y=demand, name="Forecasted Demand", line=dict(color='#d9534f', width=3)))
        fig.add_trace(go.Scatter(x=weeks, y=imbalance, name="Net Imbalance Buffer", line=dict(color='#28a745', width=2, dash='dot'), yaxis="y2"))
        
        fig.update_layout(
            title="Consolidated Weekly Field Operations Trajectory",
            xaxis_title="Week Commencing",
            yaxis_title="Hours",
            yaxis2=dict(title="Net Buffer (Hours)", overlaying="y", side="right", showgrid=False),
            template="plotly_white",
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            margin=dict(l=40, r=40, t=50, b=40),
            height=360
        )
        return fig

    @output
    @render_widget
    def plot_vis_skill_pie():
        labels = ["HEC (Heating & Energy)", "KAC (Kitchen & Appliance)", "EV (Electric Vehicles)"]
        values = [58, 32, 10]
        colors = ['#002D62', '#00a3e0', '#28a745']
        
        fig = go.Figure(data=[go.Pie(labels=labels, values=values, hole=0.45, marker=dict(colors=colors))])
        fig.update_layout(
            margin=dict(l=20, r=20, t=30, b=20),
            legend=dict(orientation="h", y=-0.1),
            height=360
        )
        return fig

    @output
    @render_widget
    def plot_vis_regional_bar():
        regions = ["Region A (Scotland)", "Region B (North)", "Region C (Midlands/East)", "Region D (South East)", "Region E (South West)"]
        net_imbalance_fte = [14.2, 28.5, -4.1, 22.8, 11.9]
        colors = ['#28a745' if x >= 0 else '#dc3545' for x in net_imbalance_fte]
        
        fig = go.Figure(data=[go.Bar(x=regions, y=net_imbalance_fte, marker_color=colors)])
        fig.update_layout(
            title="Net FTE Imbalance by Regional Division",
            xaxis_title="Region",
            yaxis_title="Net FTE Surplus / Deficit (+/-)",
            template="plotly_white",
            margin=dict(l=40, r=40, t=50, b=40),
            height=300
        )
        return fig

    # -------------------------------------------------------------------------
    # 4. DEM VS CAP TAB (Matching Images 4 & 5)
    # -------------------------------------------------------------------------
    
    imbalance_calc_trigger = reactive.Value(0)
    inday_calc_trigger = reactive.Value(0)

    @reactive.effect
    @reactive.event(input.btn_calc_imbalances)
    def _calc_imbalances():
        imbalance_calc_trigger.set(imbalance_calc_trigger.get() + 1)
        ui.notification_show("Imbalance metrics recalculated across all patches.", type="message")

    @output
    @render.ui
    def ui_imbalance_calc_status():
        t = imbalance_calc_trigger.get()
        if t == 0:
            return ui.span("Status: Ready", class_="badge bg-secondary")
        return ui.span(f"Calculated ({datetime.now().strftime('%H:%M:%S')})", class_="badge bg-success")

    @output
    @render.data_frame
    def table_imbalances():
        _ = imbalance_calc_trigger.get()
        df = SampleDataGenerator.get_imbalance_data()
        return render.DataGrid(df, selection_mode="none")

    @render.download(filename="imbalance_view_export.csv")
    def btn_download_imbalances():
        df = SampleDataGenerator.get_imbalance_data()
        return df.to_csv(index=False)

    @reactive.effect
    @reactive.event(input.btn_calc_inday)
    def _calc_inday():
        inday_calc_trigger.set(inday_calc_trigger.get() + 1)
        ui.notification_show("Inday workload profiles recalculated.", type="message")

    @output
    @render.ui
    def ui_inday_calc_status():
        t = inday_calc_trigger.get()
        if t == 0:
            return ui.span("Status: Ready", class_="badge bg-secondary")
        return ui.span(f"Calculated ({datetime.now().strftime('%H:%M:%S')})", class_="badge bg-success")

    @output
    @render.data_frame
    def table_inday_workload():
        _ = inday_calc_trigger.get()
        df = SampleDataGenerator.get_inday_workload_data()
        return render.DataGrid(df, selection_mode="none")

    @render.download(filename="inday_workload_export.csv")
    def btn_download_inday():
        df = SampleDataGenerator.get_inday_workload_data()
        return df.to_csv(index=False)

    # -------------------------------------------------------------------------
    # 5. DEMAND TAB (Matching Images 6 & 7)
    # -------------------------------------------------------------------------
    
    @output
    @render.data_frame
    def table_demand_jobs():
        df = SampleDataGenerator.get_demand_jobs_data()
        return render.DataGrid(df, selection_mode="none")

    @render.download(filename="demand_template.csv")
    def btn_download_demand_tpl():
        df = SampleDataGenerator.get_demand_jobs_data().head(3)
        return df.to_csv(index=False)

    @output
    @render.data_frame
    def table_demand_hours():
        df = SampleDataGenerator.get_demand_hours_data()
        return render.DataGrid(df, selection_mode="none")

    @render.download(filename="demand_hours_export.csv")
    def btn_download_demand_hours():
        df = SampleDataGenerator.get_demand_hours_data()
        return df.to_csv(index=False)

    @reactive.effect
    @reactive.event(input.btn_calc_demand_hours)
    def _calc_demand_hours():
        ui.notification_show("Demand Hours refreshed from active jobs forecast.", type="message")

    # -------------------------------------------------------------------------
    # 6. CAPACITY TAB (Matching Images 8 & 9)
    # -------------------------------------------------------------------------
    
    @output
    @render.data_frame
    def table_fte_uploaded():
        df = SampleDataGenerator.get_capacity_fte_data()
        return render.DataGrid(df, selection_mode="none")

    @render.download(filename="fte_template.csv")
    def btn_download_fte_tpl():
        df = SampleDataGenerator.get_capacity_fte_data().head(3)
        return df.to_csv(index=False)

    @output
    @render.data_frame
    def table_fte_transfer():
        df = pd.DataFrame([
            {"Transfer ID": "TR-101", "From Patch": "EA11 Inverness & Aviemore", "To Patch": "EA12 Aberdeen North", "Skill": "HEC", "Effective Date": "2026-11-02", "FTE Count": 2.0},
            {"Transfer ID": "TR-102", "From Patch": "EB12 Altrincham", "To Patch": "EB14 Stockport", "Skill": "KAC", "Effective Date": "2026-11-09", "FTE Count": 1.5}
        ])
        return render.DataGrid(df, selection_mode="none")

    @output
    @render.data_frame
    def table_fte_weekly():
        df = SampleDataGenerator.get_capacity_fte_data()
        return render.DataGrid(df, selection_mode="none")

    @output
    @render.data_frame
    def table_overlays_uploaded():
        fmt = input.overlay_format_type()
        df = SampleDataGenerator.get_overlays_data(fmt)
        return render.DataGrid(df, selection_mode="none")

    @render.download(filename="overlays_template.csv")
    def btn_download_overlay_tpl():
        fmt = input.overlay_format_type()
        df = SampleDataGenerator.get_overlays_data(fmt).head(3)
        return df.to_csv(index=False)

    @output
    @render.data_frame
    def table_recruitment_summary():
        df = pd.DataFrame([
            {"Month": "Oct 2026", "Grounded Hires (HEC)": 15, "Grounded Hires (KAC)": 8, "Ungrounded Target": 25, "Status": "On Track"},
            {"Month": "Nov 2026", "Grounded Hires (HEC)": 20, "Grounded Hires (KAC)": 10, "Ungrounded Target": 30, "Status": "Planned"},
            {"Month": "Dec 2026", "Grounded Hires (HEC)": 10, "Grounded Hires (KAC)": 5, "Ungrounded Target": 15, "Status": "Planned"}
        ])
        return render.DataGrid(df, selection_mode="none")

    @output
    @render.data_frame
    def table_baseline_assumptions():
        df = pd.DataFrame([
            {"Assumption": "Standard Shift Hours", "Value": "37.5 hrs/week", "Category": "Contractual"},
            {"Assumption": "Direct Labor Efficiency", "Value": "88.5%", "Category": "Operational"},
            {"Assumption": "Annual Leave Allowance", "Value": "25 days", "Category": "Overlays"}
        ])
        return render.DataGrid(df, selection_mode="none")

    @output
    @render.data_frame
    def table_bank_hours():
        df = pd.DataFrame([
            {"Patch": "ED44 Canterbury & Dover", "Bank Balance (Hrs)": 142.5, "Accrued Week": 12.0, "Used Week": 8.5},
            {"Patch": "EB12 Altrincham", "Bank Balance (Hrs)": 210.0, "Accrued Week": 18.0, "Used Week": 15.0}
        ])
        return render.DataGrid(df, selection_mode="none")

    @output
    @render.data_frame
    def table_available_hours():
        df = SampleDataGenerator.get_demand_hours_data()
        return render.DataGrid(df, selection_mode="none")

    @output
    @render.data_frame
    def table_baseline_prod():
        df = pd.DataFrame([
            {"Skill": "HEC", "Jobs / Day Benchmark": 3.8, "Avg Duration (Hrs)": 1.75},
            {"Skill": "KAC", "Jobs / Day Benchmark": 4.5, "Avg Duration (Hrs)": 1.45},
            {"Skill": "EV", "Jobs / Day Benchmark": 2.2, "Avg Duration (Hrs)": 3.20}
        ])
        return render.DataGrid(df, selection_mode="none")

    @output
    @render.data_frame
    def table_training_snm():
        df = pd.DataFrame([
            {"Cohort ID": "SNM-2026-Q4", "Skill Target": "Dual Fuel / EV", "Trainee Headcount": 45, "Duration Weeks": 6, "Completion Date": "2026-12-15"}
        ])
        return render.DataGrid(df, selection_mode="none")

    @output
    @render.data_frame
    def table_total_capacity():
        df = SampleDataGenerator.get_inday_workload_data()
        return render.DataGrid(df, selection_mode="none")

    @output
    @render.data_frame
    def table_sp_commitments():
        df = pd.DataFrame([
            {"Commitment": "Winter SLA 98%", "Target Region": "National", "Min Available FTE": 1850, "Status": "Committed"}
        ])
        return render.DataGrid(df, selection_mode="none")

    # -------------------------------------------------------------------------
    # 7. CAPACITY CONFIGURATION TAB (Matching Image 10)
    # -------------------------------------------------------------------------
    
    @output
    @render.data_frame
    def table_attrition_data():
        df = SampleDataGenerator.get_attrition_data()
        return render.DataGrid(df, selection_mode="none")

    @render.download(filename="attrition_template.csv")
    def btn_download_attrition_tpl():
        df = SampleDataGenerator.get_attrition_data().head(3)
        return df.to_csv(index=False)

    @output
    @render.data_frame
    def table_recruitment_ramp():
        df = pd.DataFrame([
            {"Week Since Joining": f"Week {i}", "Productivity Ramp %": f"{min(20 + i*8, 100)}%", "Mentorship Hours": max(15 - i, 0)}
            for i in range(1, 13)
        ])
        return render.DataGrid(df, selection_mode="none")

    # -------------------------------------------------------------------------
    # 8. DEMAND CONFIGURATION TAB (Matching Image 11)
    # -------------------------------------------------------------------------
    
    @output
    @render.data_frame
    def table_job_times_data():
        df = SampleDataGenerator.get_job_times_data()
        return render.DataGrid(df, selection_mode="none")

    @render.download(filename="job_times_template.csv")
    def btn_download_job_time_tpl():
        df = SampleDataGenerator.get_job_times_data().head(3)
        return df.to_csv(index=False)

    @output
    @render.data_frame
    def table_hec_on_kac():
        df = pd.DataFrame([
            {"Skill Group": "HEC Tier 1", "Eligible KAC Work Codes": "W01, W17", "Transfer Factor": 0.85, "Max Hours/Week": 250},
            {"Skill Group": "HEC Tier 2", "Eligible KAC Work Codes": "W00, W01, W17, W18", "Transfer Factor": 0.95, "Max Hours/Week": 400}
        ])
        return render.DataGrid(df, selection_mode="none")

    @output
    @render.data_frame
    def table_hec_on_ev():
        df = pd.DataFrame([
            {"Certification": "EV Level 3 Assist", "Max Weekly Jobs Transfer": 35, "Productivity Ratio": 0.90}
        ])
        return render.DataGrid(df, selection_mode="none")

    # -------------------------------------------------------------------------
    # 9. CONFIGURATION TAB (Matching Image 12)
    # -------------------------------------------------------------------------
    
    @output
    @render.data_frame
    def table_geog_mapping():
        df = SampleDataGenerator.get_geog_mapping_data()
        return render.DataGrid(df, selection_mode="none")

    @render.download(filename="geog_mapping_template.csv")
    def btn_download_geog_tpl():
        df = SampleDataGenerator.get_geog_mapping_data().head(3)
        return df.to_csv(index=False)

    @output
    @render.data_frame
    def table_mismatch_patches():
        df = SampleDataGenerator.get_mismatch_patches()
        return render.DataGrid(df, selection_mode="none")

    @output
    @render.data_frame
    def table_week_to_month():
        df = SampleDataGenerator.get_week_to_month_data()
        return render.DataGrid(df, selection_mode="none")

    @output
    @render.data_frame
    def table_global_search_results():
        term = (input.global_search_term() or "").lower()
        df = SampleDataGenerator.get_demand_jobs_data()
        if term:
            mask = df.apply(lambda r: any(term in str(v).lower() for v in r), axis=1)
            df = df[mask]
        return render.DataGrid(df, selection_mode="none")

    @render.download(filename="consolidated_scenario_data.csv")
    def btn_export_all_csv():
        df = SampleDataGenerator.get_imbalance_data()
        return df.to_csv(index=False)

    @render.download(filename="active_scenario_config.json")
    def btn_export_all_json():
        scen = sm.get_scenario(input.scenario_select()) or {}
        return json.dumps(scen, indent=2)

    # -------------------------------------------------------------------------
    # 10. ABOUT TAB: LIVE ENVIRONMENT DETECTION & SWITCHER
    # -------------------------------------------------------------------------
    
    @reactive.effect
    @reactive.event(input.btn_apply_env_change)
    def _apply_env_switch():
        sel = input.simulated_env_selector()
        if sel == "auto":
            EnvironmentConfig.set_environment_override("")
        else:
            EnvironmentConfig.set_environment_override(sel)
        
        env_mode_state.set(EnvironmentConfig.get_environment_name())
        ui.notification_show(f"Switched runtime environment mode to: {EnvironmentConfig.get_environment_name()}", type="message")

    @output
    @render.ui
    def ui_environment_diagnostics():
        _ = env_mode_state.get()
        diag = EnvironmentConfig.get_diagnostics()
        
        badge_class = "badge bg-danger" if diag["is_databricks"] else "badge bg-primary"
        
        return ui.div(
            ui.div(
                {"class": "table-responsive"},
                ui.tags.table(
                    {"class": "table table-bordered table-striped table-hover mb-0"},
                    ui.tags.thead(
                        ui.tags.tr(
                            ui.tags.th("Property", style="width: 35%;"),
                            ui.tags.th("Detected Runtime Value")
                        )
                    ),
                    ui.tags.tbody(
                        ui.tags.tr(
                            ui.tags.td("Active Runtime Environment"),
                            ui.tags.td(ui.span(diag["environment"], class_=badge_class))
                        ),
                        ui.tags.tr(
                            ui.tags.td("Environment Indicator Badge"),
                            ui.tags.td(ui.code(diag["badge_text"]))
                        ),
                        ui.tags.tr(
                            ui.tags.td("Manual Simulation Override"),
                            ui.tags.td(ui.span(diag["override_value"]))
                        ),
                        ui.tags.tr(
                            ui.tags.td("Active Data Storage Root"),
                            ui.tags.td(ui.code(diag["data_directory"]))
                        ),
                        ui.tags.tr(
                            ui.tags.td("Server Host / IP Binding"),
                            ui.tags.td(ui.code(f"{diag['server_host']}:{diag['server_port']}"))
                        ),
                        ui.tags.tr(
                            ui.tags.td("Databricks App ID"),
                            ui.tags.td(ui.span(diag["databricks_app_id"]))
                        ),
                        ui.tags.tr(
                            ui.tags.td("Databricks Host URL"),
                            ui.tags.td(ui.span(diag["databricks_host"]))
                        ),
                        ui.tags.tr(
                            ui.tags.td("Python Engine & OS"),
                            ui.tags.td(f"Python {diag['python_version']} on {diag['os_system']}")
                        )
                    )
                )
            )
        )
