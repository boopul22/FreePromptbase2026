from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from ig_agent.config import load_env_file


class EnvFileTests(unittest.TestCase):
    def test_loads_values_without_overwriting_process_environment(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            env_file = Path(temp_dir) / ".env"
            env_file.write_text(
                "IG_ACCESS_TOKEN=from-file\nIG_USER_ID='12345'\n",
                encoding="utf-8",
            )
            with patch.dict(os.environ, {"IG_ACCESS_TOKEN": "from-process"}, clear=True):
                load_env_file(env_file)
                self.assertEqual(os.environ["IG_ACCESS_TOKEN"], "from-process")
                self.assertEqual(os.environ["IG_USER_ID"], "12345")


if __name__ == "__main__":
    unittest.main()
