import urllib.request
import json

urls = [
    'https://www.linkedin.com',
    'https://www.linkedin.com/',
    'https://www.linkedin.com/feed/',
    'https://example.com',
    'https://example.com/',
    'https://google.com',
    'https://google.com/',
    'https://microsoft.com',
    'https://microsoft.com/',
    'http://login.verify-account.bank-update.com/paypal/reset'
]

print("=" * 80)
print(f"{'URL':<56} | {'PREDICTION':<10} | {'CONF':<7} | {'PHISH_PROB'}")
print("=" * 80)

for url in urls:
    req = urllib.request.Request(
        'http://127.0.0.1:8000/predict',
        data=json.dumps({'url': url}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Origin': 'chrome-extension://kkjfmdmimmdcmimjnblnoekkfbcihbjo'}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        pred = data['prediction']
        conf = f"{data['confidence']*100:.2f}%"
        prob = f"{data['phishing_probability']*100:.2f}%"
        print(f"{url:<56} | {pred:<10} | {conf:<7} | {prob}")
print("=" * 80)
