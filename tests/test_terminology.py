import json
from pathlib import Path
import unittest
from config import EnvironmentConfig
from terminology import CATALOGUE, input_label


class TerminologyTests(unittest.TestCase):
    def test_all_canonical_inputs_keep_their_keys(self):
        expected={"actuals_input","resource_plan","fte_transfer","recruitment_grounded","recruitment_ungrounded",
                  "baseline_assumptions","downtime_overlays_percentage","downtime_overlays_hours","downtime_overlays_hours_fte",
                  "overtime","baseline_productivity","training_snm","ctr_capacity","attrition","recruitment_config",
                  "demand_input","job_time_assumptions","hec_on_kac_demand","hec_on_ev_demand","geography_mapping","week_to_month"}
        self.assertEqual(set(CATALOGUE["inputs"]),expected)
        self.assertEqual(EnvironmentConfig.OPERATIONAL_INPUT_LABELS,CATALOGUE["inputs"])
        self.assertEqual(input_label("job_time_assumptions"),"Job duration assumptions")

    def test_status_mapping_does_not_change_persisted_statuses(self):
        self.assertEqual(CATALOGUE["actionStatuses"],{"Pending":"Awaiting review","Reviewed":"Review recorded","Cancelled":"Withdrawn"})

    def test_uncertain_client_terms_are_not_invented(self):
        self.assertEqual(input_label("training_snm"),"SnM training")
        self.assertEqual(input_label("ctr_capacity"),"CTR capacity")
        self.assertEqual(input_label("recruitment_grounded"),"Grounded recruitment")
        self.assertNotIn("HEC",CATALOGUE["labels"])
        self.assertNotIn("KAC",CATALOGUE["labels"])
        self.assertNotIn("EV",CATALOGUE["labels"])
        self.assertTrue(any(e["term"]=="Kitchen Appliance Cover (KAC)" and e["status"]=="Historical public context" for e in CATALOGUE["entries"]))

    def test_classic_input_widgets_use_shared_display_labels(self):
        from ui.home_tab import make_input_widget
        html=str(make_input_widget("downtime_overlays_hours","Old label",["same-source-version"]))
        self.assertIn("Downtime adjustments (h)",html)
        self.assertIn("same-source-version",html)
        self.assertIn('id="downtime_overlays_hours"',html)


if __name__=="__main__":
    unittest.main()
