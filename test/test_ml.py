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

    def test_trailing_slash_normalization(self):
        f1 = extract_features("https://www.linkedin.com")
        f2 = extract_features("https://www.linkedin.com/")
        self.assertEqual(f1, f2)
        self.assertEqual(f1['path_length'], 0)
        self.assertEqual(f1['path_depth'], 0)

    def test_model_predictions(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        model_path = os.path.join(base_dir, 'ml', 'model', 'trustguard_model.pkl')
        order_path = os.path.join(base_dir, 'ml', 'model', 'feature_order.json')
        model = joblib.load(model_path)
        with open(order_path, 'r') as f:
            order = json.load(f)

        # Test LinkedIn with path
        f_in = extract_features("https://www.linkedin.com/feed/")
        vec_in = [f_in[k] for k in order]
        self.assertEqual(model.predict([vec_in])[0], 0)  # 0 = legitimate

        # Test obvious phishing URL
        f_phish = extract_features("http://login.verify-account.bank-update.com/paypal/reset")
        vec_phish = [f_phish[k] for k in order]
        self.assertEqual(model.predict([vec_phish])[0], 1)  # 1 = phishing

if __name__ == '__main__':
    unittest.main()
