from solution import minimum_time_required


def test_minimum_time_required_one_job_each():
    assert minimum_time_required([3, 2, 3], 3) == 3


def test_minimum_time_required_two_workers():
    assert minimum_time_required([1, 2, 4, 7, 8], 2) == 11


def test_minimum_time_required_single_worker():
    assert minimum_time_required([5, 1, 8], 1) == 14


def test_minimum_time_required_more_workers_than_needed():
    assert minimum_time_required([5, 1, 8], 3) == 8


def test_minimum_time_required_equal_jobs():
    assert minimum_time_required([1] * 12, 5) == 3


def test_minimum_time_required_greedy_trap():
    assert minimum_time_required([3, 3, 2, 2, 2], 2) == 6
