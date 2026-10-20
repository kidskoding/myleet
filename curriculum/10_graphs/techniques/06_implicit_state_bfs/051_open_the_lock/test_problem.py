from solution import open_lock


def test_open_lock_normal_case():
    deadends = ["0201", "0101", "0102", "1212", "2002"]

    assert open_lock(deadends, "0202") == 6


def test_open_lock_start_is_deadend():
    assert open_lock(["8888"], "0009") == -1


def test_open_lock_target_is_start():
    assert open_lock([], "0000") == 0
