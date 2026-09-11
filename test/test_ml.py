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

    def test_api_health_and_predict(self):
        from fastapi.testclient import TestClient
        from ml.api import app

        client = TestClient(app)
        # Test /health
        res_health = client.get("/health")
        self.assertEqual(res_health.status_code, 200)
        self.assertEqual(res_health.json(), {"status": "ok"})

        # Test /predict with legitimate URL
        headers = {"Origin": "chrome-extension://kkjfmdmimmdcmimjnblnoekkfbcihbjo"}
        res_legit = client.post("/predict", json={"url": "https://www.linkedin.com/feed/"}, headers=headers)
        self.assertEqual(res_legit.status_code, 200)
        data_legit = res_legit.json()
        self.assertEqual(data_legit["prediction"], "legitimate")
        self.assertIn("confidence", data_legit)
        self.assertIn("phishing_probability", data_legit)

        # Test /predict with phishing URL
        res_phish = client.post("/predict", json={"url": "http://login.verify-account.bank-update.com/paypal/reset"}, headers=headers)
        self.assertEqual(res_phish.status_code, 200)
        data_phish = res_phish.json()
        self.assertEqual(data_phish["prediction"], "phishing")
        self.assertGreater(data_phish["phishing_probability"], 0.9)

if __name__ == '__main__':
    unittest.main()
