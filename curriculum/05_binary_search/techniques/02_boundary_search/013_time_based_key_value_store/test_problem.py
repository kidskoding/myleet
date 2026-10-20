from solution import TimeMap


def test_time_map_get_exact_and_earlier_timestamp():
    time_map = TimeMap()
    time_map.set("foo", "bar", 1)
    assert time_map.get("foo", 1) == "bar"
    assert time_map.get("foo", 3) == "bar"


def test_time_map_get_before_first_set():
    time_map = TimeMap()
    time_map.set("foo", "bar", 5)
    assert time_map.get("foo", 2) == ""


def test_time_map_get_latest_before_timestamp():
    time_map = TimeMap()
    time_map.set("foo", "bar", 1)
    time_map.set("foo", "bar2", 4)
    assert time_map.get("foo", 4) == "bar2"
    assert time_map.get("foo", 5) == "bar2"
    assert time_map.get("foo", 3) == "bar"


def test_time_map_get_missing_key():
    time_map = TimeMap()
    assert time_map.get("missing", 1) == ""
