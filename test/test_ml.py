import unittest
import os
import json
import joblib
from ml.feature_extractor import extract_features

class TestTrustGuardML(unittest.TestCase):
    def test_feature_extractor_returns_15_features(self):
        url = "https://example.com/test/path?q=1"
        feats = extract_features(url)
        expected_keys = [
            'url_length', 'hostname_length', 'path_length', 'num_dots', 'num_subdomains',
            'num_hyphens', 'num_digits', 'num_special_chars', 'has_https', 'has_ip',
            'has_at_symbol', 'has_punycode', 'has_encoded_chars', 'path_depth',
            'suspicious_term_count'
        ]
        self.assertEqual(len(feats), 15)
        for key in expected_keys:
            self.assertIn(key, feats)

    def test_model_and_metadata_exist_and_load(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_dir, 'ml', 'model', 'trustguard_model.pkl')
        order_path = os.path.join(base_dir, 'ml', 'model', 'feature_order.json')
        self.assertTrue(os.path.exists(model_path))
        self.assertTrue(os.path.exists(order_path))
        
        model = joblib.load(model_path)
        self.assertIsNotNone(model)
        with open(order_path, 'r') as f:
            order = json.load(f)
        self.assertEqual(len(order), 15)

if __name__ == '__main__':
    unittest.main()
