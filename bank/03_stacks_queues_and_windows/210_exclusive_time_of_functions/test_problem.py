from solution import exclusive_time


def test_exclusive_time_nested_call():
    assert exclusive_time(2, ["0:start:0", "1:start:2", "1:end:5", "0:end:6"]) == [3, 4]


def test_exclusive_time_recursion():
    logs = ["0:start:0", "0:start:2", "0:end:5", "0:start:6", "0:end:6", "0:end:7"]
    assert exclusive_time(1, logs) == [8]


def test_exclusive_time_single_unit():
    assert exclusive_time(1, ["0:start:0", "0:end:0"]) == [1]


def test_exclusive_time_sequential():
    assert exclusive_time(2, ["0:start:0", "0:end:3", "1:start:4", "1:end:4"]) == [4, 1]


def test_exclusive_time_deep_nesting():
    logs = ["0:start:0", "1:start:1", "2:start:2", "2:end:3", "1:end:4", "0:end:5"]
    assert exclusive_time(3, logs) == [2, 2, 2]
