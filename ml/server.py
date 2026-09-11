import sys
import asyncio
import os

# On Windows with Python 3.13, ProactorEventLoop has an unhandled accept bug on socket resets (WinError 64 / 10054)
# which stops uvicorn from accepting new connections. SelectorEventLoop is resilient.
if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

import uvicorn

def run():
    uvicorn.run(
        "ml.api:app",
        host="127.0.0.1",
        port=8000,
        loop="asyncio",
        http="h11",
        timeout_keep_alive=2
    )

if __name__ == "__main__":
    run()
