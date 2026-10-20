from solution import LogSystem


def make_example():
    logs = LogSystem()
    logs.put(1, "2017:01:01:23:59:59")
    logs.put(2, "2017:01:01:22:59:59")
    logs.put(3, "2016:01:01:00:00:00")
    return logs


def test_log_system_year_granularity():
    logs = make_example()
    assert sorted(logs.retrieve("2016:01:01:01:01:01", "2017:01:01:23:00:00", "Year")) == [1, 2, 3]


def test_log_system_hour_granularity():
    logs = make_example()
    assert sorted(logs.retrieve("2016:01:01:01:01:01", "2017:01:01:23:00:00", "Hour")) == [1, 2]


def test_log_system_empty():
    assert LogSystem().retrieve("2000:01:01:00:00:00", "2017:12:31:23:59:59", "Year") == []


def test_log_system_second_bounds_inclusive():
    logs = LogSystem()
    logs.put(1, "2017:03:04:05:06:07")
    assert logs.retrieve("2017:03:04:05:06:07", "2017:03:04:05:06:07", "Second") == [1]
    assert logs.retrieve("2017:03:04:05:06:08", "2017:12:31:23:59:59", "Second") == []


def test_log_system_month_and_day_granularity():
    logs = LogSystem()
    logs.put(1, "2016:02:28:10:00:00")
    logs.put(2, "2016:03:01:00:00:00")
    logs.put(3, "2016:04:15:12:30:00")
    assert sorted(logs.retrieve("2016:03:31:23:59:59", "2016:04:01:00:00:00", "Month")) == [2, 3]
    assert sorted(logs.retrieve("2016:02:28:23:59:59", "2016:03:01:00:00:00", "Day")) == [1, 2]
