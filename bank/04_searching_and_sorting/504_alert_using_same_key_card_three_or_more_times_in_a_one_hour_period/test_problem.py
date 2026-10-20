from solution import alert_names


def test_alert_names_example_one():
    names = ["daniel", "daniel", "daniel", "luis", "luis", "luis", "luis"]
    times = ["10:00", "10:40", "11:00", "09:00", "11:00", "13:00", "15:00"]
    assert alert_names(names, times) == ["daniel"]


def test_alert_names_unsorted_times():
    names = ["alice", "alice", "alice", "bob", "bob", "bob", "bob"]
    times = ["12:01", "12:00", "18:00", "21:00", "21:20", "21:30", "23:00"]
    assert alert_names(names, times) == ["bob"]


def test_alert_names_exactly_sixty_minutes_counts():
    assert alert_names(["a", "a", "a"], ["10:00", "10:30", "11:00"]) == ["a"]


def test_alert_names_sixty_one_minutes_does_not_count():
    assert alert_names(["a", "a", "a"], ["10:00", "10:30", "11:01"]) == []


def test_alert_names_no_wrap_past_midnight():
    assert alert_names(["a", "a", "a"], ["23:30", "23:59", "00:10"]) == []


def test_alert_names_sorted_output():
    names = ["zed", "zed", "zed", "amy", "amy", "amy"]
    times = ["08:00", "08:10", "08:20", "09:00", "09:01", "09:02"]
    assert alert_names(names, times) == ["amy", "zed"]
