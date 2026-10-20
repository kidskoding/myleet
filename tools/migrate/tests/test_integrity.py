from tools.migrate.integrity import compare


def test_compare_flags_changed_and_missing() -> None:
    before = {
        ("m/tests/test_a.py", "test_one"): "passed",
        ("m/tests/test_a.py", "test_two"): "failed",
        ("m/tests/test_a.py", "test_three"): "skipped",
        ("m/tests/test_a.py", "test_lost"): "passed",
    }
    manifest = {"p": {"old_test_file": "m/tests/test_a.py", "tests": ["test_one", "test_two", "test_three"]}}
    after = {"p": {"test_one": "passed", "test_two": "passed", "test_three": "not_started"}}
    problems = compare(before, after, manifest)
    assert problems == [
        "p::test_two: before failed, after passed",
        "missing from manifest: m/tests/test_a.py::test_lost",
    ]


def test_compare_skipped_may_pass_or_stay_unstarted() -> None:
    before = {("f", "t1"): "skipped", ("f", "t2"): "skipped", ("f", "t3"): "skipped"}
    manifest = {"p": {"old_test_file": "f", "tests": ["t1", "t2", "t3"]}}
    after = {"p": {"t1": "passed", "t2": "not_started", "t3": "failed"}}
    assert compare(before, after, manifest) == ["p::t3: before skipped, after failed"]
